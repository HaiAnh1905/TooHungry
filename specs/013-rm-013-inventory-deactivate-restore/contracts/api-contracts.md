# Giai đoạn 1: Hợp đồng API (API Contracts) - RM-013

**Tính năng**: `RM-013` - Tồn kho - Khóa/Khôi phục (Inventory Deactivate & Restore)  
**Nhánh (Branch)**: `013-rm-013-inventory-deactivate-restore`  
**Ngày cập nhật**: 2026-10-12  

Tất cả các API được cung cấp bởi `Acme.TooHungry.Application` / `Acme.TooHungry.HttpApi.Host` và bảo vệ bằng phân quyền ABP (`[Authorize(...)]`).

---

## 1. Phân hệ Mặt hàng Tồn kho / Nguyên liệu (`IngredientAppService`)

### 1.1. Vô hiệu hóa Mặt hàng Tồn kho kèm Dây chuyền (Deactivate Ingredient with Cascading)
- **HTTP Method**: `POST`
- **Route**: `/api/app/ingredient/{id}/deactivate`
- **Quyền**: `TooHungryPermissions.Inventories.Edit` hoặc `TooHungryPermissions.Inventories.Delete` (chỉ `Manager`, `Admin`)
- **Request Body**:
  ```json
  {
    "reason": "Ngừng nhập từ nhà cung cấp cũ"
  }
  ```
- **Validation**: `reason` bắt buộc, độ dài từ 1 đến 500 ký tự.
- **Hành vi xử lý (Cascading Execution)**:
  1. Cập nhật `Ingredient.IsActive = false`, `Ingredient.DeactivationReason = reason`.
  2. Tìm mọi `Recipe` chứa nguyên liệu này (qua `RecipeIngredient`): gọi `recipe.Deactivate(...)`.
  3. Tìm mọi `Dish` tương ứng: gọi `dish.Deactivate(...)`.
  4. Cập nhật nhãn `[Đã ngừng phục vụ]` trên `DailyMenuItem` tương ứng, POS loại khỏi danh sách đặt món mới.
  5. Giữ nguyên các đơn hàng POS dở dang tại bàn để phục vụ và thanh toán bình thường.
- **Response**: `200 OK` (`IngredientDto`).

---

### 1.2. Kích hoạt lại Mặt hàng Tồn kho (Reactivate Ingredient)
- **HTTP Method**: `POST`
- **Route**: `/api/app/ingredient/{id}/reactivate`
- **Quyền**: `TooHungryPermissions.Inventories.Edit` (chỉ `Manager`, `Admin`)
- **Request Body**: *None*
- **Hành vi xử lý**:
  - Cập nhật `Ingredient.IsActive = true`, xóa trắng `Ingredient.DeactivationReason = null`.
  - Giữ nguyên các `Recipe` và `Dish` liên quan ở trạng thái Inactive để Bếp trưởng/Quản lý chủ động rà soát thủ công.
- **Response**: `200 OK` (`IngredientDto`).

---

### 1.3. Khôi phục Thông minh khi Thiết lập Kho (Smart Restore Ingredient)
- **HTTP Method**: `POST`
- **Route**: `/api/app/ingredient/{id}/smart-restore`
- **Quyền**: `TooHungryPermissions.Inventories.Create` hoặc `TooHungryPermissions.Inventories.Edit`
- **Request Body**:
  ```json
  {
    "minStock": 15.5
  }
  ```
- **Hành vi xử lý**:
  - Gọi `ingredient.Restore(input.MinStock)`.
  - Phục hồi khả dụng, cập nhật ngưỡng tồn tối thiểu mới.
- **Response**: `200 OK` (`IngredientDto`).

---

### 1.4. Lấy Danh sách Nguyên liệu Bị Vô hiệu hóa (Get Deactivated Ingredients)
- **HTTP Method**: `GET`
- **Route**: `/api/app/ingredient` với tham số `isActive=false` (hoặc `/api/app/ingredient/deactivated`)
- **Quyền**: `TooHungryPermissions.Inventories.Default`
- **Query Params**:
  - `IsActive`: `bool?` (`false` để lấy danh sách vô hiệu hóa cho route `/ingredients/deactivated`)
  - `Filter`: `string?`
  - `SkipCount`: `int` (mặc định 0)
  - `MaxResultCount`: `int` (mặc định 10)
- **Response**: `200 OK` (`PagedResultDto<IngredientDto>`).

---

## 2. Phân hệ Lô hàng Tồn kho (`InventoryAppService`)

### 2.1. Tạm khóa Lô hàng cụ thể (Deactivate Inventory Batch)
- **HTTP Method**: `POST`
- **Route**: `/api/app/inventory/batches/{id}/deactivate`
- **Quyền**: `TooHungryPermissions.Inventories.Adjust` (cả `WarehouseKeeper`, `Manager`, `Admin`)
- **Request Body**:
  ```json
  {
    "reasonCode": "QUALITY_INSPECTION",
    "reason": "Chờ kiểm định chất lượng bao bì có dấu hiệu móp méo"
  }
  ```
- **Validation**:
  - `reason`: Bắt buộc, độ dài 1 - 500 ký tự.
- **Hành vi xử lý**:
  - Cập nhật `InventoryBatch.IsActive = false`, lưu `DeactivationReason`.
  - Thuật toán xuất kho FEFO tự động loại trừ lô này ra khỏi danh sách tính toán trừ kho.
  - Số lượng còn lại (`RemainingQuantity`) được giữ nguyên, không sinh giao dịch trừ kho (khác với xuất hủy Discard).
- **Response**: `200 OK` (`InventoryBatchDto`).

---

### 2.2. Khôi phục Lô hàng Tồn kho (Reactivate Inventory Batch)
- **HTTP Method**: `POST`
- **Route**: `/api/app/inventory/batches/{id}/reactivate`
- **Quyền**: `TooHungryPermissions.Inventories.Adjust` (cả `WarehouseKeeper`, `Manager`, `Admin`)
- **Request Body**: *None*
- **Hành vi xử lý**:
  - Cập nhật `InventoryBatch.IsActive = true`, xóa `DeactivationReason = null`.
  - Lô hàng được đưa trở lại danh sách xuất kho FEFO bình thường.
- **Response**: `200 OK` (`InventoryBatchDto`).

---

### 2.3. Lấy Danh sách Lô hàng hỗ trợ Bộ lọc Trạng thái (Get Batches with Filter)
- **HTTP Method**: `GET`
- **Route**: `/api/app/inventory/batches`
- **Query Params**:
  - `IngredientId`: `Guid?`
  - `IsActive`: `bool?` (`null` = Tất cả, `true` = Chỉ lô đang hoạt động, `false` = Chỉ lô bị tạm khóa)
  - `Filter`: `string?`
  - `SkipCount`: `int`
  - `MaxResultCount`: `int`
- **Response**: `200 OK` (`PagedResultDto<InventoryBatchDto>` với trường `isActive` và `deactivationReason`).
