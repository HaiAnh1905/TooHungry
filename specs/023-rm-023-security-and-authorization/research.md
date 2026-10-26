# Tài liệu Nghiên cứu Kỹ thuật (Technical Research): RM-023 Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement)

**Tính năng**: `RM-023`  
**Ngày**: 2026-10-23  
**Trạng thái**: Hoàn thành (Phase 0 Complete)

---

## Mục tiêu Nghiên cứu

Giải quyết triệt để 9 vấn đề an toàn thông tin và phân quyền nghiêm trọng phát hiện từ `CODE_REVIEW.md` (Backend #6, #7, #8, #9, #30; Frontend #4, #7, #9, #19, #31), thiết lập các chốt chặn phòng vệ theo chiều sâu (Defense-in-Depth) theo đúng chuẩn mực bảo mật của ABP Framework và ASP.NET Core:
1. Phân quyền hạt nhân các Endpoints Backend API đang bị hở hoặc thiếu quyền hạn.
2. Thiết kế cơ chế kiểm tra an toàn tệp tải lên 3 lớp (Extension, MIME Content-Type, Magic Bytes Header) và đặt tên ngẫu nhiên chống Path Traversal tại `MediaController`.
3. Bảo vệ Realtime SignalR Hub bằng xác thực Bearer Token và quản trị vòng đời kết nối theo trạng thái đăng nhập phía client Angular.
4. Kiểm soát hiển thị nút hành động trên giao diện 8 phân hệ bằng chỉ thị `*abpPermission`.
5. Loại bỏ 100% role name hardcode (`['Manager', 'Administrator', 'admin']`), chuyển sang phân luồng động dựa trên Granular Policies của ABP.
6. Vệ sinh Secrets khỏi `appsettings.json`, thiết lập phân tầng nạp bí mật an toàn (.NET User-Secrets + Environment Variables), tắt PII và vô hiệu hóa Swagger UI trên môi trường Production.
7. Chuẩn hóa phân quyền vai trò và mã hóa URL an toàn tham số `providerKey` trong `roles.ts`.

---

## 1. Phân quyền Hạt nhân Endpoints Backend API

### Vấn đề Phát hiện (Backend #6, #7, #8)
- `MediaController.cs`: Endpoint `upload-dish-image` cho phép gọi ẩn danh (Anonymous).
- `DailyMenuAppService.cs`: Không có thuộc tính `[Authorize]`, cho phép người dùng nặc danh xem và truy xuất thông tin thực đơn ngày.
- `RecipeController.cs`: Endpoint `GET by-dish/{dishId}` không có `[Authorize]`, làm lộ công thức chế biến và định lượng món ăn.
- `DishCategoryAppService.cs`: Chỉ có `[Authorize]` ở cấp class, các phương thức `CreateAsync`, `UpdateAsync`, `DeleteAsync` không kiểm tra quyền cụ thể của danh mục món.
- `TableOrderController.cs`: Không có `[Authorize]`, phương thức `complete/{tableId}` cho phép bất kỳ ai kích hoạt hoàn tất đơn bàn và trigger khấu trừ kho FEFO.

### Quyết định Kỹ thuật (Decision)
- **Áp dụng phân quyền hạt nhân qua `[Authorize(PermissionName)]`**:
  + `MediaController.UploadDishImageAsync`: `[Authorize(TooHungryPermissions.Dishes.Edit)]`.
  + `DailyMenuAppService`: Đặt `[Authorize(TooHungryPermissions.Dishes.Default)]` trên toàn class; các thao tác cập nhật (nếu có) yêu cầu `TooHungryPermissions.Dishes.Edit`.
  + `RecipeController.GetActiveByDishIdAsync`: Gắn `[Authorize(TooHungryPermissions.Recipes.Default)]`.
  + `DishCategoryAppService`:
    * `GetAsync`, `GetListAsync`: `[Authorize(TooHungryPermissions.DishCategories.Default)]`
    * `CreateAsync`: `[Authorize(TooHungryPermissions.DishCategories.Create)]`
    * `UpdateAsync`: `[Authorize(TooHungryPermissions.DishCategories.Edit)]`
    * `DeleteAsync`: `[Authorize(TooHungryPermissions.DishCategories.Delete)]`
  + `TableOrderController`:
    * `GetActiveOrderByTableIdAsync`: `[Authorize(TooHungryPermissions.Orders.Default)]`
    * `CompleteActiveOrderByTableIdAsync`: `[Authorize(TooHungryPermissions.Orders.Edit)]`

### Lý do (Rationale)
Tuân thủ nguyên tắc đặc quyền tối thiểu (Principle of Least Privilege). Mọi endpoint đều phải được bảo vệ bởi đúng mã quyền nghiệp vụ của phân hệ đó, ngăn chặn việc nhân viên chỉ có quyền phục vụ bàn lại có thể chỉnh sửa danh mục món ăn hoặc tải ảnh đè lên CDN.

### Giải pháp Thay thế Đã Đánh giá (Alternatives Considered)
- *Chỉ dùng `[Authorize]` chung ở cấp controller*: Bị từ chối vì không phân định được vai trò, bất kỳ ai có tài khoản đăng nhập đều có thể gọi các tác vụ nhạy cảm như xóa danh mục hoặc tải ảnh.

---

## 2. Kiểm soát An toàn Tệp Tải lên 3 Lớp (3-Tier Upload Defense)

### Vấn đề Phát hiện (Backend #6)
`MediaController.cs` hiện tại chỉ kiểm tra phần mở rộng:
```csharp
var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext)) ...
```
Lỗ hổng: Kẻ xấu có thể đổi tên tệp thực thi độc hại (như `webshell.php.jpg` hoặc file binary `.exe` đổi đuôi thành `.png`) để vượt qua bộ lọc. Đồng thời việc sử dụng `file.FileName` trực tiếp tiềm ẩn rủi ro Path Traversal nếu có các ký tự `../`.

### Quyết định Kỹ thuật (Decision)
Xây dựng cơ chế phòng vệ 3 lớp chuyên sâu cho upload tệp:
1. **Lớp 1 (Whitelist Extension & Size Limit)**:
   - Phần mở rộng: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`.
   - Giới hạn kích thước tối đa: 5MB (`5 * 1024 * 1024` bytes) và tệp không được rỗng (`Length > 0`).
2. **Lớp 2 (MIME ContentType Validation)**:
   - Bắt buộc `file.ContentType` phải thuộc danh sách:
     + `image/jpeg`
     + `image/png`
     + `image/webp`
     + `image/gif`
3. **Lớp 3 (Magic Bytes Header Inspection)**:
   - Đọc luồng nhị phân các bytes đầu tiên của tệp để xác thực chữ ký (File Signatures):
     + **JPEG/JPG**: Bắt đầu bằng 3 bytes `FF D8 FF`.
     + **PNG**: Bắt đầu bằng 4 bytes `89 50 4E 47`.
     + **GIF**: Bắt đầu bằng 4 bytes `47 49 46 38` (tương ứng ASCII "GIF8").
     + **WEBP**: Bắt đầu bằng `RIFF` (4 bytes `52 49 46 46`) ở offset 0 và `WEBP` (4 bytes `57 45 42 50`) ở offset 8.
4. **Định danh An toàn (Safe File Naming)**:
   - Không sử dụng tên tệp gốc từ client. Đặt tên tệp tải lên Cloudinary theo mã GUID ngẫu nhiên: `Guid.NewGuid().ToString("N") + ext`.
   - Thiết lập `Overwrite = false`, `UniqueFilename = true` trên Cloudinary API params.

### Lý do (Rationale)
Bộ ba kiểm tra Extension + MIME + Magic Bytes ngăn chặn 100% tệp giả mạo phần mở rộng và tệp thực thi nguy hiểm. Đổi tên bằng GUID triệt tiêu hoàn toàn tấn công Path Traversal.

---

## 3. Bảo vệ Realtime Hub SignalR & Quản trị Vòng đời Kết nối

### Vấn đề Phát hiện (Backend #9)
- `TableHub.cs` kế thừa `AbpHub` nhưng không có `[Authorize]`. Kẻ tấn công có thể mở kết nối WebSocket nặc danh tới `/signalr-hubs/table` để nghe lén các sự kiện `TableStatusChanged` và `TableOrderUpdated`.
- `TableSignalRService.ts` phía client tự động gọi `startConnection()` trong constructor ngay khi ứng dụng khởi chạy (kể cả khi người dùng chưa đăng nhập), gây lỗi 401 trên console; đồng thời không truyền JWT Token qua `accessTokenFactory` và nuốt lỗi ngầm trong khối `catch`.

### Quyết định Kỹ thuật (Decision)
- **Backend**:
  + Thêm `[Authorize]` trên lớp `TableHub`. Chặn mọi kết nối bắt tay (handshake) không mang Bearer Token hợp lệ.
- **Frontend (`TableSignalRService.ts`)**:
  + Cấu hình `accessTokenFactory`:
    ```typescript
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.oAuthService.getAccessToken() || '',
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    ```
  + **Quản trị vòng đời theo trạng thái Auth**:
    * Không kết nối tự động trong constructor nếu người dùng chưa đăng nhập.
    * Lắng nghe trạng thái đăng nhập qua `OAuthService` / `currentUser$`: Chỉ khởi tạo kết nối khi `oAuthService.hasValidAccessToken() == true`.
    * Tự động làm mới kết nối: Khi token hết hạn hoặc kết nối bị ngắt do lỗi 401, gọi `oAuthService.refreshToken()` để lấy token mới và tái kết nối nền.
    * Tự động gọi `stopConnection()` khi người dùng đăng xuất.

---

## 4. Kiểm soát Hiển thị Nút Thao tác trên Giao diện Angular qua `*abpPermission`

### Vấn đề Phát hiện (Frontend #4)
Ngoại trừ màn hình `unit` và `ingredient`, hầu hết các màn hình nghiệp vụ chính (`dish`, `dish-category`, `order`, `table`, `inventory`, `recipe`, `dining-area`, `identity`) đều chưa gắn chỉ thị `*abpPermission` trên các nút hành động (Tạo, Sửa, Xóa, Cập nhật trạng thái). Người dùng không có quyền vẫn nhìn thấy các nút này, khi bấm vào mới bị Backend trả về lỗi 403, gây ức chế và trải nghiệm kém.

### Quyết định Kỹ thuật (Decision)
- Rà soát và bao bọc toàn bộ các nút thao tác bằng chỉ thị `*abpPermission`:
  1. **Món ăn (`dish.component.html`)**:
     - Nút "Thêm món mới": `*abpPermission="'TooHungry.Dishes.Create'"`
     - Nút "Sửa": `*abpPermission="'TooHungry.Dishes.Edit'"`
     - Nút "Xóa": `*abpPermission="'TooHungry.Dishes.Delete'"`
  2. **Danh mục món (`dish-category.component.html`)**:
     - Nút "Thêm danh mục": `*abpPermission="'TooHungry.DishCategories.Create'"`
     - Nút "Sửa": `*abpPermission="'TooHungry.DishCategories.Edit'"`
     - Nút "Xóa": `*abpPermission="'TooHungry.DishCategories.Delete'"`
  3. **Đơn hàng (`order.component.html`)**:
     - Nút "Tạo đơn": `*abpPermission="'TooHungry.Orders.Create'"`
     - Nút "Hủy đơn": `*abpPermission="'TooHungry.Orders.Cancel'"`
     - Nút "Chỉnh sửa đơn": `*abpPermission="'TooHungry.Orders.Edit'"`
  4. **Bàn ăn & Khu vực (`table.component.html`, `dining-area.component.html`)**:
     - Nút "Thêm bàn/khu vực": `*abpPermission="'TooHungry.Tables.Create'"` / `'TooHungry.DiningAreas.Create'`
     - Nút "Sửa bàn/khu vực": `*abpPermission="'TooHungry.Tables.Edit'"` / `'TooHungry.DiningAreas.Edit'`
     - Nút "Xóa bàn/khu vực": `*abpPermission="'TooHungry.Tables.Delete'"` / `'TooHungry.DiningAreas.Delete'`
  5. **Kho nguyên liệu (`inventory.component.html`)**:
     - Nút "Nhập kho (Batch)": `*abpPermission="'TooHungry.Inventories.Batch'"`
     - Nút "Điều chỉnh kho (Adjust)": `*abpPermission="'TooHungry.Inventories.Adjust'"`
     - Nút "Hủy bỏ lô (Discard)": `*abpPermission="'TooHungry.Inventories.Discard'"`
     - Nút "Tạm ngưng lô": `*abpPermission="'TooHungry.Inventories.DeactivateBatch'"`
  6. **Công thức (`recipe.component.html`)**:
     - Nút "Thêm công thức": `*abpPermission="'TooHungry.Recipes.Create'"`
     - Nút "Sửa công thức": `*abpPermission="'TooHungry.Recipes.Edit'"`
     - Nút "Xóa công thức": `*abpPermission="'TooHungry.Recipes.Delete'"`
  7. **Người dùng & Vai trò (`users.component.html`, `roles.component.html`)**:
     - Nút "Thêm": `*abpPermission="'AbpIdentity.Users.Create'"` / `'AbpIdentity.Roles.Create'`
     - Nút "Sửa": `*abpPermission="'AbpIdentity.Users.Update'"` / `'AbpIdentity.Roles.Update'`
     - Nút "Xóa": `*abpPermission="'AbpIdentity.Users.Delete'"` / `'AbpIdentity.Roles.Delete'`
     - Nút "Phân quyền (Permissions)": `*abpPermission="'AbpIdentity.Roles.ManagePermissions'"`

---

## 5. Loại bỏ Role Name Hardcode & Chuẩn hóa Phân luồng Router Guards

### Vấn đề Phát hiện (Frontend #7, #9)
Các Guards và Services đang so khớp theo danh sách tên vai trò chuỗi thô:
```typescript
const allowedRoles = ['Waiter', 'Manager', 'Administrator', 'admin'];
roles.some(r => ['Manager', 'Administrator', 'admin'].includes(r));
```
Hệ quả: Khi doanh nghiệp tạo vai trò mới (ví dụ: "Bếp trưởng", "Giám sát tầng", "Thu ngân chính") và gán quyền đầy đủ, các vai trò này vẫn bị chặn không vào được hệ thống vì tên vai trò không khớp chuỗi hardcode.

### Quyết định Kỹ thuật (Decision)
- **Chuyển đổi 100% sang kiểm tra Permission Policies**:
  + Sử dụng `PermissionService` của ABP: `permissionService.getGrantedPolicy$('...')`.
  + **Quy tắc phân luồng điều hướng (`UserRoleNavigationService`)**:
    * Ưu tiên 1: Người dùng có `TooHungry.Dashboard` -> Điều hướng về `/` (Dashboard Quản trị).
    * Ưu tiên 2: Người dùng có `TooHungry.Tables.Default` hoặc `TooHungry.Orders.Default` -> Điều hướng về `/waiter/tables` (Giao diện phục vụ).
    * Ưu tiên 3: Người dùng có `TooHungry.Inventories.*` -> Điều hướng về `/inventory-keeper` (Cổng thông tin thủ kho).
    * Fallback: Điều hướng về màn hình đầu tiên mà người dùng có quyền đọc (`/dishes`, `/orders`, `/tables`).
  + **Nút "Về Quản trị" (Back to Admin) trong Waiter Layout & Inventory Keeper Layout**:
    * Hiển thị khi người dùng sở hữu ít nhất một trong các quyền quản trị nghiệp vụ: `TooHungry.Dashboard`, `AbpIdentity.Users`, `AbpIdentity.Roles`, `TooHungry.Dishes`, `TooHungry.Recipes`, hoặc `TooHungry.DiningAreas`.

---

## 6. Vệ sinh Secrets & Thắt chặt An toàn Môi trường Production

### Vấn đề Phát hiện (Backend #30)
- `appsettings.json` bị commit vào git chứa giá trị mật mã nhạy cảm:
  + `CertificatePassPhrase`: `"4e5b1de7-df57-43fe-9a29-b4ca72eb9ebe"`
  + `DefaultPassPhrase`: `"uVAH0QRedpLEw6WS"`
- `TooHungryHttpApiHostModule.cs`: Thuộc tính `ShowPII = true` bật rò rỉ dữ liệu cá nhân vào log file; Swagger UI chạy vô điều kiện trên mọi môi trường.

### Quyết định Kỹ thuật (Decision)
1. **Vệ sinh `appsettings.json`**:
   - Thay thế các giá trị mật mã bằng chuỗi placeholder: `"__CONFIGURE_VIA_ENV_OR_USER_SECRETS__"`.
   - Tạo file mẫu `src/Acme.TooHungry.HttpApi.Host/appsettings.secrets.example.json` hướng dẫn thiết lập.
   - Cơ chế nạp phân tầng:
     + *Development*: `dotnet user-secrets` hoặc nạp qua `.env` cục bộ.
     + *Production/Staging*: Biến môi trường `AUTH_SERVER_CERTIFICATE_PASSPHRASE` và `STRING_ENCRYPTION_DEFAULT_PASSPHRASE`.
   - **Fail-fast Startup**: Kiểm tra trong `TooHungryHttpApiHostModule.ConfigureServices`: Nếu đang chạy `Production` mà giá trị passphrase vẫn là placeholder hoặc rỗng -> Ném `InvalidOperationException` ngăn máy chủ khởi động trong tình trạng mất an toàn.
2. **Tắt `ShowPII`**:
   - Chỉ bật `ShowPII` khi `hostingEnvironment.IsDevelopment() && !configuration.GetValue<bool>("App:DisablePII")`. Ở môi trường khác, ép buộc `ShowPII = false`.
3. **Vô hiệu hóa Swagger UI trên Production**:
   - Bọc `app.UseSwagger()` và `app.UseAbpSwaggerUI()` bên trong khối kiểm tra:
     ```csharp
     if (env.IsDevelopment())
     {
         app.UseSwagger();
         app.UseAbpSwaggerUI(options => ...);
     }
     ```

---

## 7. Chuẩn hóa Quản trị Quyền Role & Mã hóa URL Provider Key

### Vấn đề Phát hiện (Frontend #19)
Trong `angular/src/app/identity/roles/roles.ts`, mã nguồn đang thực hiện ghép chuỗi trực tiếp:
```typescript
url: `/api/permission-management/permissions?providerName=R&providerKey=${role.name}`
```
Nếu vai trò có tên tiếng Việt (ví dụ: "Quản lý", "Tiếp tân") hoặc chứa khoảng trắng/ký tự đặc biệt, URL sẽ bị hỏng gây lỗi 400 Bad Request hoặc 500. Ngoài ra `users.ts` còn inject `HttpClient` thừa và gửi yêu cầu `updateRoles` dư thừa khi không có thay đổi vai trò.

### Quyết định Kỹ thuật (Decision)
- **Mã hóa URL an toàn**:
  + Bao bọc toàn bộ tham số query string bằng `encodeURIComponent`:
    ```typescript
    const providerKey = encodeURIComponent(role.name);
    const providerName = encodeURIComponent('R');
    const url = `/api/permission-management/permissions?providerName=${providerName}&providerKey=${providerKey}`;
    ```
- **Tối ưu hóa `users.ts`**:
  + So sánh danh sách vai trò hiện tại với danh sách vai trò mới trước khi gọi API `updateRoles`. Nếu danh sách không thay đổi, bỏ qua việc gọi API.
  + Loại bỏ dependency `HttpClient` không cần thiết, tái sử dụng service proxy chính thức của ABP.
