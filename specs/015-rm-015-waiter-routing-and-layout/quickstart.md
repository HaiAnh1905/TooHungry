# Hướng dẫn Kiểm thử Nhanh (Quickstart Guide): RM-015 Điều hướng & Bố cục Waiter

**Tính năng**: `RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Sẵn sàng thực thi (Ready for Execution)

---

## 1. Kiểm thử Tự động & Biên dịch (Automated Verification)

### Kiểm tra Biên dịch Angular
Đảm bảo mã nguồn TypeScript, Template HTML và SCSS biên dịch không có lỗi cú pháp hoặc thiếu dependencies:
```bash
cd d:\DFT\Acme.TooHungry\angular
npm run build
```

---

## 2. Kịch bản Kiểm thử Thủ công End-to-End (E2E Manual Walkthrough)

### Kịch bản 1: Tự động Điều hướng theo Vai trò sau Đăng nhập (Role-based Redirection)
1. Khởi động ứng dụng Angular (`npm start`) và Backend (`dotnet run --project src/Acme.TooHungry.HttpApi.Host`).
2. Mở trình duyệt, truy cập trang đăng nhập `/account/login`.
3. Đăng nhập bằng tài khoản có vai trò `Waiter` (ví dụ: `waiter_staff` / mật khẩu hợp lệ).
4. **Kỳ vọng**:
   - Ngay sau khi đăng nhập thành công, hệ thống tự động điều hướng thẳng đến `/waiter/tables`.
   - Giao diện không dừng lại ở trang chủ hay các dashboard quản trị cồng kềnh.

---

### Kịch bản 2: Kiểm tra Bố cục 3 Vùng Chuyên biệt (Desktop Layout)
1. Đang ở màn hình `/waiter/tables` trên trình duyệt máy tính (màn hình rộng >= 992px).
2. **Kỳ vọng**:
   - **Topbar trên cùng (64px)**:
     - Logo thương hiệu "Acme.TooHungry" màu cam, đi kèm huy hiệu "Không gian Phục vụ".
     - Chấm xanh báo hiệu "Trực tuyến" (SignalR connection).
     - Huy hiệu Ca trực tự động theo giờ (ví dụ `[Ca Sáng]` nếu từ 09:00 - 15:00, hoặc `[Ca Tối]` nếu từ 15:00 - 23:00).
     - Avatar nhân viên, tên hiển thị và vai trò "Phục vụ bàn".
     - Nút `[Đăng xuất]` nhanh ở góc ngoài cùng bên phải.
     - **Không** hiển thị nút `[Quay lại Quản trị]` đối với tài khoản chỉ có vai trò Waiter.
   - **Sidebar bên trái (280px)**:
     - Hiển thị công cụ Tìm kiếm bàn ăn, bộ lọc Khu vực và bộ chọn 5 Trạng thái bàn.
   - **Main Content ở giữa**:
     - Hiển thị danh sách thẻ bàn ăn dạng lưới 4 cột (RM-008) với thanh cuộn độc lập.
   - **Thanh menu ABP thông thường**: Bị ẩn hoàn toàn (không thấy menu Master Data, Identity hay Cài đặt).

---

### Kịch bản 3: Kiểm tra Sidebar Ngữ cảnh Động khi Chuyển sang Gọi món
1. Tại màn hình `/waiter/tables`, tìm một bàn đang phục vụ (`OCCUPIED`).
2. Bấm nút `[Order]` trên thẻ bàn.
3. **Kỳ vọng**:
   - URL chuyển sang `/waiter/order/:tableId`.
   - Khung Topbar và bố cục Waiter Layout giữ nguyên vị trí, không bị chớp hay tải lại trang.
   - **Sidebar bên trái tự động biến đổi**: Không còn bộ lọc bàn nữa, mà lập tức hiển thị **Table Information Card** (thông tin bàn đang order) và danh sách **Danh mục món ăn (Menu Categories)** mở rộng sẵn.
   - Bấm nút `[← Quay lại danh sách bàn]` $\rightarrow$ URL về lại `/waiter/tables`, Sidebar lập tức khôi phục lại bộ lọc bàn ăn mượt mà.

---

### Kịch bản 4: Kiểm tra Trải nghiệm Tablet & Responsive Offcanvas Drawer (< 992px)
1. Nhấn `F12` mở Developer Tools trên trình duyệt Chrome/Edge, chọn chế độ giả lập thiết bị: **iPad / Tablet Portrait** (chiều rộng 768px - 820px).
2. Quan sát giao diện:
   - Sidebar cố định bên trái tự động ẩn đi, dành 100% diện tích màn hình cho lưới thẻ bàn.
   - Trên thanh Topbar xuất hiện nút `[Bộ lọc]` ở bên trái logo.
3. Chạm vào nút `[Bộ lọc]`:
   - Ngăn kéo **Offcanvas Drawer** trượt ra mượt mà từ mép trái che phủ tối đa 360px màn hình.
   - Có lớp nền mờ (Backdrop) phía sau.
   - Bên trong Drawer hiển thị đầy đủ các tùy chọn lọc.
4. Thử chạm vào lớp nền mờ bên ngoài hoặc nút đóng `[✕]` ở góc trên Drawer $\rightarrow$ Drawer tự động thu hồi mượt mà.

---

### Kịch bản 5: Lối tắt Quay lại Quản trị cho Manager / Administrator
1. Đăng xuất khỏi tài khoản Waiter.
2. Đăng nhập lại bằng tài khoản `admin` hoặc tài khoản có vai trò `Manager`.
3. Truy cập vào phân hệ `/waiter/tables`.
4. **Kỳ vọng**:
   - Thanh Topbar hiển thị thêm nút `[Quay lại Quản trị]` với icon `fa-arrow-left`.
   - Bấm vào nút `[Quay lại Quản trị]` $\rightarrow$ hệ thống chuyển hướng ngay lập tức về trang Dashboard quản trị chính (`/`).

---

### Kịch bản 6: Kiểm tra Bộ Gác cổng Bảo mật (`waiterAuthGuard`)
1. Mở cửa sổ trình duyệt Ẩn danh (Chưa đăng nhập).
2. Gõ trực tiếp URL: `http://localhost:4200/waiter/tables`.
3. **Kỳ vọng**: Hệ thống chặn truy cập, lập tức điều hướng về `/account/login?returnUrl=/waiter/tables`.
4. Đăng nhập bằng tài khoản không có quyền phục vụ (ví dụ chỉ có vai trò `InventoryStaff`).
5. Thử truy cập lại `http://localhost:4200/waiter/tables`.
6. **Kỳ vọng**: Hệ thống từ chối truy cập (403 Forbidden) và đưa về màn hình mặc định của vai trò kho (`/inventory`).
