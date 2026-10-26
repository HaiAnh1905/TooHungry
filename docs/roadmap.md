# Roadmap Build — Acme.TooHungry (Restaurant Management)

**Mục tiêu**: thứ tự build/hoàn thiện từng màn/chức năng.
**Cập nhật**: 2026-10-26
**Trạng thái item**: `chưa` (mặc định) / `đang` / `xong`.

> **Nguồn liệt-kê-được**: File Entities trong thư mục `src/Acme.TooHungry.Domain` kết hợp với thư mục `specs` và tài liệu rà soát mã nguồn toàn diện `CODE_REVIEW.md`.
> Đơn vị "màn/chức năng" = Quản lý (CRUD) một Entity, một chức năng dùng chung hoặc một gói giải pháp củng cố/ổn định hệ thống.
> Tổng 27 item sau khi gộp và ánh xạ (từ RM-001 đến RM-021 đã hoàn thành; bổ sung Wave 5 gồm RM-022 đến RM-026 giải quyết toàn diện 68 vấn đề phát hiện từ `CODE_REVIEW.md`, cùng RM-027 kiểm định và đối soát mã nguồn so với Code Review).
>
> **Chiến lược đã chốt (interview 2026-10-06 & cập nhật 2026-10-22)**:
> 1. **Granularity**: 1 màn cho 1 Entity hoặc cụm tính năng liên quan chặt chẽ.
> 2. **Wave 0 = foundation**: Auth, Shared UI, Identity, chặn mọi màn sau.
> 3. **Ưu tiên**: Master Data (Units, Ingredients, Dishes) lên trước, các nghiệp vụ vận hành (Orders, Inventory) để Wave sau cùng.
> 4. **Đánh số ID**: Cấp mới từ RM-001; sau khi loại bỏ RM-010 Thực đơn trong ngày, thực hiện đôn số tuần tự dịch trái (Shift left) từ RM-010 đến RM-016 (RM-010 POS, RM-011..013 Kho, RM-014 Dự báo, RM-015 Bố cục Waiter, RM-016 Thanh toán).
> 5. Giữ 1 item cho CRUD của cùng 1 Entity. Khu vực & Bàn ăn gộp chung thành RM-008 do dùng chung spec.
> 6. **Chuỗi tuần tự vận hành Waiter (Dependency Flow)**:
>    `Authentication (RM-001) → Waiter Routing & Layout (RM-015) → Table Management (RM-008) → Booking (RM-009) → Customer Check-in (RM-008: AVAILABLE → OCCUPIED) → Order (RM-010) → Payment (RM-016) → Cleaning (RM-008: CLEANING) → Table Available (RM-008: AVAILABLE)`
> 7. **Chu kỳ trạng thái bàn (Table State Flow)**:
>    ```text
>    AVAILABLE
>       │
>       ├── Đón khách ───────────────→ OCCUPIED
>       │
>       ├── Đặt bàn → RESERVED
>       │                 │
>       │                 ├── Đón khách → OCCUPIED
>       │                 ├── Hủy → AVAILABLE
>       │                 └── Timeout 1h → AVAILABLE
>       │
>       └── Vô hiệu → INACTIVE
>                             │
>                             └── Kích hoạt → AVAILABLE
>
>    OCCUPIED
>       │
>       ├── Không Order
>       │      └── Kết thúc → AVAILABLE
>       │
>       └── Có Order
>              └── Payment
>                    │
>                    └── Paid → CLEANING
>                                  │
>                                  └── Dọn xong → AVAILABLE
>    ```
> 8. **Wave 5 = System Hardening & Code Review Refactoring**: Gom toàn bộ 68 vấn đề phát hiện từ tài liệu `CODE_REVIEW.md` (34 Backend, 34 Frontend) thành 5 gói giải pháp và 1 gói kiểm định nghiệm thu:
>    - `RM-022`: Toàn vẹn dữ liệu, chống trừ kho sai, chống race condition và concurrency retry Backend.
>    - `RM-023`: Bảo mật endpoints, phân quyền hạt nhân ABP, bảo vệ SignalR Hub, ẩn nút bấm và vệ sinh secrets.
>    - `RM-024`: Tái cấu trúc hiệu năng Angular, vá lỗi phân trang, memory leak, tách component kho, chuẩn hóa Signal/RxJS và SCSS.
>    - `RM-025`: Tối ưu hóa truy vấn EF Core (chống N+1, sync blocking), đánh index, chuẩn hóa Exception/i18n và dọn dẹp mã nguồn chết.
>    - `RM-026`: Xây dựng bộ test tự động kiểm thử phân quyền, tranh chấp concurrency và tính bất biến (idempotency).
>    - `RM-027`: Kiểm định & đối soát mã nguồn so với Code Review (rà soát 68/68 tiêu chí, chạy kiểm thử hồi quy và nghiệm thu toàn diện).
>
> **Hạng mục NGOÀI nguồn** (tồn tại trong code/tài liệu nhưng **không tạo item riêng**, parked):
> - Settings, Data, OpenIddict — phụ trợ hệ thống, không làm màn hình riêng hoặc gộp vào Identity.
> - DailyMenus — thực đơn theo ngày (loại khỏi roadmap do gọi món POS lấy trực tiếp từ Master Data món ăn RM-006).
>
> **Cột `Spec`** = thư mục đặc tả SỞ HỮU item trong `specs/`, `—` = chưa có. Hiện **27/27 item có spec (100% độ phủ)**.
> Các item Wave 5 (`RM-022` đến `RM-027`) đã có đặc tả chi tiết và thực thi theo Spec-Kit.

## Bảng tổng (thứ tự build)

| ID | Màn | Module | Wave | Phụ thuộc | Spec | Trạng thái |
|----|-----|--------|------|-----------|------|------------|
| RM-001 | Đăng nhập | auth | 0 | N/A | [001-rm-001-login](../specs/001-rm-001-login/spec.md) | xong |
| RM-002 | Shared UI / design system | shared | 0 | N/A | [002-rm-002-shared-ui](../specs/002-rm-002-shared-ui/spec.md) | xong |
| RM-003 | Quản lý Người dùng & Phân quyền | identity | 0 | RM-001, RM-002 | [003-rm-003-identity](../specs/003-rm-003-identity/spec.md) | xong |
| RM-004 | Quản lý Đơn vị tính (Units) | masterdata | 1 | RM-002 | [004-rm-004-units](../specs/004-rm-004-units/spec.md) | xong |
| RM-005 | Quản lý Nguyên liệu (Ingredients) | masterdata | 1 | RM-004 | [005-rm-005-ingredients](../specs/005-rm-005-ingredients/spec.md) | xong |
| RM-006 | Quản lý Món ăn & Danh mục (Dishes) | masterdata | 1 | RM-002 | [006-rm-006-dishes-and-dish-categories](../specs/006-rm-006-dishes-and-dish-categories/spec.md) | xong |
| RM-007 | Quản lý Công thức (Recipes) | masterdata | 1 | RM-005, RM-006 | [007-rm-007-recipe-inventory-consumption](../specs/007-rm-007-recipe-inventory-consumption/spec.md) | xong |
| RM-008 | Quản lý Khu vực & Bàn ăn (Table Management) | setup | 2 | RM-002, RM-015 | [008-rm-008-dining-areas-and-tables](../specs/008-rm-008-dining-areas-and-tables/spec.md) | xong |
| RM-009 | Đặt bàn (Table Reservation) | setup | 2 | RM-008 | [009-rm-009-table-reservation](../specs/009-rm-009-table-reservation/spec.md) | xong |
| RM-010 | POS / Đơn hàng (Orders) | operations | 3 | RM-006, RM-008, RM-015 | [010-rm-010-pos-ordering-and-billing](../specs/010-rm-010-pos-ordering-and-billing/spec.md) | xong |
| RM-011 | Quản lý Tồn kho & Giao dịch | operations | 3 | RM-005 | [011-rm-011-inventory-transactions](../specs/011-rm-011-inventory-transactions/spec.md) | xong |
| RM-012 | Giao diện Tồn kho (UI Redesign) | operations | 3 | RM-011 | [012-rm-012-inventory-ui-redesign](../specs/012-rm-012-inventory-ui-redesign/spec.md) | xong |
| RM-013 | Tồn kho - Khóa/Khôi phục | operations | 3 | RM-011 | [013-rm-013-inventory-deactivate-restore](../specs/013-rm-013-inventory-deactivate-restore/spec.md) | xong |
| RM-014 | Dự báo (Forecasts) | operations | 4 | RM-010, RM-011, RM-016 | [014-rm-014-forecasts](../specs/014-rm-014-forecasts/spec.md) | xong |
| RM-015 | Điều hướng & Bố cục Waiter (Waiter Routing & Layout) | waiter | 2 | RM-001, RM-002, RM-003 | [015-rm-015-waiter-routing-and-layout](../specs/015-rm-015-waiter-routing-and-layout/spec.md) | xong |
| RM-016 | Thanh toán đơn hàng (Payment Page) | operations | 3 | RM-010 | [016-rm-016-payment-page](../specs/016-rm-016-payment-page/spec.md) | xong |
| RM-017 | Làm lại trang Quản lý bàn (Table Management Redesign) | setup | 2 | RM-008, RM-015 | [017-rm-017-table-management-redesign](../specs/017-rm-017-table-management-redesign/spec.md) | xong |
| RM-018 | Làm mới trang Dashboard (Dashboard Redesign) | dashboard | 4 | RM-002, RM-006, RM-008, RM-010, RM-011 | [018-rm-018-dashboard-redesign](../specs/018-rm-018-dashboard-redesign/spec.md) | xong |
| RM-019 | Trang báo lỗi & Phục hồi điều hướng (404, 403, 500/505) | shared | 4 | RM-001, RM-002, RM-003, RM-015 | [019-rm-019-error-pages-and-recovery](../specs/019-rm-019-error-pages-and-recovery/spec.md) | xong |
| RM-020 | Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout) | inventory | 4 | RM-001, RM-002, RM-003, RM-011, RM-012, RM-013 | [020-rm-020-inventory-keeper-layout](../specs/020-rm-020-inventory-keeper-layout/spec.md) | xong |
| RM-021 | Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign) | inventory | 4 | RM-002, RM-011, RM-012, RM-013, RM-020 | [021-rm-021-dashboard-inventory-redesign](../specs/021-rm-021-dashboard-inventory-redesign/spec.md) | xong |
| RM-022 | Ổn định hóa & Vá lỗi Nghiêm trọng Backend (Backend Data Integrity & Concurrency Hardening) | operations | 5 | RM-008, RM-010, RM-011, RM-014 | [022-rm-022-backend-hardening](../specs/022-rm-022-backend-hardening/spec.md) | xong |
| RM-023 | Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement) | security | 5 | RM-001, RM-003, RM-006, RM-008 | [023-rm-023-security-and-authorization](../specs/023-rm-023-security-and-authorization/spec.md) | xong |
| RM-024 | Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular (Angular Architecture & Performance Refactoring) | frontend | 5 | RM-002, RM-008, RM-010, RM-011, RM-015 | [024-rm-024-angular-architecture-and-performance-refactoring](../specs/024-rm-024-angular-architecture-and-performance-refactoring/spec.md) | chưa |
| RM-025 | Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (Database Query Optimization & Clean Code) | shared | 5 | RM-004, RM-007, RM-011, RM-014, RM-018 | [025-rm-025-database-query-optimization-and-clean-code](../specs/025-rm-025-database-query-optimization-and-clean-code/spec.md) | xong |
| RM-026 | Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency) | testing | 5 | RM-022, RM-023, RM-024, RM-025 | [026-rm-026-automated-testing-auth-concurrency-idempotency](../specs/026-rm-026-automated-testing-auth-concurrency-idempotency/spec.md) | hoàn thành |
| RM-027 | Kiểm định & Đối soát Toàn diện Mã nguồn so với Code Review (Code Review Verification & Audit) | quality | 5 | RM-022, RM-023, RM-024, RM-025, RM-026 | [027-rm-027-code-review-validation](../specs/027-rm-027-code-review-validation/spec.md) | hoàn thành |

## Chi tiết

### RM-001 — Đăng nhập (auth, Wave 0)
- **Mô tả**: Màn hình đăng nhập hệ thống dành cho nhân viên / quản lý.
- **Nguồn**: `src/Acme.TooHungry.Domain/Identity`
- **Thực thể/CRUD**: User — Đăng nhập.
- **Backend**: Đã có module Identity của ABP.
- **Phụ thuộc**: N/A
- **Spec**: `specs/001-rm-001-login/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Secret commit vào git: `CertificatePassPhrase` và `StringEncryption:DefaultPassPhrase` trong `appsettings.json`, `ShowPII = true`, Swagger bật ở production → Giao xử lý tại RM-023.
  - (2026-10-22 · từ CODE_REVIEW.md) `app.component.ts`: Memory leak do `currentUser` subscribe thiếu `take(1)` tích lũy qua mỗi lần visibility change → Giao xử lý tại RM-024.

### RM-002 — Shared UI / design system (shared, Wave 0)
- **Mô tả**: Xây dựng các component UI cơ bản (table, form, modal) và cấu trúc layout hệ thống.
- **Nguồn**: Angular UI.
- **Thực thể/CRUD**: N/A
- **Backend**: N/A
- **Phụ thuộc**: N/A
- **Spec**: `specs/002-rm-002-shared-ui/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `sidebar-widgets.component.ts`: Timer 1s chạy change detection toàn app, interval 300ms rò rỉ; hack dịch chuyển DOM LeptonX → Giao xử lý tại RM-024.
  - (2026-10-22 · từ CODE_REVIEW.md) Boilerplate phân trang copy ở 7 màn hình kèm hack `window.dispatchEvent(resize)`; trộn 3 bộ UI (ngx-datatable, ng-zorro, custom); `custom-toaster.service` truy cập `as any` private ABP; CSS phình to với 1758 `!important` → Giao xử lý tại RM-024.
  - (2026-10-22 · từ CODE_REVIEW.md) Dọn dẹp dead code: `shared/layout/*`, `shared-modal`, `shared-spinner`, `shared-module.ts` → Giao xử lý tại RM-025.

### RM-003 — Quản lý Người dùng & Phân quyền (identity, Wave 0)
- **Mô tả**: Quản lý danh sách nhân viên, tài khoản và phân quyền vào các module nghiệp vụ.
- **Nguồn**: `src/Acme.TooHungry.Domain/Identity`
- **Thực thể/CRUD**: IdentityUser, IdentityRole — list, tạo, sửa, xoá, phân quyền.
- **Backend**: Đã có sẵn của ABP Framework.
- **Phụ thuộc**: RM-001, RM-002
- **Spec**: `specs/003-rm-003-identity/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `roles.ts`: Gọi thẳng RestService tới `/api/permission-management` thiếu encode `providerKey`; `users.ts` inject HttpClient thừa và gọi `updateRoles` dư thừa → Giao xử lý tại RM-023, RM-025.
  - (2026-10-22 · từ CODE_REVIEW.md) Kiểm tra theo role name hardcode `['Manager','Administrator','admin']` ở guards và components; thiếu `*abpPermission` trên hầu hết nút thao tác UI → Giao xử lý tại RM-023.
  - (2026-10-22 · từ CODE_REVIEW.md) Bỏ các nhóm permissions khai báo nhưng không dùng (Receivings, Wastes, Stocktakings, Bills, Payments...) → Giao xử lý tại RM-025.

### RM-004 — Quản lý Đơn vị tính (masterdata, Wave 1)
- **Mô tả**: Danh mục đơn vị tính sử dụng cho nguyên liệu (kg, lit, gói, hộp...).
- **Nguồn**: `src/Acme.TooHungry.Domain/Units`
- **Thực thể/CRUD**: Unit — list, tạo, sửa, xoá.
- **Backend**: Đã có Entity, UnitManager, UnitAppService và API cơ bản trong Domain & Application.
- **Phụ thuộc**: RM-002
- **Spec**: `specs/004-rm-004-units/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `TooHungryDbContext.cs`: Unique index `Name` của Unit không lọc soft delete (`.HasFilter("[IsDeleted] = 0")`), tạo lại tên đã xóa bị lỗi 500 → Giao xử lý tại RM-022, RM-025.

### RM-005 — Quản lý Nguyên liệu (masterdata, Wave 1)
- **Mô tả**: Danh sách nguyên liệu dùng để chế biến, lưu kho.
- **Nguồn**: `src/Acme.TooHungry.Domain/Ingredients`
- **Thực thể/CRUD**: Ingredient — list, tạo, sửa, xoá, tạm ngưng, kích hoạt lại, khôi phục thông minh.
- **Backend**: Đã hoàn thiện toàn diện: Bổ sung thuộc tính `EstimatedPrice` (độ chính xác 18, 2) trên `Ingredient` và DbContext kèm EF Core migration; xây dựng Domain Service `IngredientManager` (chuẩn hóa tên, chống trùng lặp không phân biệt hoa thường, Smart Restore khi trùng tên với bản ghi tạm ngưng, khóa đổi đơn vị tính khi có liên kết `RecipeIngredient`/`InventoryBatch`, kiểm tra xóa an toàn); nâng cấp `IngredientAppService` (tính tồn an toàn `CurrentStock` loại trừ lô quá hạn, `ExpiredStock`, CRUD, Tạm ngưng/Kích hoạt lại); `IngredientController` phân quyền hạt nhân (`TooHungryPermissions.Ingredients.*`).
- **Frontend**: Hoàn thiện màn hình Master Data độc lập `/ingredients` sử dụng `SharedTable`, `SharedModal`, bộ lọc đa tiêu chí (từ khóa, trạng thái, loại bảo quản, sắp xếp), cảnh báo tồn kho và quá hạn, modal CRUD + Tạm ngưng (bắt buộc lý do) + Khôi phục thông minh (Smart Restore).
- **Kiểm thử**: Đạt 100% kiểm thử tự động (12/12 tests PASS) gồm `IngredientManager_Tests`, `EfCoreIngredientDomainTests`, `IngredientAppService_Tests`.
- **Đa ngôn ngữ**: 100% song ngữ Tiếng Việt & Tiếng Anh (`vi.json`, `en.json`).
- **Phụ thuộc**: RM-004
- **Spec**: `specs/005-rm-005-ingredients/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Chuỗi toast thông báo tiếng Việt hardcode; sửa `storageType` trên UI thay vì migration DB → Giao xử lý tại RM-024, RM-025.

### RM-006 — Quản lý Món ăn & Danh mục (masterdata, Wave 1)
- **Mô tả**: Danh sách các món ăn bán trong nhà hàng, hình ảnh, giá bán, danh mục món.
- **Nguồn**: `src/Acme.TooHungry.Domain/Dishes`
- **Thực thể/CRUD**: Dish, DishCategory — list, tạo, sửa, xoá.
- **Backend**: Đã có Entity (`Dish`, `DishCategory`), Domain Services (`DishManager`, `DishCategoryManager`), Application Services (`DishAppService`, `DishCategoryAppService`), Controller (`DishController`) và Unit Tests (`DishAppService_Tests`, `DishCategoryAppService_Tests`).
- **Phụ thuộc**: RM-002
- **Spec**: `specs/006-rm-006-dishes-and-dish-categories/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `MediaController`: Upload ảnh Cloudinary không kiểm tra đăng nhập, chỉ check đuôi file mà không check content-type → Giao xử lý tại RM-023.
  - (2026-10-22 · từ CODE_REVIEW.md) `DishCategoryAppService` chỉ có `[Authorize]` chung, chưa gán permission cụ thể; `DailyMenuAppService` không có `[Authorize]` → Giao xử lý tại RM-023.
  - (2026-10-22 · từ CODE_REVIEW.md) `DishAppServices.cs` chứa 2 class trong 1 file; `UploadImageInput` không dùng; getter `groupedDishes`/`categoryOptions` sinh mảng mới mỗi lần change detection → Giao xử lý tại RM-024, RM-025.

### RM-007 — Quản lý Công thức (masterdata, Wave 1)
- **Mô tả**: Định lượng nguyên liệu cho từng món ăn, quy đổi về đơn vị chuẩn kho `BaseUnit`, tự động tăng phiên bản `Version`, ước tính giá vốn lý thuyết & tỷ lệ Food Cost %, vòng đời tạm ngưng có lý do và kích hoạt lại an toàn.
- **Nguồn**: `src/Acme.TooHungry.Domain/Recipes`
- **Thực thể/CRUD**: Recipe, RecipeIngredient — list, tạo, sửa, xoá, tạm ngưng, kích hoạt lại, xem lịch sử phiên bản, hợp đồng tiêu hao POS & FEFO.
- **Backend**: Hoàn tất toàn diện:
  - Aggregate Root `Recipe` & Entity `RecipeIngredient` bổ sung `RecipeUnitId` (RM-004), `ConversionFactor` (18, 6), `DeactivationReason` (512), index tối ưu `(DishId, IsActive)`.
  - Domain Service `RecipeManager`: Chống trùng active recipe cho cùng 1 món, gộp trùng nguyên liệu đầu vào, bắt buộc lý do khi tạm ngưng, kiểm tra hợp lệ khi kích hoạt lại.
  - Application Service `RecipeAppService`: Phân trang, lọc đa chiều theo danh mục món, tính toán Food Cost % và cảnh báo nguyên liệu tạm ngưng `HasDeactivatedIngredients`, hỗ trợ hợp đồng `GetActiveByDishIdAsync` và tra cứu lịch sử `GetHistoryByDishIdAsync`.
  - HTTP Controller `RecipeController`: Đầy đủ endpoints CRUD, deactivate/reactivate, phân quyền ABP `TooHungryPermissions.Recipes.*`.
- **Frontend**: Màn hình quản lý `/recipes` và Modal công thức linh hoạt:
  - Bảng dữ liệu `SharedTable` hiển thị trạng thái công thức, số lượng nguyên liệu, phiên bản, giá vốn và tỷ lệ Food Cost %.
  - Bộ lọc theo danh mục món ăn và tab trạng thái (Tất cả / Đã có công thức / Chưa có công thức).
  - Modal công thức (`RecipeModalComponent`) hỗ trợ chọn nguyên liệu, đơn vị RM-004, tự động hiển thị đơn vị chuẩn kho, tính toán Food Cost % trực quan (xanh/cam/đỏ).
  - Tích hợp 2 điểm vào: truy cập từ menu chính và nút thao tác nhanh `[Công thức]` trên bảng món ăn `/dishes`.
- **Kiểm thử**: Đạt 100% kiểm thử tự động (15/15 tests Recipe PASS, 73/73 tests toàn solution PASS).
- **Đa ngôn ngữ**: 100% song ngữ Tiếng Việt & Tiếng Anh (`vi.json`, `en.json`).
- **Phụ thuộc**: RM-005, RM-006
- **Spec**: `specs/007-rm-007-recipe-inventory-consumption/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `RecipeController.by-dish` không kiểm tra quyền xem công thức → Giao xử lý tại RM-023.
  - (2026-10-22 · từ CODE_REVIEW.md) Thiếu Unique Index cho Recipe active chống race condition; `RecipeManager.BumpVersion` không lưu vết lịch sử thật và không kiểm tra nguyên liệu tồn tại/active; N+1 query tải Units lặp lại; Namespace `RecipeIngredient` chưa cấu hình `MapCodeNamespace` → Giao xử lý tại RM-022, RM-025.

### RM-008 — Quản lý Khu vực & Bàn ăn (setup, Wave 2)
- **Mô tả**: Quản lý sơ đồ khu vực & bàn ăn của nhà hàng, đồng thời cung cấp giao diện vận hành bàn chuyên biệt cho Waiter (`/waiter/tables`).
  - **Giao diện Danh sách bàn cho Waiter**:
    - Hiển thị danh sách bàn dạng Card/Grid, chuẩn 4 Table Cards trên mỗi hàng.
    - Mỗi Table Card hiển thị: Tên bàn, Số lượng chỗ ngồi (Capacity), Trạng thái hiện tại (Status badge), và các nút Hành động (Action buttons) tương ứng.
    - Hỗ trợ đầy đủ 5 trạng thái bàn: `AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLEANING`, `INACTIVE`.
  - **Quy tắc chuyển trạng thái & hành động**:
    - `AVAILABLE` (Badge xanh lá `[Còn trống]`):
      + `[Đón khách]`: Chuyển tức thì `AVAILABLE → OCCUPIED`. Không mở Modal nhập thông tin; khách có thể vào bàn nhưng chưa gọi món (`OCCUPIED + No Order` là trạng thái hợp lệ).
      + `[Đặt bàn]`: Mở Modal đặt bàn (chi tiết tại RM-009).
      + `[Vô hiệu hóa bàn]`: Chuyển `AVAILABLE → INACTIVE`.
    - `INACTIVE` (Badge xám / vô hiệu hóa): Waiter và Manager có quyền thực hiện. Chặn toàn bộ hành vi Đặt bàn, Đón khách, Tạo Order. Action: `[Kích hoạt bàn]` để chuyển `INACTIVE → AVAILABLE`.
    - `OCCUPIED` (Badge đỏ nhạt `[Đang có khách]`):
      + Action `[Order]`: Điều hướng sang trang gọi món `/waiter/order/:tableId` (chi tiết tại RM-010).
      + Action `[Kết thúc bữa ăn]` (Finish Meal):
        * *Case 1 (Không có Order)*: Hiển thị dialog xác nhận: *"Khách không sử dụng món ăn. Bạn có chắc chắn muốn chuyển bàn về trạng thái trống?"* → Xác nhận: Chuyển `OCCUPIED → AVAILABLE`.
        * *Case 2 (Có Order)*: Hiển thị dialog xác nhận kết thúc bữa ăn → Xác nhận: Điều hướng sang màn hình Thanh toán (RM-016).
    - `CLEANING` (Badge màu trắng/light `[Đang dọn dẹp]`): Xuất hiện sau khi hoàn tất thanh toán từ RM-016.
      + Action `[Dọn dẹp xong]`: Chuyển `CLEANING → AVAILABLE`, khôi phục các action ban đầu của bàn trống.
- **Nguồn**: `src/Acme.TooHungry.Domain/DiningAreas`, `src/Acme.TooHungry.Domain/Tables`, Angular UI (`/waiter/tables`)
- **Thực thể/CRUD**: DiningArea, RestaurantTable — list, tạo, sửa, xoá, cập nhật trạng thái bàn.
- **Backend**: Cần tạo/bổ sung API quản lý sơ đồ bàn và cập nhật trạng thái thời gian thực (`UpdateTableStatusAsync`).
- **Phụ thuộc**: RM-002, RM-015
- **Spec**: `specs/008-rm-008-dining-areas-and-tables/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Mass assignment tại `TableDtos.cs` ghi đè trạng thái bàn; `MergeTablesAsync` cộng dồn sai giá món trùng và làm mất ghi chú (Note); Unique index `Name` của Table không lọc soft delete → Giao xử lý tại RM-022.
  - (2026-10-22 · từ CODE_REVIEW.md) Gửi SignalR trước khi commit UnitOfWork; `TableHub` thiếu `[Authorize]`, `TableSignalRService` thiếu token và nuốt lỗi kết nối ban đầu → Giao xử lý tại RM-022, RM-023.
  - (2026-10-22 · từ CODE_REVIEW.md) Lẫn lộn múi giờ `DateTime.Now`/`DateTime.UtcNow`; truy vấn đồng bộ chặn thread; lạm dụng `AutoInclude` kéo toàn bộ `DiningArea`; tải 200 bàn rồi tự cắt client; trùng lặp code lớn giữa `table` và `waiter-tables` → Giao xử lý tại RM-022, RM-024, RM-025.

### RM-009 — Đặt bàn (Table Reservation) (setup, Wave 2)
- **Mô tả**: Tính năng đặt bàn trước cho khách hàng, tích hợp trực tiếp trên giao diện vận hành của Waiter.
  - **Tạo Booking từ bàn trống**:
    - Khi Waiter nhấn `[Đặt bàn]` từ bàn `AVAILABLE` → mở Booking Modal.
    - Trường dữ liệu: Tên khách (bắt buộc), Số điện thoại (bắt buộc), Ngày giờ nhận bàn (bắt buộc), Số lượng khách (bắt buộc, mặc định = số chỗ của bàn, chặn không cho vượt quá sức chứa bàn), Ghi chú (tùy chọn).
  - **Business Rule — Giờ đặt bàn**:
    - Nhà hàng chỉ hoạt động trong khung giờ: `09:00 → 23:00`.
    - Chặn hoàn toàn việc tạo booking ngoài giờ hoạt động (Ví dụ: 08:59 không hợp lệ, 09:00 hợp lệ, 22:59 hợp lệ, 23:00 & 23:01 không hợp lệ).
    - Validate bắt buộc ở cả Frontend và Backend.
  - **Trạng thái RESERVED**:
    - Xác nhận booking thành công: `AVAILABLE → RESERVED`.
    - Card bàn chuyển sang màu warning; vùng trạng thái hiển thị rõ: Tên khách và Số điện thoại.
    - Actions khả dụng: `[Đón khách]` (chuyển sang `OCCUPIED`), `[Hủy đặt bàn]`, `[Vô hiệu hóa bàn]`.
  - **Xem & Chỉnh sửa Booking (Booking Detail / Edit)**:
    - Click vào bàn đang `RESERVED` → mở Modal hiển thị thông tin booking.
    - Cho phép xem/cập nhật: Tên khách, SĐT, Thời gian nhận bàn, Số lượng khách, Ghi chú (bắt buộc thỏa mãn toàn bộ validation về khung giờ và sức chứa).
  - **Hủy Booking thủ công**:
    - Waiter nhấn `[Hủy đặt bàn]` → hiển thị dialog xác nhận.
    - Xác nhận thành công: Chuyển `RESERVED → AVAILABLE`.
    - Lưu lịch sử đơn đặt bàn với trạng thái `CANCELLED` (không xóa dữ liệu).
  - **Tự động hủy Booking quá hạn (Auto Cancel Booking)**:
    - Cơ chế Backend Server-side (Background Worker / Quartz.NET job), hoạt động độc lập không phụ thuộc vào việc Waiter có mở trang hay không.
    - Nếu khách không đến nhận bàn trong vòng 1 giờ kể từ thời gian nhận bàn dự kiến: Tự động chuyển booking sang `AUTO_CANCELLED` và chuyển bàn `RESERVED → AVAILABLE` (Ví dụ: đặt 18:00, chờ đến 19:00 chưa nhận bàn → tự động hủy).
- **Nguồn**: `src/Acme.TooHungry.Domain/Tables` (Reservation info trong `RestaurantTable`), Angular Booking Modal
- **Thực thể/CRUD**: TableReservation / RestaurantTable (ReservedCustomerName, ReservedPhone, ReservedTime...) — list, tạo, sửa, huỷ, auto-cancel.
- **Backend**: Cần tạo API Booking, validator giờ mở cửa, và Background Worker xử lý Auto-cancel 1h.
- **Phụ thuộc**: RM-008
- **Spec**: `specs/009-rm-009-table-reservation/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Giờ mở cửa định nghĩa lệch nhau (TableAppService: 08:00-22:00 vs TableReservationManager: 09:00-22:59) và hardcode ở 4 vị trí FE; Bàn chuyển sang RESERVED ngay khi tạo booking cách 7 ngày khóa bàn cả tuần; `CheckInAsync` không kiểm tra trạng thái trước khi ghi đè → Giao xử lý tại RM-022, RM-024.
  - (2026-10-22 · từ CODE_REVIEW.md) `ReservationAutoCancelBackgroundWorker` thiếu `[UnitOfWork]` khiến cập nhật hủy bàn không atomic → Giao xử lý tại RM-022.

### RM-010 — POS / Đơn hàng (operations, Wave 3)
- **Mô tả**: Quản lý đơn hàng, gọi món tại bàn cho Waiter và quy trình phục vụ bữa ăn.
  - **Điều hướng & Giao diện gọi món cho Waiter**:
    - Khi Waiter nhấn `[Order]` từ bàn `OCCUPIED` → điều hướng đến `/waiter/order/:tableId`.
    - **Sidebar**: Tự động thay đổi bộ lọc theo danh mục món ăn (Menu Categories, mặc định ở trạng thái mở rộng / Expanded). Ở đầu Sidebar bắt buộc có **Table Information Card** (Tên bàn, Số chỗ ngồi, Trạng thái hiện tại) giúp Waiter định vị chính xác bàn đang thao tác.
    - **Header trang Order**:
      + Nút `[← Back]`: Quay lại danh sách bàn `/waiter/tables`.
      + Nút `[🛒]`: Mở Order Drawer từ mép phải màn hình.
  - **Thực đơn & Thẻ món ăn (Food Card & Menu Page)**:
    - Bố cục lưới: 3 Food Cards trên mỗi hàng.
    - Mỗi Food Card gồm: Ảnh món ăn (ảnh vuông, nền đen), Tên món, Giá bán, và Nút đặt món nằm ở góc trên bên phải ảnh.
    - **Food Detail Modal**: Khi nhấn vào món ăn → mở Modal chi tiết gồm: Tên món, Mô tả, Giá, Ảnh, nút đóng `[X]` và nút `[Đặt món]`.
  - **Giỏ hàng (Order Drawer)**:
    - Nhấn biểu tượng `[🛒]` mở Drawer từ bên phải.
    - Hiển thị danh sách món ăn đã chọn: Tên món, Số lượng, Đơn giá, Thành tiền và Tổng tiền toàn đơn.
    - Cho phép thao tác trực tiếp: Tăng số lượng, Giảm số lượng, Xóa món khỏi giỏ.
  - **Quy tắc Active Order & Phiên ăn**:
    - Mỗi phiên ăn của một bàn chỉ tồn tại **duy nhất một đơn hàng hoạt động** (`Active Order`).
    - Tuyệt đối không tạo nhiều Order cho cùng một phiên ăn (Ví dụ: Bàn 05 có Order #001, khi gọi thêm món vẫn cập nhật vào Order #001, không sinh Order #002).
    - **Tiếp tục gọi món (Continue Order)**: Nếu bàn `OCCUPIED` có đơn hàng `PENDING`, Waiter truy cập lại Order Page sẽ tải lại toàn bộ đơn này để tiếp tục thêm/bớt món mà không tạo Order mới.
  - **Trạng thái đơn hàng `PENDING`**:
    - Trong module này, `PENDING` được định nghĩa là **Order chưa được thanh toán** (không hiểu là chưa gửi bếp).
    - Khi đơn ở trạng thái `PENDING`, Waiter được toàn quyền: Thêm món, Tăng số lượng, Giảm số lượng, Xóa món.
  - **Kiểm tra tồn kho nguyên liệu (Inventory Validation)**:
    - Khi Waiter tăng số lượng món (Ví dụ: Pizza x 2 → Pizza x 3), hệ thống bắt buộc kiểm tra tồn kho nguyên liệu theo định lượng công thức (Recipe).
    - Nếu đủ nguyên liệu: Cho phép tăng số lượng.
    - Nếu không đủ nguyên liệu: Hiển thị cảnh báo thiếu nguyên liệu và chặn tăng số lượng.
    - Tuyệt đối không cho phép tồn kho âm. Bắt buộc validate chặt chẽ ở cả Frontend và Backend.
  - **Xác nhận / Cập nhật đơn (`Submit / Update Order`)**:
    - Khi nhấn `[Đặt đơn]`: Hệ thống tạo Active Order (nếu chưa có) hoặc cập nhật Active Order hiện tại, gắn đúng `tableId`, đặt trạng thái đơn hàng là `PENDING`. Sau đó Waiter có thể nhấn Back quay lại danh sách bàn.
  - **Kết thúc bữa ăn & Liên kết Thanh toán**:
    - Tại bàn `OCCUPIED`, khi nhấn `[Kết thúc bữa ăn]`: Nếu bàn có Active Order, hệ thống hiển thị xác nhận và điều hướng sang trang Thanh toán (RM-016).
- **Nguồn**: `src/Acme.TooHungry.Domain/Orders`, Angular UI (`/waiter/order/:tableId`)
- **Thực thể/CRUD**: Order, OrderItem — list, tạo, sửa, xoá, cập nhật số lượng món.
- **Backend**: Đã hoàn thiện toàn bộ API quản lý Active Order theo bàn (`GetActiveOrderByTableIdAsync`, `SubmitOrderAsync`, `CancelActiveOrderAsync`), validation tồn kho khả dụng theo công thức Recipe (`ValidateStockAsync`), khấu trừ kho tự động FEFO, thông báo SignalR realtime (`TableHub`), Filtered Unique Index cho Active Order, và 100% test suite tự động.
- **Frontend**: Đã hoàn thiện giao diện gọi món cho Waiter `/waiter/order/:tableId` với Table Information Card, danh mục món Sidebar mở rộng, lưới 3 Food Cards bo góc, Food Detail Modal, Order Drawer với tính năng kiểm tra tồn kho realtime, xác nhận đặt đơn và hủy đơn an toàn, chuẩn nhận diện Cam & Trắng (`#EA580C`).
- **Phụ thuộc**: RM-006, RM-008, RM-015
- **Spec**: `specs/010-rm-010-pos-ordering-and-billing/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `OrderAppService.UpdateAsync`: Trừ kho 2 lần khi status = Completed; client tự đặt giá `UnitPrice`/`TotalAmount`; DTO thiếu validation để lọt số lượng âm; race condition khi tạo đơn do thiếu filtered index; retry concurrency trừ kho thừa → Giao xử lý tại RM-022.
  - (2026-10-22 · từ CODE_REVIEW.md) Phân trang hỏng tại `order.component.ts` (search/filter ghi đè totalCount); client tự sinh mã đơn ngẫu nhiên; innerHTML render tên nguyên liệu nguy cơ XSS; tải 1000 recipe & ingredient về client tự tính tồn → Giao xử lý tại RM-024.
  - (2026-10-22 · từ CODE_REVIEW.md) Lạm dụng `AutoInclude` Order->Items->Dish->Category; thiếu index `Orders(Status, OrderDate)`; mã ORD- dễ trùng trong 1 giây; Entity anemic; mã lỗi thiếu trong `vi.json` → Giao xử lý tại RM-025.

### RM-011 — Quản lý Tồn kho & Giao dịch (operations, Wave 3)
- **Mô tả**: Quản lý số lượng nhập/xuất/tồn của các nguyên liệu, quản lý theo lô hàng (`InventoryBatch`), xuất kho tự động theo hạn sử dụng (FEFO), kiểm kê điều chỉnh và lịch sử giao dịch bất biến (`InventoryTransaction`).
- **Nguồn**: `src/Acme.TooHungry.Domain/Inventories`
- **Thực thể/CRUD**: `InventoryBatch`, `InventoryTransaction` — Quản lý lô, Nhập kho (Inbound), Xuất kho tự động (FEFO), Kiểm kê cân đối kho (Adjustment), Cảnh báo hạn dùng (Alerts), Tiêu hủy lô hàng (Discard).
- **Backend**: Đã hoàn thành toàn bộ Domain Service (`InventoryManager`), Application Service (`InventoryAppService`), DTOs, EF Core Composite Index & Migration, REST Controller (`InventoryController`), phân quyền chi tiết và 100% test suite tự động.
- **Phụ thuộc**: RM-005
- **Spec**: `specs/011-rm-011-inventory-transactions/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `InventoryManager`: Lô điều chỉnh tăng có dữ liệu sai (`PurchaseUnit = "BaseUnit"`, `UnitCost = 0`, hạn dùng +1 năm), không chặn số lượng âm trong `batchDeductions` → Giao xử lý tại RM-022.
  - (2026-10-22 · từ CODE_REVIEW.md) Không phân trang `GetTransactionsAsync`, `GetAlertsAsync` (vòng lặp O(n*m)); truy vấn đồng bộ chặn thread; mã BATCH-, ADJ- dễ trùng trong 1 giây → Giao xử lý tại RM-025.
  - (2026-10-22 · từ CODE_REVIEW.md) Thành phần `inventory` Angular quá lớn; lệch ngày UTC khi tính hạn dùng; thay đổi trạng thái trộn lẫn Signal và `detectChanges` → Giao xử lý tại RM-024.

### RM-012 — Giao diện Tồn kho UI Redesign (operations, Wave 3)
- **Mô tả**: Làm lại giao diện trang quản lý tồn kho để thân thiện hơn với người dùng.
- **Nguồn**: N/A
- **Thực thể/CRUD**: N/A
- **Backend**: Tận dụng API có sẵn từ RM-011.
- **Phụ thuộc**: RM-011
- **Spec**: `specs/012-rm-012-inventory-ui-redesign/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Component tồn kho gánh 3 tab, 4 modal inline; sorting O(n^2) lọc lại toàn bộ batch mỗi lần so sánh; proxy bị sửa tay mất code khi gen lại → Giao xử lý tại RM-024.

### RM-013 — Tồn kho - Khóa/Khôi phục (operations, Wave 3)
- **Mô tả**: Quản lý vòng đời tạm ngưng, cách ly và khôi phục an toàn ở cả 2 cấp độ: Mặt hàng nguyên liệu (`Ingredient`) và Lô hàng thực tế (`InventoryBatch`). Hỗ trợ cơ chế vô hiệu hóa dây chuyền (Cascading Deactivation) đến Recipe/Dish, loại trừ lô bị khóa khỏi thuật toán FEFO, màn hình quản lý nguyên liệu đã vô hiệu hóa, và khôi phục thông minh (Smart Restoration) khi thiết lập kho.
- **Nguồn**: `src/Acme.TooHungry.Domain/Ingredients`, `src/Acme.TooHungry.Domain/Inventories`, Angular UI (`/inventory`, `/ingredients/deactivated`)
- **Thực thể/CRUD**: `Ingredient`, `InventoryBatch` — Deactivate, Reactivate, SmartRestore, DeactivateBatch, ReactivateBatch.
- **Backend**: Đã hoàn thành toàn bộ Domain logic (`IngredientManager.DeactivateAsync` kích hoạt Cascading Deactivation tự động khóa Recipe & Dish liên quan nhưng bảo toàn đơn POS dở dang; `InventoryBatch` thêm `DeactivationReason` và cập nhật thuật toán FEFO loại bỏ lô Inactive), Application Services (`IngredientAppService`, `InventoryAppService`), DTOs, EF Core Migration, phân quyền chi tiết (`TooHungryPermissions.Inventories.DeactivateBatch`), và 100% test suites tự động.
- **Frontend**: Đã hoàn thành Tab 1 & Tab 2 trên `/inventory` (Modal tạm ngưng kèm cảnh báo tồn kho, modal tạm khóa lô theo lý do mẫu, nút kích hoạt lại, bộ lọc trạng thái hoạt động), màn hình chuyên biệt `/ingredients/deactivated` bảng 4 cột tinh gọn, hộp thoại Khôi phục thông minh khi tạo nguyên liệu trùng tên bị khóa, huy hiệu cảnh báo vàng cam trên Recipe & Dish, và bộ từ điển i18n song ngữ đầy đủ (`en.json`, `vi.json`).
- **Phụ thuộc**: RM-011
- **Spec**: `specs/013-rm-013-inventory-deactivate-restore/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Modal deactivate trùng lặp với `ingredient.component`; tính ngày hết hạn lệch múi giờ UTC → Giao xử lý tại RM-024.

### RM-014 — Dự báo (operations, Wave 4)
- **Mô tả**: Dự báo doanh thu, nhu cầu món ăn và nguyên liệu cần mua dựa trên dữ liệu quá khứ.
- **Nguồn**: `src/Acme.TooHungry.Domain/Forecasts`, `angular/src/app/forecast/`
- **Thực thể/CRUD**: DemandForecast, DemandForecastItem, IngredientPlan, IngredientPlanItem — list, tạo, sửa, xóa, phân tích dự báo, bóc tách định lượng nguyên liệu, đối soát tồn kho và xuất bảng kê mua hàng.
- **Backend**: Đã hoàn thành toàn diện Domain, EF Core DbContext, DTOs, Application Services (`DemandForecastAppService`, `IngredientPlanAppService`), Controllers (`ForecastController`), phân quyền (`TooHungryPermissions.Forecasts.*`), thuật toán SMA 7/14/30 ngày làm tròn trần, bóc tách công thức (Recipe Explosion) tự động sinh Kế hoạch nguyên liệu (`IngredientPlan`), đối soát tồn kho khả dụng (`CurrentStock`), tính toán số lượng gợi ý mua thêm và phân tích tài chính dự toán 4 thẻ KPI. 100% kiểm thử tự động đạt chuẩn PASS.
- **Frontend**: Đã hoàn thành giao diện Angular chuẩn nhận diện Cam & Trắng (`/forecasts`, `/forecasts/detail/:id`), modal tạo dự báo tự động tính SMA (`ForecastCreateComponent`), màn hình chi tiết 4 thẻ KPI tài chính, 2 tab chuyển đổi (Món ăn & Kế hoạch nguyên liệu), phê duyệt kế hoạch, xuất file Excel CSV UTF-8 BOM (`KeHoachMuaHang_YYYYMMDD_YYYYMMDD.csv`) và in phiếu chuẩn bị bếp khổ A4 chuyên biệt (@media print). Đồng bộ 100% từ điển song ngữ trong `vi.json` và `en.json`.
- **Phụ thuộc**: RM-010, RM-011, RM-016
- **Spec**: [014-rm-014-forecasts](../specs/014-rm-014-forecasts/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `ForecastAppServices.cs`: Tồn kho bị nhân `ConversionFactor` 2 lần làm sai lệch gợi ý mua; thiếu state machine (Executed quay về Draft); crash `ToDictionary(DishId)` khi input trùng món → Giao xử lý tại RM-022.
  - (2026-10-22 · từ CODE_REVIEW.md) N+1 query trong vòng lặp lồng nhau và tải toàn bộ Dishes/Recipes; file chứa 2 class cần tách rời → Giao xử lý tại RM-025.

### RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout) (waiter, Wave 2)
- **Mô tả**: Thiết lập cơ chế điều hướng dựa trên vai trò (Role-based routing) cho nhân viên phục vụ (`Waiter`) và xây dựng bộ Layout giao diện chuyên biệt cho phân hệ Waiter.
  - **Tự động điều hướng sau đăng nhập**:
    - Sau khi nhân viên có vai trò Waiter đăng nhập thành công qua RM-001 → hệ thống tự động điều hướng trực tiếp vào trang danh sách bàn mặc định `/waiter/tables`.
  - **Bộ Layout Waiter chuyên biệt gồm 3 khu vực**:
    + **Sidebar**: Dùng cho công cụ Tìm kiếm và Bộ lọc (Search/Filter). Nội dung Sidebar có khả năng thay đổi linh hoạt tùy theo ngữ cảnh của từng trang (Ví dụ: tại trang Danh sách bàn dùng để lọc bàn theo khu vực/trạng thái; tại trang Order hiển thị Thẻ thông tin bàn và bộ lọc danh mục món).
    + **Topbar**: Thanh điều hướng trên cùng, chỉ hiển thị thông tin chung của hệ thống (tên nhà hàng, thông tin ca trực/nhân viên đăng nhập).
    + **Main Content**: Không gian trung tâm hiển thị nội dung chính của trang.
  - **Route mặc định**: `/waiter/tables`.
  - **Phân quyền truy cập (Auth Guard)**: Bảo vệ toàn bộ cụm route `/waiter/*`, chỉ cho phép tài khoản có vai trò Waiter (hoặc quyền phục vụ) truy cập.
- **Nguồn**: `angular/src/app/waiter/`
- **Thực thể/CRUD**: N/A (UI Layout Component & Angular Routing Guard).
- **Backend**: Tận dụng ABP Identity / Role & Permission Management từ RM-003.
- **Phụ thuộc**: RM-001, RM-002, RM-003
- **Spec**: `specs/015-rm-015-waiter-routing-and-layout/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Route `/table/layout` không tồn tại gây crash điều hướng Cashier; memory leak `currentUser` subscribe; switchLanguage dùng reload trang; ký hiệu tiền tệ viết tay `' đ'` → Giao xử lý tại RM-024.
  - (2026-10-22 · từ CODE_REVIEW.md) Giờ mở cửa 9-23 hardcode ở template; kiểm tra theo role name hardcode → Giao xử lý tại RM-023, RM-024.

### RM-016 — Thanh toán đơn hàng (Payment Page) (operations, Wave 3)
- **Mô tả**: Màn hình thanh toán đơn hàng độc lập dành cho Waiter và Cashier khi khách kết thúc bữa ăn tại bàn có Order.
  - **Cấu trúc & Bố cục giao diện**:
    - Màn hình chuyên biệt độc lập, **KHÔNG sử dụng Sidebar và Topbar** thông thường của Waiter layout.
    - **Đầu trang**: Nút `[← Quay lại danh sách bàn]` điều hướng về `/waiter/tables`.
    - **Header Card**: Hiển thị thông tin tổng quan gồm: Tiêu đề "Thanh toán đơn hàng", Mã Order, Tên bàn, Ngày giờ lập hóa đơn; góc bên phải hiển thị trạng thái đơn hàng (Order Status).
  - **Bố cục 2 cột chia tỉ lệ 60% : 40%**:
    - **Cột trái (60%) — Hóa đơn đơn hàng (Order Invoice)**: Hiển thị đầy đủ Order ID, Tên bàn, Ngày giờ, Danh sách chi tiết các món ăn đã gọi, Số lượng, Đơn giá, Thành tiền và Tổng tiền thanh toán.
    - **Cột phải (40%) — Phương thức thanh toán (Payment Method)**:
      + `Tiền mặt` (Cash).
      + `Chuyển khoản QR` (QR Payment) — hiển thị mã VietQR thanh toán. Phương thức QR hiện tại áp dụng cơ chế **xác nhận thủ công** (`Manual Confirmation` bởi nhân viên, không tự động xác minh giao dịch ngân hàng).
  - **Phân quyền xác nhận thanh toán (Payment Permission)**:
    - Chỉ người dùng có vai trò `Waiter` hoặc `Cashier` mới được phép thao tác bấm nút `[Đã xác nhận thanh toán]`.
  - **Luồng xác nhận thanh toán & Chuyển trạng thái**:
    - Khi bấm `[Đã xác nhận thanh toán]`: Hệ thống ghi nhận thanh toán thành công.
    - Cập nhật trạng thái đơn hàng: `Order → PAID / COMPLETED`.
    - Tự động chuyển trạng thái bàn ăn: `Table → CLEANING` (bàn chuyển sang trạng thái dọn dẹp, hoàn tất phiên phục vụ và khép kín chu trình chuyển sang bước dọn bàn tại RM-008).
- **Nguồn**: `src/Acme.TooHungry.Domain/Orders`, Angular UI (`/waiter/payment/:orderId`)
- **Thực thể/CRUD**: Order, Payment — cập nhật trạng thái đơn hàng sang Completed, kích hoạt chuyển trạng thái bàn sang Cleaning.
- **Backend**: Cần API xác nhận thanh toán và cập nhật đồng thời trạng thái Order và Table (`CompletePaymentAsync`).
- **Phụ thuộc**: RM-010
- **Spec**: [016-rm-016-payment-page](../specs/016-rm-016-payment-page/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `instant(key) || 'fallback'` không bao giờ rơi vào fallback; thiếu test tự động cho `CompletePaymentAsync` → Giao xử lý tại RM-024, RM-026.

### RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign) (setup, Wave 2)
- **Mô tả**: Tái thiết kế toàn diện giao diện và tối ưu trải nghiệm người dùng (UI/UX Redesign) cho phân hệ Quản lý Bàn ăn (`/tables` và `/waiter/tables`).
  - **Mục tiêu chính**:
    - Nâng cấp giao diện sơ đồ bàn / danh sách bàn ăn sang phong cách hiện đại, chuẩn nhận diện Cam & Trắng (`#EA580C`), bo góc mềm mại, hiển thị trực quan và thanh lịch.
    - Cải tiến thẻ bàn (Table Card): Hiển thị rõ ràng trạng thái phục vụ, đồng bộ thời gian sử dụng bàn theo thời gian thực (Elapsed Seated Time), đếm thời lượng phiên dùng bữa, cảnh báo bàn ngồi lâu (> 90 phút).
    - Tối ưu hóa các hộp thoại tương tác ngữ cảnh: Modal Đón khách, Đặt bàn trước (Reservation), Xác nhận kết thúc bữa ăn với Timeline tiến trình trực quan (`Seated At → Elapsed → Ended At`).
    - Nâng cấp tính năng quản trị sơ đồ bàn của Admin/Manager (`/tables`): Chuyển bàn, gộp bàn, cấu hình sơ đồ khu vực linh hoạt, tối ưu hiệu năng render danh sách bàn số lượng lớn.
    - Đảm bảo trải nghiệm Responsive mượt mà trên mọi thiết bị (máy POS bán hàng, tablet, mobile của nhân viên).
- **Nguồn**: `angular/src/app/table/`, `angular/src/app/waiter/tables/`, `src/Acme.TooHungry.Domain/Tables`
- **Thực thể/CRUD**: `RestaurantTable`, `DiningArea` — Redesign UI/UX, tái cấu trúc component, tối ưu luồng thao tác.
- **Backend**: Tận dụng và mở rộng hệ thống API hiện có từ RM-008 và Realtime SignalR (`TableHub`).
- **Phụ thuộc**: RM-008, RM-015
- **Spec**: [017-rm-017-table-management-redesign](../specs/017-rm-017-table-management-redesign/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Tự phân trang 200 bàn ở client làm mất dữ liệu dư; lặp code SignalR và computed giữa table và waiter-tables; `table.component.scss` phình to 95KB với 309 `!important` → Giao xử lý tại RM-024.

### RM-018 — Làm mới trang Dashboard (Dashboard Redesign) (dashboard, Wave 4)
- **Mô tả**: Tái thiết kế toàn diện giao diện và nâng cấp trải nghiệm Dashboard trung tâm (`/`), tối ưu cho quản lý nhà hàng và nhân viên vận hành:
  - Nâng cấp visual chuẩn nhận diện Cam & Trắng (`#EA580C`), phong cách Bento Grid / Card hiện đại, hiển thị trực quan và tương thích responsive đa thiết bị (Desktop, Tablet).
  - Khối KPI tổng quan thời gian thực: Doanh thu trong ngày, Tổng số đơn hàng, Tỷ lệ lấp đầy bàn ăn (Table Occupancy Rate), Cảnh báo tồn kho / nguyên liệu sắp hết / quá hạn.
  - Biểu đồ thống kê trực quan: Biểu đồ xu hướng doanh thu & đơn hàng theo giờ trong ngày, Top món ăn bán chạy nhất (Best Sellers), Thống kê trạng thái bàn trực tiếp (Live Table Map Summary).
  - Khối tác vụ nhanh (Quick Actions) điều hướng tiện lợi: Quản lý món ăn, Đặt bàn / Sơ đồ bàn, Kiểm kê kho, Xem báo cáo dự báo.
  - Tích hợp cảnh báo vận hành thông minh và cập nhật số liệu theo thời gian thực (Realtime SignalR) mà không cần reload trang.
- **Nguồn**: `angular/src/app/home/`, `src/Acme.TooHungry.Domain/Orders`, `src/Acme.TooHungry.Domain/Inventories`, `src/Acme.TooHungry.Domain/Tables`
- **Thực thể/CRUD**: Dashboard DTOs / Aggregation Services — Tổng hợp dữ liệu từ `Order`, `RestaurantTable`, `Dish`, `InventoryBatch`.
- **Backend**: Xây dựng Application Service chuyên biệt (`DashboardAppService` / `IDashboardAppService`) cung cấp endpoint tổng hợp thống kê tập trung (`GetDashboardSummaryAsync`), tối ưu hiệu năng truy vấn và tránh phân tán lời gọi API ở Frontend.
- **Phụ thuộc**: RM-002, RM-006, RM-008, RM-010, RM-011
- **Spec**: [018-rm-018-dashboard-redesign](../specs/018-rm-018-dashboard-redesign/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) `DateTime.UtcNow` làm Dashboard chia hôm nay/giờ lệch 7 tiếng so với VN; `DashboardAppService` catch nuốt lỗi không log, dùng `dynamic` cho anonymous type; `console.error` còn sót → Giao xử lý tại RM-022, RM-025.

### RM-019 — Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing) (shared, Wave 4)
- **Mô tả**: Thiết kế và triển khai bộ trang thông báo lỗi hệ thống hiện đại (404 Not Found, 403 Forbidden, 500 Internal Server Error / 505 HTTP Version Not Supported) kèm cơ chế điều hướng phục hồi thông minh theo vai trò và tự động trả người dùng về trang làm việc sau 5 giây:
  - **Thiết kế giao diện hiện đại & Thân thiện (Modern Error UX/UI)**:
    + Tone màu chủ đạo nhận diện Cam & Trắng (`#EA580C`), phong cách Card / Glassmorphism bo góc mềm mại, hiển thị đẹp mắt và chuyên nghiệp trên cả Desktop, Tablet và Mobile.
    + Minh họa Vector / SVG sinh động riêng biệt cho từng mã lỗi:
      * **404 — Không tìm thấy trang (Page Not Found)**: Minh họa bàn ăn trống hoặc bản đồ thất lạc khi truy cập đường dẫn không tồn tại (Wildcard route `**`).
      * **403 — Truy cập bị từ chối (Forbidden / Access Denied)**: Minh họa ổ khóa bảo mật / khiên phân quyền khi người dùng cố truy cập trang ngoài phạm vi quyền hạn của vai trò.
      * **500 / 505 — Sự cố hệ thống / Máy chủ không phản hồi (Server Error)**: Minh họa kết nối gián đoạn, thông báo thân thiện và hiển thị mã tham chiếu lỗi (Error Trace ID) an toàn để hỗ trợ kỹ thuật mà không làm lộ stack trace nội bộ.
  - **Nút hành động quay lại trang thuộc về người dùng (Role-based Recovery Button)**:
    + Cung cấp nút bấm hành động chính nổi bật: `[Quay về trang chính của tôi]` (Return to My Home).
    + Cơ chế tự động nhận diện vai trò người dùng hiện tại (`currentUser.roles`) để điều hướng chính xác về không gian làm việc chuyên môn:
      * **Waiter (Nhân viên phục vụ)**: Điều hướng về `/waiter/tables` (Danh sách bàn ăn phục vụ).
      * **Admin / Manager (Quản trị viên & Quản lý)**: Điều hướng về `/` (Dashboard trung tâm) **nếu có quyền xem Dashboard** (`TooHungry.Dashboard`); nếu không có quyền, tự động chuyển về trang nghiệp vụ đầu tiên được phân quyền (`/tables`, `/orders`, `/dishes`, `/inventory`...) để tránh vòng lặp lỗi 403.
      * **Cashier (Thu ngân)**: Điều hướng về `/table/layout` hoặc `/tables`.
      * **InventoryStaff (Thủ kho)**: Điều hướng về `/inventory`.
      * **Khách / Chưa đăng nhập (Unauthenticated)**: Điều hướng về `/account/login` hoặc `/` (Trạm vào ca nội bộ).
    + Cung cấp nút hành động phụ tùy ngữ cảnh: `[Thử lại]` (Retry request) đối với lỗi 500/505, hoặc `[Đổi tài khoản / Đăng xuất]` đối với lỗi 403.
  - **Cơ chế đếm ngược tự động trả về trang sau 5 giây (5-Second Auto-Recovery Countdown)**:
    + Khi trang lỗi xuất hiện, nếu người dùng không thực hiện bất kỳ thao tác nào, hệ thống tự động kích hoạt đồng hồ đếm ngược trực quan:
      *"Hệ thống sẽ tự động đưa bạn về trang làm việc sau 5... 4... 3... 2... 1 giây..."* (kèm thanh tiến trình progress bar đếm ngược mượt mà).
    + Cho phép người dùng bấm `[Dừng đếm ngược]` hoặc di chuột/tương tác vào màn hình để dừng đồng hồ nếu muốn ở lại đọc thông tin kỹ thuật hoặc copy mã lỗi.
    + Sau 5 giây đếm ngược kết thúc mà không bị dừng: Tự động kích hoạt điều hướng về trang tương ứng của vai trò người dùng mà không cần bấm nút.
  - **Phạm vi áp dụng đồng bộ**:
    + Áp dụng thống nhất cho toàn bộ các nhóm người dùng: **Admin**, **Manager**, **Waiter** và các nhân viên vận hành khác.
  - **Tích hợp kỹ thuật trong Angular & ABP Framework**:
    + Cấu hình Angular Router Wildcard `**` chuyển tiếp về trang 404.
    + Tích hợp với `smartPermissionGuard`, ABP `HttpErrorReporterService` và HTTP Error Interceptor để bắt mã 403, 500, 505 thay thế hoàn toàn các dialog lỗi thô sơ mặc định.
    + Xây dựng `UserRoleNavigationService` tập trung cung cấp hàm xác định URL đích theo vai trò người dùng để tái sử dụng xuyên suốt toàn bộ ứng dụng.
  - **Đa ngôn ngữ & Quốc tế hóa (i18n)**:
    + 100% toàn bộ tiêu đề lỗi, thông điệp hướng dẫn, nhãn nút thao tác và câu thông báo đếm ngược được cấu hình đầy đủ trong `vi.json` và `en.json`.
- **Nguồn**: `angular/src/app/`, ABP Http Error Handling, Angular Router
- **Thực thể/CRUD**: N/A (UI Layout, Routing & Error Handling Components).
- **Backend**: Tận dụng cơ chế chuẩn hóa lỗi của ABP Framework (`AbpValidationException`, `UserFriendlyException`, HTTP status codes 403, 404, 500).
- **Phụ thuộc**: RM-001, RM-002, RM-003, RM-015
- **Spec**: [019-rm-019-error-pages-and-recovery](../specs/019-rm-019-error-pages-and-recovery/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Điều hướng Cashier về route không tồn tại `/table/layout` cần sửa thành `/tables` hoặc `/waiter/tables` → Giao xử lý tại RM-024.

### RM-020 — Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout) (inventory, Wave 4)
- **Mô tả**: Thiết lập cơ chế điều hướng theo vai trò (Role-based routing) và xây dựng bộ Layout / không gian làm việc chuyên biệt dành riêng cho Thủ kho (`InventoryStaff` / `InventoryKeeper`), tương tự như cơ chế của phân hệ Waiter (`RM-015`):
  - **Tự động điều hướng sau đăng nhập**:
    - Khi tài khoản có vai trò Thủ kho (`InventoryStaff`) đăng nhập thành công qua RM-001 → hệ thống tự động điều hướng trực tiếp vào không gian làm việc chuyên biệt `/inventory-keeper` (thay vì trang quản trị chung).
  - **Bộ Layout Thủ kho chuyên biệt gồm 3 khu vực**:
    + **Topbar**: Tinh giản, hiển thị nhận diện nhà hàng, thông tin nhân viên ca trực kho, thẻ thống kê nhanh trạng thái kho (lô cận date, cảnh báo hết hàng, lô quá hạn cần hủy), nút lối tắt `[Quay lại Quản trị]` (chỉ hiển thị cho Manager / Admin) và nút đăng xuất.
    + **Sidebar Ngữ cảnh Động (Dynamic Contextual Sidebar)**: Chuyên biệt hóa cho nghiệp vụ kho: ô tìm kiếm nhanh mã lô / tên nguyên liệu, quét mã QR/Barcode lô hàng, bộ lọc nhanh theo nhóm điều kiện bảo quản (Khô, Lạnh, Đông) và lọc theo trạng thái tồn kho (Đang dùng, Cận date, Quá hạn, Đã khóa).
    + **Main Content**: Không gian trung tâm tối ưu thao tác nhanh cho màn hình cảm ứng / thiết bị kiểm kê tại quầy kho:
      * Bảng điều khiển tổng quan tồn kho & hạn dùng (FEFO).
      * Các tác vụ 1 chạm: Nhập kho nhanh (Quick Inbound), Xuất hủy lô quá hạn (Discard), Khóa/Mở khóa lô (`RM-013`).
      * Lịch sử giao dịch biến động kho & kiểm kê điều chỉnh (`RM-011`).
  - **Bộ gác cổng bảo vệ phân hệ (Auth Guard - `inventoryKeeperAuthGuard`)**:
    - Bảo vệ toàn bộ cụm tuyến đường `/inventory-keeper/*`.
    - Phân quyền truy cập nghiêm ngặt: Chỉ cho phép tài khoản có vai trò `InventoryStaff`, `Manager` hoặc `Administrator` (sở hữu quyền `TooHungry.Inventories`).
  - **Tích hợp phục hồi điều hướng (RM-019)**:
    - Đồng bộ `UserRoleNavigationService` để khi nhân viên kho gặp lỗi hoặc nhấn `[Quay về trang chính của tôi]` sẽ tự động đưa về `/inventory-keeper`.
- **Nguồn**: `angular/src/app/inventory-keeper/`, `src/Acme.TooHungry.Domain/Inventories`
- **Thực thể/CRUD**: N/A (UI Shell / Layout Component, Role Guard, Quick Actions View).
- **Backend**: Tận dụng hệ thống API Quản lý kho hiện có (`IInventoryAppService`, `IIngredientAppService`) từ RM-011, RM-013 và phân quyền Identity từ RM-003.
- **Phụ thuộc**: RM-001, RM-002, RM-003, RM-011, RM-012, RM-013
- **Spec**: [020-rm-020-inventory-keeper-layout](../specs/020-rm-020-inventory-keeper-layout/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Trùng lặp modal và quản lý trạng thái phân tán giữa Portal Thủ kho và Dashboard Inventory → Giao xử lý tại RM-024.

### RM-021 — Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign) (inventory, Wave 4)
- **Mô tả**: Tái thiết kế toàn diện giao diện và tối ưu hóa trải nghiệm người dùng (UI/UX Redesign) cho màn hình Quản lý Tồn kho (`/inventory`) thuộc phân hệ Quản trị / Dashboard dành cho Quản lý (Manager) và Quản trị viên (Admin):
  - **Chuẩn hóa nhận diện & Bố cục hiện đại**:
    - Nâng cấp visual chuẩn nhận diện Cam & Trắng (`#EA580C`), phong cách Bento Grid / Card hiện đại đồng bộ với Dashboard (`RM-018`) và Shared UI (`RM-002`).
    - Bố cục phân chia rõ ràng các khu vực: Thẻ KPI thống kê kho tổng quan (Tổng giá trị tồn kho, Số mặt hàng sắp hết, Số lô cận date, Số lô quá hạn/đã khóa), Thanh công cụ tìm kiếm & lọc nâng cao, Bảng danh mục tồn kho và Lịch sử giao dịch biến động.
  - **Tối ưu trải nghiệm bảng dữ liệu & Quản lý lô (Batches View)**:
    - Hiển thị danh sách nguyên liệu và chi tiết từng lô hàng (`InventoryBatch`) trực quan, phân loại trạng thái bằng các Badge sinh động (Đang dùng, Cận date, Quá hạn, Đã khóa).
    - Cải tiến tương tác thao tác nhanh ngay trên dòng: Xem chi tiết lô, Nhập thêm lô mới, Khóa/Mở khóa lô (`RM-013`), Xuất hủy lô quá hạn (`Discard`), Điều chỉnh kiểm kê (`Stock Adjustment`).
  - **Tối ưu hóa các Modal nghiệp vụ**:
    - Tái cấu trúc và làm đẹp các Modal: Nhập lô mới (`CreateBatchModal`), Điều chỉnh tồn kho (`StockAdjustmentModal`), Xuất hủy lô (`DiscardBatchModal`), Xem lịch sử giao dịch (`TransactionHistoryModal`).
    - Validate dữ liệu chặt chẽ, hiển thị thông báo phản hồi mượt mà và cảnh báo rõ ràng khi thao tác ảnh hưởng đến số lượng tồn kho.
  - **Đồng bộ liên kết với Phân hệ Thủ kho & Dự báo**:
    - Đồng bộ dữ liệu và hành động với phân hệ Thủ kho (`RM-020`) và module Dự báo nguyên liệu (`RM-014`).
    - Cung cấp nút chuyển đổi nhanh hoặc liên kết tới Portal Thủ kho (`/inventory-keeper`) cho người dùng có quyền quản trị/quản lý.
  - **Đa ngôn ngữ (i18n) & Trải nghiệm Responsive**:
    - Hỗ trợ đầy đủ song ngữ Tiếng Việt & Tiếng Anh (`vi.json`, `en.json`).
    - Hiển thị tối ưu trên cả màn hình Desktop và Tablet của quản lý nhà hàng.
- **Nguồn**: `angular/src/app/inventory/`, `src/Acme.TooHungry.Domain/Inventories`
- **Thực thể/CRUD**: `InventoryBatch`, `InventoryTransaction`, `Ingredient` — Xem tổng hợp tồn kho, Tạo lô mới, Điều chỉnh số lượng, Khóa/Mở khóa, Hủy lô, Xem lịch sử biến động.
- **Backend**: Tận dụng hệ thống API Quản lý kho hiện có (`IInventoryAppService`, `IIngredientAppService`) từ RM-011, RM-013 và các DTO thống kê từ RM-018.
- **Phụ thuộc**: RM-002, RM-011, RM-012, RM-013, RM-020
- **Spec**: [021-rm-021-dashboard-inventory-redesign](../specs/021-rm-021-dashboard-inventory-redesign/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (2026-10-22 · từ CODE_REVIEW.md) Cần tách rời modal nhập lô, xuất hủy, điều chỉnh kiểm kê thành components độc lập; bổ sung phân trang API cho lịch sử giao dịch kho → Giao xử lý tại RM-024, RM-025.

### RM-022 — Ổn định hóa & Vá lỗi Nghiêm trọng Backend (Backend Data Integrity & Concurrency Hardening) (operations, Wave 5)
- **Mô tả**: Xử lý toàn diện các lỗi nghiệp vụ nghiêm trọng về tính toán tiền, xuất trừ kho, race condition và concurrency phát hiện từ CODE_REVIEW.md:
  - **Khắc phục lỗi trừ kho trùng lặp**:
    + Chặn trừ kho 2 lần tại `OrderAppService.UpdateAsync` khi trạng thái đơn hàng là Completed; chỉ trừ kho khi `oldStatus != Completed` và đóng băng toàn bộ đơn đã `Completed` / `Cancelled`. Đưa toàn bộ nghiệp vụ chuyển trạng thái vào Domain method `Order.Complete()`.
    + Khắc phục Retry Concurrency trừ kho thừa (`OrderAppService`, `InventoryAppService`): Vòng lặp retry chạy với UoW độc lập (`IUnitOfWorkManager.Begin(requiresNew: true)`) hoặc loại bỏ `autoSave` rải rác từng lô trong `InventoryManager.DeductFefoAsync` để commit nguyên khối ở cuối transaction.
  - **Kiểm soát chặt chẽ giá bán & Validation đơn hàng**:
    + Triệt tiêu lỗ hổng Client tự đặt giá: Lấy giá bán trực tiếp từ `Dish.Price` phía server, loại bỏ hoàn toàn `UnitPrice` và `TotalAmount` khỏi DTO đầu vào của client (`CreateOrderDto`, `UpdateOrderDto`).
    + Bổ sung validation DTO nghiêm ngặt (`OrderDtos.cs`): `[Range(1, 999)] Quantity`, `[MinLength(1)] Items`, `[StringLength] Note` để ngăn chặn triệt để số lượng âm hoặc 0 làm âm tiền/âm kho.
  - **Sửa lỗi công thức tính tồn kho & Dự báo**:
    + Sửa lỗi nhân đôi `ConversionFactor` tại `ForecastAppServices.cs` (dòng 366, 556): `CreateBatchAsync` đã lưu `RemainingQuantity` theo `BaseUnit`, thống nhất tính tồn bằng `Sum(b => b.RemainingQuantity)`.
    + Bổ sung State Machine cho `DemandForecastAppService` để ngăn chặn chuyển trạng thái tùy tiện từ `Executed` ngược về `Draft`; xử lý chống crash `ToDictionary(DishId)` khi input có nhiều dòng trùng món.
  - **Khắc phục Race Condition & Khóa dữ liệu bàn**:
    + Sửa Filtered Unique Index cho `Order`: Bao quát mọi trạng thái đơn đang hoạt động (không chỉ `Status = 0`); bắt `DbUpdateException` và ném `BusinessException` chuẩn mực.
    + Khắc phục Mass Assignment tại `TableDtos.cs`: Loại bỏ các trường trạng thái nội bộ (`Status`, `OccupiedTime`, `Reserved*`) khỏi DTO cập nhật thông tin bàn, chỉ cho phép thay đổi trạng thái qua domain service `ChangeStatusAsync`.
    + Đảm bảo SignalR chỉ phát thông báo sau khi transaction commit thành công: Dùng `CurrentUnitOfWork.OnCompleted(...)` hoặc ABP Local Event Handler thay vì gửi trước khi commit.
    + Sửa logic `MergeTablesAsync`: Món trùng `DishId` phải giữ đúng giá tương ứng và giữ lại đầy đủ `Note` của từng món thay vì bị ghi đè/mất dữ liệu.
  - **Chuẩn hóa Quản lý Đặt bàn & Múi giờ**:
    + Khắc phục logic đặt bàn (`TableReservationManager`): Không chuyển bàn sang `RESERVED` ngay lập tức khi giờ đặt cách xa (ví dụ tới 7 ngày) gây chiếm bàn; kiểm tra trạng thái bàn trước khi ghi đè tại `CheckInAsync`.
    + Thống nhất khung giờ mở cửa giữa `TableAppService` và `TableReservationManager`.
    + Bổ sung `[UnitOfWork]` cho `ReservationAutoCancelBackgroundWorker` đảm bảo tính nguyên tử (atomic) khi tự động hủy bàn quá hạn 1 giờ.
    + Chuẩn hóa múi giờ: Cấu hình `AbpClockOptions.Kind = Utc`, thay thế toàn bộ `DateTime.Now`/`DateTime.UtcNow` rải rác bằng `Clock.Now`.
  - **Chuẩn hóa dữ liệu điều chỉnh kho**:
    + Sửa dữ liệu sai lệch trong lô điều chỉnh tăng (`InventoryManager.cs`): Không gán `PurchaseUnit = "BaseUnit"` dạng hardcode literal, tính đúng giá vốn `UnitCost`, đặt hạn dùng thực tế phù hợp thay vì tự động cộng 1 năm bừa bãi; chặn số lượng âm trong `batchDeductions`.
- **Nguồn**: `CODE_REVIEW.md` (Backend #1, #2, #3, #4, #5, #10, #11, #12, #13, #14, #15, #16, #25, #26, #29), `OrderAppService.cs`, `InventoryAppService.cs`, `ForecastAppServices.cs`, `TableAppService.cs`
- **Thực thể/CRUD**: `Order`, `InventoryBatch`, `RestaurantTable`, `DemandForecast`, `TableReservation` — Xử lý toàn vẹn dữ liệu, chống race condition, chuẩn hóa nghiệp vụ chuyển trạng thái.
- **Backend**: Cải tổ Domain logic, Unit of Work, DbContext Filtered Indexes, Background Worker và DTO validations.
- **Frontend**: N/A (Backend Hardening).
- **Phụ thuộc**: RM-008, RM-010, RM-011, RM-014
- **Spec**: [022-rm-022-backend-hardening](../specs/022-rm-022-backend-hardening/spec.md)
- **Trạng thái**: xong
- **Kết quả thực hiện**:
  - Khắc phục triệt để 15/15 lỗi nghiêm trọng từ `CODE_REVIEW.md` liên quan đến Backend Data Integrity & Concurrency.
  - Áp dụng Filtered Unique Index cho `Order`, bắt `DbUpdateException` chống race condition mở bàn/tạo đơn trùng lặp.
  - Chuyển toàn bộ nghiệp vụ khấu trừ kho FEFO vào Domain model `Order.Complete()`, chặn đứng trừ kho 2 lần và nạp UoW độc lập cho batch deduction.
  - Server-side Dish Price calculation, loại bỏ `UnitPrice`/`TotalAmount` khỏi input DTO và bổ sung DataAnnotation validation.
  - Sửa công thức tồn kho dự báo bỏ `* ConversionFactor`, cài đặt State Machine một chiều cho `DemandForecast`.
  - Chuẩn hóa đặt bàn: chỉ khóa bàn `Reserved` trong vòng 60 phút, check-in guard khi bàn `Occupied`, atomic background auto-cancel.
  - Chuẩn hóa lô điều chỉnh kho `ADJ-*` với đầy đủ `BaseUnit`, `EstimatedPrice`, hạn dùng xa nhất, chặn số lượng âm.
  - 150/150 Unit & Integration tests PASS 100%.
- **Nợ phát sinh**:
  - (trống)

### RM-023 — Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement) (security, Wave 5)
- **Mô tả**: Bịt kín toàn bộ các lỗ hổng bảo mật, kiểm soát truy cập phân quyền hạt nhân (Granular Authorization) ở cả Backend & Frontend và loại bỏ thông tin nhạy cảm (Secrets) khỏi kho mã nguồn:
  - **Bảo mật Endpoints & Upload tệp Backend**:
    + Thêm `[Authorize(TooHungryPermissions.Dishes.Edit)]` và kiểm tra chặt chẽ `ContentType` định dạng `image/*` cho endpoint upload ảnh Cloudinary (`MediaController.cs`).
    + Bổ sung `[Authorize]` cụ thể cho `DailyMenuAppService` để chặn truy cập ẩn danh vào `/api/app/daily-menu`.
    + Bổ sung Permission hạt nhân: Kiểm tra quyền xem công thức tại `RecipeController.by-dish`, phân quyền cụ thể cho `TableOrderController.complete/{tableId}`, áp dụng `TooHungryPermissions.Orders.*` và `TooHungryPermissions.DishCategories.*` cho từng Action method thay vì chỉ dùng `[Authorize]` chung ở cấp class.
    + Bảo vệ Realtime Hub: Thêm `[Authorize]` cho `TableHub` trên Backend; yêu cầu `accessTokenFactory` hợp lệ và xử lý cơ chế tự động thử lại khi mất kết nối trên Frontend (`TableSignalRService`).
  - **Kiểm soát hiển thị phân quyền trên giao diện Angular**:
    + Gắn chỉ thị `*abpPermission` lên toàn bộ các nút hành động nhạy cảm (Tạo, Sửa, Xóa, Cập nhật trạng thái) trên các màn hình: `dish`, `dish-category`, `order`, `table`, `inventory`, `recipe`, `dining-area`, `users/roles`.
    + Chuẩn hóa cơ chế kiểm tra quyền: Loại bỏ hoàn toàn việc kiểm tra theo tên vai trò hardcode (`['Manager','Administrator','admin']`) ở guards, `app.component`, `home`, `waiter-layout`; chuyển đổi 100% sang kiểm tra theo permission mã định danh ABP.
    + Chuẩn hóa quản lý quyền Role (`roles.ts`): Loại bỏ gọi trực tiếp `RestService` tới `/api/permission-management` thiếu mã hóa `providerKey`, chuyển sang dùng `PermissionsService` hoặc component chuẩn `<abp-permission-management>`.
  - **Vệ sinh thông tin nhạy cảm (Security Sanitation)**:
    + Loại bỏ toàn bộ bí mật hardcode trong repo: `CertificatePassPhrase`, `StringEncryption:DefaultPassPhrase` trong `appsettings.json`.
    + Tắt `ShowPII = false` tại `TooHungryHttpApiHostModule.cs` ở môi trường production.
    + Tắt Swagger UI ở môi trường production (`!env.IsDevelopment()`).
    + Bảo vệ thông tin tài khoản ngân hàng VietQR trong file cấu hình environment thay vì để lộ trong source code.
- **Nguồn**: `CODE_REVIEW.md` (Backend #6, #7, #8, #9, #30; Frontend #4, #7, #9, #19, #31), `MediaController.cs`, `RecipeController.cs`, `TableOrderController.cs`, `appsettings.json`, Angular guards & components
- **Thực thể/CRUD**: `IdentityRole`, `IdentityUser`, Permissions — Áp dụng phân quyền hạt nhân, ẩn nút thao tác, bảo vệ Hub, dọn dẹp secret.
- **Backend**: Cấu hình Permission Guards, Authorize Attributes, AppSettings sanitation, Realtime Hub authorization.
- **Frontend**: Chỉ thị `*abpPermission`, ABP Permission Management, Auth Guards theo permission, SignalR Access Token Factory.
- **Phụ thuộc**: RM-001, RM-003, RM-006, RM-008
- **Spec**: [specs/023-rm-023-security-and-authorization/](../specs/023-rm-023-security-and-authorization/spec.md)
- **Trạng thái**: xong
- **Kết quả thực hiện**:
  - Triệt để vệ sinh mã nguồn: loại bỏ 100% hardcoded secrets khỏi git repo, bổ sung `appsettings.secrets.example.json` và cấu hình fail-fast ở Production.
  - Xây dựng bộ lọc an toàn 3 lớp SafeImageFileValidator (dung lượng <= 5MB, định dạng cho phép, Magic Bytes header) chống giả mạo file ảnh và Path Traversal.
  - Phân quyền hạt nhân ABP cho toàn bộ endpoints Backend: `MediaController`, `DailyMenuAppService`, `RecipeController`, `DishCategoryAppService`, `TableOrderController`.
  - Bảo vệ Realtime SignalR Hub với `[Authorize]`, token factory tự động refresh và auto-reconnect client.
  - Gắn chỉ thị `*abpPermission` kiểm soát ẩn nút giao diện trên toàn bộ các màn hình (Món ăn, Danh mục, Đơn hàng, Bàn ăn, Khu vực, Kho nguyên liệu/lô, Công thức, Người dùng, Vai trò).
  - Loại bỏ hoàn toàn role name hardcoded trong Guards & Routing, chuyển đổi 100% sang kiểm tra ABP Granular Policies.
  - Mã hóa URI an toàn (`encodeURIComponent`) trong phân quyền Vai trò và dọn dẹp HttpClient trong Người dùng.
  - 100% Backend & Frontend unit tests PASS (22 backend security tests, 34 vitest frontend tests).
- **Nợ phát sinh**:
  - (trống)

### RM-024 — Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular (Angular Architecture & Performance Refactoring) (frontend, Wave 5)
- **Mô tả**: Tái cấu trúc kiến trúc Frontend, triệt tiêu rò rỉ bộ nhớ (Memory leaks), cải thiện hiệu năng hiển thị và sửa các lỗi phân trang/điều hướng nghiêm trọng:
  - **Khắc phục lỗi Phân trang & Điều hướng**:
    + Sửa lỗi phân trang hỏng tại màn hình Quản lý đơn hàng (`order.component.ts`): Bổ sung tham số `filter` và `status` vào DTO phía Backend, truyền qua `streamCreator` của `ListService`, giữ nguyên `res.totalCount` từ server trả về thay vì cắt mảng client.
    + Sửa route lỗi `/table/layout` không tồn tại (gây crash điều hướng của Cashier) thành `/tables` hoặc `/waiter/tables` tại `app.component`, `dashboard.guard`, `waiter-auth.guard` và `UserRoleNavigationService` (RM-019).
    + Thêm Wildcard route `**` chuyển tiếp về trang lỗi 404 (RM-019).
  - **Triệt tiêu Memory Leak & Tối ưu Vòng lặp Change Detection**:
    + Thêm `.pipe(filter(u => !!u?.isAuthenticated), take(1))` cho subscription `currentUser` trong `app.component.ts` để chặn subscription rò rỉ tích lũy sau mỗi lần chuyển tab (`visibilitychange`).
    + Tái cấu trúc `sidebar-widgets.component.ts`: Loại bỏ interval 1 giây chạy change detection toàn bộ ứng dụng; đưa tác vụ phụ ra ngoài NgZone (`ngZone.runOutsideAngular`), hủy bỏ timer rò rỉ 300ms.
    + Thống nhất mô hình trạng thái: Loại bỏ sự pha trộn giữa Signal và gọi thủ công `cdr.detectChanges()` rải rác; chuyển đổi sang Angular Signals chuẩn hóa (`computed`, `effect`) hoặc `async` pipe.
    + Xóa bỏ việc subscribe lồng nhau 3 tầng (`nested subscribes`) tại `waiter-tables.ts` và `inventory.ts`, thay bằng toán tử RxJS declarative (`switchMap`, `exhaustMap`).
  - **Tái cấu trúc Component Quá khổ & Tách rời Module**:
    + Module hóa màn hình Quản lý kho (`inventory.component.ts` dài 956 dòng TS / 1160 dòng HTML): Tách thành các Component con độc lập theo Tab và các Modal chuyên biệt (`NewBatchModal`, `StockAdjustmentModal`, `DiscardBatchModal`, `DeactivateModal` tái sử dụng chung với `ingredient`).
    + Tái cấu trúc trùng lặp code giữa `table.component` và `waiter-tables.component`: Xây dựng `TableStateService` dùng chung, `<app-table-card>` và `TableStatusPipe` chung.
    + Xây dựng component phân trang dùng chung `<app-pager>` hoặc chuẩn hóa qua ngx-datatable footer, loại bỏ boilerplate copy ở 7 màn hình và hack `window.dispatchEvent(new Event('resize'))`.
  - **Tối ưu Hiệu năng Template & Render**:
    + Thay thế các template getter sinh mảng mới (`categoryOptions`, `ingredientSelectOptions`, `pageSizeOptions`, `groupedDishes`) bằng `computed()` signals hoặc cache memoized.
    + Bỏ hàm sort O(n^2) tại `inventory.ts`, tính toán trước Map tra cứu dữ liệu.
    + Chấm dứt tình trạng client tự tải 500 - 1000 bản ghi để tự lọc/tính tồn: Chuyển toàn bộ việc kiểm tra tồn kho sang gọi API server `orderService.validateStock`.
    + Loại bỏ client tự sinh mã đơn ngẫu nhiên tại `order.ts` (để Backend tự quản lý tập trung).
    + Sửa lỗ hổng XSS tiềm ẩn: Đổi `[innerHTML]` hiển thị tên nguyên liệu sang string interpolation an toàn.
  - **Chuẩn hóa Quốc tế hóa (i18n), Xử lý Lỗi & CSS**:
    + Chuyển 100% chuỗi hardcode và toast notification sang từ điển ngôn ngữ ABP (`en.json`, `vi.json`), truyền đúng tham số `{ skipHandleError: true }` khi component tự bắt lỗi để tránh hiện 2 dialog lỗi cùng lúc.
    + Sửa lỗi hiển thị ngày lệch UTC (`toISOString().split('T')[0]`) sang `formatDate(new Date(), 'yyyy-MM-dd', locale)`.
    + Tái cấu trúc CSS/SCSS: Giảm dung lượng file SCSS khổng lồ (`table.component.scss` 95KB), loại bỏ 1758 chỉ thị `!important` lạm dụng, tái sử dụng các class utility dùng chung.
    + Chuẩn hóa đổi ngôn ngữ trong `waiter-layout`: Dùng cơ chế ABP i18n không reload trang và dùng pipe `currency:'VND'`.
- **Nguồn**: `CODE_REVIEW.md` (Frontend #1, #2, #3, #5, #6, #8, #10, #11, #12, #13, #14, #15, #16, #17, #18, #20, #21, #22, #23, #24, #26, #28, #30, #32, #34), Angular components & services
- **Thực thể/CRUD**: N/A (Frontend Refactoring, Shared UI, Routing, Component Architecture, RxJS & State Optimization).
- **Backend**: Hỗ trợ bổ sung tham số filter/paging trên DTO Orders.
- **Frontend**: Tái cấu trúc sâu các component Angular, tối ưu RxJS, Signals, i18n, CSS và Pager.
- **Phụ thuộc**: RM-002, RM-008, RM-010, RM-011, RM-015
- **Spec**: [specs/024-rm-024-angular-architecture-and-performance-refactoring/](../specs/024-rm-024-angular-architecture-and-performance-refactoring/spec.md)
- **Trạng thái**: chưa
- **Nợ phát sinh**:
  - (trống)

### RM-025 — Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (Database Query Optimization & Clean Code) (shared, Wave 5)
- **Mô tả**: Tối ưu hóa hiệu năng tầng dữ liệu EF Core, xử lý triệt để N+1 query, loại bỏ các tác vụ chặn thread, chuẩn hóa exception/logging và dọn dẹp mã nguồn rác toàn dự án:
  - **Tối ưu Hóa Truy vấn EF Core & Indexing**:
    + Xử lý triệt để N+1 và tải cả bảng: Gom nhóm các truy vấn theo `dishIds`/`recipeIds` thay vì `FindAsync` trong vòng lặp lồng nhau (`ForecastAppServices.cs`, `RecipeAppService.cs`, `OrderAppService.cs`).
    + Chuyển 100% truy vấn đồng bộ chặn thread (`.ToList()`, `.First()`) sang phương thức bất đồng bộ chuẩn ABP (`AsyncExecuter`, `.ToListAsync()`, `.FirstOrDefaultAsync()`) tại `TableAppService` và `InventoryManager`.
    + Loại bỏ lạm dụng `AutoInclude` kéo theo cả cây quan hệ ở các kiểm tra nhẹ (`AnyAsync`); bổ sung chỉ mục tối ưu: `Orders(Status, OrderDate)` và Unique Index cho `OrderNumber`.
    + Bổ sung bộ lọc Soft Delete cho các Unique Index tên duy nhất: `.HasFilter("[IsDeleted] = 0")` cho `RestaurantTable` và `Unit` trong `TooHungryDbContext.cs` để cho phép tạo lại tên sau khi xóa mềm.
    + Thêm Unique Index cho Recipe đang hoạt động (`DishId`, `IsActive = 1`) chống race condition sinh nhiều công thức active cho một món.
    + Bổ sung phân trang chuẩn mực (`PagedAndSortedResultRequestDto`) cho `GetTransactionsAsync` và `GetAlertsAsync` tại `InventoryAppService`.
  - **Cải tiến Domain Model & Máy sinh mã**:
    + Khắc phục tình trạng Entity Anemic: Đóng kín các public setters của `Order`, `OrderItem`, `RestaurantTable`, `Dish`, `Recipe`; chuyển các logic đổi trạng thái thành domain methods tường minh (`table.Release()`, `table.Occupy()`, `table.MarkCleaning()`, `order.Complete()`, `order.Cancel()`).
    + Gom logic reset trạng thái bàn bị lặp lại 8 lần vào method tập trung `table.Release()`.
    + Thay thế cơ chế sinh mã dễ trùng (`ORD-{yyyyMMddHHmmss}`, `BATCH-`, `ADJ-`) bằng cơ chế sinh mã an toàn kèm sequence counter hoặc random salt để tránh xung đột trong cùng một giây.
    + Hoàn thiện `RecipeManager`: Bổ sung kiểm tra nguyên liệu tồn tại và đang hoạt động qua `_ingredientRepository`; lưu vết lịch sử phiên bản thật khi `BumpVersion`.
  - **Chuẩn hóa Exception, Logging & ABP Conventions**:
    + Thay thế toàn bộ 24 vị trí gọi `UserFriendlyException("...tiếng Việt...")` hardcode bằng `BusinessException(TooHungryErrorCodes.XYZ)` kết hợp khóa đa ngôn ngữ trong `vi.json` và `en.json`.
    + Bổ sung đầy đủ mã lỗi `TooHungry:Order:AlreadyCompleted` và `AlreadyCancelled` vào `vi.json`.
    + Cấu hình `MapCodeNamespace` cho namespace `RecipeIngredient`.
    + Loại bỏ khối lệnh nuốt lỗi `catch { }` không log tại `DashboardAppService.cs`; thay thế kiểu `dynamic` bằng C# `record` tường minh.
  - **Dọn dẹp Mã nguồn Rác (Code Sanitation & Clean Code)**:
    + Xóa bỏ toàn bộ các file rác ở thư mục gốc: `test.cs` (chứa password), `Reflect.cs` (chứa đường dẫn máy cá nhân), `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt`.
    + Xóa bỏ các component/thư mục chết trên Angular: `auth/login/*`, `shared/layout/*`, `shared-modal`, `shared-spinner`, `shared-module.ts`, `permissions.json` rỗng, thư mục `e2e/`.
    + Tách các file chứa nhiều class: Tách `DishAppServices.cs` thành `DishAppService.cs` và `DishCategoryAppService.cs`; tách `ForecastAppServices.cs` thành 2 file riêng.
    + Xóa các input DTO và permission không dùng đến; chuẩn hóa `OrderAppService` kế thừa `TooHungryAppService`.
    + Kích hoạt cấu hình `strict` trong `tsconfig.json` và xóa bỏ `HttpClientModule` thừa trong `app.config.ts`.
- **Nguồn**: `CODE_REVIEW.md` (Backend #17, #18, #19, #20, #21, #22, #23, #24, #27, #28, #31, #32, #33; Frontend #25, #27, #28, #29, #33), `TooHungryDbContext.cs`, `RecipeManager.cs`, `InventoryAppService.cs`, root scripts
- **Thực thể/CRUD**: All Entities — Tối ưu hóa truy vấn, cấu trúc database indexes, chuẩn hóa Domain & Clean Code.
- **Backend**: Tối ưu EF Core queries, thêm migration indexes, tái cấu trúc Rich Domain Model, cấu hình ABP Localization.
- **Frontend**: Dọn dẹp dead code, kích hoạt TypeScript strict mode.
- **Phụ thuộc**: RM-004, RM-007, RM-011, RM-014, RM-018
- **Spec**: `specs/025-rm-025-database-query-optimization-and-clean-code/`
- **Trạng thái**: hoàn thành
- **Nợ phát sinh**:
  - (trống)

### RM-026 — Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency) (testing, Wave 5)
- **Mô tả**: Thiết lập bộ kiểm thử tự động toàn diện (Integration & Concurrency Tests) bảo đảm hệ thống vận hành tin cậy, không bị tái phát các lỗi nghiệp vụ nghiêm trọng:
  - **Kiểm thử Phân quyền ABP (Authorization Tests)**:
    + Xây dựng test suites kiểm tra phân quyền cho toàn bộ các API: Đảm bảo người dùng thiếu quyền hạn bị từ chối bằng `AbpAuthorizationException` (HTTP 403) trên các phương thức quan trọng (`MediaController`, `DailyMenuAppService`, `RecipeController.by-dish`, `TableOrderController.complete`, `OrderAppService.Delete`, `DishCategoryAppService.Delete`).
  - **Kiểm thử Tranh chấp & Tính Bất biến (Concurrency & Idempotency Tests)**:
    + Viết test giả lập nhiều client gọi đồng thời: Kiểm thử idempotent cho thanh toán và hoàn tất đơn (`OrderAppService.CompleteOrder` / `UpdateAsync`) đảm bảo kho không bao giờ bị trừ 2 lần dù request bị lặp lại.
    + Kiểm thử race condition khi tạo đơn (`SubmitOrder` đồng thời trên cùng một bàn) bảo đảm chỉ 1 đơn active tồn tại và không ném lỗi 500.
    + Kiểm thử retry concurrency khi trừ kho nhiều lô FEFO đồng thời.
  - **Kiểm thử Luồng Nghiệp vụ Trọng yếu (Critical Flow End-to-End Unit/Integration Tests)**:
    + Viết bộ test đầy đủ cho: `CompletePaymentAsync`, `TransferTableAsync`, `MergeTablesAsync`, `CancelActiveOrderAsync`.
    + Kiểm thử kiểm kê cân đối kho (`StockAdjustment`) và khấu trừ kho theo hạn sử dụng (`FEFO`).
- **Nguồn**: `CODE_REVIEW.md` (Backend #34), `test/Acme.TooHungry.Application.Tests`
- **Thực thể/CRUD**: `Order`, `InventoryBatch`, `RestaurantTable`, `IdentityUser` — Tự động hóa kiểm thử hồi quy.
- **Backend**: Xây dựng xUnit test classes kế thừa `TooHungryApplicationTestBase`.
- **Frontend**: N/A.
- **Phụ thuộc**: RM-022, RM-023, RM-024, RM-025
- **Spec**: [specs/026-rm-026-automated-testing-auth-concurrency-idempotency/](../specs/026-rm-026-automated-testing-auth-concurrency-idempotency/spec.md)
- **Trạng thái**: hoàn thành
- **Nợ phát sinh**:
  - (trống)

### RM-027 — Kiểm định & Đối soát Toàn diện Mã nguồn so với Code Review (Code Review Verification & Audit) (quality, Wave 5)
- **Mô tả**: Thiết lập quy trình kiểm định, đối soát độc lập và nghiệm thu toàn diện mã nguồn thực tế (Backend & Frontend) so với toàn bộ 68 vấn đề được ghi nhận trong `CODE_REVIEW.md`:
  - **Kiểm định Backend (34/34 hạng mục theo `CODE_REVIEW.md`)**:
    + Đối chiếu 12 lỗi Nghiêm trọng (🔴 #1 - #12): Xác thực logic chống trừ kho 2 lần tại `Order.Complete()`, chặn client tự đặt giá/tính giá server-side, DataAnnotation DTO validation, sửa công thức tồn kho dự báo không nhân đôi ConversionFactor, độc lập UoW retry concurrency, bảo vệ endpoint upload Cloudinary bằng quyền & mime-type, bắt buộc `[Authorize]` trên `DailyMenuAppService`, `RecipeController.by-dish`, `TableOrderController.complete`, áp dụng granular permissions cho `Orders` và `DishCategories`, loại bỏ mass assignment trạng thái bàn, bảo đảm SignalR chỉ phát sau khi commit transaction (`OnCompleted`), chặn race condition tạo đơn trùng bàn qua filtered index.
    + Đối chiếu 19 lỗi Trung bình (🟡 #13 - #31): Đồng bộ múi giờ qua `Clock.Now`, thống nhất giờ mở cửa, booking chỉ lock bàn trước 60 phút, kiểm tra an toàn khi CheckIn/Merge bàn bảo toàn giá & note, unique index lọc soft-delete (`[IsDeleted] = 0`), unique index recipe active, lịch sử phiên bản `RecipeManager`, triệt tiêu N+1 queries, chuyển toàn bộ truy vấn đồng bộ sang async, loại bỏ lạm dụng `AutoInclude`, phân trang giao dịch kho, sinh mã an toàn tránh trùng giây (`ORD-`, `BATCH-`, `ADJ-`), dữ liệu lô kiểm kê `ADJ-*` chuẩn xác, state machine một chiều cho dự báo nhu cầu, chuẩn hóa `BusinessException` + ABP localization `vi.json`/`en.json`, đóng kín setter trên Rich Domain Entities, thêm `[UnitOfWork]` cho background worker, dọn sạch secrets khỏi cấu hình repo, xử lý logging tại Dashboard.
    + Đối chiếu 3 lỗi Nhỏ (🟢 #32 - #34): Xác nhận đã dọn sạch các tệp rác ở thư mục gốc (`test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt`), tách riêng các class trong `DishAppServices.cs` và `ForecastAppServices.cs`, chuẩn hóa kế thừa `TooHungryAppService`, dọn dẹp các permission không dùng, và độ bao phủ của bộ test tự động.
  - **Kiểm định Frontend (34/34 hạng mục theo `CODE_REVIEW.md`)**:
    + Đối chiếu 9 lỗi Nghiêm trọng (🔴 #1 - #9): Khắc phục triệt để phân trang đơn hàng (`totalCount` bảo toàn), sửa triệt để route `/table/layout` không tồn tại thành `/tables` kèm wildcard route `**`, hủy subscription rò rỉ `currentUser` (`take(1)`), gắn `*abpPermission` lên toàn bộ nút hành động nhạy cảm trên mọi màn hình, loại bỏ `unitPrice`/`totalAmount` khỏi payload gửi từ client, chuyển code tự viết ra ngoài thư mục `proxy/`, dùng `PermissionsService`/`<abp-permission-management>` chuẩn hóa encode URL, chuyển timer nền trong sidebar-widgets ra ngoài `NgZone`, bảo vệ kết nối SignalR Hub bằng access token factory.
    + Đối chiếu 15 lỗi Trung bình (🟡 #10 - #24): Thống nhất kiến trúc phản ứng (Angular Signals thay vì gọi `cdr.detectChanges()` rải rác), sửa phân trang bàn ăn, chấm dứt việc kéo 500-1000 dòng về client để tự lọc, tái sử dụng `TableStateService` và `<app-table-card>` dùng chung, chuyển 100% text/toast sang localization (`en.json`, `vi.json`), truyền `{ skipHandleError: true }` khi component tự bắt lỗi, loại bỏ nested subscribes 3 tầng bằng RxJS operators, định dạng ngày tháng nhất quán theo locale, loại bỏ client sinh mã đơn ngẫu nhiên, phân quyền theo permission thay vì role name hardcode, chống XSS `[innerHTML]`, module hóa component kho quá khổ (`inventory.component`), tạo pager dùng chung `<app-pager>`, tối ưu template getter & sort, bảo vệ tích hợp ABP Toaster an toàn.
    + Đối chiếu 10 lỗi Nhỏ (🟢 #25 - #34): Dọn sạch code chết và thư mục/file không dùng, thống nhất bộ thư viện UI, xóa sạch `console.error`, loại bỏ `HttpClientModule` deprecated, bật `strict`/`strictTemplates` trong `tsconfig.json`, gom hằng số giờ mở cửa, bảo mật environment, tối ưu hóa SCSS & loại bỏ lạm dụng `!important`, cơ chế đổi ngôn ngữ không reload trang và định dạng tiền tệ `VND`.
  - **Xây dựng Ma trận Đối soát & Báo cáo Nghiệm thu (Traceability & Verification Matrix)**:
    + Lập bảng kiểm đối soát chi tiết 68 dòng tương ứng 68 vấn đề của `CODE_REVIEW.md` với: Mã lỗi, Tình trạng khắc phục (Đã sửa / Chưa sửa / Không áp dụng), Vị trí code thực tế (file, method/line), Test case chứng minh (xUnit/Vitest).
    + Thực thi toàn bộ kiểm thử tự động (All Backend tests: Unit, Integration, Concurrency, Security; All Frontend tests).
    + Biên soạn tài liệu nghiệm thu kỹ thuật xác nhận hệ thống hoàn thành mục tiêu System Hardening & Code Review Refactoring của Wave 5.
- **Nguồn**: `CODE_REVIEW.md` (Toàn bộ 68 mục Backend & Frontend), mã nguồn hiện tại của dự án
- **Thực thể/CRUD**: Toàn bộ hệ thống — Kiểm định chất lượng mã nguồn, đối soát tiêu chí kỹ thuật và nghiệm thu.
- **Backend**: Chạy toàn bộ test suites `dotnet test`, đối chiếu code với checklist 34 mục Backend.
- **Frontend**: Chạy kiểm tra strict compilation `npm run build`, unit tests, đối chiếu code với checklist 34 mục Frontend.
- **Phụ thuộc**: RM-022, RM-023, RM-024, RM-025, RM-026
- **Spec**: [specs/027-rm-027-code-review-validation/](../specs/027-rm-027-code-review-validation/spec.md)
- **Trạng thái**: hoàn thành
- **Nợ phát sinh**:
  - Không còn lỗi Nghiêm trọng (🔴) hay Trung bình (🟡) tồn đọng. 68/68 hạng mục đã được đối soát chi tiết trong [traceability-matrix.md](../specs/027-rm-027-code-review-validation/traceability-matrix.md) và phê duyệt nghiệm thu toàn diện tại [audit-signoff-report.md](../specs/027-rm-027-code-review-validation/audit-signoff-report.md) (205/205 xUnit tests pass 100%, Angular production build sạch).




