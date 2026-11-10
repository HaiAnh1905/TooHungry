using System;

namespace Acme.TooHungry.Identity;

public class LoginFailureDto
{
    public bool IsLockedOut { get; set; }
    public bool IsAdminLocked { get; set; }
    public int LockoutLevel { get; set; }
    public int RemainingSeconds { get; set; }
    public int RemainingAttemptsBeforeLock { get; set; }
    public bool RequireCaptcha { get; set; }
    public string? CaptchaChallengeId { get; set; }
    public string? CaptchaQuestion { get; set; }
    public string? CaptchaSignature { get; set; }
    public long? CaptchaTimestamp { get; set; }
    public string SafeErrorMessage { get; set; } = string.Empty;
}

public class AdminUnlockUserDto
{
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class AdminLockUserDto
{
    public int LockoutMinutes { get; set; } = 30;
    public string? Reason { get; set; }
}

public class AdminLockResponseDto
{
    public bool Success { get; set; }
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class AdminUnlockResponseDto
{
    public bool Success { get; set; }
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class CheckLockoutStatusRequestDto
{
    public string UserNameOrEmail { get; set; } = string.Empty;
}

public class CheckLockoutStatusResponseDto
{
    public bool IsLockedOut { get; set; }
    public bool IsAdminLocked { get; set; }
    public int LockoutLevel { get; set; }
    public int RemainingSeconds { get; set; }
    public bool RequireCaptcha { get; set; }
}

public class CaptchaChallengeDto
{
    public string ChallengeId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public long Timestamp { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
}

public class InternalCaptchaVerificationDto
{
    public string ChallengeId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public long Timestamp { get; set; }
}

