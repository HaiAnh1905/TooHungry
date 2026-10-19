import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, ConfigStateService, PermissionService } from '@abp/ng.core';
import { filter, map, take } from 'rxjs/operators';
import { UserRoleNavigationService } from '../services/user-role-navigation.service';

/**
 * Guard bảo vệ trang Dashboard (URL gốc '/'):
 * - Nếu người dùng chưa đăng nhập: Cho phép truy cập để xem màn hình Trạm Vào Ca Nội Bộ (login terminal).
 * - Nếu người dùng đã đăng nhập:
 *   + Nếu có quyền 'TooHungry.Dashboard': Cho phép truy cập Dashboard bình thường.
 *   + Nếu KHÔNG có quyền 'TooHungry.Dashboard':
 *     Tự động chuyển hướng đến phân hệ tương ứng theo vai trò (UserRoleNavigationService: /waiter/tables, /inventory, /table/layout, /tables...).
 *     Nếu không có bất kỳ quyền phân hệ nào: Chuyển hướng sang '/error/403' chuẩn Bento Card RM-019.
 */
export const dashboardGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const configState = inject(ConfigStateService);
  const permissionService = inject(PermissionService);
  const userRoleNav = inject(UserRoleNavigationService);

  // Người dùng chưa đăng nhập -> Cho phép hiển thị giao diện Trạm Vào Ca
  if (!authService.isAuthenticated) {
    return true;
  }

  // Kiểm tra đồng bộ nếu state đã sẵn sàng trong store
  const currentUser = configState.getOne('currentUser') as any;
  if (currentUser?.isAuthenticated) {
    if (permissionService.getGrantedPolicy('TooHungry.Dashboard')) {
      return true;
    }

    const defaultRoute = userRoleNav.getDefaultHomeRoute();
    if (defaultRoute && defaultRoute !== '/') {
      return router.parseUrl(defaultRoute);
    }

    return router.parseUrl('/error/403');
  }

  // Fallback Observable khi state đang được nạp lần đầu
  return configState.getOne$('currentUser').pipe(
    filter(user => !!user),
    take(1),
    map(() => {
      if (permissionService.getGrantedPolicy('TooHungry.Dashboard')) {
        return true;
      }

      const defaultRoute = userRoleNav.getDefaultHomeRoute();
      if (defaultRoute && defaultRoute !== '/') {
        return router.parseUrl(defaultRoute);
      }

      return router.parseUrl('/error/403');
    })
  );
};

/**
 * Guard bảo vệ trang Quản lý bàn của Admin ('/tables'):
 * - Nếu người dùng có vai trò 'Waiter' (và không có vai trò Quản lý/Admin):
 *   Tự động chuyển hướng sang trang danh sách bàn của Waiter ('/waiter/tables').
 */
export const adminTableGuard: CanActivateFn = () => {
  const router = inject(Router);
  const configState = inject(ConfigStateService);

  const currentUser = configState.getOne('currentUser') as any;
  const roles: string[] = currentUser?.roles || [];
  const isManagerOrAdmin = roles.some(r =>
    ['Manager', 'Administrator', 'admin'].includes(r)
  );

  if (roles.includes('Waiter') && !isManagerOrAdmin) {
    return router.parseUrl('/waiter/tables');
  }

  return true;
};
