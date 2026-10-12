# Giai đoạn 0: Nghiên cứu Kiến trúc & Quyết định Kỹ thuật (RM-013)

**Tính năng**: `RM-013` - Tồn kho - Khóa/Khôi phục (Inventory Deactivate & Restore)  
**Nhánh (Branch)**: `013-rm-013-inventory-deactivate-restore`  
**Ngày thực hiện**: 2026-10-12  

---

## 1. Các Vấn đề Nghiên cứu & Quyết định Kỹ thuật

### Vấn đề 1: Mô hình hóa trạng thái Vô hiệu hóa trên Mặt hàng (`Ingredient`) và Lô hàng (`InventoryBatch`)
- **Bối cảnh**: Hệ thống đã hoàn tất kiến trúc tách biệt giữa Danh mục Nguyên liệu/Mặt hàng kho (`Ingredient` - RM-005) và Lô hàng thực tế (`InventoryBatch` - RM-011). Cần quản lý vòng đời tạm ngưng ở cả 2 cấp độ.
- **Nghiên cứu & Quyết định**:
  1. **Cấp độ Mặt hàng nguyên liệu (`Ingredient`)**:
     - Đã có `IsActive` (`bool`, mặc định `true`) và `DeactivationReason` (`string?`, tối đa 500 ký tự).
     - Khi vô hiệu hóa mặt hàng ở kho, toàn bộ việc theo dõi kho của nguyên liệu này bị tạm dừng, kích hoạt cơ chế Vô hiệu hóa Dây chuyền (Cascading Deactivation).
  2. **Cấp độ Lô hàng (`InventoryBatch`)**:
     - `InventoryBatch` hiện đã có `IsActive` (`bool`, mặc định `true`) nhưng chưa có `DeactivationReason`.
     - Bổ sung trường `DeactivationReason` (`string?`, tối đa 500 ký tự) vào thực thể `InventoryBatch`. Bổ sung EF Core migration tương ứng.
     - Cho phép thủ kho cách ly tạm thời từng lô hàng nghi ngờ chất lượng mà không làm mất số lượng tồn kho (khác với thao tác Discard). Thuật toán FEFO tự động lọc bỏ các lô `IsActive == false`.
- **Cơ sở lý luận**: Tách bạch rõ ràng giữa "Tạm ngưng toàn bộ mặt hàng nguyên liệu" (ảnh hưởng công thức và bán hàng) và "Tạm khóa một lô hàng cụ thể" (chỉ ảnh hưởng luồng xuất kho FEFO của lô đó).

### Vấn đề 2: Cơ chế Vô hiệu hóa Dây chuyền (Cascading Deactivation) & Bảo vệ Đơn hàng POS
- **Bối cảnh**: Khi nguyên liệu bị ngừng sử dụng, nếu công thức (`Recipe`) và món ăn (`Dish`) vẫn mở bán sẽ gây tình trạng nhà bếp không thể chế biến. Tuy nhiên, nếu hủy luôn các món ăn trong đơn hàng đang phục vụ tại bàn sẽ gây xung đột thanh toán và trải nghiệm khách hàng tệ.
- **Quyết định (Clarify 12-10-2026)**:
  - Khi vô hiệu hóa một mặt hàng nguyên liệu:
    1. Cập nhật `Ingredient.IsActive = false`, lưu `DeactivationReason`.
    2. Cập nhật mọi `Recipe` có chứa nguyên liệu này sang `Recipe.IsActive = false` kèm lý do.
    3. Cập nhật các `Dish` tương ứng sang `Dish.IsActive = false` kèm lý do.
    4. Cập nhật nhãn `[Đã ngừng phục vụ]` trên `DailyMenuItem` tương ứng, API POS ngăn chặn triệt để việc thêm món mới vào đơn hàng.
    5. **Bảo toàn đơn hàng POS dở dang**: Không hủy các món trong đơn hàng đang phục vụ tại bàn (`ORDERED`, `PREPARING`, `SERVED`). Các món này vẫn được bếp hoàn tất và thu ngân thanh toán bình thường.
  - Khi kích hoạt lại mặt hàng: Chỉ phục hồi `Ingredient.IsActive = true`. Các `Recipe` và `Dish` liên quan **vẫn giữ nguyên trạng thái vô hiệu hóa** để Bếp trưởng/Quản lý rà soát chất lượng công thức trước khi mở bán trở lại.

### Vấn đề 3: Trải nghiệm Giao diện Quản lý Tồn kho (`/inventory` - Tab 1 & Tab 2)
- **Bối cảnh**: Tab 1 (Tổng quan Tồn kho) và Tab 2 (Danh sách Lô hàng) đã được tái thiết kế ở RM-012. Cần tích hợp luồng Khóa/Khôi phục một cách trực quan, sang trọng theo Theme Cam & Trắng.
- **Quyết định**:
  - **Tab 1 (Tổng quan Tồn kho)**:
    - Bổ sung bộ chọn **Trạng thái** (`All` / `Active` / `Deactivated`) trên thanh công cụ lọc. Mặc định chọn `Active` để bảng gọn gàng.
    - Cột thao tác của dòng đang hoạt động: Bổ sung nút **Tạm ngưng/Khóa** (icon `fa-pause` hoặc `fa-trash-can`). Khi nhấn mở Modal nhập lý do (hiển thị cảnh báo màu cam nổi bật nếu `CurrentStock > 0`).
    - Cột thao tác của dòng bị khóa: Ẩn các nút nghiệp vụ kho, CHỈ hiển thị đúng 2 nút: **Kích hoạt lại** (icon `fa-play` hoặc `fa-rotate-right`, mở Confirm Modal) và **Chỉnh sửa** (`MinStock`).
  - **Tab 2 (Danh sách Lô hàng)**:
    - Bổ sung cột Trạng thái hiển thị badge `Khả dụng` hoặc `Tạm ngưng`.
    - Thao tác trên từng lô: Bổ sung nút **Tạm khóa lô** (mở Modal chọn danh mục lý do mẫu + ghi chú) và nút **Khôi phục lô** (Confirm Modal đưa lô trở lại chu trình FEFO).

### Vấn đề 4: Màn hình Tra cứu Riêng biệt `/ingredients/deactivated`
- **Quyết định**: Xây dựng component `DeactivatedIngredientsComponent` tại route `/ingredients/deactivated`.
- **Cấu trúc bảng**: Đúng **4 cột** theo đặc tả:
  1. STT (Số thứ tự tuần tự)
  2. Tên nguyên liệu
  3. Lý do vô hiệu hóa
  4. Thao tác: Nút Kích hoạt lại (kèm Confirm Modal)
- **Điều hướng**: Nút "Xem nguyên liệu vô hiệu hóa" trên `/ingredients` và nút "Quay lại danh sách nguyên liệu" trên `/ingredients/deactivated`.

### Vấn đề 5: Khôi phục Thông minh khi Thiết lập Kho (Smart Restore on Setup)
- **Quyết định**: Khi người dùng mở form thêm mới nguyên liệu hoặc thiết lập kho mà nhập tên nguyên liệu đã tồn tại trong DB nhưng `IsActive == false`:
  - API trả về mã lỗi hoặc thông tin nhận diện nguyên liệu đã bị vô hiệu hóa (`Ingredient:AlreadyExistsDeactivated`).
  - Frontend bắt mã lỗi này và hiển thị Confirm Modal: *"Nguyên liệu này đã tồn tại trong hệ thống nhưng đang bị vô hiệu hóa. Bạn có muốn khôi phục lại nguyên liệu này không?"*.
  - Nếu Đồng ý: Gọi API `SmartRestoreAsync(id, { minStock })`.
  - Nếu Từ chối: Thông báo lỗi và dừng thao tác.

### Vấn đề 6: Phân cấp Quyền hạn (ABP Permissions)
- **Quyết định**:
  - `TooHungryPermissions.Inventories.Edit` / `Delete`: Chỉ cấp cho `Manager` và `Admin` để thực hiện vô hiệu hóa/kích hoạt lại mặt hàng nguyên liệu (do ảnh hưởng trực tiếp đến chuỗi bán hàng POS).
  - `TooHungryPermissions.Inventories.Adjust` / `DeactivateBatch`: Cấp cho cả `WarehouseKeeper`, `Manager`, và `Admin` để cách ly lô hàng khẩn cấp.

---

## 2. Ma trận Quyết định Kỹ thuật

| Quyết định | Lựa chọn được chọn | Lý do chính | Các phương án bị loại bỏ |
| :--- | :--- | :--- | :--- |
| **Lưu vết Tạm khóa Lô hàng** | Bổ sung `DeactivationReason` vào `InventoryBatch` | Đảm bảo truy xuất nguồn gốc và kiểm toán an toàn thực phẩm | Không lưu lý do, chỉ dùng boolean toggle |
| **Xử lý Đơn POS dở dang** | Giữ nguyên đơn dở dang, chỉ chặn gọi món mới | Tránh gián đoạn bàn ăn khách đang dùng bữa và lỗi thanh toán thu ngân | Hủy món tự động hoặc chặn thanh toán toàn bộ |
| **Bộ lọc Tab 1 Kho** | Mặc định hiện `Active`, có dropdown chọn `Deactivated` / `All` | Giữ giao diện kho sạch sẽ, tối ưu tầm nhìn hàng ngày của thủ kho | Luôn hiển thị chung mọi dòng làm dài bảng |
| **Lý do Tạm khóa Lô** | Modal chọn danh mục lý do mẫu + ghi chú chi tiết | Thao tác nhanh cho thủ kho, đồng thời chuẩn hóa dữ liệu kiểm toán | Chỉ cho nhập tự do textarea hoặc không cho nhập lý do |
| **Phân quyền Vô hiệu hóa Mặt hàng** | Giới hạn cho `Manager` và `Admin` | Vì hành động này tự động tắt món ăn và ảnh hưởng doanh thu bán hàng | Cho phép nhân viên kho bình thường thực hiện |
| **Giao diện & Nhận diện** | Theme Cam & Trắng (`#EA580C`, `#FFF3E8`, `#FFFFFF`) | Tuân thủ tuyệt đối Nguyên tắc VI trong Hiến pháp Acme.TooHungry | Giao diện mặc định Bootstrap |
