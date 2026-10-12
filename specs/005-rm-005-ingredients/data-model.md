# Mô hình Dữ liệu (Data Model): Quản lý Nguyên liệu (RM-005)

**Tính năng**: Quản lý Nguyên liệu (Ingredients) (RM-005)  
**Ngày**: 2026-10-08  
**Đặc tả**: [spec.md](./spec.md)

---

## 1. Thực thể Domain (Domain Entities)

### `Ingredient`
- **Lớp cơ sở**: `FullAuditedAggregateRoot<Guid>` (kế thừa tự động `Id`, `CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `IsDeleted`, `DeletionTime`, `DeleterId`).
- **Bảng CSDL**: `AppIngredients`
- **Các thuộc tính**:

| Thuộc tính | Kiểu dữ liệu | Ràng buộc / Độ dài | Mô tả |
|---|---|---|---|
| `Id` | `Guid` | Primary Key | Khóa chính duy nhất của nguyên liệu |
| `Name` | `string` | Required, Max 128, Unique | Tên nguyên liệu (chuẩn hóa trim, không phân biệt hoa/thường) |
| `BaseUnit` | `string` | Required, Max 32 | Tên/Viết tắt đơn vị tính cơ bản (liên kết logic với `Unit` RM-004) |
| `MinStock` | `decimal` | Precision(18, 4), >= 0 | Định mức tồn kho tối thiểu để cảnh báo nhập hàng (mặc định 0) |
| `EstimatedPrice` | `decimal` | Precision(18, 2), >= 0 | Đơn giá tham khảo cho 1 đơn vị tính (mặc định 0, phục vụ tính giá vốn món) |
| `StorageType` | `StorageType` | Enum (0 hoặc 1) | Điều kiện bảo quản: `SHORT_TERM` (0) hoặc `LONG_TERM` (1) |
| `ConsumptionMethod` | `ConsumptionMethod` | Enum (0 hoặc 1) | Cách thức tiêu hao: `RECIPE` (0) hoặc `MANUAL` (1) |
| `IsActive` | `bool` | Default `true` | Trạng thái hoạt động (`true`: Đang dùng, `false`: Tạm ngưng) |
| `DeactivationReason` | `string?` | Max 500, Nullable | Lý do tạm ngưng sử dụng (bắt buộc khi `IsActive = false`) |

- **Các phương thức nghiệp vụ Domain (Domain Methods)**:
  - `SetName(string name)`: Kiểm tra không rỗng và gán tên đã trim.
  - `SetBaseUnit(string baseUnit)`: Kiểm tra không rỗng và gán đơn vị tính đã trim.
  - `SetEstimatedPrice(decimal price)`: Kiểm tra price >= 0 và gán giá.
  - `Update(name, baseUnit, minStock, estimatedPrice, storageType, consumptionMethod)`: Cập nhật thông tin toàn diện.
  - `Deactivate(string reason)`: Gán `IsActive = false`, ghi nhận `DeactivationReason`.
  - `Reactivate()`: Gán `IsActive = true`, xóa `DeactivationReason`.
  - `Restore(decimal newMinStock)`: Kích hoạt lại kèm cập nhật `MinStock`.

---

## 2. Enums Phụ trợ

### `StorageType` (trong `Acme.TooHungry.Domain.Shared`)
```csharp
public enum StorageType
{
    SHORT_TERM = 0, // Bảo quản ngắn hạn / Tươi sống (cần lạnh/mát)
    LONG_TERM = 1   // Bảo quản dài hạn / Đồ khô, gia vị, đồ hộp
}
```

### `ConsumptionMethod` (trong `Acme.TooHungry.Domain.Shared`)
```csharp
public enum ConsumptionMethod
{
    RECIPE = 0, // Tự động trừ kho theo công thức món ăn khi hoàn tất đơn hàng
    MANUAL = 1  // Trừ kho thủ công qua kiểm kê ca hoặc xuất hủy
}
```

---

## 3. Domain Service: `IngredientManager`

- **Vị trí**: `src/Acme.TooHungry.Domain/Ingredients/IngredientManager.cs`
- **Các phương thức**:
  1. `Task<Ingredient> CreateAsync(string name, string baseUnit, decimal minStock, decimal estimatedPrice, StorageType storageType, ConsumptionMethod consumptionMethod)`
     - Kiểm tra trùng lặp tên (`Name.ToLower()`).
     - Nếu trùng với bản ghi đang hoạt động -> Ném `BusinessException("Ingredient:NameAlreadyExists")`.
     - Nếu trùng với bản ghi đã tạm ngưng (`IsActive = false`) -> Ném `BusinessException("Ingredient:AlreadyExistsInactive")` kèm Id của bản ghi cũ để hỗ trợ khôi phục.
  2. `Task UpdateAsync(Ingredient ingredient, string newName, string newBaseUnit, decimal newMinStock, decimal newEstimatedPrice, StorageType storageType, ConsumptionMethod consumptionMethod)`
     - Kiểm tra trùng tên nếu đổi tên mới.
     - Kiểm tra khóa trường đơn vị tính: Nếu `newBaseUnit` khác `ingredient.BaseUnit`, gọi `CheckCanChangeUnitAsync(ingredient.Id)`. Nếu không được phép, ném `UserFriendlyException`.
  3. `Task CheckCanDeleteAsync(Guid ingredientId)`
     - Kiểm tra xem nguyên liệu có tồn tại trong bảng `RecipeIngredients` hay không (`_recipeIngredientRepository.AnyAsync(x => x.IngredientId == ingredientId)`).
     - Kiểm tra xem nguyên liệu có lô kho nào trong bảng `InventoryBatches` hay không (`_batchRepository.AnyAsync(x => x.IngredientId == ingredientId)`).
     - Nếu vi phạm bất kỳ điều kiện nào -> Ném `UserFriendlyException` giải thích rõ lý do và yêu cầu chuyển sang Tạm ngưng (`Deactivate`).
  4. `Task<bool> CanChangeUnitAsync(Guid ingredientId)`
     - Trả về `false` nếu nguyên liệu đã có trong `RecipeIngredients` hoặc `InventoryBatches`, ngược lại trả về `true`.

---

## 4. Đối tượng Chuyển giao Dữ liệu (DTOs)

### `IngredientDto`
- `Id`: `Guid`
- `Name`: `string`
- `BaseUnit`: `string`
- `UnitName`: `string` (getter fallback = BaseUnit)
- `UnitId`: `Guid?`
- `MinStock`: `decimal`
- `EstimatedPrice`: `decimal`
- `StorageType`: `StorageType`
- `ConsumptionMethod`: `ConsumptionMethod`
- `CurrentStock`: `decimal` (Tồn kho an toàn còn hạn: `ExpiryDate >= Today`)
- `ExpiredStock`: `decimal` (Tồn kho quá hạn: `ExpiryDate < Today`)
- `CanEditUnit`: `bool` (Cờ cho phép sửa đơn vị tính trên UI)
- `IsActive`: `bool`
- `DeactivationReason`: `string?`

### `CreateIngredientDto`
- `Name`: `string` (Required, Max 128)
- `BaseUnit`: `string` (Required, Max 32)
- `UnitId`: `Guid?`
- `MinStock`: `decimal` (>= 0, default 0)
- `EstimatedPrice`: `decimal` (>= 0, default 0)
- `StorageType`: `StorageType` (default `SHORT_TERM`)
- `ConsumptionMethod`: `ConsumptionMethod` (default `RECIPE`)

### `UpdateIngredientDto`
- `Name`: `string` (Required, Max 128)
- `BaseUnit`: `string` (Required, Max 32)
- `UnitId`: `Guid?`
- `MinStock`: `decimal` (>= 0)
- `EstimatedPrice`: `decimal` (>= 0)
- `StorageType`: `StorageType`
- `ConsumptionMethod`: `ConsumptionMethod`

### `GetIngredientsInput`
- `Filter`: `string?`
- `StorageType`: `StorageType?`
- `ConsumptionMethod`: `ConsumptionMethod?`
- `IsActive`: `bool?` (Mặc định `true` trên client)
- `SkipCount`: `int`
- `MaxResultCount`: `int`
- `Sorting`: `string?`

### `SmartRestoreDto`
- `NewMinStock`: `decimal`

### `DeactivateInput`
- `Reason`: `string` (Required, Max 500)

---

## 5. Các Mối quan hệ và Ràng buộc Toàn vẹn (Relationships & Constraints)

1. **Quan hệ với `Unit` (RM-004)**:
   - `Ingredient.BaseUnit` liên kết logic với `Unit.Name` hoặc `Unit.Abbreviation`.
   - `UnitManager` (RM-004) chặn xóa `Unit` nếu có bất kỳ `Ingredient` nào đang sử dụng đơn vị đó.
2. **Quan hệ với `RecipeIngredient` (RM-007)**:
   - Một nguyên liệu có thể tham gia vào nhiều công thức món ăn (Quan hệ 1 - N).
   - `IngredientManager` chặn xóa `Ingredient` nếu `RecipeIngredient` đang tham chiếu đến nó.
3. **Quan hệ với `InventoryBatch` (RM-012)**:
   - Một nguyên liệu có nhiều lô hàng kho (Quan hệ 1 - N).
   - `IngredientManager` chặn xóa `Ingredient` nếu đã có `InventoryBatch` gắn với nó.
