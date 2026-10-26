import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CustomHttpErrorHandlerService, CreateErrorComponentService } from '@abp/ng.theme.shared';

/**
 * Custom HTTP Error Handler cho TooHungry:
 * Ưu tiên cao nhất (priority = 999) để thay thế hoàn toàn popup lỗi mặc định của ABP.
 * - 0: Gọi CreateErrorComponentService gắn Bento Error Overlay trực tiếp vào DOM (không phụ thuộc Router)
 * - 403: Chuyển hướng sang /error/403
 * - 500 / 505: Chuyển hướng sang /error/500?traceId=...
 */
@Injectable({
  providedIn: 'root',
})
export class AppHttpErrorHandlerService implements CustomHttpErrorHandlerService {
  readonly priority = 999;
  private readonly router = inject(Router);
  private readonly createErrorComponentService = inject(CreateErrorComponentService);
  private currentError: any = null;

  canHandle(error: any): boolean {
    this.currentError = error;
    const status = error?.status;
    return status === 0 || status === 403 || status === 500 || status === 505;
  }

  execute(): void {
    const status = this.currentError?.status;

    if (status === 0) {
      const errorMsg =
        this.currentError?.message ||
        'Http failure response: Không thể kết nối tới dịch vụ API backend (https://localhost:44353).';

      this.createErrorComponentService.execute({
        title: {
          key: '::ErrorPages.0.Title',
          defaultValue: 'Không thể kết nối đến máy chủ / Cannot Connect to Server',
        },
        details: errorMsg,
        isHomeShow: true,
      });

      // Đảm bảo nút goHome tải lại trang từ đầu để nạp lại Application Configuration
      if (this.createErrorComponentService.componentRef?.instance) {
        this.createErrorComponentService.componentRef.instance.goHome = () => {
          window.location.href = '/';
        };
      }
      return;
    }

    if (status === 403) {
      this.router.navigate(['/error/403']);
      return;
    }

    if (status === 500 || status === 505) {
      const traceId =
        this.currentError?.headers?.get('x-correlation-id') ||
        this.currentError?.error?.error?.data?.traceId ||
        this.currentError?.error?.error?.code ||
        '';

      this.router.navigate(['/error/500'], {
        queryParams: traceId ? { traceId } : undefined,
      });
    }
  }
}
