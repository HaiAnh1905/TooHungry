# Nghiên cứu Kiến trúc & Giải pháp Kỹ thuật (Research & Architecture Notes): RM-028

**Tài liệu tham chiếu**: [spec.md](./spec.md) | [contracts/signalr-contract.md](./contracts/signalr-contract.md)

---

## 1. Nghiên cứu Cơ chế Đồng bộ Hai chiều Waiter ↔ Cashier

### 1.1. Thách thức Đặt ra
- Khi có nhiều phục vụ (Waiters) và thu ngân (Cashiers) cùng thao tác đồng thời:
  1. Waiter check-in bàn -> Cashier phải biết ngay để không xếp trùng bàn.
  2. Waiter gọi món hoặc thêm món -> Cashier phải nhận được tín hiệu âm thanh và cập nhật số tiền tạm tính mà không làm gián đoạn màn hình đang thao tác.
  3. Waiter yêu cầu tính tiền (Request Bill) -> Cashier nhận cảnh báo khẩn cấp để in bill.
  4. Cashier thanh toán xong -> Waiter nhận thông báo dọn bàn ngay lập tức.
- Yêu cầu độ trễ dưới **200ms**, chịu lỗi mạng mất kết nối tạm thời, không gây giật lag UI (không re-render toàn bộ sơ đồ bàn).

### 1.2. Giải pháp Kỹ thuật
- **Sử dụng SignalR Hub (`TableHub` mở rộng)**:
  - Tái sử dụng kênh WebSocket an toàn `/signalr-hubs/table` đã được bảo vệ bằng access token factory (`TableSignalrService`).
  - Mở rộng thêm 3 sự kiện chuyên biệt: `OrderPlacedOrUpdated`, `BillRequested`, và `PaymentCompleted`.
  - Trên Frontend: Xây dựng service điều phối `CashierSyncService` quản lý State phản ứng thông qua Angular Signals (`tableSignalrState`).
  - Khi nhận sự kiện bàn hoặc đơn, chỉ cập nhật chính xác record bàn/đơn tương ứng trong Signals Store mà không kéo lại toàn bộ danh sách 50-100 bàn.
- **Cơ chế Chuông báo Âm thanh (Audio Chime on POS)**:
  - Tích hợp HTML5 Web Audio API / Audio Element phát âm thanh "Ding" nhẹ khi có món mới hoặc chuông cảnh báo hai hồi khi có yêu cầu tính tiền, hỗ trợ chế độ bật/tắt âm thanh (Mute/Unmute) trên Topbar của Cashier.

---

## 2. Nghiên cứu Giao diện Người dùng Bento Grid cho Màn hình Quầy Thu ngân

### 2.1. Yêu cầu Ergonomics tại Quầy POS
- Quầy thu ngân thường sử dụng màn hình cảm ứng điện dung (Touch POS 15" - 21" hoặc iPad/Tablet 10" - 12").
- Thao tác viên đứng hoặc ngồi, sử dụng ngón tay để chạm nhanh:
  - Target chạm tối thiểu: **44px × 44px**.
  - Font chữ số liệu lớn, rõ ràng (Plus Jakarta Sans, font-weight 600-700), không dùng monospace thô nhám.
  - Màu sắc nhận diện cam `#EA580C` kết hợp nền Warm French Beige `#F6F1E8` và các thẻ Card màu trắng `#FFFFFF` với viền mềm `#EDE4D6`.

---

## 3. Nghiên cứu Tính Bất biến & Chống Lỗi Giao dịch Kép (Idempotency)

- Kế thừa kết quả từ `RM-022` và `RM-026`:
  - Thao tác thanh toán tại `complete-and-pay` sử dụng cơ chế kiểm tra trạng thái đơn: nếu `Order.Status == COMPLETED`, lập tức trả về kết quả thành công mà không trừ kho lần thứ 2.
  - Sử dụng giao dịch cơ sở dữ liệu phân tán (UnitOfWork) với mức cô lập phù hợp, bảo đảm việc trừ kho FEFO và đóng đơn diễn ra nguyên tử (atomic).
  - Tín hiệu SignalR chỉ được phát sau khi transaction commit thành công (`OnCompleted`) để tránh thông báo ảo khi database rollback.
