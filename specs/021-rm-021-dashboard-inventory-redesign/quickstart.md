# Hướng dẫn Kiểm thử Nhanh (Quickstart & Verification Guide): RM-021 Làm lại giao diện kho bên Dashboard

**Tính năng**: `RM-021 — Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)`  
**Nhánh**: `021-rm-021-dashboard-inventory-redesign` | **Ngày**: 2026-10-20 | **Đặc tả**: [spec.md](spec.md)

Tài liệu này hướng dẫn cách kiểm thử độc lập toàn diện 6 kịch bản vận hành của màn hình Quản lý kho bên Dashboard sau khi hoàn thành tái thiết kế.

---

## 1. Môi trường & Điều kiện Tiên quyết (Prerequisites)

1. **Khởi chạy ứng dụng**:
   - Backend ABP API: `dotnet run` tại `src/Acme.TooHungry.HttpApi.Host/`, chạy tại `https://localhost:44305`.
   - Frontend Angular: `npm start` tại thư mục `angular/`, truy cập tại `http://localhost:4200`.
2. **Tài khoản kiểm thử**:
   - Tài khoản Quản lý: Username `admin` hoặc `manager` (vai trò `Administrator` / `Manager`, có quyền `TooHungry.Inventories`).
   - Tài khoản Không có quyền: Username `waiter` (vai trò `Waiter`).

---

## 2. Kịch bản 1: Điều hướng & Đồng bộ Query Parameter `?tab=...`

### Mục tiêu:
Xác thực cơ chế chuyển Tab đồng bộ với URL mà không reload toàn bộ trang, hỗ trợ lưu lịch sử duyệt và bookmark.

### Các bước thực hiện:
1. Đăng nhập bằng tài khoản `admin`, truy cập `http://localhost:4200/inventory`.
2. Quan sát thanh địa chỉ: Tự động chuẩn hóa về `http://localhost:4200/inventory?tab=ingredients` (hoặc hiển thị tab Nguyên liệu mặc định).
3. Bấm vào Tab **"Danh sách Lô hàng"**:
   - URL trên thanh địa chỉ thay đổi tức thì thành `/inventory?tab=batches`.
   - Bảng lô hàng hiển thị với hiệu ứng mượt mà (< 100ms), trang không bị chớp hay reload.
4. Bấm vào Tab **"Nhật ký & Kiểm kê"**:
   - URL thay đổi thành `/inventory?tab=transactions`.
5. Bấm nút Back của trình duyệt (`← Back`):
   - Trình duyệt quay về `/inventory?tab=batches`, tab Lô hàng được kích hoạt lại chính xác.
6. Sao chép URL `/inventory?tab=batches` mở trong một tab trình duyệt mới:
   - Trang mở thẳng vào tab Lô hàng mà không cần chuyển từ tab Nguyên liệu.

---

## 3. Kịch bản 2: Khối 4 Thẻ Bento KPI & Băng rôn Cảnh báo Khẩn cấp

### Mục tiêu:
Xác thực số liệu tổng hợp của 4 thẻ Bento KPI và khả năng tương tác của Băng rôn Cảnh báo ghim đầu trang.

### Các bước thực hiện:
1. Truy cập `/inventory`.
2. Quan sát hàng thẻ Bento KPI đầu trang:
   - Thẻ 1 (Tổng mặt hàng): Hiển thị tổng số nguyên liệu.
   - Thẻ 2 (Tồn an toàn): Hiển thị số lượng nguyên liệu đạt tồn kho tối thiểu, viền điểm nhấn xanh lá.
   - Thẻ 3 (Cảnh báo thiếu hụt): Hiển thị số nguyên liệu thiếu tồn, viền điểm nhấn vàng cam.
   - Thẻ 4 (Lô quá hạn cần hủy): Hiển thị số lượng lô đã quá date, viền điểm nhấn đỏ.
3. Bấm trực tiếp vào thẻ **"Cảnh báo thiếu hụt"**:
   - Bảng nguyên liệu tự động áp dụng bộ lọc chỉ hiển thị các mặt hàng đang thiếu tồn.
4. Quan sát **Băng rôn Cảnh báo (Alerts Banner)** ở đầu trang:
   - Nếu có cảnh báo khẩn: Hiển thị dòng cảnh báo cao nhất kèm nút `[Xem chi tiết (X)]`.
   - Bấm nút: Mở rộng danh sách Accordion các cảnh báo cụ thể.
   - Bấm vào một dòng cảnh báo: Hệ thống tự động cuộn và highlight đến đúng mặt hàng / lô hàng tương ứng.

---

## 4. Kịch bản 3: Danh mục Nguyên liệu & Thanh Tiến trình Tồn An toàn

### Mục tiêu:
Xác thực hiển thị thanh tiến trình trực quan (Visual Stock Progress Bar) và các thao tác trên dòng nguyên liệu.

### Các bước thực hiện:
1. Truy cập `/inventory?tab=ingredients`.
2. Quan sát cột Tồn kho & Định mức an toàn:
   - Kiểm tra thanh tiến trình màu sắc:
     + Xanh lá: Nếu `CurrentStock >= SafeStock`.
     + Vàng cam: Nếu `50% SafeStock <= CurrentStock < SafeStock`.
     + Đỏ: Nếu `CurrentStock < 50% SafeStock` hoặc hết hàng.
3. Gõ từ khóa vào ô tìm kiếm (ví dụ: "Bò"):
   - Danh sách tự động lọc sau 250ms debounce.
4. Bấm chọn nút lọc nhiệt độ `[Bảo quản đông 🧊]`:
   - Bảng chỉ hiển thị các nguyên liệu có điều kiện bảo quản đông lạnh.
5. Bấm nút `[Lô hàng]` trên một dòng nguyên liệu:
   - Mở modal `IngredientBatchesModal` hiển thị danh sách các lô thuộc nguyên liệu đó.

---

## 5. Kịch bản 4: Quản lý Lô hàng Nâng cao, FEFO Timeline & Thao tác 1 Chạm

### Mục tiêu:
Kiểm tra trực quan hóa hạn dùng FEFO và các thao tác Khóa lô (RM-013), Mở khóa và Xuất hủy.

### Các bước thực hiện:
1. Truy cập `/inventory?tab=batches`.
2. Quan sát cột Hạn sử dụng:
   - Lô còn hạn > 7 ngày: Badge xanh lá `[Còn X ngày]`.
   - Lô còn hạn 1 - 7 ngày: Badge cam `[Cận date - Còn X ngày]`.
   - Lô quá hạn: Badge đỏ `[Quá hạn X ngày - Cần xuất hủy]`.
   - Lô bị khóa: Badge tím xám `[Đã khóa]`, rê chuột hiển thị lý do khóa.
3. **Thao tác Khóa lô (RM-013)**:
   - Nhấn nút `[Khóa lô]` trên một dòng lô đang hoạt động.
   - Chọn lý do mẫu (ví dụ: "Nghi ngờ chất lượng"), bấm **Xác nhận khóa**.
   - **Kết quả**: Lô chuyển sang badge tím xám, số lượng khả dụng của nguyên liệu bị trừ tương ứng.
4. **Thao tác Mở khóa**:
   - Nhấn nút `[Mở khóa]` trên lô vừa khóa -> Xác nhận mở khóa.
   - **Kết quả**: Lô trở lại trạng thái khả dụng.
5. **Thao tác Xuất hủy**:
   - Nhấn nút `[Xuất hủy]` trên một lô quá hạn -> Nhập lý do xuất hủy -> Xác nhận.
   - **Kết quả**: Lô được xuất hủy, ghi nhận giao dịch `DISCARD` trong lịch sử.

---

## 6. Kịch bản 5: Đề xuất Nhập hàng từ Dự báo (RM-014) & 1-Click Nhập Lô

### Mục tiêu:
Xác thực tính năng liên thông với module Dự báo (RM-014) thông qua tiện ích đề xuất mua hàng.

### Các bước thực hiện:
1. Truy cập `/inventory`.
2. Quan sát khối tiện ích **"Đề xuất Nhập hàng (Dự báo RM-014)"**:
   - Hiển thị danh sách các nguyên liệu thiếu hụt dự báo trong 7 ngày tới kèm số lượng đề xuất mua thêm.
3. Bấm nút `[+ Nhập hàng]` trên dòng nguyên liệu "Cà chua":
   - Modal `CreateInventoryBatchModal` mở ra ngay lập tức.
   - Ô chọn nguyên liệu đã điền sẵn "Cà chua".
   - Ô số lượng đã điền sẵn số lượng đề xuất từ dự báo.
   - Ô ngày nhập điền sẵn ngày hôm nay.
4. Nhập đơn giá thực tế và bấm **Lưu lô hàng**:
   - Lô hàng mới được tạo thành công, số liệu tồn kho cập nhật tức thì.

---

## 7. Kịch bản 6: Chuẩn hóa 4 Modal Bento & Lối tắt sang Phân hệ Thủ kho

### Mục tiêu:
Xác thực giao diện Bento bo góc của các modal và nút lối tắt chuyển đổi sang Phân hệ Thủ kho (RM-020).

### Các bước thực hiện:
1. Tại trang `/inventory`, bấm nút **`[Giao diện Thủ kho ↗]`** trên thanh tiêu đề:
   - Trình duyệt điều hướng tức thì sang `http://localhost:4200/inventory-keeper/dashboard`.
   - Giao diện chuyển sang layout chuyên biệt của quầy kho.
2. Tại quầy kho, bấm nút `[Quay lại Quản trị]`:
   - Trình duyệt điều hướng an toàn trở lại `/inventory`.
3. Kiểm tra các modal nghiệp vụ:
   - Bấm mở `CreateBatchModal`, `DiscardBatchModal`, `StockAdjustmentModal`.
   - Quan sát visual: Header sắc cam `#EA580C`, bo góc lớn `rounded-2xl`, hiệu ứng focus viền cam, hỗ trợ phím `Esc` đóng modal an toàn.
4. Chuyển đổi ngôn ngữ hệ thống sang Tiếng Anh (`English`):
   - Toàn bộ nhãn nút, tiêu đề, thẻ KPI, badge FEFO hiển thị chuẩn xác bằng Tiếng Anh.
