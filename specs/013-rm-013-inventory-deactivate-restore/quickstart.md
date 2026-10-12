# Giai đoạn 1: Hướng dẫn Kiểm thử Nhanh (Quickstart Guide) - RM-013

**Tính năng**: `RM-013` - Tồn kho - Khóa/Khôi phục (Inventory Deactivate & Restore)  
**Nhánh (Branch)**: `013-rm-013-inventory-deactivate-restore`  
**Ngày cập nhật**: 2026-10-12  

---

## 1. Chuẩn bị Dữ liệu Thử nghiệm

Đảm bảo backend và frontend đang chạy:
- Backend: `dotnet run --project src/Acme.TooHungry.HttpApi.Host`
- Frontend: `npm start` (tại thư mục `angular/`)
- Đăng nhập với tài khoản Quản lý (`admin` hoặc `manager`).

---

## 2. Các Kịch bản Kiểm thử Nghiệp vụ (End-to-End Scenarios)

### Kịch bản 1: Vô hiệu hóa Mặt hàng Tồn kho & Vô hiệu hóa Dây chuyền (US1)
1. Truy cập màn hình Quản lý Tồn kho: `http://localhost:4200/inventory` (Tab 1: Tổng quan Tồn kho).
2. Chọn một mặt hàng đang hoạt động có liên kết công thức (ví dụ: "Thịt bò Kobe").
3. Nhấn nút **Tạm ngưng/Khóa** trên cột thao tác.
4. **Kiểm tra**:
   - Modal nhập lý do hiển thị.
   - Nếu item còn tồn kho (`CurrentStock > 0`), modal hiển thị cảnh báo màu cam nổi bật.
   - Để trống lý do và nhấn Xác nhận $\rightarrow$ Hệ thống báo lỗi bắt buộc nhập.
   - Nhập lý do "Ngừng nhập từ nhà cung cấp" và nhấn Xác nhận.
5. **Xác minh kết quả**:
   - Dòng nguyên liệu chuyển sang trạng thái "Không khả dụng" (hoặc ẩn nếu bộ lọc chọn "Đang hoạt động").
   - Chuyển bộ lọc trạng thái sang "Tất cả" hoặc "Đã tạm ngưng": cột thao tác chỉ hiển thị đúng **2 nút**: **Kích hoạt lại** và **Chỉnh sửa**.
   - Mở màn hình Quản lý Công thức (`/recipes`): Công thức chứa thịt bò Kobe chuyển sang Inactive và gắn huy hiệu cảnh báo vàng cam `[Chứa nguyên liệu tạm ngưng]`.
   - Mở màn hình Món ăn (`/dishes`): Món ăn liên quan chuyển sang Inactive.
   - Mở giao diện POS: Món ăn không còn cho phép gọi mới. Các đơn hàng đang phục vụ dở dang tại bàn vẫn được thanh toán bình thường.

---

### Kịch bản 2: Kích hoạt lại Mặt hàng Tồn kho (US2)
1. Tại Tab 1 (`/inventory`), lọc các mặt hàng "Đã tạm ngưng".
2. Nhấn nút **Kích hoạt lại** trên dòng mặt hàng vừa khóa.
3. **Kiểm tra**:
   - Confirm Modal hiển thị hỏi xác nhận kích hoạt lại.
   - Nhấn Đồng ý.
4. **Xác minh kết quả**:
   - Mặt hàng chuyển về trạng thái khả dụng (`IsActive = true`).
   - Các nút thao tác chuẩn trong kho (Điều chỉnh, Xem lô, Lịch sử) phục hồi đầy đủ.
   - Kiểm tra màn hình Công thức và Món ăn: **Vẫn giữ nguyên trạng thái Không khả dụng** để Bếp trưởng chủ động rà soát bật lại thủ công.

---

### Kịch bản 3: Tạm khóa & Khôi phục Lô hàng Cụ thể (US3)
1. Tại trang `/inventory`, chuyển sang **Tab 2: Danh sách Lô hàng**.
2. Chọn một lô hàng đang hoạt động, nhấn nút **Tạm khóa lô**.
3. **Kiểm tra**:
   - Modal hiển thị dropdown danh mục lý do mẫu: `Chờ kiểm định chất lượng`, `Nghi ngờ biến chất/hư hỏng`, `Lỗi quy cách đóng gói`, `Khác`.
   - Chọn lý do và nhập ghi chú, nhấn Xác nhận.
4. **Xác minh kết quả**:
   - Lô hàng hiển thị huy hiệu `[Đã tạm ngưng]`.
   - Thử nghiệm gọi món hoặc kiểm tra thuật toán FEFO: Lô hàng này bị bỏ qua, không được xuất kho.
   - Nhấn nút **Khôi phục lô** $\rightarrow$ Xác nhận $\rightarrow$ Lô hàng quay lại chu trình FEFO bình thường.

---

### Kịch bản 4: Màn hình Danh sách Nguyên liệu Bị Vô hiệu hóa (US4)
1. Truy cập màn hình Quản lý Nguyên liệu: `http://localhost:4200/ingredients`.
2. Nhấn nút điều hướng **"Xem nguyên liệu vô hiệu hóa"**.
3. **Kiểm tra**:
   - Chuyển hướng đến route `/ingredients/deactivated`.
   - Bảng hiển thị đúng **4 cột**: STT, Tên nguyên liệu, Lý do vô hiệu hóa, Thao tác.
   - Nhấn nút Kích hoạt lại tại một dòng $\rightarrow$ Confirm Modal hiển thị $\rightarrow$ Xác nhận $\rightarrow$ Mặt hàng biến mất khỏi danh sách vô hiệu hóa.
   - Nhấn nút "Quay lại danh sách nguyên liệu" $\rightarrow$ Quay về `/ingredients`.

---

### Kịch bản 5: Khôi phục Thông minh khi Thiết lập Kho (US5)
1. Mở Modal Thêm mới nguyên liệu / Thiết lập tồn kho.
2. Nhập tên một nguyên liệu đã tồn tại trong DB nhưng đang bị vô hiệu hóa.
3. Nhấn Lưu.
4. **Kiểm tra**:
   - Hệ thống hiển thị hộp thoại cảnh báo: *"Nguyên liệu này đã tồn tại trong hệ thống nhưng đang bị vô hiệu hóa. Bạn có muốn khôi phục lại nguyên liệu này không?"*.
   - Nhấn Từ chối $\rightarrow$ Báo lỗi và hủy bỏ thao tác.
   - Nhấn Xác nhận khôi phục $\rightarrow$ Mặt hàng được khôi phục khả dụng và cập nhật mức tồn tối thiểu mới.
