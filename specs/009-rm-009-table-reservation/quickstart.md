# Hướng dẫn Khởi động Nhanh & Kiểm thử Xác thực (Quickstart & Validation Guide): RM-009 Table Reservation Management

**Nhánh Tính năng**: `009-rm-009-table-reservation` | **Ngày**: 2026-10-09  
**Tài liệu liên quan**: [spec.md](spec.md) | [plan.md](plan.md) | [data-model.md](data-model.md) | [contracts/table-reservation-api.md](contracts/table-reservation-api.md)

---

## 1. Yêu cầu Tiên quyết (Prerequisites)

- Đảm bảo cơ sở dữ liệu đã được cập nhật Migration cho bảng `AppTableReservations`:
  ```bash
  cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.DbMigrator
  dotnet run
  ```
- Backend API Host đang chạy tại: `https://localhost:44300` (hoặc cổng HTTP dev đã cấu hình):
  ```bash
  cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
  dotnet run
  ```
- Angular Frontend đang chạy tại: `http://localhost:4200`:
  ```bash
  cd d:\DFT\Acme.TooHungry\angular
  npm start
  ```

---

## 2. Kịch bản Kiểm thử Nghiệp vụ End-to-End (E2E Validation Scenarios)

### Kịch bản 1: Tạo Đặt bàn từ Bàn trống (`AVAILABLE` $\rightarrow$ `RESERVED`)

1. Đăng nhập hệ thống với tài khoản Waiter hoặc Manager.
2. Điều hướng tới màn hình Sơ đồ bàn: `http://localhost:4200/waiter/tables`.
3. Tìm một thẻ bàn đang ở trạng thái `AVAILABLE` (Badge xanh lá `[Còn trống]`, ví dụ Bàn A-01, sức chứa 4 chỗ).
4. Nhấn nút **`[Đặt bàn]`** trên thẻ bàn.
5. **Kỳ vọng giao diện**:
   - Booking Modal mở lên với tiêu đề hiển thị rõ tên bàn `Bàn A-01 (4 chỗ)`.
   - Trường Số lượng khách mặc định được điền sẵn là `4`.
6. Nhập thông tin:
   - Tên khách hàng: `Nguyễn Văn An`
   - Số điện thoại: `0901234567`
   - Thời gian nhận bàn: Chọn ngày mai lúc `18:30` (trong khung 09:00 - 22:59).
   - Số lượng khách: `4`
   - Ghi chú: `Bàn gần cửa sổ, chuẩn bị ghế trẻ em`
7. Nhấn nút **`[Xác nhận đặt bàn]`**.
8. **Kỳ vọng kết quả**:
   - Modal đóng lại, hiển thị toast thông báo thành công.
   - Thẻ bàn A-01 chuyển sang màu vàng/cam với huy hiệu `[Đã đặt trước]`.
   - Vùng thông tin thẻ bàn hiển thị: Tên `Nguyễn Văn An` và SĐT `0901234567`.
   - Các nút thao tác của thẻ bàn đổi thành: `[Đón khách]`, `[Hủy đặt bàn]`, `[Vô hiệu hóa bàn]`.
   - Mọi client khác đang mở trang `/waiter/tables` đồng thời thấy Bàn A-01 chuyển sang `RESERVED` qua SignalR dưới 1 giây.

---

### Kịch bản 2: Kiểm tra Chặn Vi phạm Khung giờ & Sức chứa (Validation Enforcement)

1. Mở lại Modal đặt bàn trên một bàn trống khác (ví dụ Bàn A-02, sức chứa 2 chỗ).
2. **Test Case 2.1 (Giờ ngoài khung hoạt động)**:
   - Chọn giờ hẹn: `08:30` hoặc `23:05`.
   - **Kỳ vọng**: Hệ thống báo lỗi validation đỏ: *"Thời gian nhận bàn phải nằm trong khung giờ 09:00 - 22:59"*, nút Xác nhận bị vô hiệu hóa hoặc bị Backend từ chối.
3. **Test Case 2.2 (Quá 7 ngày tới)**:
   - Chọn ngày hẹn: Cách hôm nay 10 ngày.
   - **Kỳ vọng**: Datepicker không cho phép chọn ngày quá 7 ngày, hoặc báo lỗi *"Chỉ cho phép đặt bàn trước tối đa 7 ngày"*.
4. **Test Case 2.3 (Vượt quá sức chứa bàn)**:
   - Nhập số lượng khách: `3` (trong khi bàn chỉ chứa 2 người).
   - **Kỳ vọng**: Báo lỗi *"Số lượng khách không được vượt quá sức chứa của bàn (2 khách)"*.

---

### Kịch bản 3: Xem chi tiết & Chỉnh sửa Thông tin Đặt bàn (`RESERVED`)

1. Trên màn hình `/waiter/tables`, nhấp chuột vào thẻ bàn A-01 đang ở trạng thái `RESERVED`.
2. **Kỳ vọng giao diện**:
   - Booking Detail Modal mở ra, điền đầy đủ thông tin: `Nguyễn Văn An`, `0901234567`, `18:30`, `4 khách`, `Ghi chú`.
   - Bàn ăn là cố định, không có trường đổi sang bàn khác.
3. Chỉnh sửa giờ hẹn từ `18:30` thành `19:00`, sửa số khách thành `3` người.
4. Nhấn **`[Lưu thay đổi]`**.
5. **Kỳ vọng kết quả**: Toast thông báo cập nhật thành công, thẻ bàn hiển thị thông tin mới nhất.

---

### Kịch bản 4: Tiếp đón Khách đã Đặt bàn (Check-in: `RESERVED` $\rightarrow$ `OCCUPIED`)

1. Khi khách đến nhà hàng, nhân viên tìm đến thẻ bàn A-01.
2. Bấm nút **`[Đón khách]`**.
3. **Kỳ vọng kết quả**:
   - Bàn A-01 chuyển tức thì sang trạng thái `OCCUPIED` (Badge đỏ ấm `[Đang có khách]`).
   - Thông tin đặt bàn active trên bàn được xóa sạch.
   - Thẻ bàn chuyển sang nhóm nút thao tác của bàn đang phục vụ: nút `[Order]` và `[Kết thúc bữa ăn]`.
   - Đơn đặt bàn trong cơ sở dữ liệu được cập nhật trạng thái `Status = 2` (`Completed`).

---

### Kịch bản 5: Hủy Đặt bàn Thủ công (`RESERVED` $\rightarrow$ `AVAILABLE`)

1. Chọn một bàn đang `RESERVED` (ví dụ Bàn A-03).
2. Nhân viên bấm nút **`[Hủy đặt bàn]`**.
3. **Kỳ vọng giao diện**: Hiển thị hộp thoại xác nhận hủy đặt bàn kèm cảnh báo giải phóng bàn.
4. Bấm **`[Xác nhận hủy]`**.
5. **Kỳ vọng kết quả**:
   - Bàn A-03 chuyển về `AVAILABLE` (Badge xanh lá `[Còn trống]`).
   - Khôi phục nhóm nút ban đầu: `[Đón khách]`, `[Đặt bàn]`, `[Vô hiệu hóa bàn]`.
   - Đơn đặt bàn trong cơ sở dữ liệu được cập nhật trạng thái `Status = 3` (`Cancelled`) kèm thời gian hủy.

---

### Kịch bản 6: Kiểm tra Tự động Hủy Quá hạn 1 Giờ (Background Worker)

1. Tạo một đơn đặt bàn test thông qua unit test hoặc API với `ReservationTime` được gán lùi về quá khứ 65 phút trước (ví dụ: `DateTime.UtcNow.AddMinutes(-65)`), trạng thái bàn là `RESERVED`.
2. Chờ chu kỳ quét 5 phút của Background Worker (hoặc gọi trực tiếp phương thức thực thi của Worker trong Integration Test).
3. **Kỳ vọng kết quả**:
   - Background Worker phát hiện đơn đặt bàn quá hạn.
   - Cập nhật trạng thái đơn thành `Status = 4` (`AutoCancelled`).
   - Bàn ăn tự động giải phóng về `AVAILABLE`, các trường thông tin đặt bàn active được xóa về null.
   - Sự kiện SignalR phát đi giúp giao diện client tự động chuyển bàn về màu xanh mà không cần F5 tải lại trang.

---

## 3. Lệnh Chạy Kiểm thử Tự động (Automated Test Execution)

Chạy toàn bộ bộ kiểm thử tự động để xác thực:
```powershell
# Chạy Domain Tests
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.Domain.Tests\Acme.TooHungry.Domain.Tests.csproj

# Chạy Application Tests
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.Application.Tests\Acme.TooHungry.Application.Tests.csproj
```
