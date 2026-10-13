# Hợp đồng Kiến trúc & Giao diện API: RM-016 Thanh toán đơn hàng

**Tính năng**: `RM-016 — Thanh toán đơn hàng (Payment Page)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Hợp đồng REST API Backend

### 1.1 Lấy Thông tin Đơn hàng Cần Thanh toán
- **Phương thức**: `GET`
- **Đường dẫn**: `/api/app/order/{id}`
- **Bảo mật**: `[Authorize(TooHungryPermissions.Orders.Default)]`
- **Mã phản hồi**:
  - `200 OK`: Trả về `OrderDto` kèm thông tin bàn và danh sách món chi tiết (`Items`).
  - `404 Not Found`: Không tìm thấy đơn hàng.

### 1.2 Xác nhận Hoàn tất Thanh toán (`CompletePaymentAsync`)
- **Phương thức**: `POST`
- **Đường dẫn**: `/api/app/order/{id}/complete-payment`
- **Bảo mật**: `[Authorize(TooHungryPermissions.Orders.Default)]` (Cho phép `Waiter`, `Cashier`, `Manager`, `Administrator`)
- **Body Request**:
  ```json
  {
    "paymentMethod": 1,
    "cashGiven": 500000,
    "paymentNote": "Khách thanh toán tiền mặt tại quầy"
  }
  ```
- **Xử lý nghiệp vụ Backend**:
  1. Kiểm tra đơn hàng tồn tại và có trạng thái `OrderStatus.Pending` hoặc `OrderStatus.Processing`. Nếu không, ném `BusinessException("Đơn hàng này không ở trạng thái có thể thanh toán!")`.
  2. Gán `order.Status = OrderStatus.Completed`.
  3. Kích hoạt khấu trừ kho FEFO: `await ProcessOrderInventoryConsumptionAsync(order)`.
  4. Nếu `order.TableId.HasValue`:
     - Cập nhật bàn: `table.Status = TableStatus.Cleaning`.
     - Xóa các trường đặt chỗ cũ: `ReservedCustomerName = null`, `ReservedTime = null`...
     - Lưu cơ sở dữ liệu.
     - Phát SignalR: `await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name)`.
- **Mã phản hồi**:
  - `200 OK`: Trả về `OrderDto` với trạng thái `Completed`.
  - `400 Bad Request`: Lỗi nghiệp vụ (ví dụ: đơn hàng đã hoàn tất trước đó).
  - `404 Not Found`: Không tìm thấy đơn hàng.

---

## 2. Hợp đồng Angular Service Proxy

```typescript
// angular/src/app/proxy/orders/order.service.ts
@Injectable({ providedIn: 'root' })
export class OrderService {
  // ...
  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'GET',
      url: `/api/app/order/${id}`,
    }, { apiName: this.apiName, ...config });

  completePayment = (id: string, input: CompletePaymentInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'POST',
      url: `/api/app/order/${id}/complete-payment`,
      body: input,
    }, { apiName: this.apiName, ...config });
}
```

---

## 3. Hợp đồng Thông báo Thời gian thực (Realtime SignalR)

Khi thanh toán hoàn tất, máy chủ phát sóng tới nhóm `TableTracking`:

```csharp
await _realtimeNotifier.NotifyTableStatusChangedAsync(
    table.Id,
    TableStatus.Cleaning,
    table.Name
);
```

Phía client tại `/waiter/tables` nhận sự kiện:
- Cập nhật ngay lập tức thẻ bàn sang badge màu trắng/light `[Đang dọn dẹp]` (`TableStatus.Cleaning`).
- Nhân viên phục vụ thấy bàn dọn dẹp và vào dọn bàn (chuyển sang `AVAILABLE` theo RM-008).

---

## 4. Hợp đồng Định dạng In Hóa đơn Nhiệt K80 (@media print)

Quy chuẩn hiển thị máy in nhiệt 80mm:

```scss
@media print {
  @page {
    size: 80mm auto;
    margin: 4mm;
  }

  body {
    background: #fff !important;
    font-size: 12px !important;
  }

  // Ẩn các phần tử điều hướng và form thanh toán
  .payment-header-bar,
  .payment-methods-card,
  .btn,
  .btn-back-tables,
  .no-print {
    display: none !important;
  }

  // Khổ giấy 80mm tối ưu
  .bill-card {
    width: 100% !important;
    max-width: 80mm !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  // Tiêu đề & Bảng món
  .bill-title {
    font-size: 16px !important;
    font-weight: bold !important;
    text-align: center !important;
  }

  .bill-table th,
  .bill-table td {
    padding: 4px 2px !important;
  }

  .receipt-footer-print {
    display: block !important;
    text-align: center !important;
    margin-top: 12px !important;
    font-size: 11px !important;
    border-top: 1px dashed #000 !important;
    padding-top: 8px !important;
  }
}
```
