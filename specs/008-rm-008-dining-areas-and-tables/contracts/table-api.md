# Hợp đồng API: Quản lý Bàn ăn (Table API)

**Dịch vụ**: `ITableAppService`  
**Đường dẫn cơ sở**: `/api/app/table`  
**Xác thực**: Bearer JWT (OpenIddict)  

---

### 1. Lấy Danh sách Bàn ăn (Hỗ trợ phân trang, lọc theo Khu vực & Trạng thái)
- **Phương thức / Điểm cuối**: `GET /api/app/table`
- **Quyền**: `TooHungryPermissions.Tables.Default` (hoặc `View`)
- **Tham số truy vấn**:
  - `Filter` (`string?`): Tìm kiếm theo Tên bàn hoặc Vị trí
  - `DiningAreaId` (`Guid?`): Lọc theo Khu vực ăn uống cụ thể
  - `Status` (`TableStatus?`): Lọc theo trạng thái (0: Available, 1: Occupied, 2: Reserved, 3: Disabled, 4: Cleaning)
  - `SkipCount` (`int`): Số bản ghi bỏ qua
  - `MaxResultCount` (`int`): Số lượng bản ghi tối đa lấy về
- **Phản hồi** (`200 OK`):
  ```json
  {
    "totalCount": 20,
    "items": [
      {
        "id": "e6a00486-5085-48b9-873d-9e66c61bf6a7",
        "name": "Bàn 01",
        "capacity": 4,
        "status": 0,
        "diningAreaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "diningAreaName": "Tầng 1",
        "location": "Gần cửa kính nhìn ra vườn",
        "creationTime": "2026-10-09T08:15:00Z"
      }
    ]
  }
  ```

---

### 2. Tạo mới Bàn ăn
- **Phương thức / Điểm cuối**: `POST /api/app/table`
- **Quyền**: `TooHungryPermissions.Tables.Create` (hoặc `Manage`)
- **Nội dung yêu cầu**:
  ```json
  {
    "name": "Bàn 15",
    "capacity": 6,
    "diningAreaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "location": "Phòng góc yên tĩnh"
  }
  ```
- **Phản hồi** (`201 Created` / `200 OK`): `TableDto`
- **Lỗi**:
  - `400 Bad Request`: Tên bàn đã tồn tại trong toàn bộ hệ thống (`TooHungryDomainErrorCodes.TableAlreadyExists`).
  - `400 Bad Request`: Sức chứa nhỏ hơn 1 hoặc vượt quá 100, hoặc khu vực được chọn đang bị vô hiệu hóa (`IsActive = false`).

---

### 3. Cập nhật Thông tin Bàn ăn
- **Phương thức / Điểm cuối**: `PUT /api/app/table/{id}`
- **Quyền**: `TooHungryPermissions.Tables.Edit` (hoặc `Manage`)
- **Nội dung yêu cầu**:
  ```json
  {
    "name": "Bàn 15",
    "capacity": 8,
    "diningAreaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "location": "Gần cửa sổ lớn"
  }
  ```
- **Phản hồi** (`200 OK`): `TableDto`

---

### 4. Đổi Nhanh Trạng thái Bàn (Quick Status Change & Atomic Concurrency Check)
- **Phương thức / Điểm cuối**: `POST /api/app/table/{id}/change-status`
- **Quyền**: `TooHungryPermissions.Tables.UpdateStatus` (Waiter & Manager)
- **Nội dung yêu cầu**:
  ```json
  {
    "status": 1
  }
  ```
- **Phản hồi** (`200 OK`):
  ```json
  {
    "id": "e6a00486-5085-48b9-873d-9e66c61bf6a7",
    "name": "Bàn 01",
    "capacity": 4,
    "status": 1,
    "diningAreaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "diningAreaName": "Tầng 1",
    "location": "Gần cửa kính nhìn ra vườn"
  }
  ```
- **Side Effect**: Máy chủ phát sự kiện thời gian thực `TableStatusChanged` qua SignalR tới tất cả các client đang kết nối.
- **Lỗi**:
  - `400 Bad Request`: Nếu vi phạm luồng chuyển đổi trạng thái (ví dụ cố gắng đổi trạng thái bàn đang bị `INACTIVE` mà không kích hoạt lại).

---

### 5. Cập nhật Trạng thái Toàn bộ Bàn trong Khu vực
- **Phương thức / Điểm cuối**: `POST /api/app/table/set-area-status`
- **Quyền**: `TooHungryPermissions.Tables.Manage`
- **Tham số truy vấn**: `diningAreaId=...&status=...`
- **Phản hồi** (`200 OK`)

---

### 6. Xóa Bàn ăn
- **Phương thức / Điểm cuối**: `DELETE /api/app/table/{id}`
- **Quyền**: `TooHungryPermissions.Tables.Delete` (hoặc `Manage`)
- **Phản hồi** (`204 No Content` / `200 OK`)
- **Lỗi**:
  - `400 Bad Request`: Không thể xóa bàn đang có khách (`Occupied`) hoặc có đơn hàng mở chưa hoàn tất.
