import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PermissionService } from '@abp/ng.core';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';

/**
 * Gác cổng tuyến đường phân hệ Thu ngân (Cashier Portal)
 * Cho phép người dùng có quyền TooHungry.Cashier, vai trò Cashier, hoặc Quản trị truy cập.
 */
export const cashierAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const userRoleNav = inject(UserRoleNavigationService);

  if (!authService.isAuthenticated) {
    router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Cho phép nếu có quyền Cashier, vai trò Cashier, hoặc quyền quản trị
  const hasCashierPermission = permissionService.getGrantedPolicy('TooHungry.Cashier');
  const isCashierRole = userRoleNav.hasRole('Cashier');
  const isAdmin = userRoleNav.canNavigateToAdmin();

  if (hasCashierPermission || isCashierRole || isAdmin) {
    return true;
  }

  // Từ chối truy cập và chuyển hướng về trang tương ứng của người dùng
  const defaultRoute = userRoleNav.getDefaultHomeRoute();
  if (defaultRoute && !defaultRoute.startsWith('/cashier') && defaultRoute !== '/') {
    return router.parseUrl(defaultRoute);
  }

  return router.parseUrl('/error/403');
};
