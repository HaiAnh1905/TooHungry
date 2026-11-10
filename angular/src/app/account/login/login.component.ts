import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule, AuthService, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { OAuthService } from 'angular-oauth2-oidc';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthLockoutService } from '../../shared/services/auth-lockout.service';
import { CooldownTimerComponent } from './components/cooldown-timer/cooldown-timer.component';
import { CaptchaChallengeComponent } from './components/captcha-challenge/captcha-challenge.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-custom-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CoreModule,
    ThemeSharedModule,
    CooldownTimerComponent,
    CaptchaChallengeComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly oAuthService = inject(OAuthService);
  private readonly localization = inject(LocalizationService);
  private readonly toaster = inject(ToasterService);
  readonly lockoutService = inject(AuthLockoutService);

  form!: FormGroup;
  inProgress = signal<boolean>(false);
  isPasswordVisible = signal<boolean>(false);
  hasAttemptedSubmit = signal<boolean>(false);
  captchaAnswer = signal<string>('');

  readonly isFormDisabled = computed(() => this.lockoutService.isLocked() || this.lockoutService.isAdminLocked() || this.inProgress());

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update(v => !v);
  }

  onCaptchaAnswerChange(answer: string): void {
    this.captchaAnswer.set(answer);
  }

  onRefreshCaptcha(): void {
    this.lockoutService.fetchCaptchaChallenge().subscribe();
  }

  onBackToLogin(): void {
    this.lockoutService.resetAll();
    this.form.patchValue({ password: '' });
    this.hasAttemptedSubmit.set(false);
  }

  onSubmit(): void {
    this.hasAttemptedSubmit.set(true);

    if (this.lockoutService.isLocked() || this.lockoutService.isAdminLocked()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.lockoutService.requireCaptcha() && !this.captchaAnswer()) {
      this.toaster.warn(this.localization.instant('::CaptchaRequiredMessage') || 'Vui lòng giải câu đố bảo mật!');
      return;
    }

    this.inProgress.set(true);
    const { username, password, rememberMe } = this.form.value;

    let customHeaders: HttpHeaders | undefined;
    if (this.lockoutService.requireCaptcha()) {
      const challenge = this.lockoutService.captchaChallenge();
      if (challenge) {
        customHeaders = new HttpHeaders({
          'captcha_answer': this.captchaAnswer(),
          'captcha_challenge_id': challenge.challengeId,
          'captcha_signature': challenge.signature,
          'captcha_timestamp': challenge.timestamp.toString(),
        });
      }
    }

    this.oAuthService.fetchTokenUsingPasswordFlow(username, password, customHeaders)
      .then(() => {
        this.lockoutService.resetAll();
        this.router.navigateByUrl('/');
      })
      .catch((errorResponse: any) => {
        this.handleAuthenticationError(errorResponse);
      })
      .finally(() => {
        this.inProgress.set(false);
      });
  }

  private handleAuthenticationError(errorResponse: any): void {
    // 1. HTTP 429 Too Many Requests (Rate Limiting)
    if (errorResponse?.status === 429 || errorResponse?.error?.code === 'TooHungry:RateLimitExceeded') {
      const retryAfter = errorResponse?.error?.data?.retryAfterSeconds
        || parseInt(errorResponse?.headers?.get?.('Retry-After') || '60', 10)
        || 60;
      const msg = errorResponse?.error?.message
        || this.localization.instant('::RateLimitExceededMessage')
        || 'Quá nhiều yêu cầu đăng nhập từ IP của bạn.';
      this.lockoutService.startCooldown(retryAfter, 1, msg);
      this.toaster.error(msg);
      return;
    }

    // Parse payload error
    const err = errorResponse?.params || errorResponse?.error || {};

    // 2. HTTP 400 Account Locked Out (Escalating Lockout or Admin Lockout)
    if (err.error === 'account_locked_out') {
      if (err.is_admin_locked) {
        const msg = err.safe_message
          || this.localization.instant('::AdminLockedAccountMessage')
          || 'Tài khoản của bạn đã bị Quản trị viên khóa. Vui lòng liên hệ Quản trị viên để được mở lại.';
        this.lockoutService.setAdminLocked(msg);
        this.toaster.error(msg);
        return;
      }

      const seconds = err.remaining_seconds || 300;
      const level = err.lockout_level || 1;
      const msg = err.safe_message
        || this.localization.instant(`::LockoutLevel${level}Message`)
        || 'Tài khoản của bạn đã bị khóa tạm thời do nhập sai nhiều lần.';
      this.lockoutService.startCooldown(seconds, level, msg);
      this.toaster.error(msg);
      return;
    }

    // 3. HTTP 400 Invalid Grant (Wrong password / Captcha needed)
    if (err.error === 'invalid_grant') {
      const remaining = err.remaining_attempts !== undefined ? err.remaining_attempts : 4;
      const requireCaptcha = !!err.require_captcha;
      const safeMsg = err.safe_message
        || this.localization.instant('::LoginSafeErrorMessage')
        || 'Tên đăng nhập hoặc mật khẩu không chính xác.';

      this.lockoutService.setFailedAttempt(remaining, requireCaptcha, safeMsg);

      if (requireCaptcha) {
        this.lockoutService.fetchCaptchaChallenge().subscribe();
      }

      this.toaster.error(safeMsg);
      return;
    }

    // Fallback general error
    const fallbackMsg = this.localization.instant('::LoginSafeErrorMessage') || 'Tên đăng nhập hoặc mật khẩu không chính xác.';
    this.toaster.error(fallbackMsg);
  }
}

