import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, ConfigStateService } from '@abp/ng.core';
import { filter, map, take } from 'rxjs/operators';

/**
 * Guard bảo vệ trang Dashboard (URL gốc '/'):
 * - Nếu người dùng chưa đăng nhập: Cho phép truy cập để xem màn hình Trạm Vào Ca Nội Bộ (login terminal).
 * - Nếu người dùng đã đăng nhập:
 *   + Nếu có vai trò 'Waiter' (và không phải Manager/Administrator): Tự động chuyển hướng đến '/waiter/tables'.
 *   + Nếu có vai trò 'InventoryStaff' (và không phải Manager/Administrator): Tự động chuyển hướng đến '/inventory'.
 *   + Nếu có vai trò 'Cashier' (và không phải Manager/Administrator): Tự động chuyển hướng đến '/table/layout'.
 *   + Nếu là Manager hoặc Administrator/admin: Cho phép truy cập Dashboard bình thường.
 */
export const dashboardGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const configState = inject(ConfigStateService);

  // Người dùng chưa đăng nhập -> Cho phép hiển thị giao diện Trạm Vào Ca
  if (!authService.isAuthenticated) {
    return true;
  }

  // Kiểm tra đồng bộ nếu state đã sẵn sàng trong store
  const currentUser = configState.getOne('currentUser') as any;
  if (currentUser?.isAuthenticated) {
    const roles: string[] = currentUser.roles || [];
    const isManagerOrAdmin = roles.some(r =>
      ['Manager', 'Administrator', 'admin'].includes(r)
    );

    if (roles.includes('Waiter') && !isManagerOrAdmin) {
      return router.parseUrl('/waiter/tables');
    }

    if (roles.includes('InventoryStaff') && !isManagerOrAdmin) {
      return router.parseUrl('/inventory');
    }

    if (roles.includes('Cashier') && !isManagerOrAdmin) {
      return router.parseUrl('/table/layout');
    }

    return true;
  }

  // Fallback Observable khi state đang được nạp lần đầu
  return configState.getOne$('currentUser').pipe(
    filter(user => !!user),
    take(1),
    map((user: any) => {
      const roles: string[] = user?.roles || [];
      const isManagerOrAdmin = roles.some(r =>
        ['Manager', 'Administrator', 'admin'].includes(r)
      );

      if (roles.includes('Waiter') && !isManagerOrAdmin) {
        return router.parseUrl('/waiter/tables');
      }

      if (roles.includes('InventoryStaff') && !isManagerOrAdmin) {
        return router.parseUrl('/inventory');
      }

      if (roles.includes('Cashier') && !isManagerOrAdmin) {
        return router.parseUrl('/table/layout');
      }

      return true;
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
