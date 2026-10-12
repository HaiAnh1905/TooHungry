# Nghiên cứu Kỹ thuật & Quyết định Kiến trúc (Technical Research): RM-005

**Tính năng**: Quản lý Nguyên liệu (Ingredients) (RM-005)  
**Ngày**: 2026-10-08  
**Trạng thái**: Hoàn thành (Approved)

---

## 1. Vấn đề 1: Kiến trúc Domain & Quản lý Quy tắc Bất biến (Invariants)

### Bối cảnh
Trước đây, logic kiểm tra trùng lặp tên nguyên liệu và khôi phục được viết rải rác ngay trong `IngredientAppService` ở tầng Application, vi phạm Nguyên tắc I của Hiến pháp Acme.TooHungry (Domain-Driven Design: Logic nghiệp vụ cốt lõi và kiểm tra bất biến BẮT BUỘC phải nằm tại Domain Service).

### Quyết định Kiến trúc
- **Tạo mới Domain Service**: `IngredientManager : DomainService` tại `src/Acme.TooHungry.Domain/Ingredients/`.
- **Trách nhiệm của `IngredientManager`**:
  1. `CreateAsync`: Kiểm tra trùng tên không phân biệt hoa/thường (`Trim().ToLower()`). Nếu trùng với nguyên liệu đang hoạt động, ném `BusinessException("Ingredient:NameAlreadyExists")`. Nếu trùng với nguyên liệu đang tạm ngưng, ném `BusinessException("Ingredient:AlreadyExistsInactive")` kèm Id để hỗ trợ gợi ý khôi phục.
  2. `UpdateAsync`: Kiểm tra trùng tên khi đổi tên, đồng thời kiểm tra bất biến: NẾU nguyên liệu đã có dữ liệu vận hành (có trong công thức hoặc có lô kho), cấm đổi `BaseUnit`, ném `UserFriendlyException`.
  3. `CheckCanDeleteAsync`: Kiểm tra điều kiện xóa. Truy vấn `_recipeIngredientRepository` và `_batchRepository`. Nếu đang được sử dụng trong công thức hoặc có lô kho, ném `UserFriendlyException` từ chối xóa và hướng dẫn chuyển sang Tạm ngưng (`Deactivate`).
  4. `CheckCanEditUnitAsync`: Phương thức trợ giúp kiểm tra xem nguyên liệu có được phép sửa đơn vị tính hay không để trả về cờ `CanEditUnit` cho giao diện.

---

## 2. Vấn đề 2: Bổ sung Đơn giá Tham khảo (`EstimatedPrice`)

### Bối cảnh
Đầu bếp và Quản lý khi tạo công thức món ăn (RM-007) và định giá bán (RM-006) cần tính toán Food Cost % lý thuyết ngay cả khi kho chưa nhập hàng thực tế.

### Quyết định Kiến trúc
- Bổ sung trường `public decimal EstimatedPrice { get; set; } = 0;` vào thực thể [`Ingredient`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Domain/Ingredients/Ingredient.cs).
- Cấu hình trong [`TooHungryDbContext.cs`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.EntityFrameworkCore/EntityFrameworkCore/TooHungryDbContext.cs): `b.Property(x => x.EstimatedPrice).HasPrecision(18, 2);`.
- Cập nhật DTOs (`IngredientDto`, `CreateIngredientDto`, `UpdateIngredientDto`) và AutoMapper.
- Tạo một EF Core migration mới (`Add_EstimatedPrice_To_Ingredient`) để đồng bộ lược đồ cơ sở dữ liệu.

---

## 3. Vấn đề 3: Quy tắc Tính toán Tồn kho Khả dụng & An toàn Thực phẩm

### Bối cảnh
Nếu tính tổng toàn bộ `RemainingQuantity` của tất cả các lô hàng mà không phân biệt hạn sử dụng, các lô đã quá hạn sẽ bị tính vào tồn khả dụng, gây rủi ro ngộ độc thực phẩm nghiêm trọng cho thực khách.

### Quyết định Kiến trúc
- Trong `IngredientAppService.GetListAsync` và `GetAsync`:
  ```csharp
  var today = Clock.Now.Date; // hoặc DateTime.UtcNow.Date
  
  // Tồn khả dụng an toàn (chỉ tính lô hoạt động và còn hạn)
  dto.CurrentStock = batches
      .Where(x => x.IngredientId == ing.Id && x.IsActive && (x.ExpiryDate == null || x.ExpiryDate >= today))
      .Sum(x => x.RemainingQuantity);
      
  // Tồn quá hạn (để cảnh báo xuất hủy)
  dto.ExpiredStock = batches
      .Where(x => x.IngredientId == ing.Id && x.IsActive && x.ExpiryDate != null && x.ExpiryDate < today)
      .Sum(x => x.RemainingQuantity);
  ```
- Trên UI:
  - Nếu `CurrentStock <= MinStock`: Hiển thị huy hiệu cảnh báo (màu cam "Sắp hết hàng" hoặc màu đỏ "Hết hàng").
  - Nếu `ExpiredStock > 0`: Hiển thị icon cảnh báo tam giác vàng kèm tooltip *"Có {ExpiredStock} {Unit} quá hạn chờ xuất hủy"*.

---

## 4. Vấn đề 4: Ranh giới Master Data (Không nhập tồn kho tại RM-005)

### Bối cảnh
Người dùng có thể kỳ vọng có ô nhập số lượng tồn kho ban đầu ngay khi tạo nguyên liệu.

### Quyết định Kiến trúc
- Giữ vững ranh giới kiến trúc: RM-005 thuần túy là dữ liệu danh mục nền tảng (Master Data).
- Form thêm mới/chỉnh sửa của RM-005 **không có** trường nhập số lượng tồn kho.
- Mọi biến động số lượng tồn kho bắt buộc phải thực hiện thông qua phiếu nhập kho theo lô tại RM-011 (`InventoryBatch` có ngày nhập, hạn sử dụng, giá nhập và mã lô) để bảo đảm 100% Audit Trail.

---

## 5. Vấn đề 5: Xây dựng Giao diện Độc lập & Tích hợp Shared UI

### Bối cảnh
Trước đây modal tạo nguyên liệu bị nhúng tạm thời trong trang `/inventory`. RM-005 yêu cầu một màn hình Master Data độc lập chuẩn mực.

### Quyết định Kiến trúc
- **Route độc lập**: `/ingredients`, bảo vệ bằng `authGuard` và `smartPermissionGuard` với policy `TooHungry.Ingredients`.
- **Sidebar Navigation**: Bổ sung menu item `::Menu:Ingredients` vào `route.provider.ts` dưới nhóm `::Menu:InventoryGroup`, thứ tự hiển thị ưu tiên trước `/inventory`.
- **Component**: Tạo component độc lập `IngredientComponent` tại `angular/src/app/ingredient/` sử dụng các component dùng chung:
  - `<app-shared-table>`: Bảng dữ liệu có phân trang, chọn số dòng, responsive.
  - `<app-shared-modal>`: Form thêm/sửa, form xác nhận tạm ngưng nhập lý do, form khôi phục thông minh.
  - `<app-custom-select>`: Dropdown chọn Đơn vị tính từ RM-004, chọn loại bảo quản, chọn tiêu hao.
- **Phong cách Thiết kế**: Chuẩn Cam & Trắng (Orange & White Theme) theo Hiến pháp Acme.TooHungry.
