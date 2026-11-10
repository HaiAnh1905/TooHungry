using System;
using System.Threading.Tasks;
using Acme.TooHungry.Identity;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc;

namespace Acme.TooHungry.Controllers;

[Route("api/account")]
public class AccountSecurityController : AbpControllerBase
{
    private readonly IIdentityUserLockoutAppService _lockoutAppService;

    public AccountSecurityController(IIdentityUserLockoutAppService lockoutAppService)
    {
        _lockoutAppService = lockoutAppService;
    }

    [HttpGet("captcha-challenge")]
    [AllowAnonymous]
    public async Task<CaptchaChallengeDto> GetCaptchaChallengeAsync()
    {
        return await _lockoutAppService.GetCaptchaChallengeAsync();
    }

    [HttpPost("check-lockout-status")]
    [AllowAnonymous]
    public async Task<CheckLockoutStatusResponseDto> CheckLockoutStatusAsync([FromBody] CheckLockoutStatusRequestDto input)
    {
        return await _lockoutAppService.CheckLockoutStatusAsync(input);
    }
}

[Route("api/app/identity/users")]
public class IdentityUserLockoutController : AbpControllerBase
{
    private readonly IIdentityUserLockoutAppService _lockoutAppService;

    public IdentityUserLockoutController(IIdentityUserLockoutAppService lockoutAppService)
    {
        _lockoutAppService = lockoutAppService;
    }

    [HttpPost("{id}/unlock")]
    [Authorize]
    public async Task<AdminUnlockResponseDto> UnlockUserAsync(Guid id, [FromBody] AdminUnlockUserDto input)
    {
        return await _lockoutAppService.UnlockUserAsync(id, input);
    }

    [HttpPost("{id}/lock")]
    [Authorize]
    public async Task<AdminLockResponseDto> LockUserAsync(Guid id, [FromBody] AdminLockUserDto input)
    {
        return await _lockoutAppService.LockUserAsync(id, input);
    }
}

