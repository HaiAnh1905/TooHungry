import { TemplateRef } from '@angular/core';

/**
 * Định nghĩa ca làm việc của nhân viên phục vụ trong ngày
 */
export enum WaiterShiftType {
  Morning = 'Morning',       // Ca sáng: 09:00 - 15:00
  Evening = 'Evening',       // Ca tối: 15:00 - 23:00
  OffShift = 'OffShift',     // Ngoài giờ phục vụ: 23:00 - 09:00
}

/**
 * Thông tin nhân viên phục vụ hiển thị trên thanh Topbar
 */
export interface WaiterUserInfo {
  userId: string;
  userName: string;
  fullName: string;
  roles: string[];
  shiftType: WaiterShiftType;
  shiftLocalizationKey: string;
  isOnline: boolean;
  canReturnToAdmin: boolean;
}

/**
 * Mô hình trạng thái quản lý Sidebar và Drawer
 */
export interface WaiterSidebarState {
  template: TemplateRef<any> | null;
  isDrawerOpen: boolean;
  activeFilterCount: number;
  titleKey: string;
}
