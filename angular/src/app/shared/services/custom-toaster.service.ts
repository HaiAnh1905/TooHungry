import { Injectable } from '@angular/core';
import { ToasterService, Toaster } from '@abp/ng.theme.shared';
import { LocalizationParam } from '@abp/ng.core';

/**
 * CustomToasterService overrides ABP's default ToasterService to enforce
 * a maximum of 3 concurrent toast notifications on screen.
 * When a new notification arrives and 3 are already shown,
 * the oldest notification is dismissed to make room for the new one.
 */
@Injectable({
  providedIn: 'root',
})
export class CustomToasterService extends ToasterService {
  private readonly maxToasts = 3;

  override show(
    message: LocalizationParam,
    title: LocalizationParam | undefined = undefined,
    severity: Toaster.Severity = 'neutral',
    options: Partial<Toaster.ToastOptions> = {}
  ): Toaster.ToasterId {
    // Set a crisp default lifetime of 3500ms unless sticky or explicitly specified
    const toastOptions: Partial<Toaster.ToastOptions> = {
      life: 3500,
      ...options,
    };

    // Ensure at most (maxToasts - 1) exist before pushing the new one
    const currentToasts: any[] = (this as any).toasts;
    if (Array.isArray(currentToasts)) {
      while (currentToasts.length >= this.maxToasts) {
        currentToasts.shift();
      }
    }

    const result = super.show(message, title, severity, toastOptions);
    const containerRef = (this as any).containerComponentRef;
    if (containerRef?.setInput) {
      containerRef.setInput('top', '24px');
      containerRef.setInput('bottom', 'auto');
      containerRef.setInput('right', '24px');
    }
    return result;
  }
}
