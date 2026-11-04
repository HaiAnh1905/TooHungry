import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PermissionService } from '@abp/ng.core';
import { UserRoleNavigationService } from '../../shared/services/user-role-navigation.service';

/**
 * Gác cổng tuyến đường phân hệ Phục vụ (Waiter Portal)
 * - Nhân viên Thu ngân (Cashier) tuyệt đối KHÔNG được truy cập phân hệ Waiter -> chuyển về /cashier/tables.
 * - Nhân viên Kho (InventoryStaff) không được truy cập -> chuyển về /inventory-keeper/dashboard.
 * - Chỉ cho phép người dùng có vai trò Waiter hoặc quyền Quản trị (Manager / Admin).
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

  const isAdmin = userRoleNav.canNavigateToAdmin();

  // 1. Thu ngân (Cashier) tuyệt đối không được vào trang của Waiter -> chuyển về Cổng Thu ngân
  const isCashier =
    userRoleNav.hasRole('Cashier') || permissionService.getGrantedPolicy('TooHungry.Cashier');
  if (isCashier && !isAdmin) {
    return router.parseUrl('/cashier/tables');
  }

  // 2. Nhân viên Kho (InventoryStaff) không thuộc phân hệ Waiter -> chuyển về Cổng Kho
  const isInventoryStaff = userRoleNav.hasRole('InventoryStaff');
  if (isInventoryStaff && !isAdmin) {
    return router.parseUrl('/inventory-keeper/dashboard');
  }

  // 3. Cho phép nếu có vai trò Waiter hoặc quyền Quản trị hệ thống
  if (userRoleNav.hasRole('Waiter') || isAdmin) {
    return true;
  }

  // 4. Nếu người dùng không có vai trò đặc thù nhưng được cấp quyền xem bàn/đơn hàng
  const hasTablePermission = permissionService.getGrantedPolicy('TooHungry.Tables');
  const hasOrderPermission = permissionService.getGrantedPolicy('TooHungry.Orders');

  if (hasTablePermission || hasOrderPermission) {
    return true;
  }

  // 5. Từ chối truy cập và chuyển hướng về trang tương ứng của người dùng
  const defaultRoute = userRoleNav.getDefaultHomeRoute();
  if (defaultRoute && defaultRoute !== '/waiter/tables' && defaultRoute !== '/') {
    return router.parseUrl(defaultRoute);
  }

  return router.parseUrl('/error/403');
};
