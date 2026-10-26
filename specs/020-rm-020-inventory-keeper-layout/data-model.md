# Thiết kế Mô hình Dữ liệu, Trạng thái & Giao diện: RM-020 Phân hệ & Bố cục Thủ kho

**Tính năng**: `RM-020 — Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)`  
**Nhánh**: `020-rm-020-inventory-keeper-layout` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Các Kiểu Liệt kê (Enums)

### `InventoryKeeperShiftType`
Định nghĩa ca trực kho tự động dựa theo thời gian thực:
```typescript
export enum InventoryKeeperShiftType {
  Morning = 'Morning',                   // Ca sáng: 08:00 - 15:00
  AfternoonEvening = 'AfternoonEvening', // Ca chiều/tối: 15:00 - 22:00
  OffShift = 'OffShift'                  // Ngoài ca trực: 22:00 - 08:00
}
```

### `StorageConditionType`
Phân loại điều kiện nhiệt độ bảo quản nguyên liệu tại quầy kho:
```typescript
export enum StorageConditionType {
  All = 'All',           // Tất cả điều kiện
  Chilled = 'Chilled',   // Bảo quản mát (0°C - 4°C)
  Frozen = 'Frozen',     // Bảo quản đông (-18°C)
  Dry = 'Dry'            // Bảo quản khô ráo / Nhiệt độ phòng
}
```

### `BatchStatusFilterType`
Bộ lọc trạng thái hạn dùng và hoạt động của lô hàng:
```typescript
export enum BatchStatusFilterType {
  All = 'All',                   // Tất cả trạng thái
  InUse = 'InUse',               // Đang sử dụng (còn hạn)
  ExpiringSoon = 'ExpiringSoon', // Lô cận date (hạn dùng <= 7 ngày)
  Expired = 'Expired',           // Đã hết hạn (chưa xuất hủy)
  Deactivated = 'Deactivated'    // Đã khóa tạm ngưng (RM-013)
}
```

---

## 2. Các Mô hình Trạng thái Giao diện (UI State Models)

### `InventoryKeeperUserInfo`
Thông tin thủ kho hiển thị trên thanh Topbar:
```typescript
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
```

### `InventoryKeeperKpiSummary`
Tổng hợp các chỉ số cảnh báo nhanh trên Topbar:
```typescript
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
```

### `BarcodeScanEvent`
Dữ liệu phát ra khi máy quét mã vạch (HID hoặc Camera) quét thành công:
```typescript
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
```

### `InventoryKeeperFilterState`
Trạng thái bộ lọc tìm kiếm trên thanh Sidebar:
```typescript
export interface InventoryKeeperFilterState {
  searchTerm: string;
  storageCondition: StorageConditionType;
  batchStatus: BatchStatusFilterType;
  supplierName?: string;
}
```

---

## 3. Quản lý Trạng thái Bằng Angular Signals (Reactive Signal State)

Trong `InventoryKeeperLayoutComponent` và các dịch vụ đi kèm:

```typescript
// Trạng thái thông tin người dùng ca trực
readonly currentUserInfo = signal<InventoryKeeperUserInfo | null>(null);

// Trạng thái tổng hợp KPI cảnh báo Topbar
readonly kpiSummary = signal<InventoryKeeperKpiSummary>({
  expiringSoonCount: 0,
  lowStockCount: 0,
  expiredCount: 0,
  totalActiveBatchesCount: 0,
  lastUpdated: new Date()
});

// Trạng thái đóng/mở Drawer trên thiết bị di động
readonly isMobileDrawerOpen = signal<boolean>(false);

// Trạng thái đang tải dữ liệu làm mới
readonly isRefreshing = signal<boolean>(false);

// Trạng thái mở modal quét camera
readonly isCameraScannerOpen = signal<boolean>(false);
```

---

## 4. Cấu hình Từ điển Đa ngôn ngữ (i18n Localization Keys)

Toàn bộ các chuỗi văn bản hiển thị trong phân hệ Thủ kho được định nghĩa đầy đủ trong `vi.json` và `en.json`:

### Tiếng Việt (`vi.json`):
```json
{
  "::InventoryKeeper": "Thủ kho",
  "::InventoryKeeperPortal": "Không gian làm việc Thủ kho",
  "::KeeperShiftMorning": "Ca Sáng (08:00 - 15:00)",
  "::KeeperShiftAfternoon": "Ca Chiều/Tối (15:00 - 22:00)",
  "::KeeperShiftOff": "Ngoài Ca Trực",
  "::KeeperAlertExpiringSoon": "Lô cận date (<= 7 ngày)",
  "::KeeperAlertLowStock": "Thiếu tồn an toàn",
  "::KeeperAlertExpired": "Lô quá hạn cần hủy",
  "::KeeperSearchPlaceholder": "Tìm mã lô, tên nguyên liệu, NCC (Ctrl + K)...",
  "::KeeperScanBarcode": "Quét Barcode / QR",
  "::KeeperStorageCondition": "Điều kiện bảo quản",
  "::StorageConditionAll": "Tất cả",
  "::StorageConditionChilled": "Mát (0°C - 4°C)",
  "::StorageConditionFrozen": "Đông (-18°C)",
  "::StorageConditionDry": "Khô ráo",
  "::KeeperBatchStatus": "Trạng thái lô hàng",
  "::BatchStatusAll": "Tất cả",
  "::BatchStatusInUse": "Đang dùng",
  "::BatchStatusExpiringSoon": "Cận date",
  "::BatchStatusExpired": "Quá hạn",
  "::BatchStatusDeactivated": "Đã khóa",
  "::QuickInboundBatch": "Nhập lô mới",
  "::QuickDiscardBatch": "Xuất hủy lô",
  "::QuickDeactivateBatch": "Khóa lô",
  "::QuickReactivateBatch": "Mở khóa lô",
  "::RefreshData": "Làm mới số liệu",
  "::ReturnToAdmin": "Quay lại Quản trị",
  "::KeeperDashboardTab": "Tổng quan & FEFO",
  "::KeeperBatchesTab": "Danh mục Lô hàng",
  "::KeeperTransactionsTab": "Nhật ký & Kiểm kê",
  "::BarcodeScannerTitle": "Quét mã vạch lô hàng",
  "::BarcodeScannerHint": "Hướng camera về phía mã vạch 1D hoặc mã QR trên bao bì lô hàng",
  "::BarcodeNotFound": "Không tìm thấy lô hàng tương ứng với mã vừa quét"
}
```

### Tiếng Anh (`en.json`):
```json
{
  "::InventoryKeeper": "Inventory Keeper",
  "::InventoryKeeperPortal": "Inventory Keeper Workspace",
  "::KeeperShiftMorning": "Morning Shift (08:00 - 15:00)",
  "::KeeperShiftAfternoon": "Afternoon/Evening Shift (15:00 - 22:00)",
  "::KeeperShiftOff": "Off Shift",
  "::KeeperAlertExpiringSoon": "Expiring soon (<= 7 days)",
  "::KeeperAlertLowStock": "Low safety stock",
  "::KeeperAlertExpired": "Expired batches to discard",
  "::KeeperSearchPlaceholder": "Search batch code, ingredient, supplier (Ctrl + K)...",
  "::KeeperScanBarcode": "Scan Barcode / QR",
  "::KeeperStorageCondition": "Storage Condition",
  "::StorageConditionAll": "All",
  "::StorageConditionChilled": "Chilled (0°C - 4°C)",
  "::StorageConditionFrozen": "Frozen (-18°C)",
  "::StorageConditionDry": "Dry Storage",
  "::KeeperBatchStatus": "Batch Status",
  "::BatchStatusAll": "All",
  "::BatchStatusInUse": "In Use",
  "::BatchStatusExpiringSoon": "Expiring Soon",
  "::BatchStatusExpired": "Expired",
  "::BatchStatusDeactivated": "Locked",
  "::QuickInboundBatch": "New Inbound Batch",
  "::QuickDiscardBatch": "Discard Batch",
  "::QuickDeactivateBatch": "Lock Batch",
  "::QuickReactivateBatch": "Unlock Batch",
  "::RefreshData": "Refresh Data",
  "::ReturnToAdmin": "Return to Admin",
  "::KeeperDashboardTab": "Overview & FEFO",
  "::KeeperBatchesTab": "Batch Inventory",
  "::KeeperTransactionsTab": "Transactions & Audit",
  "::BarcodeScannerTitle": "Scan Batch Barcode",
  "::BarcodeScannerHint": "Point camera at 1D Barcode or QR Code on the batch package",
  "::BarcodeNotFound": "No batch found matching the scanned barcode"
}
```
