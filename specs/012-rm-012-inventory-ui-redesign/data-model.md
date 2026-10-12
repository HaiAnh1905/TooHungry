# Mô hình Dữ liệu & Trạng thái Giao diện (Data & UI Model): RM-012 Tái thiết kế Giao diện Quản lý Tồn kho & Lô hàng

**Mã Tính năng**: `RM-012`  
**Ngày cập nhật**: 2026-10-09  
**Trạng thái**: Hoàn thiện (Phase 1 Artifact)  

---

## 1. Mô hình Chỉ số & Trạng thái Giao diện (Component UI States)

### 1.1. Thẻ Chỉ số Tồn kho Tổng hợp (`InventoryKpiSummary`)
Mô hình dữ liệu tính toán cho 4 Thẻ KPI trên đầu trang `/inventory`:

```typescript
export interface InventoryKpiSummary {
  /** Tổng số loại nguyên liệu đang quản lý */
  totalIngredients: number;
  /** Số nguyên liệu có mức tồn an toàn (CurrentStock >= MinStock và CurrentStock > 0) */
  safeIngredients: number;
  /** Số nguyên liệu thiếu hụt hoặc hết hàng (CurrentStock < MinStock) */
  lowStockIngredients: number;
  /** Số lượng lô hàng quá hạn sử dụng (ExpiryDate < Now và RemainingQuantity > 0) */
  expiredBatchesCount: number;
}
```

---

### 1.2. Banner Cảnh báo Tồn kho (`InventoryAlertsBannerState`)
Trạng thái hiển thị và tương tác của thanh cảnh báo thông minh:

```typescript
export interface InventoryAlertsBannerState {
  /** Danh sách toàn bộ cảnh báo lấy từ backend API GET /api/app/inventory/alerts */
  alerts: InventoryAlertDto[];
  /** Cảnh báo nguy cấp nhất (Critical/Danger) được ưu tiên hiển thị trên dòng tóm tắt */
  topAlert: InventoryAlertDto | null;
  /** Trạng thái mở rộng danh sách chi tiết (true: bung ra, false: thu gọn) */
  isExpanded: boolean;
  /** Trạng thái người dùng bấm đóng ẩn tạm thời trong phiên làm việc */
  isDismissed: boolean;
  /** Trạng thái đang tải dữ liệu */
  isLoading: boolean;
}
```

---

### 1.3. Trạng thái Quản lý Toàn trang (`InventoryComponentState`)
Trạng thái tổng hợp được quản lý bên trong `InventoryComponent`:

```typescript
export interface InventoryComponentState {
  /** Tab hiện tại đang kích hoạt */
  activeTab: 'ingredients' | 'batches' | 'transactions';

  /** Dữ liệu tab 1: Danh sách nguyên liệu & phân trang */
  ingredients: IngredientDto[];
  filteredIngredients: IngredientDto[];
  ingredientPage: number;
  ingredientPageSize: number;

  /** Dữ liệu tab 2: Danh sách lô hàng toàn kho & phân trang */
  batches: InventoryBatchDto[];
  filteredBatches: InventoryBatchDto[];
  batchPage: number;
  batchPageSize: number;

  /** Dữ liệu tab 3: Lịch sử giao dịch theo nguyên liệu */
  selectedTransactionIngredientId: string | null;
  transactions: InventoryTransactionDto[];
  isLoadingTransactions: boolean;

  /** Modal Chi tiết Lô hàng Nguyên liệu */
  isBatchesModalOpen: boolean;
  selectedIngredientForBatches: IngredientDto | null;
  selectedIngredientBatches: InventoryBatchDto[];
  isLoadingIngredientBatches: boolean;

  /** Modal Xác nhận Xuất hủy Lô hàng */
  isDiscardModalOpen: boolean;
  selectedBatchForDiscard: InventoryBatchDto | null;
  discardReasonCategory: string; // 'EXPIRED' | 'DAMAGED' | 'CONTAMINATED' | 'OTHER'
  discardCustomNote: string;
  isSubmittingDiscard: boolean;

  /** Bộ lọc tìm kiếm chung */
  searchTerm: string;
  selectedStorageType: string; // 'all' | '0' (FRESH) | '1' (SHORT_TERM) | '2' (LONG_TERM)
  selectedBatchStatus: string; // 'all' | 'safe' | 'expiring_soon' | 'expired' | 'empty'
  sortDirection: 'newest' | 'oldest';
}
```

---

## 2. DTOs và Dữ liệu Backend (Tái sử dụng từ RM-011)

### 2.1. `IngredientDto`
Được cung cấp bởi `IngredientService.getList()`:
- `id`: `string (Guid)` — Định danh nguyên liệu.
- `name`: `string` — Tên nguyên liệu.
- `code`: `string` — Mã nguyên liệu.
- `baseUnit`: `string` — Đơn vị tính cơ sở (kg, lít, gói...).
- `storageType`: `StorageType` — `0: FRESH` (Tươi sống), `1: SHORT_TERM` (Ngắn hạn), `2: LONG_TERM` (Dài hạn).
- `consumptionMethod`: `ConsumptionMethod` — `0: RECIPE`, `1: MANUAL`, `2: HYBRID`.
- `currentStock`: `number` — Tổng lượng tồn kho thực tế tính theo `baseUnit`.
- `minStock`: `number` — Ngưỡng tồn kho an toàn tối thiểu.
- `isActive`: `boolean` — Trạng thái hoạt động.

### 2.2. `InventoryBatchDto`
Được cung cấp bởi `InventoryService.getBatches(ingredientId?)`:
- `id`: `string (Guid)` — Định danh lô hàng.
- `ingredientId`: `string (Guid)` — Định danh nguyên liệu.
- `ingredientName`: `string` — Tên nguyên liệu tương ứng.
- `batchCode`: `string` — Mã lô hàng (ví dụ: `BATCH-20261009-01`).
- `quantity`: `number` — Số lượng cơ sở nhập ban đầu.
- `remainingQuantity`: `number` — Số lượng cơ sở còn lại trong kho.
- `purchaseUnit`: `string` — Đơn vị mua hàng (Thùng, Bao, Két...).
- `conversionFactor`: `number` — Hệ số quy đổi sang đơn vị cơ sở.
- `receivedAt`: `string (ISO Date)` — Ngày giờ nhập kho.
- `expiryDate`: `string (ISO Date)` — Hạn sử dụng của lô.
- `unitCost`: `number` — Đơn giá vốn nhập kho (`decimal`).
- `storageType`: `StorageType` — Phân loại bảo quản.
- `isExpired`: `boolean` — Cờ báo đã quá hạn sử dụng.
- `isExpiringToday`: `boolean` — Hết hạn trong 24h.
- `isNearExpiry`: `boolean` — Sắp hết hạn trong 3 ngày.
- `isActive`: `boolean` — Trạng thái lô hàng.

### 2.3. `InventoryTransactionDto`
Được cung cấp bởi `InventoryService.getTransactions(ingredientId)`:
- `id`: `string (Guid)` — Định danh giao dịch.
- `ingredientId`: `string (Guid)` — Định danh nguyên liệu.
- `ingredientName`: `string` — Tên nguyên liệu.
- `batchId`: `string (Guid)?` — Mã lô liên quan (nếu có).
- `batchCode`: `string?` — Mã số lô.
- `transactionType`: `number (enum)` — `1: IN` (Nhập kho), `2: OUT` (Xuất món), `3: ADJUSTMENT_IN`, `4: ADJUSTMENT_OUT`, `5: DISCARD` (Xuất hủy).
- `quantity`: `number` — Số lượng biến động (dương với nhập/tăng, hiển thị `-` với xuất/hủy).
- `unitCost`: `number` — Giá vốn đơn vị tại thời điểm giao dịch.
- `reason`: `string` — Lý do giao dịch.
- `referenceId`: `string?` — Mã đơn hàng liên quan (Order reference).
- `creationTime`: `string (ISO Date)` — Thời điểm thực hiện.
- `creatorId`: `string (Guid)?` — Người thực hiện giao dịch.

### 2.4. `InventoryAlertDto`
Được cung cấp bởi `InventoryService.getAlerts()`:
- `alertType`: `string` — `EXPIRED_FRESH`, `EXPIRING_TODAY`, `NEAR_EXPIRY`, `OUT_OF_STOCK`, `SHORTAGE`.
- `severity`: `'danger' | 'warning' | 'info'` — Mức độ nghiêm trọng.
- `ingredientId`: `string (Guid)` — Nguyên liệu liên quan.
- `ingredientName`: `string` — Tên nguyên liệu.
- `batchId`: `string (Guid)?` — Lô hàng liên quan.
- `batchCode`: `string?` — Mã lô hàng.
- `message`: `string` — Nội dung thông điệp cảnh báo.
- `timestamp`: `string (ISO Date)` — Thời gian ghi nhận cảnh báo.

---

## 3. Quy tắc Hiển thị & Chuyển đổi Dữ liệu (Formatting & Mapping Rules)

1. **Hiển thị Số lượng**:
   - Số lượng tồn kho và biến động được định dạng với tối đa 2 chữ số thập phân: `{{ item.currentStock | number:'1.0-2' }} {{ item.baseUnit }}`.
2. **Hiển thị Tiền tệ**:
   - Đơn giá vốn `UnitCost` được hiển thị chuẩn VND: `{{ item.unitCost | number:'1.0-0' }} ₫`.
3. **Hiển thị Biến động Giao dịch**:
   - Giao dịch Nhập kho (`IN`, `ADJUSTMENT_IN`): Màu xanh lá đậm (`#16A34A`), dấu `+`, icon `fa-arrow-down-left`.
   - Giao dịch Xuất kho (`OUT`, `RECIPE`, `ADJUSTMENT_OUT`, `DISCARD`): Màu cam đỏ (`#DC2626`), dấu `-`, icon `fa-arrow-up-right`.
4. **Quy tắc sắp xếp FEFO trong Modal Lô hàng**:
   - Luôn sắp xếp ưu tiên theo `ExpiryDate ASC` (Lô hết hạn sớm nhất xếp lên đầu), sau đó theo `ReceivedAt ASC`.
