# Tác vụ (Tasks): Quản lý Nguyên liệu (Ingredients) (RM-005)

**Đầu vào (Input)**: Tài liệu thiết kế từ `specs/005-rm-005-ingredients/`
- **Đặc tả tính năng**: [spec.md](./spec.md)
- **Kế hoạch triển khai**: [plan.md](./plan.md)
- **Mô hình dữ liệu**: [data-model.md](./data-model.md)
- **Hợp đồng API**: [contracts/ingredient-api.md](./contracts/ingredient-api.md)
- **Kịch bản kiểm thử**: [quickstart.md](./quickstart.md)

**Định dạng**: `[ID] [P?] [Story] Mô tả`
- **[P]**: Có thể chạy song song (các file khác nhau, không phụ thuộc nhau)
- **[Story]**: Ánh xạ theo User Story (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`)

---

## Phase 1: Thiết lập & Cơ sở hạ tầng (Setup & Prerequisites)

**Mục đích**: Chuẩn bị nền tảng phân quyền, cấu trúc dữ liệu và migration cơ sở dữ liệu cho Nguyên liệu.

- [x] T001 [P] Khai báo hằng số phân quyền `Ingredients` (`Default`, `Create`, `Edit`, `Delete`) trong `src/Acme.TooHungry.Application.Contracts/Permissions/TooHungryPermissions.cs`
- [x] T002 Đăng ký nhóm quyền và quyền hạn `Ingredients` với đa ngôn ngữ trong `src/Acme.TooHungry.Application.Contracts/Permissions/TooHungryPermissionDefinitionProvider.cs`
- [x] T003 [P] Bổ sung thuộc tính `EstimatedPrice` (decimal) và các phương thức cập nhật giá trong `src/Acme.TooHungry.Domain/Ingredients/Ingredient.cs`
- [x] T004 [P] Cấu hình ánh xạ EF Core DbContext cho `EstimatedPrice` (HasPrecision(18, 2)) trong `src/Acme.TooHungry.EntityFrameworkCore/EntityFrameworkCore/TooHungryDbContext.cs`
- [x] T005 Tạo và áp dụng migration EF Core thêm trường `EstimatedPrice` vào bảng `AppIngredients` trong `src/Acme.TooHungry.EntityFrameworkCore/`

**Trạm kiểm tra (Checkpoint)**: Cơ sở dữ liệu và cấu hình quyền hạn cốt lõi đã sẵn sàng.

---

## Phase 2: Nền tảng (Blocking Prerequisites)

**Mục đích**: Hoàn thiện Domain Service cốt lõi, Hợp đồng DTOs, API Mappers và Controllers trước khi triển khai các User Story.

**⚠️ ĐẶC BIỆT QUAN TRỌNG**: Toàn bộ các User Story phụ thuộc vào Domain Service và Hợp đồng DTO trong phase này.

- [x] T006 [P] Tạo mới Domain Service `IngredientManager` trong `src/Acme.TooHungry.Domain/Ingredients/IngredientManager.cs` để đóng gói các Domain Invariants:
  - Chuẩn hóa tên (Trim) và kiểm tra tính duy nhất không phân biệt hoa thường (`CheckNameAsync`)
  - Phát hiện nguyên liệu trùng tên đang tạm ngưng và ném `Ingredient:AlreadyExistsInactive` kèm `IngredientId`
  - Kiểm tra điều kiện khóa thay đổi đơn vị tính `CanChangeUnitAsync` (kiểm tra liên kết với `RecipeIngredient` và `InventoryBatch`)
  - Kiểm tra điều kiện xóa an toàn `CheckCanDeleteAsync` (ngăn xóa nếu có `RecipeIngredient` hoặc `InventoryBatch`)
- [x] T007 [P] Cập nhật các DTOs (`IngredientDto`, `CreateIngredientDto`, `UpdateIngredientDto`, `GetIngredientsInput`, `SmartRestoreDto`) trong `src/Acme.TooHungry.Application.Contracts/Ingredients/IngredientDtos.cs` để bổ sung:
  - `EstimatedPrice` (decimal, >= 0)
  - `ExpiredStock` (decimal - tổng tồn lô quá hạn)
  - `CanEditUnit` (bool - cờ cho phép đổi đơn vị tính)
- [x] T008 [P] Khai báo phương thức `DeleteAsync(Guid id)` trong interface `src/Acme.TooHungry.Application.Contracts/Ingredients/IIngredientAppService.cs`
- [x] T009 Xác minh ánh xạ `EstimatedPrice` giữa `Ingredient` và `IngredientDto` trong `src/Acme.TooHungry.Application/TooHungryApplicationMappers.cs`
- [x] T010 Cập nhật `src/Acme.TooHungry.HttpApi/Controllers/IngredientController.cs` bổ sung endpoint `[HttpDelete("{id:guid}")]` và gắn thuộc tính phân quyền `[Authorize(TooHungryPermissions.Ingredients.*)]` cho các action

**Trạm kiểm tra (Checkpoint)**: Nền tảng Domain, Application Contracts và HTTP API đã sẵn sàng.

---

## Phase 3: User Story 1 - Xem danh sách & Bộ lọc đa tiêu chí (Ưu tiên: P1) 🎯 MVP

**Mục tiêu**: Người dùng có thể xem danh sách nguyên liệu với đầy đủ thông tin phân trang, tìm kiếm, lọc theo trạng thái/bảo quản/tiêu hao, xem tồn khả dụng an toàn (loại trừ lô hết hạn) và cảnh báo sắp hết/quá hạn.

**Kiểm thử Độc lập**: Truy cập `/ingredients`, danh sách hiển thị đúng các cột, dữ liệu lọc và phân trang mượt mà.

### Triển khai Backend & Routing
- [x] T011 [US1] Nâng cấp phương thức `GetListAsync` và `GetAsync` trong `src/Acme.TooHungry.Application/Ingredients/IngredientAppService.cs`:
  - Lọc theo `IsActive` (mặc định lấy active nếu không truyền), `StorageType`, `ConsumptionMethod`, `Filter` (tên nguyên liệu)
  - Tính toán `CurrentStock` an toàn (chỉ tính tổng các `InventoryBatch` có `RemainingQuantity > 0` và `ExpiryDate >= DateTime.UtcNow.Date`)
  - Tính toán `ExpiredStock` (tổng số lượng các `InventoryBatch` đã quá hạn `ExpiryDate < DateTime.UtcNow.Date`)
  - Đính kèm cờ `CanEditUnit` thông qua `IngredientManager.CanChangeUnitAsync`
  - Gắn phân quyền `[Authorize(TooHungryPermissions.Ingredients.Default)]`
- [x] T012 [P] [US1] Tạo proxy client hoặc cập nhật proxy service `IngredientService` cho Angular trong `angular/src/app/proxy/ingredients/`
- [x] T013 [US1] Đăng ký route `/ingredients` với `smartPermissionGuard(TooHungryPermissions.Ingredients.Default)` trong `angular/src/app/app.routes.ts`
- [x] T014 [US1] Đăng ký mục menu `::Menu:Ingredients` trực thuộc nhóm `::Menu:InventoryGroup` trong `angular/src/app/route.provider.ts`

### Triển khai Giao diện Angular
- [x] T015 [US1] Khởi tạo component `angular/src/app/ingredient/ingredient.component.ts` quản lý state: danh sách nguyên liệu, bộ lọc trạng thái (Đang dùng / Tạm ngưng / Tất cả), bộ lọc loại bảo quản, từ khóa tìm kiếm, phân trang và sắp xếp
- [x] T016 [US1] Xây dựng template `angular/src/app/ingredient/ingredient.component.html` tích hợp `<app-shared-table>`:
  - Hiển thị các cột: Tên nguyên liệu, Đơn vị tính, Loại bảo quản, Phương thức tiêu hao, Tồn tối thiểu, Đơn giá tham khảo, Tồn khả dụng, Trạng thái, Thao tác
  - Hiển thị badge cảnh báo tồn kho: Màu cam khi `CurrentStock <= MinStock && CurrentStock > 0`, Màu đỏ khi `CurrentStock == 0`
  - Hiển thị badge / tooltip cảnh báo tồn quá hạn màu đỏ/vàng khi `ExpiredStock > 0`
- [x] T017 [P] [US1] Cấu hình style trong `angular/src/app/ingredient/ingredient.component.scss` tuân thủ nghiêm ngặt bảng màu Cam & Trắng (`#EA580C`, `#FFF7ED`, `#FFFFFF`)

**Trạm kiểm tra (Checkpoint)**: Màn hình danh sách `/ingredients` hoạt động hoàn chỉnh, lọc tìm kiếm chính xác và hiển thị đầy đủ các chỉ số tồn kho an toàn.

---

## Phase 4: User Story 2 - Thêm mới Nguyên liệu & Chống trùng lặp (Ưu tiên: P1)

**Mục tiêu**: Cho phép tạo mới nguyên liệu với đơn vị tính (RM-004), định mức tồn tối thiểu, đơn giá tham khảo. Chặn trùng lặp tên thông minh và gợi ý khôi phục nếu tên trùng với nguyên liệu đang tạm ngưng.

**Kiểm thử Độc lập**: Nhấn "Thêm mới", điền thông tin và lưu, nguyên liệu hiển thị trên bảng; thử tạo trùng tên để kiểm tra cơ chế chặn lỗi và khôi phục thông minh.

### Triển khai Backend
- [x] T018 [US2] Cập nhật phương thức `CreateAsync` trong `src/Acme.TooHungry.Application/Ingredients/IngredientAppService.cs`:
  - Gọi `IngredientManager.CheckNameAsync` để kiểm tra trùng tên không phân biệt hoa thường và trim khoảng trắng
  - Bắt ngoại lệ `Ingredient:AlreadyExistsInactive` để trả lỗi chi tiết kèm ID nguyên liệu cũ
  - Khởi tạo thực thể `Ingredient` với `EstimatedPrice` và lưu vào repository
  - Gắn phân quyền `[Authorize(TooHungryPermissions.Ingredients.Create)]`

### Triển khai Giao diện Angular
- [x] T019 [US2] Xây dựng modal form Thêm mới nguyên liệu trong `angular/src/app/ingredient/ingredient.component.ts` và `ingredient.component.html` sử dụng `<app-shared-modal>`:
  - Trường Tên nguyên liệu (bắt buộc, text)
  - Trường Đơn vị tính (`<app-custom-select>` tải từ danh mục `Unit` của RM-004 có `IsActive = true`)
  - Trường Tồn tối thiểu (`MinStock`, số >= 0, mặc định 0)
  - Trường Đơn giá tham khảo (`EstimatedPrice`, số >= 0, mặc định 0)
  - Dropdown Loại bảo quản (Ngắn hạn / Dài hạn)
  - Dropdown Phương thức tiêu hao (Theo công thức / Thủ công)
  - Ràng buộc: Tuyệt đối không có trường nhập tồn kho thực tế ban đầu (tuân thủ ranh giới RM-011)
- [x] T020 [US2] Triển khai xử lý lỗi trùng tên thông minh trong Angular component: khi backend trả về mã `Ingredient:AlreadyExistsInactive`, hiển thị modal xác nhận *"Nguyên liệu này đã tồn tại và đang tạm ngưng. Bạn có muốn kích hoạt lại?"* kèm nút "Kích hoạt lại" gọi `SmartRestoreAsync`

**Trạm kiểm tra (Checkpoint)**: Thêm mới nguyên liệu hoạt động hoàn chỉnh, dropdown liên kết chuẩn RM-004, cơ chế chống trùng lặp và SmartRestore hoạt động thông suốt.

---

## Phase 5: User Story 3 - Chỉnh sửa & Khóa Đơn vị tính khi có dữ liệu (Ưu tiên: P1)

**Mục tiêu**: Cập nhật thông tin nguyên liệu, đồng thời tự động khóa trường Đơn vị tính khi nguyên liệu đã gắn vào công thức món ăn hoặc đã có lô hàng kho nhằm bảo vệ tính toàn vẹn số liệu.

**Kiểm thử Độc lập**: Mở modal sửa của nguyên liệu chưa dùng (được đổi đơn vị); mở modal sửa của nguyên liệu đã dùng (trường đơn vị bị disabled kèm tooltip giải thích).

### Triển khai Backend
- [x] T021 [US3] Cập nhật phương thức `UpdateAsync` trong `src/Acme.TooHungry.Application/Ingredients/IngredientAppService.cs`:
  - Kiểm tra nếu `BaseUnit` / `UnitId` thay đổi, gọi `IngredientManager.CanChangeUnitAsync`
  - Nếu đã có liên kết trong `RecipeIngredient` hoặc `InventoryBatch`, ném `BusinessException("Ingredient:CannotChangeUnitWithExistingData")`
  - Cập nhật các trường: `Name`, `MinStock`, `EstimatedPrice`, `StorageType`, `ConsumptionMethod`
  - Gắn phân quyền `[Authorize(TooHungryPermissions.Ingredients.Edit)]`

### Triển khai Giao diện Angular
- [x] T022 [US3] Tích hợp modal Chỉnh sửa trong `angular/src/app/ingredient/ingredient.component.ts` và `ingredient.component.html`:
  - Điền sẵn dữ liệu hiện tại của nguyên liệu khi nhấn "Sửa"
  - Kiểm tra cờ `CanEditUnit`: Nếu `false`, vô hiệu hóa (`disabled`) ô chọn Đơn vị tính và hiển thị icon tooltip *"Đơn vị tính đã bị khóa do nguyên liệu đã có dữ liệu kho hoặc công thức món ăn"*
  - Cho phép cập nhật các trường còn lại và lưu dữ liệu kèm thông báo toast thành công

**Trạm kiểm tra (Checkpoint)**: Chỉnh sửa hoạt động chuẩn xác, logic khóa trường Đơn vị tính vận hành tin cậy cả ở Frontend lẫn Backend.

---

## Phase 6: User Story 4 - Tạm ngưng, Kích hoạt lại & Khôi phục thông minh (Ưu tiên: P2)

**Mục tiêu**: Cho phép tạm ngưng nguyên liệu với lý do bắt buộc và kích hoạt lại nguyên liệu khi có nhu cầu sử dụng tiếp.

**Kiểm thử Độc lập**: Tạm ngưng 1 nguyên liệu kèm lý do, kiểm tra trạng thái chuyển "Tạm ngưng"; sau đó kích hoạt lại kèm cập nhật định mức tồn tối thiểu mới.

### Triển khai Backend
- [x] T023 [US4] Hoàn thiện các phương thức `DeactivateAsync`, `ReactivateAsync` và `SmartRestoreAsync` trong `src/Acme.TooHungry.Application/Ingredients/IngredientAppService.cs`:
  - Kiểm tra lý do tạm ngưng không được để trống (`Check.NotNullOrWhiteSpace`)
  - Gắn phân quyền `[Authorize(TooHungryPermissions.Ingredients.Edit)]`

### Triển khai Giao diện Angular
- [x] T024 [US4] Xây dựng modal "Tạm ngưng nguyên liệu" trong `angular/src/app/ingredient/ingredient.component.ts` và `ingredient.component.html`:
  - Yêu cầu người dùng nhập trường "Lý do tạm ngưng" (bắt buộc, hiển thị lỗi nếu để trống)
  - Xác nhận và gọi API `deactivate`, cập nhật bảng và thông báo thành công
- [x] T025 [US4] Xây dựng modal "Kích hoạt lại nguyên liệu" trong `angular/src/app/ingredient/ingredient.component.ts` và `ingredient.component.html`:
  - Cho phép tùy chọn cập nhật định mức tồn tối thiểu mới (`NewMinStock`)
  - Xác nhận và gọi API `reactivate` / `smartRestore`, đưa nguyên liệu trở lại trạng thái hoạt động bình thường

**Trạm kiểm tra (Checkpoint)**: Vòng đời tạm ngưng và kích hoạt lại nguyên liệu hoạt động hoàn chỉnh, lý do tạm ngưng được ghi nhận rõ ràng.

---

## Phase 7: User Story 5 - Xóa an toàn Nguyên liệu (Ưu tiên: P2)

**Mục tiêu**: Cho phép xóa an toàn nguyên liệu mới chưa phát sinh giao dịch; chặn đứng tuyệt đối hành vi xóa nguyên liệu đã nằm trong công thức hoặc có lô kho.

**Kiểm thử Độc lập**: Xóa nguyên liệu rác (thành công); xóa nguyên liệu đã có công thức hoặc lô kho (nhận thông báo chặn và hướng dẫn chuyển sang Tạm ngưng).

### Triển khai Backend
- [x] T026 [US5] Triển khai phương thức `DeleteAsync(Guid id)` trong `src/Acme.TooHungry.Application/Ingredients/IngredientAppService.cs`:
  - Gọi `IngredientManager.CheckCanDeleteAsync(id)` để kiểm tra phụ thuộc
  - Nếu vi phạm, ném lỗi nghiệp vụ thân thiện `Ingredient:CannotDeleteUsedInRecipe` hoặc `Ingredient:CannotDeleteHasBatches`
  - Nếu an toàn, thực hiện soft delete thông qua repository
  - Gắn phân quyền `[Authorize(TooHungryPermissions.Ingredients.Delete)]`

### Triển khai Giao diện Angular
- [x] T027 [US5] Tích hợp thao tác Xóa trong `angular/src/app/ingredient/ingredient.component.ts` và `ingredient.component.html`:
  - Hiển thị modal xác nhận cảnh báo nguy hiểm trước khi xóa
  - Nếu xóa thành công: Hiển thị toast thông báo và tải lại danh sách
  - Nếu bị chặn từ backend: Bắt thông báo lỗi và hiển thị modal thông báo nguyên do rõ ràng, gợi ý người dùng chuyển sang chức năng "Tạm ngưng"

**Trạm kiểm tra (Checkpoint)**: Xóa an toàn hoạt động tuyệt đối tin cậy, không làm vỡ liên kết dữ liệu chuỗi cung ứng.

---

## Phase 8: Trau chuốt, Quốc tế hóa & Kiểm thử Toàn diện (Polish & Cross-Cutting)

**Mục đích**: Hoàn thiện đa ngôn ngữ song ngữ 100%, bổ sung bộ kiểm thử tự động và xác minh toàn bộ luồng nghiệp vụ.

- [x] T028 [P] Bổ sung đầy đủ 100% localization keys cho Nguyên liệu vào `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json`
- [x] T029 [P] Bổ sung đầy đủ 100% localization keys cho Nguyên liệu vào `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json`
- [x] T030 [P] Viết Unit Tests cho `IngredientManager` trong `test/Acme.TooHungry.Domain.Tests/Ingredients/IngredientManager_Tests.cs` (kiểm tra chống trùng lặp tên, kiểm tra điều kiện xóa an toàn, kiểm tra khóa đơn vị tính)
- [x] T031 [P] Viết Integration Tests cho `IngredientAppService` trong `test/Acme.TooHungry.Application.Tests/Ingredients/IngredientAppService_Tests.cs` (kiểm tra CRUD, lọc tồn an toàn, tạm ngưng và kích hoạt lại)
- [x] T032 Thực thi kịch bản kiểm thử E2E theo [quickstart.md](./quickstart.md) và chạy kiểm tra biên dịch toàn hệ thống (`dotnet build`)

---

## Phụ thuộc (Dependencies) & Thứ tự Thực thi

### Phụ thuộc giữa các Phase
1. **Phase 1 (Thiết lập)**: Không phụ thuộc - có thể bắt đầu ngay.
2. **Phase 2 (Nền tảng)**: Phụ thuộc vào Phase 1 - **CHẶN (BLOCKS)** tất cả các User Stories tiếp theo.
3. **Phase 3 (User Story 1 - P1)**: Phụ thuộc vào Phase 2 - Đây là MVP cốt lõi cho phân hệ Nguyên liệu.
4. **Phase 4 (User Story 2 - P1)**: Phụ thuộc vào Phase 2 và Phase 3 (dùng chung modal/table state trên màn hình `/ingredients`).
5. **Phase 5 (User Story 3 - P1)**: Phụ thuộc vào Phase 2, Phase 3 và Phase 4.
6. **Phase 6 (User Story 4 - P2)**: Phụ thuộc vào Phase 3 và Phase 4.
7. **Phase 7 (User Story 5 - P2)**: Phụ thuộc vào Phase 3.
8. **Phase 8 (Trau chuốt & Tests)**: Phụ thuộc vào việc hoàn thành các User Stories mong muốn.

### Cơ hội Triển khai Song song (Parallel Opportunities)
- Các tác vụ `[P]` trong Phase 1 (T001, T003, T004) có thể tiến hành độc lập.
- Các tác vụ `[P]` trong Phase 2 (T006, T007, T008) có thể triển khai song song.
- Trong Phase 8, việc dịch thuật (T028, T029) và viết Unit/Integration Tests (T030, T031) hoàn toàn độc lập với nhau.

---

## Chiến lược Phân phối Tăng dần (Incremental Delivery Strategy)

1. **MVP Giai đoạn 1**: Hoàn thành Phase 1 + Phase 2 + Phase 3 (US1) -> Người dùng xem được danh mục nguyên liệu, kiểm soát tồn kho khả dụng và cảnh báo hết hạn an toàn.
2. **MVP Giai đoạn 2**: Hoàn thành Phase 4 (US2) + Phase 5 (US3) -> Người dùng có thể thêm mới và chỉnh sửa đầy đủ dữ liệu nguyên liệu theo chuẩn chống trùng và khóa đơn vị an toàn.
3. **Hoàn thiện Tính năng**: Hoàn thành Phase 6 (US4) + Phase 7 (US5) + Phase 8 -> Quản lý trọn vẹn vòng đời nguyên liệu (tạm ngưng, kích hoạt lại, xóa an toàn), đạt chuẩn 100% Tiếng Việt / Tiếng Anh và kiểm thử tự động.
