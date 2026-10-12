# Kế hoạch Triển khai (Implementation Plan): Quản lý Nguyên liệu (Ingredients) (RM-005)

**Nhánh (Branch)**: `005-rm-005-ingredients` | **Ngày**: 2026-10-08 | **Đặc tả (Spec)**: [spec.md](./spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/005-rm-005-ingredients/spec.md` đã hoàn tất phiên làm rõ (`/speckit.clarify`).

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Quản lý Nguyên liệu (Ingredients) (RM-005)** thuộc phân hệ Master Data (Wave 1). Tính năng cung cấp khả năng quản lý toàn bộ danh mục nguyên vật liệu dùng trong Công thức món ăn (RM-007), Định giá món ăn (RM-006), Quản lý kho theo lô (RM-012, RM-013, RM-014), và Dự báo tiêu thụ (RM-015).

Kế hoạch kỹ thuật bao gồm:
1. **Tầng Domain**: Bổ sung Domain Service [`IngredientManager`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Domain/Ingredients/IngredientManager.cs) để quản lý Domain Invariants (kiểm tra tính duy nhất của tên, kiểm tra điều kiện xóa an toàn dựa trên `RecipeIngredient` và `InventoryBatch`, kiểm tra khóa trường Đơn vị tính khi nguyên liệu đã có dữ liệu vận hành). Bổ sung trường `EstimatedPrice` vào thực thể [`Ingredient`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Domain/Ingredients/Ingredient.cs).
2. **Tầng Application & Contracts**: Cập nhật DTOs (`IngredientDto`, `CreateIngredientDto`, `UpdateIngredientDto` với `EstimatedPrice`), hoàn thiện [`IngredientAppService`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Application/Ingredients/IngredientAppService.cs) với phương thức `DeleteAsync` có kiểm tra an toàn qua `IngredientManager`, gắn các phân quyền `[Authorize(TooHungryPermissions.Ingredients.*)]`, cập nhật AutoMapper, bổ sung logic tính `CurrentStock` chỉ từ các lô còn hạn sử dụng và cảnh báo `ExpiredStock`.
3. **Tầng HTTP API**: Cập nhật [`IngredientController`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.HttpApi/Controllers/IngredientController.cs) với endpoint `DELETE`.
4. **Tầng Frontend (Angular)**: Xây dựng module và component độc lập tại `/ingredients` sử dụng 100% Shared UI từ RM-002 (`shared-table`, `shared-modal`, `custom-select`), tích hợp menu sidebar trong `route.provider.ts` dưới nhóm `::Menu:InventoryGroup`, áp dụng chuẩn nhận diện thương hiệu Cam & Trắng (Orange & White Theme).
5. **Quốc tế hóa (I18N)**: Bổ sung 100% chuỗi hiển thị song ngữ vào cả `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Phiên bản**: C# 13, .NET 10.0+, TypeScript 5+, Angular 19+
- **Dependencies chính**: ABP Framework 9.x+, Entity Framework Core, RxJS
- **Lưu trữ**: PostgreSQL / SQL Server (thông qua EF Core Code-First)
- **Kiểm thử**: xUnit, Shouldly, Moq (Backend); Jasmine/Karma (Frontend)
- **Nền tảng đích**: Ứng dụng Web SPA (Angular) + REST API (ABP HttpApi.Host)
- **Loại dự án**: Web Application / Master Data Management
- **Mục tiêu hiệu suất**: Tải danh sách nguyên liệu < 200ms; tìm kiếm và lọc phản hồi ngay lập tức (< 50ms)
- **Ràng buộc**:
  - Tuân thủ nghiêm ngặt Hiến pháp Acme.TooHungry (Kiến trúc phân lớp DDD, Bộ nhận diện Cam & Trắng, I18N song ngữ 100% trong `en.json` và `vi.json`).
  - Sử dụng 100% component dùng chung từ RM-002 (`shared-table`, `shared-modal`, `custom-select`), không dùng component thô.
  - Ranh giới Master Data: Tuyệt đối không nhập tồn kho trực tiếp tại form RM-005; mọi tồn kho vật lý do RM-012 quản lý.
- **Quy mô/Phạm vi**: Danh mục Master Data nguyên liệu, thường chứa từ 50 đến 1.000 nguyên liệu cho một nhà hàng thông thường.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi triển khai và kiểm tra lại sau khi hoàn thành thiết kế.*

- **I. Domain-Driven Design (DDD) & Cấu trúc phân lớp ABP**:
  - *Đạt*: Tạo mới Domain Service `IngredientManager` tại tầng Domain để chứa toàn bộ quy tắc bất biến (Invariants: chặn trùng tên, chặn đổi đơn vị khi đã có dữ liệu, chặn xóa khi đã dùng trong Recipe hoặc Batch). Application Service `IngredientAppService` chỉ điều phối DTO và phân quyền.
- **II. UML & Sự đồng nhất của Domain Model**:
  - *Đạt*: Thực thể `Ingredient` liên kết logic với `Unit` (RM-004), quan hệ 1-N với `RecipeIngredient` (RM-007) và `InventoryBatch` (RM-012).
- **III. Test-First & Cổng chất lượng tự động**:
  - *Đạt*: Kế hoạch có đầy đủ bài test kiểm tra invariant domain, kiểm tra API CRUD và kịch bản E2E tại `quickstart.md`.
- **IV. Hợp đồng API nghiêm ngặt & Tích hợp Module Angular**:
  - *Đạt*: Hợp đồng `IIngredientAppService`, các DTOs định kiểu mạnh; gọi qua Angular proxy service `IngredientService`.
- **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy**:
  - *Đạt*: `Ingredient` kế thừa `FullAuditedAggregateRoot<Guid>`, toàn bộ API được bảo vệ bằng `[Authorize(TooHungryPermissions.Ingredients.*)]`.
- **VI. Sự nhất quán của UI/UX & Hệ thống thiết kế (Cam & Trắng)**:
  - *Đạt*: Sử dụng `<app-shared-table>`, `<app-shared-modal>`, `<app-custom-select>`, màu sắc chủ đạo cam `#EA580C`/`#F97316` trên nền trắng `#FFFFFF`.
- **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - *Đạt*: 100% chuỗi hiển thị được cập nhật song ngữ vào cả `vi.json` và `en.json`.
- **VIII. Ngôn ngữ Tài liệu**:
  - *Đạt*: Toàn bộ tài liệu (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`) viết bằng Tiếng Việt.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Thiết kế (Feature Artifacts)

```text
specs/005-rm-005-ingredients/
├── spec.md                     # Đặc tả tính năng đã chốt qua 11 câu hỏi clarifies
├── plan.md                     # File kế hoạch triển khai này
├── research.md                 # Tài liệu nghiên cứu kỹ thuật & quyết định kiến trúc
├── data-model.md               # Mô hình thực thể, DTOs và quy tắc bất biến
├── quickstart.md               # Hướng dẫn kiểm thử & xác minh E2E
├── checklists/
│   └── requirements.md         # Checklist chất lượng đặc tả
└── contracts/
    └── ingredient-api.md       # Hợp đồng REST API và JSON Schemas
```

### Mã nguồn Thực tế Cần Tác động

```text
src/Acme.TooHungry.Domain/
└── Ingredients/
    ├── Ingredient.cs                   # Bổ sung EstimatedPrice (decimal), cập nhật constructor/Update
    └── IngredientManager.cs            # TẠO MỚI: Domain Service quản lý Invariants & Safe Delete

src/Acme.TooHungry.EntityFrameworkCore/
└── EntityFrameworkCore/
    ├── TooHungryDbContext.cs           # Cấu hình EstimatedPrice (Precision 18, 2)
    └── Migrations/                     # EF Core migration cho EstimatedPrice

src/Acme.TooHungry.Application.Contracts/
└── Ingredients/
    ├── IIngredientAppService.cs        # Bổ sung DeleteAsync
    └── IngredientDtos.cs               # Bổ sung EstimatedPrice, ExpiredStock, CanEditUnit

src/Acme.TooHungry.Application/
├── Ingredients/
    └── IngredientAppService.cs         # Tích hợp IngredientManager, phân quyền [Authorize], lọc tồn an toàn
└── TooHungryApplicationMappers.cs      # Ánh xạ EstimatedPrice trong Mapper

src/Acme.TooHungry.HttpApi/
└── Controllers/
    └── IngredientController.cs         # Bổ sung endpoint DELETE, bảo vệ phân quyền

src/Acme.TooHungry.Domain.Shared/
└── Localization/TooHungry/
    ├── en.json                         # Key đa ngôn ngữ tiếng Anh cho Ingredients
    └── vi.json                         # Key đa ngôn ngữ tiếng Việt cho Ingredients

angular/src/app/
├── app.routes.ts                       # Thêm route '/ingredients' với smartPermissionGuard
├── route.provider.ts                   # Thêm menu '::Menu:Ingredients' vào nhóm Kho
└── ingredient/                         # TẠO MỚI: Component chuyên biệt cho RM-005
    ├── ingredient.component.ts         # Logic bảng, modal, lọc đa tiêu chí, phân trang
    ├── ingredient.component.html       # Template tích hợp SharedTable, SharedModal, CustomSelect
    └── ingredient.component.scss       # Style chuẩn Orange & White Theme
```

---

## Kế hoạch Triển khai theo Giai đoạn (Implementation Phases)

### Giai đoạn 0: Nghiên cứu Kỹ thuật (Research & Resolution)
- Xác nhận các quyết định kiến trúc tại `research.md`:
  - Khóa `BaseUnit` / `UnitId` khi đã có liên kết dữ liệu.
  - Bổ sung `EstimatedPrice` vào thực thể `Ingredient` và EF Core.
  - Tạo mới `IngredientManager` tại Domain layer để cô lập logic nghiệp vụ.
  - Tính toán `CurrentStock` loại trừ lô hết hạn và cảnh báo `ExpiredStock`.

### Giai đoạn 1: Thiết kế Mô hình & Hợp đồng (Data Model & Contracts)
- Hoàn thiện `data-model.md` chi tiết hóa các thực thể, DTOs, bất biến.
- Hoàn thiện `contracts/ingredient-api.md` chi tiết hóa tất cả API endpoints.
- Hoàn thiện `quickstart.md` với các kịch bản kiểm thử E2E độc lập.

### Giai đoạn 2: Lập danh sách công việc (`/speckit.tasks`)
- Phân rã thành các task thực thi tuần tự từ Backend Domain -> AppService -> Controller -> Frontend Component -> I18N.
