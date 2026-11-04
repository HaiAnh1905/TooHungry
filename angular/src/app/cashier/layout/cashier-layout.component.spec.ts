/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService, ConfigStateService, SessionStateService, LocalizationService } from '@abp/ng.core';
import { ConfirmationService } from '@abp/ng.theme.shared';
import { CashierLayoutComponent } from './cashier-layout.component';
import { CashierStateService } from '../services/cashier-state.service';
import { CashierSyncService } from '../services/cashier-sync.service';
import { AudioNotificationService } from '../services/audio-notification.service';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';

describe('CashierLayoutComponent', () => {
  let component: CashierLayoutComponent;
  let mockRouter: any;
  let mockAuthService: any;
  let mockConfigState: any;
  let mockSessionState: any;
  let mockConfirmationService: any;
  let mockUserRoleNav: any;
  let mockCashierState: any;
  let mockCashierSync: any;
  let mockAudioService: any;

  beforeEach(() => {
    mockRouter = {
      url: '/cashier/tables',
      events: new Subject(),
      navigate: vi.fn(),
    };
    mockAuthService = {
      isAuthenticated: true,
      logout: vi.fn().mockReturnValue(of(void 0)),
    };
    mockConfigState = {
      getOne: vi.fn().mockReturnValue({
        userName: 'cashier1',
        name: 'Nguyen Thi',
        surName: 'Ngan',
        roles: ['Cashier'],
      }),
      getOne$: vi.fn().mockReturnValue(
        of({
          userName: 'cashier1',
          name: 'Nguyen Thi',
          surName: 'Ngan',
          roles: ['Cashier'],
        })
      ),
    };
    mockSessionState = {
      getLanguage: vi.fn().mockReturnValue('vi'),
      getLanguage$: vi.fn().mockReturnValue(of('vi')),
      setLanguage: vi.fn(),
    };
    mockConfirmationService = {
      warn: vi.fn().mockReturnValue(of(0)),
    };
    mockUserRoleNav = {
      canNavigateToAdmin: vi.fn().mockReturnValue(false),
    };
    mockCashierState = {
      loadShiftSummary: vi.fn().mockReturnValue(of({})),
      shiftSummary: vi.fn().mockReturnValue({
        cashierName: 'Nguyen Thi Ngan',
        totalRevenue: 3500000,
        activeTableCount: 4,
        pendingOrderCount: 1,
        billRequestedCount: 2,
      }),
      totalRevenue: vi.fn().mockReturnValue(3500000),
      activeTableCount: vi.fn().mockReturnValue(4),
      pendingOrderCount: vi.fn().mockReturnValue(1),
      billRequestedCount: vi.fn().mockReturnValue(2),
    };
    mockCashierSync = {
      startSync: vi.fn(),
      stopSync: vi.fn(),
    };
    mockAudioService = {
      isMuted: vi.fn().mockReturnValue(false),
      toggleMute: vi.fn().mockReturnValue(true),
    };

    const injector = Injector.create({
      providers: [
        { provide: CashierLayoutComponent, useClass: CashierLayoutComponent },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigStateService, useValue: mockConfigState },
        { provide: SessionStateService, useValue: mockSessionState },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: UserRoleNavigationService, useValue: mockUserRoleNav },
        { provide: CashierStateService, useValue: mockCashierState },
        { provide: LocalizationService, useValue: { instant: vi.fn().mockImplementation((k: string) => k) } },
        { provide: CashierSyncService, useValue: mockCashierSync },
        { provide: AudioNotificationService, useValue: mockAudioService },
      ],
    });

    component = injector.get(CashierLayoutComponent);
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize and load shift summary on ngOnInit', () => {
    component.ngOnInit();

    expect(mockCashierState.loadShiftSummary).toHaveBeenCalled();
    const info = component.userInfo();
    expect(info.userName).toBe('cashier1');
    expect(info.fullName).toBe('Nguyen Thi Ngan');
    expect(info.canReturnToAdmin).toBe(false);
    expect(component.currentLanguage()).toBe('vi');
  });

  it('should generate initials properly from full name', () => {
    component.ngOnInit();
    expect(component.userInitials()).toBe('NN');
  });

  it('should toggle language dropdown and switch language', () => {
    const event = { stopPropagation: vi.fn() } as any;
    component.toggleLanguageDropdown(event);
    expect(component.isLanguageDropdownOpen()).toBe(true);

    component.switchLanguage('en');
    expect(mockSessionState.setLanguage).toHaveBeenCalledWith('en');
    expect(component.currentLanguage()).toBe('en');
    expect(component.isLanguageDropdownOpen()).toBe(false);
  });

  it('should toggle audio mute through audioService', () => {
    component.toggleAudioMute();
    expect(mockAudioService.toggleMute).toHaveBeenCalled();
  });

  it('should toggle and close mobile sidebar', () => {
    expect(component.isSidebarOpenMobile()).toBe(false);

    component.toggleMobileSidebar();
    expect(component.isSidebarOpenMobile()).toBe(true);

    component.closeMobileSidebar();
    expect(component.isSidebarOpenMobile()).toBe(false);
  });

  it('should navigate to root / when returnToAdmin is called', () => {
    component.returnToAdmin();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
