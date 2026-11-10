using System;
using System.Threading.Tasks;
using Acme.TooHungry.Localization;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Authorization;
using Volo.Abp.Identity;

namespace Acme.TooHungry.Identity;

public class IdentityUserLockoutAppService : ApplicationService, IIdentityUserLockoutAppService
{
    private readonly IdentityUserManager _userManager;
    private readonly IUserLockoutManager _userLockoutManager;
    private readonly IInternalCaptchaManager _captchaManager;

    public IdentityUserLockoutAppService(
        IdentityUserManager userManager,
        IUserLockoutManager userLockoutManager,
        IInternalCaptchaManager captchaManager)
    {
        _userManager = userManager;
        _userLockoutManager = userLockoutManager;
        _captchaManager = captchaManager;
        LocalizationResource = typeof(TooHungryResource);
    }

    [Authorize]
    public async Task<AdminUnlockResponseDto> UnlockUserAsync(Guid id, AdminUnlockUserDto input)
    {
        await CheckManageLockoutPermissionAsync();

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            throw new UserFriendlyException(L["UserNotFound"]);
        }

        if (string.Equals(user.UserName, "admin", StringComparison.OrdinalIgnoreCase))
        {
            throw new UserFriendlyException(L["CannotLockAdmin"]);
        }

        await _userLockoutManager.AdminUnlockAsync(user);

        Logger.LogInformation(
            "[SECURITY_AUDIT] Admin {AdminUser} unlocked user account {TargetUser} ({TargetUserId}). Reason: {Reason}",
            CurrentUser.UserName ?? "UnknownAdmin",
            user.UserName,
            user.Id,
            input?.Reason ?? "Admin unlocked");

        return new AdminUnlockResponseDto
        {
            Success = true,
            UserId = user.Id,
            Message = L["AccountUnlockedSuccess"]
        };
    }

    [Authorize]
    public async Task<AdminLockResponseDto> LockUserAsync(Guid id, AdminLockUserDto input)
    {
        await CheckManageLockoutPermissionAsync();

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            throw new UserFriendlyException(L["UserNotFound"]);
        }

        if (string.Equals(user.UserName, "admin", StringComparison.OrdinalIgnoreCase))
        {
            throw new UserFriendlyException(L["CannotLockAdmin"]);
        }

        var reason = input?.Reason ?? "Admin locked from management interface";
        await _userLockoutManager.AdminLockAsync(user, reason);

        Logger.LogWarning(
            "[SECURITY_AUDIT] Admin {AdminUser} locked user account {TargetUser} ({TargetUserId}) permanently until manual unlock. Reason: {Reason}",
            CurrentUser.UserName ?? "UnknownAdmin",
            user.UserName,
            user.Id,
            reason);

        return new AdminLockResponseDto
        {
            Success = true,
            UserId = user.Id,
            Message = L["AccountLockedSuccess"]
        };
    }

    private async Task CheckManageLockoutPermissionAsync()
    {
        if (string.Equals(CurrentUser.UserName, "admin", StringComparison.OrdinalIgnoreCase)
            || CurrentUser.IsInRole("admin")
            || CurrentUser.IsInRole("Administrator"))
        {
            return;
        }

        var hasCustom = await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Identity.Users.ManageLockout);
        var hasUpdate = await AuthorizationService.IsGrantedAsync(IdentityPermissions.Users.Update);
        if (!hasCustom && !hasUpdate)
        {
            throw new AbpAuthorizationException("Requires ManageLockout or Users.Update permission.");
        }
    }

    public async Task<CheckLockoutStatusResponseDto> CheckLockoutStatusAsync(CheckLockoutStatusRequestDto input)
    {
        if (string.IsNullOrWhiteSpace(input.UserNameOrEmail))
        {
            return new CheckLockoutStatusResponseDto
            {
                IsLockedOut = false,
                IsAdminLocked = false,
                LockoutLevel = 0,
                RemainingSeconds = 0,
                RequireCaptcha = false
            };
        }

        var user = await _userManager.FindByNameAsync(input.UserNameOrEmail)
                   ?? await _userManager.FindByEmailAsync(input.UserNameOrEmail);

        if (user == null)
        {
            return new CheckLockoutStatusResponseDto
            {
                IsLockedOut = false,
                IsAdminLocked = false,
                LockoutLevel = 0,
                RemainingSeconds = 0,
                RequireCaptcha = false
            };
        }

        var isLocked = _userLockoutManager.IsLockedOut(user);
        var isAdminLocked = _userLockoutManager.IsAdminLocked(user);
        var level = _userLockoutManager.GetLockoutLevel(user);
        var remainingSeconds = _userLockoutManager.GetRemainingLockoutSeconds(user);
        var failedCount = await _userManager.GetAccessFailedCountAsync(user);

        return new CheckLockoutStatusResponseDto
        {
            IsLockedOut = isLocked,
            IsAdminLocked = isAdminLocked,
            LockoutLevel = level,
            RemainingSeconds = remainingSeconds,
            RequireCaptcha = failedCount >= 3 || isLocked
        };
    }

    public Task<CaptchaChallengeDto> GetCaptchaChallengeAsync()
    {
        var challenge = _captchaManager.GenerateChallenge();
        return Task.FromResult(new CaptchaChallengeDto
        {
            ChallengeId = challenge.ChallengeId,
            Question = challenge.Question,
            Signature = challenge.Signature,
            Timestamp = challenge.Timestamp,
            ExpiresAtUtc = challenge.ExpiresAtUtc
        });
    }
}

