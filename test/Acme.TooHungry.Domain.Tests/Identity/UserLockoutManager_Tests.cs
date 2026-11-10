using System;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp.Data;
using Volo.Abp.Identity;
using Xunit;

namespace Acme.TooHungry.Identity;

public class UserLockoutManager_Tests
{
    private readonly UserLockoutManager _manager;

    public UserLockoutManager_Tests()
    {
        _manager = new UserLockoutManager();
    }

    [Fact]
    public async Task Should_Escalate_Lockout_Levels_Through_All_Four_Steps()
    {
        var user = new IdentityUser(Guid.NewGuid(), "test_user", "test@toohungry.com");

        // 1. First 4 failed attempts: not locked out yet
        for (int i = 0; i < 4; i++)
        {
            var locked = await _manager.HandleFailedAccessAsync(user);
            locked.ShouldBeFalse();
            _manager.IsLockedOut(user).ShouldBeFalse();
        }

        // 5th failed attempt: Lockout Level 1 (5 minutes)
        var lockedLevel1 = await _manager.HandleFailedAccessAsync(user);
        lockedLevel1.ShouldBeTrue();
        _manager.IsLockedOut(user).ShouldBeTrue();
        _manager.GetLockoutLevel(user).ShouldBe(1);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeGreaterThan(290);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeLessThanOrEqualTo(300);

        // 2. Simulate expiration of Level 1 (5m passes): 5 more failed attempts -> Level 2 (10 minutes)
        user.SetProperty("DirectLockoutEnd", DateTimeOffset.UtcNow.AddSeconds(-1));
        _manager.IsLockedOut(user).ShouldBeFalse();

        for (int i = 0; i < 4; i++)
        {
            await _manager.HandleFailedAccessAsync(user);
        }
        var lockedLevel2 = await _manager.HandleFailedAccessAsync(user);
        lockedLevel2.ShouldBeTrue();
        _manager.GetLockoutLevel(user).ShouldBe(2);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeGreaterThan(590);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeLessThanOrEqualTo(600);

        // 3. Simulate expiration of Level 2 (10m passes): 5 more failed attempts -> Level 3 (15 minutes)
        user.SetProperty("DirectLockoutEnd", DateTimeOffset.UtcNow.AddSeconds(-1));
        _manager.IsLockedOut(user).ShouldBeFalse();

        for (int i = 0; i < 4; i++)
        {
            await _manager.HandleFailedAccessAsync(user);
        }
        var lockedLevel3 = await _manager.HandleFailedAccessAsync(user);
        lockedLevel3.ShouldBeTrue();
        _manager.GetLockoutLevel(user).ShouldBe(3);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeGreaterThan(890);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeLessThanOrEqualTo(900);

        // 4. Simulate expiration of Level 3 (15m passes): 5 more failed attempts -> Level 4 (30 minutes ceiling)
        user.SetProperty("DirectLockoutEnd", DateTimeOffset.UtcNow.AddSeconds(-1));
        _manager.IsLockedOut(user).ShouldBeFalse();

        for (int i = 0; i < 4; i++)
        {
            await _manager.HandleFailedAccessAsync(user);
        }
        var lockedLevel4 = await _manager.HandleFailedAccessAsync(user);
        lockedLevel4.ShouldBeTrue();
        _manager.GetLockoutLevel(user).ShouldBe(4);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeGreaterThan(1790);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeLessThanOrEqualTo(1800);

        // 5. Subsequent failures should stay capped at Level 4 (30 minutes)
        user.SetProperty("DirectLockoutEnd", DateTimeOffset.UtcNow.AddSeconds(-1));
        _manager.IsLockedOut(user).ShouldBeFalse();

        for (int i = 0; i < 5; i++)
        {
            await _manager.HandleFailedAccessAsync(user);
        }
        _manager.GetLockoutLevel(user).ShouldBe(4);
    }

    [Fact]
    public async Task Should_Decay_Back_To_Level_Zero_After_24_Hours_Inactivity()
    {
        var user = new IdentityUser(Guid.NewGuid(), "decay_user", "decay@toohungry.com");

        // Set user to level 3 locked 25 hours ago
        user.SetProperty(UserLockoutManager.PropLockoutLevel, 3);
        user.SetProperty(UserLockoutManager.PropLastLockoutUtc, DateTimeOffset.UtcNow.AddHours(-25));

        // When checking lockout level, decay should take effect
        _manager.GetLockoutLevel(user).ShouldBe(0);

        // Next 5 failed attempts should start back at Level 1 (5 minutes)
        for (int i = 0; i < 5; i++)
        {
            await _manager.HandleFailedAccessAsync(user);
        }

        _manager.GetLockoutLevel(user).ShouldBe(1);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeGreaterThan(290);
        _manager.GetRemainingLockoutSeconds(user).ShouldBeLessThanOrEqualTo(300);
    }

    [Fact]
    public async Task Should_Reset_Lockout_State_On_Successful_Login()
    {
        var user = new IdentityUser(Guid.NewGuid(), "success_user", "success@toohungry.com");

        // Fail 5 times to lock out
        for (int i = 0; i < 5; i++)
        {
            await _manager.HandleFailedAccessAsync(user);
        }

        _manager.IsLockedOut(user).ShouldBeTrue();
        _manager.GetLockoutLevel(user).ShouldBe(1);

        // Handle successful login
        await _manager.HandleSuccessfulLoginAsync(user);

        _manager.IsLockedOut(user).ShouldBeFalse();
        _manager.GetLockoutLevel(user).ShouldBe(0);
        _manager.GetRemainingLockoutSeconds(user).ShouldBe(0);
    }

    [Fact]
    public async Task Should_Clear_Lockout_Immediately_On_Admin_Unlock()
    {
        var user = new IdentityUser(Guid.NewGuid(), "admin_unlock_user", "unlock@toohungry.com");

        // Fail 5 times
        for (int i = 0; i < 5; i++)
        {
            await _manager.HandleFailedAccessAsync(user);
        }

        _manager.IsLockedOut(user).ShouldBeTrue();
        _manager.GetLockoutLevel(user).ShouldBe(1);

        // Admin unlocks
        await _manager.AdminUnlockAsync(user);

        _manager.IsLockedOut(user).ShouldBeFalse();
        _manager.GetLockoutLevel(user).ShouldBe(0);
        _manager.GetRemainingLockoutSeconds(user).ShouldBe(0);
    }

    [Fact]
    public async Task Should_Lock_Account_Permanently_When_Admin_Locks_Manually_Without_Countdown()
    {
        var user = new IdentityUser(Guid.NewGuid(), "admin_lock_user", "adminlock@toohungry.com");

        _manager.IsLockedOut(user).ShouldBeFalse();
        _manager.IsAdminLocked(user).ShouldBeFalse();

        await _manager.AdminLockAsync(user, "Locked by security auditor");

        _manager.IsLockedOut(user).ShouldBeTrue();
        _manager.IsAdminLocked(user).ShouldBeTrue();
        _manager.GetLockoutLevel(user).ShouldBe(4);
        _manager.GetRemainingLockoutSeconds(user).ShouldBe(0, "Admin lock has no countdown timer");

        // Simulate 2 hours passing: account must STILL be locked because only admin can unlock it
        user.SetProperty(UserLockoutManager.PropLastLockoutUtc, DateTimeOffset.UtcNow.AddHours(-2));
        _manager.IsLockedOut(user).ShouldBeTrue("Admin lock does NOT auto-expire after 5m or 30m");
        _manager.IsAdminLocked(user).ShouldBeTrue();

        // Admin unlocks
        await _manager.AdminUnlockAsync(user);

        _manager.IsLockedOut(user).ShouldBeFalse();
        _manager.IsAdminLocked(user).ShouldBeFalse();
        _manager.GetLockoutLevel(user).ShouldBe(0);
        _manager.GetRemainingLockoutSeconds(user).ShouldBe(0);
    }
}
