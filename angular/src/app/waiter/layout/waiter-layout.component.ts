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

  readonly currentLanguage = signal<string>('vi');
  readonly isLanguageDropdownOpen = signal<boolean>(false);

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
      const canReturnToAdmin = roles.some(
        r => r === 'Manager' || r === 'Administrator' || r === 'admin'
      );
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
    if (hours >= 9 && hours < 15) {
      return { type: WaiterShiftType.Morning, key: '::ShiftMorning' };
    } else if (hours >= 15 && hours < 23) {
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
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isLanguageDropdownOpen()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-dropdown-wrapper')) {
        this.isLanguageDropdownOpen.set(false);
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
