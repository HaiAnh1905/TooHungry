# Hợp đồng Kiến trúc & Giao diện API: RM-018 Làm mới trang Dashboard

**Tính năng**: `RM-018 — Làm mới trang Dashboard (Dashboard Redesign)`  
**Ngày thực hiện**: 2026-10-16  
**Đặc tả**: [spec.md](../spec.md) | **Kế hoạch**: [plan.md](../plan.md)

---

## 1. Hợp đồng REST API (Backend HTTP Endpoints)

### Endpoint: Lấy Toàn bộ Dữ liệu Thống kê Dashboard
- **Phương thức**: `GET`
- **Đường dẫn**: `/api/app/dashboard/summary`
- **Xác thực & Phân quyền**: Bắt buộc đăng nhập; kiểm tra chính sách `TooHungryPermissions.Dashboard.Default`.

#### Tham số Truy vấn (Query Parameters):
| Tên tham số | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả |
|---|---|:---:|---|---|
| `period` | `int` / `string` | Không | `Last7Days` (2) | `0` = Today, `1` = Yesterday, `2` = Last7Days, `3` = Custom |
| `startDate` | `DateTime?` (ISO 8601) | Không | `null` | Mốc bắt đầu (chỉ dùng khi `period == Custom`) |
| `endDate` | `DateTime?` (ISO 8601) | Không | `null` | Mốc kết thúc (chỉ dùng khi `period == Custom`) |

#### Ví dụ Yêu cầu (Request Examples):
```http
GET /api/app/dashboard/summary?period=Last7Days HTTP/1.1
Host: localhost:44388
Authorization: Bearer <access_token>
```
```http
GET /api/app/dashboard/summary?period=Custom&startDate=2026-10-01T00:00:00Z&endDate=2026-10-15T23:59:59Z HTTP/1.1
Host: localhost:44388
Authorization: Bearer <access_token>
```

#### Cấu trúc Phản hồi Thành công (Response 200 OK):
```json
{
  "currentPeriod": 2,
  "fromDate": "2026-10-10T00:00:00Z",
  "toDate": "2026-10-16T23:59:59Z",
  "kpi": {
    "totalRevenue": 48500000.0,
    "totalOrdersCount": 142,
    "completedOrdersCount": 138,
    "pendingOrdersCount": 4,
    "totalDishesCount": 35,
    "totalCategoriesCount": 6,
    "revenueGrowthPercentage": 14.8,
    "orderGrowthPercentage": 8.5
  },
  "tables": {
    "totalTables": 20,
    "occupiedTables": 12,
    "availableTables": 5,
    "reservedTables": 2,
    "cleaningTables": 1,
    "disabledTables": 0,
    "occupancyRate": 60.0
  },
  "revenueTrend": [
    {
      "timeLabel": "10/10",
      "timestamp": "2026-10-10T00:00:00Z",
      "revenue": 6200000.0,
      "orderCount": 18
    },
    {
      "timeLabel": "11/10",
      "timestamp": "2026-10-11T00:00:00Z",
      "revenue": 7100000.0,
      "orderCount": 21
    },
    {
      "timeLabel": "16/10",
      "timestamp": "2026-10-16T00:00:00Z",
      "revenue": 8450000.0,
      "orderCount": 25
    }
  ],
  "topSellingDishes": [
    {
      "dishId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "dishName": "Bò Bít Tết Sốt Tiêu Đen",
      "categoryName": "Món Chính",
      "imageUrl": "/assets/images/dishes/steak.jpg",
      "price": 280000.0,
      "totalQuantitySold": 54,
      "totalRevenue": 15120000.0
    },
    {
      "dishId": "4a738c82-8921-4122-a9b0-9f1234567890",
      "dishName": "Pizza Hải Sản Phô Mai",
      "categoryName": "Pizza",
      "imageUrl": "/assets/images/dishes/pizza.jpg",
      "price": 220000.0,
      "totalQuantitySold": 48,
      "totalRevenue": 10560000.0
    }
  ],
  "recentOrders": [
    {
      "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "orderNumber": "ORD-20261016-0025",
      "tableName": "Bàn 04",
      "orderDate": "2026-10-16T12:45:00Z",
      "totalAmount": 780000.0,
      "status": 2
    }
  ],
  "alerts": [
    {
      "ingredientId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "ingredientName": "Thịt Bò Mỹ",
      "alertType": "SHORTAGE",
      "message": "Nguyên liệu sắp hết hàng trong kho",
      "currentStock": 2.5,
      "unitName": "kg"
    }
  ]
}
```

---

## 2. Hợp đồng Dịch vụ Proxy Angular

### Giao diện Proxy Service (`angular/src/app/proxy/dashboard/dashboard.service.ts`)
```typescript
import { Injectable, inject } from '@angular/core';
import { RestService } from '@abp/ng.core';
import { Observable } from 'rxjs';
import { DashboardSummaryDto, GetDashboardInput } from './models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private restService = inject(RestService);
  private apiName = 'Default';

  getSummary(input: GetDashboardInput = {}): Observable<DashboardSummaryDto> {
    return this.restService.request<any, DashboardSummaryDto>(
      {
        method: 'GET',
        url: '/api/app/dashboard/summary',
        params: {
          period: input.period,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      },
      { apiName: this.apiName }
    );
  }
}
```

---

## 3. Sự kiện Đồng bộ Thời gian thực qua SignalR (Realtime Events)

Dashboard đăng ký lắng nghe các sự kiện phát sóng từ SignalR Hubs để đảm bảo dữ liệu hiển thị tức thì:

### 3.1. Sự kiện từ `TableHub` (`/signalr-hubs/table`)
- **Tên sự kiện**: `tableStatusChanged`
- **Payload nhận về**:
  ```typescript
  {
    tableId: string;
    newStatus: TableStatus; // Available=0, Occupied=1, Reserved=2, Disabled=3, Cleaning=4
    tableName?: string;
    diningAreaId?: string;
    occupiedTime?: string;
  }
  ```
- **Xử lý tại Client**: Tự động tính toán lại số lượng bàn trong `summary().tables`, cập nhật thanh tiến độ đa sắc và tính lại `occupancyRate`.

### 3.2. Sự kiện từ `OrderHub` hoặc `TableHub`
- **Tên sự kiện**: `orderCompleted` hoặc `tableOrderUpdated`
- **Payload nhận về**:
  ```typescript
  {
    orderId: string;
    tableId: string;
    totalAmount: number;
    status: OrderStatus; // Completed=2
  }
  ```
- **Xử lý tại Client**: Kích hoạt cơ chế debounce gọi lại `getSummary(currentPeriod)` sau 500ms để nạp lại đầy đủ các số liệu doanh thu và vẽ lại biểu đồ mà không gây gián đoạn UI.

---

## 4. Xử lý Lỗi & Trường hợp Ngoại lệ (Error Handling)

| Mã lỗi HTTP | Tình huống | Hành vi xử lý tại Client |
|---|---|---|
| `401 Unauthorized` | Phiên làm việc hết hạn | Chuyển hướng người dùng về màn hình đăng nhập Auth |
| `403 Forbidden` | Người dùng không có quyền `TooHungry.Dashboard` (như Waiter/InventoryStaff) | `dashboardGuard` tự động chuyển hướng sang màn hình chuyên môn (`/waiter/tables` hoặc `/inventory`) |
| `400 Bad Request` | `StartDate` lớn hơn `EndDate` trong bộ lọc tùy chỉnh | Hiển thị thông báo Toast cảnh báo: *"Ngày bắt đầu không được lớn hơn ngày kết thúc!"* |
| `500 Server Error` | Lỗi máy chủ hoặc Database ngắt kết nối | Hiển thị banner cảnh báo nhẹ, giữ nguyên dữ liệu đã nạp gần nhất và nút [Thử lại] |
