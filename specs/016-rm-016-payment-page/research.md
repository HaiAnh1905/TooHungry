# Báo cáo Nghiên cứu Kỹ thuật (Technical Research): RM-016 Thanh toán đơn hàng (Payment Page)

**Tính năng**: `RM-016 — Thanh toán đơn hàng (Payment Page)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Đã hoàn thành (Completed)

---

## 1. Nghiên cứu Giao dịch Nguyên tử Backend (`CompletePaymentAsync`)

### Vấn đề:
Trước đây, việc hoàn tất đơn hàng có thể thông qua API cập nhật chung `OrderAppService.UpdateAsync`. Tuy nhiên, thao tác thanh toán là một chặng nghiệp vụ có tính nhạy cảm tài chính cao, cần:
1. Ghi nhận phương thức thanh toán (`PaymentMethod: Cash | VietQr`), số tiền khách đưa (`CashGiven`), ghi chú thanh toán (`PaymentNote`).
2. Khóa không cho phép thanh toán nếu đơn hàng đã ở trạng thái `Completed` hoặc `Cancelled` (chống thanh toán đúp).
3. Đảm bảo tính nguyên tử (Atomic Transaction): Cập nhật `Order → Completed`, kích hoạt trừ kho FEFO theo `Recipe` (RM-011), và chuyển trạng thái `Table → Cleaning` (RM-008) kèm phát sóng SignalR trong cùng một đơn vị công việc (Unit of Work).

### Giải pháp Kiến trúc:
- Bổ sung enum `PaymentMethod` trong `Acme.TooHungry.Domain.Shared/Orders/PaymentMethod.cs`:
  ```csharp
  public enum PaymentMethod
  {
      Cash = 1,     // Tiền mặt
      VietQr = 2    // Chuyển khoản QR (VietQR Napas 247)
  }
  ```
- Định nghĩa DTO `CompletePaymentInputDto` trong `Acme.TooHungry.Application.Contracts/Orders/CompletePaymentInputDto.cs`:
  ```csharp
  public class CompletePaymentInputDto
  {
      public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
      public decimal CashGiven { get; set; }
      public string? PaymentNote { get; set; }
  }
  ```
- Triển khai endpoint chuyên biệt `CompletePaymentAsync(Guid id, CompletePaymentInputDto input)` trên `OrderAppService` và `OrderController` (`POST /api/app/order/{id}/complete-payment`):
  - Kiểm tra `order.Status`: Nếu không phải `Pending` / `Processing`, ném `BusinessException`.
  - Cập nhật `order.Status = OrderStatus.Completed`.
  - Gọi `await ProcessOrderInventoryConsumptionAsync(order)` để trừ tồn kho FEFO.
  - Cập nhật bàn ăn: `table.Status = TableStatus.Cleaning`, dọn dẹp các trường `Reserved*`, lưu DB và gọi `_realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name)`.
  - Trả về `OrderDto` hoàn tất.

---

## 2. Nghiên cứu Chuẩn VietQR Động & Cấu hình Tập trung

### Vấn đề:
Nhà hàng cần một phương thức thanh toán không tiền mặt tiện lợi, không phụ thuộc vào máy quẹt thẻ POS đắt đỏ hay thủ tục tích hợp cổng thanh toán phức tạp. Khách hàng sử dụng ứng dụng Mobile Banking của mọi ngân hàng Việt Nam đều có thể quét mã Napas 247 để trả đúng số tiền.

### Giải pháp Kiến trúc:
- Sử dụng chuẩn URL VietQR Quicklink (hỗ trợ Napas 247 / EMVCo):
  ```text
  https://api.vietqr.io/image/{bankId}-{accountNo}-{template}.jpg?amount={amount}&addInfo={memo}&accountName={accountName}
  ```
- **Cấu hình môi trường**: Không hardcode thông tin ngân hàng trong component. Đặt trong `angular/src/environments/environment.ts`:
  ```typescript
  export const environment = {
    // ...
    vietQrConfig: {
      bankId: '970422',              // Mã định danh MBBank
      bankName: 'MBBank (Quân Đội)',
      accountNo: '9999888866',
      accountName: 'NHA HANG TOOHUNGRY',
      template: 'compact2'
    }
  };
  ```
- **Cú pháp nội dung chuyển khoản chuẩn hóa**:
  `TOOHUNGRY <OrderNumber>` (ví dụ `TOOHUNGRY ORD-20261012-001`).
- **Nghiệp vụ xác nhận**: Áp dụng cơ chế **xác nhận thủ công** (Manual Confirmation). Nhân viên/thu ngân đối soát biến động số dư qua app ngân hàng nhà hàng và bấm nút `[Đã xác nhận thanh toán]`.
- Cung cấp nút sao chép 1 chạm cho Số tài khoản, Số tiền, Nội dung với hiệu ứng phản hồi tức thì qua Clipboard API.

---

## 3. Nghiên cứu Trải nghiệm Tiền mặt & Quick Cash Presets

### Vấn đề:
Nhân viên phục vụ tác nghiệp trong giờ cao điểm dễ tính nhầm tiền thối hoặc thao tác bàn phím số chậm chạp trên màn hình cảm ứng nhỏ.

### Giải pháp Kiến trúc:
- Cung cấp hàng nút mệnh giá nhanh (Quick Cash Presets):
  - `[Vừa đủ]`: Tự động điền số tiền khách đưa đúng bằng `TotalAmount`.
  - `[50k]`, `[100k]`, `[200k]`, `[500k]`, `[1.000k]`, `[2.000k]`: Một chạm gán ngay số tiền chẵn thường gặp.
- Tự động tính toán phản ứng tức thì (Angular Signals):
  ```typescript
  changeAmount = computed(() => {
    const total = this.effectiveTotalAmount();
    const given = this.cashGiven() || 0;
    return Math.max(0, given - total);
  });
  ```
- Ràng buộc an toàn: Nếu `cashGiven < effectiveTotalAmount`, hiển thị cảnh báo đỏ "Khách đưa còn thiếu {X} đ" và vô hiệu hóa nút xác nhận thanh toán.

---

## 4. Nghiên cứu Định dạng In Hóa đơn Nhiệt K80 (@media print)

### Vấn đề:
Khi nhân viên bấm `[In hóa đơn]`, lệnh `window.print()` mặc định sẽ in toàn bộ trang web bao gồm nút bấm, sidebar, header và cột phương thức thanh toán, làm lãng phí giấy in và vỡ bố cục máy in hóa đơn POS K80 (khổ 80mm).

### Giải pháp Kiến trúc:
- Áp dụng kỹ thuật CSS `@media print`:
  ```scss
  @media print {
    // Ẩn tất cả các phần tử điều hướng và thao tác
    .payment-header-bar,
    .payment-methods-card,
    .btn,
    .btn-back-tables,
    .btn-print-bill {
      display: none !important;
    }

    // Đưa cột hóa đơn về 100% chiều rộng giấy in K80
    .payment-grid {
      display: block !important;
    }

    .bill-card {
      width: 100% !important;
      max-width: 80mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      color: #000 !important;
    }
  }
  ```
- Bổ sung phần chân hóa đơn K80: Lời cảm ơn "Cảm ơn quý khách & Hẹn gặp lại!", hotline và địa chỉ nhà hàng.

---

## 5. Nghiên cứu Tách biệt Standalone Route & Trải nghiệm View Mode

### Vấn đề:
- RM-016 yêu cầu KHÔNG sử dụng Topbar và Sidebar của Waiter Layout.
- Sau khi thanh toán thành công, người dùng cần in hóa đơn hoặc chủ động quay về sơ đồ bàn mà không bị tự động chuyển trang gây bối rối.

### Giải pháp Kiến trúc:
1. **Standalone Route**:
   - Route chính: `/payment/:orderId` với `data: { layout: eLayoutType.empty }`.
   - Route alias: `/waiter/payment/:orderId` cấu hình chuyển tiếp về `/payment/:orderId`.
   - Có nút `[← Quay lại danh sách bàn]` điều hướng về `/waiter/tables`.
2. **View Mode sau thanh toán**:
   - Khi `order.status === OrderStatus.Completed`:
     - Huy hiệu chuyển sang `ĐÃ THANH TOÁN (COMPLETED)`.
     - Ẩn/Khóa form thu tiền.
     - Nút `[In hóa đơn]` và nút `[← Quay lại danh sách bàn]` được làm nổi bật với độ tương phản cao, hỗ trợ thao tác một chạm trên máy tính bảng.
