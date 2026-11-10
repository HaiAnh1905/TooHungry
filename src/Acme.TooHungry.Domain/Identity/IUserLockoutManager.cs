using System;
using System.Threading.Tasks;
using Volo.Abp.Domain.Services;
using Volo.Abp.Identity;

namespace Acme.TooHungry.Identity;

public interface IUserLockoutManager : IDomainService
{
    /// <summary>
    /// Tính toán khoảng thời gian phạt tiếp theo theo bậc thang lũy tiến (5m -> 10m -> 15m -> 30m).
    /// </summary>
    Task<TimeSpan> CalculateLockoutTimeSpanAsync(IdentityUser user);

    /// <summary>
    /// Ghi nhận 1 lần đăng nhập thất bại, tăng bộ đếm và áp dụng khóa lũy tiến nếu vượt ngưỡng 5 lần.
    /// Trả về true nếu tài khoản bị khóa sau lần thử này.
    /// </summary>
    Task<bool> HandleFailedAccessAsync(IdentityUser user);

    /// <summary>
    /// Xử lý khi đăng nhập thành công: reset bộ đếm lỗi AccessFailedCount về 0 và LockoutLevel về 0.
    /// </summary>
    Task HandleSuccessfulLoginAsync(IdentityUser user);

    /// <summary>
    /// Quản trị viên mở khóa tài khoản thủ công: gỡ bỏ LockoutEnd, reset AccessFailedCount và LockoutLevel.
    /// </summary>
    Task AdminUnlockAsync(IdentityUser user);

    /// <summary>
    /// Quản trị viên khóa tài khoản thủ công vĩnh viễn (cho đến khi Admin chủ động mở lại).
    /// </summary>
    Task AdminLockAsync(IdentityUser user, string? reason = null);

    /// <summary>
    /// Quản trị viên khóa tài khoản thủ công trong một khoảng thời gian nhất định.
    /// </summary>
    Task AdminLockAsync(IdentityUser user, TimeSpan duration);

    /// <summary>
    /// Lấy cấp độ phạt hiện tại (0: không phạt, 1..4: cấp độ phạt).
    /// </summary>
    int GetLockoutLevel(IdentityUser user);

    /// <summary>
    /// Kiểm tra tài khoản có đang trong thời gian bị khóa hay không.
    /// </summary>
    bool IsLockedOut(IdentityUser user);

    /// <summary>
    /// Kiểm tra tài khoản có bị khóa thủ công bởi Quản trị viên (Admin Locked) hay không.
    /// </summary>
    bool IsAdminLocked(IdentityUser user);

    /// <summary>
    /// Lấy số giây khóa còn lại (dùng cho countdown timer).
    /// </summary>
    int GetRemainingLockoutSeconds(IdentityUser user);

    /// <summary>
    /// Lấy số lần thử còn lại trước khi chạm ngưỡng khóa 5 lần.
    /// </summary>
    int GetRemainingAttemptsBeforeLock(IdentityUser user);
}

