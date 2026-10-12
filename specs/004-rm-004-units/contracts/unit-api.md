# Hợp đồng Giao diện Lập trình (API Contract): Quản lý Đơn vị tính (RM-004)

**Tính năng**: `004-rm-004-units`
**Base URL**: `/api/app/unit`
**Xác thực**: Bearer JWT Token

---

## 1. Lấy thông tin chi tiết một Đơn vị tính

- **Endpoint**: `GET /api/app/unit/{id}`
- **Quyền yêu cầu**: `TooHungryPermissions.Units.Default`
- **Tham số Path**: `id` (`Guid`) - Id của đơn vị tính cần lấy.

### Response `200 OK`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Kilogram",
  "abbreviation": "Kg",
  "isActive": true,
  "creationTime": "2026-10-08T07:00:00Z",
  "creatorId": "12345678-1234-1234-1234-123456789abc",
  "lastModificationTime": null,
  "lastModifierId": null
}
```

### Error `404 Not Found`
```json
{
  "error": {
    "code": "Volo.EntityNotFound",
    "message": "Không tìm thấy thực thể Unit với khóa 3fa85f64-5717-4562-b3fc-2c963f66afa6!"
  }
}
```

---

## 2. Lấy danh sách Đơn vị tính (Phân trang & Sắp xếp)

- **Endpoint**: `GET /api/app/unit`
- **Quyền yêu cầu**: `TooHungryPermissions.Units.Default`
- **Tham số Query**:
  - `SkipCount`: `int` (mặc định 0)
  - `MaxResultCount`: `int` (mặc định 10)
  - `Sorting`: `string` (ví dụ: `"Name asc"` hoặc `"Name desc"`)

### Response `200 OK`
```json
{
  "totalCount": 2,
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Gam",
      "abbreviation": "g",
      "isActive": true,
      "creationTime": "2026-10-08T07:00:00Z"
    },
    {
      "id": "4ba85f64-5717-4562-b3fc-2c963f66afa7",
      "name": "Kilogram",
      "abbreviation": "Kg",
      "isActive": true,
      "creationTime": "2026-10-08T07:00:00Z"
    }
  ]
}
```

---

## 3. Tạo mới Đơn vị tính

- **Endpoint**: `POST /api/app/unit`
- **Quyền yêu cầu**: `TooHungryPermissions.Units.Create`
- **Request Body**:
```json
{
  "name": "Bao",
  "abbreviation": "Bao",
  "isActive": true
}
```
*(Ghi chú: Nếu `abbreviation` để trống hoặc null, Backend tự động gán bằng `name`)*

### Response `200 OK`
```json
{
  "id": "5ca85f64-5717-4562-b3fc-2c963f66afa8",
  "name": "Bao",
  "abbreviation": "Bao",
  "isActive": true,
  "creationTime": "2026-10-08T07:10:00Z"
}
```

### Error `403 Forbidden` / `UserFriendlyException` (Trùng tên)
```json
{
  "error": {
    "code": "Acme.TooHungry.UnitAlreadyExists",
    "message": "Đơn vị tính 'Bao' đã tồn tại!"
  }
}
```

---

## 4. Cập nhật Đơn vị tính

- **Endpoint**: `PUT /api/app/unit/{id}`
- **Quyền yêu cầu**: `TooHungryPermissions.Units.Edit`
- **Tham số Path**: `id` (`Guid`) - Id của đơn vị tính cần cập nhật.
- **Request Body**:
```json
{
  "name": "Bao lớn",
  "abbreviation": "Bao",
  "isActive": true
}
```

### Response `200 OK`
```json
{
  "id": "5ca85f64-5717-4562-b3fc-2c963f66afa8",
  "name": "Bao lớn",
  "abbreviation": "Bao",
  "isActive": true,
  "lastModificationTime": "2026-10-08T07:15:00Z"
}
```

---

## 5. Xóa Đơn vị tính

- **Endpoint**: `DELETE /api/app/unit/{id}`
- **Quyền yêu cầu**: `TooHungryPermissions.Units.Delete`
- **Tham số Path**: `id` (`Guid`) - Id của đơn vị tính cần xóa.

### Response `204 No Content`

### Error `400 Bad Request` / `UserFriendlyException` (Chặn xóa đơn vị mặc định)
```json
{
  "error": {
    "code": "Acme.TooHungry.CannotDeleteDefaultUnit",
    "message": "Không thể xóa đơn vị tính mặc định của hệ thống!"
  }
}
```

### Error `400 Bad Request` / `UserFriendlyException` (Chặn xóa đơn vị đang sử dụng)
```json
{
  "error": {
    "code": "Acme.TooHungry.UnitIsInUse",
    "message": "Không thể xóa đơn vị tính này vì đang được sử dụng bởi các nguyên liệu trong hệ thống!"
  }
}
```
