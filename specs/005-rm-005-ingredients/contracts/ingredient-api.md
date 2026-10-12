# Hợp đồng API (API Contracts): Quản lý Nguyên liệu (RM-005)

**Dịch vụ**: `IIngredientAppService`  
**Đường dẫn gốc (Base Route)**: `/api/app/ingredient`  
**Host**: `Acme.TooHungry.HttpApi.Host`  
**Phân quyền (Permissions)**: `TooHungryPermissions.Ingredients.*`

---

## 1. Danh sách Endpoints

| Method | Endpoint | Quyền yêu cầu | Mô tả |
|---|---|---|---|
| **GET** | `/api/app/ingredient` | `TooHungry.Ingredients` | Lấy danh sách nguyên liệu phân trang, lọc theo trạng thái/bảo quản/tiêu hao |
| **GET** | `/api/app/ingredient/{id}` | `TooHungry.Ingredients` | Lấy thông tin chi tiết một nguyên liệu |
| **POST** | `/api/app/ingredient` | `TooHungry.Ingredients.Create` | Thêm mới nguyên liệu (kiểm tra trùng tên, bắt buộc chọn Unit) |
| **PUT** | `/api/app/ingredient/{id}` | `TooHungry.Ingredients.Edit` | Cập nhật nguyên liệu (khóa đơn vị tính nếu đã phát sinh dữ liệu) |
| **DELETE** | `/api/app/ingredient/{id}` | `TooHungry.Ingredients.Delete` | Xóa an toàn nguyên liệu (chặn nếu có Recipe hoặc Batch) |
| **POST** | `/api/app/ingredient/{id}/deactivate` | `TooHungry.Ingredients.Edit` | Tạm ngưng hoạt động nguyên liệu kèm lý do bắt buộc |
| **POST** | `/api/app/ingredient/{id}/reactivate` | `TooHungry.Ingredients.Edit` | Kích hoạt lại nguyên liệu đã tạm ngưng |
| **POST** | `/api/app/ingredient/{id}/smart-restore` | `TooHungry.Ingredients.Edit` | Khôi phục thông minh nguyên liệu kèm cập nhật định mức tồn mới |

---

## 2. Chi tiết Endpoints & DTOs

### 2.1. Lấy danh sách nguyên liệu (`GET /api/app/ingredient`)

**Query Parameters (`GetIngredientsInput`)**:
- `Filter`: `string?` (Tìm kiếm theo tên nguyên liệu)
- `StorageType`: `int?` (`0`: SHORT_TERM, `1`: LONG_TERM)
- `ConsumptionMethod`: `int?` (`0`: RECIPE, `1`: MANUAL)
- `IsActive`: `bool?` (`true`: Đang dùng, `false`: Tạm ngưng, `null`: Tất cả)
- `SkipCount`: `int` (mặc định 0)
- `MaxResultCount`: `int` (mặc định 10)
- `Sorting`: `string?` (mặc định `"CreationTime desc"`)

**Response (`PagedResultDto<IngredientDto>`)**:
```json
{
  "totalCount": 25,
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Thịt bò Wagyu A5",
      "baseUnit": "Kg",
      "unitName": "Kg",
      "unitId": "8fa85f64-5717-4562-b3fc-2c963f66afa1",
      "minStock": 5.0,
      "estimatedPrice": 1200000.0,
      "storageType": 0,
      "consumptionMethod": 0,
      "currentStock": 12.5,
      "expiredStock": 0.0,
      "canEditUnit": false,
      "isActive": true,
      "deactivationReason": null,
      "creationTime": "2026-10-08T08:00:00Z"
    }
  ]
}
```

---

### 2.2. Thêm mới nguyên liệu (`POST /api/app/ingredient`)

**Request Body (`CreateIngredientDto`)**:
```json
{
  "name": "Thịt thăn bò",
  "baseUnit": "Kg",
  "unitId": "8fa85f64-5717-4562-b3fc-2c963f66afa1",
  "minStock": 10.0,
  "estimatedPrice": 250000.0,
  "storageType": 0,
  "consumptionMethod": 0
}
```

**Response (`IngredientDto`)**: HTTP 200 OK với dữ liệu bản ghi vừa tạo.

**Lỗi thường gặp**:
- HTTP 403: Không có quyền `TooHungry.Ingredients.Create`.
- HTTP 400 (`Ingredient:NameAlreadyExists`): Tên nguyên liệu đã tồn tại.
- HTTP 400 (`Ingredient:AlreadyExistsInactive`): Tên đã tồn tại ở trạng thái tạm ngưng (kèm `data.IngredientId`).

---

### 2.3. Cập nhật nguyên liệu (`PUT /api/app/ingredient/{id}`)

**Request Body (`UpdateIngredientDto`)**:
```json
{
  "name": "Thịt thăn bò Úc",
  "baseUnit": "Kg",
  "unitId": "8fa85f64-5717-4562-b3fc-2c963f66afa1",
  "minStock": 15.0,
  "estimatedPrice": 280000.0,
  "storageType": 0,
  "consumptionMethod": 0
}
```

**Lỗi thường gặp**:
- HTTP 400 (`UserFriendlyException`): Không thể đổi đơn vị tính của nguyên liệu vì đã phát sinh lô tồn kho hoặc đã được gắn vào công thức món ăn.

---

### 2.4. Xóa an toàn nguyên liệu (`DELETE /api/app/ingredient/{id}`)

**Response**: HTTP 204 No Content.

**Lỗi thường gặp**:
- HTTP 400 (`UserFriendlyException`): *"Không thể xóa nguyên liệu này vì đang được sử dụng trong công thức món ăn! Vui lòng chuyển sang chức năng Tạm ngưng."*
- HTTP 400 (`UserFriendlyException`): *"Không thể xóa nguyên liệu này vì đã phát sinh các lô hàng tồn kho trong hệ thống! Vui lòng chuyển sang chức năng Tạm ngưng."*

---

### 2.5. Tạm ngưng hoạt động (`POST /api/app/ingredient/{id}/deactivate`)

**Request Body**:
```json
{
  "reason": "Nhà cung cấp tạm hết hàng do dịch bệnh"
}
```

**Response**: `IngredientDto` với `isActive = false` và `deactivationReason` tương ứng.

---

### 2.6. Khôi phục thông minh (`POST /api/app/ingredient/{id}/smart-restore`)

**Request Body**:
```json
{
  "newMinStock": 10.0
}
```

**Response**: `IngredientDto` với `isActive = true`, `deactivationReason = null` và `minStock = 10.0`.
