# Hướng dẫn Kiểm thử Nhanh & Vận hành (Quickstart): RM-017 Làm lại trang Quản lý bàn

**Tính năng**: `RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign)`  
**Ngày**: 2026-10-16  
**Trạng thái**: Sẵn sàng kiểm thử (Ready for Testing)

---

## 1. Chuẩn bị Môi trường

1. Đăng nhập hệ thống với tài khoản vai trò `Waiter` hoặc `Manager`/`Admin` (ví dụ `admin`).
2. Mở trình duyệt truy cập ứng dụng Acme.TooHungry:
   - Sảnh phục vụ: `http://localhost:4200/waiter/tables`
   - Quản trị mặt bằng: `http://localhost:4200/tables`

---

## 2. Kịch bản Kiểm thử 1: Đón khách & Kiểm tra Đếm giờ 2 Tầng Cảnh báo

### Các bước thực hiện:
1. Tại `/waiter/tables`, tìm một bàn đang ở trạng thái `AVAILABLE` (xanh lá `[Còn trống]`, ví dụ `Bàn 01`).
2. Bấm nút `[Đón khách]` $\rightarrow$ Thẻ bàn lập tức chuyển sang đỏ cam `[Đang có khách]`.
3. Quan sát thông tin thời gian:
   - Dòng `Ngồi lúc: HH:mm` hiển thị chuẩn xác giờ hiện tại.
   - Huy hiệu thời lượng hiển thị `0 phút` mang phong cách `badge-meal-normal` (nền kem xám).
4. Giả lập hoặc kiểm tra với bàn đã ngồi:
   - Khi thời gian ngồi từ 60 đến 89 phút: Huy hiệu chuyển sang màu vàng `badge-meal-warning` kèm icon `fa-clock` (Cảnh báo Chăm sóc khách).
   - Khi thời gian ngồi $\ge$ 90 phút: Huy hiệu chuyển sang màu đỏ cam `badge-meal-long` kèm icon đồng hồ cát `fa-hourglass-half` có hiệu ứng nhấp nháy nhẹ (Cảnh báo Bàn ngồi lâu).

---

## 3. Kịch bản Kiểm thử 2: Chuyển Bàn Ăn (`Transfer Table`)

### Các bước thực hiện:
1. Chọn một bàn đang `OCCUPIED` có đơn hàng (ví dụ `Bàn 02` có Order `ORD-001`, đã ngồi 30 phút).
2. Bấm nút `[Chuyển bàn]` $\rightarrow$ Hộp thoại `TableTransferModal` hiển thị.
3. Chọn một bàn đích trống (ví dụ `Bàn 06` đang `AVAILABLE` ở tầng 2).
4. Bấm `[Xác nhận chuyển bàn]`:
   - `Bàn 06` chuyển sang `OCCUPIED`, kế thừa toàn bộ đơn hàng `ORD-001` và mốc `OccupiedTime` từ `Bàn 02` (hiển thị thời lượng đúng 30 phút).
   - `Bàn 02` tự động chuyển sang trạng thái `CLEANING` (Đang dọn dẹp).
5. Mở tab trình duyệt khác để kiểm tra SignalR: Cả 2 bàn được đồng bộ tức thì dưới 1 giây.

---

## 4. Kịch bản Kiểm thử 3: Gộp Bàn Ăn (`Merge Tables`)

### Các bước thực hiện:
1. Đảm bảo có 2 bàn đang `OCCUPIED` đều có đơn hàng (ví dụ: `Bàn 03` có Order 2 món 100k, `Bàn 04` có Order 3 món 150k).
2. Tại `Bàn 03` (Bàn chính), bấm `[Gộp bàn]` $\rightarrow$ Hộp thoại `TableMergeModal` hiển thị.
3. Chọn bàn phụ cần gộp là `Bàn 04`.
4. Bấm `[Xác nhận gộp bàn]`:
   - Toàn bộ 3 món của `Bàn 04` được chuyển gộp sang Order của `Bàn 03` (tổng 5 món, 250k).
   - Order của `Bàn 04` được đóng.
   - `Bàn 04` được giải phóng về trạng thái `CLEANING`.

---

## 5. Kịch bản Kiểm thử 4: Hộp thoại Kết thúc Bữa ăn với Timeline 3 Mốc

### Các bước thực hiện:
1. **Trường hợp bàn không có Order**:
   - Chọn bàn `OCCUPIED` không có món $\rightarrow$ Bấm `[Kết thúc bữa ăn]`.
   - Quan sát Timeline 3 mốc: `Seated At → Elapsed → Ended At`.
   - Cảnh báo vàng hiển thị: "Khách không sử dụng món ăn...".
   - Bấm `[Xác nhận trả bàn trống]` $\rightarrow$ Bàn chuyển ngay về `AVAILABLE`.
2. **Trường hợp bàn có Order**:
   - Chọn bàn `OCCUPIED` có đơn hàng $\rightarrow$ Bấm `[Kết thúc bữa ăn]`.
   - Timeline 3 mốc hiển thị rõ ràng.
   - Nút `[Chuyển sang Thanh toán →]` hiển thị nổi bật màu cam.
   - Bấm nút $\rightarrow$ Trình duyệt điều hướng thẳng sang màn hình thanh toán `/payment/:orderId` (RM-016). Bàn vẫn giữ `OCCUPIED` cho đến khi thanh toán hoàn tất.

---

## 6. Kịch bản Kiểm thử 5: Chuyển đổi Floor Plan Grid / Datatable List View tại `/tables`

### Các bước thực hiện:
1. Đăng nhập tài khoản Quản lý, truy cập `/tables`.
2. Kiểm tra giao diện chuẩn màu Cam & Trắng (`#EA580C`), bo góc mềm mại, 6 thẻ chỉ số mặt bằng hiển thị sắc nét.
3. Bấm nút `[Danh sách (List View)]` $\rightarrow$ Bảng Datatable hiển thị mượt mà dưới 100ms với đầy đủ cột STT, Tên bàn, Sức chứa, Khu vực, Trạng thái, Thao tác.
4. Bấm nút `[Sơ đồ bàn (Floor Plan)]` $\rightarrow$ Giao diện lưới thẻ bàn trực quan hiển thị lại tức thì, giữ nguyên bộ lọc khu vực và từ khóa tìm kiếm.
