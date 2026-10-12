# Hướng dẫn xác thực nhanh và từ đầu đến cuối

**Tính năng**: `002-dishes-and-dish-categories`
**Focus**: Mục 3 - Liên kết Công thức định lượng (Recipe & RecipeIngredient)  
**Ngày**: 24-09-2026

---

## 1. Điều kiện tiên quyết (Prerequisites)

- .NET 10.0 SDK đã cài đặt (`dotnet --version` >= 10.0.x).
- Node.js >= 18 & NPM đã cài đặt cho Angular client.
- Cơ sở dữ liệu đã chạy migration mới nhất qua `Acme.TooHungry.DbMigrator`.
- Backend Host chạy tại `https://localhost:44321` (hoặc cổng cấu hình).
- Frontend Angular chạy tại `http://localhost:4200`.

---

## 2. Các Kịch bản Xác thực (Validation Scenarios)

### Kịch bản 1: Tạo Danh mục món & Kiểm tra Trùng tên Case-Insensitive
1. Gọi API `POST /api/app/dish-category`:
   ```json
   { "name": "Món Nướng Than Hoa", "description": "Các món nướng tẩm ướp đậm đà" }
   ```
   **Kỳ vọng**: Trả về `200 OK` hoặc `201 Created` với `Id` danh mục mới.
2. Thử tạo lại với tên `"  món nướng than hoa  "`:
   **Kỳ vọng**: Trả về `403` hoặc `400 UserFriendlyException`: *"Tên danh mục món ăn đã tồn tại trên hệ thống!"*.

---

### Kịch bản 2: Tạo Món ăn độc lập (Không cần Recipe ban đầu)
1. Gọi API `POST /api/app/dish`:
   ```json
   {
     "name": "Coca Cola Tươi",
     "description": "Lon 330ml ướp lạnh",
     "price": 15000.0,
     "imageUrl": "https://images.unsplash.com/photo-1554866585-cd94860890b7",
     "dishCategoryId": "<ID_DANH_MUC_DO_UONG>",
     "isActive": true
   }
   ```
   **Kỳ vọng**: Món ăn được tạo thành công ngay cả khi `Recipe == null`. `hasRecipe` trong DTO trả về `false`.
2. Kiểm tra giá bán: Giá trị được lưu chính xác `15000.00` kiểu `decimal`.

---

### Kịch bản 3: Cấu hình Công thức định lượng (`Recipe`) cho Món ăn (Trọng tâm Mục 3)
1. Tạo một món ăn cần chế biến: `"Phở Bò Tái Lăn"`, giá `65000`.
2. Gọi API `POST /api/app/recipe/save-for-dish/{dishId}`:
   ```json
   {
     "name": "Công thức Phở Bò Tái Lăn Chuẩn",
     "description": "Định lượng 1 bát",
     "instructions": "Xào thịt bò tái lăn với tỏi trước khi chan nước dùng",
     "ingredients": [
       { "ingredientId": "<ID_BANH_PHO>", "quantity": 0.2000, "note": "Bánh phở tươi" },
       { "ingredientId": "<ID_THIT_BO>", "quantity": 0.1500, "note": "Thịt bò thăn thái mỏng" }
     ]
   }
   ```
3. Gọi API `GET /api/app/dish/{dishId}`:
   **Kỳ vọng**: DTO trả về thông tin món ăn kèm khối `recipe` tóm tắt (`ingredientCount: 2`).
4. Gọi API `GET /api/app/recipe/by-dish/{dishId}`:
   **Kỳ vọng**: Trả về danh sách chi tiết các nguyên liệu kèm tên nguyên liệu và đơn vị tính chuẩn (kg, g).

---

### Kịch bản 4: Chuyển đổi Tab và Trạng thái `IsActive`
1. Gọi API `PUT /api/app/dish/{dishId}/toggle-active`.
   **Kỳ vọng**: `isActive` đổi từ `true` thành `false`.
2. Gọi API `GET /api/app/dish?isActive=false`:
   **Kỳ vọng**: Danh sách trả về chỉ chứa các món đang tạm ngưng phục vụ.
3. Trên giao diện Angular: Món hiển thị đúng trong Tab *"Tạm ngưng"* kèm badge số lượng.

---

### Kịch bản 5: Xóa Món ăn kèm Nhập Lý do (`DeletionReason`)
1. Gọi API `DELETE /api/app/dish/{dishId}` với payload:
   ```json
   { "deletionReason": "Tạm dừng kinh doanh do đổi menu mùa đông" }
   ```
2. Kiểm tra trong cơ sở dữ liệu:
   - Cột `IsDeleted = true`.
   - Cột `DeletionReason = 'Tạm dừng kinh doanh do đổi menu mùa đông'`.
   - Cột `DeleterId` và `DeletionTime` được ABP tự động điền giá trị.
3. Gọi API `GET /api/app/dish`: Món ăn đã xóa không còn xuất hiện trong danh sách.

---

### Kịch bản 6: Thao tác Hàng loạt (Bulk Toggle Active)
1. Chọn 3 món ăn bất kỳ trên bảng dữ liệu bằng checkbox.
2. Trên thanh **Bulk Actions Bar**, bấm "Tạm ngưng phục vụ" (`Bulk Deactivate`).
3. Gọi API `POST /api/app/dish/bulk-toggle-active` với `{ "dishIds": [...], "isActive": false }`.
   **Kỳ vọng**: API trả về `{ "success": true, "updatedCount": 3 }`. Cả 3 món đồng loạt chuyển sang trạng thái Tạm ngưng và chuyển sang Tab "Tạm ngưng".

---

### Kịch bản 7: Sắp xếp Danh mục theo Thứ tự Hiển thị (`DisplayOrder`)
1. Tạo 2 danh mục:
   - Danh mục A: `name: "Đồ uống"`, `displayOrder: 10`
   - Danh mục B: `name: "Khai vị"`, `displayOrder: 1`
2. Gọi API `GET /api/app/dish-category`:
   **Kỳ vọng**: Danh mục B ("Khai vị") xuất hiện trước Danh mục A ("Đồ uống") do `displayOrder` nhỏ hơn, bất chấp thứ tự chữ cái tên danh mục.

---

## 3. Lệnh chạy Kiểm thử Tự động (Automated Test Execution)

Chạy bộ test xUnit cho Domain và Application:

```bash
# Chạy Unit Tests tầng Domain
dotnet test test/Acme.TooHungry.Domain.Tests/Acme.TooHungry.Domain.Tests.csproj

# Chạy Integration Tests tầng Application
dotnet test test/Acme.TooHungry.Application.Tests/Acme.TooHungry.Application.Tests.csproj
```
