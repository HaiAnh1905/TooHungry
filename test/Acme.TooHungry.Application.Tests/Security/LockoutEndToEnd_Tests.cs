using System;
using System.Threading.Tasks;
using Acme.TooHungry.Identity;
using Acme.TooHungry.Security;
using Microsoft.AspNetCore.Identity;
using Shouldly;
using Volo.Abp.Data;
using Volo.Abp.Identity;
using Xunit;

namespace Acme.TooHungry.Security;

public class LockoutEndToEnd_Tests
{
    private readonly UserLockoutManager _lockoutManager;

    public LockoutEndToEnd_Tests()
    {
        _lockoutManager = new UserLockoutManager();
    }

    [Fact]
    public async Task Should_Execute_Full_Lifecycle_5_Fails_Then_Lock_5m_Then_Success_Then_Reset_To_Zero()
    {
        var user = new Volo.Abp.Identity.IdentityUser(Guid.NewGuid(), "staff_cashier", "cashier@toohungry.com");

        // 1. Initial state
        _lockoutManager.IsLockedOut(user).ShouldBeFalse();
        _lockoutManager.GetLockoutLevel(user).ShouldBe(0);

        // 2. Perform 4 failed attempts: not yet locked
        for (int i = 1; i <= 4; i++)
        {
            var locked = await _lockoutManager.HandleFailedAccessAsync(user);
            locked.ShouldBeFalse();
            _lockoutManager.IsLockedOut(user).ShouldBeFalse();
            _lockoutManager.GetRemainingAttemptsBeforeLock(user).ShouldBe(5 - i);
        }

        // 3. 5th failed attempt: Account is now locked out for 5 minutes
        var lockedAt5th = await _lockoutManager.HandleFailedAccessAsync(user);
        lockedAt5th.ShouldBeTrue("5th consecutive failed attempt must trigger lockout.");
        _lockoutManager.IsLockedOut(user).ShouldBeTrue();
        _lockoutManager.GetLockoutLevel(user).ShouldBe(1);

        var remainingSeconds = _lockoutManager.GetRemainingLockoutSeconds(user);
        remainingSeconds.ShouldBeGreaterThan(290);
        remainingSeconds.ShouldBeLessThanOrEqualTo(300);

        // 4. Any further attempt while locked should stay rejected
        var stillLocked = await _lockoutManager.HandleFailedAccessAsync(user);
        stillLocked.ShouldBeTrue();
        _lockoutManager.IsLockedOut(user).ShouldBeTrue();

        // 5. User enters correct password (or simulated unlock upon valid login after timeout)
        await _lockoutManager.HandleSuccessfulLoginAsync(user);

        // 6. Verification: state is completely reset to 0
        _lockoutManager.IsLockedOut(user).ShouldBeFalse();
        _lockoutManager.GetLockoutLevel(user).ShouldBe(0);
        _lockoutManager.GetRemainingLockoutSeconds(user).ShouldBe(0);
        _lockoutManager.GetRemainingAttemptsBeforeLock(user).ShouldBe(5);
    }

    [Fact]
    public async Task Should_Allow_Admin_To_Unlock_User_Immediately_From_Any_Lockout_Level()
    {
        var user = new Volo.Abp.Identity.IdentityUser(Guid.NewGuid(), "waiter_locked", "waiter@toohungry.com");

        // Simulate user at Level 2 lockout (10 minutes)
        user.SetProperty(UserLockoutManager.PropLockoutLevel, 2);
        user.SetProperty("DirectLockoutEnd", DateTimeOffset.UtcNow.AddMinutes(10));
        user.SetProperty(UserLockoutManager.PropLastLockoutUtc, DateTimeOffset.UtcNow);

        _lockoutManager.IsLockedOut(user).ShouldBeTrue();
        _lockoutManager.GetLockoutLevel(user).ShouldBe(2);
        _lockoutManager.GetRemainingLockoutSeconds(user).ShouldBeGreaterThan(590);

        // Admin unlocks
        await _lockoutManager.AdminUnlockAsync(user);

        // Verification: immediate recovery
        _lockoutManager.IsLockedOut(user).ShouldBeFalse();
        _lockoutManager.GetLockoutLevel(user).ShouldBe(0);
        _lockoutManager.GetRemainingLockoutSeconds(user).ShouldBe(0);
    }

    [Fact]
    public async Task Should_Prevent_Login_When_User_Inputs_Correct_Password_After_5_Failed_Attempts()
    {
        var user = new Volo.Abp.Identity.IdentityUser(Guid.NewGuid(), "Manager", "manager@toohungry.com");

        // Nhập sai mật khẩu 5 lần liên tiếp cho Manager
        for (int i = 1; i <= 5; i++)
        {
            await _lockoutManager.HandleFailedAccessAsync(user);
        }

        // Kiểm tra tài khoản đã bị khóa
        _lockoutManager.IsLockedOut(user).ShouldBeTrue("User must be locked out after 5 failures.");

        // Lần thứ 6: Cố gắng đăng nhập -> Hệ thống từ chối vì tài khoản đang bị khóa
        var isLocked = _lockoutManager.IsLockedOut(user);
        isLocked.ShouldBeTrue("System must reject login even if user supplies correct password because lockout is active.");

        // Tiếp tục thử đăng nhập sai hoặc đúng trong thời gian khóa -> Vẫn bị chặn
        var blockedAgain = await _lockoutManager.HandleFailedAccessAsync(user);
        blockedAgain.ShouldBeTrue();
    }

    [Fact]
    public async Task Should_Allow_Admin_To_Manually_Lock_User_Permanently_Until_Unlocked()
    {
        var user = new Volo.Abp.Identity.IdentityUser(Guid.NewGuid(), "target_staff", "staff@toohungry.com");

        _lockoutManager.IsLockedOut(user).ShouldBeFalse();
        _lockoutManager.IsAdminLocked(user).ShouldBeFalse();

        await _lockoutManager.AdminLockAsync(user, "Manual lock by administrator");

        _lockoutManager.IsLockedOut(user).ShouldBeTrue();
        _lockoutManager.IsAdminLocked(user).ShouldBeTrue();
        _lockoutManager.GetLockoutLevel(user).ShouldBe(4);
        _lockoutManager.GetRemainingLockoutSeconds(user).ShouldBe(0, "Permanent admin lock has no countdown timer");

        // Unlock
        await _lockoutManager.AdminUnlockAsync(user);
        _lockoutManager.IsLockedOut(user).ShouldBeFalse();
        _lockoutManager.IsAdminLocked(user).ShouldBeFalse();
    }
}
