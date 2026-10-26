# Hợp đồng Giao tiếp & Phân quyền (Security & Authorization Contracts): RM-023

**Tính năng**: `RM-023`  
**Ngày**: 2026-10-23  
**Trạng thái**: Hoàn thành (Phase 1 Complete)

---

## 1. Hợp đồng Backend REST API & Quyền hạn (API Authorization Contracts)

### 1.1 Upload Tệp Ảnh Món ăn (`MediaController`)
- **Endpoint**: `POST /api/app/media/upload-dish-image`
- **Xác thực & Quyền hạn**: `[Authorize(TooHungryPermissions.Dishes.Edit)]`
- **Content-Type**: `multipart/form-data`
- **Request Form Body**:
  ```text
  file: <Binary Image Stream> (<= 5MB, Whitelist extension, Image MIME, Valid Magic Bytes)
  ```
- **Responses**:
  + `200 OK`:
    ```json
    {
      "url": "https://res.cloudinary.com/.../toohungry/dishes/a1b2c3d4e5f6...webp"
    }
    ```
  + `400 Bad Request`: Định dạng tệp sai, Magic Bytes không khớp hoặc tệp quá 5MB.
  + `401 Unauthorized`: Người dùng chưa đăng nhập.
  + `403 Forbidden`: Người dùng đã đăng nhập nhưng không có quyền `TooHungry.Dishes.Edit`.

---

### 1.2 Thực đơn Ngày (`DailyMenuAppService`)
- **Xác thực & Quyền hạn Cấp Class**: `[Authorize(TooHungryPermissions.Dishes.Default)]`
- **Endpoints**:
  + `GET /api/app/daily-menu`: Lấy danh sách thực đơn ngày có phân trang.
  + `GET /api/app/daily-menu/{id}`: Lấy chi tiết thực đơn ngày kèm các món.
  + `GET /api/app/daily-menu/active-for-date`: Lấy thực đơn ngày đang áp dụng.
- **Responses**:
  + `200 OK`: Trả về DTO thực đơn ngày.
  + `401 Unauthorized`: Chặn truy cập nặc danh (Anonymous).
  + `403 Forbidden`: Người dùng thiếu quyền `TooHungry.Dishes.Default`.

---

### 1.3 Tra cứu Công thức Món ăn (`RecipeController`)
- **Endpoint**: `GET /api/app/recipe/by-dish/{dishId}`
- **Xác thực & Quyền hạn**: `[Authorize(TooHungryPermissions.Recipes.Default)]`
- **Responses**:
  + `200 OK`: Trả về `RecipeDto` chứa danh sách nguyên liệu và định lượng.
  + `401 Unauthorized`: Chặn truy cập nặc danh.
  + `403 Forbidden`: Người dùng thiếu quyền `TooHungry.Recipes.Default`.

---

### 1.4 Danh mục Món ăn (`DishCategoryAppService`)
- **Endpoints & Quyền hạn Hạt nhân**:
  + `GET /api/app/dish-category/{id}`: `[Authorize(TooHungryPermissions.DishCategories.Default)]`
  + `GET /api/app/dish-category`: `[Authorize(TooHungryPermissions.DishCategories.Default)]`
  + `POST /api/app/dish-category`: `[Authorize(TooHungryPermissions.DishCategories.Create)]`
  + `PUT /api/app/dish-category/{id}`: `[Authorize(TooHungryPermissions.DishCategories.Edit)]`
  + `DELETE /api/app/dish-category/{id}`: `[Authorize(TooHungryPermissions.DishCategories.Delete)]`

---

### 1.5 Quản lý Đơn hàng Bàn ăn (`TableOrderController`)
- **Endpoints & Quyền hạn Hạt nhân**:
  + `GET /api/app/table-orders/active/{tableId}`:
    * Quyền: `[Authorize(TooHungryPermissions.Orders.Default)]`
    * Trả về thông tin đơn hàng đang active của bàn.
  + `POST /api/app/table-orders/complete/{tableId}`:
    * Quyền: `[Authorize(TooHungryPermissions.Orders.Edit)]`
    * Kích hoạt hoàn tất đơn hàng, đóng băng đơn và trigger xuất trừ kho FEFO theo công thức món ăn.

---

### 1.6 Kênh Thời gian thực SignalR Hub (`TableHub`)
- **Đường dẫn WebSocket**: `/signalr-hubs/table`
- **Giao thức**: WebSockets / Server-Sent Events / Long Polling
- **Xác thực & Quyền hạn**: `[Authorize]` trên lớp `TableHub`
- **Yêu cầu Token**: Bắt buộc client gửi Access Token qua query string `?access_token=<JWT>` hoặc Header `Authorization: Bearer <JWT>`.
- **Sự kiện Phát đi (Broadcast Events)**:
  + `TableStatusChanged`: `{ tableId, tableName, diningAreaId, status, statusName, occupiedTime, updatedTime }`
  + `TableOrderUpdated`: `{ tableId, hasActiveOrder, activeOrderId }`

---

## 2. Hợp đồng Client Angular Services (Frontend Service Contracts)

### 2.1 Hợp đồng `TableSignalRService` (`table-signalr.service.ts`)
```typescript
export interface ITableSignalRService {
  /** Observable lắng nghe sự kiện biến động trạng thái bàn ăn */
  tableStatusChanged$: Observable<TableStatusChangedEvent>;

  /** Observable lắng nghe sự kiện cập nhật đơn hàng của bàn */
  tableOrderUpdated$: Observable<TableOrderUpdatedEvent>;

  /** Khởi tạo kết nối SignalR Hub kèm accessTokenFactory và auto-reconnect */
  initConnection(): void;

  /** Kích hoạt kết nối chỉ khi người dùng đã xác thực (oAuthService.hasValidAccessToken() === true) */
  startConnection(): Promise<void>;

  /** Chủ động ngắt kết nối và dọn dẹp tài nguyên khi người dùng đăng xuất */
  stopConnection(): void;
}
```

### 2.2 Hợp đồng `UserRoleNavigationService` (`user-role-navigation.service.ts`)
```typescript
export interface IUserRoleNavigationService {
  /**
   * Phân luồng trang đích mặc định dựa trên Granular Policies của người dùng:
   * 1. Có TooHungry.Dashboard -> '/'
   * 2. Có TooHungry.Tables.Default hoặc Orders.Default -> '/waiter/tables'
   * 3. Có TooHungry.Inventories.* -> '/inventory-keeper'
   * 4. Fallback -> Route đầu tiên người dùng có quyền đọc
   */
  resolveLandingRoute$(): Observable<string>;

  /**
   * Kiểm tra người dùng có quyền truy cập trang Quản trị (hiển thị nút 'Về Quản trị'):
   * Trả về true nếu sở hữu ít nhất một quyền quản trị: Dashboard, Users, Roles, Settings, Dishes, Recipes.
   */
  canNavigateToAdmin$(): Observable<boolean>;
}
```

---

## 3. Hợp đồng Chỉ thị Giao diện UI (`*abpPermission` Directive Contracts)

Toàn bộ các nút hành động nhạy cảm trên giao diện người dùng bắt buộc phải khai báo thuộc tính cấu trúc `*abpPermission`:

```html
<!-- Món ăn: dish.component.html -->
<button *abpPermission="'TooHungry.Dishes.Create'" class="btn-create">Thêm món</button>
<button *abpPermission="'TooHungry.Dishes.Edit'" class="btn-edit">Sửa</button>
<button *abpPermission="'TooHungry.Dishes.Delete'" class="btn-delete">Xóa</button>

<!-- Danh mục: dish-category.component.html -->
<button *abpPermission="'TooHungry.DishCategories.Create'" class="btn-create">Thêm danh mục</button>
<button *abpPermission="'TooHungry.DishCategories.Edit'" class="btn-edit">Sửa</button>
<button *abpPermission="'TooHungry.DishCategories.Delete'" class="btn-delete">Xóa</button>

<!-- Đơn hàng: order.component.html -->
<button *abpPermission="'TooHungry.Orders.Create'" class="btn-create">Tạo đơn</button>
<button *abpPermission="'TooHungry.Orders.Edit'" class="btn-edit">Sửa đơn</button>
<button *abpPermission="'TooHungry.Orders.Cancel'" class="btn-cancel">Hủy đơn</button>

<!-- Bàn ăn: table.component.html -->
<button *abpPermission="'TooHungry.Tables.Create'" class="btn-create">Thêm bàn</button>
<button *abpPermission="'TooHungry.Tables.Edit'" class="btn-edit">Sửa bàn</button>
<button *abpPermission="'TooHungry.Tables.Delete'" class="btn-delete">Xóa bàn</button>
<button *abpPermission="'TooHungry.Tables.UpdateStatus'" class="btn-status">Đổi trạng thái</button>

<!-- Kho: inventory.component.html -->
<button *abpPermission="'TooHungry.Inventories.Batch'" class="btn-batch">Nhập kho</button>
<button *abpPermission="'TooHungry.Inventories.Adjust'" class="btn-adjust">Điều chỉnh</button>
<button *abpPermission="'TooHungry.Inventories.Discard'" class="btn-discard">Xuất hủy</button>
<button *abpPermission="'TooHungry.Inventories.DeactivateBatch'" class="btn-deactivate">Khóa lô</button>

<!-- Công thức: recipe.component.html -->
<button *abpPermission="'TooHungry.Recipes.Create'" class="btn-create">Tạo công thức</button>
<button *abpPermission="'TooHungry.Recipes.Edit'" class="btn-edit">Sửa công thức</button>
<button *abpPermission="'TooHungry.Recipes.Delete'" class="btn-delete">Xóa công thức</button>
```

---

## 4. Hợp đồng Mã hóa Quản trị Quyền Role (`roles.ts`)

- **Địa chỉ gọi API**:
  ```text
  GET /api/permission-management/permissions?providerName=R&providerKey={ENCODED_KEY}
  PUT /api/permission-management/permissions?providerName=R&providerKey={ENCODED_KEY}
  ```
- **Quy chuẩn mã hóa**:
  ```typescript
  const encodedProviderKey = encodeURIComponent(role.name.trim());
  const encodedProviderName = encodeURIComponent('R');
  const url = `/api/permission-management/permissions?providerName=${encodedProviderName}&providerKey=${encodedProviderKey}`;
  ```
- **Nguyên tắc an toàn**: Đảm bảo toàn bộ ký tự khoảng trắng, ký tự Tiếng Việt có dấu (`à, á, ả, ã, ạ...`) đều được mã hóa theo chuẩn RFC 3986 (%-encoding), loại bỏ hoàn toàn mã lỗi 400 và lỗi phân tích cú pháp URI.
