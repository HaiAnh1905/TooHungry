# Kế hoạch Triển khai (Implementation Plan): Quản lý Khu vực Ăn uống & Bàn ăn (Dining Areas and Tables Management)

**Nhánh Tính năng**: `008-rm-008-dining-areas-and-tables` | **Ngày**: 2026-10-09 | **Đặc tả**: [spec.md](spec.md)

**Đầu vào**: Đặc tả tính năng từ `specs/008-rm-008-dining-areas-and-tables/spec.md`

---

## Bản Tóm tắt Kỹ thuật

Triển khai hoàn chỉnh module Quản lý Khu vực ăn uống và Bàn ăn (Dining Areas & Tables Management - RM-008) theo kiến trúc chuẩn Domain-Driven Design (DDD) của ABP Framework kết hợp giao diện Angular độc lập (Standalone Components):
1. **Quản lý Khu vực Ăn uống (`DiningArea`)**:
   - Quản trị cấu hình danh mục khu vực (Tầng 1, Tầng 2, Sân vườn, Phòng VIP), đếm số lượng bàn trực thuộc.
   - Cơ chế kích hoạt / vô hiệu hóa mềm (`IsActive`), tuyệt đối không xóa cứng để bảo vệ lịch sử đơn hàng.
   - Tự động chuyển toàn bộ bàn trong khu vực sang `INACTIVE` (`Disabled`) khi khu vực bị vô hiệu hóa; chặn vô hiệu hóa nếu có bàn đang phục vụ khách (`OCCUPIED`).
2. **Quản lý Bàn ăn (`RestaurantTable`)**:
   - Ràng buộc tên bàn duy nhất toàn hệ thống (Global Unique Index) tại Database và Domain Validation.
   - Chu kỳ vòng đời 5 trạng thái: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `INACTIVE` (`Disabled`).
   - Ràng buộc sức chứa từ 1 đến 100 chỗ ngồi; chặn xóa bàn nếu bàn đang có khách hoặc có đơn hàng mở.
3. **Giao diện Vận hành Bàn chuyên biệt cho Waiter (`/waiter/tables`)**:
   - Bố cục dạng Thẻ (Card Grid) chuẩn **4 Table Cards trên mỗi hàng**, responsive trên Tablet/POS.
   - Bộ lọc theo Tab Khu vực (chỉ hiển thị các khu vực đang hoạt động `IsActive = true`) và lọc theo Trạng thái bàn.
   - Mỗi thẻ hiển thị: Tên bàn, Sức chứa, Huy hiệu trạng thái, và nhóm nút thao tác theo ngữ cảnh:
     - `AVAILABLE`: `[Đón khách]` (chuyển ngay `OCCUPIED`), `[Đặt bàn]`, `[Vô hiệu hóa bàn]`.
     - `INACTIVE`: `[Kích hoạt bàn]` (khôi phục về `AVAILABLE`).
     - `OCCUPIED`: `[Order]` (điều hướng `/waiter/order/:tableId`), `[Kết thúc bữa ăn]` (Case 1: không có order -> confirm dialog giải phóng về `AVAILABLE`; Case 2: có order -> confirm dialog và điều hướng sang thanh toán RM-016, bàn vẫn giữ `OCCUPIED` đến khi thanh toán thành công).
     - `CLEANING`: `[Dọn dẹp xong]` (chuyển về `AVAILABLE`).
     - `RESERVED`: `[Nhận bàn]` (`OCCUPIED`), `[Hủy đặt]` (`AVAILABLE`).
4. **Kiểm soát Đồng thời (Concurrency Control) & Thời gian thực (SignalR)**:
   - Cơ chế Atomic Status Transition để giải quyết xung đột khi nhiều Waiter cùng thao tác trên một bàn.
   - SignalR Hub (`/signalr-hubs/table`) phát sự kiện `TableStatusChanged` để cập nhật tức thì màu sắc và trạng thái thẻ bàn trên mọi thiết bị trong thời gian dưới 1 giây.
5. **Chuẩn Thiết kế UI/UX & Quốc tế hóa**:
   - Tuân thủ bộ nhận diện Cam & Trắng (Orange & White Theme) theo [Hiến pháp Acme.TooHungry](../../.specify/memory/constitution.md) và RM-002.
   - 100% song ngữ (`vi.json` / `en.json`).

---

## Bối cảnh Kỹ thuật

**Ngôn ngữ/Phiên bản**: C# 13 (.NET 10.0+ SDK), TypeScript 5.x  
**Phần phụ thuộc chính**: ABP Framework 9.x, Entity Framework Core 9.x/10.x, Volo.Abp.AspNetCore.SignalR, Angular 19+ (Standalone Components, RxJS, `@microsoft/signalr`)  
**Cơ sở Dữ liệu**: Microsoft SQL Server (Code-First Migrations qua `DbMigrator`), EF Core DbContext  
**Kiểm thử Tự động**: xUnit, Shouldly, NSubstitute (`Acme.TooHungry.Domain.Tests`, `Acme.TooHungry.Application.Tests`, `Acme.TooHungry.EntityFrameworkCore.Tests`)  
**Nền tảng Đích (Target Platform)**: Web Browsers (Chrome, Edge, Safari trên Desktop/Tablet/POS), ASP.NET Core Kestrel Host  
**Loại Dự án**: Ứng dụng Web nhiều tầng DDD (ABP Solution: Angular Frontend + ASP.NET Core Web API Backend)  
**Mục tiêu Hiệu năng (Performance Goals)**: Thao tác đổi trạng thái bàn phản hồi dưới 300ms; đồng bộ thời gian thực qua SignalR dưới 1 giây; tải danh sách 100 bàn dưới 1.5 giây.  
**Ràng buộc Nghiệp vụ (Constraints)**: Không xóa cứng khu vực ăn uống; tên bàn duy nhất toàn hệ thống; tuân thủ hoàn toàn quy chuẩn `.editorconfig` và kiến trúc phân tầng ABP.  
**Quy mô (Scale/Scope)**: Hỗ trợ tối thiểu 50 khu vực ăn uống, 500 bàn ăn hoạt động đồng thời; hàng chục thiết bị client POS/Tablet kết nối song song.  

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi chuyển sang giai đoạn Tasks và Implementation.*

- [x] **I. Domain-Driven Design & ABP Layering**: Thực thể và enum đặt tại `Domain` và `Domain.Shared`; DTOs và Permissions đặt tại `Application.Contracts`; AppServices đặt tại `Application`; Ánh xạ và Migrations đặt tại `EntityFrameworkCore`. Tuyệt đối không rò rỉ query hay logic nghiệp vụ ra Controller/UI.
- [x] **II. UML & Domain Model Alignment**: Tương thích hoàn toàn với sơ đồ mô hình hóa `RMS-TH.vpp` (quan hệ 1-N giữa `DiningArea` và `RestaurantTable`, kiểu enum `TableStatus`).
- [x] **III. Test-First & Automated Quality Gates**: Thiết kế sẵn kịch bản kiểm thử đơn vị cho Domain Invariants (trùng tên bàn, chặn xóa khi có khách, vô hiệu hóa khu vực) và kiểm thử tích hợp cho Application Service workflows.
- [x] **IV. Strict API Contract & Angular Modular Integration**: Các endpoint tuân thủ chuẩn REST DTO của ABP; giao diện Angular tiêu thụ proxy typed nghiêm ngặt; tách biệt giữa Data Table CRUD (Quản lý) và Waiter Card Grid `/waiter/tables` (Vận hành).
- [x] **V. Security, Auditing & Multi-Tenancy**: Kế thừa `FullAuditedAggregateRoot<Guid>`, tích hợp hệ thống quyền hạn phân cấp (`TooHungryPermissions.DiningAreas` và `TooHungryPermissions.Tables`).
- [x] **VI. UI/UX Consistency (Orange & White Theme)**: Giao diện thẻ bàn, huy hiệu trạng thái, tabs và nút hành động sử dụng bộ màu Cam & Trắng đặc trưng, bo tròn 12-16px, hiệu ứng đổ bóng nhẹ và chuyển động vi mô mượt mà.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**: 100% các chuỗi văn bản UI, dialog, toast thông báo lỗi và nhãn trạng thái đều được định nghĩa đồng bộ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**: Toàn bộ tài liệu quy chuẩn và đặc tả đều sử dụng Tiếng Việt.

---

## Cấu trúc Dự án

### Tài liệu Tính năng (`specs/008-rm-008-dining-areas-and-tables/`)

```text
specs/008-rm-008-dining-areas-and-tables/
├── spec.md              # Đặc tả nghiệp vụ và các quyết định clarification
├── plan.md              # Kế hoạch kiến trúc kỹ thuật chi tiết (tập tin này)
├── research.md          # Kết quả nghiên cứu và quyết định kiến trúc Phase 0
├── data-model.md        # Thiết kế lược đồ thực thể, enum và bất biến Phase 1
├── quickstart.md        # Hướng dẫn kiểm thử xác thực end-to-end Phase 1
├── contracts/           # Đặc tả giao tiếp API & SignalR Phase 1
│   ├── dining-area-api.md
│   ├── table-api.md
│   └── signalr-hub.md
└── checklists/
    └── requirements.md  # Checklist thẩm định chất lượng đặc tả
```

### Mã nguồn (Gốc kho lưu trữ)

```text
src/
├── Acme.TooHungry.Domain.Shared/
│   └── Tables/
│       └── TableStatus.cs                          # Chuẩn hóa enum TableStatus (Available, Occupied, Reserved, Disabled, Cleaning)
│
├── Acme.TooHungry.Domain/
│   ├── DiningAreas/
│   │   └── DiningArea.cs                           # Thuộc tính IsActive, quản lý bất biến vô hiệu hóa
│   └── Tables/
│       └── RestaurantTable.cs                      # Quan hệ DiningArea, kiểm tra bất biến và chuyển đổi trạng thái
│
├── Acme.TooHungry.Application.Contracts/
│   ├── Permissions/
│   │   ├── TooHungryPermissions.cs                 # Bổ sung permission: Tables.UpdateStatus, DiningAreas.Manage
│   │   └── TooHungryPermissionDefinitionProvider.cs
│   ├── DiningAreas/
│   │   ├── IDiningAreaAppService.cs                # DeactivateAsync, ActivateAsync, GetLookupAsync
│   │   └── DiningAreaDtos.cs                       # DiningAreaDto (IsActive, TableCount), CreateUpdateDiningAreaDto
│   └── Tables/
│       ├── ITableAppService.cs                     # ChangeStatusAsync, SetAreaTablesStatusAsync
│       ├── ITableRealtimeNotifier.cs               # Trừu tượng hóa thông báo thời gian thực từ tầng Application
│       └── TableDtos.cs                            # TableDto, CreateUpdateTableDto, ChangeTableStatusDto
│
├── Acme.TooHungry.Application/
│   ├── DiningAreas/
│   │   └── DiningAreaAppService.cs                 # DeactivateAsync (chặn khi có khách), ActivateAsync
│   └── Tables/
│       ├── TableAppService.cs                      # ChangeStatusAsync (Atomic check), kiểm tra Unique Name toàn hệ thống
│       └── NullTableRealtimeNotifier.cs            # Fallback triển khai khi chưa nạp SignalR Host
│
├── Acme.TooHungry.EntityFrameworkCore/
│   └── EntityFrameworkCore/
│       └── TooHungryDbContext.cs                   # Cấu hình Unique Index cho Table.Name, ánh xạ AppDiningAreas, AppTables
│
├── Acme.TooHungry.HttpApi.Host/
│   ├── Hubs/
│   │   └── TableHub.cs                             # SignalR Hub cho sự kiện TableStatusChanged
│   ├── Realtime/
│   │   └── SignalRTableRealtimeNotifier.cs         # Triển khai ITableRealtimeNotifier phát sự kiện qua IHubContext<TableHub>
│   └── TooHungryHttpApiHostModule.cs               # Cấu hình endpoint /signalr-hubs/table
│
└── angular/
    └── src/app/
        ├── dining-area/                            # Quản lý khu vực (Bảng CRUD dành cho Manager)
        ├── table/                                  # Quản lý bàn (Bảng CRUD dành cho Manager)
        ├── waiter/                                 # Giao diện Vận hành chuyên biệt cho Phục vụ
        │   ├── tables/
        │   │   ├── waiter-tables.component.ts      # Card Grid 4 cột, bộ lọc tab khu vực hoạt động, status filter
        │   │   ├── waiter-tables.component.html    # Template chuẩn Cam & Trắng, 4 cards/hàng, action buttons
        │   │   └── waiter-tables.component.scss    # Styling thẻ bàn, badges mã màu, hiệu ứng chuyển động
        │   └── waiter.routes.ts                    # Routing đường dẫn /waiter/tables
        └── shared/services/
            └── table-signalr.service.ts            # Lắng nghe sự kiện SignalR thời gian thực và cập nhật store
```

---

## Theo dõi Độ phức tạp (Complexity Tracking)

*Không phát hiện vi phạm nguyên tắc Hiến pháp (Constitution) cần ngoại lệ.* Tất cả các thành phần đều tuân thủ chặt chẽ theo ABP Framework tiêu chuẩn, DDD và quy chuẩn UI/UX của Acme.TooHungry.
