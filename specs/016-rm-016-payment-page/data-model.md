# Thiết kế Mô hình Dữ liệu, Trạng thái & Giao diện: RM-016 Thanh toán đơn hàng

**Tính năng**: `RM-016 — Thanh toán đơn hàng (Payment Page)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Các Kiểu Liệt kê (Enums)

### `PaymentMethod` (Backend & Frontend)
Định nghĩa phương thức thanh toán của đơn hàng:

```csharp
// Acme.TooHungry.Orders.PaymentMethod
namespace Acme.TooHungry.Orders;

public enum PaymentMethod
{
    Cash = 1,     // Tiền mặt
    VietQr = 2    // Chuyển khoản QR (VietQR Napas 247)
}
```

```typescript
// Frontend TypeScript Enum/Type
export enum PaymentMethod {
  Cash = 1,
  VietQr = 2
}

export type PaymentMethodTab = 'cash' | 'qr';
```

---

## 2. Các Mô hình Truyền Dữ liệu (Backend DTOs)

### `CompletePaymentInputDto`
Dữ liệu gửi lên khi xác nhận thanh toán:

```csharp
namespace Acme.TooHungry.Orders;

public class CompletePaymentInputDto
{
    /// <summary>
    /// Phương thức thanh toán (Tiền mặt hoặc Chuyển khoản QR)
    /// </summary>
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;

    /// <summary>
    /// Số tiền khách đưa (dùng cho thanh toán tiền mặt)
    /// </summary>
    public decimal CashGiven { get; set; }

    /// <summary>
    /// Ghi chú thanh toán (tùy chọn)
    /// </summary>
    public string? PaymentNote { get; set; }
}
```

---

## 3. Các Mô hình Trạng thái Giao diện (UI State Models)

### `VietQrConfig`
Cấu hình thông tin tài khoản ngân hàng thụ hưởng cho VietQR:

```typescript
export interface VietQrConfig {
  bankId: string;       // Mã định danh ngân hàng (ví dụ: '970422')
  bankName: string;     // Tên viết tắt ngân hàng (ví dụ: 'MBBank')
  accountNo: string;    // Số tài khoản thụ hưởng
  accountName: string;  // Tên chủ tài khoản (in hoa không dấu)
  template: string;     // Mẫu hiển thị VietQR (ví dụ: 'compact2')
}
```

### `QuickCashOption`
Mệnh giá tiền gợi ý nhanh trong tab tiền mặt:

```typescript
export interface QuickCashOption {
  label: string;
  amount: number;
}
```

### `PaymentComponentState`
Trạng thái tổng thể của màn hình thanh toán:

```typescript
export interface PaymentComponentState {
  orderId: string | null;
  isLoading: boolean;
  isProcessingPayment: boolean;
  order: OrderDto | null;
  paymentMethod: PaymentMethodTab;
  cashGiven: number | null;
  isQrLoaded: boolean;
  copiedField: string | null;
}
```

---

## 4. Bộ Từ điển Đa ngôn ngữ (Localization Dictionary)

Các khóa i18n cần cập nhật và lưu đầy đủ vào cả hai tệp `vi.json` và `en.json`:

### Tiếng Việt (`vi.json`):
```json
{
  "::PaymentPageTitle": "Thanh toán đơn hàng",
  "::BackToTables": "Quay lại danh sách bàn",
  "::OrderInvoice": "Hóa đơn đơn hàng",
  "::PaymentMethod": "Phương thức thanh toán",
  "::CashPayment": "Tiền mặt",
  "::VietQrPayment": "Chuyển khoản QR",
  "::CashGiven": "Tiền khách đưa",
  "::ChangeAmount": "Tiền thừa trả khách",
  "::ExactAmount": "Vừa đủ",
  "::CashShortage": "Số tiền khách đưa không đủ",
  "::ShortageAmount": "Khách đưa còn thiếu {0} đ",
  "::BeneficiaryBank": "Ngân hàng thụ hưởng",
  "::AccountNumber": "Số tài khoản",
  "::AccountName": "Chủ tài khoản",
  "::TransferAmount": "Số tiền",
  "::TransferMemo": "Nội dung chuyển khoản",
  "::Copy": "Sao chép",
  "::Copied": "Đã sao chép",
  "::ConfirmPayment": "Xác nhận thanh toán",
  "::PaymentCompleted": "ĐÃ THANH TOÁN (COMPLETED)",
  "::PaymentPending": "CHỜ THANH TOÁN",
  "::PrintReceipt": "In hóa đơn",
  "::PaymentSuccessMsg": "Thanh toán thành công! Đơn hàng đã hoàn tất, bàn đã chuyển sang dọn dẹp và kho đã được khấu trừ theo FEFO.",
  "::PaymentConfirmPrompt": "Xác nhận thanh toán cho đơn {0} với số tiền {1} đ?",
  "::ScanQrInstruction": "Mở ứng dụng ngân hàng bất kỳ để quét mã thanh toán",
  "::ReceiptThanks": "Cảm ơn quý khách & Hẹn gặp lại!"
}
```

### Tiếng Anh (`en.json`):
```json
{
  "::PaymentPageTitle": "Order Payment",
  "::BackToTables": "Back to Table List",
  "::OrderInvoice": "Order Invoice",
  "::PaymentMethod": "Payment Method",
  "::CashPayment": "Cash",
  "::VietQrPayment": "VietQR Payment",
  "::CashGiven": "Cash Received",
  "::ChangeAmount": "Change",
  "::ExactAmount": "Exact",
  "::CashShortage": "Insufficient cash provided",
  "::ShortageAmount": "Short of {0} VND",
  "::BeneficiaryBank": "Beneficiary Bank",
  "::AccountNumber": "Account Number",
  "::AccountName": "Account Name",
  "::TransferAmount": "Amount",
  "::TransferMemo": "Transfer Memo",
  "::Copy": "Copy",
  "::Copied": "Copied",
  "::ConfirmPayment": "Confirm Payment",
  "::PaymentCompleted": "PAID (COMPLETED)",
  "::PaymentPending": "PENDING PAYMENT",
  "::PrintReceipt": "Print Receipt",
  "::PaymentSuccessMsg": "Payment completed successfully! Order closed, table moved to cleaning, and inventory deducted via FEFO.",
  "::PaymentConfirmPrompt": "Confirm payment for order {0} with amount of {1} VND?",
  "::ScanQrInstruction": "Open any banking app to scan the QR code",
  "::ReceiptThanks": "Thank you for dining with us!"
}
```
