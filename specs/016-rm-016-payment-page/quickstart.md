# Hướng dẫn Kiểm thử Nhanh & Vận hành (Quickstart): RM-016 Thanh toán đơn hàng

**Tính năng**: `RM-016 — Thanh toán đơn hàng (Payment Page)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Sẵn sàng kiểm thử (Ready for Testing)

---

## 1. Chuẩn bị Môi trường

1. Đăng nhập hệ thống với tài khoản vai trò `Waiter` hoặc `Cashier` (ví dụ `waiter` hoặc `admin`).
2. Mở trình duyệt truy cập ứng dụng Acme.TooHungry tại `http://localhost:4200`.

---

## 2. Kịch bản Kiểm thử 1: Thanh toán Tiền mặt & Tính Tiền thối

### Các bước thực hiện:
1. Tại sơ đồ bàn `/waiter/tables`, chọn một bàn đang có khách (`OCCUPIED`) có đơn hàng (ví dụ `Bàn 02`).
2. Bấm nút `[Kết thúc bữa ăn]` $\rightarrow$ Hộp thoại tóm tắt hiển thị $\rightarrow$ Bấm xác nhận chuyển sang trang Thanh toán.
3. Hệ thống điều hướng đến `/payment/{orderId}`:
   - Kiểm tra giao diện toàn màn hình, không có Topbar/Sidebar của Waiter.
   - Cột trái (60%) hiển thị chi tiết các món ăn, số lượng, đơn giá và tổng tiền.
4. Tại cột phải (40%), chọn tab **Tiền mặt**:
   - Bấm nút quick cash `[500.000 đ]`: Ô "Tiền khách đưa" cập nhật 500.000 đ, ô "Tiền thừa trả khách" tự động hiển thị số tiền thừa chính xác.
   - Nhập số tiền nhỏ hơn tổng hóa đơn: Quan sát xuất hiện dòng cảnh báo đỏ "Khách đưa còn thiếu..." và nút xác nhận bị vô hiệu hóa.
   - Bấm nút `[Vừa đủ]`: Tiền khách đưa khớp tổng hóa đơn, tiền thừa về 0 đ.
5. Bấm nút `[Đã xác nhận thanh toán]`:
   - Hộp thoại xác nhận hiển thị thông tin số tiền và mã đơn.
   - Bấm `[Đồng ý]`.
6. **Kết quả mong đợi**:
   - Toast thông báo thành công hiển thị.
   - Huy hiệu trạng thái chuyển sang `ĐÃ THANH TOÁN (COMPLETED)`.
   - Form nhập tiền bị khóa. Nút `[In hóa đơn]` và nút `[← Quay lại danh sách bàn]` sẵn sàng.

---

## 3. Kịch bản Kiểm thử 2: Thanh toán Quét mã VietQR Động

### Các bước thực hiện:
1. Mở một đơn hàng khác tại `/payment/{orderId}`.
2. Tại cột phải, chọn tab **Chuyển khoản QR**:
   - Hình ảnh mã VietQR Napas 247 tải lên sắc nét kèm thông tin tài khoản.
   - Khối thông tin ngân hàng hiển thị: Số tài khoản, Tên tài khoản, Số tiền, và Nội dung `TOOHUNGRY <OrderNumber>`.
3. Bấm thử các nút `[Sao chép]` tại Số tài khoản và Nội dung chuyển khoản:
   - Icon chuyển sang dấu check xanh lá kèm chữ "Đã sao chép".
   - Dữ liệu trong Clipboard khớp 100% với giá trị hiển thị.
4. Giả lập khách hàng đã chuyển tiền $\rightarrow$ Nhân viên bấm `[Đã xác nhận thanh toán]`.
5. **Kết quả mong đợi**:
   - Giao dịch được ghi nhận qua API `CompletePaymentAsync`.
   - Đơn hàng chuyển sang `COMPLETED`.

---

## 4. Kịch bản Kiểm thử 3: In Hóa đơn Nhiệt K80

### Các bước thực hiện:
1. Tại màn hình đơn hàng đã thanh toán (hoặc đang xem hóa đơn), bấm nút `[In hóa đơn]`.
2. Trình duyệt mở hộp thoại xem trước bản in (`window.print()`):
   - Cột phương thức thanh toán bị ẩn hoàn toàn.
   - Nút quay lại và nút in bị ẩn hoàn toàn.
   - Chỉ in phần Hóa đơn (Order Invoice) gọn gàng trong khổ giấy in nhiệt K80.
3. Đóng hộp thoại in $\rightarrow$ Giao diện trang web giữ nguyên trạng thái, không bị tải lại trang.

---

## 5. Kịch bản Kiểm thử 4: Kiểm tra Trạng thái Bàn CLEANING & Trừ Kho FEFO

### Các bước thực hiện:
1. Sau khi thanh toán hoàn tất ở Kịch bản 1, bấm nút `[← Quay lại danh sách bàn]`.
2. Hệ thống quay về `/waiter/tables`:
   - Thẻ `Bàn 02` đã tự động chuyển sang badge màu trắng `[Đang dọn dẹp]` (`TableStatus.Cleaning`).
   - Các nút hành động trên thẻ bàn chuyển sang nút `[Hoàn tất dọn dẹp]` (RM-008).
3. Đăng nhập tài khoản Quản lý kho truy cập `/inventory`:
   - Kiểm tra tồn kho của các nguyên liệu trong công thức món ăn đã được trừ tự động theo FEFO.
