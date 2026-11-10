/** @vitest-environment jsdom */
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { CooldownTimerComponent } from './cooldown-timer.component';

describe('CooldownTimerComponent', () => {
  let component: CooldownTimerComponent;

  beforeEach(() => {
    component = new CooldownTimerComponent();
  });

  it('nên khởi tạo thành công với giá trị mặc định', () => {
    expect(component).toBeTruthy();
    expect(component.formattedTime).toBe('00:00');
    expect(component.remainingSeconds).toBe(0);
    expect(component.lockoutLevel).toBe(1);
    expect(component.customMessage).toBe('');
  });

  it('nhận các giá trị @Input đúng theo thiết lập', () => {
    component.formattedTime = '04:59';
    component.remainingSeconds = 299;
    component.lockoutLevel = 2;
    component.customMessage = 'Tài khoản tạm khóa 10 phút';

    expect(component.formattedTime).toBe('04:59');
    expect(component.remainingSeconds).toBe(299);
    expect(component.lockoutLevel).toBe(2);
    expect(component.customMessage).toBe('Tài khoản tạm khóa 10 phút');
  });

  it('hỗ trợ cờ isAdminLocked và phát ra sự kiện backToLoginRequested khi nhấn nút quay lại', () => {
    let emitted = false;
    component.backToLoginRequested.subscribe(() => {
      emitted = true;
    });

    component.isAdminLocked = true;
    expect(component.isAdminLocked).toBe(true);

    component.onBackToLogin();
    expect(emitted).toBe(true);
  });
});

