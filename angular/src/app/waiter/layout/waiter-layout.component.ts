import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, ConfigStateService, CoreModule } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule } from '@abp/ng.theme.shared';
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
  readonly router = inject(Router);
  readonly sidebarService = inject(WaiterSidebarService);
  readonly confirmationService = inject(ConfirmationService);
  readonly tableSignalr = inject(TableSignalrService);

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

  ngOnInit(): void {
    this.initUserInfo();
    this.initNetworkListeners();

    // Cập nhật ca trực định kỳ mỗi phút
    this.shiftIntervalId = setInterval(() => {
      this.updateShiftInfo();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.shiftIntervalId) {
      clearInterval(this.shiftIntervalId);
    }
    if (typeof window !== 'undefined') {
      if (this.onlineListener) window.removeEventListener('online', this.onlineListener);
      if (this.offlineListener) window.removeEventListener('offline', this.offlineListener);
    }
  }

  private initUserInfo(): void {
    const currentUser = this.configState.getOne('currentUser') as any;
    const roles: string[] = currentUser?.roles || [];
    const canReturnToAdmin = roles.some(
      r => r === 'Manager' || r === 'Administrator' || r === 'admin'
    );
    const shift = this.calculateShift();

    this.userInfo.set({
      userId: currentUser?.id || '',
      userName: currentUser?.userName || '',
      fullName: currentUser?.name
        ? `${currentUser.name} ${currentUser.surName || ''}`.trim()
        : currentUser?.userName || 'Waiter',
      roles,
      shiftType: shift.type,
      shiftLocalizationKey: shift.key,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      canReturnToAdmin,
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
