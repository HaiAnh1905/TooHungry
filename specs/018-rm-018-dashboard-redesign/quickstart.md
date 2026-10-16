# Hướng dẫn Kiểm thử Nhanh & Vận hành (Quickstart): RM-018 Làm mới trang Dashboard

**Tính năng**: `RM-018 — Làm mới trang Dashboard (Dashboard Redesign)`  
**Ngày thực hiện**: 2026-10-16  
**Tài liệu liên quan**: [spec.md](spec.md) | [plan.md](plan.md) | [contracts/dashboard-contracts.md](contracts/dashboard-contracts.md)

---

## 1. Chuẩn bị Môi trường Kiểm thử

1. **Khởi chạy Backend**:
   ```powershell
   cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
   dotnet run
   ```
2. **Khởi chạy Frontend Angular**:
   ```powershell
   cd d:\DFT\Acme.TooHungry\angular
   npm start
   ```
3. Mở trình duyệt tại địa chỉ: `http://localhost:4200`

---

## 2. Các Kịch bản Kiểm thử Vận hành Nhanh (Step-by-Step Test Scenarios)

### Kịch bản 1: Màn hình Trạm Vào Ca Nội Bộ (Khi Chưa Đăng Nhập)
- **Bước 1**: Đăng xuất khỏi hệ thống (nếu đang đăng nhập) và truy cập URL gốc `http://localhost:4200/`.
- **Quan sát & Kỳ vọng**:
  - Xuất hiện thẻ "Trạm Vận Hành Nội Bộ" ở giữa màn hình trên nền tối sang trọng.
  - Đồng hồ số thời gian thực hiển thị `HH:mm:ss` nhảy giây liên tục và thứ ngày tháng Tiếng Việt.
  - Badge trạng thái nhà hàng: hiển thị `[Đang mở cửa]` màu xanh lá (nếu trong khoảng 09:00 - 23:00) hoặc `[Đã đóng cửa]` màu đỏ (nếu ngoài giờ).
  - Nút `[ĐĂNG NHẬP VÀO HỆ THỐNG]` màu cam nổi bật, click vào chuyển hướng chính xác đến trang đăng nhập Auth của ABP.

---

### Kịch bản 2: Bảng Điều Khiển Bento Grid 4 Tầng (Tài khoản Quản lý)
- **Bước 1**: Đăng nhập bằng tài khoản Quản lý (`admin` hoặc `manager`).
- **Quan sát & Kỳ vọng**:
  - Giao diện tự động tải dữ liệu tổng hợp từ endpoint `GET /api/app/dashboard/summary`.
  - Header hiển thị "Bảng điều khiển trung tâm TooHungry", ngày giờ cập nhật và thanh công cụ chọn thời gian (`[Hôm nay]`, `[Hôm qua]`, `[7 ngày gần nhất]`, `[Tùy chỉnh]`).
  - **Tầng 1 (4 Thẻ KPI)**:
    - *Tổng Doanh thu*: Hiển thị số tiền VND định dạng dấu chấm (ví dụ: `48.500.000 VND`) kèm tỷ lệ tăng trưởng so với kỳ trước (`+14.8%`).
    - *Tổng Đơn hàng*: Hiển thị tổng số đơn, phân tách số đơn đã hoàn tất và đơn đang phục vụ.
    - *Tỷ lệ Lấp đầy Bàn*: Hiển thị phần trăm (ví dụ: `60.0% - 12/20 bàn`).
    - *Cảnh báo Tồn kho*: Hiển thị số lượng nguyên liệu thiếu hụt hoặc hết hàng.

---

### Kịch bản 3: Biểu Đồ Doanh Thu & Đơn Hàng Chart.js Dual-Axis
- **Bước 1**: Quan sát khối biểu đồ ở Tầng 2 của Bento Grid.
- **Quan sát & Kỳ vọng**:
  - Biểu đồ hiển thị kết hợp 2 trục tung: Trục trái là Cột Doanh thu (VND) màu cam `#EA580C`, Trục phải là Đường Đơn hàng màu xanh dương uốn cong mềm mại.
  - Rê chuột (hover) vào từng mốc thời gian: Tooltip hiển thị đầy đủ cả Doanh thu (định dạng tiền tệ) và Số lượng đơn hàng tại điểm đó.
  - Bấm nút `[Hôm nay]`: Biểu đồ chuyển đổi mượt mà sang hiển thị 14 khung giờ (09:00 - 23:00).
  - Bấm nút `[7 ngày gần nhất]`: Biểu đồ chuyển đổi sang hiển thị 7 ngày gần đây.

---

### Kịch bản 4: Sơ Đồ Bàn Thu Nhỏ & Đồng Bộ Thời Gian Thực (SignalR)
- **Bước 1**: Quan sát widget Sơ đồ Bàn ăn Thu nhỏ (Live Table Occupancy) ở Tầng 2.
- **Bước 2**: Mở thêm một tab trình duyệt thứ hai, đăng nhập vai trò Waiter tại `/waiter/tables`.
- **Bước 3**: Tại tab Waiter, bấm `[Đón khách]` vào một bàn trống (ví dụ Bàn 08).
- **Quan sát & Kỳ vọng tại tab Dashboard**:
  - Trong vòng dưới 1 giây, widget Sơ đồ Bàn tự động cập nhật: Số bàn Có khách tăng thêm 1, Số bàn Trống giảm 1, Tỷ lệ lấp đầy bàn tăng lên.
  - Thanh phân bổ tiến độ đa sắc tự động co giãn tỷ lệ tương ứng mà không cần tải lại trang.

---

### Kịch bản 5: Top Món Ăn Bán Chạy Nhất & Đơn Hàng Gần Đây
- **Bước 1**: Quan sát Tầng 3 của Bento Grid.
- **Quan sát & Kỳ vọng**:
  - Cột trái: Danh sách Top 5 món ăn bán chạy nhất xếp hạng từ #1 đến #5 (Hạng #1 có cúp vàng kim loại, ảnh món bo góc, tên món, số lượng bán và doanh thu).
  - Cột phải: 5 đơn hàng mới nhất phát sinh với mã đơn, tên bàn, giờ đặt, tổng tiền và badge trạng thái (`Pending` vàng, `Completed` xanh lá).
  - Bấm nút `[Xem thực đơn đầy đủ]` -> Điều hướng đến `/dishes`.
  - Bấm nút `[Xem tất cả đơn]` -> Điều hướng đến `/orders`.

---

### Kịch bản 6: Phân Quyền & Điều Hướng Tự Động (`dashboardGuard`)
- **Bước 1**: Đăng nhập với tài khoản có vai trò `Waiter` và thử truy cập URL `http://localhost:4200/`.
  - **Kỳ vọng**: `dashboardGuard` tự động chuyển hướng ngay lập tức về `/waiter/tables`.
- **Bước 2**: Đăng nhập với tài khoản có vai trò `InventoryStaff` và thử truy cập URL `http://localhost:4200/`.
  - **Kỳ vọng**: `dashboardGuard` tự động chuyển hướng ngay lập tức về `/inventory`.
- **Bước 3**: Đăng nhập với tài khoản `Manager` hoặc `admin` và truy cập URL `http://localhost:4200/`.
  - **Kỳ vọng**: Cho phép truy cập bình thường vào Bảng điều khiển trung tâm Bento Grid.
