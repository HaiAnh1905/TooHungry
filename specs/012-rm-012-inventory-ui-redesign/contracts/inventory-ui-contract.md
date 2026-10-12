# Hợp đồng Giao diện & Bản địa hóa (UI & Localization Contracts): RM-012

**Mã Tính năng**: `RM-012`  
**Ngày cập nhật**: 2026-10-09  
**Trạng thái**: Hoàn thiện (Phase 1 Artifact)  

---

## 1. Hợp đồng Ngôn ngữ & Bản địa hóa (i18n Dictionary Contract)

Tất cả các khóa bản địa hóa dưới đây BẮT BUỘC phải được cấu hình đầy đủ ở cả hai tệp:
- `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json`
- `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json`

### 1.1. Thẻ Chỉ số KPI & Header
| Khóa Bản địa hóa (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Vị trí Sử dụng |
| :--- | :--- | :--- | :--- |
| `Menu:Inventory` | Quản lý Tồn kho | Inventory Management | Tiêu đề trang Header |
| `ManageInventorySubtitle` | Kiểm soát số lượng nguyên liệu, hạn dùng theo lô và lịch sử biến động kho | Monitor ingredient stocks, batch expiry, and movement history | Phụ đề trang Header |
| `TotalIngredients` | Tổng số nguyên liệu | Total Ingredients | Thẻ KPI 1 |
| `SafeStockCount` | Tồn kho an toàn | Safe Stock | Thẻ KPI 2 |
| `LowStockCount` | Cảnh báo thiếu hụt | Low Stock Alert | Thẻ KPI 3 |
| `CriticalExpiredCount` | Lô quá hạn khẩn cấp | Critical Expired Batches | Thẻ KPI 4 |
| `AddIngredientAction` | Thiết lập tồn kho | Configure Ingredient | Nút Header Secondary |
| `InboundBatchAction` | Nhập kho | Inbound Receipt | Nút Header Primary CTA |

### 1.2. Banner Cảnh báo Tồn kho (Alerts Banner)
| Khóa Bản địa hóa (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Vị trí Sử dụng |
| :--- | :--- | :--- | :--- |
| `InventoryAlertsBannerTitle` | Cảnh báo Tồn kho Cần Xử lý | Inventory Alerts Requiring Attention | Tiêu đề Alert Banner |
| `ViewAllAlerts` | Xem chi tiết ({0}) | View All ({0}) | Nút mở rộng banner |
| `CollapseAlerts` | Thu gọn | Collapse | Nút thu gọn banner |
| `DismissAlerts` | Đóng | Dismiss | Nút ẩn banner tạm thời |
| `DiscardNowAction` | Xuất hủy ngay | Discard Now | Nút hành động nhanh trên banner |

### 1.3. Hệ thống 3 Tab Điều hướng
| Khóa Bản địa hóa (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Vị trí Sử dụng |
| :--- | :--- | :--- | :--- |
| `Tab:StockOverview` | Tổng quan Tồn kho | Stock Overview | Tab 1 Header |
| `Tab:BatchList` | Danh sách Lô hàng | Batch Management | Tab 2 Header |
| `Tab:TransactionHistory` | Lịch sử Giao dịch | Transaction History | Tab 3 Header |

### 1.4. Modal Chi tiết Lô hàng (`IngredientBatchesModal`)
| Khóa Bản địa hóa (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Vị trí Sử dụng |
| :--- | :--- | :--- | :--- |
| `IngredientBatchesModalTitle` | Chi tiết Lô hàng: {0} | Batch Details: {0} | Tiêu đề modal |
| `IngredientBatchesModalSubtitle` | Danh sách các lô hàng đang tồn được sắp xếp theo chuẩn FEFO | Active inventory batches sorted by FEFO | Phụ đề modal |
| `ViewBatches` | Xem các lô | View Batches | Nút thao tác trên Tab 1 |
| `ViewMovementHistory` | Lịch sử biến động | Movement History | Nút lối tắt trên Tab 1 |
| `UnitCostHeader` | Giá vốn | Unit Cost | Cột giá vốn |
| `EmptyBatchesForIngredient` | Nguyên liệu này hiện chưa có lô hàng nào còn tồn | No active batches found for this ingredient | Trạng thái rỗng modal |
| `InboundThisIngredient` | Nhập lô mới cho nguyên liệu này | Inbound New Batch | Nút gợi ý trong modal rỗng |

### 1.5. Modal Xác nhận Xuất hủy Lô hàng (`DiscardBatchModal`)
| Khóa Bản địa hóa (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Vị trí Sử dụng |
| :--- | :--- | :--- | :--- |
| `DiscardBatchModalTitle` | Xuất hủy Lô hàng | Discard Inventory Batch | Tiêu đề modal hủy |
| `DiscardBatchConfirmMessage` | Bạn có chắc chắn muốn xuất hủy toàn bộ số lượng còn lại của lô {0} ({1} {2}) không? Thao tác này không thể hoàn tác. | Are you sure you want to discard the remaining {1} {2} of batch {0}? This action cannot be undone. | Thông điệp cảnh báo |
| `DiscardReasonCategoryLabel` | Phân loại lý do hủy * | Discard Reason Category * | Label dropdown lý do |
| `DiscardReason:Expired` | Quá hạn sử dụng | Expired beyond shelf life | Gợi ý lý do 1 |
| `DiscardReason:Damaged` | Hư hỏng / biến chất trong quá trình lưu kho | Damaged / spoiled during storage | Gợi ý lý do 2 |
| `DiscardReason:Contaminated` | Rách bao bì / nhiễm bẩn / không đạt vệ sinh | Packaging torn / contaminated | Gợi ý lý do 3 |
| `DiscardReason:Other` | Lý do khác | Other reason | Gợi ý lý do 4 |
| `DiscardCustomNotesLabel` | Ghi chú chi tiết * | Detailed Notes * | Label textarea ghi chú |
| `DiscardCustomNotesPlaceholder` | Nhập mô tả nguyên nhân phục vụ đối soát kiểm toán... | Enter specific notes for internal audit... | Placeholder textarea |
| `ConfirmDiscardAction` | Xác nhận Xuất hủy | Confirm Discard | Nút submit modal hủy |
| `BatchDiscardedSuccess` | Đã xuất hủy lô hàng thành công | Batch discarded successfully | Toaster thông báo thành công |

### 1.6. Tab 3 — Lịch sử Giao dịch
| Khóa Bản địa hóa (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Vị trí Sử dụng |
| :--- | :--- | :--- | :--- |
| `SelectIngredientPrompt` | Chọn nguyên liệu tra cứu | Select Ingredient to view | Placeholder selector |
| `TransactionType:In` | Nhập kho | Inbound | Badge giao dịch 1 |
| `TransactionType:Out` | Xuất món | Recipe Consumption | Badge giao dịch 2 |
| `TransactionType:AdjIn` | Điều chỉnh tăng | Adjustment (+) | Badge giao dịch 3 |
| `TransactionType:AdjOut` | Điều chỉnh giảm | Adjustment (-) | Badge giao dịch 4 |
| `TransactionType:Discard` | Xuất hủy | Discard | Badge giao dịch 5 |
| `NoTransactionsFound` | Chưa có giao dịch nào được ghi nhận cho nguyên liệu này | No transactions recorded for this ingredient | Trạng thái rỗng Tab 3 |
| `TransactionDateHeader` | Thời gian | Timestamp | Cột thời gian |
| `TransactionTypeHeader` | Loại giao dịch | Type | Cột loại giao dịch |
| `QuantityChangeHeader` | Biến động | Quantity | Cột số lượng |
| `ReferenceCodeHeader` | Mã tham chiếu | Reference | Cột mã đơn hàng |
| `ReasonHeader` | Lý do | Reason | Cột lý do |

---

## 2. Hợp đồng Thẩm mỹ & Giao diện (Design Tokens Contract)

Tuân thủ nghiêm ngặt Điều VI Hiến pháp Acme.TooHungry (Giao diện Cam & Trắng):

```scss
// Brand Theme Tokens
$theme-primary: #ea580c;           // Cam thương hiệu chính
$theme-primary-hover: #c2410c;     // Cam hover
$theme-primary-light: #fff3e8;     // Nền cam pastel ấm áp (Active Tab & Row Highlight)
$theme-primary-border: #fed7aa;    // Viền cam nhẹ
$theme-text-dark: #1f2937;         // Màu chữ tiêu đề chính
$theme-text-muted: #6b7280;        // Màu chữ chú thích
$theme-bg-surface: #ffffff;        // Nền thẻ và modal trắng tinh khiết

// Metric Cards Color Schemes
$kpi-total-bg: #f8fafc;
$kpi-total-text: #0f172a;
$kpi-safe-bg: #f0fdf4;
$kpi-safe-text: #166534;
$kpi-warning-bg: #fffbeb;
$kpi-warning-text: #b45309;
$kpi-danger-bg: #fef2f2;
$kpi-danger-text: #991b1b;

// Border Radii
$border-radius-card: 16px;
$border-radius-modal: 16px;
$border-radius-badge: 20px;
$border-radius-btn: 8px;

// Shadows
$card-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
$modal-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
$hover-shadow: 0 6px 24px rgba(234, 88, 12, 0.15);
```

---

## 3. Hợp đồng API Proxy Angular (`InventoryService`)

Cập nhật proxy `angular/src/app/proxy/inventories/inventory.service.ts`:

```typescript
// GET /api/app/inventory/transactions/{ingredientId}
getTransactions = (ingredientId: string, config?: Partial<Rest.Config>) =>
  this.restService.request<any, InventoryTransactionDto[]>({
    method: 'GET',
    headers: { Accept: 'application/json' },
    url: `/api/app/inventory/transactions/${ingredientId}`,
  },
  { apiName: this.apiName, ...config });

// POST /api/app/inventory/batches/{id}/discard
discardBatch = (id: string, input: { reason: string }, config?: Partial<Rest.Config>) =>
  this.restService.request<any, void>({
    method: 'POST',
    headers: { Accept: 'application/json' },
    url: `/api/app/inventory/batches/${id}/discard`,
    body: input,
  },
  { apiName: this.apiName, ...config });
```
