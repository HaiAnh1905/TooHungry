import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, ConfigStateService } from '@abp/ng.core';

/**
 * Gác cổng tuyến đường phân hệ Waiter
 * Chỉ cho phép người dùng có vai trò Waiter, Manager, Administrator/admin
 * hoặc có quyền TooHungry.Tables / TooHungry.Orders truy cập.
 */
export const waiterAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const configState = inject(ConfigStateService);

  if (!authService.isAuthenticated) {
    router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const currentUser = configState.getOne('currentUser');
  const roles = currentUser?.roles || [];
  const allowedRoles = ['Waiter', 'Manager', 'Administrator', 'admin'];

  const hasAllowedRole = roles.some(r => allowedRoles.includes(r));
  if (hasAllowedRole) {
    return true;
  }

  // Quyền dự phòng
  const permissions = (configState.getOne('auth') as any)?.grantedPolicies || {};
  if (permissions['TooHungry.Tables'] || permissions['TooHungry.Orders']) {
    return true;
  }

  // Từ chối truy cập và chuyển hướng về trang tương ứng của vai trò
  if (roles.includes('InventoryStaff')) {
    router.navigate(['/inventory']);
  } else if (roles.includes('Cashier')) {
    router.navigate(['/table/layout']);
  } else {
    router.navigate(['/']);
  }

  return false;
};
