import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService, ConfigStateService, PermissionService } from '@abp/ng.core';
import { inventoryKeeperAuthGuard } from './inventory-keeper-auth.guard';

describe('inventoryKeeperAuthGuard', () => {
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockAuthService: { isAuthenticated: boolean };
  let mockConfigState: { getOne: ReturnType<typeof vi.fn> };
  let mockPermissionService: { getGrantedPolicy: ReturnType<typeof vi.fn> };
  let injector: Injector;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/inventory-keeper/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };
    mockAuthService = { isAuthenticated: true };
    mockConfigState = { getOne: vi.fn() };
    mockPermissionService = { getGrantedPolicy: vi.fn() };

    injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigStateService, useValue: mockConfigState },
        { provide: PermissionService, useValue: mockPermissionService },
      ],
    });
  });

  const executeGuard = () => {
    return runInInjectionContext(injector, () => inventoryKeeperAuthGuard(mockRoute, mockState));
  };

  it('should redirect to /account/login with returnUrl when user is unauthenticated', () => {
    mockAuthService.isAuthenticated = false;

    const result = executeGuard();

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/account/login'], {
      queryParams: { returnUrl: '/inventory-keeper/dashboard' },
    });
  });

  it('should redirect to /error/403 when user does not have an allowed role', () => {
    mockAuthService.isAuthenticated = true;
    mockConfigState.getOne.mockReturnValue({ roles: ['Waiter'] });

    const result = executeGuard();

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/error/403']);
  });

  it('should redirect to /error/403 when user has InventoryStaff role but lacks TooHungry.Inventories permission', () => {
    mockAuthService.isAuthenticated = true;
    mockConfigState.getOne.mockReturnValue({ roles: ['InventoryStaff'] });
    mockPermissionService.getGrantedPolicy.mockImplementation(
      (policy: string) => policy !== 'TooHungry.Inventories'
    );

    const result = executeGuard();

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/error/403']);
  });

  it('should return true when user has InventoryStaff role and TooHungry.Inventories permission', () => {
    mockAuthService.isAuthenticated = true;
    mockConfigState.getOne.mockReturnValue({ roles: ['InventoryStaff'] });
    mockPermissionService.getGrantedPolicy.mockImplementation(
      (policy: string) => policy === 'TooHungry.Inventories'
    );

    const result = executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should return true when user is Manager and has TooHungry.Inventories permission', () => {
    mockAuthService.isAuthenticated = true;
    mockConfigState.getOne.mockReturnValue({ roles: ['Manager'] });
    mockPermissionService.getGrantedPolicy.mockImplementation(
      (policy: string) => policy === 'TooHungry.Inventories'
    );

    const result = executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should return true when user is Administrator and has TooHungry.Inventories permission', () => {
    mockAuthService.isAuthenticated = true;
    mockConfigState.getOne.mockReturnValue({ roles: ['Administrator'] });
    mockPermissionService.getGrantedPolicy.mockImplementation(
      (policy: string) => policy === 'TooHungry.Inventories'
    );

    const result = executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
