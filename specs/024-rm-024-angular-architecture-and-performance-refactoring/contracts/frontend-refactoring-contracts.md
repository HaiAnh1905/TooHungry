# Hợp đồng Giao diện & Thành phần (Component & Interface Contracts): RM-024 Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular

**Mã Tính năng**: `RM-024`  
**Ngày thực hiện**: 2026-10-23  
**Dự án**: `Acme.TooHungry`  
**Tài liệu liên quan**: [spec.md](spec.md) | [plan.md](plan.md) | [data-model.md](data-model.md)

---

## 1. Hợp đồng API Máy chủ (Backend API Contracts)

### 1.1 Endpoint Lấy Danh sách Đơn hàng Có Lọc & Phân trang
```http
GET /api/app/order?filter={filter}&status={status}&skipCount={skipCount}&maxResultCount={maxResultCount}&sorting={sorting}
```
- **Xác thực**: Bắt buộc Bearer Token (`[Authorize(TooHungryPermissions.Orders.Default)]`).
- **Tham số đầu vào (Query Parameters)**:
  - `filter` (string, optional): Từ khóa tìm kiếm theo mã đơn (`OrderNumber`), ghi chú (`Note`), hoặc tên bàn (`TableName`).
  - `status` (int, optional): Trạng thái đơn (`0: Pending`, `1: Processing`, `2: Completed`, `3: Cancelled`).
  - `skipCount` (int, default: 0): Số bản ghi bỏ qua.
  - `maxResultCount` (int, default: 10): Số bản ghi trên mỗi trang.
  - `sorting` (string, optional): Cột sắp xếp (mặc định: `OrderDate desc`).
- **Phản hồi Thành công (HTTP 200)**:
  ```json
  {
    "totalCount": 42,
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "orderNumber": "ORD-20261023091500",
        "orderDate": "2026-10-23T02:15:00Z",
        "status": 1,
        "totalAmount": 350000.0,
        "note": "Khách ít đường",
        "tableId": "7cb76dfb-1fc7-4a0b-96d5-a3d21fa62b08",
        "tableName": "Bàn 01",
        "items": [ ... ]
      }
    ]
  }
  ```

---

## 2. Hợp đồng Component Standalone (Frontend Component Contracts)

### 2.1 Component Phân trang Dùng chung `<app-pager>`
- **Selector**: `app-pager`
- **Tập tin**: `angular/src/app/shared/components/pager/pager.component.ts`
- **Đầu vào (Inputs)**:
  - `@Input() totalCount: number = 0`: Tổng số bản ghi do server trả về.
  - `@Input() pageSize: number = 10`: Kích thước trang hiện tại.
  - `@Input() page: number = 1`: Trang hiện tại (1-indexed).
  - `@Input() pageSizeOptions: number[] = [10, 25, 50, 100]`: Các tùy chọn số dòng hiển thị.
  - `@Input() showPageSizeSelector: boolean = true`: Ẩn/hiện dropdown chọn kích thước trang.
- **Đầu ra (Outputs)**:
  - `@Output() pageChange = new EventEmitter<number>()`: Phát sự kiện khi người dùng chuyển trang (trả về trang 1-indexed hoặc offset).
  - `@Output() pageSizeChange = new EventEmitter<number>()`: Phát sự kiện khi đổi kích thước trang.

```html
<!-- Cách sử dụng mẫu tại các màn hình quản lý -->
<app-pager
  [totalCount]="data.totalCount"
  [pageSize]="list.maxResultCount"
  [page]="(list.page + 1)"
  (pageChange)="onPageChange($event)"
  (pageSizeChange)="onPageSizeChange($event)"
></app-pager>
```

### 2.2 Component Thẻ Bàn Dùng chung `<app-table-card>`
- **Selector**: `app-table-card`
- **Tập tin**: `angular/src/app/shared/components/tables/table-card/table-card.component.ts`
- **Đầu vào (Inputs)**:
  - `@Input({ required: true }) table!: TableDto`: Dữ liệu bàn ăn.
  - `@Input() isWaiterMode: boolean = false`: Chế độ giao diện (Waiter rút gọn hay Admin đầy đủ).
  - `@Input() currentTimestamp: number = Date.now()`: Mốc thời gian để tính thời lượng khách ngồi ăn.
- **Đầu ra (Outputs)**:
  - `@Output() checkIn = new EventEmitter<TableDto>()`: Đón khách vào bàn trống.
  - `@Output() openOrder = new EventEmitter<TableDto>()`: Mở giỏ hàng/gọi món.
  - `@Output() openPayment = new EventEmitter<TableDto>()`: Kích hoạt thanh toán đơn bàn.
  - `@Output() markCleaning = new EventEmitter<TableDto>()`: Bắt đầu dọn dẹp bàn.
  - `@Output() finishCleaning = new EventEmitter<TableDto>()`: Hoàn tất dọn dẹp -> Available.
  - `@Output() viewDetails = new EventEmitter<TableDto>()`: Xem chi tiết bàn ăn / đơn hàng active.

---

## 3. Hợp đồng Dịch vụ Trạng thái (Service Contracts)

### 3.1 `TableStateService`
```typescript
@Injectable({ providedIn: 'root' })
export class TableStateService {
  // Signals trạng thái cốt lõi
  readonly allTables = signal<TableDto[]>([]);
  readonly selectedAreaId = signal<string | null>(null);
  readonly selectedStatus = signal<TableStatus | null>(null);
  readonly searchTerm = signal<string>('');
  readonly currentTime = signal<number>(Date.now());

  // Computed signals
  readonly filteredTables = computed<TableDto[]>(() => ...);
  readonly statusCounts = computed<TableStatusSummary>(() => ...);

  // Phương thức tương tác
  setTables(tables: TableDto[]): void;
  updateTable(updatedTable: TableDto): void;
  filterByArea(areaId: string | null): void;
  filterByStatus(status: TableStatus | null): void;
  search(keyword: string): void;
}
```

### 3.2 `ExtendedIngredientService`
Đóng gói các hàm tùy biến độc lập bên ngoài thư mục `proxy/`:
```typescript
@Injectable({ providedIn: 'root' })
export class ExtendedIngredientService {
  constructor(private readonly ingredientService: IngredientService) {}

  /**
   * Lấy danh sách nguyên liệu hỗ trợ cả truyền boolean includeInactive
   * mà không ghi đè trực tiếp vào proxy sinh tự động của ABP.
   */
  getList(inputOrIncludeInactive: GetIngredientsInput | boolean = {}, config?: Partial<Rest.Config>): Observable<PagedResultDto<IngredientDto>>;
}
```
