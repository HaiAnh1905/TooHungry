export enum InventoryKeeperShiftType {
  Morning = 'Morning',                   // Ca sáng: 08:00 - 15:00
  AfternoonEvening = 'AfternoonEvening', // Ca chiều/tối: 15:00 - 22:00
  OffShift = 'OffShift',                 // Ngoài ca trực: 22:00 - 08:00
}

export enum StorageConditionType {
  All = 'All',           // Tất cả điều kiện
  Chilled = 'Chilled',   // Bảo quản mát (0°C - 4°C)
  Frozen = 'Frozen',     // Bảo quản đông (-18°C)
  Dry = 'Dry',           // Bảo quản khô ráo / Nhiệt độ phòng
}

export enum BatchStatusFilterType {
  All = 'All',                   // Tất cả trạng thái
  InUse = 'InUse',               // Đang sử dụng (còn hạn)
  ExpiringSoon = 'ExpiringSoon', // Lô cận date (hạn dùng <= 7 ngày)
  Expired = 'Expired',           // Đã hết hạn (chưa xuất hủy)
  Deactivated = 'Deactivated',   // Đã khóa tạm ngưng (RM-013)
}

export interface InventoryKeeperUserInfo {
  userId: string;
  userName: string;
  fullName: string;
  roles: string[];
  shiftType: InventoryKeeperShiftType;
  shiftLocalizationKey: string;
  isOnline: boolean;
  canReturnToAdmin: boolean; // True nếu roles chứa 'Manager' hoặc 'Administrator'
}

export interface InventoryKeeperKpiSummary {
  /**
   * Số lượng lô hàng cận date (<= 7 ngày)
   */
  expiringSoonCount: number;

  /**
   * Số lượng nguyên liệu dưới định mức tồn kho tối thiểu
   */
  lowStockCount: number;

  /**
   * Số lượng lô hàng đã quá hạn cần xuất hủy lập biên bản
   */
  expiredCount: number;

  /**
   * Tổng số lô hàng đang lưu trữ trong kho
   */
  totalActiveBatchesCount: number;

  /**
   * Thời điểm cập nhật số liệu gần nhất
   */
  lastUpdated: Date;
}

export interface BarcodeScanEvent {
  /**
   * Chuỗi mã vạch / QR quét được
   */
  code: string;

  /**
   * Nguồn phát tín hiệu ('HID' hoặc 'CAMERA')
   */
  source: 'HID' | 'CAMERA';

  /**
   * Thời điểm quét
   */
  timestamp: Date;
}

export interface InventoryKeeperFilterState {
  searchTerm: string;
  storageCondition: StorageConditionType;
  batchStatus: BatchStatusFilterType;
  supplierName?: string;
}
