import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService, PermissionService } from '@abp/ng.core';
import { cashierAuthGuard } from './cashier-auth.guard';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';

describe('cashierAuthGuard', () => {
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
  const mockState = { url: '/cashier/tables' } as RouterStateSnapshot;

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
    return runInInjectionContext(injector, () => cashierAuthGuard(mockRoute, mockState));
  };

  it('should redirect to /account/login with returnUrl when user is not authenticated', () => {
    mockAuthService.isAuthenticated = false;

    const result = executeGuard();

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/account/login'], {
      queryParams: { returnUrl: '/cashier/tables' },
    });
  });

  it('should allow access when user has TooHungry.Cashier permission', () => {
    mockAuthService.isAuthenticated = true;
    mockPermissionService.getGrantedPolicy.mockImplementation(p => p === 'TooHungry.Cashier');
    mockUserRoleNav.hasRole.mockReturnValue(false);
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);

    const result = executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should allow access when user has Cashier role', () => {
    mockAuthService.isAuthenticated = true;
    mockPermissionService.getGrantedPolicy.mockReturnValue(false);
    mockUserRoleNav.hasRole.mockImplementation(r => r === 'Cashier');
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);

    const result = executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should allow access when user is Admin', () => {
    mockAuthService.isAuthenticated = true;
    mockPermissionService.getGrantedPolicy.mockReturnValue(false);
    mockUserRoleNav.hasRole.mockReturnValue(false);
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(true);

    const result = executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to default home route if unauthorized and default route is not /cashier', () => {
    mockAuthService.isAuthenticated = true;
    mockPermissionService.getGrantedPolicy.mockReturnValue(false);
    mockUserRoleNav.hasRole.mockReturnValue(false);
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);
    mockUserRoleNav.getDefaultHomeRoute.mockReturnValue('/waiter/tables');

    const result = executeGuard();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/waiter/tables');
    expect((result as any).toString()).toBe('/waiter/tables');
  });

  it('should redirect to /error/403 if unauthorized and no other route available', () => {
    mockAuthService.isAuthenticated = true;
    mockPermissionService.getGrantedPolicy.mockReturnValue(false);
    mockUserRoleNav.hasRole.mockReturnValue(false);
    mockUserRoleNav.canNavigateToAdmin.mockReturnValue(false);
    mockUserRoleNav.getDefaultHomeRoute.mockReturnValue('/');

    const result = executeGuard();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/error/403');
    expect((result as any).toString()).toBe('/error/403');
  });
});
