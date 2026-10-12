# Hợp đồng API: Quản lý Khu vực Ăn uống (Dining Area API)

**Dịch vụ**: `IDiningAreaAppService`  
**Đường dẫn cơ sở**: `/api/app/dining-area`  
**Xác thực**: Bearer JWT (OpenIddict)  

---

### 1. Lấy Danh sách Khu vực Ăn uống
- **Phương thức / Điểm cuối**: `GET /api/app/dining-area`
- **Quyền**: `TooHungryPermissions.DiningAreas.Default` (hoặc `View`)
- **Tham số truy vấn**:
  - `Filter` (`string?`): Từ khóa tìm kiếm theo tên hoặc mô tả
  - `IsActive` (`bool?`): Lọc theo trạng thái khả dụng (null = lấy tất cả)
  - `SkipCount` (`int`): Bỏ qua số bản ghi
  - `MaxResultCount` (`int`): Số lượng bản ghi tối đa
- **Phản hồi** (`200 OK`):
  ```json
  {
    "totalCount": 3,
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "name": "Tầng 1 - Sảnh chính",
        "description": "Khu vực tiếp đón khách trung tâm",
        "isActive": true,
        "tableCount": 12,
        "creationTime": "2026-10-09T08:00:00Z"
      }
    ]
  }
  ```

---

### 2. Lấy Danh sách Lựa chọn Nhanh (Lookup cho Dropdown/Tabs)
- **Phương thức / Điểm cuối**: `GET /api/app/dining-area/lookup`
- **Quyền**: `TooHungryPermissions.DiningAreas.Default`
- **Phản hồi** (`200 OK`):
  ```json
  {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "name": "Tầng 1 - Sảnh chính",
        "isActive": true,
        "tableCount": 12
      }
    ]
  }
  ```

---

### 3. Tạo mới Khu vực Ăn uống
- **Phương thức / Điểm cuối**: `POST /api/app/dining-area`
- **Quyền**: `TooHungryPermissions.DiningAreas.Create` (hoặc `Manage`)
- **Nội dung yêu cầu**:
  ```json
  {
    "name": "Sân vườn ngoài trời",
    "description": "Không gian thoáng mát nhiều cây xanh",
    "isActive": true
  }
  ```
- **Phản hồi** (`201 Created` / `200 OK`): `DiningAreaDto`
- **Lỗi**:
  - `400 Bad Request`: Tên khu vực để trống hoặc vượt quá 128 ký tự.

---

### 4. Cập nhật Thông tin Khu vực
- **Phương thức / Điểm cuối**: `PUT /api/app/dining-area/{id}`
- **Quyền**: `TooHungryPermissions.DiningAreas.Edit` (hoặc `Manage`)
- **Nội dung yêu cầu**:
  ```json
  {
    "name": "Sân vườn ngoài trời (Đã nâng cấp)",
    "description": "Có thêm mái che tự động",
    "isActive": true
  }
  ```
- **Phản hồi** (`200 OK`): `DiningAreaDto`

---

### 5. Vô hiệu hóa Khu vực (Deactivate)
- **Phương thức / Điểm cuối**: `POST /api/app/dining-area/{id}/deactivate`
- **Quyền**: `TooHungryPermissions.DiningAreas.Delete` (hoặc `Manage`)
- **Phản hồi** (`200 OK`):
- **Lỗi**:
  - `400 / 403 BusinessException`: Nếu trong khu vực có bàn đang ở trạng thái `Occupied` hoặc có đơn hàng chưa hoàn tất.

---

### 6. Kích hoạt lại Khu vực (Activate)
- **Phương thức / Điểm cuối**: `POST /api/app/dining-area/{id}/activate`
- **Quyền**: `TooHungryPermissions.DiningAreas.Edit` (hoặc `Manage`)
- **Phản hồi** (`200 OK`):
