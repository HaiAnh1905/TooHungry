# Đặc tả Tính năng (Feature Specification): Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement)

**Mã Tính năng (Feature ID)**: `RM-023`

**Nhánh Tính năng (Feature Branch)**: `023-rm-023-security-and-authorization`

**Ngày tạo**: 2026-10-23

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-023: *"Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement) — Bịt kín toàn bộ các lỗ hổng bảo mật, kiểm soát truy cập phân quyền hạt nhân (Granular Authorization) ở cả Backend & Frontend và loại bỏ thông tin nhạy cảm (Secrets) khỏi kho mã nguồn"*.
- Tổng hợp các phát hiện bảo mật trọng yếu từ `CODE_REVIEW.md`:
  - Backend #6: `MediaController` cho phép tải lên hình ảnh không cần đăng nhập (`anonymous upload`), chỉ kiểm tra phần mở rộng đuôi file (`Path.GetExtension`) mà không kiểm tra MIME `ContentType` hay chặn tệp thực thi/giả mạo.
  - Backend #7: `DailyMenuAppService` không có thuộc tính `[Authorize]`, cho phép truy cập và tra cứu thực đơn ngày nặc danh.
  - Backend #8: `DishCategoryAppService` chỉ cấu hình `[Authorize]` chung ở cấp class, thiếu các quyền hạt nhân (`TooHungryPermissions.DishCategories.*`) trên từng phương thức CRUD; `TableOrderController` thiếu phân quyền bảo vệ endpoint hoàn tất đơn (`complete/{tableId}`) và tra cứu đơn active; `RecipeController.by-dish` không kiểm tra quyền xem công thức (`TooHungryPermissions.Recipes.Default`).
  - Backend #9: `TableHub` kế thừa `AbpHub` nhưng thiếu thuộc tính `[Authorize]`, cho phép kết nối WebSocket trái phép và theo dõi sự kiện trạng thái bàn/đơn hàng; `TableSignalRService` phía client không truyền token xác thực (`accessTokenFactory`) và nuốt ngoại lệ kết nối ban đầu.
  - Backend #30: Thông tin nhạy cảm và bí mật bị commit vào git repository trong `appsettings.json` (`CertificatePassPhrase`, `StringEncryption:DefaultPassPhrase`); cấu hình `ShowPII = true` và Swagger UI kích hoạt vô điều kiện tại môi trường Production.
  - Frontend #4: Thiếu chỉ thị `*abpPermission` trên hầu hết các nút thao tác tạo, sửa, xóa, đổi trạng thái tại 8 phân hệ màn hình Angular (`dish`, `dish-category`, `order`, `table`, `inventory`, `recipe`, `dining-area`, `users/roles`).
  - Frontend #7 & #9: Kiểm tra theo tên vai trò chuỗi thô hardcode (`['Manager', 'Administrator', 'admin']`) tại các Guards (`waiter-auth.guard.ts`, `dashboard.guard.ts`), `UserRoleNavigationService`, `waiter-layout`, `inventory-keeper-layout`, phá vỡ nguyên lý phân quyền dựa trên quyền hạn (Permission-Based Authorization) của ABP.
  - Frontend #19: `roles.ts` gọi trực tiếp `RestService` tới `/api/permission-management` thiếu mã hóa `providerKey`, `users.ts` inject HttpClient và gọi `updateRoles` dư thừa.
  - Frontend #31: Cấu hình thông tin tài khoản ngân hàng thụ hưởng VietQR cần bảo đảm an toàn, quản lý tập trung và dễ cấu hình cho từng môi trường.
- Tuân thủ Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md) (DDD, ABP Layering, Security & Authorization by Default, Auditing, i18n song ngữ).

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 23-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.specify RM-023` - 6 Quyết định Kỹ thuật Then chốt)

- **Q1: Cơ chế phân quyền hạt nhân tầng API Backend & Kiểm soát upload tệp an toàn (Làm rõ tại /speckit.clarify)**:
  - **A1**:
    - **Upload tệp an toàn 3 lớp (`MediaController.cs`)**:
      + Thêm `[Authorize(TooHungryPermissions.Dishes.Edit)]` (hoặc `Dishes.Create`) cho endpoint `POST /api/app/media/upload-dish-image`. Chặn 100% truy cập nặc danh.
      + **Lớp 1 (Whitelist Extension & Dung lượng)**: Whitelist đuôi tệp `[.jpg, .jpeg, .png, .webp, .gif]`, dung lượng tối đa 5MB và không rỗng.
      + **Lớp 2 (MIME Content-Type)**: Bắt buộc `file.ContentType` phải thuộc danh sách MIME hình ảnh chuẩn: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
      + **Lớp 3 (Magic Bytes Header)**: Đọc luồng nhị phân các byte đầu tiên để xác thực chữ ký tệp thực tế:
        * JPEG: `0xFF, 0xD8, 0xFF`
        * PNG: `0x89, 0x50, 0x4E, 0x47`
        * GIF: `0x47, 0x49, 0x46, 0x38`
        * WEBP: Chứa chuỗi `RIFF` ở byte 0-3 và `WEBP` ở byte 8-11.
      + **Định danh an toàn**: Đổi tên tệp thành mã GUID ngẫu nhiên duy nhất `Guid.NewGuid().ToString("N") + ext` trước khi upload lên Cloudinary, không dùng tên file gốc của người dùng để triệt tiêu lỗ hổng Path Traversal.
    - **Bảo vệ `DailyMenuAppService`**:
      + Đặt thuộc tính `[Authorize(TooHungryPermissions.Dishes.Default)]` ở cấp class hoặc tối thiểu `[Authorize]` trên các phương thức đọc `GetAsync`, `GetListAsync`, `GetActiveForDateAsync`, và `[Authorize(TooHungryPermissions.Dishes.Edit)]` cho các thao tác cấu hình thực đơn ngày.
    - **Bảo vệ `RecipeController.by-dish`**:
      + Gắn `[Authorize(TooHungryPermissions.Recipes.Default)]` cho phương thức `GetActiveByDishIdAsync(Guid dishId)` tại `RecipeController.cs`. Chỉ người dùng có quyền quản lý hoặc xem công thức mới được phép truy xuất định lượng và nguyên liệu.
    - **Phân quyền hạt nhân `DishCategoryAppService`**:
      + Gắn quyền chi tiết cho từng action:
        * `GetAsync`, `GetListAsync`: `[Authorize(TooHungryPermissions.DishCategories.Default)]`
        * `CreateAsync`: `[Authorize(TooHungryPermissions.DishCategories.Create)]`
        * `UpdateAsync`: `[Authorize(TooHungryPermissions.DishCategories.Edit)]`
        * `DeleteAsync`: `[Authorize(TooHungryPermissions.DishCategories.Delete)]`
    - **Bảo vệ `TableOrderController` (Làm rõ tại /speckit.clarify)**:
      + Gắn `[Authorize(TooHungryPermissions.Orders.Default)]` cho `GetActiveOrderByTableIdAsync`.
      + Gắn `[Authorize(TooHungryPermissions.Orders.Edit)]` cho `CompleteActiveOrderByTableIdAsync`: Bảo đảm chỉ nhân sự được ủy quyền xử lý đơn (Thu ngân, Phục vụ, Quản lý) mới có thể kích hoạt hoàn tất đơn bàn và trigger khấu trừ kho FEFO theo công thức món ăn.

- **Q2: Cơ chế Bảo vệ Realtime SignalR Hub & Cấp Access Token phía Client (Làm rõ tại /speckit.clarify)**:
  - **A2**:
    - **Backend (`TableHub.cs`)**:
      + Đặt thuộc tính `[Authorize]` trên lớp `TableHub`. Chặn mọi kết nối WebSocket/Server-Sent Events không mang JWT Bearer Token hợp lệ.
      + Cho phép các vai trò nghiệp vụ đã xác thực (có quyền tối thiểu `TooHungryPermissions.Tables.Default` hoặc `TooHungryPermissions.Orders.Default`) nhận diện thông báo biến động bàn và đơn hàng.
    - **Frontend (`TableSignalRService.ts`)**:
      + Bổ sung cấu hình `accessTokenFactory` trong `HubConnectionBuilder`:
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
        * Chỉ khởi tạo và gọi `startConnection()` khi người dùng đã xác thực thành công (`oAuthService.hasValidAccessToken() == true`). Tuyệt đối không tự động kết nối ngầm khi ở màn hình đăng nhập `/account/login`.
        * Bắt sự kiện ngắt kết nối do 401 Unauthorized / Token Expired: Tự động kích hoạt cơ chế `oAuthService.refreshToken()` của thư viện `angular-oauth2-oidc` để xin token mới và tái kết nối nền mượt mà, không làm đứt quãng trải nghiệm của nhân viên phục vụ.
        * Lắng nghe sự kiện đăng xuất: Khi người dùng bấm Đăng xuất hoặc phiên làm việc kết thúc, tự động gọi `stopConnection()` và giải phóng bộ nhớ.

- **Q3: Chuẩn hóa Ẩn/Hiện Nút Thao tác trên Giao diện Angular bằng `*abpPermission`**:
  - **A3**:
    - Rà soát và bao bọc toàn bộ các nút hành động nhạy cảm trên 8 phân hệ bằng chỉ thị cấu trúc `*abpPermission`:
      1. **Món ăn (`dishes`)**:
         - Nút "Thêm món mới": `*abpPermission="'TooHungry.Dishes.Create'"`
         - Nút "Chỉnh sửa": `*abpPermission="'TooHungry.Dishes.Edit'"`
         - Nút "Xóa món": `*abpPermission="'TooHungry.Dishes.Delete'"`
         - Nút "Xem/Sửa công thức": `*abpPermission="'TooHungry.Recipes.Default'"`
      2. **Danh mục món (`dish-categories`)**:
         - Nút "Thêm danh mục": `*abpPermission="'TooHungry.DishCategories.Create'"`
         - Nút "Sửa": `*abpPermission="'TooHungry.DishCategories.Edit'"`
         - Nút "Xóa": `*abpPermission="'TooHungry.DishCategories.Delete'"`
      3. **Đơn hàng (`orders`)**:
         - Nút "Tạo đơn": `*abpPermission="'TooHungry.Orders.Create'"`
         - Nút "Hủy đơn": `*abpPermission="'TooHungry.Orders.Cancel'"`
         - Nút "Chỉnh sửa đơn": `*abpPermission="'TooHungry.Orders.Edit'"`
      4. **Bàn ăn (`tables`) & Khu vực (`dining-areas`)**:
         - Nút "Thêm bàn/khu vực": `*abpPermission="'TooHungry.Tables.Create'"` / `'TooHungry.DiningAreas.Create'`
         - Nút "Sửa bàn/khu vực": `*abpPermission="'TooHungry.Tables.Edit'"` / `'TooHungry.DiningAreas.Edit'`
         - Nút "Xóa bàn/khu vực": `*abpPermission="'TooHungry.Tables.Delete'"` / `'TooHungry.DiningAreas.Delete'`
         - Nút "Cập nhật trạng thái": `*abpPermission="'TooHungry.Tables.UpdateStatus'"`
      5. **Kho nguyên liệu (`inventory`)**:
         - Nút "Nhập kho (Batch)": `*abpPermission="'TooHungry.Inventories.Batch'"`
         - Nút "Điều chỉnh kho (Adjust)": `*abpPermission="'TooHungry.Inventories.Adjust'"`
         - Nút "Hủy bỏ lô (Discard)": `*abpPermission="'TooHungry.Inventories.Discard'"`
         - Nút "Tạm ngưng lô": `*abpPermission="'TooHungry.Inventories.DeactivateBatch'"`
      6. **Công thức (`recipes`)**:
         - Nút "Tạo công thức": `*abpPermission="'TooHungry.Recipes.Create'"`
         - Nút "Chỉnh sửa công thức": `*abpPermission="'TooHungry.Recipes.Edit'"`
         - Nút "Xóa công thức": `*abpPermission="'TooHungry.Recipes.Delete'"`
      7. **Quản trị Người dùng & Vai trò (`identity`)**:
         - Nút "Thêm người dùng/vai trò": `*abpPermission="'AbpIdentity.Users.Create'"` / `'AbpIdentity.Roles.Create'`
         - Nút "Sửa": `*abpPermission="'AbpIdentity.Users.Update'"` / `'AbpIdentity.Roles.Update'`
         - Nút "Xóa": `*abpPermission="'AbpIdentity.Users.Delete'"` / `'AbpIdentity.Roles.Delete'`
         - Nút "Phân quyền (Permissions)": `*abpPermission="'AbpIdentity.Roles.ManagePermissions'"`

- **Q4: Loại bỏ Triệt để Role Name Hardcode, Chuyển sang ABP Permission-Based Checks (Làm rõ tại /speckit.clarify)**:
  - **A4**:
    - **Loại bỏ so khớp chuỗi thô**: Xóa bỏ hoàn toàn pattern `roles.some(r => ['Manager', 'Administrator', 'admin'].includes(r))` và `['Waiter', 'Manager', 'Administrator', 'admin']` tại:
      + `waiter-auth.guard.ts`
      + `dashboard.guard.ts`
      + `user-role-navigation.service.ts`
      + `waiter-layout.component.ts`
      + `inventory-keeper-layout.component.ts`
    - **Phân luồng điều hướng động 100% dựa trên Granular Policies của ABP**:
      + Kiểm tra quyền qua `permissionService.getGrantedPolicy$`:
        * Nếu người dùng có quyền `TooHungry.Dashboard` -> Điều hướng về `/` (Dashboard Quản trị).
        * Nếu người dùng có quyền `TooHungry.Tables.Default` hoặc `TooHungry.Orders.Default` (nhưng không có Dashboard) -> Điều hướng về `/waiter/tables` (Giao diện phục vụ).
        * Nếu người dùng có quyền `TooHungry.Inventories.*` -> Điều hướng về `/inventory-keeper` (Cổng thông tin thủ kho).
      + **Nút "Về Quản trị" (Back to Admin)**: Hiển thị nếu người dùng sở hữu ít nhất MỘT trong các quyền quản trị nghiệp vụ (`Dashboard`, `Users`, `Roles`, `Settings`, `Dishes`, `Recipes`), không phụ thuộc chuỗi tên vai trò tĩnh.

- **Q5: Chuẩn hóa Phân quyền Vai trò (`roles.ts`) & Mã hóa URL Provider Key**:
  - **A5**:
    - **Mã hóa URL an toàn**: Trong `angular/src/app/identity/roles/roles.ts`, mã hóa `encodeURIComponent(providerKey)` và `encodeURIComponent(providerName)` khi gửi yêu cầu tới `/api/permission-management/permissions`.
    - **Tối ưu hóa gọi API**: Chuyển đổi việc quản lý quyền vai trò sang sử dụng component chuẩn `<abp-permission-management>` hoặc service proxy chính thức của module ABP Permission Management, loại bỏ việc inject `HttpClient` thừa và các cuộc gọi `updateRoles` trùng lặp trong `users.ts`.

- **Q6: Vệ sinh Secrets, Tắt PII & Vô hiệu hóa Swagger trên Production (Làm rõ tại /speckit.clarify)**:
  - **A6**:
    - **Vệ sinh `appsettings.json` & Phân tầng Cấu hình Chuẩn .NET**:
      + Thay thế các mật mã nhạy cảm hardcode (`CertificatePassPhrase`, `DefaultPassPhrase`) trong file `appsettings.json` bằng chuỗi placeholder an toàn chuẩn: `"__CONFIGURE_VIA_ENV_OR_USER_SECRETS__"`.
      + **Phân tầng nạp bí mật**:
        * *Local Development*: Sử dụng .NET User Secrets (`dotnet user-secrets set "AuthServer:CertificatePassPhrase" "..."`) hoặc file cục bộ không commit git.
        * *Production / Staging*: Nạp bắt buộc thông qua Biến môi trường hệ thống (`AUTH_SERVER_CERTIFICATE_PASSPHRASE` và `STRING_ENCRYPTION_DEFAULT_PASSPHRASE`).
      + **Tài liệu hóa**: Cung cấp file hướng dẫn mẫu `appsettings.secrets.example.json` hướng dẫn các khóa cấu hình cần thiết.
      + **Chốt chặn khởi động (Fail-fast Startup)**: Nếu ứng dụng khởi chạy ở môi trường `Production` mà phát hiện giá trị passphrase vẫn giữ placeholder hoặc bị rỗng, hệ thống ném ra `InvalidOperationException` và dừng khởi động máy chủ ngay lập tức.
    - **Tắt `ShowPII` trên Production**:
      + Trong `TooHungryHttpApiHostModule.cs`, ràng buộc chặt chẽ:
        ```csharp
        if (hostingEnvironment.IsDevelopment() && !configuration.GetValue<bool>("App:DisablePII"))
        {
            Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;
        }
        else
        {
            Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = false;
        }
        ```
    - **Tắt Swagger UI trên Production**:
      + Chỉ kích hoạt Swagger middleware khi `env.IsDevelopment()`:
        ```csharp
        if (env.IsDevelopment())
        {
            app.UseSwagger();
            app.UseAbpSwaggerUI(options => ...);
        }
        ```
    - **Bảo vệ thông tin cấu hình thanh toán VietQR**:
      + Giữ thông tin cấu hình tài khoản thụ hưởng trong `environment.ts` và `environment.prod.ts`, không để lộ thông tin xác thực mật hoặc API key trong mã nguồn mở.

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Bảo mật Endpoints Backend & Kiểm soát Upload Tệp An toàn (Ưu tiên: P1)

Là một Quản trị viên hệ thống và Chuyên viên bảo mật, tôi muốn tất cả các API nghiệp vụ quan trọng (Upload ảnh món ăn, Tra cứu công thức, Thực đơn ngày, Cập nhật trạng thái đơn bàn) đều phải được bảo vệ bởi các quyền truy cập ABP cụ thể và xác thực định dạng tệp chặt chẽ, để ngăn chặn kẻ xấu tấn công tải lên mã độc hại hoặc đánh cắp dữ liệu kinh doanh của nhà hàng.

**Lý do cho mức độ ưu tiên này**: Đây là lỗ hổng bảo mật trực tiếp ở tầng máy chủ, có nguy cơ cho phép kẻ xấu khai thác tải file độc hại (RCE), làm lộ công thức chế biến độc quyền của nhà hàng hoặc thao túng hóa đơn ăn uống mà không cần đăng nhập.

**Kiểm thử Độc lập**:
- Gửi HTTP POST nặc danh tới `/api/app/media/upload-dish-image` -> Nhận phản hồi HTTP `401 Unauthorized`.
- Đăng nhập với tài khoản Waiter (chỉ có quyền Orders, không có quyền `TooHungry.Dishes.Edit`) upload ảnh -> Nhận HTTP `403 Forbidden`.
- Đăng nhập với tài khoản Quản lý, upload tệp giả mạo `.php` hoặc file ảnh có content-type sai -> Bị từ chối với thông báo lỗi thân thiện.
- Gửi yêu cầu HTTP GET nặc danh tới `/api/app/recipe/by-dish/{dishId}` -> Nhận HTTP `401 Unauthorized`.
- Gửi yêu cầu hoàn tất đơn tới `/api/app/table-orders/complete/{tableId}` khi không có quyền `Orders.Edit` -> Nhận HTTP `403 Forbidden`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một người dùng chưa đăng nhập (Anonymous), **Khi (When)** gửi HTTP POST tới `/api/app/media/upload-dish-image`, **Thì (Then)** máy chủ trả về mã lỗi HTTP `401 Unauthorized` ngay lập tức.
2. **Cho trước (Given)** một người dùng đã đăng nhập có quyền `TooHungry.Dishes.Edit`, **Khi (When)** tải lên tệp có đuôi `.jpg` nhưng ContentType là `application/x-msdownload` hoặc `text/plain`, **Thì (Then)** máy chủ từ chối tiếp nhận với `UserFriendlyException` cảnh báo định dạng tệp không hợp lệ.
3. **Cho trước (Given)** một người dùng chưa đăng nhập, **Khi (When)** gửi yêu cầu GET tới `/api/app/recipe/by-dish/{dishId}`, **Thì (Then)** máy chủ chặn truy cập với HTTP `401 Unauthorized`.
4. **Cho trước (Given)** một người dùng chỉ có quyền xem danh mục (`TooHungry.DishCategories.Default`), **Khi (When)** gửi yêu cầu POST tạo mới danh mục tới `DishCategoryAppService.CreateAsync`, **Thì (Then)** hệ thống ném ra `AbpAuthorizationException` (HTTP `403 Forbidden`).

---

### User Story 2 - Bảo vệ Kênh Kết nối Thời gian thực SignalR Hub (Ưu tiên: P1)

Là một Lập trình viên và Nhân viên vận hành, tôi muốn kết nối Realtime WebSocket tới `TableHub` bắt buộc phải mang JWT Access Token hợp lệ của nhân viên nhà hàng, để bảo vệ dữ liệu biến động bàn ăn và đơn hàng không bị nghe lén bởi người ngoài.

**Lý do cho mức độ ưu tiên này**: Tránh việc bất kỳ ai bên ngoài Internet có thể mở kết nối WebSocket tới máy chủ nhà hàng để thu thập dữ liệu khách ăn, thời gian dùng bữa và biến động doanh thu theo thời gian thực.

**Kiểm thử Độc lập**:
- Mở client WebSocket (như Postman hoặc wscat) kết nối tới `/signalr-hubs/table` mà không có Bearer token -> Kết nối bị từ chối với HTTP `401 Unauthorized`.
- Kiểm tra `TableSignalRService.ts` trên Angular, khi người dùng đăng nhập thành công -> SignalR tự động truyền Access Token thông qua `accessTokenFactory` và kết nối thành công, nhận sự kiện `TableStatusChanged` và `TableOrderUpdated`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** kết nối WebSocket từ bên ngoài không có JWT token, **Khi (When)** bắt tay kết nối (handshake) tới `/signalr-hubs/table`, **Thì (Then)** máy chủ từ chối kết nối với HTTP `401 Unauthorized`.
2. **Cho trước (Given)** nhân viên phục vụ đăng nhập hợp lệ trên giao diện Waiter, **Khi (When)** `TableSignalRService` khởi tạo kết nối, **Thì (Then)** token được đính kèm tự động qua `accessTokenFactory`, trạng thái kết nối chuyển sang `Connected`, và thông báo realtime hoạt động mượt mà.
3. **Cho trước (Given)** nhân viên đăng xuất khỏi hệ thống, **Khi (When)** phiên làm việc kết thúc, **Thì (Then)** `TableSignalRService` chủ động ngắt kết nối (`stopConnection()`), không phát sinh lỗi kết nối rò rỉ.

---

### User Story 3 - Kiểm soát Hiển thị Nút Thao tác trên Giao diện Angular qua `*abpPermission` (Ưu tiên: P1)

Là một Nhân viên hoặc Quản lý nhà hàng, khi đăng nhập vào hệ thống, tôi chỉ muốn nhìn thấy các nút chức năng (Thêm, Sửa, Xóa, Đổi trạng thái, Nhập kho) mà vai trò của tôi được phép thực hiện, để giao diện gọn gàng, trực quan và không gây hiểu nhầm khi bấm vào nút mà bị báo lỗi không có quyền.

**Lý do cho mức độ ưu tiên này**: Nâng cao trải nghiệm người dùng (UX), ngăn ngừa nhầm lẫn trong thao tác nghiệp vụ và bảo đảm giao diện phản ánh đúng chính sách phân quyền của doanh nghiệp.

**Kiểm thử Độc lập**:
- Đăng nhập bằng tài khoản "Nhân viên phục vụ (Waiter)" -> Truy cập màn hình Danh sách món ăn `/dishes`: Nút "Thêm món", "Chỉnh sửa", "Xóa" biến mất hoàn toàn khỏi giao diện.
- Đăng nhập bằng tài khoản "Thủ kho (Inventory Keeper)" -> Màn hình Quản lý kho `/inventory`: Các nút "Nhập kho", "Kiểm kê/Điều chỉnh", "Hủy lô" hiển thị đầy đủ; nhưng menu "Quản lý Người dùng" hoặc "Cấu hình Món ăn" bị ẩn.
- Đăng nhập bằng tài khoản "Quản lý (Manager)" -> Tất cả các nút thao tác nghiệp vụ hiển thị đầy đủ theo phân quyền được cấp.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** người dùng không có quyền `TooHungry.Dishes.Create`, **Khi (When)** mở trang Quản lý Món ăn, **Thì (Then)** nút "Thêm món mới" không xuất hiện trên cây DOM (`*abpPermission` loại bỏ thẻ).
2. **Cho trước (Given)** người dùng không có quyền `TooHungry.Inventories.Adjust`, **Khi (When)** mở trang Quản lý Kho, **Thì (Then)** nút "Điều chỉnh tồn kho" bị ẩn.
3. **Cho trước (Given)** người dùng có đầy đủ quyền thao tác trên Bàn ăn (`TooHungry.Tables.*`), **Khi (When)** mở trang Sơ đồ bàn, **Thì (Then)** toàn bộ các nút Tạo bàn, Sửa bàn, Đổi trạng thái hiển thị đầy đủ và tương tác bình thường.

---

### User Story 4 - Chuẩn hóa Cơ chế Kiểm tra Quyền và Loại bỏ Role Name Hardcode (Ưu tiên: P2)

Là một Kiến trúc sư phần mềm, tôi muốn hệ thống frontend kiểm tra quyền truy cập dựa trên mã quyền định danh chuẩn của ABP (`Permission-Based Authorization`) thay vì kiểm tra theo danh sách chuỗi tên vai trò cố định (`['Manager', 'Administrator', 'admin']`), để doanh nghiệp có thể tự do tạo các vai trò mới (như "Bếp trưởng", "Giám sát ca", "Kế toán trưởng") và gán quyền linh hoạt mà không phải sửa lại code frontend.

**Lý do cho mức độ ưu tiên này**: Việc hardcode tên vai trò vi phạm nguyên tắc thiết kế mở rộng của ABP Framework, dẫn đến việc bất kỳ vai trò mới nào được tạo qua màn hình Identity Role đều không thể truy cập các tính năng tương ứng dù đã được cấp đầy đủ quyền.

**Kiểm thử Độc lập**:
- Tạo một vai trò mới trong hệ thống có tên `"FloorSupervisor"` và cấp quyền `TooHungry.Tables.*` cùng `TooHungry.Orders.*`.
- Đăng nhập bằng người dùng mang vai trò `"FloorSupervisor"`: Guard cho phép truy cập màn hình bàn ăn và đơn hàng thành công mà không bị chặn bởi bộ lọc role name cũ.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một vai trò người dùng tùy biến không nằm trong danh sách `['Manager', 'Administrator', 'admin']` nhưng được cấp quyền `TooHungry.Tables.Default`, **Khi (When)** truy cập route `/tables`, **Thì (Then)** guard phê duyệt truy cập thành công dựa trên `permissionService.getGrantedPolicy$('TooHungry.Tables.Default')`.
2. **Cho trước (Given)** một nhân viên phục vụ không sở hữu bất kỳ quyền quản trị cấp cao nào, **Khi (When)** xem thanh điều hướng Waiter Layout, **Thì (Then)** nút "Về trang Quản trị" tự động ẩn đi.

---

### User Story 5 - Vệ sinh Secrets & Thắt chặt An toàn Môi trường Production (Ưu tiên: P2)

Là một Kỹ sư DevOps và Quản trị viên hệ thống, tôi muốn kho mã nguồn không chứa bất kỳ chuỗi mật khẩu/khóa chứng chỉ hardcode nào, đồng thời tại môi trường Production các thông tin nhạy cảm (PII) và giao diện tài liệu Swagger UI được tự động tắt bỏ, để bảo vệ hệ thống trước các cuộc tấn công rò rỉ mã nguồn và khai thác thông tin hạ tầng.

**Lý do cho mức độ ưu tiên này**: Ngăn chặn rủi ro lộ mật khẩu chứng chỉ OpenIddict hoặc lộ khóa mã hóa dữ liệu khi repo được chia sẻ hoặc sao lưu; giảm thiểu bề mặt tấn công (attack surface) trên môi trường thực tế.

**Kiểm thử Độc lập**:
- Quét toàn bộ repo `appsettings.json`: Không còn mật khẩu nhạy cảm thô.
- Khởi chạy ứng dụng với biến môi trường `ASPNETCORE_ENVIRONMENT=Production`:
  + Truy cập đường dẫn `/swagger`: Máy chủ trả về HTTP `404 Not Found`.
  + Ghi log xác thực token: Thuộc tính `ShowPII` tắt hoàn toàn, không ghi vết dữ liệu cá nhân vào log file.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** tệp cấu hình `appsettings.json`, **Khi (When)** rà soát mã nguồn, **Thì (Then)** các trường `CertificatePassPhrase` và `DefaultPassPhrase` sử dụng giá trị an toàn hoặc nạp qua biến môi trường.
2. **Cho trước (Given)** ứng dụng đang chạy ở môi trường `Production`, **Khi (When)** gửi yêu cầu GET tới `/swagger/index.html`, **Thì (Then)** máy chủ trả về mã lỗi 404 (Swagger UI bị vô hiệu hóa).
3. **Cho trước (Given)** ứng dụng đang chạy ở môi trường `Development`, **Khi (When)** truy cập `/swagger/index.html`, **Thì (Then)** giao diện Swagger UI mở bình thường phục vụ nhà phát triển.

---

### User Story 6 - Chuẩn hóa Quản trị Quyền Role & Khắc phục Lời gọi API Thiếu Mã hóa (Ưu tiên: P3)

Là một Quản trị viên phân quyền, khi tôi phân quyền cho các vai trò có tên đặc biệt (có dấu Tiếng Việt, dấu cách hoặc ký tự đặc biệt), tôi muốn hệ thống mã hóa đường dẫn API chuẩn xác để việc lưu quyền và tải quyền luôn hoạt động mượt mà không bị lỗi 400 hoặc 500.

**Lý do cho mức độ ưu tiên này**: Bảo đảm tính toàn vẹn của phân hệ Identity & Phân quyền khi sử dụng tên vai trò bản địa hóa Tiếng Việt (ví dụ: "Quản lý ca", "Thu ngân").

**Kiểm thử Độc lập**:
- Tạo vai trò có tên `"Quản Lý Ca Tối"` và mở popup Phân quyền: Cửa sổ mở mượt mà, URL yêu cầu được mã hóa dạng `/api/permission-management/permissions?providerName=R&providerKey=Qu%E1%BA%A3n%20L%C3%BD%20Ca%20T%E1%BB%91i`. Lưu quyền thành công.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** vai trò có tên chứa dấu cách hoặc ký tự tiếng Việt, **Khi (When)** người dùng mở modal quản lý quyền của vai trò đó, **Thì (Then)** tham số `providerKey` được mã hóa URL bằng `encodeURIComponent()`, tránh toàn bộ lỗi cú pháp HTTP.
2. **Cho trước (Given)** component `users.ts`, **Khi (When)** hoàn tất cập nhật người dùng, **Thì (Then)** hệ thống không gửi các lời gọi cập nhật vai trò dư thừa nếu danh sách vai trò không có sự thay đổi.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001 (Tải tệp vượt quá 5MB hoặc file rỗng)**: Người dùng chọn tải lên tệp ảnh dung lượng > 5MB hoặc tệp 0 byte -> Hệ thống chặn ngay ở tầng kiểm tra đầu vào, ném `UserFriendlyException` với thông điệp song ngữ rõ ràng, không gửi tệp sang Cloudinary.
- **EC-002 (Tệp giả mạo phần mở rộng - Extension Spoofing)**: Kẻ xấu đổi tên file thực thi `.exe` hoặc script `.sh` thành `.jpg` rồi tải lên -> Hệ thống kiểm tra `ContentType` không khớp định dạng `image/*` -> Từ chối xử lý và ghi log bảo mật.
- **EC-003 (Mất kết nối mạng khi đang duy trì SignalR)**: Mạng client bị gián đoạn đột ngột -> Cơ chế `withAutomaticReconnect([0, 2000, 5000, 10000])` tự động thử kết nối lại với token hiện hành khi mạng phục hồi, không làm crash giao diện Waiter.
- **EC-004 (Token JWT hết hạn trong phiên làm việc)**: Token truy cập hết hạn khi client đang mở -> SignalR bắt sự kiện ngắt kết nối và thử nạp lại token mới thông qua refresh token; nếu không thể làm mới, chuyển hướng an toàn về trang đăng nhập.
- **EC-005 (Người dùng bị thu hồi quyền trong lúc đang mở màn hình)**: Quản trị viên thu hồi quyền của nhân viên khi nhân viên đang mở màn hình -> Khi nhân viên bấm nút hành động, Backend ném `AbpAuthorizationException` (403); tầng `AppHttpErrorHandlerService` bắt lỗi và thông báo người dùng quyền hạn đã thay đổi, tự động điều hướng về trang hợp lệ.
- **EC-006 (Thiếu biến môi trường cấu hình PassPhrase trên Production)**: Nếu biến môi trường `CertificatePassPhrase` chưa được thiết lập trên máy chủ Production -> Ứng dụng ném ngoại lệ cấu hình tường minh lúc khởi động (`InvalidOperationException`) thay vì sử dụng mật khẩu mặc định không an toàn.
- **EC-007 (Tên vai trò chứa ký tự đặc biệt XSS)**: Tên vai trò nhập vào chứa mã script HTML -> Hệ thống mã hóa an toàn khi hiển thị và khi truyền qua query string, ngăn chặn hoàn toàn nguy cơ Cross-Site Scripting.

---

## Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI áp dụng kiểm tra phân quyền hạt nhân `[Authorize(TooHungryPermissions.Dishes.Edit)]` cho endpoint `POST /api/app/media/upload-dish-image` tại `MediaController`.
- **FR-002**: Hệ thống PHẢI kiểm tra tính hợp lệ của tệp ảnh tải lên tại `MediaController` qua 3 lớp phòng vệ: Dung lượng <= 5MB, phần mở rộng whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`), `ContentType` thuộc MIME ảnh chuẩn, và xác thực Magic Bytes nhị phân hợp lệ; đồng thời đổi tên tệp sang mã GUID ngẫu nhiên duy nhất trước khi chuyển tiếp lên CDN Cloudinary.
- **FR-003**: Hệ thống PHẢI áp dụng thuộc tính `[Authorize]` trên lớp `DailyMenuAppService` và kiểm tra quyền cụ thể cho từng phương thức đọc và cập nhật thực đơn ngày.
- **FR-004**: Hệ thống PHẢI áp dụng `[Authorize(TooHungryPermissions.Recipes.Default)]` cho endpoint `GET /api/app/recipe/by-dish/{dishId}` tại `RecipeController`.
- **FR-005**: Hệ thống PHẢI áp dụng phân quyền hạt nhân cho `DishCategoryAppService`: `Default` cho đọc, `Create` cho tạo mới, `Edit` cho cập nhật, `Delete` cho xóa danh mục.
- **FR-006**: Hệ thống PHẢI áp dụng phân quyền hạt nhân cho `TableOrderController`: `Orders.Default` cho xem active order và `Orders.Edit` cho hoàn tất active order (`CompleteActiveOrderByTableIdAsync`), bảo đảm chỉ người dùng được cấp quyền sửa/xử lý đơn hàng mới có thể kích hoạt hoàn tất đơn và xuất trừ kho.
- **FR-007**: Hệ thống PHẢI bảo vệ `TableHub` bằng thuộc tính `[Authorize]`, ngăn chặn các kết nối thời gian thực nặc danh.
- **FR-008**: Dịch vụ `TableSignalRService` phía client PHẢI truyền JWT Access Token thông qua `accessTokenFactory` khi khởi tạo kết nối SignalR Hub.
- **FR-009**: Dịch vụ `TableSignalRService` PHẢI chỉ khởi động kết nối khi người dùng đã xác thực đăng nhập và tự động ngắt kết nối khi đăng xuất.
- **FR-010**: Giao diện Angular PHẢI gắn chỉ thị `*abpPermission` lên toàn bộ các nút thao tác Tạo, Sửa, Xóa, Cập nhật trạng thái trên 8 phân hệ: Món ăn, Danh mục món, Đơn hàng, Bàn ăn, Khu vực, Kho nguyên liệu, Công thức, Người dùng/Vai trò.
- **FR-011**: Hệ thống client PHẢI loại bỏ 100% việc so khớp chuỗi tên vai trò hardcode (`['Manager', 'Administrator', 'admin']` và `['Waiter', ...]`) tại `waiter-auth.guard.ts`, `dashboard.guard.ts`, `user-role-navigation.service.ts` và các layout components.
- **FR-012**: Hệ thống client PHẢI chuyển đổi toàn bộ logic kiểm tra quyền sang sử dụng `PermissionService.getGrantedPolicy$` của ABP Framework: Phân luồng về Dashboard (`/`) khi có `TooHungry.Dashboard`, về bàn ăn (`/waiter/tables`) khi có `TooHungry.Tables.Default` hoặc `TooHungry.Orders.Default`, về kho (`/inventory-keeper`) khi có `TooHungry.Inventories.*`; nút "Về Quản trị" hiển thị khi có bất kỳ quyền quản trị nghiệp vụ nào.
- **FR-013**: Thành phần `roles.ts` PHẢI mã hóa URL an toàn tham số `providerKey` khi gửi yêu cầu tới API quản lý quyền hạn.
- **FR-014**: Thành phần `users.ts` PHẢI dọn dẹp các lời gọi API dư thừa và loại bỏ các dependencies không cần thiết.
- **FR-015**: Hệ thống PHẢI loại bỏ 100% mật khẩu và chứng chỉ hardcode khỏi `appsettings.json`, lưu trữ bằng placeholder chuẩn `'__CONFIGURE_VIA_ENV_OR_USER_SECRETS__'`, hỗ trợ nạp cấu hình phân tầng qua .NET User-Secrets và Biến môi trường hệ thống, đồng thời kích hoạt chốt chặn dừng khởi động máy chủ (Fail-fast Startup) nếu phát hiện thiếu bí mật trên Production.
- **FR-016**: Hệ thống PHẢI tắt thuộc tính `ShowPII` tại `TooHungryHttpApiHostModule` khi chạy trên môi trường khác Development.
- **FR-017**: Hệ thống PHẢI vô hiệu hóa giao diện Swagger UI khi chạy trên môi trường Production (`env.IsDevelopment() == false`).
- **FR-018**: Cấu hình thông tin tài khoản ngân hàng thụ hưởng VietQR PHẢI được quản lý an toàn trong file cấu hình môi trường `environment.ts` / `environment.prod.ts`.
- **FR-019**: Mọi thông báo lỗi bảo mật và từ chối truy cập PHẢI hỗ trợ đầy đủ song ngữ Tiếng Việt và Tiếng Anh (`vi.json`, `en.json`).
- **FR-020**: Hệ thống PHẢI bảo toàn tính liên tục của trải nghiệm người dùng khi token được làm mới, tự động khôi phục các kết nối thời gian thực mà không làm gián đoạn màn hình đang thao tác.

---

### Các Thực thể Chính (Key Entities)

- **IdentityRole**: Đại diện cho vai trò người dùng trong hệ thống (như Waiter, Cashier, Kitchen, InventoryKeeper, Manager), đóng vai trò là tập hợp các quyền hạn được gán.
- **IdentityUser**: Đại diện cho tài khoản nhân viên đăng nhập vào hệ thống, thuộc một hoặc nhiều vai trò.
- **PermissionGrant**: Bản ghi liên kết cấp phát quyền hạn giữa một mã quyền cụ thể (ví dụ `TooHungry.Orders.Create`) với một người dùng hoặc vai trò.
- **MediaUploadRequest**: Đối tượng đóng gói thông tin tệp tải lên bao gồm luồng dữ liệu tệp, định dạng MIME, kích thước và định danh an toàn.
- **SignalRConnectionContext**: Ngữ cảnh kết nối thời gian thực lưu trữ danh tính đã xác thực của người dùng kết nối tới `TableHub`.

---

## Tiêu chí Thành công (Success Criteria)

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% các endpoint nghiệp vụ tại `MediaController`, `RecipeController`, `TableOrderController`, `DishCategoryAppService`, `DailyMenuAppService` và `TableHub` đều bị chặn với HTTP `401 Unauthorized` khi gọi ẩn danh.
- **SC-002**: 100% các tệp tải lên không phải định dạng ảnh hợp lệ hoặc vượt quá 5MB đều bị từ chối tiếp nhận trước khi chuyển tiếp tới máy chủ Cloudinary.
- **SC-003**: 0% chuỗi hardcode role name (`'Manager'`, `'Administrator'`, `'admin'`) còn tồn tại trong logic kiểm tra quyền của các Guards và Navigation Services.
- **SC-004**: 100% các nút hành động nhạy cảm trên 8 phân hệ màn hình Angular đều được bảo vệ bởi chỉ thị `*abpPermission` tương ứng với mã quyền ABP.
- **SC-005**: 0 bí mật thô (passphrase, encryption keys) còn tồn tại trong mã nguồn git repository tại `appsettings.json`.
- **SC-006**: Swagger UI và thông tin cá nhân PII bị vô hiệu hóa 100% trên môi trường Production, giảm thiểu bề mặt tấn công.
- **SC-007**: 100% các bài kiểm thử tự động về phân quyền và bảo mật (Unit & Integration Tests) vượt qua thành công với độ tin cậy tuyệt đối.

---

## Các Giả định (Assumptions)

- Hệ thống xác thực danh tính OpenIddict đã được cấu hình và hoạt động ổn định trên toàn solution Acme.TooHungry.
- Các tài khoản nhân viên được cấp phát vai trò và quyền hạn thông qua module quản trị Identity chuẩn của ABP Framework.
- Tài khoản Cloudinary sử dụng cho việc lưu trữ hình ảnh món ăn đã được cấp hạn ngạch và cấu hình biến môi trường sẵn sàng.
- Các nhà phát triển cục bộ có khả năng cấu hình biến môi trường hoặc tệp `appsettings.secrets.json` cá nhân khi chạy ứng dụng trên máy trạm.
