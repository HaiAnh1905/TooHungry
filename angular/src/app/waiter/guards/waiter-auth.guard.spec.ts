import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService, PermissionService } from '@abp/ng.core';
import { waiterAuthGuard } from './waiter-auth.guard';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';

describe('waiterAuthGuard', () => {
  let mockRouter: { navigate: ReturnType<typeof vi.fn>; parseUrl: ReturnType<typeof vi.fn> };
  let mockAuthService: { isAuthenticated: boolean };
  let mockPermissionService: { getGrantedPolicy: ReturnType<typeof vi.fn> };
  let mockUserRoleNav: {
    hasRole: ReturnType<typeof vi.fn>;
    canNavigateToAdmin: ReturnType<typeof vi.fn>;
    getDefaultHomeRoute: ReturnType<typeof vi.fn>;
  };
  let injector: Injector;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/waiter/tables' } as RouterStateSnapshot;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
      parseUrl: vi.fn((url: string) => ({ toString: () => url } as UrlTree)),
    };
    mockAuthService = { isAuthenticated: true };
    mockPermissionService = { getGrantedPolicy: vi.fn() };
    mockUserRoleNav = {
      hasRole: vi.fn(),
      canNavigateToAdmin: vi.fn(),
      getDefaultHomeRoute: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: UserRoleNavigationService, useValue: mockUserRoleNav },
      ],
    });
  });

  const executeGuard = () => {
    return runInInjectionContext(injector, () => waiterAuthGuard(mockRoute, mockState));
  };

  it('should redirect to /account/login with returnUrl when user is not authenticated', () => {
    mockAuthService.isAuthenticated = false;

    const result = executeGuard();

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/account/login'], {
      queryParams: { returnUrl: '/waiter/tables' },
    });
  });

  it('should BLOCK Cashier from entering Waiter portal and redirect to /cashier/tables even if Cashier has TooHungry.Tables or TooHungry.Orders', () => {
    mockAuthService.isAuthenticated = true;
    mockUserRoleNav.hasRole.mockImplementation(r => r === 'Cashier');
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);
    // Cashier in backend has Tables and Orders policies
    mockPermissionService.getGrantedPolicy.mockImplementation(p =>
      p === 'TooHungry.Tables' || p === 'TooHungry.Orders' || p === 'TooHungry.Cashier'
    );

    const result = executeGuard();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/cashier/tables');
    expect((result as any).toString()).toBe('/cashier/tables');
  });

  it('should BLOCK user with TooHungry.Cashier permission and redirect to /cashier/tables', () => {
    mockAuthService.isAuthenticated = true;
    mockUserRoleNav.hasRole.mockReturnValue(false);
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);
    mockPermissionService.getGrantedPolicy.mockImplementation(p => p === 'TooHungry.Cashier');

    const result = executeGuard();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/cashier/tables');
    expect((result as any).toString()).toBe('/cashier/tables');
  });

  it('should BLOCK InventoryStaff from entering Waiter portal and redirect to /inventory-keeper/dashboard', () => {
    mockAuthService.isAuthenticated = true;
    mockUserRoleNav.hasRole.mockImplementation(r => r === 'InventoryStaff');
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);
    mockPermissionService.getGrantedPolicy.mockReturnValue(false);

    const result = executeGuard();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/inventory-keeper/dashboard');
    expect((result as any).toString()).toBe('/inventory-keeper/dashboard');
  });

  it('should ALLOW access for Waiter role', () => {
    mockAuthService.isAuthenticated = true;
    mockUserRoleNav.hasRole.mockImplementation(r => r === 'Waiter');
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);
    mockPermissionService.getGrantedPolicy.mockReturnValue(false);

    const result = executeGuard();

    expect(result).toBe(true);
  });

  it('should ALLOW access for Admin even if they also have Cashier role', () => {
    mockAuthService.isAuthenticated = true;
    mockUserRoleNav.hasRole.mockImplementation(r => r === 'Cashier');
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(true);
    mockPermissionService.getGrantedPolicy.mockReturnValue(true);

    const result = executeGuard();

    expect(result).toBe(true);
  });

  it('should redirect unauthorized user to default home route or 403', () => {
    mockAuthService.isAuthenticated = true;
    mockUserRoleNav.hasRole.mockReturnValue(false);
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);
    mockPermissionService.getGrantedPolicy.mockReturnValue(false);
    mockUserRoleNav.getDefaultHomeRoute.mockReturnValue('/');

    const result = executeGuard();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/error/403');
    expect((result as any).toString()).toBe('/error/403');
  });
});

