import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CoreModule, AuthService, ConfigStateService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { AccountService } from '@abp/ng.account.core/proxy';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-custom-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly configState = inject(ConfigStateService);
  private readonly toaster = inject(ToasterService);

  form!: FormGroup;
  inProgress = signal<boolean>(false);
  isPasswordVisible = signal<boolean>(false);
  validationWarnings = signal<string[]>([]);
  hasAttemptedSubmit = signal<boolean>(false);

  // Kiểm tra điều kiện mật khẩu real-time
  passwordValue = signal<string>('');

  hasLength = computed(() => (this.passwordValue() || '').length >= 6);
  hasLower = computed(() => /[a-z]/.test(this.passwordValue() || ''));
  hasUpper = computed(() => /[A-Z]/.test(this.passwordValue() || ''));
  hasDigit = computed(() => /[0-9]/.test(this.passwordValue() || ''));
  hasSpecial = computed(() => /[^a-zA-Z0-9]/.test(this.passwordValue() || ''));

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.form = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(32),
          this.userNamePatternValidator,
        ],
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          this.strictEmailValidator,
        ],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          this.strongPasswordValidator,
        ],
      ],
    });

    this.form.get('password')?.valueChanges.subscribe(val => {
      this.passwordValue.set(val || '');
      if (this.hasAttemptedSubmit()) {
        this.runValidationGuard();
      }
    });

    this.form.get('username')?.valueChanges.subscribe(() => {
      if (this.hasAttemptedSubmit()) {
        this.runValidationGuard();
      }
    });

    this.form.get('email')?.valueChanges.subscribe(() => {
      if (this.hasAttemptedSubmit()) {
        this.runValidationGuard();
      }
    });
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update(v => !v);
  }

  // --- CÁC HÀM VALIDATORS KIỂM SOÁT TÍNH HỢP LỆ ---
  private userNamePatternValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const valid = /^[a-zA-Z0-9._-]+$/.test(control.value.trim());
    return valid ? null : { invalidUserNamePattern: true };
  }

  private strictEmailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(control.value.trim()) ? null : { invalidEmailFormat: true };
  }

  private strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const val = control.value || '';
    if (!val) return null;
    const hasLower = /[a-z]/.test(val);
    const hasUpper = /[A-Z]/.test(val);
    const hasDigit = /[0-9]/.test(val);
    const hasSpecial = /[^a-zA-Z0-9]/.test(val);

    if (val.length < 6 || !hasLower || !hasUpper || !hasDigit || !hasSpecial) {
      return {
        weakPassword: {
          hasLower,
          hasUpper,
          hasDigit,
          hasSpecial,
          hasMinLength: val.length >= 6,
        },
      };
    }
    return null;
  }

  // --- GUARD CHÍNH: Kiểm tra và tổng hợp cảnh báo chi tiết ---
  private runValidationGuard(): boolean {
    const warnings: string[] = [];
    const usernameCtrl = this.form.get('username');
    const emailCtrl = this.form.get('email');
    const passwordCtrl = this.form.get('password');

    // 1. Guard Tên tài khoản
    const userVal = (usernameCtrl?.value || '').trim();
    if (!userVal) {
      warnings.push('Tên tài khoản không được để trống!');
    } else if (userVal.length < 3 || userVal.length > 32) {
      warnings.push(`Tên tài khoản phải dài từ 3 đến 32 ký tự (hiện có ${userVal.length} ký tự)!`);
    } else if (!/^[a-zA-Z0-9._-]+$/.test(userVal)) {
      warnings.push('Tên tài khoản không hợp lệ: chỉ được dùng chữ cái, chữ số, dấu gạch dưới (_), gạch ngang (-) hoặc chấm (.), không dùng khoảng trắng hay ký tự có dấu!');
    }

    // 2. Guard Địa chỉ Email
    const emailVal = (emailCtrl?.value || '').trim();
    if (!emailVal) {
      warnings.push('Địa chỉ Email không được để trống!');
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailVal)) {
      warnings.push('Địa chỉ Email không hợp lệ: vui lòng nhập đúng định dạng chuẩn (Ví dụ: name@example.com)!');
    }

    // 3. Guard Mật khẩu
    const pwdVal = passwordCtrl?.value || '';
    if (!pwdVal) {
      warnings.push('Mật khẩu không được để trống!');
    } else {
      const pwdErrors: string[] = [];
      if (pwdVal.length < 6) pwdErrors.push('tối thiểu 6 ký tự');
      if (!/[a-z]/.test(pwdVal)) pwdErrors.push('ít nhất 1 chữ thường (a-z)');
      if (!/[A-Z]/.test(pwdVal)) pwdErrors.push('ít nhất 1 chữ hoa (A-Z)');
      if (!/[0-9]/.test(pwdVal)) pwdErrors.push('ít nhất 1 chữ số (0-9)');
      if (!/[^a-zA-Z0-9]/.test(pwdVal)) pwdErrors.push('ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');

      if (pwdErrors.length > 0) {
        warnings.push(`Mật khẩu chưa đủ an toàn: cần ${pwdErrors.join(', ')}!`);
      }
    }

    this.validationWarnings.set(warnings);
    return warnings.length === 0;
  }

  // --- SUBMIT: Chặn (Guard) nếu thông tin chưa hợp lệ ---
  onSubmit(): void {
    this.hasAttemptedSubmit.set(true);
    this.form.markAllAsTouched();

    const isValid = this.runValidationGuard();

    if (!isValid) {
      // Focus vào ô input đầu tiên bị lỗi
      if (this.form.get('username')?.invalid) {
        document.getElementById('reg-username')?.focus();
      } else if (this.form.get('email')?.invalid) {
        document.getElementById('reg-email')?.focus();
      } else if (this.form.get('password')?.invalid) {
        document.getElementById('reg-password')?.focus();
      }
      return;
    }

    // Toàn bộ thông tin hợp lệ -> Tiến hành gửi đăng ký lên server
    this.inProgress.set(true);
    const formVal = this.form.value;

    const registerDto = {
      userName: formVal.username.trim(),
      emailAddress: formVal.email.trim(),
      password: formVal.password,
      appName: 'Angular',
    };

    this.accountService
      .register(registerDto)
      .pipe(
        finalize(() => this.inProgress.set(false))
      )
      .subscribe({
        next: () => {
          this.toaster.success('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.', 'Thành công', { life: 5000 });
          this.router.navigate(['/account/login']);
        },
        error: err => {
          const errMsg = err?.error?.error_description || err?.error?.error?.message || err?.message || 'Có lỗi xảy ra trong quá trình đăng ký!';
          this.toaster.error(errMsg, 'Đăng ký thất bại', { life: 7000 });
        },
      });
  }
}
