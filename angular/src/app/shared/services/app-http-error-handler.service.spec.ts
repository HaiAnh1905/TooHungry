/** @vitest-environment jsdom */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { CreateErrorComponentService } from '@abp/ng.theme.shared';
import { AppHttpErrorHandlerService } from './app-http-error-handler.service';

describe('AppHttpErrorHandlerService', () => {
  let service: AppHttpErrorHandlerService;
  let routerMock: { navigate: any };
  let createErrorServiceMock: { execute: any };

  beforeEach(() => {
    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };
    createErrorServiceMock = {
      execute: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: AppHttpErrorHandlerService, useClass: AppHttpErrorHandlerService },
        { provide: Router, useValue: routerMock },
        { provide: CreateErrorComponentService, useValue: createErrorServiceMock },
      ],
    });

    service = injector.get(AppHttpErrorHandlerService);
  });

  it('nên được khởi tạo thành công', () => {
    expect(service).toBeTruthy();
    expect(service.priority).toBe(999);
  });

  it('canHandle() trả về true khi status là 0 (Network Error)', () => {
    expect(service.canHandle({ status: 0 })).toBe(true);
  });

  it('canHandle() trả về true khi status là 403', () => {
    expect(service.canHandle({ status: 403 })).toBe(true);
  });

  it('canHandle() trả về true khi status là 500 hoặc 505', () => {
    expect(service.canHandle({ status: 500 })).toBe(true);
    expect(service.canHandle({ status: 505 })).toBe(true);
  });

  it('canHandle() trả về false khi status khác 0/403/500/505', () => {
    expect(service.canHandle({ status: 404 })).toBe(false);
    expect(service.canHandle({ status: 400 })).toBe(false);
    expect(service.canHandle({ status: 200 })).toBe(false);
  });

  it('execute() gọi createErrorComponentService.execute khi status là 0', () => {
    service.canHandle({ status: 0, message: 'Http failure response' });
    service.execute();

    expect(createErrorServiceMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        isHomeShow: true,
        details: 'Http failure response',
      })
    );
  });

  it('execute() điều hướng sang /error/403 khi status là 403', () => {
    service.canHandle({ status: 403 });
    service.execute();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/error/403']);
  });

  it('execute() điều hướng sang /error/500 kèm traceId khi status là 500', () => {
    service.canHandle({
      status: 500,
      headers: { get: (name: string) => (name === 'x-correlation-id' ? 'TRACE-12345' : null) },
    });
    service.execute();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/error/500'], {
      queryParams: { traceId: 'TRACE-12345' },
    });
  });
});
