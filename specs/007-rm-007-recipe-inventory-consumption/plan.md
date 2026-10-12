# Kế hoạch Triển khai (Implementation Plan): Quản lý Công thức Món ăn (Recipes) (RM-007)

**Nhánh (Branch)**: `007-rm-007-recipe-inventory-consumption` | **Ngày**: 2026-10-09 | **Đặc tả (Spec)**: [spec.md](./spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/007-rm-007-recipe-inventory-consumption/spec.md` đã hoàn tất phiên làm rõ (`/speckit.clarify`) ngày 09-10-2026.

---

## 1. Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Quản lý Công thức Món ăn (Recipes) (RM-007)** thuộc phân hệ Dữ liệu danh mục nền tảng (Master Data, Wave 1). Tính năng cung cấp khả năng định lượng nguyên liệu cho từng món ăn, chuẩn hóa quy đổi đơn vị đo lường, kiểm soát chi phí giá vốn lý thuyết (Food Cost %), quản lý vòng đời phiên bản công thức bất biến, và đóng vai trò làm hợp đồng dữ liệu định lượng chuẩn cho phân hệ Bán hàng POS (RM-010) và Quản lý Tồn kho / Trừ kho FEFO (RM-011).

### Các Trọng tâm Kỹ thuật:
1. **Kiến trúc Domain & Thực thể**: Hoàn thiện Aggregate Root `Recipe` và thực thể con `RecipeIngredient`, liên kết với `Dish` (RM-006), `Ingredient` (RM-005), và danh mục đơn vị chuẩn `Unit` (RM-004).
2. **Cơ chế Quy đổi Đơn vị & Độ chính xác số học**: Lựa chọn đơn vị từ danh mục `Unit` của RM-004 qua `RecipeUnitId` / `Unit`, cho phép nhập hệ số quy đổi `ConversionFactor` (decimal > 0) để quy đổi về `BaseUnit` mà không làm tròn trung gian.
3. **Ước tính Chi phí Giá vốn (Food Cost)**: Tự động tính toán tổng chi phí nguyên liệu ước tính dựa trên đơn giá tham khảo `Ingredient.EstimatedPrice` và tính tỷ lệ Food Cost % so với giá niêm yết của món ăn (`Dish.Price`).
4. **Quản lý Phiên bản Công thức (`Recipe Versioning`)**: Tự động tăng phiên bản (`Version += 1`) khi có thay đổi định lượng hoặc thành phần, bảo toàn tính bất biến của dữ liệu đơn hàng và giao dịch kho lịch sử.
5. **Vòng đời Công thức**: Bật/tắt trạng thái hoạt động (`IsActive`), tạm ngưng có ghi nhận lý do bắt buộc (`DeactivationReason`), và kích hoạt lại (`Reactivate`) an toàn với ràng buộc mỗi món ăn chỉ có tối đa 1 công thức active tại một thời điểm.
6. **Xử lý Nguyên liệu Tạm ngưng**: Khi nguyên liệu bị tạm ngưng ở RM-005, công thức vẫn active nhưng hệ thống tự động gắn huy hiệu cảnh báo trực quan trên UI Quản lý và POS.
7. **Phân quyền ABP**: Áp dụng permission `TooHungryPermissions.Recipes` giới hạn quyền truy cập và xem thông tin giá vốn nhạy cảm cho Quản lý (`Manager`/`Admin`) và Bếp trưởng (`Chef`).
8. **Giao diện Người dùng Angular**: 
   - Trang chuyên biệt `/recipes` với bảng dữ liệu `SharedTable`, bộ lọc danh mục món, bộ lọc trạng thái có/chưa có công thức.
   - Nút thao tác nhanh `[Công thức]` trên bảng `/dishes` (RM-006) để mở modal cấu hình tức thì.
   - Modal công thức `RecipeModalComponent` với UI Cam & Trắng, tính toán chi phí trực tiếp theo thời gian thực.
   - Đảm bảo 100% song ngữ trên cả `vi.json` và `en.json`.

---

## 2. Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Phiên bản**: C# 13, .NET 10.0 SDK, TypeScript 5.x, Angular 19.
- **Dependencies chính**: ABP Framework 9.x (`Volo.Abp.Ddd.Domain`, `Volo.Abp.Application`, `Volo.Abp.EntityFrameworkCore`, `Volo.Abp.AutoMapper`), Entity Framework Core 10.
- **Lưu trữ / Cơ sở dữ liệu**: PostgreSQL / SQL Server qua EF Core Code-First.
- **Kiểm thử**: xUnit, Shouldly, ABP TestBase (Domain Tests, Application Tests, EfCore Integration Tests).
- **Nền tảng đích**: Web Application / RESTful API Server, Angular Single Page Application.
- **Mục tiêu hiệu suất**: 
  - API tra cứu công thức theo món `GetActiveByDishIdAsync` phản hồi < 100ms.
  - API lấy danh sách phân trang `GetListAsync` phản hồi < 200ms.
- **Ràng buộc UI/UX**:
  - Hệ thống thiết kế Cam & Trắng (Orange & White Theme: `#EA580C`, `#FFF3E8`, bo góc 12px - 16px).
  - Tái sử dụng 100% Shared UI từ RM-002: `SharedTable`, `SharedModal`, `CustomSelect`.
- **Ràng buộc I18N**: Bắt buộc song ngữ đầy đủ trên cả hai tệp `vi.json` và `en.json`.
- **Ràng buộc Tài liệu**: Toàn bộ tài liệu Markdown viết bằng Tiếng Việt theo Hiến pháp Điều VIII.

---

## 3. Kiểm tra Hiến pháp (Constitution Check)

| Nguyên tắc | Yêu cầu | Tình trạng | Bằng chứng / Giải pháp |
| :--- | :--- | :---: | :--- |
| **I. Domain-Driven Design & ABP Layering** | Tách bạch tầng rõ ràng, logic nghiệp vụ nằm trong Domain Layer | **PASSED** | Logic nâng version, kiểm tra tính duy nhất của active recipe, và quản lý nguyên liệu nằm trong `Recipe` và `RecipeManager`. Application Service chỉ điều phối DTO và quyền. |
| **II. UML & Domain Model Alignment** | Nhất quán với mô hình trực quan `RMS-TH.vpp` | **PASSED** | Các thực thể `Recipe` và `RecipeIngredient` kế thừa đúng chuẩn ABP (`FullAuditedAggregateRoot<Guid>`, `Entity<Guid>`), quan hệ 1-N với `Dish`, `Ingredient`, `Unit`. |
| **III. Test-First & Quality Gates** | Độ phủ kiểm thử tự động toàn diện các kịch bản | **PASSED** | Đã xây dựng và pass toàn bộ test suite trong `RecipeManager_Tests` và `EfCoreRecipeDomainTests`, mở rộng thêm test cho Application Service và tính toán Food Cost. |
| **IV. Hợp đồng API & Angular Proxies** | Định kiểu mạnh, OpenAPI/Swagger, Angular proxy đồng bộ | **PASSED** | Các DTOs (`RecipeDto`, `RecipeIngredientDto`, v.v.) được định kiểu mạnh, Controller RESTful chuẩn, Angular proxies sinh tự động. |
| **V. Bảo mật & Phân quyền** | Bảo vệ endpoint bằng ABP Permissions, kiểm toán tự động | **PASSED** | Thực thể kế thừa `FullAuditedAggregateRoot`, API được bảo vệ bằng `[Authorize(TooHungryPermissions.Recipes.*)]`, chặn thu ngân/phục vụ truy cập giá vốn. |
| **VI. UI/UX Cam & Trắng** | Màu sắc `#EA580C`, bo tròn 12-16px, tương tác vi mô mượt mà | **PASSED** | Áp dụng bộ nhận diện Cam & Trắng đồng nhất với RM-002, tái sử dụng `SharedTable`, `SharedModal`, và `CustomSelect`. |
| **VII. Quốc tế hóa (I18N)** | Song ngữ đầy đủ trong `vi.json` và `en.json` | **PASSED** | 100% chuỗi văn bản form, tiêu đề bảng, thông báo lỗi và Toaster được khai báo đồng bộ trên cả 2 tệp. |
| **VIII. Ngôn ngữ Tài liệu** | Tài liệu dự án viết bằng Tiếng Việt | **PASSED** | Toàn bộ tài liệu trong `specs/007-rm-007-recipe-inventory-consumption/` viết bằng Tiếng Việt chuẩn mực. |

---

## 4. Cấu trúc Dự án (Project Structure)

### Tài liệu (tính năng RM-007)

```text
specs/007-rm-007-recipe-inventory-consumption/
├── spec.md              # Đặc tả nghiệp vụ chuẩn hóa (kết quả /speckit.specify & /speckit.clarify)
├── plan.md              # Kế hoạch triển khai kiến trúc (file này)
├── research.md          # Nghiên cứu kiến trúc & các quyết định kỹ thuật (Phase 0)
├── data-model.md        # Thiết kế thực thể, ràng buộc & DTOs (Phase 1)
├── quickstart.md        # Hướng dẫn kiểm chứng & kịch bản kiểm thử (Phase 1)
├── contracts/
│   └── api-contracts.md # Hợp đồng API RESTful, ABP AppService & Angular Models (Phase 1)
├── checklists/
│   └── requirements.md  # Bảng kiểm tra chất lượng đặc tả (đạt 16/16 tiêu chí)
└── tasks.md             # Danh sách công việc chi tiết (sinh ở bước /speckit.tasks)
```

### Mã nguồn (Root Repository)

```text
src/Acme.TooHungry.Domain/
├── Recipes/
│   ├── Recipe.cs                   # Aggregate Root quản lý công thức, versioning, deactivate/reactivate
│   ├── RecipeIngredient.cs         # Entity dòng nguyên liệu, đơn vị, hệ số quy đổi
│   └── RecipeManager.cs            # Domain Service kiểm tra ràng buộc duy nhất active recipe, nâng version
src/Acme.TooHungry.Application.Contracts/
├── Recipes/
│   ├── IRecipeAppService.cs        # Hợp đồng Application Service
│   └── RecipeDtos.cs               # Các DTOs: RecipeDto, RecipeIngredientDto, Create/Update Dtos
├── Permissions/
│   ├── TooHungryPermissions.cs     # Bổ sung nhánh quyền TooHungryPermissions.Recipes
│   └── TooHungryPermissionDefinitionProvider.cs
src/Acme.TooHungry.Application/
├── Recipes/
│   ├── RecipeAppService.cs         # Triển khai AppService, tính giá vốn, điều phối liên kết
│   └── TooHungryRecipeToRecipeDtoMapper.cs # Mapper cấu hình DTO
src/Acme.TooHungry.HttpApi/
├── Controllers/
│   └── RecipeController.cs        # REST API Controller /api/app/recipe
src/Acme.TooHungry.EntityFrameworkCore/
├── EntityFrameworkCore/
│   └── TooHungryDbContext.cs       # Cấu hình DbSet<Recipe>, DbSet<RecipeIngredient>, quan hệ EF Core
angular/src/app/
├── recipe/
│   ├── recipe.component.ts         # Màn hình quản lý danh sách công thức /recipes
│   ├── recipe.component.html       # Template bảng danh sách, bộ lọc danh mục & trạng thái
│   ├── recipe.component.scss       # Phong cách Cam & Trắng
│   └── recipe-modal/
│       ├── recipe-modal.component.ts   # Modal thêm/sửa công thức, tính giá vốn thời gian thực
│       ├── recipe-modal.component.html # Template form, bảng nguyên liệu động
│       └── recipe-modal.component.scss # SCSS modal
├── dish/
│   └── dish.component.html         # Bổ sung nút hành động nhanh [Công thức] trên bảng món ăn
└── proxy/recipes/
    ├── models.ts                   # Angular TypeScript models
    └── recipe.service.ts           # Angular proxy service
```

---

## 5. Kế hoạch Thực hiện theo Giai đoạn

### Giai đoạn 0: Nghiên cứu Kiến trúc & Quyết định Kỹ thuật (Đã hoàn thành trong `research.md`)
- Làm rõ cơ chế liên kết với `Unit` (RM-004) qua `RecipeUnitId` và `ConversionFactor`.
- Xác định quy tắc cảnh báo khi nguyên liệu thành phần bị tạm ngưng ở RM-005.
- Cố định phạm vi công thức 1 cấp (Single-level) cho Wave 1, hoãn Sub-recipes.
- Định nghĩa phân quyền ABP cho `TooHungryPermissions.Recipes` và che giấu giá vốn.
- Thiết kế 2 điểm vào giao diện: `/recipes` và nút nhanh trên `/dishes`.

### Giai đoạn 1: Thiết kế Chi tiết & Hợp đồng Kỹ thuật (Phase 1)
- Tạo `data-model.md`: Định nghĩa chi tiết các thuộc tính, mối quan hệ, quy tắc bất biến của `Recipe` và `RecipeIngredient`.
- Tạo `contracts/api-contracts.md`: Chuẩn hóa chữ ký hàm của `IRecipeAppService`, DTOs, endpoint HTTP, mã lỗi nghiệp vụ, và mô hình Angular.
- Tạo `quickstart.md`: Hướng dẫn kiểm chứng nghiệp vụ end-to-end với dữ liệu mẫu và kịch bản test tự động.

### Giai đoạn 2: Lập Danh sách Công việc Thực thi (`/speckit.tasks RM-007`)
- Phân rã kế hoạch thành các task độc lập, đánh số tuần tự, sẵn sàng cho việc lập trình và kiểm thử.
