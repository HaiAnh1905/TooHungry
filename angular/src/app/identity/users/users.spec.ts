/** @vitest-environment jsdom */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { Users } from './users';

describe('Users Component - User Account Actions & Admin Protection', () => {
  let component: Users;
  let mockUserService: any;
  let mockRoleService: any;
  let mockLockoutService: any;
  let mockSignalrService: any;
  let mockToaster: any;
  let mockLocalization: any;
  let mockCdr: any;
  let mockFb: any;

  beforeEach(() => {
    mockUserService = {
      getList: vi.fn().mockReturnValue(of({ items: [], totalCount: 0 })),
      getAssignableRoles: vi.fn().mockReturnValue(of({ items: [] })),
      getRoles: vi.fn().mockReturnValue(of({ items: [] })),
      update: vi.fn().mockReturnValue(of({})),
      delete: vi.fn().mockReturnValue(of({})),
    };

    mockRoleService = {};

    mockLockoutService = {
      lockUser: vi.fn().mockReturnValue(of({ success: true, message: 'Đã khóa' })),
      unlockUser: vi.fn().mockReturnValue(of({ success: true, message: 'Đã mở khóa' })),
    };

    mockSignalrService = {
      securityAlert$: of({ message: 'Brute-force alert' }),
    };

    mockToaster = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    mockLocalization = {
      instant: vi.fn((key: string) => key),
    };

    mockCdr = {
      detectChanges: vi.fn(),
    };

    mockFb = {
      group: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({
          valueChanges: of(null),
        }),
        patchValue: vi.fn(),
        reset: vi.fn(),
        controls: {},
        invalid: false,
      }),
    };

    component = new Users(
      mockUserService,
      mockRoleService,
      mockFb,
      mockCdr,
      mockLockoutService,
      mockSignalrService,
      mockToaster,
      mockLocalization
    );
  });

  describe('isAdminUser() helper', () => {
    it('nhận diện chính xác tài khoản admin (không phân biệt hoa thường và khoảng trắng)', () => {
      expect(component.isAdminUser({ userName: 'admin' } as any)).toBe(true);
      expect(component.isAdminUser({ userName: 'Admin' } as any)).toBe(true);
      expect(component.isAdminUser({ userName: ' ADMIN ' } as any)).toBe(true);
    });

    it('trả về false cho tài khoản thông thường hoặc null', () => {
      expect(component.isAdminUser({ userName: 'Cashier' } as any)).toBe(false);
      expect(component.isAdminUser({ userName: 'I_Keeper' } as any)).toBe(false);
      expect(component.isAdminUser({ userName: 'Manager' } as any)).toBe(false);
      expect(component.isAdminUser(null)).toBe(false);
      expect(component.isAdminUser(undefined)).toBe(false);
    });

    it('isUserAdminLocked() phân biệt chính xác tài khoản bị Admin khóa', () => {
      expect(component.isUserAdminLocked({ extraProperties: { IsAdminLocked: true } })).toBe(true);
      expect(component.isUserAdminLocked({ extraProperties: { isAdminLocked: true } })).toBe(true);
      expect(component.isUserAdminLocked({ extraProperties: { IsAdminLocked: false } })).toBe(false);
      expect(component.isUserAdminLocked({})).toBe(false);
      expect(component.isUserAdminLocked(null)).toBe(false);
    });

    it('isUserLockedOut() trả về true nếu tài khoản bị Admin khóa hoặc có lockoutEnd trong tương lai', () => {
      expect(component.isUserLockedOut({ extraProperties: { IsAdminLocked: true } })).toBe(true);
      expect(component.isUserLockedOut({ lockoutEnd: new Date(Date.now() + 600000).toISOString() })).toBe(true);
      expect(component.isUserLockedOut({ lockoutEnd: new Date(Date.now() - 600000).toISOString() })).toBe(false);
      expect(component.isUserLockedOut({ lockoutEnd: null })).toBe(false);
    });
  });

  describe('Admin Protection Rules', () => {
    it('lockUser() KHÔNG được phép khóa tài khoản Admin', () => {
      const adminUser = { id: 'admin-id', userName: 'Admin' } as any;

      component.lockUser(adminUser);

      expect(mockToaster.error).toHaveBeenCalled();
      expect(mockLockoutService.lockUser).not.toHaveBeenCalled();
    });

    it('toggleActive() KHÔNG được phép vô hiệu hóa tài khoản Admin', () => {
      const adminUser = { id: 'admin-id', userName: 'admin', isActive: true } as any;

      component.toggleActive(adminUser);

      expect(mockToaster.warn).toHaveBeenCalled();
      expect(mockUserService.update).not.toHaveBeenCalled();
    });

    it('deleteUser() KHÔNG được phép xóa tài khoản Admin', () => {
      const adminUser = { id: 'admin-id', userName: 'Admin' } as any;

      component.deleteUser(adminUser);

      expect(mockToaster.error).toHaveBeenCalled();
      expect(mockUserService.delete).not.toHaveBeenCalled();
    });
  });

  describe('Regular User Account Actions with Confirmation Modal', () => {
    it('lockUser() mở modal confirm và thực thi khóa tài khoản khi người dùng xác nhận', () => {
      const regularUser = { id: 'user-1', userName: 'Cashier' } as any;

      // 1. Nhấn nút khóa -> mở modal confirm
      component.lockUser(regularUser);

      expect(component.isConfirmModalVisible).toBe(true);
      expect(component.confirmActionType).toBe('lock');
      expect(component.confirmTargetUser).toBe(regularUser);
      expect(component.confirmButtonClass).toBe('btn-danger');

      // 2. Người dùng nhấn nút xác nhận trong modal
      component.executeConfirmedAction();

      expect(mockLockoutService.lockUser).toHaveBeenCalledWith('user-1', expect.any(String));
      expect(mockToaster.success).toHaveBeenCalled();
      expect(component.isConfirmModalVisible).toBe(false);
    });

    it('unlockUser() mở modal confirm và thực thi mở khóa tài khoản khi xác nhận', () => {
      const regularUser = { id: 'user-1', userName: 'Cashier' } as any;

      component.unlockUser(regularUser);

      expect(component.isConfirmModalVisible).toBe(true);
      expect(component.confirmActionType).toBe('unlock');
      expect(component.confirmTargetUser).toBe(regularUser);

      component.executeConfirmedAction();

      expect(mockLockoutService.unlockUser).toHaveBeenCalledWith('user-1', expect.any(String));
      expect(mockToaster.success).toHaveBeenCalled();
      expect(component.isConfirmModalVisible).toBe(false);
    });

    it('toggleActive() mở modal confirm và thực thi thay đổi trạng thái khi xác nhận', () => {
      const regularUser = { id: 'user-2', userName: 'I_Keeper', isActive: true } as any;

      component.toggleActive(regularUser);

      expect(component.isConfirmModalVisible).toBe(true);
      expect(component.confirmActionType).toBe('toggleActive');

      component.executeConfirmedAction();

      expect(mockUserService.update).toHaveBeenCalledWith('user-2', expect.objectContaining({ isActive: false }));
      expect(mockToaster.success).toHaveBeenCalled();
      expect(component.isConfirmModalVisible).toBe(false);
    });

    it('deleteUser() mở modal confirm và thực thi xóa tài khoản khi xác nhận', () => {
      const regularUser = { id: 'user-3', userName: 'An_Staff' } as any;

      component.deleteUser(regularUser);

      expect(component.isConfirmModalVisible).toBe(true);
      expect(component.confirmActionType).toBe('delete');

      component.executeConfirmedAction();

      expect(mockUserService.delete).toHaveBeenCalledWith('user-3');
      expect(mockToaster.success).toHaveBeenCalled();
      expect(component.isConfirmModalVisible).toBe(false);
    });

    it('closeConfirmModal() đóng modal và đặt lại trạng thái', () => {
      const regularUser = { id: 'user-4', userName: 'Bi_Nguyen' } as any;
      component.lockUser(regularUser);
      expect(component.isConfirmModalVisible).toBe(true);

      component.closeConfirmModal();

      expect(component.isConfirmModalVisible).toBe(false);
      expect(component.confirmActionType).toBeNull();
      expect(component.confirmTargetUser).toBeNull();
      expect(mockLockoutService.lockUser).not.toHaveBeenCalled();
    });
  });
});
