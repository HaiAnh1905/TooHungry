# Hợp đồng API (API Contracts): RM-010 POS / Đơn hàng

**Tính năng**: `RM-010 — POS / Đơn hàng (POS Ordering & Dining Session Management)`  
**Base Path**: `/api/app/order`  
**Authorization**: Yêu cầu Bearer Token (`[Authorize]`)

---

## 1. Danh sách Endpoints

### 1.1 Lấy Active Order theo Bàn ăn (`GetActiveOrderByTableIdAsync`)
- **HTTP Method**: `GET /api/app/order/active-by-table/{tableId}`
- **Quyền**: `TooHungryPermissions.Orders.Default`
- **Mô tả**: Tra cứu đơn hàng đang ở trạng thái `Pending` (chưa thanh toán) của một bàn ăn cụ thể để phục vụ luồng tiếp tục gọi món (`Continue Order`).
- **Response**:
  - `200 OK`: `OrderDto` (hoặc `null` nếu bàn chưa có đơn `Pending`).
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "orderNumber": "ORD-20261009140001",
    "orderDate": "2026-10-09T07:00:00Z",
    "status": 0,
    "totalAmount": 350000,
    "note": "Khách bàn 05",
    "tableId": "7ca85f64-5717-4562-b3fc-2c963f66afa6",
    "tableName": "Bàn 05",
    "items": [
      {
        "id": "1fa85f64-5717-4562-b3fc-2c963f66afa6",
        "orderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "dishId": "8fa85f64-5717-4562-b3fc-2c963f66afa6",
        "dishName": "Pizza Hải Sản",
        "dishPhotoUrl": "/images/dishes/pizza.jpg",
        "quantity": 2,
        "unitPrice": 150000,
        "totalPrice": 300000,
        "note": "Ít cay"
      },
      {
        "id": "2fa85f64-5717-4562-b3fc-2c963f66afa6",
        "orderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "dishId": "9fa85f64-5717-4562-b3fc-2c963f66afa6",
        "dishName": "Trà Đào Cam Sả",
        "dishPhotoUrl": "/images/dishes/tra-dao.jpg",
        "quantity": 1,
        "unitPrice": 50000,
        "totalPrice": 50000,
        "note": "Ít ngọt"
      }
    ]
  }
  ```

---

### 1.2 Kiểm tra Tồn kho Nguyên liệu theo Công thức (`ValidateStockAsync`)
- **HTTP Method**: `POST /api/app/order/validate-stock`
- **Quyền**: `TooHungryPermissions.Orders.Default`
- **Mô tả**: Kiểm tra đối chiếu số lượng tồn kho khả dụng hiện tại trong kho đối với các nguyên liệu cấu thành món ăn (Recipe RM-007 & Kho RM-011) khi Waiter tăng số lượng hoặc trước khi Submit đơn.
- **Request Body**:
  ```json
  {
    "items": [
      {
        "dishId": "8fa85f64-5717-4562-b3fc-2c963f66afa6",
        "quantity": 3,
        "unitPrice": 150000,
        "note": "Ít cay"
      }
    ]
  }
  ```
- **Response**:
  - `200 OK`: `StockValidationResultDto`
  ```json
  {
    "isValid": true,
    "shortages": []
  }
  ```
  - Nếu thiếu nguyên liệu:
  ```json
  {
    "isValid": false,
    "shortages": [
      {
        "dishId": "8fa85f64-5717-4562-b3fc-2c963f66afa6",
        "dishName": "Pizza Hải Sản",
        "ingredientName": "Phô mai Mozzarella",
        "requiredQuantity": 600,
        "availableQuantity": 400,
        "unitName": "g"
      }
    ]
  }
  ```

---

### 1.3 Xác nhận / Cập nhật Đơn hàng (`SubmitOrderAsync`)
- **HTTP Method**: `POST /api/app/order/submit-order`
- **Quyền**: `TooHungryPermissions.Orders.Create` hoặc `TooHungryPermissions.Orders.Edit`
- **Mô tả**: Tạo mới Active Order (nếu bàn chưa có) hoặc cập nhật danh sách món của Active Order hiện tại. Bắt buộc kiểm tra giỏ hàng có $\ge 1$ món, validate tồn kho nguyên liệu, đặt trạng thái `Status = OrderStatus.Pending`, cập nhật trạng thái bàn sang `OCCUPIED` (nếu chưa phải) và phát sự kiện Realtime SignalR.
- **Request Body**:
  ```json
  {
    "orderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "tableId": "7ca85f64-5717-4562-b3fc-2c963f66afa6",
    "note": "Ghi chú bàn 05",
    "items": [
      {
        "dishId": "8fa85f64-5717-4562-b3fc-2c963f66afa6",
        "quantity": 2,
        "unitPrice": 150000,
        "note": "Ít cay"
      },
      {
        "dishId": "9fa85f64-5717-4562-b3fc-2c963f66afa6",
        "quantity": 2,
        "unitPrice": 50000,
        "note": "Nhiều đá"
      }
    ]
  }
  ```
- **Response**:
  - `200 OK`: `OrderDto` (Đơn hàng sau khi được tạo/cập nhật thành công).
  - `400 Bad Request`: `RemoteServiceErrorInfo` khi giỏ hàng rỗng hoặc không đủ nguyên liệu tồn kho.

---

### 1.4 Hủy Đơn hàng (`CancelOrderAsync`)
- **HTTP Method**: `POST /api/app/order/{id}/cancel`
- **Quyền**: `TooHungryPermissions.Orders.Delete`
- **Mô tả**: Chuyển trạng thái đơn hàng sang `OrderStatus.Cancelled` kèm lý do hủy. Phát tín hiệu Realtime SignalR giải phóng cờ `hasActiveOrder = false`.
- **Request Body**:
  ```json
  {
    "reason": "Khách đổi ý rời quán"
  }
  ```
- **Response**:
  - `200 OK`: `void`

---

## 2. Hợp đồng Tín hiệu Thời gian thực (SignalR Contracts)

### `TableHub`
- **Server to Client Event**: `TableOrderUpdated`
- **Payload**:
  ```json
  {
    "tableId": "7ca85f64-5717-4562-b3fc-2c963f66afa6",
    "hasActiveOrder": true,
    "activeOrderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
  ```
