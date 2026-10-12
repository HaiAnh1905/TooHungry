# Giai đoạn 1: Mô hình Dữ liệu (Data Model) - RM-013

**Tính năng**: `RM-013` - Tồn kho - Khóa/Khôi phục (Inventory Deactivate & Restore)  
**Nhánh (Branch)**: `013-rm-013-inventory-deactivate-restore`  
**Ngày cập nhật**: 2026-10-12  

---

## 1. Sơ đồ Thực thể (Entity Relationship Diagram - ERD)

```mermaid
erDiagram
    Ingredient ||--o{ InventoryBatch : "quản lý theo các lô hàng"
    InventoryBatch ||--o{ InventoryTransaction : "sinh lịch sử biến động"
    Ingredient ||--o{ RecipeIngredient : "dùng trong công thức"
    Recipe ||--o{ RecipeIngredient : "gồm nhiều nguyên liệu"
    Dish ||--o| Recipe : "có công thức chế biến"
    Dish ||--o{ DailyMenuItem : "phục vụ trong thực đơn"

    Ingredient {
        Guid Id PK
        string Name "Tên nguyên liệu"
        string BaseUnit "Đơn vị tính cơ sở"
        decimal MinStock "Ngưỡng tồn kho tối thiểu"
        decimal EstimatedPrice "Giá ước tính"
        StorageType StorageType "Loại bảo quản (FRESH, SHORT_TERM, LONG_TERM)"
        ConsumptionMethod ConsumptionMethod "Phương thức tiêu hao (RECIPE, MANUAL, HYBRID)"
        bool IsActive "Trạng thái hoạt động (Mặc định: true)"
        string DeactivationReason "Lý do vô hiệu hóa (Tối đa 500 ký tự)"
    }

    InventoryBatch {
        Guid Id PK
        Guid IngredientId FK "Liên kết nguyên liệu"
        string BatchCode "Mã định danh lô hàng"
        decimal Quantity "Số lượng nhập ban đầu"
        decimal RemainingQuantity "Số lượng tồn còn lại"
        string PurchaseUnit "Đơn vị nhập"
        decimal ConversionFactor "Hệ số quy đổi sang BaseUnit"
        DateTime ReceivedAt "Ngày nhập kho"
        DateTime ExpiryDate "Hạn sử dụng"
        decimal UnitCost "Đơn giá vốn"
        bool IsActive "Cờ khả dụng xuất kho FEFO (Mặc định: true)"
        string DeactivationReason "Lý do tạm khóa lô (MỚI BỔ SUNG - Tối đa 500 ký tự)"
    }

    Recipe {
        Guid Id PK
        Guid DishId FK "Liên kết món ăn"
        string Name "Tên công thức"
        bool IsActive "Cờ trạng thái hoạt động công thức"
        string DeactivationReason "Lý do vô hiệu hóa dây chuyền"
    }

    Dish {
        Guid Id PK
        string Name "Tên món ăn"
        decimal Price "Đơn giá bán"
        bool IsActive "Trạng thái phục vụ món ăn"
        string DeletionReason "Lý do vô hiệu hóa dây chuyền"
    }

    DailyMenuItem {
        Guid Id PK
        Guid DailyMenuId FK
        Guid DishId FK
        string Note "Ghi chú món ăn (chứa [Đã ngừng phục vụ] khi bị khóa)"
    }
```

---

## 2. Chi tiết Thuộc tính & Ràng buộc Cơ sở Dữ liệu

### 2.1. Thực thể `Ingredient` (Domain: `Acme.TooHungry.Ingredients`)
Kế thừa: `FullAuditedAggregateRoot<Guid>`

| Tên trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả & Quy tắc nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| `Id` | `Guid` | Có | Sinh tự động | Khóa chính. |
| `Name` | `string` | Có | - | Tên nguyên liệu (Tối đa 128 ký tự, Unique). |
| `BaseUnit` | `string` | Có | - | Đơn vị đo lường cơ sở (kg, lít, hộp,...). |
| `MinStock` | `decimal` | Có | `0` | Ngưỡng tồn tối thiểu để kích hoạt cảnh báo thiếu hàng. |
| `IsActive` | `bool` | Có | `true` | Cờ trạng thái hoạt động. Khi `false`, mặt hàng bị khóa ở kho và kích hoạt Cascading Deactivation. |
| `DeactivationReason`| `string?` | Không | `null` | Lý do giải trình khi người quản lý thực hiện vô hiệu hóa (Tối đa 500 ký tự). |

**Phương thức Domain**:
- `Deactivate(string reason)`: Chuyển `IsActive = false`, gán `DeactivationReason = reason.Trim()`.
- `Reactivate()`: Chuyển `IsActive = true`, xóa `DeactivationReason = null`.
- `Restore(decimal newMinStock)`: Chuyển `IsActive = true`, xóa `DeactivationReason = null`, cập nhật `MinStock = newMinStock`.

---

### 2.2. Thực thể `InventoryBatch` (Domain: `Acme.TooHungry.Inventories`)
Kế thừa: `FullAuditedAggregateRoot<Guid>`

| Tên trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả & Quy tắc nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| `Id` | `Guid` | Có | Sinh tự động | Khóa chính. |
| `IngredientId` | `Guid` | Có | - | Khóa ngoại trỏ đến `Ingredient`. |
| `BatchCode` | `string` | Có | - | Mã lô hàng (ví dụ: `BATCH-20261012-001`). |
| `RemainingQuantity`| `decimal` | Có | - | Số lượng còn lại khả dụng xuất kho. |
| `ExpiryDate` | `DateTime` | Có | - | Hạn sử dụng lô hàng (dùng cho thuật toán FEFO). |
| `IsActive` | `bool` | Có | `true` | Khi `false`, thuật toán FEFO tự động bỏ qua lô này khi xuất kho bán hàng. |
| `DeactivationReason`| `string?` | Không | `null` | **(MỚI)** Lý do tạm khóa lô (chọn từ danh mục mẫu hoặc ghi chú, tối đa 500 ký tự). |

**Phương thức Domain**:
- `Deactivate(string reason)`: Chuyển `IsActive = false`, gán `DeactivationReason = reason.Trim()`.
- `Reactivate()`: Chuyển `IsActive = true`, xóa `DeactivationReason = null`.

---

### 2.3. Thực thể `Recipe` & `Dish` (Dây chuyền Cascading)
- **`Recipe.Deactivate(string reason)`**: Chuyển `Recipe.IsActive = false`, lưu lý do: `$"Vô hiệu hóa do nguyên liệu '{Ingredient.Name}' bị vô hiệu hóa: {Reason}"`.
- **`Dish.Deactivate(string reason)`**: Chuyển `Dish.IsActive = false`, lưu lý do: `$"Vô hiệu hóa do nguyên liệu '{Ingredient.Name}' bị vô hiệu hóa: {Reason}"`.
- **`DailyMenuItem`**: Cập nhật `Note` thêm nhãn `[Đã ngừng phục vụ]`, POS ngăn chặn việc chọn món mới.

---

## 3. Danh mục Lý do Tạm khóa Lô hàng Mẫu (Predefined Batch Deactivation Reasons)

| Mã lý do (Key) | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) |
| :--- | :--- | :--- |
| `QUALITY_INSPECTION` | Chờ kiểm định chất lượng an toàn | Awaiting quality inspection |
| `SUSPECTED_SPOILAGE` | Nghi ngờ biến chất / hư hỏng trong lưu kho | Suspected spoilage during storage |
| `PACKAGING_DEFECT` | Lỗi quy cách / rách hỏng bao bì | Packaging defect or damaged container |
| `OTHER` | Lý do khác (yêu cầu ghi chú chi tiết) | Other (detailed note required) |
