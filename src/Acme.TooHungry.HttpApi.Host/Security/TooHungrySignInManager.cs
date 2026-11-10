using System;
using System.Threading.Tasks;
using Acme.TooHungry.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Identity;
using IdentityUser = Volo.Abp.Identity.IdentityUser;

namespace Acme.TooHungry.Security;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(SignInManager<IdentityUser>), typeof(TooHungrySignInManager))]
public class TooHungrySignInManager : SignInManager<IdentityUser>, IScopedDependency
{
    private readonly IUserLockoutManager _lockoutManager;

    public TooHungrySignInManager(
        UserManager<IdentityUser> userManager,
        IHttpContextAccessor contextAccessor,
        IUserClaimsPrincipalFactory<IdentityUser> claimsFactory,
        IOptions<IdentityOptions> optionsAccessor,
        ILogger<SignInManager<IdentityUser>> logger,
        IAuthenticationSchemeProvider schemes,
        IUserConfirmation<IdentityUser> confirmation,
        IUserLockoutManager lockoutManager)
        : base(userManager, contextAccessor, claimsFactory, optionsAccessor, logger, schemes, confirmation)
    {
        _lockoutManager = lockoutManager;
    }

    public override async Task<SignInResult> PasswordSignInAsync(
        string userName,
        string password,
        bool isPersistent,
        bool lockoutOnFailure)
    {
        var user = await UserManager.FindByNameAsync(userName) ?? await UserManager.FindByEmailAsync(userName);
        if (user == null)
        {
            return SignInResult.Failed;
        }

        return await PasswordSignInAsync(user, password, isPersistent, lockoutOnFailure: false);
    }

    public override async Task<SignInResult> PasswordSignInAsync(
        IdentityUser user,
        string password,
        bool isPersistent,
        bool lockoutOnFailure)
    {
        ArgumentNullException.ThrowIfNull(user);

        // Ensure LockoutEnabled is active
        if (!user.LockoutEnabled)
        {
            await UserManager.SetLockoutEnabledAsync(user, true);
        }

        // 1. If currently locked out according to UserLockoutManager ladder, BLOCK IMMEDIATELY
        if (_lockoutManager.IsLockedOut(user))
        {
            return SignInResult.LockedOut;
        }

        // 2. Delegate to base.PasswordSignInAsync with lockoutOnFailure: false.
        // base.PasswordSignInAsync calls virtual CheckPasswordSignInAsync below,
        // which single-sources password checking, failed count increments, and successful login resets!
        return await base.PasswordSignInAsync(user, password, isPersistent, lockoutOnFailure: false);
    }

    public override async Task<SignInResult> CheckPasswordSignInAsync(
        IdentityUser user,
        string password,
        bool lockoutOnFailure)
    {
        ArgumentNullException.ThrowIfNull(user);

        if (!user.LockoutEnabled)
        {
            await UserManager.SetLockoutEnabledAsync(user, true);
        }

        if (_lockoutManager.IsLockedOut(user))
        {
            return SignInResult.LockedOut;
        }

        // Verify password with lockoutOnFailure: false to prevent default Identity double-counting
        var result = await base.CheckPasswordSignInAsync(user, password, lockoutOnFailure: false);

        if (result.Succeeded)
        {
            await _lockoutManager.HandleSuccessfulLoginAsync(user);
            return result;
        }

        if (result.IsLockedOut)
        {
            return result;
        }

        // Password failed -> trigger escalating ladder EXACTLY ONCE
        var wasLocked = await _lockoutManager.HandleFailedAccessAsync(user);
        if (wasLocked || _lockoutManager.IsLockedOut(user))
        {
            return SignInResult.LockedOut;
        }

        return result;
    }
}
