# Hướng dẫn Kiểm thử Nhanh (Quickstart & Verification Guide): RM-028

**Tính năng**: `RM-028 — Phân hệ Thu ngân & Đồng bộ Thời gian thực (Cashier Portal: Table & Order Management with Real-time Sync)`  
**Tài liệu tham chiếu**: [spec.md](spec.md) | [plan.md](plan.md) | [checklists/requirements.md](checklists/requirements.md)

---

## 1. Chuẩn bị Môi trường Kiểm thử (Environment Setup)

1. **Khởi chạy Backend .NET**:
   ```bash
   cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
   dotnet run
   ```
2. **Khởi chạy Frontend Angular**:
   ```bash
   cd d:\DFT\Acme.TooHungry\angular
   npm start
   ```
3. **Mở 2 Cửa sổ Trình duyệt Độc lập (hoặc 1 Cửa sổ Ẩn danh + 1 Cửa sổ Thường)**:
   - Cửa sổ A: Đăng nhập tài khoản Thu ngân (`Cashier`) -> Truy cập `/cashier/tables`.
   - Cửa sổ B: Đăng nhập tài khoản Phục vụ bàn (`Waiter`) -> Truy cập `/waiter/tables`.

---

## 2. Các Kịch bản Kiểm thử Nghiệm thu Nhanh (End-to-End Scenarios)

### Kịch bản 1: Kiểm tra Tự động Điều hướng theo Vai trò & Layout Thu ngân
1. Đăng nhập bằng tài khoản có vai trò `Cashier`.
2. Kiểm tra hệ thống tự động đưa vào đường dẫn `/cashier/tables`.
3. Kiểm tra thanh Topbar hiển thị:
   - Tên thu ngân & nhãn ca trực.
   - 4 Thẻ chỉ số thời gian thực: Doanh thu ca, Số bàn phục vụ, Đơn chờ xử lý, Đơn yêu cầu thanh toán.
4. Kiểm tra Sidebar có nút chuyển đổi giữa `[Sơ đồ Bàn]` và `[Danh sách Đơn hàng]`.

### Kịch bản 2: Kiểm thử Đồng bộ Nhận bàn (Waiter Check-in ➔ Cashier)
1. Trên Cửa sổ B (Waiter): Chọn một bàn đang trống (VD: Bàn 03), bấm `[Đón khách]` cho 4 người.
2. Quan sát Cửa sổ A (Cashier):
   - Bàn 03 lập tức chuyển màu cam đậm (`OCCUPIED`) trong vòng dưới 200ms mà **không cần reload trang**.
   - Xuất hiện thông báo Toast nổi: *"Bàn 03 vừa có khách do [Tên Waiter] phục vụ"*.
   - Số bàn đang phục vụ trên Topbar của Cashier tự động tăng lên 1.

### Kịch bản 3: Kiểm thử Đồng bộ Gọi món Mới (Waiter Order ➔ Cashier)
1. Trên Cửa sổ B (Waiter): Mở Bàn 03, chọn 2 món và bấm `[Gửi gọi món]`.
2. Quan sát Cửa sổ A (Cashier):
   - Màn hình Cashier phát âm thanh chuông báo (Chime).
   - Xuất hiện pop-up thông báo: *"Bàn 03 vừa gọi thêm 2 món mới"*.
   - Chuyển sang `/cashier/orders`: Đơn của Bàn 03 xuất hiện ngay trong tab `[Đơn mới nhận]`.
   - Thẻ Bàn 03 trên sơ đồ bàn hiển thị tổng tiền tạm tính tương ứng.

### Kịch bản 4: Kiểm thử Yêu cầu Thanh toán (Waiter Request Bill ➔ Cashier)
1. Trên Cửa sổ B (Waiter): Tại màn hình phục vụ Bàn 03, bấm nút `[Yêu cầu thanh toán]`.
2. Quan sát Cửa sổ A (Cashier):
   - Thẻ Bàn 03 nhấp nháy viền cam đỏ cảnh báo ưu tiên cao.
   - Đơn chuyển sang mục `[Yêu cầu thanh toán]` trên danh sách đơn của Cashier.
   - Cashier bấm `[In Pre-bill]`: Xuất bản in tạm tính rõ ràng danh sách món và tổng tiền.

### Kịch bản 5: Kiểm thử Thanh toán Hoàn tất & Dọn bàn (Cashier Checkout ➔ Waiter Cleaning)
1. Trên Cửa sổ A (Cashier): Bấm `[Thanh toán]` cho Bàn 03, chọn phương thức `Tiền mặt` hoặc `VietQR` và bấm `[Xác nhận thanh toán]`.
2. Quan sát Cửa sổ B (Waiter):
   - Xuất hiện thông báo Toast: *"Bàn 03 đã thanh toán thành công [Số tiền] đ. Vui lòng tiến hành dọn bàn"*.
   - Bàn 03 trên sơ đồ Waiter tự động đổi màu sang tím/xanh dương (`CLEANING`).
3. Trên Cửa sổ B (Waiter): Bấm `[Đã dọn xong]`.
4. Quan sát: Bàn 03 trên cả hai cửa sổ đồng thời chuyển về màu trắng (`AVAILABLE`), sẵn sàng đón lượt khách mới.

### Kịch bản 6: Kiểm thử Nút Tải lại tại chỗ (In-place Reload - Không F5 trang web)
1. Trên màn hình Waiter (`/waiter/tables`) hoặc Cashier (`/cashier/tables`):
   - Chọn bộ lọc theo Khu vực (VD: `Tầng 1`).
   - Nhập từ khóa tìm kiếm (VD: `Bàn 04`).
2. Bấm nút `[Tải lại]` (`[fa-rotate]`) trên thanh công cụ:
   - Icon xoay tròn mượt mà biểu thị trạng thái đang gọi API.
   - Toàn bộ trang web **KHÔNG bị nháy trắng hay tải lại trình duyệt (không F5)**.
   - Bộ lọc `Tầng 1` và từ khóa `Bàn 04` được giữ nguyên vẹn.
   - Dữ liệu và trạng thái bàn được đồng bộ mới nhất từ server.
3. Thử nghiệm tương tự trên màn hình Quản lý đơn hàng (`/cashier/orders`):
   - Bấm nút `[Tải lại]` và xác nhận danh sách đơn hàng được làm mới tức thì tại chỗ mà không tải lại toàn trang.
