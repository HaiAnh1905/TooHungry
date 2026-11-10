using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Identity;

public interface IIdentityUserLockoutAppService : IApplicationService
{
    Task<AdminUnlockResponseDto> UnlockUserAsync(Guid id, AdminUnlockUserDto input);
    Task<AdminLockResponseDto> LockUserAsync(Guid id, AdminLockUserDto input);
    Task<CheckLockoutStatusResponseDto> CheckLockoutStatusAsync(CheckLockoutStatusRequestDto input);
    Task<CaptchaChallengeDto> GetCaptchaChallengeAsync();
}

