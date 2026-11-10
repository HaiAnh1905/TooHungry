import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RestService } from '@abp/ng.core';
import { Subscription, timer, Observable } from 'rxjs';
import { CaptchaChallenge, LockoutStatus, AdminUnlockResponse, AdminLockResponse } from '../../account/models/auth-lockout.models';

@Injectable({
  providedIn: 'root',
})
export class AuthLockoutService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly restService = inject(RestService);
  private timerSub?: Subscription;

  // Signal Reactive States
  readonly remainingSeconds = signal<number>(0);
  readonly isLocked = computed(() => this.remainingSeconds() > 0);
  readonly isAdminLocked = signal<boolean>(false);
  readonly lockoutLevel = signal<number>(0);
  readonly remainingAttempts = signal<number>(5);
  readonly requireCaptcha = signal<boolean>(false);
  readonly captchaChallenge = signal<CaptchaChallenge | null>(null);
  readonly safeErrorMessage = signal<string>('');

  // Formatted countdown timer MM:SS
  readonly formattedCountdown = computed(() => {
    const s = this.remainingSeconds();
    if (s <= 0) return '00:00';
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });

  ngOnDestroy(): void {
    this.stopCooldown();
  }

  startCooldown(seconds: number, level: number = 1, message: string = ''): void {
    this.stopCooldown();
    this.isAdminLocked.set(false);
    const targetSeconds = Math.max(1, seconds);
    this.remainingSeconds.set(targetSeconds);
    this.lockoutLevel.set(level);
    if (message) {
      this.safeErrorMessage.set(message);
    }

    this.timerSub = timer(1000, 1000).subscribe(() => {
      const current = this.remainingSeconds();
      if (current <= 1) {
        this.stopCooldown();
        this.safeErrorMessage.set('');
      } else {
        this.remainingSeconds.set(current - 1);
      }
    });
  }

  setAdminLocked(message: string): void {
    this.stopCooldown();
    this.isAdminLocked.set(true);
    this.lockoutLevel.set(4);
    if (message) {
      this.safeErrorMessage.set(message);
    }
  }

  stopCooldown(): void {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;
    }
    this.remainingSeconds.set(0);
  }

  setFailedAttempt(remainingAttempts: number, requireCaptcha: boolean, message: string = ''): void {
    this.remainingAttempts.set(remainingAttempts);
    this.requireCaptcha.set(requireCaptcha);
    if (message) {
      this.safeErrorMessage.set(message);
    }
    if (requireCaptcha && !this.captchaChallenge()) {
      this.fetchCaptchaChallenge().subscribe();
    }
  }

  fetchCaptchaChallenge(): Observable<CaptchaChallenge> {
    const obs = this.http.get<CaptchaChallenge>('/api/account/captcha-challenge');
    obs.subscribe({
      next: (challenge) => this.captchaChallenge.set(challenge),
      error: () => this.captchaChallenge.set(null),
    });
    return obs;
  }

  checkLockoutStatus(userNameOrEmail: string): Observable<LockoutStatus> {
    return this.http.post<LockoutStatus>('/api/account/check-lockout-status', { userNameOrEmail });
  }

  unlockUser(userId: string, reason: string): Observable<AdminUnlockResponse> {
    return this.restService.request<any, AdminUnlockResponse>({
      method: 'POST',
      url: `/api/app/identity/users/${userId}/unlock`,
      body: { reason }
    });
  }

  lockUser(userId: string, lockoutMinutesOrReason?: number | string, reason?: string): Observable<AdminLockResponse> {
    let finalReason = 'Quản trị viên khóa từ UI';
    let minutes = 0;
    if (typeof lockoutMinutesOrReason === 'string') {
      finalReason = lockoutMinutesOrReason;
    } else if (typeof lockoutMinutesOrReason === 'number') {
      minutes = lockoutMinutesOrReason;
      if (reason) finalReason = reason;
    } else if (reason) {
      finalReason = reason;
    }

    return this.restService.request<any, AdminLockResponse>({
      method: 'POST',
      url: `/api/app/identity/users/${userId}/lock`,
      body: { lockoutMinutes: minutes, reason: finalReason }
    });
  }

  resetAll(): void {
    this.stopCooldown();
    this.isAdminLocked.set(false);
    this.lockoutLevel.set(0);
    this.remainingAttempts.set(5);
    this.requireCaptcha.set(false);
    this.captchaChallenge.set(null);
    this.safeErrorMessage.set('');
  }
}

