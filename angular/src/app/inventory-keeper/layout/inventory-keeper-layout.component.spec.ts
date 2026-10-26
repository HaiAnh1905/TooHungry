/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService, ConfigStateService, LocalizationService, SessionStateService } from '@abp/ng.core';
import { ConfirmationService } from '@abp/ng.theme.shared';
import { InventoryKeeperLayoutComponent } from './inventory-keeper-layout.component';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { BarcodeScannerService } from '../services/barcode-scanner.service';
import { InventoryKeeperShiftType } from '../models/inventory-keeper.models';

describe('InventoryKeeperLayoutComponent', () => {
  let component: InventoryKeeperLayoutComponent;
  let mockRouter: any;
  let mockAuthService: any;
  let mockConfigState: any;
  let mockSessionState: any;
  let mockLocalizationService: any;
  let mockSidebarService: any;
  let mockAlertStateService: any;
  let mockBarcodeService: any;
  let mockConfirmationService: any;

  beforeEach(() => {
    mockRouter = {
      url: '/inventory-keeper/dashboard',
      events: new Subject(),
      navigate: vi.fn(),
    };
    mockAuthService = {
      isAuthenticated: true,
      logout: vi.fn().mockReturnValue(of(void 0)),
    };
    mockConfigState = {
      getOne$: vi.fn().mockReturnValue(
        of({
          id: 'user-1',
          userName: 'keeper1',
          name: 'Nguyen Van Kho',
          roles: ['InventoryStaff'],
        })
      ),
    };
    mockSessionState = {
      getLanguage$: vi.fn().mockReturnValue(of('vi')),
      setLanguage: vi.fn(),
    };
    mockLocalizationService = {
      addLocalization: vi.fn(),
      get: vi.fn(),
      instant: vi.fn(),
    };
    mockSidebarService = {
      setMobileDrawerOpen: vi.fn(),
      toggleMobileDrawer: vi.fn(),
      getTemplate$: vi.fn().mockReturnValue(of(null)),
      isMobileDrawerOpen$: vi.fn().mockReturnValue(of(false)),
      clearTemplate: vi.fn(),
      setTemplate: vi.fn(),
      setIngredientDropdownOpen: vi.fn(),
    };
    mockAlertStateService = {
      refreshAlerts: vi.fn().mockResolvedValue(void 0),
      refreshed$: new Subject(),
      kpiSummary: vi.fn().mockReturnValue({
        expiringSoonCount: 3,
        lowStockCount: 2,
        expiredCount: 1,
        totalActiveBatchesCount: 25,
        lastUpdated: new Date(),
      }),
    };
    mockBarcodeService = {
      startHidListener: vi.fn(),
      stopHidListener: vi.fn(),
      scanned$: new Subject(),
    };
    mockConfirmationService = {
      warn: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: InventoryKeeperLayoutComponent, useClass: InventoryKeeperLayoutComponent },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigStateService, useValue: mockConfigState },
        { provide: SessionStateService, useValue: mockSessionState },
        { provide: LocalizationService, useValue: mockLocalizationService },
        { provide: InventoryKeeperSidebarService, useValue: mockSidebarService },
        { provide: InventoryAlertStateService, useValue: mockAlertStateService },
        { provide: BarcodeScannerService, useValue: mockBarcodeService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    });

    component = injector.get(InventoryKeeperLayoutComponent);
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize user info and shift correctly on ngOnInit', () => {
    component.ngOnInit();

    const info = component.userInfo();
    expect(info.userName).toBe('keeper1');
    expect(info.fullName).toBe('Nguyen Van Kho');
    expect(info.canReturnToAdmin).toBe(false);
    expect(component.primaryRole()).toBe('InventoryStaff');
    expect(mockBarcodeService.startHidListener).toHaveBeenCalled();
  });

  it('should allow returning to admin if user has Manager or Administrator role', () => {
    mockConfigState.getOne$.mockReturnValue(
      of({
        id: 'admin-1',
        userName: 'admin',
        name: 'Super Admin',
        roles: ['Administrator', 'InventoryStaff'],
      })
    );

    component.ngOnInit();

    const info = component.userInfo();
    expect(info.canReturnToAdmin).toBe(true);
    expect(component.primaryRole()).toBe('Administrator');
  });

  it('should navigate to tab and close mobile drawer', () => {
    component.navigateToTab('batches', { status: 'ExpiringSoon' });

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory-keeper/batches'], {
      queryParams: { status: 'ExpiringSoon' },
    });
    expect(mockSidebarService.setMobileDrawerOpen).toHaveBeenCalledWith(false);
  });

  it('should call refreshAlerts when refreshData is invoked', async () => {
    await component.refreshData();

    expect(mockAlertStateService.refreshAlerts).toHaveBeenCalled();
  });

  it('should calculate totalAlertsCount correctly from alertStateService kpi summary', () => {
    // expiringSoonCount: 3, lowStockCount: 2, expiredCount: 1 -> total: 6
    expect(component.totalAlertsCount()).toBe(6);
  });

  it('should toggle notification dropdown and close language dropdown', () => {
    component.isLanguageDropdownOpen.set(true);

    const event = { stopPropagation: vi.fn() } as any;
    component.toggleNotificationDropdown(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.isLanguageDropdownOpen()).toBe(false);
    expect(component.isNotificationDropdownOpen()).toBe(true);

    component.closeDropdowns();
    expect(component.isNotificationDropdownOpen()).toBe(false);
    expect(component.isLanguageDropdownOpen()).toBe(false);
  });
});
