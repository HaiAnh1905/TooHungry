# Hợp đồng API (API Contracts): Phân hệ Thu ngân (RM-028)

**Tài liệu tham chiếu**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

---

## 1. Endpoints Dành cho Quản lý Ca trực & Tổng quan Thu ngân (`CashierAppService`)

### 1.1. Lấy thông tin tổng quan ca trực (`GET /api/app/cashier/shift-summary`)
- **Quyền yêu cầu**: `TooHungry.Cashier`
- **Response**:
```json
{
  "cashierName": "Mai Thu Ngân",
  "shiftStartTime": "2026-10-26T07:00:00Z",
  "totalRevenue": 15450000,
  "activeTableCount": 8,
  "pendingOrderCount": 3,
  "billRequestedCount": 2
}
```

---

## 2. Endpoints Quản lý Sơ đồ Bàn của Thu ngân (`TableAppService` / `CashierAppService`)

### 2.1. Lấy danh sách bàn kèm trạng thái & tổng tiền tạm tính (`GET /api/app/cashier/tables`)
- **Quyền yêu cầu**: `TooHungry.Cashier.ManageTables`
- **Query Params**:
  - `diningAreaId` (optional Guid)
  - `status` (optional TableStatus)
  - `searchKeyword` (optional string)
- **Response**:
```json
{
  "items": [
    {
      "id": "b1a2c3d4-...",
      "tableNumber": "Bàn 04",
      "capacity": 4,
      "status": "OCCUPIED",
      "diningAreaId": "a1b2c3d4-...",
      "diningAreaName": "Tầng 1 - Sảnh chính",
      "occupiedDurationMinutes": 45,
      "activeOrderId": "o1o2o3o4-...",
      "activeOrderCode": "ORD-20261026-004",
      "temporaryTotalAmount": 850000,
      "isBillRequested": true,
      "assignedWaiterName": "Tuấn Phục Vụ"
    }
  ],
  "totalCount": 24
}
```

---

## 3. Endpoints Quản lý Đơn hàng & Thanh toán (`OrderAppService` / `CashierAppService`)

### 3.1. Lấy danh sách đơn hàng theo trạng thái phân loại (`GET /api/app/cashier/orders`)
- **Quyền yêu cầu**: `TooHungry.Cashier.ManageOrders`
- **Query Params**:
  - `statusGroup`: `Pending` | `Processing` | `BillRequested` | `Completed`
  - `skipCount`: number
  - `maxResultCount`: number
- **Response**: PagedResultDto<CashierOrderDto>

### 3.2. Yêu cầu thanh toán từ Waiter (`POST /api/app/table-orders/{orderId}/request-bill`)
- **Quyền yêu cầu**: `TooHungry.Orders` (hoặc `TooHungry.Tables`)
- **Hành động**: Đánh dấu đơn ở trạng thái `BillRequested`, phát sự kiện `BillRequestedDto` qua SignalR tới Cashier.

### 3.3. Hoàn tất thanh toán & Đóng đơn (`POST /api/app/table-orders/{orderId}/complete-and-pay`)
- **Quyền yêu cầu**: `TooHungry.Cashier.ProcessPayment`
- **Request Body**:
```json
{
  "paymentMethod": "VIETQR",
  "cashGivenAmount": 0,
  "discountAmount": 50000,
  "discountNote": "VIP Khách quen 5%",
  "printInvoice": true
}
```
- **Hành động Backend**:
  1. Validate tổng tiền và phương thức thanh toán.
  2. Thực hiện trừ kho nguyên liệu FEFO an toàn chống race condition (`RM-022`).
  3. Cập nhật `Order.Status = COMPLETED`, lưu `PaymentTransaction`.
  4. Cập nhật `Table.Status = CLEANING`.
  5. Sau khi commit transaction: Broadcast SignalR `PaymentCompletedDto` và `TableStatusChangedDto`.
- **Response**: `PaymentResultDto` kèm mã giao dịch và thông tin in hóa đơn.
