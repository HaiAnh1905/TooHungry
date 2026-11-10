using System;
using System.Threading.Tasks;
using Volo.Abp.Data;
using Volo.Abp.Domain.Services;
using Volo.Abp.Identity;

namespace Acme.TooHungry.Identity;

public class UserLockoutManager : DomainService, IUserLockoutManager
{
    public const int MaxFailedAttempts = 5;
    public const int DecayHours = 24;
    public const string PropLockoutLevel = "LockoutLevel";
    public const string PropLastLockoutUtc = "LastLockoutUtc";
    public const string PropIsAdminLocked = "IsAdminLocked";
    public const string PropAdminLockReason = "AdminLockReason";

    private readonly IdentityUserManager? _identityUserManager;

    public UserLockoutManager(IdentityUserManager? identityUserManager = null)
    {
        _identityUserManager = identityUserManager;
    }

    public virtual Task<TimeSpan> CalculateLockoutTimeSpanAsync(IdentityUser user)
    {
        var currentLevel = GetLockoutLevel(user);
        var nextLevel = currentLevel + 1;
        var timeSpan = CalculateLockoutTimeSpanForLevel(nextLevel);
        return Task.FromResult(timeSpan);
    }

    public static TimeSpan CalculateLockoutTimeSpanForLevel(int level)
    {
        return level switch
        {
            1 => TimeSpan.FromMinutes(5),
            2 => TimeSpan.FromMinutes(10),
            3 => TimeSpan.FromMinutes(15),
            _ => TimeSpan.FromMinutes(30)
        };
    }

    public virtual async Task<bool> HandleFailedAccessAsync(IdentityUser user)
    {
        CheckAndApplyDecay(user);

        if (IsLockedOut(user))
        {
            return true;
        }

        int currentFailedCount;
        if (_identityUserManager != null)
        {
            if (!user.LockoutEnabled)
            {
                await _identityUserManager.SetLockoutEnabledAsync(user, true);
            }

            await _identityUserManager.AccessFailedAsync(user);
            currentFailedCount = await _identityUserManager.GetAccessFailedCountAsync(user);
        }
        else
        {
            // Fallback for direct unit tests
            var count = user.GetProperty<int>("DirectAccessFailedCount", user.AccessFailedCount) + 1;
            user.SetProperty("DirectAccessFailedCount", count);
            currentFailedCount = count;
        }

        // If threshold reached (5 failed attempts)
        if (currentFailedCount >= MaxFailedAttempts)
        {
            var currentLevel = GetLockoutLevel(user);
            var nextLevel = Math.Min(currentLevel + 1, 4);
            var duration = CalculateLockoutTimeSpanForLevel(nextLevel);
            var lockoutEnd = DateTimeOffset.UtcNow.Add(duration);

            user.SetProperty(PropLockoutLevel, nextLevel);
            user.SetProperty(PropLastLockoutUtc, DateTimeOffset.UtcNow);

            if (_identityUserManager != null)
            {
                await _identityUserManager.SetLockoutEndDateAsync(user, lockoutEnd);
                await _identityUserManager.ResetAccessFailedCountAsync(user);
                await _identityUserManager.UpdateAsync(user);
            }
            else
            {
                user.SetProperty("DirectLockoutEnd", lockoutEnd);
                user.SetProperty("DirectAccessFailedCount", 0);
            }

            return true;
        }

        return false;
    }

    public virtual async Task HandleSuccessfulLoginAsync(IdentityUser user)
    {
        user.RemoveProperty(PropIsAdminLocked);
        user.RemoveProperty(PropAdminLockReason);
        user.SetProperty(PropLockoutLevel, 0);
        user.RemoveProperty(PropLastLockoutUtc);
        user.RemoveProperty("DirectLockoutEnd");
        user.RemoveProperty("DirectAccessFailedCount");

        if (_identityUserManager != null)
        {
            await _identityUserManager.ResetAccessFailedCountAsync(user);
            await _identityUserManager.SetLockoutEndDateAsync(user, null);
            await _identityUserManager.UpdateAsync(user);
        }
    }

    public virtual async Task AdminUnlockAsync(IdentityUser user)
    {
        user.RemoveProperty(PropIsAdminLocked);
        user.RemoveProperty(PropAdminLockReason);
        user.SetProperty(PropLockoutLevel, 0);
        user.RemoveProperty(PropLastLockoutUtc);
        user.RemoveProperty("DirectLockoutEnd");
        user.RemoveProperty("DirectAccessFailedCount");

        if (_identityUserManager != null)
        {
            await _identityUserManager.SetLockoutEndDateAsync(user, null);
            await _identityUserManager.ResetAccessFailedCountAsync(user);
        }
    }

    public virtual async Task AdminLockAsync(IdentityUser user, string? reason = null)
    {
        user.SetProperty(PropIsAdminLocked, true);
        if (!string.IsNullOrWhiteSpace(reason))
        {
            user.SetProperty(PropAdminLockReason, reason);
        }
        user.SetProperty(PropLockoutLevel, 4);
        user.SetProperty(PropLastLockoutUtc, DateTimeOffset.UtcNow);

        // Khóa vĩnh viễn (100 năm) cho đến khi Quản trị viên chủ động mở lại thủ công
        var permanentLockoutEnd = DateTimeOffset.UtcNow.AddYears(100);

        if (_identityUserManager != null)
        {
            if (!user.LockoutEnabled)
            {
                await _identityUserManager.SetLockoutEnabledAsync(user, true);
            }

            await _identityUserManager.SetLockoutEndDateAsync(user, permanentLockoutEnd);
        }
        else
        {
            user.SetProperty("DirectLockoutEnd", permanentLockoutEnd);
        }
    }

    public virtual Task AdminLockAsync(IdentityUser user, TimeSpan duration)
    {
        return AdminLockAsync(user, $"Admin locked manually");
    }

    public virtual int GetLockoutLevel(IdentityUser user)
    {
        CheckAndApplyDecay(user);
        return user.GetProperty<int>(PropLockoutLevel, 0);
    }

    public virtual bool IsAdminLocked(IdentityUser user)
    {
        return user.GetProperty<bool>(PropIsAdminLocked, false);
    }

    public virtual bool IsLockedOut(IdentityUser user)
    {
        if (IsAdminLocked(user))
        {
            return true;
        }
        var lockoutEnd = GetEffectiveLockoutEnd(user);
        return lockoutEnd.HasValue && lockoutEnd.Value > DateTimeOffset.UtcNow;
    }

    public virtual int GetRemainingLockoutSeconds(IdentityUser user)
    {
        if (IsAdminLocked(user))
        {
            return 0; // Tài khoản bị Admin khóa vĩnh viễn, không có đồng hồ đếm ngược
        }
        var lockoutEnd = GetEffectiveLockoutEnd(user);
        if (!lockoutEnd.HasValue) return 0;
        var diff = lockoutEnd.Value - DateTimeOffset.UtcNow;
        return diff.TotalSeconds > 0 ? (int)Math.Ceiling(diff.TotalSeconds) : 0;
    }

    public virtual int GetRemainingAttemptsBeforeLock(IdentityUser user)
    {
        int failedCount = _identityUserManager != null
            ? _identityUserManager.GetAccessFailedCountAsync(user).GetAwaiter().GetResult()
            : user.GetProperty<int>("DirectAccessFailedCount", user.AccessFailedCount);

        var remaining = MaxFailedAttempts - failedCount;
        return remaining < 0 ? 0 : remaining;
    }

    private DateTimeOffset? GetEffectiveLockoutEnd(IdentityUser user)
    {
        var directEnd = user.GetProperty<DateTimeOffset?>("DirectLockoutEnd");
        return directEnd ?? user.LockoutEnd;
    }

    private void CheckAndApplyDecay(IdentityUser user)
    {
        var lastLockoutUtc = user.GetProperty<DateTimeOffset?>(PropLastLockoutUtc);
        if (lastLockoutUtc.HasValue && DateTimeOffset.UtcNow > lastLockoutUtc.Value.AddHours(DecayHours))
        {
            user.SetProperty(PropLockoutLevel, 0);
            user.RemoveProperty(PropLastLockoutUtc);
        }
    }
}
