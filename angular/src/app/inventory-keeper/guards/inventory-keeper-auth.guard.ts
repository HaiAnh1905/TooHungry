import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, ConfigStateService, PermissionService } from '@abp/ng.core';

/**
 * Gác cổng bảo vệ toàn bộ cụm tuyến đường /inventory-keeper/*
 * - Kiểm tra xác thực (authGuard)
 * - Kiểm tra vai trò: Phải có ít nhất 1 trong các vai trò ['InventoryStaff', 'Manager', 'Administrator', 'admin']
 * - Kiểm tra quyền: Phải sở hữu quyền 'TooHungry.Inventories'
 * - Nếu không hợp lệ: Chuyển hướng sang '/error/403' Bento Card RM-019
 */
export const inventoryKeeperAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const configState = inject(ConfigStateService);
  const permissionService = inject(PermissionService);

  // 1. Kiểm tra xác thực đăng nhập
  if (!authService.isAuthenticated) {
    router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // 2. Kiểm tra vai trò người dùng
  const currentUser = configState.getOne('currentUser') as any;
  const roles: string[] = currentUser?.roles || [];
  const allowedRoles = ['InventoryStaff', 'Manager', 'Administrator', 'admin'];

  const hasAllowedRole = roles.some(r => allowedRoles.includes(r));
  if (!hasAllowedRole) {
    router.navigate(['/error/403']);
    return false;
  }

  // 3. Kiểm tra quyền hạn nghiệp vụ kho
  const hasInventoryPermission = permissionService.getGrantedPolicy('TooHungry.Inventories');
  if (!hasInventoryPermission) {
    router.navigate(['/error/403']);
    return false;
  }

  return true;
};
