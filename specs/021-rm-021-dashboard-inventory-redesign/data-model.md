# Thiết kế Mô hình Dữ liệu, Trạng thái & Giao diện: RM-021 Làm lại giao diện kho bên Dashboard

**Tính năng**: `RM-021 — Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)`  
**Nhánh**: `021-rm-021-dashboard-inventory-redesign` | **Ngày**: 2026-10-20 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Các Kiểu Liệt kê (Enums)

### `InventoryTabType`
Định nghĩa 3 Tab chính của màn hình Quản lý kho, đồng bộ qua query param `?tab=`:
```typescript
export type InventoryTabType = 'ingredients' | 'batches' | 'transactions';
```

### `BatchFefoStatus`
Phân loại trạng thái hạn sử dụng và vòng đời của lô hàng theo nguyên tắc FEFO:
```typescript
export enum BatchFefoStatus {
  Safe = 'Safe',                   // Còn hạn an toàn (> 7 ngày)
  ExpiringSoon = 'ExpiringSoon',   // Cận date (1 - 7 ngày)
  Expired = 'Expired',             // Đã hết hạn (<= 0 ngày, cần xuất hủy)
  Locked = 'Locked'                // Đang bị khóa tạm ngưng (RM-013)
}
```

### `StockLevelStatus`
Phân loại mức độ tồn kho của mặt hàng nguyên liệu so với định mức tồn an toàn:
```typescript
export enum StockLevelStatus {
  Safe = 'Safe',         // Tồn an toàn (>= 100% định mức tối thiểu)
  Low = 'Low',           // Tồn thấp (50% - < 100% định mức)
  Critical = 'Critical'  // Cạn kiệt / Nguy cấp (< 50% định mức hoặc bằng 0)
}
```

### `StorageFilterType`
Bộ lọc theo điều kiện bảo quản nhiệt độ của nguyên liệu:
```typescript
export enum StorageFilterType {
  All = 'All',           // Tất cả điều kiện
  Chilled = 'Chilled',   // Bảo quản mát (0°C - 4°C)
  Frozen = 'Frozen',     // Bảo quản đông (-18°C)
  Dry = 'Dry'            // Bảo quản khô ráo / Nhiệt độ phòng
}
```

---

## 2. Các Mô hình Trạng thái Giao diện (UI State Models)

### `DashboardInventoryKpiSummary`
Tổng hợp 4 chỉ số KPI Bento hiển thị đầu trang `/inventory`:
```typescript
export interface DashboardInventoryKpiSummary {
  /**
   * Tổng số lượng mặt hàng nguyên liệu đang quản lý
   */
  totalIngredients: number;

  /**
   * Số lượng mặt hàng nguyên liệu đạt mức tồn an toàn
   */
  safeIngredients: number;

  /**
   * Số lượng mặt hàng nguyên liệu dưới định mức an toàn (cần nhập)
   */
  lowStockIngredients: number;

  /**
   * Số lượng lô hàng đã quá hạn sử dụng cần xuất hủy
   */
  expiredBatchesCount: number;

  /**
   * Tổng giá trị vốn tồn kho ước tính (VNĐ)
   */
  estimatedTotalValue?: number;
}
```

### `ReplenishmentSuggestionItem`
Dữ liệu đề xuất bổ sung kho liên kết từ Kế hoạch mua hàng Dự báo (RM-014):
```typescript
export interface ReplenishmentSuggestionItem {
  ingredientId: string;
  ingredientName: string;
  unitName: string;
  currentStock: number;
  forecastDemand: number;
  suggestedQuantity: number;
  estimatedUnitPrice: number;
  storageType: StorageType;
}
```

### `BatchViewItem`
Mô hình hiển thị một dòng lô hàng với đầy đủ thông tin FEFO và thao tác 1 chạm:
```typescript
export interface BatchViewItem {
  id: string;
  batchCode: string;
  ingredientId: string;
  ingredientName: string;
  unitName: string;
  inboundDate: string;
  expirationDate: string;
  initialQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  fefoStatus: BatchFefoStatus;
  daysRemaining: number;
  elapsedPercentage: number;
  isActive: boolean;
  deactivationReason?: string;
}
```

### `InventoryAlertBannerState`
Trạng thái của Băng rôn Cảnh báo ghim đầu trang:
```typescript
export interface InventoryAlertBannerState {
  alerts: InventoryAlertDto[];
  topAlert: InventoryAlertDto | null;
  isExpanded: boolean;
  isDismissed: boolean;
  isLoading: boolean;
  totalAlertCount: number;
}
```

---

## 3. Quản lý Trạng thái Bằng Angular Signals (Signal-driven Store)

### `InventoryStateService`
Quản lý trạng thái chia sẻ tập trung cho toàn bộ trang `/inventory` và các sub-components:
```typescript
@Injectable()
export class InventoryStateService {
  // State Signals
  readonly activeTab = signal<InventoryTabType>('ingredients');
  readonly searchQuery = signal<string>('');
  readonly selectedStorage = signal<StorageFilterType>(StorageFilterType.All);
  readonly kpiSummary = signal<DashboardInventoryKpiSummary>({
    totalIngredients: 0,
    safeIngredients: 0,
    lowStockIngredients: 0,
    expiredBatchesCount: 0
  });
  readonly replenishmentSuggestions = signal<ReplenishmentSuggestionItem[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Computed Signals
  readonly hasExpiringAlerts = computed(() => this.kpiSummary().expiredBatchesCount > 0);
  readonly hasLowStockAlerts = computed(() => this.kpiSummary().lowStockIngredients > 0);
}
```

---

## 4. Từ điển Đa ngôn ngữ (i18n Keys)

Các khóa đa ngôn ngữ được đồng bộ trong `vi.json` và `en.json`:

| Khóa bản dịch (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) |
|---|---|---|
| `::DashboardInventory:Title` | Quản lý Tồn kho | Inventory Management |
| `::DashboardInventory:Subtitle` | Theo dõi tồn kho thực tế, kiểm soát hạn dùng FEFO và đối soát biến động | Real-time stock tracking, FEFO expiration control & transaction audit |
| `::DashboardInventory:OpenKeeperPortal` | Giao diện Thủ kho ↗ | Inventory Keeper Portal ↗ |
| `::DashboardInventory:TabIngredients` | Danh mục Nguyên liệu | Ingredients List |
| `::DashboardInventory:TabBatches` | Danh sách Lô hàng | Batches Management |
| `::DashboardInventory:TabTransactions` | Nhật ký & Kiểm kê | Transactions & Audit |
| `::DashboardInventory:ReplenishmentTitle` | Đề xuất Nhập hàng (Dự báo RM-014) | Replenishment Suggestions (Forecast RM-014) |
| `::DashboardInventory:SuggestedQty` | Số lượng đề xuất | Suggested Quantity |
| `::DashboardInventory:QuickInbound` | Nhập lô nhanh | Quick Inbound |
| `::DashboardInventory:DaysRemaining` | Còn {0} ngày | {0} days remaining |
| `::DashboardInventory:ExpiredDaysAgo` | Đã quá hạn {0} ngày | Expired {0} days ago |
| `::DashboardInventory:BatchLockedReason` | Lô đang bị tạm ngưng: {0} | Batch deactivated: {0} |
| `::DashboardInventory:StockProgressSafe` | Tồn an toàn ({0}%) | Safe Stock ({0}%) |
| `::DashboardInventory:StockProgressLow` | Sắp hết ({0}%) | Low Stock ({0}%) |
| `::DashboardInventory:StockProgressCritical` | Nguy cấp ({0}%) | Critical Stock ({0}%) |
