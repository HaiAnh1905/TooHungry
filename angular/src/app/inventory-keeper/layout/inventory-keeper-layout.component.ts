import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService, ConfigStateService, CoreModule, LocalizationService, SessionStateService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule } from '@abp/ng.theme.shared';
import { Subscription, filter } from 'rxjs';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { BarcodeScannerService } from '../services/barcode-scanner.service';
import { InventoryKeeperShiftType, InventoryKeeperUserInfo } from '../models/inventory-keeper.models';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';
import viData from '../../../assets/i18n/vi.json';
import enData from '../../../assets/i18n/en.json';

import { InventoryKeeperSidebarComponent } from '../sidebar/inventory-keeper-sidebar.component';
import { BarcodeCameraModalComponent } from '../barcode-modal/barcode-camera-modal.component';

@Component({
  selector: 'app-inventory-keeper-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
    InventoryKeeperSidebarComponent,
    BarcodeCameraModalComponent,
  ],
  templateUrl: './inventory-keeper-layout.component.html',
  styleUrls: ['./inventory-keeper-layout.component.scss'],
})
export class InventoryKeeperLayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly configState = inject(ConfigStateService);
  readonly sessionState = inject(SessionStateService);
  readonly localizationService = inject(LocalizationService);
  readonly router = inject(Router);
  readonly sidebarService = inject(InventoryKeeperSidebarService);
  readonly alertStateService = inject(InventoryAlertStateService);
  readonly barcodeService = inject(BarcodeScannerService);
  readonly confirmationService = inject(ConfirmationService);
  readonly userRoleNav = inject(UserRoleNavigationService);

  readonly currentLanguage = signal<string>('vi');
  readonly isLanguageDropdownOpen = signal<boolean>(false);
  readonly isNotificationDropdownOpen = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly currentActiveTab = signal<string>(this.getInitialTab());

  private getInitialTab(): string {
    const url = this.router?.url || '';
    if (url.includes('/inventory-keeper/batches')) return 'batches';
    if (url.includes('/inventory-keeper/transactions')) return 'transactions';
    return 'dashboard';
  }

  readonly totalAlertsCount = computed(() => {
    const summary = this.alertStateService.kpiSummary();
    return (summary?.expiringSoonCount || 0) + (summary?.lowStockCount || 0) + (summary?.expiredCount || 0);
  });

  readonly supportedLanguages = [
    { code: 'vi', displayName: '::LanguageVietnamese', shortName: 'VI' },
    { code: 'en', displayName: '::LanguageEnglish', shortName: 'EN' },
  ];

  readonly currentLangItem = computed(() => {
    const code = this.currentLanguage();
    return this.supportedLanguages.find(l => l.code === code) || this.supportedLanguages[0];
  });

  readonly userInfo = signal<InventoryKeeperUserInfo>({
    userId: '',
    userName: '',
    fullName: '',
    roles: [],
    shiftType: InventoryKeeperShiftType.Morning,
    shiftLocalizationKey: '::KeeperShiftMorning',
    isOnline: true,
    canReturnToAdmin: false,
  });

  private shiftIntervalId: any;
  private routerSub?: Subscription;
  private langSub?: Subscription;
  private userSub?: Subscription;

  readonly userInitials = computed(() => {
    const info = this.userInfo();
    const name = info.fullName || info.userName || 'K';
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
    if (roles.includes('InventoryStaff')) {
      return 'InventoryStaff';
    }
    return roles.length > 0 ? roles[0] : 'InventoryStaff';
  });

  ngOnInit(): void {
    // 0. Nạp trước từ điển song ngữ dự phòng cho resource TooHungry
    this.localizationService.addLocalization([
      { culture: 'vi', resources: [{ resourceName: 'TooHungry', texts: viData as Record<string, string> }] },
      { culture: 'en', resources: [{ resourceName: 'TooHungry', texts: enData as Record<string, string> }] },
    ]);

    // 1. Đồng bộ ngôn ngữ
    this.langSub = this.sessionState.getLanguage$().subscribe(lang => {
      if (lang) {
        this.currentLanguage.set(lang);
      }
    });

    // 2. Khởi tạo thông tin người dùng
    this.userSub = this.configState.getOne$('currentUser').subscribe(user => {
      if (user) {
        this.updateUserInfo(user);
      }
    });

    // 3. Khởi tạo tính ca trực định kỳ mỗi phút
    this.calculateShift();
    this.shiftIntervalId = setInterval(() => {
      this.calculateShift();
    }, 60000);

    // 4. Theo dõi URL đang kích hoạt tab nào
    this.updateActiveTab(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateActiveTab(event.urlAfterRedirects || event.url);
      });

    // 5. Tải số liệu cảnh báo ban đầu
    this.alertStateService.refreshAlerts();

    // 6. Bật lắng nghe súng quét mã vạch HID
    this.barcodeService.startHidListener();
  }

  private updateActiveTab(url: string): void {
    if (url.includes('/inventory-keeper/batches')) {
      this.currentActiveTab.set('batches');
    } else if (url.includes('/inventory-keeper/transactions')) {
      this.currentActiveTab.set('transactions');
    } else {
      this.currentActiveTab.set('dashboard');
    }
  }

  private updateUserInfo(currentUser: any): void {
    const roles: string[] = currentUser?.roles || [];
    const canReturn = this.userRoleNav.canNavigateToAdmin();

    this.userInfo.update(state => ({
      ...state,
      userId: currentUser?.id || '',
      userName: currentUser?.userName || '',
      fullName: currentUser?.name || currentUser?.userName || 'Thủ kho',
      roles: roles,
      canReturnToAdmin: canReturn,
    }));
  }

  private calculateShift(): void {
    const now = new Date();
    const hours = now.getHours();

    let shiftType = InventoryKeeperShiftType.OffShift;
    let shiftKey = '::KeeperShiftOff';

    if (hours >= 8 && hours < 15) {
      shiftType = InventoryKeeperShiftType.Morning;
      shiftKey = '::KeeperShiftMorning';
    } else if (hours >= 15 && hours < 22) {
      shiftType = InventoryKeeperShiftType.AfternoonEvening;
      shiftKey = '::KeeperShiftAfternoon';
    }

    this.userInfo.update(state => ({
      ...state,
      shiftType,
      shiftLocalizationKey: shiftKey,
    }));
  }

  toggleLanguageDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isNotificationDropdownOpen.set(false);
    this.isLanguageDropdownOpen.update(v => !v);
  }

  toggleNotificationDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isLanguageDropdownOpen.set(false);
    this.isNotificationDropdownOpen.update(v => !v);
  }

  closeDropdowns(): void {
    this.isLanguageDropdownOpen.set(false);
    this.isNotificationDropdownOpen.set(false);
    this.sidebarService.setIngredientDropdownOpen?.(false);
  }

  onBarcodeScanned(code: string): void {
    if (this.currentActiveTab() !== 'batches') {
      this.router.navigate(['/inventory-keeper/batches'], {
        queryParams: { search: code },
      });
    }
  }

  switchLanguage(langCode: string): void {
    this.sessionState.setLanguage(langCode);
    this.currentLanguage.set(langCode);
    this.closeDropdowns();
  }

  async refreshData(): Promise<void> {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    try {
      await this.alertStateService.refreshAlerts();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  returnToAdmin(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    const confirmation$ = this.confirmationService.warn(
      '::AreYouSure',
      '::Logout',
      {
        dismissible: true,
      }
    );

    confirmation$.subscribe((status: Confirmation.Status) => {
      if (status === Confirmation.Status.confirm) {
        this.authService.logout().subscribe(() => {
          this.router.navigate(['/account/login']);
        });
      }
    });
  }

  navigateToTab(tab: string, queryParams?: any): void {
    this.router.navigate([`/inventory-keeper/${tab}`], { queryParams });
    this.sidebarService.setMobileDrawerOpen(false);
  }

  ngOnDestroy(): void {
    if (this.shiftIntervalId) {
      clearInterval(this.shiftIntervalId);
    }
    this.routerSub?.unsubscribe();
    this.langSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.barcodeService.stopHidListener();
    this.sidebarService.clearTemplate();
  }
}
