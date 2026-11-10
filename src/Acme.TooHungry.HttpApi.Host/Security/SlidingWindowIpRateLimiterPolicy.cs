using System;
using System.Net;
using System.Threading;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;

namespace Acme.TooHungry.Security;

public class SlidingWindowIpRateLimiterPolicy : IRateLimiterPolicy<string>
{
    private readonly Func<OnRejectedContext, CancellationToken, ValueTask>? _onRejected;

    public SlidingWindowIpRateLimiterPolicy(ILogger<SlidingWindowIpRateLimiterPolicy>? logger = null)
    {
        _onRejected = (context, token) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.HttpContext.Response.Headers.RetryAfter = "60";
            context.HttpContext.Response.Headers["X-RateLimit-Limit"] = "10";
            context.HttpContext.Response.Headers["X-RateLimit-Remaining"] = "0";
            context.HttpContext.Response.ContentType = "application/json; charset=utf-8";

            logger?.LogWarning("[SECURITY_RATE_LIMIT] Client IP exceeded rate limit of 10 req/min on {Path}", context.HttpContext.Request.Path);

            return ValueTask.CompletedTask;
        };
    }

    public Func<OnRejectedContext, CancellationToken, ValueTask>? OnRejected => _onRejected;

    public RateLimitPartition<string> GetPartition(HttpContext httpContext)
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetSlidingWindowLimiter(clientIp, _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 6,
            QueueLimit = 0
        });
    }
}

