# Hợp đồng Giao tiếp & Kỹ thuật (Technical Contracts): RM-021 Làm lại giao diện kho bên Dashboard

**Tính năng**: `RM-021 — Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)`  
**Nhánh**: `021-rm-021-dashboard-inventory-redesign` | **Ngày**: 2026-10-20 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Hợp đồng Định tuyến & Đồng bộ Query Parameter (Router Contract)

Định tuyến trong `app.routes.ts`:
```typescript
{
  path: 'inventory',
  loadComponent: () => import('./inventory/inventory.component').then(c => c.InventoryComponent),
  canActivate: [authGuard, smartPermissionGuard],
  data: { requiredPolicy: 'TooHungry.Inventories' },
}
```

### Quy ước Query Parameter
- URL chuẩn: `/inventory?tab=ingredients|batches|transactions`
- Giá trị mặc định nếu không có query param `tab`: `ingredients`
- Hành vi chuyển Tab:
  ```typescript
  router.navigate([], {
    relativeTo: route,
    queryParams: { tab: selectedTab },
    queryParamsHandling: 'merge'
  });
  ```

---

## 2. Hợp đồng Giao tiếp Sub-Components (Component Contracts)

### 2.1 `InventoryKpiBarComponent`
Khối 4 thẻ Bento KPI tổng quan sức khỏe kho:
```typescript
@Component({
  selector: 'app-inventory-kpi-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryKpiBarComponent {
  @Input({ required: true }) kpiSummary!: DashboardInventoryKpiSummary;
  @Input() activeFilter: 'all' | 'safe' | 'lowStock' | 'expired' = 'all';

  @Output() readonly selectKpi = new EventEmitter<'all' | 'safe' | 'lowStock' | 'expired'>();
}
```

### 2.2 `InventoryAlertsBannerComponent`
Băng rôn cảnh báo khẩn cấp đầu trang dạng Accordion:
```typescript
@Component({
  selector: 'app-inventory-alerts-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAlertsBannerComponent {
  @Input({ required: true }) alerts: InventoryAlertDto[] = [];
  @Input() isExpanded: boolean = false;
  @Input() isDismissed: boolean = false;

  @Output() readonly toggleExpand = new EventEmitter<void>();
  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly selectAlert = new EventEmitter<InventoryAlertDto>();
}
```

### 2.3 `InventoryIngredientTabComponent`
Quản lý danh mục nguyên liệu, định mức an toàn và thanh tiến trình trực quan:
```typescript
@Component({
  selector: 'app-inventory-ingredient-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryIngredientTabComponent {
  @Input({ required: true }) ingredients: IngredientDto[] = [];
  @Input() searchQuery: string = '';
  @Input() storageFilter: StorageFilterType = StorageFilterType.All;
  @Input() stockFilter: 'ALL' | 'SAFE' | 'LOW' = 'ALL';
  @Input() isLoading: boolean = false;

  @Output() readonly openCreate = new EventEmitter<void>();
  @Output() readonly openEdit = new EventEmitter<IngredientDto>();
  @Output() readonly viewBatches = new EventEmitter<IngredientDto>();
  @Output() readonly quickInbound = new EventEmitter<IngredientDto>();
}
```

### 2.4 `InventoryBatchTabComponent`
Danh sách chi tiết lô hàng, thanh timeline FEFO và thao tác 1 chạm:
```typescript
@Component({
  selector: 'app-inventory-batch-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryBatchTabComponent {
  @Input({ required: true }) batches: BatchViewItem[] = [];
  @Input() searchQuery: string = '';
  @Input() statusFilter: BatchFefoStatus | 'ALL' = 'ALL';
  @Input() isLoading: boolean = false;

  @Output() readonly openCreateBatch = new EventEmitter<void>();
  @Output() readonly lockBatch = new EventEmitter<BatchViewItem>();
  @Output() readonly unlockBatch = new EventEmitter<BatchViewItem>();
  @Output() readonly discardBatch = new EventEmitter<BatchViewItem>();
}
```

### 2.5 `InventoryTransactionTabComponent`
Nhật ký xuất nhập tồn bất biến và kích hoạt kiểm kê cân đối kho:
```typescript
@Component({
  selector: 'app-inventory-transaction-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryTransactionTabComponent {
  @Input({ required: true }) transactions: InventoryTransactionDto[] = [];
  @Input() selectedTypeFilter: InventoryTransactionType | 'ALL' = 'ALL';
  @Input() isLoading: boolean = false;

  @Output() readonly openStockAdjustment = new EventEmitter<void>();
  @Output() readonly filterChange = new EventEmitter<InventoryTransactionType | 'ALL'>();
}
```

### 2.6 `ReplenishmentInsightsWidgetComponent`
Tiện ích thông minh đề xuất nhập hàng dựa trên module Dự báo (RM-014):
```typescript
@Component({
  selector: 'app-replenishment-insights-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReplenishmentInsightsWidgetComponent {
  @Input({ required: true }) suggestions: ReplenishmentSuggestionItem[] = [];
  @Input() isLoading: boolean = false;

  @Output() readonly quickInbound = new EventEmitter<ReplenishmentSuggestionItem>();
}
```

---

## 3. Hợp đồng Tái sử dụng API Backend (`IInventoryAppService` & `IIngredientAppService`)

Tái sử dụng 100% endpoints hiện có tại `InventoryService` và `IngredientService`:

| Phương thức API | Endpoint URL | Mục đích trong RM-021 |
|---|---|---|
| `getBatches` | `GET /api/app/inventory/batches` | Tải danh sách lô hàng phân trang, lọc theo nguyên liệu hoặc mã lô |
| `createBatch` | `POST /api/app/inventory/batches` | Nhập lô hàng mới (`CreateInventoryBatchDto`) |
| `discardBatch` | `POST /api/app/inventory/batches/{id}/discard` | Xuất hủy lô quá hạn / hỏng (`DiscardBatchInput`) |
| `deactivateBatch` | `POST /api/app/inventory/batches/{id}/deactivate` | Tạm khóa lô hàng cách ly theo RM-013 (`DeactivateBatchInput`) |
| `reactivateBatch` | `POST /api/app/inventory/batches/{id}/reactivate` | Mở khóa kích hoạt lại lô hàng theo RM-013 |
| `adjustStock` | `POST /api/app/inventory/stock-adjustment` | Kiểm kê cân đối kho thực tế (`StockAdjustmentInput`) |
| `getAlerts` | `GET /api/app/inventory/alerts` | Tải danh sách cảnh báo hạn dùng và hết hàng |
| `getTransactions` | `GET /api/app/inventory/transactions/{ingredientId}` | Tải nhật ký biến động giao dịch kho |
| `getList` | `GET /api/app/ingredient` | Tải danh mục nguyên liệu và tồn kho khả dụng (`CurrentStock`) |
