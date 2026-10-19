import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CustomHttpErrorHandlerService } from '@abp/ng.theme.shared';

/**
 * Custom HTTP Error Handler cho TooHungry:
 * Ưu tiên cao nhất (priority = 999) để thay thế hoàn toàn popup lỗi mặc định của ABP.
 * Tự động chuyển hướng người dùng sang trang Bento Card RM-019 tương ứng:
 * - 403: /error/403
 * - 500 / 505: /error/500?traceId=...
 */
@Injectable({
  providedIn: 'root',
})
export class AppHttpErrorHandlerService implements CustomHttpErrorHandlerService {
  readonly priority = 999;
  private readonly router = inject(Router);
  private currentError: any = null;

  canHandle(error: any): boolean {
    this.currentError = error;
    const status = error?.status;
    return status === 403 || status === 500 || status === 505;
  }

  execute(): void {
    const status = this.currentError?.status;

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
