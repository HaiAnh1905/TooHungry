import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, LocalizationService } from '@abp/ng.core';

export type ExpiryStatus = 'safe' | 'expiring_soon' | 'expired' | 'fresh_expired';

@Component({
  selector: 'app-expiration-badge',
  standalone: true,
  imports: [CommonModule, CoreModule],
  templateUrl: './expiration-badge.component.html',
  styleUrl: './expiration-badge.component.scss',
})
export class ExpirationBadgeComponent {
  private readonly localizationService = inject(LocalizationService);

  @Input() expiryDate?: string;
  @Input() storageType?: number; // 0: FRESH, 1: SHORT_TERM, 2: LONG_TERM
  @Input() allowDiscard = true;
  @Output() discard = new EventEmitter<void>();

  get status(): ExpiryStatus {
    if (!this.expiryDate) return 'safe';
    const now = new Date().getTime();
    const exp = new Date(this.expiryDate).getTime();

    // Đã quá hạn
    if (exp <= now) {
      return this.storageType === 0 ? 'fresh_expired' : 'expired';
    }

    // Đối với nguyên liệu tươi sống (FRESH / 0), chỉ sau khi hết hạn mới hiện cảnh báo
    if (this.storageType === 0) {
      return 'safe';
    }

    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return 'expiring_soon';
    }
    return 'safe';
  }

  get remainingDays(): number {
    if (!this.expiryDate) return 999;
    const now = new Date().getTime();
    const exp = new Date(this.expiryDate).getTime();
    if (exp <= now) return 0;
    return Math.max(1, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
  }

  get remainingDaysStr(): string {
    return String(this.remainingDays);
  }

  get expiringSoonLabel(): string {
    return this.localizationService.instant(
      '::Status:ExpiringSoon',
      this.remainingDaysStr
    );
  }

  onDiscard(): void {
    this.discard.emit();
  }
}
