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
    const isManagerOrAdmin = ['Manager', 'Administrator', 'admin'].some(r => userRoleNav.hasRole(r));
    if (!isManagerOrAdmin) {
      if (userRoleNav.hasRole('Cashier')) {
        return router.parseUrl('/cashier/tables');
      }
      if (userRoleNav.hasRole('Waiter')) {
        return router.parseUrl('/waiter/tables');
      }
      if (userRoleNav.hasRole('InventoryStaff')) {
        return router.parseUrl('/inventory-keeper/dashboard');
      }
    }

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
      const isManagerOrAdmin = ['Manager', 'Administrator', 'admin'].some(r => userRoleNav.hasRole(r));
      if (!isManagerOrAdmin) {
        if (userRoleNav.hasRole('Cashier')) {
          return router.parseUrl('/cashier/tables');
        }
        if (userRoleNav.hasRole('Waiter')) {
          return router.parseUrl('/waiter/tables');
        }
        if (userRoleNav.hasRole('InventoryStaff')) {
          return router.parseUrl('/inventory-keeper/dashboard');
        }
      }

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
 * - Nếu là Cashier: Tự động chuyển hướng về Cổng Thu ngân ('/cashier/tables').
 * - Nếu là Waiter: Tự động chuyển hướng về Cổng Phục vụ ('/waiter/tables').
 * - Nếu là Quản trị/Quản lý hoặc có quyền tạo bàn: Cho phép vào trang Quản lý bàn.
 */
export const adminTableGuard: CanActivateFn = () => {
  const router = inject(Router);
  const userRoleNav = inject(UserRoleNavigationService);
  const permissionService = inject(PermissionService);

  const isManagerOrAdmin = ['Manager', 'Administrator', 'admin'].some(r => userRoleNav.hasRole(r));
  if (!isManagerOrAdmin) {
    if (userRoleNav.hasRole('Cashier')) {
      return router.parseUrl('/cashier/tables');
    }
    if (userRoleNav.hasRole('Waiter')) {
      return router.parseUrl('/waiter/tables');
    }
    if (userRoleNav.hasRole('InventoryStaff')) {
      return router.parseUrl('/inventory-keeper/dashboard');
    }
  }

  // Nếu người dùng có quyền quản trị hoặc tạo/sửa bàn, cho phép truy cập trang quản lý bàn Admin
  if (userRoleNav.canNavigateToAdmin() || permissionService.getGrantedPolicy('TooHungry.Tables.Create')) {
    return true;
  }

  // Mặc định chuyển hướng sang cổng nhân viên phục vụ
  return router.parseUrl('/waiter/tables');
};
