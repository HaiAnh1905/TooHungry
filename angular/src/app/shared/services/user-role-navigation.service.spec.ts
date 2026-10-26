import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, ConfigStateService, PermissionService } from '@abp/ng.core';
import { of } from 'rxjs';
import { UserRoleNavigationService } from './user-role-navigation.service';

describe('UserRoleNavigationService', () => {
  let service: UserRoleNavigationService;
  let mockAuthService: { isAuthenticated: boolean };
  let mockConfigState: { getOne: ReturnType<typeof vi.fn>; getOne$: ReturnType<typeof vi.fn> };
  let mockPermissionService: { getGrantedPolicy: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthService = { isAuthenticated: true };
    mockConfigState = { getOne: vi.fn(), getOne$: vi.fn() };
    mockPermissionService = { getGrantedPolicy: vi.fn() };
    mockRouter = { navigate: vi.fn() };

    const injector = Injector.create({
      providers: [
        { provide: UserRoleNavigationService, useClass: UserRoleNavigationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigStateService, useValue: mockConfigState },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = injector.get(UserRoleNavigationService);
  });

  describe('getDefaultHomeRoute', () => {
    it('should return "/" when user is unauthenticated', () => {
      mockAuthService.isAuthenticated = false;
      expect(service.getDefaultHomeRoute()).toBe('/');
    });

    it('should return "/waiter/tables" when user has Waiter role only', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Waiter'] });
      expect(service.getDefaultHomeRoute()).toBe('/waiter/tables');
    });

    it('should return "/" when user is Manager and has TooHungry.Dashboard permission', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dashboard'
      );
      expect(service.getDefaultHomeRoute()).toBe('/');
    });

    it('should return "/" when user is Administrator and has TooHungry.Dashboard permission', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Administrator'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dashboard'
      );
      expect(service.getDefaultHomeRoute()).toBe('/');
    });

    it('should fallback to "/tables" when Manager lacks Dashboard permission but has TooHungry.Tables', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Tables'
      );
      expect(service.getDefaultHomeRoute()).toBe('/tables');
    });

    it('should fallback to "/orders" when Manager lacks Dashboard and Tables but has TooHungry.Orders', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['admin'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Orders'
      );
      expect(service.getDefaultHomeRoute()).toBe('/orders');
    });

    it('should fallback to "/dishes" when Manager has only TooHungry.Dishes', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dishes'
      );
      expect(service.getDefaultHomeRoute()).toBe('/dishes');
    });

    it('should fallback to "/inventory" when Manager has only TooHungry.Inventories', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Inventories'
      );
      expect(service.getDefaultHomeRoute()).toBe('/inventory');
    });

    it('should fallback to "/identity/users" when Manager has only AbpIdentity.Users', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Administrator'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'AbpIdentity.Users'
      );
      expect(service.getDefaultHomeRoute()).toBe('/identity/users');
    });

    it('should fallback to "/account/login" when Manager has no granted policies', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockReturnValue(false);
      expect(service.getDefaultHomeRoute()).toBe('/account/login');
    });

    it('should prioritize Manager role when user has both Waiter and Manager roles', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Waiter', 'Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dashboard'
      );
      expect(service.getDefaultHomeRoute()).toBe('/');
    });

    it('should return "/tables" for Cashier role when granted TooHungry.Tables.Create permission', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Cashier'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Tables.Create'
      );
      expect(service.getDefaultHomeRoute()).toBe('/tables');
    });

    it('should return "/waiter/tables" for Cashier role when not granted table admin permission', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Cashier'] });
      mockPermissionService.getGrantedPolicy.mockReturnValue(false);
      expect(service.getDefaultHomeRoute()).toBe('/waiter/tables');
    });

    it('should return "/inventory-keeper/dashboard" for InventoryStaff role', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['InventoryStaff'] });
      expect(service.getDefaultHomeRoute()).toBe('/inventory-keeper/dashboard');
    });

    it('should return "/" default fallback for generic roles', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Guest'] });
      expect(service.getDefaultHomeRoute()).toBe('/');
    });
  });

  describe('getDefaultHomeLabelKey', () => {
    it('should return "ErrorPages.BackToLogin" for unauthenticated users', () => {
      mockAuthService.isAuthenticated = false;
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToLogin');
    });

    it('should return "::InventoryKeeperPortal" for InventoryStaff', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['InventoryStaff'] });
      expect(service.getDefaultHomeLabelKey()).toBe('::InventoryKeeperPortal');
    });

    it('should return "ErrorPages.BackToTableList" for Waiter', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Waiter'] });
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToTableList');
    });

    it('should return "ErrorPages.BackToDashboard" for Manager with Dashboard access', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dashboard'
      );
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToDashboard');
    });

    it('should return "ErrorPages.BackToTableManagement" for Manager routed to tables', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Tables'
      );
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToTableManagement');
    });

    it('should return "ErrorPages.BackToOrders" for Manager routed to orders', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Orders'
      );
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToOrders');
    });

    it('should return "ErrorPages.BackToDishes" for Manager routed to dishes', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dishes'
      );
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToDishes');
    });

    it('should return "ErrorPages.BackToInventory" for Manager routed to inventory', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Inventories'
      );
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToInventory');
    });

    it('should return "ErrorPages.BackToUserManagement" for Manager routed to identity users', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Administrator'] });
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'AbpIdentity.Users'
      );
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToUserManagement');
    });

    it('should return "ErrorPages.BackToLogin" for Manager with no permissions fallback to login', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
      mockPermissionService.getGrantedPolicy.mockReturnValue(false);
      expect(service.getDefaultHomeLabelKey()).toBe('ErrorPages.BackToLogin');
    });
  });

  describe('hasRole', () => {
    it('should return true if role exists case-insensitively', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Waiter', 'Cashier'] });
      expect(service.hasRole('waiter')).toBe(true);
      expect(service.hasRole('Cashier')).toBe(true);
      expect(service.hasRole('Manager')).toBe(false);
    });
  });

  describe('canNavigateToAdmin', () => {
    it('should return true when user has TooHungry.Dashboard policy', () => {
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dashboard'
      );
      expect(service.canNavigateToAdmin()).toBe(true);
    });

    it('should return true when user has TooHungry.Dishes policy', () => {
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dishes'
      );
      expect(service.canNavigateToAdmin()).toBe(true);
    });

    it('should return true when user has AbpIdentity.Users policy', () => {
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'AbpIdentity.Users'
      );
      expect(service.canNavigateToAdmin()).toBe(true);
    });

    it('should return false when user has only Waiter role and no admin policies', () => {
      mockConfigState.getOne.mockReturnValue({ roles: ['Waiter'] });
      mockPermissionService.getGrantedPolicy.mockReturnValue(false);
      expect(service.canNavigateToAdmin()).toBe(false);
    });

    it('should emit correct boolean via canNavigateToAdmin$ stream', async () => {
      mockConfigState.getOne$.mockReturnValue(of({ roles: ['Waiter'] }));
      mockPermissionService.getGrantedPolicy.mockImplementation(
        (p: string) => p === 'TooHungry.Dashboard'
      );

      let result: boolean | undefined;
      service.canNavigateToAdmin$().subscribe(val => {
        result = val;
      });

      expect(result).toBe(true);
    });
  });
});
