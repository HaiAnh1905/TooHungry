/** @vitest-environment jsdom */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RestService } from '@abp/ng.core';
import { of } from 'rxjs';
import { AuthLockoutService } from './auth-lockout.service';

describe('AuthLockoutService', () => {
  let service: AuthLockoutService;
  let httpMock: { get: any; post: any };
  let restMock: { request: any };

  beforeEach(() => {
    vi.useFakeTimers();

    httpMock = {
      get: vi.fn().mockReturnValue(of({
        challengeId: 'c1',
        question: '7 + 5 = ?',
        signature: 'sig',
        timestamp: 12345,
        expiresAtUtc: '2026-11-09T00:00:00Z',
      })),
      post: vi.fn().mockReturnValue(of({
        isLockedOut: false,
        lockoutLevel: 0,
        remainingSeconds: 0,
        requireCaptcha: false,
      })),
    };

    restMock = {
      request: vi.fn().mockReturnValue(of({ success: true, message: 'OK' })),
    };

    const injector = Injector.create({
      providers: [
        { provide: AuthLockoutService, useClass: AuthLockoutService },
        { provide: HttpClient, useValue: httpMock },
        { provide: RestService, useValue: restMock },
      ],
    });

    service = injector.get(AuthLockoutService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('nên khởi tạo với trạng thái mặc định không bị khóa', () => {
    expect(service).toBeTruthy();
    expect(service.remainingSeconds()).toBe(0);
    expect(service.isLocked()).toBe(false);
    expect(service.formattedCountdown()).toBe('00:00');
    expect(service.remainingAttempts()).toBe(5);
    expect(service.requireCaptcha()).toBe(false);
  });

  it('startCooldown() nên kích hoạt đếm ngược và định dạng MM:SS chính xác', () => {
    service.startCooldown(125, 2, 'Tài khoản bị khóa');

    expect(service.remainingSeconds()).toBe(125);
    expect(service.isLocked()).toBe(true);
    expect(service.lockoutLevel()).toBe(2);
    expect(service.formattedCountdown()).toBe('02:05');
    expect(service.safeErrorMessage()).toBe('Tài khoản bị khóa');

    // Tiến thời gian thêm 5 giây
    vi.advanceTimersByTime(5000);
    expect(service.remainingSeconds()).toBe(120);
    expect(service.formattedCountdown()).toBe('02:00');
  });

  it('nên tự động mở khóa khi đếm ngược về 0', () => {
    service.startCooldown(2, 1);
    expect(service.isLocked()).toBe(true);

    vi.advanceTimersByTime(2000);

    expect(service.remainingSeconds()).toBe(0);
    expect(service.isLocked()).toBe(false);
    expect(service.formattedCountdown()).toBe('00:00');
  });

  it('stopCooldown() nên dừng đếm ngược ngay lập tức', () => {
    service.startCooldown(300, 1);
    expect(service.isLocked()).toBe(true);

    service.stopCooldown();

    expect(service.remainingSeconds()).toBe(0);
    expect(service.isLocked()).toBe(false);
  });

  it('setFailedAttempt() cập nhật số lần thử còn lại và cờ requireCaptcha', () => {
    service.setFailedAttempt(2, true, 'Sai mật khẩu lần 3');

    expect(service.remainingAttempts()).toBe(2);
    expect(service.requireCaptcha()).toBe(true);
    expect(service.safeErrorMessage()).toBe('Sai mật khẩu lần 3');
    expect(httpMock.get).toHaveBeenCalledWith('/api/account/captcha-challenge');
  });

  it('setAdminLocked() nên thiết lập trạng thái khóa bởi Admin và không chạy countdown', () => {
    service.setAdminLocked('Tài khoản bị Admin khóa');

    expect(service.isAdminLocked()).toBe(true);
    expect(service.remainingSeconds()).toBe(0);
    expect(service.isLocked()).toBe(false); // isLocked is for timer countdown
    expect(service.lockoutLevel()).toBe(4);
    expect(service.safeErrorMessage()).toBe('Tài khoản bị Admin khóa');

    // Sau khi advance thời gian, remainingSeconds vẫn là 0
    vi.advanceTimersByTime(5000);
    expect(service.remainingSeconds()).toBe(0);
    expect(service.isAdminLocked()).toBe(true);

    // resetAll() xóa trạng thái admin lock
    service.resetAll();
    expect(service.isAdminLocked()).toBe(false);
  });

  it('lockUser() nên gọi đúng POST endpoint qua restService để khóa tài khoản', () => {
    service.lockUser('u1', 30, 'Lý do khóa');
    expect(restMock.request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/app/identity/users/u1/lock',
      body: {
        lockoutMinutes: 30,
        reason: 'Lý do khóa',
      },
    });
  });

  it('unlockUser() nên gọi đúng POST endpoint qua restService để mở khóa tài khoản', () => {
    service.unlockUser('u1', 'Lý do mở khóa');
    expect(restMock.request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/app/identity/users/u1/unlock',
      body: {
        reason: 'Lý do mở khóa',
      },
    });
  });
});

