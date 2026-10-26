# Hướng dẫn Kiểm thử Nhanh (Quickstart & Verification Guide): RM-019 Trang báo lỗi & Phục hồi điều hướng

**Nhánh**: `019-rm-019-error-pages-and-recovery` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

Tài liệu này hướng dẫn cách kiểm thử độc lập toàn diện 7 kịch bản vận hành của tính năng RM-019 trên giao diện Angular.

---

## Chuẩn bị Môi trường

1. Khởi động Backend API:
   ```powershell
   cd D:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
   dotnet run
   ```
2. Khởi động Angular UI:
   ```powershell
   cd D:\DFT\Acme.TooHungry\angular
   npm start
   ```
3. Mở trình duyệt tại `http://localhost:4200`.

---

## Kịch bản 1: Kiểm thử Lỗi 404 cho Nhân viên Phục vụ (Waiter)

1. Đăng nhập hệ thống bằng tài khoản có vai trò `Waiter` (ví dụ: `waiter1`).
2. Nhập một URL không tồn tại trên thanh địa chỉ: `http://localhost:4200/waiter/random-xyz`.
3. **Kết quả mong đợi**:
   - Hiển thị trang lỗi 404 toàn màn hình chuẩn Bento Card Cam & Trắng (`#EA580C`).
   - Minh họa Vector SVG đĩa ăn trống sắc nét.
   - Dòng chữ: *"Không tìm thấy trang yêu cầu"*.
   - Nút chính hiển thị: `[Quay về Danh sách bàn]`.
   - Thanh tiến trình đếm ngược 5 giây chạy mượt mà từ 100% về 0%: *"Hệ thống sẽ tự động đưa bạn về trang làm việc sau 5... 4... 3... 2... 1 giây..."*.
   - Sau 5 giây (không chạm chuột): Trình duyệt tự động chuyển về `http://localhost:4200/waiter/tables`.

---

## Kịch bản 2: Kiểm thử Lỗi 404 cho Quản lý / Admin (Có & Không có quyền Dashboard)

### Trường hợp 2A: Quản lý / Admin có quyền xem Dashboard (`TooHungry.Dashboard`)
1. Đăng nhập bằng tài khoản Quản trị viên (`admin`) hoặc Quản lý (`Manager`) có cấp quyền `TooHungry.Dashboard`.
2. Nhập một URL không tồn tại: `http://localhost:4200/non-existent-admin-page`.
3. **Kết quả mong đợi**:
   - Hiển thị trang lỗi 404 toàn màn hình.
   - Nút chính hiển thị: `[Quay về Dashboard]`.
   - Sau 5 giây: Tự động điều hướng về `http://localhost:4200/`.

### Trường hợp 2B: Quản lý / Admin KHÔNG có quyền xem Dashboard
1. Đăng nhập tài khoản Quản lý đã bị tắt quyền `TooHungry.Dashboard` (nhưng có quyền `TooHungry.Tables`).
2. Nhập một URL không tồn tại: `http://localhost:4200/non-existent-page`.
3. **Kết quả mong đợi**:
   - Hiển thị trang lỗi 404.
   - Nút chính hiển thị: `[Quay về Quản lý bàn]`.
   - Sau 5 giây: Tự động điều hướng về `http://localhost:4200/tables`, không điều hướng về `/` để tránh bị lặp lỗi 403.

---

## Kịch bản 3: Kiểm thử Lỗi 403 Forbidden (Từ chối Quyền)

1. Đăng nhập bằng tài khoản có vai trò `Waiter`.
2. Cố tình truy cập vào trang Quản lý Người dùng của Admin: `http://localhost:4200/identity/users`.
3. **Kết quả mong đợi**:
   - `smartPermissionGuard` phát hiện thiếu quyền và chuyển hướng mềm sang `/error/403`.
   - Giao diện hiển thị minh họa Ổ khóa bảo mật phân quyền.
   - Tiêu đề: *"Truy cập bị từ chối"*.
   - Mô tả giải thích người dùng không có quyền truy cập vào phân hệ này.
   - Nút chính hiển thị `[Quay về Danh sách bàn]` và tự động đưa về `/waiter/tables` sau 5 giây.

---

## Kịch bản 4: Kiểm thử Lỗi 500 / 505 Máy chủ & Sao chép Trace ID

1. Truy cập trực tiếp đường dẫn mô phỏng lỗi máy chủ: `http://localhost:4200/error/500`.
2. **Kết quả mong đợi**:
   - Hiển thị minh họa dây cáp bếp gián đoạn kết nối / nồi súp quá nhiệt.
   - Tiêu đề: *"Sự cố máy chủ hệ thống"*.
   - Hiển thị huy hiệu `Trace ID` (mã đối soát lỗi) kèm nút `[Sao chép mã lỗi]`.
   - Nhấn nút `[Sao chép mã lỗi]`: Xuất hiện tooltip "Đã sao chép!" trong 2 giây.
   - Hiển thị nút phụ `[Thử lại]` bên cạnh nút chính quay về trang chủ.

---

## Kịch bản 5: Kiểm thử Tính năng Tạm dừng & Tiếp tục Đếm ngược

1. Mở trang lỗi bất kỳ (ví dụ `http://localhost:4200/test-404`).
2. Khi đồng hồ đang đếm ngược ở giây thứ 4 hoặc 3:
   - **Thao tác 1 (Hover)**: Di chuột vào vùng thẻ thông báo lỗi -> Đồng hồ lập tức dừng lại, thanh tiến trình ngừng co.
   - Rê chuột ra ngoài (Unhover) -> Đồng hồ tiếp tục đếm ngược từ số giây đang dừng về 0.
   - **Thao tác 2 (Click nút Tạm dừng)**: Bấm nút `[Tạm dừng]` -> Đồng hồ dừng lại vĩnh viễn, nút chuyển thành `[Tiếp tục]`.
   - Bấm nút `[Tiếp tục]` -> Đồng hồ đếm tiếp từ số giây đó về 0.
   - **Thao tác 3 (Chuyển tab)**: Mở tab mới hoặc thu nhỏ trình duyệt -> Sự kiện `document.hidden` kích hoạt tạm dừng; khi quay lại tab thì tiếp tục đếm.

---

## Kịch bản 6: Kiểm thử Nút `[Quay lại trang trước]` An toàn

1. Đang ở trang Danh sách Món ăn (`/dishes`), người dùng click một đường link hỏng dẫn tới 404.
2. Tại trang 404, bấm nút `[Quay lại trang trước]`.
3. **Kết quả mong đợi**:
   - Trình duyệt quay trở lại ngay màn hình `/dishes` mà không chờ hết 5 giây.
   - Bộ đếm ngược bị hủy hoàn toàn, không có lỗi điều hướng ngầm.

---

## Kịch bản 7: Kiểm thử Đa ngôn ngữ (i18n)

1. Chuyển đổi ngôn ngữ hệ thống từ Tiếng Việt (`vi`) sang Tiếng Anh (`en`).
2. Mở lại trang lỗi 404, 403, 500.
3. **Kết quả mong đợi**:
   - 100% các tiêu đề, thông điệp, nhãn nút đổi sang Tiếng Anh chuẩn mực:
     - 404: *"Page Not Found"*
     - 403: *"Access Denied"*
     - 500: *"Internal Server Error"*
     - Thông báo đếm ngược: *"Automatically returning to your workspace in {0} seconds..."*
     - Nhãn nút: *"Return to My Home"*, *"Return to Table List"*, *"Return to Dashboard"*, *"Back to Previous Page"*, *"Retry"*.
