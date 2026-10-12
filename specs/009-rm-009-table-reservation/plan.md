# Kế hoạch Triển khai (Implementation Plan): Đặt bàn (Table Reservation Management)

**Nhánh Tính năng**: `009-rm-009-table-reservation` | **Ngày**: 2026-10-09 | **Đặc tả**: [spec.md](spec.md)

**Đầu vào**: Đặc tả tính năng từ `specs/009-rm-009-table-reservation/spec.md`

---

## Bản Tóm tắt Kỹ thuật

Triển khai toàn diện tính năng **Đặt bàn (Table Reservation Management - RM-009)** tích hợp trực tiếp trên giao diện vận hành bàn của Nhân viên phục vụ (`/waiter/tables`), tuân thủ nghiêm ngặt nguyên tắc Domain-Driven Design (DDD) của ABP Framework và kiến trúc Angular Standalone:

1. **Thực thể & Lược đồ Dữ liệu Miền (Domain Model)**:
   - Aggregate Root `TableReservation` kế thừa `FullAuditedAggregateRoot<Guid>` trong `Acme.TooHungry.Domain.Reservations`, lưu trữ toàn bộ lịch sử đơn đặt bàn (`TableId`, `CustomerName`, `CustomerPhone`, `ReservationTime`, `GuestCount`, `Note`, `Status`).
   - Enum `ReservationStatus` (`Confirmed = 1`, `Completed = 2`, `Cancelled = 3`, `AutoCancelled = 4`) tại `Acme.TooHungry.Domain.Shared.Reservations`.
   - Đồng bộ hóa nguyên tử với thực thể `RestaurantTable`: cập nhật các trường thông tin đặt bàn hiện hành (`ReservedCustomerName`, `ReservedCustomerPhone`, `ReservedTime`, `ReservedGuestCount`, `ReservedNote`) và trạng thái `TableStatus.Reserved` để đảm bảo thẻ bàn trên `/waiter/tables` tải siêu tốc mà không cần JOIN phức tạp.
   - Chỉ mục tối ưu: `(Status, ReservationTime)` cho Background Worker quét định kỳ và `(TableId, Status)` cho tra cứu active booking.

2. **Miền Nghiệp vụ & Xác thực (Domain Service `TableReservationManager`)**:
   - Xác thực khung giờ hoạt động: Chỉ chấp nhận giờ nhận bàn trong khoảng **09:00 đến 22:59** hàng ngày (chặn ngoài giờ mở cửa và thời gian quá khứ).
   - Xác thực thời gian đặt trước: Chặn chọn ngày quá **7 ngày (1 tuần)** tới.
   - Xác thực sức chứa: Bắt buộc $1 \le \text{GuestCount} \le \text{Table.Capacity}$.
   - Chặn đặt bàn nếu bàn không ở trạng thái `AVAILABLE`.
   - Cố định bàn khi chỉnh sửa đơn đặt bàn (`TableId` là bất biến, muốn đổi bàn phải hủy đơn cũ và đặt trên bàn mới).
   - Cho phép một số điện thoại đặt nhiều bàn khác nhau.

3. **Dịch vụ Ứng dụng & API (Application Services & Controller)**:
   - `ITableReservationAppService` và `TableReservationAppService`: Tạo mới đơn, Xem chi tiết, Cập nhật thông tin, Đón khách nhận bàn (`CheckInAsync`), Hủy đặt bàn thủ công (`CancelAsync`), Lấy danh sách lịch sử có phân trang.
   - `TableReservationController`: Endpoints REST API bảo vệ bằng quyền ABP `TooHungryPermissions.Reservations.*`.

4. **Tác vụ Nền Tự động Hủy Quá hạn (Background Worker Auto-Cancel)**:
   - `ReservationAutoCancelBackgroundWorker`: Kế thừa `AsyncPeriodicBackgroundWorkerBase`, chạy định kỳ **mỗi 5 phút một lần** (`Period = 300,000 ms`).
   - Tự động phát hiện các đơn đặt bàn có `Status == Confirmed` và `ReservationTime + 1h < Now`, chuyển thành `AutoCancelled`, giải phóng bàn về `AVAILABLE` (xóa sạch trường đặt bàn active) và phát sự kiện Real-time.

5. **Đồng bộ Thời gian thực (SignalR Real-time Hub)**:
   - Tái sử dụng `TableHub` (`/signalr-hubs/table`), phát sự kiện `TableStatusChanged` khi Đặt bàn, Đón khách, Hủy bàn hoặc Auto-cancel để toàn bộ giao diện client cập nhật tức thì dưới 1 giây.

6. **Giao diện Người dùng Angular (Frontend `/waiter/tables`)**:
   - `TableReservationModalComponent`: Booking Modal mở khi bấm `[Đặt bàn]` trên thẻ bàn `AVAILABLE`, tích hợp DatePicker (giới hạn 7 ngày, chặn quá khứ), bộ chọn giờ (09:00 - 22:59), validation số khách $\le$ Capacity.
   - `TableReservationDetailModalComponent`: Modal xem chi tiết và chỉnh sửa booking khi click vào bàn `RESERVED`.
   - Thẻ bàn `RESERVED`: Hiển thị huy hiệu cam/vàng `[Đã đặt trước]`, hiển thị Tên khách + SĐT, kèm 3 nút hành động: `[Đón khách]`, `[Hủy đặt bàn]`, `[Vô hiệu hóa bàn]`.
   - Bộ nhận diện Cam & Trắng (Orange & White Theme) theo Hiến pháp dự án.
   - 100% song ngữ Tiếng Việt & Tiếng Anh (`vi.json` và `en.json`).

---

## Bối cảnh Kỹ thuật

**Ngôn ngữ/Phiên bản**: C# 13 (.NET 10.0+ SDK), TypeScript 5.x  
**Phần phụ thuộc chính**: ABP Framework 9.x, Entity Framework Core 9.x/10.x, Volo.Abp.BackgroundWorkers, Volo.Abp.AspNetCore.SignalR, Angular 19+ (Standalone Components, Reactive Forms, `@microsoft/signalr`)  
**Cơ sở Dữ liệu**: Microsoft SQL Server (Code-First Migrations qua `DbMigrator`), EF Core DbContext  
**Kiểm thử Tự động**: xUnit, Shouldly, NSubstitute (`Acme.TooHungry.Domain.Tests`, `Acme.TooHungry.Application.Tests`)  
**Nền tảng Đích (Target Platform)**: Web Browsers (Chrome, Edge, Safari trên Tablet/Desktop/POS), ASP.NET Core Kestrel Host  
**Loại Dự án**: Ứng dụng Web nhiều tầng DDD (ABP Framework Modular Monolith)  
**Mục tiêu Hiệu năng (Performance Goals)**: Tạo booking phản hồi dưới 300ms; đồng bộ thời gian thực qua SignalR dưới 1 giây; Background Worker quét tối ưu dưới 50ms.  
**Ràng buộc Nghiệp vụ (Constraints)**: Bắt buộc tuân thủ khung giờ 09:00 - 22:59, tối đa 7 ngày, số khách $\le$ Capacity; không xóa cứng dữ liệu lịch sử đặt bàn.  
**Quy mô (Scale/Scope)**: Hỗ trợ hàng trăm lượt đặt bàn mỗi ngày; nhiều máy Tablet/POS kết nối song song.  

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi chuyển sang giai đoạn Tasks và Implementation.*

- [x] **I. Domain-Driven Design & ABP Layering**: Thực thể `TableReservation` và Domain Service `TableReservationManager` đặt tại `Domain`; DTOs và Permissions đặt tại `Application.Contracts`; AppService và Background Worker đặt tại `Application`; Repository, Configuration và Migrations đặt tại `EntityFrameworkCore`.
- [x] **II. UML & Domain Model Alignment**: Nhất quán hoàn toàn với sơ đồ mô hình hóa `RMS-TH.vpp` (quan hệ giữa `RestaurantTable` và đơn đặt bàn, các trường liên hệ đặt chỗ).
- [x] **III. Test-First & Automated Quality Gates**: Thiết kế sẵn kịch bản kiểm thử đơn vị cho Domain Invariants (validation khung giờ, sức chứa, auto-cancel 60 phút) và kiểm thử tích hợp Application Services.
- [x] **IV. Strict API Contract & Angular Modular Integration**: Các endpoint tuân thủ chuẩn REST DTO của ABP; client Angular sử dụng typed proxy; giao diện tách biệt Modal tạo/sửa độc lập.
- [x] **V. Security, Auditing & Multi-Tenancy**: Kế thừa `FullAuditedAggregateRoot<Guid>`, phân quyền `[Authorize(TooHungryPermissions.Reservations.*)]`.
- [x] **VI. UI/UX Consistency (Orange & White Theme)**: Booking Modal, trường nhập liệu, huy hiệu `[Đã đặt trước]` và nút bấm sử dụng bảng màu Cam & Trắng chuẩn, bo tròn 12-16px, đổ bóng nhẹ.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**: 100% chuỗi văn bản, thông báo lỗi validation và toast hiển thị đồng bộ tại `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**: Toàn bộ tài liệu quy chuẩn, đặc tả và kế hoạch đều viết bằng Tiếng Việt.

---

## Cấu trúc Dự án

### Tài liệu Tính năng (`specs/009-rm-009-table-reservation/`)

```text
specs/009-rm-009-table-reservation/
├── spec.md              # Đặc tả nghiệp vụ và các quyết định clarification
├── plan.md              # Kế hoạch kiến trúc kỹ thuật chi tiết (tập tin này)
├── research.md          # Nghiên cứu giải pháp và quyết định kỹ thuật Phase 0
├── data-model.md        # Thiết kế lược đồ thực thể và vòng đời Phase 1
├── quickstart.md        # Hướng dẫn kiểm thử xác thực end-to-end Phase 1
├── contracts/           # Đặc tả giao tiếp API & SignalR Phase 1
│   ├── table-reservation-api.md
│   └── dtos.md
└── checklists/
    └── requirements.md  # Checklist thẩm định chất lượng đặc tả
```

### Mã nguồn (Gốc kho lưu trữ)

```text
src/
├── Acme.TooHungry.Domain.Shared/
│   └── Reservations/
│       └── ReservationStatus.cs                    # Enum trạng thái đặt bàn (Confirmed, Completed, Cancelled, AutoCancelled)
│
├── Acme.TooHungry.Domain/
│   └── Reservations/
│       ├── TableReservation.cs                    # Aggregate Root đơn đặt bàn (FullAuditedAggregateRoot<Guid>)
│       ├── ITableReservationRepository.cs          # Repository chuyên biệt cho đơn đặt bàn
│       └── TableReservationManager.cs             # Domain Service kiểm soát quy tắc nghiệp vụ, khung giờ & sức chứa
│
├── Acme.TooHungry.Application.Contracts/
│   ├── Permissions/
│   │   ├── TooHungryPermissions.cs                 # Định nghĩa TooHungryPermissions.Reservations.*
│   │   └── TooHungryPermissionDefinitionProvider.cs
│   └── Reservations/
│       ├── ITableReservationAppService.cs          # Interface Application Service
│       └── Dtos/
│           ├── CreateTableReservationDto.cs        # DTO tạo đơn đặt bàn
│           ├── UpdateTableReservationDto.cs        # DTO cập nhật thông tin đơn đặt bàn
│           ├── TableReservationDto.cs              # DTO dữ liệu trả về cho client
│           └── GetTableReservationsInput.cs        # DTO phân trang và lọc lịch sử
│
├── Acme.TooHungry.Application/
│   └── Reservations/
│       ├── TableReservationAppService.cs           # Triển khai Application Service
│       └── ReservationAutoCancelBackgroundWorker.cs # Background Worker quét hủy tự động mỗi 5 phút
│
├── Acme.TooHungry.HttpApi/
│   └── Controllers/
│       └── TableReservationController.cs           # REST Controller công khai các endpoints đặt bàn
│
├── Acme.TooHungry.EntityFrameworkCore/
│   ├── EntityFrameworkCore/
│   │   ├── TooHungryDbContext.cs                   # Khai báo DbSet<TableReservation> và cấu hình Entity Mapping
│   │   └── TooHungryDbContextModelCreatingExtensions.cs # Chỉ mục và quan hệ khóa ngoại
│   ├── Reservations/
│   │   └── EfCoreTableReservationRepository.cs     # Triển khai EF Core Repository
│   └── Migrations/
│       └── YYYYMMDD_Add_TableReservations.cs       # Migration tạo bảng AppTableReservations
│
└── angular/src/app/
    └── waiter/
        ├── table-card/
        │   └── table-card.component.html           # Bổ sung nút thao tác đặt bàn, đón khách, hủy đặt bàn
        └── reservation-modal/
            ├── table-reservation-modal.component.ts # Modal tạo mới và xem/sửa thông tin đặt bàn
            ├── table-reservation-modal.component.html
            └── table-reservation-modal.component.scss
```

---

## Theo dõi Độ phức tạp (Complexity Tracking)

*(Không có vi phạm cấu trúc hay nguyên tắc nào; toàn bộ thiết kế tuân thủ 100% chuẩn mực phân tầng DDD của ABP Framework và Hiến pháp dự án).*
