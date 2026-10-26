# Kế hoạch Triển khai (Implementation Plan): RM-023 Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement)

**Nhánh (Branch)**: `023-rm-023-security-and-authorization` | **Ngày**: 2026-10-23 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/023-rm-023-security-and-authorization/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 23-10-2026 với 5 quyết định tương tác & định hướng kỹ thuật then chốt:
1. **Phân quyền Hạt nhân Endpoints Backend**: Gắn `[Authorize]` cụ thể cho `MediaController` (`Dishes.Edit`), `DailyMenuAppService` (`Dishes.Default`), `RecipeController` (`Recipes.Default`), `DishCategoryAppService` (CRUD phân rã) và `TableOrderController` (`Orders.Default` cho xem active, `Orders.Edit` cho hoàn tất đơn bàn).
2. **Xác thực An toàn Upload Ảnh 3 Lớp**: Whitelist extension (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, dung lượng <= 5MB) + MIME ContentType chuẩn + Kiểm tra Magic Bytes nhị phân (chữ ký tệp) + Đổi tên tệp thành mã GUID ngẫu nhiên duy nhất chống Path Traversal trên Cloudinary.
3. **Bảo vệ Realtime SignalR Hub**: Thêm `[Authorize]` trên `TableHub.cs`; phía client `TableSignalRService.ts` chỉ kết nối khi `isAuthenticated=true`, truyền token qua `accessTokenFactory`, tự động refresh token khi gặp 401 và ngắt kết nối khi logout.
4. **Kiểm soát Nút Thao tác Angular qua `*abpPermission`**: Gắn chỉ thị `*abpPermission` lên toàn bộ nút hành động nhạy cảm trên 8 phân hệ màn hình (`dishes`, `dish-categories`, `orders`, `tables`, `dining-areas`, `inventory`, `recipes`, `identity`).
5. **Loại bỏ Role Name Hardcode & Chuẩn hóa Guards**: Xóa bỏ hoàn toàn pattern `roles.some(r => ['Manager', 'Administrator', 'admin'].includes(r))` tại các Guards và Services, chuyển sang phân luồng động 100% dựa trên Granular Policies của ABP (`permissionService.getGrantedPolicy$`).
6. **Vệ sinh Secrets & Thắt chặt Môi trường Production**: Loại bỏ mật khẩu hardcode khỏi `appsettings.json`, nạp phân tầng qua .NET User-Secrets và Biến môi trường; kích hoạt Fail-fast Startup trên Production; tắt `ShowPII = false` và vô hiệu hóa Swagger UI trên Production.
7. **Chuẩn hóa Phân quyền Vai trò**: Mã hóa an toàn `encodeURIComponent(providerKey)` trong `roles.ts`, dọn dẹp lời gọi API trùng lặp trong `users.ts`.

---

## Tóm tắt (Summary)

Kế hoạch triển khai **RM-023: Bảo mật & Chuẩn hóa Phân quyền Hệ thống** xử lý triệt để 9 vấn đề an toàn thông tin và phân quyền nghiêm trọng phát hiện từ `CODE_REVIEW.md`. Gói nâng cấp này xây dựng một hàng rào phòng thủ theo chiều sâu (Defense-in-Depth) vững chắc, bảo vệ toàn diện cả tầng giao tiếp mạng, tầng ứng dụng máy chủ và tầng trải nghiệm người dùng, đảm bảo ứng dụng vận hành an toàn tuyệt đối trong môi trường sản xuất thực tế.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: C# 13, .NET 10.0, ABP Framework 9.x, Angular 19+
- **Truy cập Cơ sở Dữ liệu & Danh tính**: Entity Framework Core 9.x, OpenIddict, Volo.Abp.Identity, Volo.Abp.PermissionManagement
- **Kênh Thời gian thực**: Microsoft SignalR Core, Volo.Abp.AspNetCore.SignalR
- **Lưu trữ Đám mây**: CloudinaryDotNet SDK
- **Kiểm thử**: xUnit, Shouldly, NSubstitute, Volo.Abp.TestBase, Jasmine/Karma
- **Nền tảng đích**: Backend Web API Host, Background Worker, Frontend Angular SPA
- **Ràng buộc An toàn & Bảo mật**:
  - Không còn bất kỳ mật mã nào được commit vào git repo.
  - Chặn 100% truy cập trái phép hoặc nặc danh vào các API và WebSocket.
  - Vô hiệu hóa toàn bộ bề mặt tấn công tài liệu (Swagger) và rò rỉ dữ liệu (PII) trên môi trường Production.
  - 100% thông báo lỗi bảo mật được nội địa hóa song ngữ trong `vi.json` và `en.json`.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp ABP**:
  - Tầng Domain nắm giữ logic cốt lõi; tầng Application Services và Controllers thực thi kiểm tra quyền nghiêm ngặt (`[Authorize]`) và điều phối use cases.
- [x] **II. UML & Domain Model Alignment**:
  - Nhất quán 100% với cấu trúc người dùng, vai trò và phân quyền trong mô hình nghiệp vụ `RMS-TH.vpp`.
- [x] **III. Test-First & Cổng chất lượng tự động**:
  - Lập kế hoạch bổ sung Unit & Integration Tests cho việc kiểm tra quyền hạn, từ chối nặc danh và xác thực an toàn tệp tải lên.
- [x] **IV. Hợp đồng API nghiêm ngặt**:
  - Toàn bộ endpoints và DTOs được định kiểu mạnh, tuân thủ hợp đồng chi tiết tại `contracts/security-contracts.md`.
- [x] **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy**:
  - Áp dụng nguyên tắc đặc quyền tối thiểu (Least Privilege), loại bỏ lỗ hổng RCE qua upload tệp, bảo vệ kênh WebSocket và dọn dẹp secrets khỏi repo.
- [x] **VI. Sự nhất quán UI/UX (Theme Cam & Trắng)**:
  - Ẩn/hiện nút mượt mà bằng `*abpPermission` mà không làm xáo trộn layout; bảo toàn trải nghiệm realtime SignalR khi làm mới token.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - Bổ sung đầy đủ thông điệp lỗi bảo mật song ngữ đồng bộ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ tài liệu được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (`specs/023-rm-023-security-and-authorization/`)
```text
specs/023-rm-023-security-and-authorization/
├── spec.md                                 # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                                 # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                             # Kết quả nghiên cứu 7 quyết định kỹ thuật Phase 0
├── data-model.md                           # Ma trận quyền hạn, Magic Bytes, cấu hình bí mật, i18n
├── quickstart.md                           # Hướng dẫn kiểm định 6 kịch bản xác thực trọng yếu
├── contracts/
│   └── security-contracts.md              # Hợp đồng API, SignalR Hub, Angular Services & Directives
└── checklists/
    └── requirements.md                     # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Triển khai & Tái cấu trúc
```text
src/Acme.TooHungry.HttpApi.Host/
├── appsettings.json                        # Thay thế secrets bằng placeholder an toàn
├── appsettings.secrets.example.json        # File mẫu hướng dẫn cấu hình cục bộ
├── TooHungryHttpApiHostModule.cs           # Tắt ShowPII, Swagger trên Production, Fail-fast Startup
└── Hubs/
    └── TableHub.cs                         # Bổ sung [Authorize] bảo vệ WebSocket

src/Acme.TooHungry.HttpApi/
└── Controllers/
    ├── MediaController.cs                  # [Authorize], xác thực 3 lớp (Ext, MIME, Magic Bytes), tên GUID
    ├── RecipeController.cs                 # Bổ sung [Authorize(Recipes.Default)] cho by-dish/{dishId}
    └── TableOrderController.cs             # [Authorize(Orders.Default)] cho active, [Authorize(Orders.Edit)] cho complete

src/Acme.TooHungry.Application/
├── DailyMenus/
│   └── DailyMenuAppService.cs              # Bổ sung [Authorize] cấp class và phương thức
└── Dishes/
    └── DishAppServices.cs                  # Bổ sung quyền hạt nhân DishCategories.* cho DishCategoryAppService

src/Acme.TooHungry.Domain.Shared/
└── Localization/TooHungry/
    ├── vi.json                             # Bổ sung thông điệp lỗi bảo mật Tiếng Việt
    └── en.json                             # Bổ sung thông điệp lỗi bảo mật Tiếng Anh

angular/src/app/
├── shared/
│   ├── services/
│   │   ├── table-signalr.service.ts        # accessTokenFactory, vòng đời Auth, auto refresh token
│   │   └── user-role-navigation.service.ts # Phân luồng động theo Policies, bỏ role hardcode
│   └── guards/
│       ├── dashboard.guard.ts              # Bỏ check role name hardcode, dùng getGrantedPolicy$
│       └── waiter-auth.guard.ts            # Bỏ check role name hardcode, dùng getGrantedPolicy$
├── waiter/layout/
│   └── waiter-layout.component.ts          # Nút 'Về Quản trị' dựa trên quyền quản trị nghiệp vụ
├── identity/
│   ├── roles/roles.ts                      # Mã hóa encodeURIComponent(providerKey)
│   └── users/users.ts                      # Dọn dẹp HttpClient và tối ưu hóa updateRoles
└── [dish, dish-category, order, table, inventory, recipe, dining-area, identity]/*.component.html
                                            # Gắn *abpPermission lên toàn bộ các nút thao tác nghiệp vụ
```

---

## Lộ trình Triển khai Chi tiết (Implementation Phases)

### Phase 1: Vệ sinh Secrets & Thắt chặt Cấu hình Môi trường Production
- Thay thế các mật mã nhạy cảm trong `appsettings.json` bằng placeholder `'__CONFIGURE_VIA_ENV_OR_USER_SECRETS__'`.
- Tạo file mẫu `appsettings.secrets.example.json`.
- Cập nhật `TooHungryHttpApiHostModule.cs`:
  + Kiểm tra điều kiện `env.IsDevelopment()` trước khi kích hoạt `app.UseSwagger()` và `app.UseAbpSwaggerUI()`.
  + Ràng buộc `ShowPII = false` trên môi trường Production/Staging.
  + Thêm chốt chặn Fail-fast Startup: Nếu `env.IsProduction()` mà passphrase vẫn giữ placeholder -> Ném `InvalidOperationException`.

### Phase 2: Phân quyền Hạt nhân Endpoints Backend & Kiểm soát Upload Ảnh 3 Lớp
- Cập nhật `MediaController.cs`:
  + Đặt `[Authorize(TooHungryPermissions.Dishes.Edit)]`.
  + Tích hợp bộ kiểm tra 3 lớp: Whitelist extension, MIME ContentType, Magic Bytes nhị phân header.
  + Sinh mã GUID ngẫu nhiên duy nhất cho tên file trước khi đẩy sang Cloudinary.
- Cập nhật `DailyMenuAppService.cs`:
  + Đặt `[Authorize(TooHungryPermissions.Dishes.Default)]` trên toàn class.
- Cập nhật `RecipeController.cs`:
  + Bổ sung `[Authorize(TooHungryPermissions.Recipes.Default)]` trên endpoint `GetActiveByDishIdAsync`.
- Cập nhật `DishCategoryAppService` trong `DishAppServices.cs`:
  + Gắn quyền hạt nhân `TooHungryPermissions.DishCategories.*` trên các phương thức `GetAsync`, `GetListAsync`, `CreateAsync`, `UpdateAsync`, `DeleteAsync`.
- Cập nhật `TableOrderController.cs`:
  + Gắn `[Authorize(TooHungryPermissions.Orders.Default)]` cho `GetActiveOrderByTableIdAsync`.
  + Gắn `[Authorize(TooHungryPermissions.Orders.Edit)]` cho `CompleteActiveOrderByTableIdAsync`.

### Phase 3: Bảo vệ Realtime Hub SignalR & Quản trị Vòng đời Client
- Đặt `[Authorize]` trên lớp `TableHub.cs`.
- Tái cấu trúc `table-signalr.service.ts`:
  + Thêm cấu hình `accessTokenFactory: () => this.oAuthService.getAccessToken()`.
  + Lắng nghe trạng thái đăng nhập, chỉ kết nối khi `hasValidAccessToken() == true`.
  + Bắt sự kiện ngắt kết nối do 401 để kích hoạt `oAuthService.refreshToken()` và tái kết nối nền.
  + Gọi `stopConnection()` khi người dùng đăng xuất.

### Phase 4: Kiểm soát Hiển thị Nút Thao tác Angular qua `*abpPermission`
- Rà soát và bao bọc các nút hành động nhạy cảm trên 8 phân hệ màn hình Angular:
  + `dish.component.html` (Thêm, Sửa, Xóa)
  + `dish-category.component.html` (Thêm, Sửa, Xóa)
  + `order.component.html` (Tạo, Sửa, Hủy)
  + `table.component.html` & `dining-area.component.html` (Thêm, Sửa, Xóa, Cập nhật trạng thái)
  + `inventory.component.html` (Nhập kho, Điều chỉnh, Xuất hủy, Khóa lô)
  + `recipe.component.html` (Thêm, Sửa, Xóa)
  + `users.component.html` & `roles.component.html` (Thêm, Sửa, Xóa, Quản lý quyền)

### Phase 5: Loại bỏ Role Name Hardcode & Chuẩn hóa Router Guards
- Xóa bỏ việc kiểm tra chuỗi `['Manager', 'Administrator', 'admin']` và `['Waiter', ...]` tại:
  + `waiter-auth.guard.ts`
  + `dashboard.guard.ts`
  + `user-role-navigation.service.ts`
  + `waiter-layout.component.ts`
  + `inventory-keeper-layout.component.ts`
- Chuyển đổi sang kiểm tra quyền động qua `permissionService.getGrantedPolicy$`.
- Cập nhật `roles.ts`: Mã hóa `encodeURIComponent(providerKey)` và `encodeURIComponent(providerName)`.
- Cập nhật `users.ts`: Bỏ inject `HttpClient` thừa và tối ưu hóa việc gọi `updateRoles`.

### Phase 6: Kiểm thử Tự động & Quốc tế hóa i18n Song ngữ
- Bổ sung thông điệp lỗi bảo mật mới vào `vi.json` và `en.json` (cả Backend Domain.Shared và Frontend assets).
- Xây dựng các bài kiểm thử tự động xác thực phân quyền API và upload ảnh an toàn trong `Acme.TooHungry.Application.Tests` và `Acme.TooHungry.EntityFrameworkCore.Tests`.
- Chạy kiểm thử tự động toàn diện đảm bảo 100% tests PASS và không có hồi quy.
