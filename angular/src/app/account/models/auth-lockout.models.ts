export interface LockoutStatus {
  isLockedOut: boolean;
  isAdminLocked?: boolean;
  lockoutLevel: number;
  remainingSeconds: number;
  requireCaptcha: boolean;
}

export interface CaptchaChallenge {
  challengeId: string;
  question: string;
  signature: string;
  timestamp: number;
  expiresAtUtc: string;
}

export interface LoginFailureResponse {
  error?: string;
  error_description?: string;
  remaining_attempts?: number;
  require_captcha?: boolean;
  safe_message?: string;
  lockout_level?: number;
  remaining_seconds?: number;
  is_admin_locked?: boolean;
}

export interface RateLimitErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: string;
    data?: {
      retryAfterSeconds?: number;
    };
  };
}

export interface AdminUnlockRequest {
  reason: string;
}

export interface AdminUnlockResponse {
  success: boolean;
  userId: string;
  message: string;
}

export interface AdminLockRequest {
  lockoutMinutes: number;
  reason?: string;
}

export interface AdminLockResponse {
  success: boolean;
  userId: string;
  message: string;
}

