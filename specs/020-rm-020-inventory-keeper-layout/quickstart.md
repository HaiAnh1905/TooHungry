# Hướng dẫn Kiểm thử Nhanh (Quickstart & Verification Guide): RM-020 Phân hệ & Bố cục Thủ kho

**Tính năng**: `RM-020 — Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)`  
**Nhánh**: `020-rm-020-inventory-keeper-layout` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

Tài liệu này hướng dẫn cách kiểm thử độc lập toàn diện 6 kịch bản vận hành của phân hệ Thủ kho trên giao diện Angular.

---

## 1. Môi trường & Điều kiện Tiên quyết (Prerequisites)

1. **Khởi chạy ứng dụng**:
   - Backend ABP API: Chạy tại `https://localhost:44305` (hoặc cấu hình tương đương).
   - Frontend Angular: `npm start` tại thư mục `angular/`, truy cập tại `http://localhost:4200`.
2. **Tài khoản kiểm thử**:
   - Tài khoản Thủ kho: Username `inventorystaff`, Mật khẩu mặc định (hoặc tài khoản gán vai trò `InventoryStaff`).
   - Tài khoản Nhân viên phục vụ: Username `waiter`, Mật khẩu mặc định (vai trò `Waiter`).
   - Tài khoản Quản lý: Username `admin` hoặc `manager` (vai trò `Administrator` / `Manager`).

---

## 2. Kịch bản 1: Tự động Điều hướng theo Vai trò sau Đăng nhập

### Mục tiêu:
Xác thực tài khoản có vai trò `InventoryStaff` được tự động chuyển hướng thẳng vào `/inventory-keeper/dashboard` sau khi đăng nhập.

### Các bước thực hiện:
1. Mở trình duyệt, truy cập `http://localhost:4200/account/login`.
2. Nhập tài khoản `inventorystaff` và mật khẩu, nhấn **Đăng nhập**.
3. **Kết quả mong đợi**:
   - Trình duyệt tự động chuyển hướng đến URL `http://localhost:4200/inventory-keeper/dashboard`.
   - Giao diện hiển thị đúng bố cục 3 vùng của phân hệ Thủ kho, không xuất hiện thanh menu ABP admin thông thường.
4. Gõ thử URL gốc `http://localhost:4200/` trên thanh địa chỉ và nhấn Enter.
5. **Kết quả mong đợi**: Hệ thống tự động chuyển hướng ngược về `http://localhost:4200/inventory-keeper/dashboard`.

---

## 3. Kịch bản 2: Bảo vệ Tuyến đường & Phân quyền Truy cập (`inventoryKeeperAuthGuard`)

### Mục tiêu:
Xác minh chỉ những người dùng có thẩm quyền mới được truy cập vào cụm tuyến đường `/inventory-keeper/*`.

### Các bước thực hiện:
1. **Kiểm thử Chưa đăng nhập**:
   - Mở cửa sổ ẩn danh (Incognito Window), gõ trực tiếp `http://localhost:4200/inventory-keeper`.
   - **Kết quả mong đợi**: Bị chặn lại và chuyển hướng về `http://localhost:4200/account/login?returnUrl=%2Finventory-keeper`.
2. **Kiểm thử Tài khoản không có quyền kho (Waiter)**:
   - Đăng nhập bằng tài khoản `waiter`.
   - Gõ URL `http://localhost:4200/inventory-keeper` trên thanh địa chỉ.
   - **Kết quả mong đợi**: Hệ thống chặn truy cập, hiển thị màn hình báo lỗi 403 Bento Card RM-019. Đồng hồ đếm ngược 5 giây tự động đưa tài khoản `waiter` về `/waiter/tables`.
3. **Kiểm thử Tài khoản Quản lý (Manager / Admin)**:
   - Đăng nhập bằng tài khoản `admin`.
   - Truy cập `http://localhost:4200/inventory-keeper`.
   - **Kết quả mong đợi**: Truy cập thành công. Thanh Topbar hiển thị thêm nút lối tắt `[Quay lại Quản trị]` ở góc phải.

---

## 4. Kịch bản 3: Bố cục 3 Vùng, Ca trực Kho & 3 Thẻ Cảnh báo KPI

### Mục tiêu:
Xác thực tính hiển thị của Topbar tinh gọn, ca trực tự động theo giờ thực tế và các thẻ badge KPI cảnh báo kho.

### Các bước thực hiện:
1. Đăng nhập bằng `inventorystaff`, truy cập `/inventory-keeper/dashboard`.
2. Quan sát thanh **Topbar**:
   - Tên nhà hàng "Acme.TooHungry" màu cam `#EA580C`.
   - Tên thủ kho đăng nhập kèm badge ca trực kho:
     + Nếu giờ thực tế từ 08:00 đến 15:00: Badge xanh lá `[Ca Sáng]`.
     + Nếu giờ thực tế từ 15:00 đến 22:00: Badge xanh dương `[Ca Chiều/Tối]`.
     + Khung giờ còn lại: Badge xám `[Ngoài Ca Trực]`.
   - 3 Badge KPI:
     + Lô cận date: Badge cam hiển thị số lượng lô cận hạn trong 7 ngày.
     + Thiếu tồn an toàn: Badge đỏ hiển thị số lượng nguyên liệu thiếu tồn.
     + Lô quá hạn cần hủy: Badge đen/tím hiển thị số lượng lô đã hết hạn.
   - Nút `[Làm mới]` kèm icon xoay tròn.
3. Bấm vào nút `[Làm mới]`:
   - Quan sát icon xoay nhẹ trong khi gọi API `GetAlertsAsync()`. Số liệu được cập nhật tức thì.
4. Bấm vào badge `[Lô cận date]`:
   - Bảng dữ liệu tự động chuyển sang tab Batches và kích hoạt bộ lọc trạng thái "Cận date".

---

## 5. Kịch bản 4: Quét Barcode / QR Kép: Mô phỏng Máy quét HID & Camera Scanner

### Mục tiêu:
Xác thực cơ chế quét mã vạch bằng máy quét phần cứng HID và quét bằng Camera thiết bị di động.

### Các bước thực hiện:
1. Tại màn hình `/inventory-keeper/batches`, chuẩn bị một mã lô hàng có thật trong cơ sở dữ liệu (ví dụ: `BATCH-20261019-001`).
2. **Mô phỏng máy quét phần cứng HID (Global Keystroke)**:
   - Click chuột ra khoảng trống ngoài bảng (không focus vào bất kỳ ô input nào).
   - Chạy script JavaScript nhỏ trong Developer Console mô phỏng máy quét gõ chuỗi ký tự nhanh kèm phím Enter:
     ```javascript
     const code = "BATCH-20261019-001";
     for (const char of code) {
       window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
     }
     window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
     ```
   - **Kết quả mong đợi**: Ô tìm kiếm trên Sidebar tự động nhận chuỗi `BATCH-20261019-001`, bảng dữ liệu lọc ra đúng lô hàng và tự động cuộn (smooth scroll) tới dòng đó.
3. **Kiểm thử Quét Camera HTML5**:
   - Bấm nút `[Quét mã]` trên thanh công cụ Sidebar.
   - Hộp thoại Camera Scanner mở ra với khung ngắm laser cam `#EA580C`.
   - Đưa mã QR hoặc Barcode trước camera (hoặc nhập thủ công mã trong modal).
   - Modal tự động đóng, bảng dữ liệu lọc chính xác lô hàng.

---

## 6. Kịch bản 5: Tác vụ Nhanh 1 Chạm tại Quầy kho (Quick Actions)

### Mục tiêu:
Xác thực khả năng mở nhanh các modal nghiệp vụ kho từ màn hình chuyên biệt của Thủ kho.

### Các bước thực hiện:
1. **Nhập kho nhanh (Quick Inbound)**:
   - Bấm nút `[+ Nhập lô mới]` trên tiêu đề bảng.
   - Modal `CreateInventoryBatchModal` xuất hiện. Nhập thông tin nguyên liệu, số lượng, hạn sử dụng -> Bấm **Lưu**.
   - **Kết quả mong đợi**: Modal đóng lại, bảng lô hàng xuất hiện lô mới, các thẻ KPI cảnh báo trên Topbar tự động nhảy số mà không cần reload trang.
2. **Xuất hủy lô quá hạn (Quick Discard)**:
   - Tìm một lô quá hạn, bấm nút `[Xuất hủy]` ở cột Hành động.
   - Modal xuất hủy mở ra -> Nhập lý do (ví dụ: "Lô hết hạn quá 3 ngày") -> Xác nhận.
   - **Kết quả mong đợi**: Lô hàng chuyển sang trạng thái đã hủy hoặc bị loại khỏi danh sách đang dùng; KPI "Lô quá hạn" giảm đi 1.
3. **Khóa tạm ngưng lô hàng (Deactivate Batch RM-013)**:
   - Bấm nút `[Khóa lô]` trên một lô đang dùng -> Nhập lý do cách ly -> Xác nhận.
   - **Kết quả mong đợi**: Huy hiệu lô chuyển sang "Đã khóa", thuật toán FEFO tự động loại bỏ lô này.

---

## 7. Kịch bản 6: Tương thích Màn hình Cảm ứng & Ngăn kéo trượt Drawer (< 992px)

### Mục tiêu:
Xác thực tính responsive trên thiết bị di động / máy tính bảng và kích thước vùng chạm touch target.

### Các bước thực hiện:
1. Mở Chrome DevTools (F12), bấm biểu tượng thiết bị di động (Toggle device toolbar), chọn thiết bị `iPad Air` (độ rộng 820px, nhỏ hơn 992px).
2. **Kết quả mong đợi**:
   - Sidebar bên trái tự động ẩn khỏi dòng layout chính.
   - Thanh Topbar xuất hiện nút bấm `[Bộ lọc & Quét mã]` với icon phễu màu cam `#EA580C`.
3. Chạm vào nút `[Bộ lọc & Quét mã]`:
   - Ngăn kéo trượt (Offcanvas Drawer) trượt ra mượt mà từ cạnh trái màn hình, hiển thị đầy đủ ô tìm kiếm, quét mã và các nút lọc nhiệt độ (Mát, Đông, Khô).
4. Kiểm tra kích thước tất cả các nút bấm trên màn hình cảm ứng:
   - Dùng công cụ Inspect kiểm tra kích thước vùng bấm (bounding client rect) của nút Nhập kho, Xuất hủy, Khóa lô, Bộ lọc.
   - **Kết quả mong đợi**: Chiều cao >= 44px, chiều rộng >= 44px (đạt chuẩn WCAG 2.1 touch target).
