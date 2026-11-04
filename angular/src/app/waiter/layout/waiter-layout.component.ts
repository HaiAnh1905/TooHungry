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
import { AuthService, ConfigStateService, CoreModule, SessionStateService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule } from '@abp/ng.theme.shared';
import { Subscription } from 'rxjs';
import { WaiterSidebarService } from '../services/waiter-sidebar.service';
import { WaiterShiftType, WaiterUserInfo } from '../models/waiter-layout.models';
import { TableSignalrService } from '../../shared/services/table-signalr.service';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';
import { RESTAURANT_BUSINESS_HOURS } from '../../shared/constants/business-hours.constant';
import { WaiterNotificationService, WaiterNotificationItem } from '../services/waiter-notification.service';
import { AudioNotificationService } from '../../cashier/services/audio-notification.service';
import { LocalizationService } from '@abp/ng.core';

@Component({
  selector: 'app-waiter-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
  ],
  templateUrl: './waiter-layout.component.html',
  styleUrls: ['./waiter-layout.component.scss'],
})
export class WaiterLayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly configState = inject(ConfigStateService);
  readonly sessionState = inject(SessionStateService);
  readonly router = inject(Router);
  readonly sidebarService = inject(WaiterSidebarService);
  readonly confirmationService = inject(ConfirmationService);
  readonly tableSignalr = inject(TableSignalrService);
  readonly userRoleNav = inject(UserRoleNavigationService);
  readonly notificationService = inject(WaiterNotificationService);
  readonly audioService = inject(AudioNotificationService);
  private readonly localization = inject(LocalizationService);

  readonly currentLanguage = signal<string>('vi');
  readonly isLanguageDropdownOpen = signal<boolean>(false);
  readonly isNotificationDropdownOpen = signal<boolean>(false);

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

  readonly userInfo = signal<WaiterUserInfo>({
    userId: '',
    userName: '',
    fullName: '',
    roles: [],
    shiftType: WaiterShiftType.Morning,
    shiftLocalizationKey: '::ShiftMorning',
    isOnline: true,
    canReturnToAdmin: false,
  });

  private shiftIntervalId: any;
  private onlineListener?: () => void;
  private offlineListener?: () => void;

  readonly userInitials = computed(() => {
    const info = this.userInfo();
    const name = info.fullName || info.userName || 'W';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  readonly primaryRole = computed(() => {
    const roles = this.userInfo().roles || [];
    if (roles.includes('Administrator') || roles.includes('admin')) {
      return 'Administrator';
    }
    if (roles.includes('Manager')) {
      return 'Manager';
    }
    if (roles.includes('Cashier')) {
      return 'Cashier';
    }
    if (roles.includes('InventoryStaff')) {
      return 'InventoryStaff';
    }
    if (roles.includes('Waiter')) {
      return 'Waiter';
    }
    return roles.length > 0 ? roles[0] : 'Waiter';
  });

  readonly primaryRoleLocalizationKey = computed(() => {
    const role = this.primaryRole();
    switch (role) {
      case 'Administrator':
        return '::Role:Administrator';
      case 'Manager':
        return '::Role:Manager';
      case 'Cashier':
        return '::Role:Cashier';
      case 'InventoryStaff':
        return '::Role:InventoryStaff';
      case 'Waiter':
      default:
        return '::Role:Waiter';
    }
  });

  readonly primaryRoleDefaultValue = computed(() => {
    const role = this.primaryRole();
    switch (role) {
      case 'Administrator':
        return 'Administrator';
      case 'Manager':
        return 'Manager';
      case 'Cashier':
        return 'Cashier';
      case 'InventoryStaff':
        return 'Inventory Staff';
      case 'Waiter':
      default:
        return 'Waiter';
    }
  });

  ngOnInit(): void {
    // Thu ngân (Cashier) không thuộc phân hệ Waiter -> chuyển về Cổng Thu ngân
    if (this.userRoleNav.hasRole('Cashier') && !this.userRoleNav.canNavigateToAdmin()) {
      this.router.navigate(['/cashier/tables']);
      return;
    }

    this.initUserInfo();
    this.initNetworkListeners();
    this.initLanguage();

    // Cập nhật ca trực định kỳ mỗi phút
    this.shiftIntervalId = setInterval(() => {
      this.updateShiftInfo();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.shiftIntervalId) {
      clearInterval(this.shiftIntervalId);
    }
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    if (typeof window !== 'undefined') {
      if (this.onlineListener) window.removeEventListener('online', this.onlineListener);
      if (this.offlineListener) window.removeEventListener('offline', this.offlineListener);
    }
  }

  private initUserInfo(): void {
    const applyUser = (currentUser: any) => {
      if (!currentUser) return;
      const roles: string[] = currentUser.roles || [];
      const canReturnToAdmin = this.userRoleNav.canNavigateToAdmin();
      const shift = this.calculateShift();

      this.userInfo.set({
        userId: currentUser.id || '',
        userName: currentUser.userName || '',
        fullName: currentUser.name
          ? `${currentUser.name} ${currentUser.surName || ''}`.trim()
          : currentUser.userName || 'User',
        roles,
        shiftType: shift.type,
        shiftLocalizationKey: shift.key,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
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

  private updateShiftInfo(): void {
    const shift = this.calculateShift();
    this.userInfo.update(info => ({
      ...info,
      shiftType: shift.type,
      shiftLocalizationKey: shift.key,
    }));
  }

  private calculateShift(): { type: WaiterShiftType; key: string } {
    const hours = new Date().getHours();
    if (hours >= RESTAURANT_BUSINESS_HOURS.OPEN_HOUR && hours < RESTAURANT_BUSINESS_HOURS.EVENING_SHIFT_START) {
      return { type: WaiterShiftType.Morning, key: '::ShiftMorning' };
    } else if (hours >= RESTAURANT_BUSINESS_HOURS.EVENING_SHIFT_START && hours < RESTAURANT_BUSINESS_HOURS.CLOSE_HOUR) {
      return { type: WaiterShiftType.Evening, key: '::ShiftEvening' };
    } else {
      return { type: WaiterShiftType.OffShift, key: '::ShiftOff' };
    }
  }

  private initNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      this.onlineListener = () => {
        this.userInfo.update(u => ({ ...u, isOnline: true }));
      };
      this.offlineListener = () => {
        this.userInfo.update(u => ({ ...u, isOnline: false }));
      };
      window.addEventListener('online', this.onlineListener);
      window.addEventListener('offline', this.offlineListener);
    }
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

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.isNotificationDropdownOpen.update(v => !v);
  }

  toggleAudioMute(): void {
    this.audioService.toggleMute();
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'payment_completed':
      case 'cashier_payment':
        return 'icon-payment';
      case 'table_transferred':
      case 'table_occupied':
      case 'cashier_seated':
        return 'icon-occupied';
      case 'cashier_freed':
        return 'icon-freed';
      case 'bill_requested':
        return 'icon-bill';
      case 'order_placed':
        return 'icon-order';
      case 'table_reserved':
      case 'cashier_reserved':
        return 'icon-reserved';
      default:
        return 'icon-default';
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'payment_completed':
      case 'cashier_payment':
        return 'fa-circle-check';
      case 'table_transferred':
        return 'fa-arrow-right-arrow-left';
      case 'table_occupied':
      case 'cashier_seated':
        return 'fa-user-check';
      case 'cashier_freed':
        return 'fa-door-open';
      case 'bill_requested':
        return 'fa-file-invoice-dollar';
      case 'order_placed':
        return 'fa-utensils';
      case 'table_reserved':
      case 'cashier_reserved':
        return 'fa-calendar-check';
      default:
        return 'fa-bell';
    }
  }

  getNotificationTitle(item: WaiterNotificationItem): string {
    return this.localization.instant(item.titleKey);
  }

  getNotificationMessage(item: WaiterNotificationItem): string {
    if (item.messageArgs && item.messageArgs.length > 0) {
      const args = item.messageArgs.map(a => String(a));
      return this.localization.instant(item.messageKey, ...args);
    }
    return this.localization.instant(item.messageKey);
  }

  formatNotificationTime(date: Date): string {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diffSeconds < 60) {
      return this.localization.instant('::TimeJustNow');
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} ${this.localization.instant('::MinutesAgo')}`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} ${this.localization.instant('::HoursAgo')}`;
    }
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  onNotificationItemClick(item: WaiterNotificationItem): void {
    this.notificationService.markAsRead(item.id);
    this.isNotificationDropdownOpen.set(false);

    if (item.tableId) {
      this.router.navigate(['/waiter/tables'], {
        queryParams: { focusTableId: item.tableId },
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isLanguageDropdownOpen()) {
      if (!target.closest('.language-dropdown-wrapper')) {
        this.isLanguageDropdownOpen.set(false);
      }
    }
    if (this.isNotificationDropdownOpen()) {
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
