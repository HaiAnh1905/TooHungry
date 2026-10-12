# Hướng dẫn Kiểm chứng Nhanh (Quickstart Guide): Quản lý Công thức (Recipes) (RM-007)

**Tính năng**: `007-rm-007-recipe-inventory-consumption` — Quản lý Công thức Món ăn (RM-007)  
**Ngày cập nhật**: 2026-10-09  

Tài liệu này cung cấp các kịch bản kiểm chứng nhanh (end-to-end verification) để xác thực toàn bộ luồng nghiệp vụ của tính năng Quản lý Công thức Món ăn (RM-007) trên cả tầng Backend (.NET ABP) và Frontend (Angular).

---

## 1. Yêu cầu Tiền đề (Prerequisites)

1. Cơ sở dữ liệu đã chạy migration đầy đủ:
   ```bash
   dotnet run --project src/Acme.TooHungry.DbMigrator/Acme.TooHungry.DbMigrator.csproj
   ```
2. Các dữ liệu nền tảng đã sẵn sàng (đã seed hoặc tạo qua UI):
   - Danh mục Đơn vị tính (`Unit` - RM-004): `Kg`, `Gam`, `Lít`, `Muỗng`.
   - Danh mục Nguyên liệu (`Ingredient` - RM-005): 
     - "Thịt bò thăn" (`BaseUnit: Kg`, `EstimatedPrice: 300,000 đ`).
     - "Bơ lạt" (`BaseUnit: Kg`, `EstimatedPrice: 150,000 đ`).
     - "Tiêu đen" (`BaseUnit: Kg`, `EstimatedPrice: 200,000 đ`).
   - Món ăn (`Dish` - RM-006): "Bò bít tết sốt tiêu" (`Price: 200,000 đ`).

---

## 2. Kịch bản Kiểm chứng Nghiệp vụ (End-to-End Scenarios)

### Kịch bản 1: Tạo Công thức Món ăn & Quy đổi Đơn vị (User Story 1)

1. **Thao tác**:
   - Truy cập trang `/recipes` (hoặc nhấn nút `[Công thức]` trên bảng `/dishes`).
   - Chọn món "Bò bít tết sốt tiêu".
   - Nhập tên: *"Công thức Bò bít tết sốt tiêu chuẩn"*.
   - Thêm các dòng nguyên liệu:
     - Thịt bò thăn: Số lượng `200`, Đơn vị `Gam`, Hệ số quy đổi `0.001` (Quy đổi: `0.2 Kg`).
     - Bơ lạt: Số lượng `20`, Đơn vị `Gam`, Hệ số quy đổi `0.001` (Quy đổi: `0.02 Kg`).
     - Tiêu đen: Số lượng `5`, Đơn vị `Gam`, Hệ số quy đổi `0.001` (Quy đổi: `0.005 Kg`).
   - Bấm **Lưu**.
2. **Kết quả Kỳ vọng**:
   - Hệ thống lưu thành công với `Version = 1`, `IsActive = true`.
   - Bảng danh sách hiển thị món với huy hiệu xanh: *"Đã có công thức (3 nguyên liệu - v1)"*.
   - Không xuất hiện lỗi trùng lặp nguyên liệu.

---

### Kịch bản 2: Tự động Tính toán Chi phí Giá vốn & Tỷ lệ Food Cost % (User Story 4)

1. **Thao tác**:
   - Mở modal xem chi tiết công thức của món "Bò bít tết sốt tiêu".
2. **Kết quả Kỳ vọng**:
   - Chi phí Thịt bò: $0.2 \times 300,000 = 60,000\text{ đ}$.
   - Chi phí Bơ lạt: $0.02 \times 150,000 = 3,000\text{ đ}$.
   - Chi phí Tiêu đen: $0.005 \times 200,000 = 1,000\text{ đ}$.
   - **Tổng giá vốn ước tính (`TotalEstimatedCost`)**: `64,000 đ`.
   - **Tỷ lệ Food Cost % (`FoodCostPercentage`)**: $\frac{64,000}{200,000} \times 100\% = 32\%$.
   - Các chỉ số hiển thị nổi bật với giao diện Cam & Trắng trên header của modal.

---

### Kịch bản 3: Chỉnh sửa Định lượng & Nâng Phiên bản Tự động (User Story 3)

1. **Thao tác**:
   - Bấm nút **Chỉnh sửa** công thức của món "Bò bít tết sốt tiêu".
   - Tăng định lượng Thịt bò thăn từ `200 Gam` lên `250 Gam` (Quy đổi thành `0.25 Kg`).
   - Bấm **Lưu**.
2. **Kết quả Kỳ vọng**:
   - Công thức được cập nhật thành công với `Version = 2`.
   - Tổng giá vốn ước tính tự động tăng thành: $75,000 + 3,000 + 1,000 = 79,000\text{ đ}$.
   - Tỷ lệ Food Cost % tự động cập nhật: $\frac{79,000}{200,000} \times 100\% = 39.5\%$.
   - Lịch sử các đơn hàng cũ trước đó hoàn toàn không bị ảnh hưởng.

---

### Kịch bản 4: Tạm ngưng và Kích hoạt lại Công thức (User Story 5)

1. **Thao tác**:
   - Trên bảng danh sách `/recipes`, nhấn nút **Tạm ngưng** công thức.
   - Để trống lý do -> Hệ thống cảnh báo bắt buộc nhập lý do.
   - Nhập lý do: *"Hết nguồn thịt bò Úc, tạm ngưng chờ lô mới"* -> Xác nhận.
2. **Kết quả Kỳ vọng**:
   - Công thức chuyển trạng thái `IsActive = false`, hiển thị huy hiệu xám *"Tạm ngưng"*.
   - Khi POS truy vấn `GetActiveByDishIdAsync`, hệ thống trả về `null` (món bán bình thường nhưng không trừ kho tự động).
   - Nhấn **Kích hoạt lại** -> Công thức phục hồi `IsActive = true`, xóa bỏ lý do tạm ngưng.

---

### Kịch bản 5: Cảnh báo khi Nguyên liệu Thành phần bị Tạm ngưng (EC-006)

1. **Thao tác**:
   - Vào màn hình Quản lý Nguyên liệu (`/ingredients` - RM-005), thực hiện tạm ngưng nguyên liệu "Bơ lạt".
   - Quay lại màn hình Quản lý Công thức (`/recipes`) và màn hình Món ăn (`/dishes`).
2. **Kết quả Kỳ vọng**:
   - Công thức của món "Bò bít tết sốt tiêu" vẫn giữ `IsActive = true`.
   - Xuất hiện huy hiệu cảnh báo màu vàng/cam: *"Chứa nguyên liệu tạm ngưng (Bơ lạt)"*.

---

## 3. Lệnh Chạy Kiểm thử Tự động (Automated Test Execution)

### Chạy toàn bộ Unit Tests & Integration Tests của Module Recipes:
```powershell
dotnet test --filter "FullyQualifiedName~Recipe"
```

### Kết quả Kiểm thử Kỳ vọng:
- `EfCoreRecipeDomainTests`: 5/5 passed.
- `RecipeAppService_Tests`: Đạt 100% kiểm thử CRUD, phân trang, lọc theo danh mục, tính giá vốn và kiểm tra versioning.
