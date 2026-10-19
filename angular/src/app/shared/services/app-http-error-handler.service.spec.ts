import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppHttpErrorHandlerService } from './app-http-error-handler.service';

describe('AppHttpErrorHandlerService', () => {
  let service: AppHttpErrorHandlerService;
  let routerMock: { navigate: any };

  beforeEach(() => {
    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AppHttpErrorHandlerService,
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AppHttpErrorHandlerService);
  });

  it('nên được khởi tạo thành công', () => {
    expect(service).toBeTruthy();
    expect(service.priority).toBe(999);
  });

  it('canHandle() trả về true khi status là 403', () => {
    expect(service.canHandle({ status: 403 })).toBe(true);
  });

  it('canHandle() trả về true khi status là 500 hoặc 505', () => {
    expect(service.canHandle({ status: 500 })).toBe(true);
    expect(service.canHandle({ status: 505 })).toBe(true);
  });

  it('canHandle() trả về false khi status khác 403/500/505', () => {
    expect(service.canHandle({ status: 404 })).toBe(false);
    expect(service.canHandle({ status: 400 })).toBe(false);
    expect(service.canHandle({ status: 200 })).toBe(false);
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
