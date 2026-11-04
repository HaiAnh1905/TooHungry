import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, ConfigStateService, CoreModule, LocalizationService, SessionStateService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule } from '@abp/ng.theme.shared';
import { Subscription } from 'rxjs';
import { CashierStateService } from '../services/cashier-state.service';
import { CashierSyncService } from '../services/cashier-sync.service';
import { AudioNotificationService } from '../services/audio-notification.service';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';
import { CashierNotificationItem, CashierNotificationType } from '../models/cashier.models';

@Component({
  selector: 'app-cashier-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
  ],
  templateUrl: './cashier-layout.component.html',
  styleUrls: ['./cashier-layout.component.scss'],
})
export class CashierLayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly configState = inject(ConfigStateService);
  readonly sessionState = inject(SessionStateService);
  readonly localization = inject(LocalizationService);
  readonly router = inject(Router);
  readonly confirmationService = inject(ConfirmationService);
  readonly userRoleNav = inject(UserRoleNavigationService);
  readonly state = inject(CashierStateService);
  readonly syncService = inject(CashierSyncService);
  readonly audioService = inject(AudioNotificationService);

  readonly currentLanguage = signal<string>('vi');
  readonly isLanguageDropdownOpen = signal<boolean>(false);
  readonly isNotificationDropdownOpen = signal<boolean>(false);
  readonly isSidebarOpenMobile = signal<boolean>(false);

  readonly supportedLanguages = [
    { code: 'vi', displayName: '::LanguageVietnamese', shortName: 'VI' },
    { code: 'en', displayName: '::LanguageEnglish', shortName: 'EN' },
  ];

  readonly currentLangItem = computed(() => {
    const code = this.currentLanguage();
    return this.supportedLanguages.find(l => l.code === code) || this.supportedLanguages[0];
  });

  private langSub?: Subscription;
  private userSub?: Subscription;

  readonly userInfo = signal({
    userName: '',
    fullName: '',
    roles: [] as string[],
    canReturnToAdmin: false,
  });

  readonly userInitials = computed(() => {
    const info = this.userInfo();
    const name = info.fullName || info.userName || 'TN';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.initUserInfo();
    this.initLanguage();
    // Tải tổng quan ca trực khi khởi động
    this.state.loadShiftSummary().subscribe();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  private initUserInfo(): void {
    const applyUser = (currentUser: any) => {
      if (!currentUser) return;
      const roles: string[] = currentUser.roles || [];
      const canReturnToAdmin = this.userRoleNav.canNavigateToAdmin();

      this.userInfo.set({
        userName: currentUser.userName || '',
        fullName: currentUser.name
          ? `${currentUser.name} ${currentUser.surName || ''}`.trim()
          : currentUser.userName || 'Thu Ngân',
        roles,
        canReturnToAdmin,
      });
    };

    applyUser(this.configState.getOne('currentUser'));

    this.userSub = this.configState.getOne$('currentUser').subscribe(user => {
      if (user) {
        applyUser(user);
      }
    });
  }

  private initLanguage(): void {
    const lang = this.sessionState.getLanguage() || 'vi';
    this.currentLanguage.set(lang.toLowerCase().startsWith('en') ? 'en' : 'vi');

    this.langSub = this.sessionState.getLanguage$().subscribe(l => {
      if (l) {
        this.currentLanguage.set(l.toLowerCase().startsWith('en') ? 'en' : 'vi');
      }
    });
  }

  toggleLanguageDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isLanguageDropdownOpen.update(v => !v);
  }

  switchLanguage(langCode: string): void {
    if (this.currentLanguage() === langCode) {
      this.isLanguageDropdownOpen.set(false);
      return;
    }
    this.sessionState.setLanguage(langCode);
    this.currentLanguage.set(langCode);
    this.isLanguageDropdownOpen.set(false);
  }

  toggleAudioMute(): void {
    this.audioService.toggleMute();
  }

  toggleMobileSidebar(): void {
    this.isSidebarOpenMobile.update(v => !v);
  }

  closeMobileSidebar(): void {
    this.isSidebarOpenMobile.set(false);
  }

  toggleNotificationDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isNotificationDropdownOpen.update(v => !v);
  }

  getNotificationIcon(type: CashierNotificationType): string {
    switch (type) {
      case 'table_transferred':
        return 'fa-arrow-right-arrow-left';
      case 'table_occupied':
      case 'waiter_seated':
        return 'fa-user-check';
      case 'meal_ended':
        return 'fa-flag-checkered';
      case 'table_reserved':
        return 'fa-calendar-check';
      case 'order_placed':
        return 'fa-utensils';
      case 'bill_requested':
        return 'fa-receipt';
      case 'payment_completed':
        return 'fa-check-circle';
      default:
        return 'fa-bell';
    }
  }

  getNotificationIconClass(type: CashierNotificationType): string {
    switch (type) {
      case 'table_transferred':
        return 'icon-occupied';
      case 'table_occupied':
      case 'waiter_seated':
        return 'icon-occupied';
      case 'meal_ended':
        return 'icon-cleaning';
      case 'table_reserved':
        return 'icon-order';
      case 'order_placed':
        return 'icon-order';
      case 'bill_requested':
        return 'icon-bill';
      case 'payment_completed':
        return 'icon-payment';
      default:
        return 'icon-default';
    }
  }

  getNotificationTitle(item: CashierNotificationItem): string {
    return this.localization.instant(item.titleKey) || item.rawTitle || '';
  }

  getNotificationMessage(item: CashierNotificationItem): string {
    if (item.messageParams && item.messageParams.length > 0) {
      return this.localization.instant(item.messageKey, ...item.messageParams) || item.rawMessage || '';
    }
    return this.localization.instant(item.messageKey) || item.rawMessage || '';
  }

  formatNotificationTime(date: Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return this.localization.instant('::TimeJustNow') || 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} ${this.localization.instant('::MinutesAgo') || 'phút trước'}`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ${this.localization.instant('::HoursAgo') || 'giờ trước'}`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  onNotificationItemClick(item: CashierNotificationItem): void {
    this.state.markNotificationAsRead(item.id);
    this.isNotificationDropdownOpen.set(false);
    if (item.tableId) {
      this.router.navigate(['/cashier/tables'], { queryParams: { focusTableId: item.tableId } });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isLanguageDropdownOpen()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-dropdown-wrapper')) {
        this.isLanguageDropdownOpen.set(false);
      }
    }
    if (this.isNotificationDropdownOpen()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-dropdown-wrapper')) {
        this.isNotificationDropdownOpen.set(false);
      }
    }
  }

  returnToAdmin(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    this.confirmationService
      .warn('::ConfirmLogoutMessage', '::ConfirmLogoutTitle')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.authService.logout().subscribe();
        }
      });
  }
}
