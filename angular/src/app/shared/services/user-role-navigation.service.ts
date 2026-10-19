import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, ConfigStateService, PermissionService } from '@abp/ng.core';

export interface IUserRoleNavigationService {
  /**
   * Xác định URL đích trang làm việc của người dùng hiện tại
   * - Waiter -> '/waiter/tables'
   * - Manager/Admin:
   *   + Có quyền 'TooHungry.Dashboard' -> '/'
   *   + Không có quyền 'TooHungry.Dashboard' -> trang nghiệp vụ đầu tiên được cấp quyền ('/tables', '/orders', '/dishes', '/inventory', '/identity/users'...)
   * - Cashier -> '/table/layout' (hoặc '/tables')
   * - InventoryStaff -> '/inventory'
   * - Khách chưa đăng nhập -> '/' (Trạm vào ca) hoặc '/account/login'
   */
  getDefaultHomeRoute(): string;

  /**
   * Trả về khóa bản dịch i18n cho nhãn nút điều hướng chính tương ứng với trang đích
   */
  getDefaultHomeLabelKey(): string;

  /**
   * Kiểm tra xem người dùng hiện tại có vai trò cụ thể hay không
   */
  hasRole(roleName: string): boolean;
}

export const MANAGER_ADMIN_PERMISSIONS_FALLBACK: { policy: string; route: string; labelKey: string }[] = [
  { policy: 'TooHungry.Dashboard', route: '/', labelKey: 'ErrorPages.BackToDashboard' },
  { policy: 'TooHungry.Tables', route: '/tables', labelKey: 'ErrorPages.BackToTableManagement' },
  { policy: 'TooHungry.Orders', route: '/orders', labelKey: 'ErrorPages.BackToOrders' },
  { policy: 'TooHungry.Dishes', route: '/dishes', labelKey: 'ErrorPages.BackToDishes' },
  { policy: 'TooHungry.Inventories', route: '/inventory', labelKey: 'ErrorPages.BackToInventory' },
  { policy: 'AbpIdentity.Users', route: '/identity/users', labelKey: 'ErrorPages.BackToUserManagement' },
];

@Injectable({
  providedIn: 'root',
})
export class UserRoleNavigationService implements IUserRoleNavigationService {
  private readonly configState = inject(ConfigStateService);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);

  /**
   * Kiểm tra người dùng có một trong các vai trò quản trị cấp cao hay không
   */
  private isManagerOrAdmin(roles: string[]): boolean {
    return roles.some(r => ['Manager', 'Administrator', 'admin'].includes(r));
  }

  /**
   * Kiểm tra vai trò cụ thể của người dùng hiện tại
   */
  hasRole(roleName: string): boolean {
    const currentUser = this.configState.getOne('currentUser') as any;
    const roles: string[] = currentUser?.roles || [];
    return roles.some(r => r.toLowerCase() === roleName.toLowerCase());
  }

  /**
   * Phân giải route trang làm việc mặc định theo ma trận vai trò & quyền hạn
   */
  getDefaultHomeRoute(): string {
    if (!this.authService.isAuthenticated) {
      return '/';
    }

    const currentUser = this.configState.getOne('currentUser') as any;
    const roles: string[] = currentUser?.roles || [];

    // Ưu tiên 1: Quản lý hoặc Quản trị viên
    if (this.isManagerOrAdmin(roles)) {
      if (this.permissionService.getGrantedPolicy('TooHungry.Dashboard')) {
        return '/';
      }

      // Khi bị tước quyền Dashboard, tìm phân hệ đầu tiên được cấp quyền
      for (const item of MANAGER_ADMIN_PERMISSIONS_FALLBACK) {
        if (item.policy !== 'TooHungry.Dashboard' && this.permissionService.getGrantedPolicy(item.policy)) {
          return item.route;
        }
      }

      // Không có quyền phân hệ nào
      return '/account/login';
    }

    // Ưu tiên 2: Nhân viên phục vụ bàn (Waiter)
    if (roles.includes('Waiter')) {
      return '/waiter/tables';
    }

    // Ưu tiên 3: Nhân viên thu ngân (Cashier)
    if (roles.includes('Cashier')) {
      return '/table/layout';
    }

    // Ưu tiên 4: Nhân viên kho (InventoryStaff)
    if (roles.includes('InventoryStaff')) {
      return '/inventory';
    }

    return '/';
  }

  /**
   * Phân giải khóa ngôn ngữ hiển thị trên nút điều hướng chính
   */
  getDefaultHomeLabelKey(): string {
    if (!this.authService.isAuthenticated) {
      return 'ErrorPages.BackToLogin';
    }

    const route = this.getDefaultHomeRoute();

    switch (route) {
      case '/waiter/tables':
        return 'ErrorPages.BackToTableList';
      case '/':
        return 'ErrorPages.BackToDashboard';
      case '/tables':
        return 'ErrorPages.BackToTableManagement';
      case '/orders':
        return 'ErrorPages.BackToOrders';
      case '/dishes':
        return 'ErrorPages.BackToDishes';
      case '/inventory':
        return 'ErrorPages.BackToInventory';
      case '/identity/users':
        return 'ErrorPages.BackToUserManagement';
      case '/account/login':
        return 'ErrorPages.BackToLogin';
      case '/table/layout':
        return 'ErrorPages.BackToHome';
      default:
        return 'ErrorPages.BackToHome';
    }
  }
}
