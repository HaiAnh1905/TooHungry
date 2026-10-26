import { Injectable } from '@angular/core';
import { ToasterService, Toaster } from '@abp/ng.theme.shared';
import { LocalizationParam } from '@abp/ng.core';

/**
 * CustomToasterService overrides ABP's default ToasterService to enforce
 * a maximum of 3 concurrent toast notifications on screen.
 * It manages active toast IDs cleanly without touching private members of ABP ToasterService.
 */
@Injectable({
  providedIn: 'root',
})
export class CustomToasterService extends ToasterService {
  private readonly maxToasts = 3;
  private readonly activeToastIds: number[] = [];

  override show(
    message: LocalizationParam,
    title: LocalizationParam | undefined = undefined,
    severity: Toaster.Severity = 'neutral',
    options: Partial<Toaster.ToastOptions> = {}
  ): Toaster.ToasterId {
    const lifeDuration = options.life ?? 3500;
    const toastOptions: Partial<Toaster.ToastOptions> = {
      life: lifeDuration,
      ...options,
    };

    // Remove oldest toast if maximum reached
    while (this.activeToastIds.length >= this.maxToasts) {
      const oldestId = this.activeToastIds.shift();
      if (typeof oldestId === 'number') {
        this.remove(oldestId);
      }
    }

    const toastId = super.show(message, title, severity, toastOptions);
    const numId = typeof toastId === 'number' ? toastId : Number(toastId);
    if (!isNaN(numId)) {
      this.activeToastIds.push(numId);

      // Schedule ID cleanup after toast expires (unless sticky)
      if (!options.sticky && lifeDuration > 0) {
        setTimeout(() => {
          const index = this.activeToastIds.indexOf(numId);
          if (index > -1) {
            this.activeToastIds.splice(index, 1);
          }
        }, lifeDuration + 100);
      }
    }

    return toastId;
  }
}
