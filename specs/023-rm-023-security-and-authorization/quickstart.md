# Hướng dẫn Xác thực & Kiểm định (Validation Quickstart): RM-023 Bảo mật & Chuẩn hóa Phân quyền Hệ thống

**Tính năng**: `RM-023`  
**Ngày**: 2026-10-23  
**Trạng thái**: Hoàn thành (Phase 1 Complete)

---

## Mục đích

Tài liệu này cung cấp hướng dẫn kiểm thử và xác thực độc lập 6 kịch bản bảo mật và phân quyền trọng yếu của tính năng RM-023, chứng minh hệ thống đã bịt kín các lỗ hổng từ `CODE_REVIEW.md` và tuân thủ các nguyên tắc bảo mật của ABP Framework.

---

## Điều kiện Tiên quyết (Prerequisites)

1. Backend Host đang chạy: `https://localhost:44353` (hoặc khởi chạy qua `dotnet run --project src/Acme.TooHungry.HttpApi.Host`).
2. Frontend Angular đang chạy: `http://localhost:4200` (hoặc khởi chạy qua `npm start` trong thư mục `angular/`).
3. Chuẩn bị các tài khoản thử nghiệm với các vai trò khác nhau:
   - `admin` (toàn quyền quản trị)
   - `manager` (quản lý có quyền Dashboard, Dishes, Orders, Tables)
   - `waiter` (chỉ có quyền Tables và Orders)
   - `inventory_keeper` (chỉ có quyền Inventories)

---

## Kịch bản 1: Xác thực Chặn Truy cập Nặc danh & Phân quyền Hạt nhân Endpoints (FR-001, FR-003, FR-004, FR-005, FR-006)

### 1.1 Kiểm tra truy cập ẩn danh (Anonymous)
Sử dụng curl hoặc Postman gửi yêu cầu không có header `Authorization`:

```bash
# 1. Gọi upload ảnh không token -> Bắt buộc nhận HTTP 401
curl -i -X POST https://localhost:44353/api/app/media/upload-dish-image

# 2. Xem thực đơn ngày không token -> Bắt buộc nhận HTTP 401
curl -i -X GET https://localhost:44353/api/app/daily-menu

# 3. Xem công thức món không token -> Bắt buộc nhận HTTP 401
curl -i -X GET https://localhost:44353/api/app/recipe/by-dish/00000000-0000-0000-0000-000000000000

# 4. Hoàn tất đơn bàn không token -> Bắt buộc nhận HTTP 401
curl -i -X POST https://localhost:44353/api/app/table-orders/complete/00000000-0000-0000-0000-000000000000
```
- **Kết quả mong đợi**: 100% các yêu cầu đều nhận mã trạng thái `HTTP/1.1 401 Unauthorized`.

### 1.2 Kiểm tra phân quyền theo vai trò (Forbidden - 403)
- Đăng nhập với tài khoản `waiter` (chỉ có quyền Orders và Tables).
- Gửi yêu cầu xóa danh mục món `DELETE /api/app/dish-category/{id}` hoặc upload ảnh `POST /api/app/media/upload-dish-image`.
- **Kết quả mong đợi**: Nhận mã trạng thái `HTTP/1.1 403 Forbidden` (`AbpAuthorizationException`).

---

## Kịch bản 2: Xác thực Upload Ảnh 3 Lớp & Magic Bytes (FR-002)

### 2.1 Kiểm tra tệp vượt quá 5MB
- Chọn một tệp ảnh có dung lượng 6MB tải lên -> Nhận lỗi `UserFriendlyException`: *"Dung lượng tệp vượt quá giới hạn cho phép (tối đa 5MB)."*

### 2.2 Kiểm tra giả mạo phần mở rộng (Extension Spoofing)
- Đổi tên tệp văn bản hoặc script `malicious.sh` thành `malicious.jpg`.
- Tải tệp lên endpoint `/api/app/media/upload-dish-image`.
- **Kết quả mong đợi**:
  + Hệ thống kiểm tra `ContentType` hoặc Magic Bytes nhị phân không khớp chữ ký `0xFF 0xD8 0xFF`.
  + Tệp bị từ chối ngay lập tức với thông báo lỗi: *"Chữ ký nhị phân của tệp không khớp với định dạng hình ảnh hợp lệ."*
  + Tệp tuyệt đối không được chuyển tiếp sang Cloudinary.

### 2.3 Kiểm tra tải tệp ảnh hợp lệ
- Tải lên tệp `dish.png` thật (PNG header: `89 50 4E 47`).
- **Kết quả mong đợi**:
  + Tải lên thành công, nhận mã HTTP `200 OK`.
  + Tên tệp lưu trữ trên Cloudinary là chuỗi GUID ngẫu nhiên (ví dụ `3f8a9...webp`), không bị lộ tên gốc.

---

## Kịch bản 3: Xác thực Kênh Realtime SignalR Hub (FR-007, FR-008, FR-009)

### 3.1 Kiểm tra chặn kết nối nặc danh
- Mở công cụ kiểm tra WebSocket (như Postman hoặc websocket client) kết nối tới `wss://localhost:44353/signalr-hubs/table` mà không kèm token.
- **Kết quả mong đợi**: Kết nối WebSocket handshake bị từ chối với HTTP `401 Unauthorized`.

### 3.2 Kiểm tra kết nối có Bearer Token
- Trên trình duyệt, truy cập `http://localhost:4200/account/login`. Quan sát tab Network: Không có request nào cố kết nối tới `/signalr-hubs/table`.
- Đăng nhập tài khoản `waiter`:
  + Ngay sau khi đăng nhập thành công, `TableSignalRService` bắt đầu kết nối với `accessTokenFactory`.
  + Kết nối chuyển sang trạng thái `Connected` (HTTP 101 Switching Protocols).
  + Khi có biến động bàn ăn, giao diện Waiter Tables cập nhật Card trạng thái theo thời gian thực mà không cần reload trang.
- Bấm Đăng xuất:
  + Kết nối WebSocket được ngắt chủ động (`stopConnection`), không phát sinh lỗi reconnect ngầm trên console.

---

## Kịch bản 4: Xác thực Kiểm soát Hiển thị Nút Thao tác qua `*abpPermission` (FR-010)

1. **Đăng nhập với tài khoản `waiter`**:
   - Vào màn hình Danh mục món `/dish-categories`: Không nhìn thấy các nút "Thêm danh mục", "Chỉnh sửa", "Xóa".
   - Vào màn hình Danh sách món `/dishes`: Không nhìn thấy nút "Thêm món", "Sửa", "Xóa".
   - Vào màn hình Quản lý kho `/inventory`: Các nút "Nhập kho", "Kiểm kê", "Hủy lô" hoàn toàn biến mất.
2. **Đăng nhập với tài khoản `inventory_keeper`**:
   - Vào màn hình `/inventory`: Thấy đầy đủ các nút "Nhập kho", "Điều chỉnh", "Hủy lô".
   - Không thể truy cập hoặc bị ẩn các menu quản trị người dùng.
3. **Đăng nhập với tài khoản `manager`**:
   - Thấy đầy đủ các nút nghiệp vụ trên các màn hình món ăn, đơn hàng, bàn ăn và kho.

---

## Kịch bản 5: Xác thực Phân luồng Router Guards Động theo Policies (FR-011, FR-012)

1. Tạo một vai trò mới có tên `"ShiftSupervisor"` trong màn hình Quản trị Vai trò (`/identity/roles`).
2. Gán các quyền sau cho vai trò này:
   - `TooHungry.Tables.*`
   - `TooHungry.Orders.*`
   - (Không cấp quyền `TooHungry.Dashboard`)
3. Tạo một tài khoản người dùng gán vai trò `"ShiftSupervisor"` và đăng nhập:
   - **Kết quả mong đợi**:
     + Hệ thống tự động phân luồng điều hướng về `/waiter/tables` (Giao diện phục vụ).
     + Người dùng có thể thao tác quản lý bàn và gọi món bình thường.
     + Hoàn toàn không bị chặn bởi bộ lọc chuỗi role name cũ `['Manager', 'Administrator', 'admin']`.

---

## Kịch bản 6: Xác thực Vệ sinh Secrets, Tắt PII & Vô hiệu hóa Swagger trên Production (FR-015, FR-016, FR-017)

### 6.1 Kiểm tra tệp `appsettings.json`
- Mở file `src/Acme.TooHungry.HttpApi.Host/appsettings.json`:
  + Kiểm tra `CertificatePassPhrase` = `"__CONFIGURE_VIA_ENV_OR_USER_SECRETS__"`.
  + Kiểm tra `DefaultPassPhrase` = `"__CONFIGURE_VIA_ENV_OR_USER_SECRETS__"`.
  + Không còn bất kỳ mật mã nhạy cảm nào bị commit vào git.

### 6.2 Kiểm tra môi trường Production
- Khởi chạy ứng dụng với môi trường Production:
  ```bash
  $env:ASPNETCORE_ENVIRONMENT="Production"
  dotnet run --project src/Acme.TooHungry.HttpApi.Host
  ```
- Truy cập `https://localhost:44353/swagger/index.html`:
  + **Kết quả mong đợi**: Trả về `404 Not Found` (Swagger UI đã bị vô hiệu hóa an toàn).
- Kiểm tra log file `Logs/logs.txt`:
  + Thuộc tính `ShowPII = false`, không rò rỉ token claims hoặc thông tin cá nhân của người dùng.
