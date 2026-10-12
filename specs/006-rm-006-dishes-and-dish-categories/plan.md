# Kế hoạch Triển khai (Implementation Plan): Dishes, Categories & Recipe Linkage

**Chi nhánh**: `006-rm-006-dishes-and-dish-categories` | **Ngày cập nhật**: 2026-10-08 | **Thông số**: [spec.md](spec.md)

**Đầu vào**: Thông số tính năng từ [spec.md](spec.md)
**Focus**: Quản lý Món ăn (`Dish`), Danh mục (`DishCategory`) và Liên kết Công thức (`Recipe`)

---

## 1. Tóm tắt

Triển khai toàn diện phân hệ Quản lý Món ăn (`Dish`) và Danh mục món ăn (`DishCategory`) theo chuẩn DDD & ABP Framework 9.x, tích hợp chặt chẽ với phân hệ **Công thức định lượng nguyên liệu (`Recipe` & `RecipeIngredient`)**:
- Cho phép tạo và quản lý món ăn linh hoạt (độc lập, không bắt buộc phải có công thức ngay).
- Cấu hình công thức định lượng 1-1 cho các món chế biến bếp, liên kết với nguyên liệu thô (`Ingredient`) và đơn vị tính chuẩn (`Unit`) để phục vụ tự động trừ kho khi bán hàng trên POS.
- Chuẩn hóa đơn giá tiền tệ sang `decimal(18, 2)`, bổ sung cờ trạng thái `IsActive` (hỗ trợ chuyển đổi nhanh qua hệ thống Tab trên UI) và cơ chế xóa mềm Soft Delete kèm lý do xóa (`DeletionReason`) cho mục đích kiểm soát kiểm toán.

---

## 2. Bối cảnh kỹ thuật

- **Ngôn ngữ/Phiên bản**: C# 13, .NET 10.0 SDK.
- **Giao diện người dùng**: Angular 19 (Mẫu ABP Angular), TypeScript 5.x, SCSS.
- **Phụ thuộc chính**:
  - ABP Framework 9.x (`Volo.Abp.Ddd.Domain`, `Volo.Abp.Application`, `Volo.Abp.EntityFrameworkCore`).
  - Cloudinary DotNet SDK / Angular Upload Widget.
  - Ng-Zorro / ABP Theme Shared Components.
- **Bộ nhớ**: PostgreSQL / SQL Server qua Entity Framework Core 10.
- **Thử nghiệm**: xUnit, Shouldly, NSubstitute (Domain.Tests, Application.Tests, EfCore.Tests).
- **Nền tảng mục tiêu**: Máy chủ API Web (Kestrel / Docker) & Ứng dụng web SPA (Chrome, Edge, Safari, Tablet POS).
- **Performance Goals**: API tìm kiếm thực đơn < 200ms với 500 món ăn; thời gian tải ảnh Cloudinary preview < 3s.
- **Constraints**: Tuân thủ triệt để ABP Layering, Soft Delete (`FullAuditedAggregateRoot<Guid>`), Unique Index không phân biệt hoa thường.

---

##3. Kiểm tra Hiến pháp

*GATE: Đánh giá theo [constitution.md](../../.specify/memory/constitution.md)*

| Nguyên tắc | Yêu cầu | Tình trạng tuân thủ | Bằng chứng |
|---|---|:---:|---|
| **I. DDD & ABP Layering** | Logic nghiệp vụ phải nằm trong Domain Layer, không để ở Application/Controller | **PASSED** | Domain Service xử lý kiểm tra trùng tên và chặn xóa danh mục; Application Service chỉ điều phối DTOs. |
| **II. UML & Domain Alignment** | Phù hợp với mô hình `RMS-TH.vpp` | **PASSED** | Thực thể `Dish`, `DishCategory`, `Recipe`, `RecipeIngredient` ánh xạ chính xác 100% với Visual Paradigm. |
| **III. Test-First & Quality Gates** | Phải có Unit & Integration Tests tự động | **PASSED** | Kế hoạch bao gồm cả Domain Tests (Domain logic) và Application Tests (Use cases, validation, permissions). |
| **IV. API Contract & Angular Modular** | API strongly-typed, Angular dùng service proxy | **PASSED** | Đặc tả DTOs rõ ràng trong `contracts/dish-api.md`; Angular tạo proxy qua `abp generate-proxy`. |
| **V. Security & Auditing** | `FullAuditedAggregateRoot`, quyền hạn ABP, OpenIddict | **PASSED** | Kế thừa `FullAuditedAggregateRoot<Guid>`, tích hợp `DeletionReason`, phân quyền `TooHungryPermissions.Dishes.*`. |

---

## 4. Cấu trúc dự án & Bố cục tệp

## 4. Cấu trúc dự án & Bố cục tệp

### 4.1. Tài liệu (RM-006)
```text
specs/006-rm-006-dishes-and-dish-categories/
├── spec.md              # Feature specification (Đã clarify 5/5 phiên 08-10-2026)
├── plan.md              # Implementation plan (Tài liệu này)
├── research.md          # Architectural research & decisions (10 quyết định kiến trúc)
├── data-model.md        # Data model, ERD & entity schema (kèm DisplayOrder)
├── contracts/
│   └── dish-api.md      # API contracts & DTO schemas (kèm Bulk Toggle & DisplayOrder)
├── checklists/
│   └── requirements.md  # Quality checklist (16/16 tiêu chí đạt)
└── quickstart.md        # Runnable validation scenarios (7 kịch bản)
```

### 4.2. Kiến trúc mã nguồn

```text
# Domain Layer
src/Acme.TooHungry.Domain/
└── Dishes/
    ├── Dish.cs                    # Aggregate Root (Price decimal, IsActive, DeletionReason, ImageUrl)
    ├── DishCategory.cs            # Aggregate Root (Thêm DisplayOrder int mặc định 0)
    ├── DishManager.cs             # Domain Service (Trùng tên không phân biệt hoa thường, DeleteWithReason)
    └── DishCategoryManager.cs     # Domain Service (Trùng tên, CheckCanDelete chặn xóa khi còn món)

# Application Contracts Layer
src/Acme.TooHungry.Application.Contracts/
├── Dishes/
│   ├── IDishAppService.cs         # Service interface món ăn (kèm BulkToggleActiveAsync)
│   ├── IDishCategoryAppService.cs # Service interface danh mục (kèm DisplayOrder)
│   └── DishDtos.cs                # DishDto, CreateUpdateDishDto, DishCategoryDto, BulkToggleActiveDishDto
└── Permissions/
    ├── TooHungryPermissions.cs    # Nhóm TooHungryPermissions.Dishes & DishCategories
    └── TooHungryPermissionDefinitionProvider.cs

# Application Layer
src/Acme.TooHungry.Application/
└── Dishes/
    ├── DishAppServices.cs         # DishAppService & DishCategoryAppService (sắp xếp theo DisplayOrder ASC)
    └── TooHungryApplicationMappers.cs # AutoMapper profile ánh xạ DisplayOrder

# Infrastructure & EF Core Layer
src/Acme.TooHungry.EntityFrameworkCore/
├── EntityFrameworkCore/
│   └── TooHungryDbContext.cs      # EF Core model configuration
└── Migrations/                    # Migration bổ sung DisplayOrder cho DishCategory (nếu cần)

# HTTP API Layer
src/Acme.TooHungry.HttpApi/
└── Controllers/
    └── DishController.cs          # REST Controller (/api/app/dish kèm /bulk-toggle-active)

# Angular Frontend Layer (Orange & White Theme)
angular/src/app/
├── dish/
│   ├── dish.component.html        # SharedTable, Tabs ("Đang phục vụ", "Tạm ngưng", "Tất cả"), Bulk Actions Bar
│   ├── dish.component.scss        # Styling Cam & Trắng, modal, preview ảnh
│   └── dish.component.ts          # Logic phân trang, tìm kiếm, upload ảnh Cloudinary, bulk activate/deactivate
└── dish-category/
    ├── dish-category.component.html # SharedTable quản lý danh mục, cột DisplayOrder, modal thêm/sửa
    ├── dish-category.component.scss # Styling theme đồng bộ
    └── dish-category.component.ts   # CRUD danh mục, sắp xếp DisplayOrder, chặn xóa nếu còn món

# Automated Test Projects
test/
├── Acme.TooHungry.Domain.Tests/Dishes/
│   └── EfCoreDishDomainTests.cs   # Unit tests kiểm tra trùng tên, Soft Delete, chặn xóa danh mục
└── Acme.TooHungry.Application.Tests/Dishes/
    ├── DishAppService_Tests.cs    # Tests CRUD, DeleteWithReason, BulkToggleActive, POS menu
    └── DishCategoryAppService_Tests.cs # Tests CRUD danh mục, chặn xóa khi có món, DisplayOrder
```

---

## 5. Kế hoạch Chi tiết Triển khai các Quyết định Mới (Clarifications)

### 5.1. Thứ tự Hiển thị Danh mục (`DishCategory.DisplayOrder`)
- Bổ sung `public int DisplayOrder { get; set; } = 0;` vào thực thể `DishCategory`.
- Cập nhật DTO `DishCategoryDto`, `CreateUpdateDishCategoryDto`.
- Cập nhật logic sắp xếp trong `DishCategoryAppService.GetListAsync`: `queryable.OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name)`.
- Cập nhật API `DishAppService.GetMenuForPosAsync`: ưu tiên nhóm và hiển thị danh mục theo `DisplayOrder`.
- Tạo migration EF Core bổ sung cột `DisplayOrder` vào bảng `AppDishCategories`.

### 5.2. Thao tác Hàng loạt (Bulk Actions Bar) cho Món ăn
- Thêm endpoint `POST /api/app/dish/bulk-toggle-active` trên `DishAppService` & `DishController`.
- Trên Angular `DishComponent`:
  - Thêm cột Checkbox chọn từng dòng và Checkbox chọn tất cả trên Header của `SharedTable`.
  - Hiển thị thanh nổi (Floating Bar / Top Action Bar) khi `selectedDishIds.length > 0`.
  - Nút **"Kích hoạt đã chọn"** (`Bulk Activate` -> `isActive = true`).
  - Nút **"Tạm ngưng đã chọn"** (`Bulk Deactivate` -> `isActive = false`).
  - Toaster thông báo số lượng bản ghi đã cập nhật thành công.

### 5.3. Trực quan hóa Hình ảnh & Dự phòng (Image Preview & Fallback)
- Form thêm/sửa món ăn hỗ trợ:
  - Tải ảnh trực tiếp lên Cloudinary qua `MediaController` hoặc nhập liên kết ảnh bên ngoài.
  - Khung xem trước (Image Preview) tải tức thì khi URL hợp lệ.
  - Xử lý sự kiện lỗi `(error)` để tự động chuyển sang ảnh placeholder SVG dự phòng, đảm bảo giao diện không bao giờ bị vỡ ảnh.

### 5.4. Đa ngôn ngữ (i18n)
- Rà soát và bổ sung 100% các chuỗi văn bản cho RM-006 vào cả `vi.json` và `en.json`:
  - Nhãn: `Menu:Dishes`, `Menu:DishCategories`, `DisplayOrder`, `BulkActions`, `BulkActivate`, `BulkDeactivate`, `DeletionReason`, `Serving`, `Suspended`, v.v.

---

## 6. Lộ trình Phân rã Công việc (Work Breakdown Structure)

1. **Giai đoạn 1: Backend Domain & Data Model Migration**
   - Bổ sung thuộc tính `DisplayOrder` cho `DishCategory` trong `src/Acme.TooHungry.Domain/Dishes/DishCategory.cs`.
   - Cập nhật cấu hình DbContext và tạo EF Core Migration `Add_DisplayOrder_To_DishCategories`.
   - Chạy migration cập nhật cơ sở dữ liệu.

2. **Giai đoạn 2: Application Services, DTOs & API Endpoints**
   - Cập nhật DTOs: `DishCategoryDto`, `CreateUpdateDishCategoryDto`, thêm `BulkToggleActiveDishDto`.
   - Cập nhật `DishAppService` và `DishCategoryAppService`: sắp xếp theo `DisplayOrder`, hiện thực phương thức `BulkToggleActiveAsync`.
   - Cập nhật `DishController`: bổ sung endpoint `[HttpPost("bulk-toggle-active")]`.

3. **Giai đoạn 3: Frontend Angular (UI/UX Orange & White Theme)**
   - Cập nhật màn hình Danh mục món ăn (`DishCategoryComponent`): bổ sung cột `DisplayOrder` và trường nhập liệu trong modal thêm/sửa.
   - Cập nhật màn hình Món ăn (`DishComponent`): tích hợp Checkbox chọn dòng, thanh công cụ Bulk Actions Bar, Tabs lọc theo trạng thái, modal xóa kèm nhập `DeletionReason`.
   - Cập nhật tệp proxy Angular bằng `abp generate-proxy` hoặc bổ sung trực tiếp service methods.

4. **Giai đoạn 4: Đa ngôn ngữ (Localization)**
   - Bổ sung toàn bộ các chuỗi khóa song ngữ mới vào `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json` và `en.json`.

5. **Giai đoạn 5: Kiểm thử Tự động & Xác thực (Verification)**
   - Bổ sung test cases cho `DisplayOrder` và `BulkToggleActive` trong `DishAppService_Tests.cs` và `DishCategoryAppService_Tests.cs`.
   - Chạy kiểm thử tự động `dotnet test`.
   - Kiểm tra giao diện Angular hiển thị chuẩn chỉnh, responsive và không phát sinh lỗi console.
