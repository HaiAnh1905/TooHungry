# Kế hoạch Triển khai (Implementation Plan): Quản lý Đơn vị tính (Units) (RM-004)

**Nhánh (Branch)**: `004-rm-004-units` | **Ngày**: 2026-10-08 | **Đặc tả (Spec)**: [spec.md](./spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/004-rm-004-units/spec.md`

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Quản lý Đơn vị tính (Units) (RM-004)** thuộc phân hệ Master Data (Wave 1). Tính năng cung cấp khả năng quản lý danh mục chuẩn đo lường dùng cho Nguyên liệu (RM-005), Công thức (RM-007) và Kho hàng (RM-012, RM-013). 
Kế hoạch bao gồm việc tinh chỉnh Domain Invariants (chặn trùng tên, chặn xóa đơn vị mặc định hoặc đơn vị đang liên kết với nguyên liệu, tự động fallback viết tắt), cập nhật DTOs (`IsActive`), đăng ký ánh xạ AutoMapper, nâng cấp UI Angular sang 100% Shared UI từ RM-002 với bộ nhận diện Cam & Trắng, và hoàn thiện bộ từ điển song ngữ Tiếng Việt - Tiếng Anh.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Phiên bản**: C# 13, .NET 10.0+, TypeScript 5+, Angular 19+
- **Dependencies chính**: ABP Framework 9.x+, Entity Framework Core, RxJS
- **Lưu trữ**: PostgreSQL / SQL Server (thông qua EF Core Code-First)
- **Kiểm thử**: xUnit, Shouldly, Moq (Backend); Jasmine/Karma (Frontend)
- **Nền tảng đích**: Ứng dụng Web SPA (Angular) + REST API (ABP HttpApi.Host)
- **Loại dự án**: Web Application / Master Data CRUD
- **Mục tiêu hiệu suất**: Tải danh sách đơn vị tính < 200ms; tìm kiếm/lọc phản hồi ngay lập tức (< 50ms)
- **Ràng buộc**:
  - Tuân thủ nghiêm ngặt Hiến pháp Acme.TooHungry (Kiến trúc phân lớp DDD, Bộ nhận diện Cam & Trắng, I18N song ngữ 100% trong `en.json` và `vi.json`).
  - Sử dụng 100% component dùng chung từ RM-002 (`shared-table`, `shared-modal`, `custom-select`), không dùng ngx-datatable thô.
- **Quy mô/Phạm vi**: Master Data cốt lõi, thường chứa từ 10 đến 100 đơn vị tính.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi triển khai và kiểm tra lại sau khi hoàn thành thiết kế.*

- **I. Domain-Driven Design (DDD) & Cấu trúc phân lớp ABP**:
  - *Đạt*: Nghiệp vụ kiểm tra trùng tên và kiểm tra điều kiện xóa được đặt tại Domain Service `UnitManager`. Tầng Application chỉ điều phối DTO và quyền.
- **II. UML & Sự đồng nhất của Domain Model**:
  - *Đạt*: Thực thể `Unit` đại diện cho chuẩn đo lường, quan hệ 1-N với `Ingredient` (làm `PurchaseUnitId` và `UsageUnitId`).
- **III. Test-First & Cổng chất lượng tự động**:
  - *Đạt*: Có đầy đủ kiểm thử tự động tại `Acme.TooHungry.Application.Tests` và kiểm thử kịch bản E2E tại `quickstart.md`.
- **IV. Hợp đồng API nghiêm ngặt & Tích hợp Module Angular**:
  - *Đạt*: Triển khai `IUnitAppService`, `UnitDto`, `CreateUpdateUnitDto` định kiểu mạnh; gọi qua Angular proxy service `UnitService`.
- **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy**:
  - *Đạt*: `Unit` kế thừa `FullAuditedAggregateRoot<Guid>`, mọi endpoint được bảo vệ bằng `[Authorize(TooHungryPermissions.Units.*)]`.
- **VI. Sự nhất quán của UI/UX & Hệ thống thiết kế (Cam & Trắng)**:
  - *Đạt*: Sử dụng `<app-shared-table>`, `<app-shared-modal>`, `<app-custom-select>`, màu sắc chủ đạo cam `#EA580C`/`#F97316` trên nền trắng `#FFFFFF`.
- **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - *Đạt*: 100% chuỗi hiển thị được cập nhật song ngữ vào cả `vi.json` và `en.json`.
- **VIII. Ngôn ngữ Tài liệu**:
  - *Đạt*: Toàn bộ tài liệu (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`) viết bằng Tiếng Việt.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu (tính năng này)

```text
specs/004-rm-004-units/
├── spec.md                     # Đặc tả tính năng đã chốt qua clarify
├── plan.md                     # File kế hoạch này
├── research.md                 # Quyết định kỹ thuật và kiến trúc
├── data-model.md               # Mô hình thực thể, DTOs và bất biến
├── quickstart.md               # Hướng dẫn kiểm thử & xác minh E2E
├── checklists/
│   └── requirements.md         # Checklist chất lượng đặc tả
└── contracts/
    └── unit-api.md             # Hợp đồng REST API và JSON Schemas
```

### Mã nguồn Thực tế Cần Tác động

```text
src/Acme.TooHungry.Domain/
└── Units/
    ├── Unit.cs                         # Bổ sung IsActive nếu cần
    ├── UnitManager.cs                  # Bổ sung check đơn vị hệ thống, check Ingredient, fallback viết tắt
    └── UnitDataSeederContributor.cs    # Bổ sung seed đủ 10 đơn vị tính chuẩn

src/Acme.TooHungry.Application.Contracts/
└── Units/
    ├── IUnitAppService.cs              # Hợp đồng CRUD
    └── UnitDtos.cs                     # Bổ sung trường IsActive vào UnitDto và CreateUpdateUnitDto

src/Acme.TooHungry.Application/
├── Units/
│   └── UnitAppService.cs               # Bổ sung phân quyền, điều phối DTO
└── TooHungryApplicationMappers.cs      # Khai báo CreateMap<Unit, UnitDto> và CreateUpdateUnitDto -> Unit

src/Acme.TooHungry.Domain.Shared/
└── Localization/TooHungry/
    ├── en.json                         # Key đa ngôn ngữ tiếng Anh cho Units
    └── vi.json                         # Key đa ngôn ngữ tiếng Việt cho Units

angular/src/app/unit/
├── unit.component.ts                   # Chuyển sang SharedTable, SharedModal, CustomSelect
├── unit.component.html                 # Template tích hợp app-shared-table & app-shared-modal
└── unit.component.scss                 # Style chuẩn Orange & White Theme

test/Acme.TooHungry.Application.Tests/
└── Units/
    └── UnitAppService_Tests.cs         # Thêm test cases cho check can delete & fallback abbreviation
```

---

## Chi tiết Kế hoạch Triển khai (Execution Phases)

### Giai đoạn 1: Backend - Tinh chỉnh Domain & Application Core
1. **Bước 1.1: Cập nhật `UnitDtos.cs`**:
   - Thêm `public bool IsActive { get; set; } = true;` vào `UnitDto` và `CreateUpdateUnitDto`.
2. **Bước 1.2: Tinh chỉnh `UnitManager.cs`**:
   - Trong `CreateAsync` & `UpdateAsync`: Nếu `string.IsNullOrWhiteSpace(abbreviation)`, tự động gán `Abbreviation = cleanName`.
   - Trong `CheckCanDeleteAsync`:
     - Kiểm tra danh sách đơn vị tính mặc định của hệ thống: Nếu `Name` thuộc danh sách (`Kilogram`, `Gam`, `Lít`, `Mililit`, `Chai`, `Thùng`, `Lon`, `Gói`, `Quả`, `Đĩa`), ném `UserFriendlyException("Không thể xóa đơn vị tính mặc định của hệ thống!")`.
     - Inject `IRepository<Ingredient, Guid>` để kiểm tra nếu đơn vị tính đang được tham chiếu bởi bất kỳ bản ghi `Ingredient` nào (làm `PurchaseUnitId` hoặc `UsageUnitId`), ném `UserFriendlyException("Không thể xóa đơn vị tính này vì đang được sử dụng bởi các nguyên liệu trong hệ thống!")`.
3. **Bước 1.3: Cấu hình AutoMapper Profile**:
   - Mở `TooHungryApplicationMappers.cs`, đăng ký `CreateMap<Unit, UnitDto>()` và `CreateMap<CreateUpdateUnitDto, Unit>()`.
4. **Bước 1.4: Cập nhật `UnitDataSeederContributor.cs`**:
   - Seed đầy đủ 10 đơn vị tính chuẩn nếu chưa tồn tại.

---

### Giai đoạn 2: Backend - Bổ sung Unit Tests
1. **Bước 2.1**: Mở `test/Acme.TooHungry.Application.Tests/Units/UnitAppService_Tests.cs`:
   - Thêm test case xác minh fallback ký hiệu viết tắt khi bỏ trống.
   - Thêm test case xác minh ném ngoại lệ khi cố ý xóa đơn vị tính mặc định hệ thống.
   - Thêm test case xác minh chặn tạo trùng tên đơn vị tính.
2. **Bước 2.2**: Chạy lệnh `dotnet test` để đảm bảo 100% test cases backend đều màu xanh.

---

### Giai đoạn 3: Frontend - Hiện đại hóa Giao diện với Shared UI (RM-002)
1. **Bước 3.1: Tái cấu trúc `unit.component.ts`**:
   - Loại bỏ hoàn toàn phụ thuộc `ngx-datatable`.
   - Import và sử dụng `SharedTableComponent`, `SharedModalComponent`, `CustomSelectComponent` từ thư mục `shared/components`.
   - Cấu hình các cột bảng cho `SharedTable`: Cột Tên đơn vị, Ký hiệu viết tắt, Trạng thái hoạt động, Thao tác.
   - Quản lý trạng thái form reactive (`FormGroup`) cho `Name`, `Abbreviation`, `IsActive`.
2. **Bước 3.2: Tái cấu trúc `unit.component.html`**:
   - Khung chứa giao diện: Sử dụng header tiêu đề chuẩn của hệ thống kèm thanh công cụ (Nút "Thêm mới", ô tìm kiếm, bộ chọn số dòng).
   - Tích hợp `<app-shared-table>` với custom template hiển thị badge trạng thái (`IsActive`) và action menu (Sửa, Xóa).
   - Tích hợp `<app-shared-modal>` cho form Thêm/Sửa đơn vị tính với validation thông báo lỗi trực quan.
3. **Bước 3.3: Tinh chỉnh SCSS (`unit.component.scss`)**:
   - Áp dụng các biến màu Cam & Trắng (`var(--primary-color)`, shadow mềm mại, border-radius chuẩn `12px - 16px`).

---

### Giai đoạn 4: Quốc tế hóa (I18N) & Hoàn thiện
1. **Bước 4.1**: Cập nhật từ điển tiếng Việt [`vi.json`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json):
   - Thêm các key: `::Units`, `::Unit:Name`, `::Unit:Abbreviation`, `::Unit:IsActive`, `::Unit:NewUnit`, `::Unit:EditUnit`, `::Unit:DeleteConfirmation`, `::Unit:DeleteBlockedSystemUnit`, `::Unit:DeleteBlockedInUse`, v.v.
2. **Bước 4.2**: Cập nhật từ điển tiếng Anh [`en.json`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json) đồng bộ 100% cấu trúc key.

---

### Giai đoạn 5: Xác minh End-to-End theo Quickstart
1. Thực hiện đầy đủ 6 kịch bản kiểm thử trong [`quickstart.md`](./quickstart.md).
2. Đảm bảo toàn bộ luồng tạo, sửa, xóa, phân trang, lọc và đổi ngôn ngữ chạy hoàn hảo.

---

## Theo dõi Độ phức tạp (Complexity Tracking)

*Không có vi phạm Hiến pháp.* Mọi thành phần đều tuân thủ nguyên mẫu DDD của ABP Framework và phong cách thiết kế UI/UX Cam & Trắng đã phê chuẩn.
