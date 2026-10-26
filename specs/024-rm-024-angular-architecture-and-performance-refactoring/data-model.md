# Mô hình Dữ liệu & Trạng thái (Data & State Model): RM-024 Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular

**Mã Tính năng**: `RM-024`  
**Ngày thực hiện**: 2026-10-23  
**Dự án**: `Acme.TooHungry`  
**Tài liệu liên quan**: [spec.md](spec.md) | [plan.md](plan.md) | [research.md](research.md)

---

## 1. Mở rộng DTO Máy chủ (Backend DTO Extension)

### 1.1 `GetOrdersInputDto`
Dùng cho việc phân trang và lọc dữ liệu đơn hàng chuẩn mực ở tầng Backend, thay thế việc nhận `PagedAndSortedResultRequestDto` chung:

```csharp
namespace Acme.TooHungry.Orders;

public class GetOrdersInputDto : PagedAndSortedResultRequestDto
{
    /// <summary>
    /// Từ khóa tìm kiếm: Mã đơn hàng (OrderNumber), Ghi chú (Note), hoặc Tên bàn (TableName)
    /// </summary>
    [StringLength(256)]
    public string? Filter { get; set; }

    /// <summary>
    /// Bộ lọc theo trạng thái đơn hàng (Pending, Processing, Completed, Cancelled)
    /// </summary>
    public OrderStatus? Status { get; set; }
}
```

---

## 2. Mô hình Trạng thái Thành phần Frontend (Frontend Component & State Models)

### 2.1 Mô hình Phân trang Dùng chung (`<app-pager>`)
Định nghĩa giao tiếp đầu vào và phát sự kiện cho component phân trang standalone:

```typescript
export interface PagerState {
  currentPage: number;        // 1-indexed (hoặc 0-indexed theo cấu hình adapter)
  pageSize: number;           // Số lượng dòng trên một trang (mặc định: 10)
  totalCount: number;         // Tổng số lượng bản ghi trả về từ máy chủ
  pageSizeOptions: number[];  // Tùy chọn số dòng: [10, 25, 50, 100]
}

export interface PageChangeEvent {
  page: number;               // Trang mới được chọn
  offset: number;             // Vị trí offset (page - 1) tương thích ABP ListService
}
```

### 2.2 Dịch vụ Quản lý Trạng thái Bàn (`TableStateService`)
Quản lý tập trung dữ liệu bàn ăn và tính toán phản ứng (Reactive Signals):

```typescript
export interface TableStateModel {
  tables: TableDto[];
  isLoading: boolean;
  selectedAreaId: string | null;
  selectedStatus: TableStatus | null;
  searchTerm: string;
}

export interface TableStatusSummary {
  totalCount: number;
  availableCount: number;
  occupiedCount: number;
  reservedCount: number;
  cleaningCount: number;
  inactiveCount: number;
}
```

**Các Signal do `TableStateService` cung cấp:**
- `allTables = signal<TableDto[]>([])`
- `selectedAreaId = signal<string | null>(null)`
- `selectedStatus = signal<TableStatus | null>(null)`
- `searchTerm = signal<string>('')`
- `filteredTables = computed<TableDto[]>(() => ...)`: Danh sách bàn đã qua lọc theo khu vực, trạng thái và từ khóa.
- `statusCounts = computed<TableStatusSummary>(() => ...)`: Thống kê số lượng bàn theo từng trạng thái.

### 2.3 Thẻ Bàn Dùng chung (`<app-table-card>`)
Thành phần hiển thị thông tin thẻ bàn:

```typescript
export interface TableCardActionPayload {
  table: TableDto;
  action: 'checkIn' | 'order' | 'pay' | 'clean' | 'details' | 'edit';
}
```

### 2.4 Hằng số Giờ Hoạt động (`RESTAURANT_BUSINESS_HOURS`)
Định nghĩa tập trung trong `shared/constants/business-hours.constant.ts`:

```typescript
export interface RestaurantBusinessHoursConfig {
  OPEN_HOUR: number;              // 9 (09:00)
  CLOSE_HOUR: number;             // 23 (23:00)
  MORNING_SHIFT_START: number;    // 9 (09:00)
  MORNING_SHIFT_END: number;      // 15 (15:00)
  EVENING_SHIFT_START: number;    // 15 (15:00)
  EVENING_SHIFT_END: number;      // 23 (23:00)
}

export const RESTAURANT_BUSINESS_HOURS: RestaurantBusinessHoursConfig = {
  OPEN_HOUR: 9,
  CLOSE_HOUR: 23,
  MORNING_SHIFT_START: 9,
  MORNING_SHIFT_END: 15,
  EVENING_SHIFT_START: 15,
  EVENING_SHIFT_END: 23,
};
```

---

## 3. Khóa Bản dịch Đa ngôn ngữ Bổ sung (Localization Matrix)

Bổ sung đầy đủ vào hai tệp `vi.json` và `en.json` nhằm thay thế triệt để các chuỗi tiếng Việt hardcoded phát hiện từ `CODE_REVIEW.md`:

| Khóa Ngôn ngữ (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Vị trí Sử dụng |
|---|---|---|---|
| `::Pagination:First` | Trang đầu | First | `<app-pager>` |
| `::Pagination:Previous` | Trang trước | Previous | `<app-pager>` |
| `::Pagination:Next` | Trang sau | Next | `<app-pager>` |
| `::Pagination:Last` | Trang cuối | Last | `<app-pager>` |
| `::Pagination:ShowingRecords` | Hiển thị {0} - {1} trên tổng số {2} bản ghi | Showing {0} - {1} of {2} records | `<app-pager>` |
| `::Pagination:RecordsPerPage` | Số dòng / trang | Records per page | `<app-pager>` |
| `::ShiftMorning` | Ca sáng (09:00 - 15:00) | Morning Shift (09:00 - 15:00) | `waiter-layout` |
| `::ShiftEvening` | Ca tối (15:00 - 23:00) | Evening Shift (15:00 - 23:00) | `waiter-layout` |
| `::ShiftOff` | Ngoài ca | Off Shift | `waiter-layout` |
| `::StockDeductionFefoSuccess` | Đã tự động tính tiêu hao và khấu trừ nguyên liệu theo FEFO. | Ingredients consumed and deducted via FEFO automatically. | `order.component` |
| `::StockDeductionTitle` | Tiêu hao kho | Inventory Consumption | `order.component` |
| `::OrderSaveErrorDefault` | Có lỗi xảy ra khi lưu đơn hàng! | An error occurred while saving the order! | `order.component` |
| `::BatchDiscardSuccess` | Hủy bỏ lô nguyên liệu thành công. | Batch discarded successfully. | `discard-batch-modal` |
| `::StockAdjustmentSuccess` | Điều chỉnh số lượng kiểm kê thành công. | Stock adjustment saved successfully. | `stock-adjustment-modal` |
| `::BatchCreatedSuccess` | Nhập lô nguyên liệu mới thành công. | New batch created successfully. | `create-batch-modal` |
