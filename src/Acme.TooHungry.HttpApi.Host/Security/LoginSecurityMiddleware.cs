using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Acme.TooHungry.Hubs;
using Acme.TooHungry.Identity;
using Acme.TooHungry.Localization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using Volo.Abp.Identity;

namespace Acme.TooHungry.Security;

public class LoginSecurityMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<LoginSecurityMiddleware> _logger;

    // Sliding window rate limiter: 10 permits per 1 minute per IP
    private static readonly PartitionedRateLimiter<string> IpRateLimiter =
        PartitionedRateLimiter.Create<string, string>(ip =>
            RateLimitPartition.GetSlidingWindowLimiter(ip, _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            }));

    // Tracks brute force bursts: > 50 failures in 5 minutes per IP
    private static readonly ConcurrentDictionary<string, ConcurrentQueue<DateTimeOffset>> IpFailureTracker = new();

    public LoginSecurityMiddleware(RequestDelegate next, ILogger<LoginSecurityMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(
        HttpContext context,
        IUserLockoutManager lockoutManager,
        IAntiTimingAttackDummyHasher dummyHasher,
        IInternalCaptchaManager captchaManager,
        IdentityUserManager userManager,
        IStringLocalizer<TooHungryResource> localizer,
        IHubContext<TableHub> hubContext)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var isAuthEndpoint = path.Equals("/connect/token", StringComparison.OrdinalIgnoreCase)
                             || path.StartsWith("/api/account/login", StringComparison.OrdinalIgnoreCase)
                             || path.Equals("/Account/Login", StringComparison.OrdinalIgnoreCase);

        if (!isAuthEndpoint || !HttpMethods.IsPost(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var clientIp = GetClientIp(context);
        var isRazorPage = path.Equals("/Account/Login", StringComparison.OrdinalIgnoreCase);

        // 1. Check Rate Limiter (10 req / min / IP)
        using var lease = IpRateLimiter.AttemptAcquire(clientIp);
        if (!lease.IsAcquired)
        {
            var retryAfterSeconds = 60;
            if (lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterTimeSpan))
            {
                retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(retryAfterTimeSpan.TotalSeconds));
            }

            _logger.LogWarning("[SECURITY_RATE_LIMIT] Client IP {ClientIp} exceeded rate limit of 10 req/min on {Path}", clientIp, path);

            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
            context.Response.Headers["X-RateLimit-Limit"] = "10";
            context.Response.Headers["X-RateLimit-Remaining"] = "0";

            if (isRazorPage)
            {
                var loginUrl = GetLoginUrl(context);
                context.Response.ContentType = "text/html; charset=utf-8";
                var html = RenderBentoLockoutHtml(
                    title: "Thao tác quá nhanh (Rate Limit)",
                    message: $"Địa chỉ IP của bạn ({clientIp}) đã gửi hơn 10 yêu cầu đăng nhập liên tiếp trong vòng 1 phút. Vui lòng tạm nghỉ trong giây lát để đảm bảo an toàn.",
                    remaining: retryAfterSeconds,
                    icon: "⏱️",
                    loginUrl: loginUrl
                );
                await context.Response.WriteAsync(html);
                return;
            }

            context.Response.ContentType = "application/json; charset=utf-8";
            var errorResponse = new
            {
                error = new
                {
                    code = "TooHungry:RateLimitExceeded",
                    message = localizer["RateLimitExceededMessage"].Value ?? "Quá nhiều yêu cầu đăng nhập từ địa chỉ IP của bạn. Vui lòng thử lại sau.",
                    details = $"Client IP đã gửi hơn 10 requests trong vòng 1 phút. Hãy đợi {retryAfterSeconds} giây trước khi thử lại.",
                    data = new { retryAfterSeconds }
                }
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse));
            return;
        }

        // 2. Buffer request to inspect credentials safely
        context.Request.EnableBuffering();
        string username = string.Empty;
        string password = string.Empty;
        string captchaAnswer = string.Empty;
        string captchaChallengeId = string.Empty;
        string captchaSignature = string.Empty;
        long captchaTimestamp = 0;

        if (context.Request.HasFormContentType)
        {
            var form = await context.Request.ReadFormAsync();
            username = form["LoginInput.UserNameOrEmailAddress"].ToString();
            if (string.IsNullOrWhiteSpace(username))
                username = form["UserNameOrEmailAddress"].ToString();
            if (string.IsNullOrWhiteSpace(username))
                username = form["username"].ToString();

            password = form["LoginInput.Password"].ToString();
            if (string.IsNullOrWhiteSpace(password))
                password = form["Password"].ToString();
            if (string.IsNullOrWhiteSpace(password))
                password = form["password"].ToString();

            captchaAnswer = form["captcha_answer"].ToString();
            captchaChallengeId = form["captcha_challenge_id"].ToString();
            captchaSignature = form["captcha_signature"].ToString();
            long.TryParse(form["captcha_timestamp"].ToString(), out captchaTimestamp);
        }
        else if (context.Request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true)
        {
            using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
            var bodyText = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;

            if (!string.IsNullOrWhiteSpace(bodyText))
            {
                try
                {
                    using var doc = JsonDocument.Parse(bodyText);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("userName", out var u) || root.TryGetProperty("userNameOrEmailAddress", out u) || root.TryGetProperty("username", out u))
                        username = u.GetString() ?? string.Empty;
                    if (root.TryGetProperty("password", out var p))
                        password = p.GetString() ?? string.Empty;
                    if (root.TryGetProperty("captcha_answer", out var ca) || root.TryGetProperty("captchaAnswer", out ca))
                        captchaAnswer = ca.GetString() ?? string.Empty;
                    if (root.TryGetProperty("captcha_challenge_id", out var cid) || root.TryGetProperty("captchaChallengeId", out cid))
                        captchaChallengeId = cid.GetString() ?? string.Empty;
                    if (root.TryGetProperty("captcha_signature", out var cs) || root.TryGetProperty("captchaSignature", out cs))
                        captchaSignature = cs.GetString() ?? string.Empty;
                    if (root.TryGetProperty("captcha_timestamp", out var ct) || root.TryGetProperty("captchaTimestamp", out ct))
                        ct.TryGetInt64(out captchaTimestamp);
                }
                catch
                {
                    // Ignore JSON parse errors here, let downstream handle validation
                }
            }
        }
        context.Request.Body.Position = 0;

        // Check headers for captcha
        if (string.IsNullOrWhiteSpace(captchaAnswer) && context.Request.Headers.TryGetValue("captcha_answer", out var hAnswer))
            captchaAnswer = hAnswer.ToString();
        if (string.IsNullOrWhiteSpace(captchaChallengeId) && context.Request.Headers.TryGetValue("captcha_challenge_id", out var hCid))
            captchaChallengeId = hCid.ToString();
        if (string.IsNullOrWhiteSpace(captchaSignature) && context.Request.Headers.TryGetValue("captcha_signature", out var hSig))
            captchaSignature = hSig.ToString();
        if (captchaTimestamp == 0 && context.Request.Headers.TryGetValue("captcha_timestamp", out var hTs))
            long.TryParse(hTs.ToString(), out captchaTimestamp);

        // If username is provided, check user security state
        Volo.Abp.Identity.IdentityUser? targetUser = null;
        if (!string.IsNullOrWhiteSpace(username))
        {
            targetUser = await userManager.FindByNameAsync(username) ?? await userManager.FindByEmailAsync(username);

            // 3. Constant-Time Dummy Hasher if user does NOT exist (Anti-Timing Attack)
            if (targetUser == null)
            {
                dummyHasher.ExecuteDummyHash(password);
                RecordFailedAttemptForIp(clientIp, hubContext, _logger);
                _logger.LogWarning("[SECURITY_AUDIT] Failed login attempt for non-existent user identity: {Identity} from IP {IP}", username, clientIp);
            }
            else
            {
                // Ensure LockoutEnabled is ALWAYS true for this user
                if (!targetUser.LockoutEnabled)
                {
                    await userManager.SetLockoutEnabledAsync(targetUser, true);
                }

                // Check if account is currently locked out BEFORE letting downstream execute
                if (lockoutManager.IsLockedOut(targetUser))
                {
                    var isAdminLocked = lockoutManager.IsAdminLocked(targetUser);
                    if (isAdminLocked)
                    {
                        var adminTitle = localizer["AdminLockedAccountTitle"].Value ?? "Tài khoản đã bị Quản trị viên khóa";
                        var adminMessage = localizer["AdminLockedAccountMessage"].Value ?? "Tài khoản của bạn đã bị Quản trị viên khóa. Vui lòng liên hệ Quản trị viên để được mở lại.";

                        _logger.LogWarning("[SECURITY_LOCKOUT] Blocked login for admin-locked user {User}.", username);

                        if (isRazorPage)
                        {
                            var loginUrl = GetLoginUrl(context);
                            context.Response.StatusCode = StatusCodes.Status200OK;
                            context.Response.ContentType = "text/html; charset=utf-8";
                            var html = RenderAdminLockHtml(adminTitle, adminMessage, loginUrl);
                            await context.Response.WriteAsync(html);
                            return;
                        }
                        else
                        {
                            context.Response.StatusCode = StatusCodes.Status400BadRequest;
                            context.Response.ContentType = "application/json; charset=utf-8";

                            var adminResponse = new
                            {
                                error = "account_locked_out",
                                error_description = "User account has been locked by an Administrator.",
                                is_admin_locked = true,
                                lockout_level = 4,
                                remaining_seconds = 0,
                                safe_message = adminMessage
                            };

                            await context.Response.WriteAsync(JsonSerializer.Serialize(adminResponse));
                            return;
                        }
                    }

                    var level = lockoutManager.GetLockoutLevel(targetUser);
                    var remaining = lockoutManager.GetRemainingLockoutSeconds(targetUser);
                    var minutes = (int)Math.Ceiling(remaining / 60.0);
                    var lockoutMessage = $"Tài khoản của bạn đã bị khóa tạm thời {minutes} phút do nhập sai 5 lần liên tiếp. Vui lòng thử lại sau.";

                    _logger.LogWarning("[SECURITY_LOCKOUT] Blocked login for locked-out user {User}. Remaining: {Remaining}s", username, remaining);

                    if (isRazorPage)
                    {
                        var loginUrl = GetLoginUrl(context);
                        context.Response.StatusCode = StatusCodes.Status200OK;
                        context.Response.ContentType = "text/html; charset=utf-8";
                        var html = RenderBentoLockoutHtml("Tài khoản tạm thời bị khóa", lockoutMessage, remaining, "🔒", loginUrl);
                        await context.Response.WriteAsync(html);
                        return;
                    }
                    else
                    {
                        context.Response.StatusCode = StatusCodes.Status400BadRequest;
                        context.Response.ContentType = "application/json; charset=utf-8";

                        var lockoutResponse = new
                        {
                            error = "account_locked_out",
                            error_description = "User account is locked out.",
                            lockout_level = level,
                            remaining_seconds = remaining,
                            safe_message = lockoutMessage
                        };

                        await context.Response.WriteAsync(JsonSerializer.Serialize(lockoutResponse));
                        return;
                    }
                }

                // Check if CAPTCHA is required (>= 3 failed attempts)
                var failedAttempts = await userManager.GetAccessFailedCountAsync(targetUser);
                if (failedAttempts >= 3 && !isRazorPage)
                {
                    var isValidCaptcha = captchaManager.ValidateCaptchaAnswer(captchaChallengeId, captchaAnswer, captchaSignature, captchaTimestamp);
                    if (!isValidCaptcha)
                    {
                        context.Response.StatusCode = StatusCodes.Status400BadRequest;
                        context.Response.ContentType = "application/json; charset=utf-8";

                        var remainingAttempts = Math.Max(0, 5 - failedAttempts);
                        var captchaRequiredResponse = new
                        {
                            error = "invalid_grant",
                            error_description = "Captcha verification required or failed.",
                            remaining_attempts = remainingAttempts,
                            require_captcha = true,
                            safe_message = localizer["CaptchaRequiredMessage"].Value ?? "Vui lòng giải câu đố bảo mật để tiếp tục."
                        };

                        await context.Response.WriteAsync(JsonSerializer.Serialize(captchaRequiredResponse));
                        return;
                    }
                }
            }
        }

        // 4. Intercept downstream response to handle failed or successful authentication
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);

            responseBody.Position = 0;
            var responseContent = await new StreamReader(responseBody).ReadToEndAsync();
            responseBody.Position = 0;

            bool isSuccess;
            if (isRazorPage)
            {
                // Razor Page:
                // Success redirects (302/303/307) or contains Location header
                // Failure re-renders the login form with 200 OK or returns >= 400
                isSuccess = (context.Response.StatusCode >= 300 && context.Response.StatusCode < 400)
                            || context.Response.Headers.ContainsKey("Location");
            }
            else
            {
                // API endpoints (/connect/token, /api/account/login):
                // Success: 200 OK
                // Failure: 400 BadRequest or >= 400
                isSuccess = context.Response.StatusCode == StatusCodes.Status200OK;
            }

            if (isSuccess)
            {
                if (targetUser != null)
                {
                    await lockoutManager.HandleSuccessfulLoginAsync(targetUser);
                }
                await responseBody.CopyToAsync(originalBodyStream);
            }
            else
            {
                // Login failed!
                RecordFailedAttemptForIp(clientIp, hubContext, _logger);

                if (targetUser != null)
                {
                    // Downstream TooHungrySignInManager has already recorded the failure and triggered escalating lockout if threshold reached.
                    var isCurrentlyLocked = lockoutManager.IsLockedOut(targetUser);

                    if (isCurrentlyLocked)
                    {
                        var isAdminLocked = lockoutManager.IsAdminLocked(targetUser);
                        if (isAdminLocked)
                        {
                            var adminTitle = localizer["AdminLockedAccountTitle"].Value ?? "Tài khoản đã bị Quản trị viên khóa";
                            var adminMessage = localizer["AdminLockedAccountMessage"].Value ?? "Tài khoản của bạn đã bị Quản trị viên khóa. Vui lòng liên hệ Quản trị viên để được mở lại.";

                            _logger.LogWarning("[SECURITY_LOCKOUT] User {User} is admin-locked.", username);

                            if (isRazorPage)
                            {
                                var loginUrl = GetLoginUrl(context);
                                context.Response.StatusCode = StatusCodes.Status200OK;
                                context.Response.ContentType = "text/html; charset=utf-8";
                                var html = RenderAdminLockHtml(adminTitle, adminMessage, loginUrl);
                                var bytes = Encoding.UTF8.GetBytes(html);
                                context.Response.ContentLength = bytes.Length;
                                await originalBodyStream.WriteAsync(bytes);
                                return;
                            }
                            else
                            {
                                var adminLockedBody = new
                                {
                                    error = "account_locked_out",
                                    error_description = "User account has been locked by an Administrator.",
                                    is_admin_locked = true,
                                    lockout_level = 4,
                                    remaining_seconds = 0,
                                    safe_message = adminMessage
                                };

                                var json = JsonSerializer.Serialize(adminLockedBody);
                                var bytes = Encoding.UTF8.GetBytes(json);
                                context.Response.ContentType = "application/json; charset=utf-8";
                                context.Response.ContentLength = bytes.Length;
                                await originalBodyStream.WriteAsync(bytes);
                                return;
                            }
                        }

                        var level = lockoutManager.GetLockoutLevel(targetUser);
                        var remaining = lockoutManager.GetRemainingLockoutSeconds(targetUser);
                        var minutes = (int)Math.Ceiling(remaining / 60.0);
                        var lockedMessage = $"Tài khoản của bạn đã bị khóa tạm thời {minutes} phút do nhập sai 5 lần liên tiếp. Vui lòng thử lại sau.";

                        _logger.LogWarning("[SECURITY_LOCKOUT] User {User} has been locked out! Level: {Level}, Duration: {Minutes}m", username, level, minutes);

                        if (isRazorPage)
                        {
                            var loginUrl = GetLoginUrl(context);
                            context.Response.StatusCode = StatusCodes.Status200OK;
                            context.Response.ContentType = "text/html; charset=utf-8";
                            var html = RenderBentoLockoutHtml("Tài khoản tạm thời bị khóa", lockedMessage, remaining, "🔒", loginUrl);
                            var bytes = Encoding.UTF8.GetBytes(html);
                            context.Response.ContentLength = bytes.Length;
                            await originalBodyStream.WriteAsync(bytes);
                            return;
                        }
                        else
                        {
                            var lockedBody = new
                            {
                                error = "account_locked_out",
                                error_description = "User account is locked out.",
                                lockout_level = level,
                                remaining_seconds = remaining,
                                safe_message = lockedMessage
                            };

                            var json = JsonSerializer.Serialize(lockedBody);
                            var bytes = Encoding.UTF8.GetBytes(json);
                            context.Response.ContentType = "application/json; charset=utf-8";
                            context.Response.ContentLength = bytes.Length;
                            await originalBodyStream.WriteAsync(bytes);
                            return;
                        }
                    }

                    if (!isRazorPage)
                    {
                        var failedCount = await userManager.GetAccessFailedCountAsync(targetUser);
                        var remainingAttempts = Math.Max(0, 5 - failedCount);
                        var failureBody = new
                        {
                            error = "invalid_grant",
                            error_description = "Invalid username or password.",
                            remaining_attempts = remainingAttempts,
                            require_captcha = failedCount >= 3,
                            safe_message = localizer["LoginSafeErrorMessage"].Value ?? "Tên đăng nhập hoặc mật khẩu không chính xác."
                        };

                        var failureJson = JsonSerializer.Serialize(failureBody);
                        var failureBytes = Encoding.UTF8.GetBytes(failureJson);
                        context.Response.ContentType = "application/json; charset=utf-8";
                        context.Response.ContentLength = failureBytes.Length;
                        await originalBodyStream.WriteAsync(failureBytes);
                        return;
                    }
                }

                await responseBody.CopyToAsync(originalBodyStream);
            }
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }

    private static string RenderBentoLockoutHtml(string title, string message, int remaining, string icon = "🔒", string loginUrl = "/Account/Login")
    {
        return $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{title} - TooHungry</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF3E8; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }}
        .bento-card {{ background: #FFFFFF; border: 2px solid #EA580C; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(234, 88, 12, 0.2); }}
        .bento-icon {{ font-size: 48px; margin-bottom: 16px; }}
        .bento-title {{ color: #EA580C; font-size: 22px; font-weight: 700; margin: 0 0 12px; }}
        .bento-desc {{ color: #4B5563; font-size: 15px; line-height: 1.5; margin: 0 0 20px; }}
        .countdown-box {{ background: #FFF3E8; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #FDBA74; }}
        .countdown-val {{ font-size: 32px; font-weight: 800; color: #EA580C; font-family: monospace; }}
        .countdown-label {{ font-size: 13px; color: #9A3412; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }}
        .actions {{ display: flex; flex-direction: column; gap: 10px; align-items: center; }}
        .btn-retry {{ display: inline-block; width: 100%; box-sizing: border-box; background-color: #FED7AA; color: #9A3412; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; border: none; cursor: not-allowed; transition: all 0.2s; font-size: 15px; }}
        .btn-app {{ display: inline-block; width: 100%; box-sizing: border-box; background-color: #F3F4F6; color: #374151; font-weight: 600; text-decoration: none; padding: 12px 20px; border-radius: 8px; border: 1px solid #D1D5DB; transition: all 0.2s; font-size: 14px; text-align: center; }}
        .btn-app:hover {{ background-color: #E5E7EB; color: #111827; border-color: #9CA3AF; }}
    </style>
</head>
<body>
    <div class=""bento-card"">
        <div class=""bento-icon"">{icon}</div>
        <h1 class=""bento-title"">{title}</h1>
        <p class=""bento-desc"">{message}</p>
        <div class=""countdown-box"">
            <div class=""countdown-val"" id=""cdVal"">{remaining}s</div>
            <div class=""countdown-label"">Thời gian chờ còn lại / Remaining Cooldown</div>
        </div>
        <div class=""actions"">
            <button type=""button"" id=""btnAction"" onclick=""window.location.reload()"" class=""btn-retry"" disabled>Vui lòng đợi hết thời gian chờ ({remaining}s)</button>
            <a href=""{loginUrl}"" class=""btn-app"">Quay lại trang đăng nhập</a>
        </div>
    </div>
    <script>
        let rem = {remaining};
        const el = document.getElementById('cdVal');
        const btn = document.getElementById('btnAction');
        const timer = setInterval(() => {{
            rem--;
            if (rem <= 0) {{
                clearInterval(timer);
                el.innerText = '0s';
                btn.removeAttribute('disabled');
                btn.innerText = 'Đăng nhập lại ngay';
                btn.style.backgroundColor = '#EA580C';
                btn.style.color = '#FFFFFF';
                btn.style.cursor = 'pointer';
                setTimeout(() => {{
                    window.location.reload();
                }}, 800);
            }} else {{
                const m = Math.floor(rem / 60);
                const s = rem % 60;
                const formatted = m > 0 ? (m + 'm ' + s + 's') : (s + 's');
                el.innerText = formatted;
                btn.innerText = 'Vui lòng đợi hết thời gian chờ (' + formatted + ')';
            }}
        }}, 1000);
    </script>
</body>
</html>";
    }

    private static string RenderAdminLockHtml(string title, string message, string loginUrl = "/Account/Login")
    {
        return $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{title} - TooHungry</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF3E8; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }}
        .bento-card {{ background: #FFFFFF; border: 2px solid #DC2626; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.2); }}
        .bento-icon {{ font-size: 48px; margin-bottom: 16px; }}
        .bento-title {{ color: #DC2626; font-size: 22px; font-weight: 700; margin: 0 0 12px; }}
        .bento-desc {{ color: #4B5563; font-size: 15px; line-height: 1.5; margin: 0 0 24px; }}
        .actions {{ display: flex; flex-direction: column; gap: 10px; align-items: center; }}
        .btn-app {{ display: inline-block; width: 100%; box-sizing: border-box; background-color: #EA580C; color: #FFFFFF; font-weight: 600; text-decoration: none; padding: 12px 20px; border-radius: 8px; border: none; transition: all 0.2s; font-size: 15px; text-align: center; }}
        .btn-app:hover {{ background-color: #C2410C; }}
    </style>
</head>
<body>
    <div class=""bento-card"">
        <div class=""bento-icon"">🛡️</div>
        <h1 class=""bento-title"">{title}</h1>
        <p class=""bento-desc"">{message}</p>
        <div class=""actions"">
            <a href=""{loginUrl}"" class=""btn-app"">Quay lại trang đăng nhập</a>
        </div>
    </div>
</body>
</html>";
    }

    private static string GetLoginUrl(HttpContext context)
    {
        if (context.Request.QueryString.HasValue && !string.IsNullOrWhiteSpace(context.Request.QueryString.Value))
        {
            return "/Account/Login" + context.Request.QueryString.Value;
        }

        if (context.Request.HasFormContentType)
        {
            var returnUrl = context.Request.Form["ReturnUrl"].ToString();
            if (!string.IsNullOrWhiteSpace(returnUrl))
            {
                return $"/Account/Login?ReturnUrl={Uri.EscapeDataString(returnUrl)}";
            }
        }

        return "/Account/Login";
    }

    private static string GetClientIp(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            var firstIp = forwardedFor.Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(firstIp)) return firstIp;
        }
        return context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }

    private static void RecordFailedAttemptForIp(string ip, IHubContext<TableHub> hubContext, ILogger logger)
    {
        var queue = IpFailureTracker.GetOrAdd(ip, _ => new ConcurrentQueue<DateTimeOffset>());
        var now = DateTimeOffset.UtcNow;
        queue.Enqueue(now);

        // Remove attempts older than 5 minutes
        var fiveMinutesAgo = now.AddMinutes(-5);
        while (queue.TryPeek(out var oldest) && oldest < fiveMinutesAgo)
        {
            queue.TryDequeue(out _);
        }

        // T021: If > 50 failures within 5 minutes, trigger SecurityAlertTriggered via SignalR
        if (queue.Count > 50)
        {
            logger.LogCritical("[SECURITY_ALERT][BRUTE_FORCE] Massive brute-force attack detected from IP {IP}: {Count} failed attempts within 5 minutes!", ip, queue.Count);
            _ = hubContext.Clients.All.SendAsync("SecurityAlertTriggered", new
            {
                clientIp = ip,
                failedCount = queue.Count,
                timestamp = now,
                message = "Cảnh báo bảo mật: Phát hiện nhiều lần đăng nhập thất bại từ cùng một địa chỉ IP!"
            });
        }
    }
}
