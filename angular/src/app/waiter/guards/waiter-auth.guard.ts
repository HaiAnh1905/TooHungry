import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PermissionService } from '@abp/ng.core';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';

/**
 * Gác cổng tuyến đường phân hệ Waiter
 * Cho phép người dùng có quyền TooHungry.Tables hoặc TooHungry.Orders truy cập.
 */
export const waiterAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const userRoleNav = inject(UserRoleNavigationService);

  if (!authService.isAuthenticated) {
    router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Cho phép nếu có quyền xem bàn hoặc phục vụ đơn hàng, hoặc có quyền quản trị
  const hasTablePermission = permissionService.getGrantedPolicy('TooHungry.Tables');
  const hasOrderPermission = permissionService.getGrantedPolicy('TooHungry.Orders');

  if (hasTablePermission || hasOrderPermission || userRoleNav.canNavigateToAdmin() || userRoleNav.hasRole('Waiter')) {
    return true;
  }

  // Từ chối truy cập và chuyển hướng về trang tương ứng của người dùng
  const defaultRoute = userRoleNav.getDefaultHomeRoute();
  if (defaultRoute && defaultRoute !== '/waiter/tables' && defaultRoute !== '/') {
    return router.parseUrl(defaultRoute);
  }

  return router.parseUrl('/error/403');
};
