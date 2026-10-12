# Tác vụ Triển khai (Tasks): Đặt bàn (RM-009 Table Reservation Management)

**Nhánh Tính năng**: `009-rm-009-table-reservation` | **Ngày**: 2026-10-09  
**Đặc tả**: [spec.md](spec.md) | **Kế hoạch**: [plan.md](plan.md)  

---

## Phase 1: Thiết lập & Cơ sở Hạ tầng Dùng chung (Setup)

**Mục đích**: Chuẩn hóa các kiểu liệt kê enum và mã lỗi miền nghiệp vụ đặt bàn dùng chung trong toàn hệ thống.

- [x] T001 [P] Khai báo enum `ReservationStatus` (`Confirmed = 1`, `Completed = 2`, `Cancelled = 3`, `AutoCancelled = 4`) trong `src/Acme.TooHungry.Domain.Shared/Reservations/ReservationStatus.cs`
- [x] T002 [P] Định nghĩa các mã lỗi nghiệp vụ đặt bàn `ReservationErrorCodes` (ngoài giờ mở cửa, quá 7 ngày, quá sức chứa, bàn không khả dụng) trong `src/Acme.TooHungry.Domain.Shared/Reservations/ReservationErrorCodes.cs`

---

## Phase 2: Nền tảng (Foundational - Database, Permissions & Contracts)

**Mục đích**: Xây dựng thực thể dữ liệu, cấu hình migration cơ sở dữ liệu, phân quyền và hợp đồng giao tiếp làm điều kiện tiên quyết cho tất cả các User Stories.

- [x] T003 [P] Định nghĩa các quyền hạn `TooHungryPermissions.Reservations` (`Default`, `Create`, `Update`, `Cancel`, `CheckIn`) trong `src/Acme.TooHungry.Application.Contracts/Permissions/TooHungryPermissions.cs` và đăng ký trong `src/Acme.TooHungry.Application.Contracts/Permissions/TooHungryPermissionDefinitionProvider.cs`
- [x] T004 [P] Xây dựng Aggregate Root `TableReservation` kế thừa `FullAuditedAggregateRoot<Guid>` với các thuộc tính (`TableId`, `CustomerName` max 128, `CustomerPhone` max 20, `ReservationTime`, `GuestCount` min 1, `Note` max 512, `Status`) trong `src/Acme.TooHungry.Domain/Reservations/TableReservation.cs`
- [x] T005 [P] Khai báo interface `ITableReservationRepository` kế thừa `IRepository<TableReservation, Guid>` trong `src/Acme.TooHungry.Domain/Reservations/ITableReservationRepository.cs`
- [x] T006 [P] Cấu hình ánh xạ EF Core cho `TableReservation` (bảng `AppTableReservations`, khóa ngoại `TableId`, chỉ mục `(Status, ReservationTime)` và `(TableId, Status)`) trong `src/Acme.TooHungry.EntityFrameworkCore/EntityFrameworkCore/TooHungryDbContext.cs`
- [x] T007 Tạo EF Core Migration `Add_TableReservations` và thực thi đồng bộ lược đồ cơ sở dữ liệu qua `src/Acme.TooHungry.DbMigrator/Program.cs`
- [x] T008 [P] Khai báo các DTOs đặt bàn (`CreateTableReservationDto`, `UpdateTableReservationDto`, `TableReservationDto`, `GetTableReservationsInput`) trong `src/Acme.TooHungry.Application.Contracts/Reservations/Dtos/TableReservationDtos.cs`
- [x] T009 [P] Khai báo interface `ITableReservationAppService` với các phương thức CRUD, Check-in, Cancel trong `src/Acme.TooHungry.Application.Contracts/Reservations/ITableReservationAppService.cs`
- [x] T010 [P] Cấu hình ánh xạ AutoMapper giữa `TableReservation` và các DTOs trong `src/Acme.TooHungry.Application/TooHungryApplicationAutoMapperProfile.cs`
- [x] T011 [P] Xây dựng Domain Service `TableReservationManager` kiểm tra các bất biến (khung giờ 09:00 - 22:59, tối đa 7 ngày, số khách $\le$ Capacity, bàn AVAILABLE, cố định bàn khi sửa) trong `src/Acme.TooHungry.Domain/Reservations/TableReservationManager.cs`

**Trạm kiểm tra (Checkpoint)**: Nền tảng thực thể CSDL, quyền hạn, DTOs và Domain Service đã sẵn sàng – có thể tiến hành phát triển User Story 1 (MVP).

---

## Phase 3: User Story 1 - Tạo Đặt bàn từ Bàn trống trên Giao diện Waiter (Priority: P1) 🎯 MVP

**Mục tiêu**: Nhân viên phục vụ bấm nút `[Đặt bàn]` trên thẻ bàn `AVAILABLE`, điền form modal hợp lệ (Tên, SĐT, Ngày giờ nhận bàn trong khung 09:00 - 22:59 tối đa 7 ngày, Số khách $\le$ Capacity, Ghi chú), lưu thành công chuyển bàn sang `RESERVED` hiển thị thông tin khách hàng trên thẻ bàn.

**Kiểm thử Độc lập**: Truy cập `/waiter/tables`, chọn một bàn `AVAILABLE`, bấm `[Đặt bàn]`, nhập thông tin hợp lệ -> Bàn chuyển sang `RESERVED` màu vàng/cam, hiển thị tên khách và số điện thoại; thử nhập giờ ngoài khung hoặc quá sức chứa -> Bị chặn và báo lỗi rõ ràng.

### Kiểm thử cho User Story 1 (TDD)
- [x] T012 [P] [US1] Viết Integration Tests kiểm tra logic tạo đặt bàn (thẩm định khung giờ 09:00 - 22:59, giới hạn 7 ngày, sức chứa $\le$ Capacity, cập nhật trạng thái bàn sang `RESERVED`) trong `test/Acme.TooHungry.Application.Tests/Reservations/TableReservationAppService_Create_Tests.cs`

### Triển khai User Story 1
- [x] T013 [US1] Triển khai phương thức `CreateAsync` trong `src/Acme.TooHungry.Application/Reservations/TableReservationAppService.cs` (tạo đơn `Confirmed`, gán trường `Reserved*` trên `RestaurantTable`, chuyển bàn sang `TableStatus.Reserved`, phát SignalR `TableStatusChanged`)
- [x] T014 [US1] Tạo endpoint `POST /api/app/table-reservations` trong `src/Acme.TooHungry.HttpApi/Controllers/TableReservationController.cs`
- [x] T015 [P] [US1] Xây dựng component Angular `TableReservationModalComponent` (Reactive Form: Tên, SĐT, DatePicker $\le$ 7 ngày, TimePicker 09:00 - 22:59, số khách $\le$ Capacity, Ghi chú) trong `angular/src/app/waiter/reservation-modal/table-reservation-modal.component.ts`
- [x] T016 [US1] Thiết kế template HTML và phong cách SCSS Cam & Trắng (Orange & White Theme) cho `TableReservationModalComponent` trong `angular/src/app/waiter/reservation-modal/table-reservation-modal.component.html` và `table-reservation-modal.component.scss`
- [x] T017 [US1] Tích hợp nút `[Đặt bàn]` trên thẻ bàn `AVAILABLE` mở Booking Modal và xử lý phản hồi thành công trong `angular/src/app/waiter/tables/waiter-tables.component.ts` và `waiter-tables.component.html`
- [x] T018 [US1] Cập nhật hiển thị thẻ bàn ở trạng thái `RESERVED` (Huy hiệu cam/vàng `[Đã đặt trước]`, hiển thị Tên khách và SĐT) trong `angular/src/app/waiter/tables/waiter-tables.component.html` và `waiter-tables.component.scss`

**Trạm kiểm tra (Checkpoint)**: User Story 1 hoàn tất đầy đủ – đạt mốc MVP cốt lõi cho phép tiếp nhận đơn đặt bàn tại quán.

---

## Phase 4: User Story 2 - Tiếp đón Khách đã Đặt bàn (Check-in) (Priority: P1)

**Mục tiêu**: Khi khách đã đặt trước đến nhà hàng, nhân viên bấm `[Đón khách]` trên thẻ bàn `RESERVED` để đưa khách vào bàn, chuyển trạng thái bàn sang `OCCUPIED`, cập nhật đơn đặt bàn sang `COMPLETED`, dọn sạch trường reserved và đổi sang nhóm nút của bàn đang phục vụ.

**Kiểm thử Độc lập**: Chọn bàn đang `RESERVED`, bấm `[Đón khách]`, kiểm tra bàn chuyển ngay sang `OCCUPIED` màu đỏ ấm, các nút đổi sang `[Order]` và `[Kết thúc bữa ăn]`, đơn đặt bàn liên kết có trạng thái `Completed`.

### Kiểm thử cho User Story 2 (TDD)
- [x] T019 [P] [US2] Viết Integration Tests cho quy trình đón khách đã đặt bàn (`CheckInAsync`: chuyển đơn sang `Completed`, bàn sang `Occupied`, dọn sạch trường reserved active) trong `test/Acme.TooHungry.Application.Tests/Reservations/TableReservationAppService_CheckIn_Tests.cs`

### Triển khai User Story 2
- [x] T020 [US2] Triển khai phương thức `CheckInAsync` trong `src/Acme.TooHungry.Application/Reservations/TableReservationAppService.cs` và endpoint `POST /api/app/table-reservations/{id}/check-in` trong `src/Acme.TooHungry.HttpApi/Controllers/TableReservationController.cs`
- [x] T021 [US2] Tích hợp nút `[Đón khách]` trên thẻ bàn `RESERVED` trong giao diện Waiter gọi API Check-in và cập nhật giao diện trong `angular/src/app/waiter/tables/waiter-tables.component.ts` và `waiter-tables.component.html`

**Trạm kiểm tra (Checkpoint)**: Hoàn tất chu trình liền mạch: `AVAILABLE` $\rightarrow$ `RESERVED` $\rightarrow$ `OCCUPIED`.

---

## Phase 5: User Story 3 - Xem chi tiết & Chỉnh sửa Thông tin Đặt bàn (Priority: P2)

**Mục tiêu**: Cho phép nhân viên bấm vào thẻ bàn `RESERVED` để mở Modal xem chi tiết và chỉnh sửa thông tin đặt bàn (Tên, SĐT, Giờ hẹn, Số khách, Ghi chú); bàn ăn được giữ cố định.

**Kiểm thử Độc lập**: Nhấp vào bàn `RESERVED`, modal mở ra điền đầy đủ dữ liệu hiện tại, đổi giờ hẹn từ 18:30 sang 19:00, bấm Lưu -> Thẻ bàn cập nhật thông tin mới.

### Kiểm thử cho User Story 3 (TDD)
- [x] T022 [P] [US3] Viết Integration Tests cho phương thức `GetActiveByTableIdAsync` và `UpdateAsync` (đảm bảo `TableId` cố định, áp dụng đầy đủ validation khung giờ và sức chứa) trong `test/Acme.TooHungry.Application.Tests/Reservations/TableReservationAppService_Update_Tests.cs`

### Triển khai User Story 3
- [x] T023 [US3] Triển khai phương thức `GetActiveByTableIdAsync` và `UpdateAsync` trong `src/Acme.TooHungry.Application/Reservations/TableReservationAppService.cs` và các endpoints tương ứng trong `src/Acme.TooHungry.HttpApi/Controllers/TableReservationController.cs`
- [x] T024 [US3] Xây dựng component `TableReservationDetailModalComponent` cho phép xem chi tiết và sửa thông tin đặt bàn (cố định bàn ăn) trong `angular/src/app/waiter/reservation-modal/table-reservation-detail-modal.component.ts` và `table-reservation-detail-modal.component.html`
- [x] T025 [US3] Bắt sự kiện click vào thẻ bàn `RESERVED` trên `/waiter/tables` để mở Modal xem/sửa thông tin booking trong `angular/src/app/waiter/tables/waiter-tables.component.ts`

**Trạm kiểm tra (Checkpoint)**: Cho phép điều chỉnh linh hoạt thông tin khách đặt bàn khi có thay đổi kế hoạch.

---

## Phase 6: User Story 4 - Hủy Đặt bàn Thủ công (Priority: P2)

**Mục tiêu**: Nhân viên bấm `[Hủy đặt bàn]` trên thẻ bàn `RESERVED`, hộp thoại xác nhận hiển thị cảnh báo, sau khi xác nhận thì bàn chuyển về `AVAILABLE` và đơn đặt bàn chuyển trạng thái `CANCELLED` (lưu vết kiểm toán, không xóa dữ liệu).

**Kiểm thử Độc lập**: Chọn bàn đang `RESERVED`, bấm `[Hủy đặt bàn]`, xác nhận qua dialog -> Bàn chuyển về `AVAILABLE`, khôi phục các nút ban đầu (`[Đón khách]`, `[Đặt bàn]`, `[Vô hiệu hóa bàn]`).

### Kiểm thử cho User Story 4 (TDD)
- [x] T026 [P] [US4] Viết Integration Tests cho quy trình hủy đặt bàn thủ công (`CancelAsync`: chuyển đơn sang `Cancelled`, bàn về `Available`, dọn sạch trường reserved) trong `test/Acme.TooHungry.Application.Tests/Reservations/TableReservationAppService_Cancel_Tests.cs`

### Triển khai User Story 4
- [x] T027 [US4] Triển khai phương thức `CancelAsync` trong `src/Acme.TooHungry.Application/Reservations/TableReservationAppService.cs` và endpoint `POST /api/app/table-reservations/{id}/cancel` trong `src/Acme.TooHungry.HttpApi/Controllers/TableReservationController.cs`
- [x] T028 [US4] Tích hợp nút `[Hủy đặt bàn]` trên thẻ bàn `RESERVED`, hiển thị dialog xác nhận hủy và gọi API trong `angular/src/app/waiter/tables/waiter-tables.component.ts` và `waiter-tables.component.html`

**Trạm kiểm tra (Checkpoint)**: Nhân viên có thể giải phóng bàn kịp thời khi khách báo hủy lịch hẹn.

---

## Phase 7: User Story 5 - Tự động Hủy Đặt bàn Quá hạn 1 Giờ (Priority: P3)

**Mục tiêu**: Background Worker trên máy chủ định kỳ quét mỗi 5 phút một lần, tự động phát hiện các đơn đặt bàn quá hạn 60 phút (`ReservationTime + 1h < Now`), cập nhật sang `AUTO_CANCELLED`, giải phóng bàn về `AVAILABLE` và phát tín hiệu Real-time qua SignalR.

**Kiểm thử Độc lập**: Giả lập đơn đặt bàn có giờ hẹn 65 phút trước trong Integration Test -> Chạy worker -> Đơn tự động chuyển `AutoCancelled`, bàn chuyển `Available`.

### Kiểm thử cho User Story 5 (TDD)
- [x] T029 [P] [US5] Viết Unit & Integration Tests cho `ReservationAutoCancelBackgroundWorker` (quét các đơn quá hạn 60 phút, chuyển `AutoCancelled`, giải phóng bàn về `Available`) trong `test/Acme.TooHungry.Application.Tests/Reservations/ReservationAutoCancelBackgroundWorker_Tests.cs`

### Triển khai User Story 5
- [x] T030 [US5] Cài đặt Background Worker `ReservationAutoCancelBackgroundWorker` kế thừa `AsyncPeriodicBackgroundWorkerBase` với chu kỳ 5 phút (`Timer.Period = 300000`) trong `src/Acme.TooHungry.Application/Reservations/ReservationAutoCancelBackgroundWorker.cs`
- [x] T031 [US5] Đăng ký `ReservationAutoCancelBackgroundWorker` vào ABP Background Worker Manager trong `src/Acme.TooHungry.Application/TooHungryApplicationModule.cs`
- [x] T032 [US5] Phát thông báo SignalR `TableStatusChanged` từ Background Worker để cập nhật tức thì sơ đồ bàn client qua `src/Acme.TooHungry.Application/Tables/TableRealtimeNotifier.cs`

**Trạm kiểm tra (Checkpoint)**: Toàn bộ 5 User Stories của RM-009 đều hoàn thành và hoạt động ăn khớp.

---

## Phase 8: Trau chuốt (Polish) & Các Vấn đề Xuyên suốt (Cross-Cutting Concerns)

**Mục đích**: Bản địa hóa ngôn ngữ, kiểm thử hồi quy và xác thực toàn diện kịch bản quickstart.

- [x] T033 [P] Cập nhật đầy đủ 100% bản dịch song ngữ Tiếng Việt cho các nhãn, modal, thông báo lỗi và nút thao tác đặt bàn trong `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json`
- [x] T034 [P] Cập nhật đầy đủ 100% bản dịch song ngữ Tiếng Anh tương ứng trong `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json`
- [x] T035 Chạy toàn bộ các kịch bản kiểm thử xác thực trong `specs/009-rm-009-table-reservation/quickstart.md`
- [x] T036 Chạy kiểm thử tự động toàn giải pháp (`dotnet test`) để đảm bảo không có lỗi hồi quy

---

## Phụ thuộc (Dependencies) & Thứ tự Thực thi

### Phụ thuộc giữa các Phase

- **Thiết lập (Phase 1) & Nền tảng (Phase 2)**: Khởi động đầu tiên, bắt buộc hoàn thành để cung cấp CSDL, DTOs và Domain Service cho mọi User Story.
- **User Story 1 (Phase 3 - MVP)**: Phụ thuộc vào Phase 2. Cung cấp chức năng cốt lõi Đặt bàn.
- **User Story 2 (Phase 4)**: Phụ thuộc vào Phase 3 (cần có bàn `RESERVED` từ US1 để thực hiện đón khách).
- **User Story 3 (Phase 5)**: Phụ thuộc vào Phase 3 (cần có bàn `RESERVED` từ US1 để xem/sửa thông tin).
- **User Story 4 (Phase 6)**: Phụ thuộc vào Phase 3 (cần có bàn `RESERVED` từ US1 để hủy bàn thủ công).
- **User Story 5 (Phase 7)**: Phụ thuộc vào Phase 2 & Phase 3 (quét tự động các đơn `RESERVED` quá hạn).
- **Trau chuốt (Phase 8)**: Thực hiện sau khi tất cả các User Stories hoàn tất.

### Cơ hội Thực thi Song song (Parallel Opportunities)

- Trong Phase 1 & Phase 2: Các tác vụ đánh dấu `[P]` (`T001`, `T002`, `T003`, `T004`, `T005`, `T006`, `T008`, `T009`, `T010`, `T011`) có thể triển khai song song.
- Trong từng User Story: Tác vụ kiểm thử TDD (`T012`, `T019`, `T022`, `T026`, `T029`) và UI Component (`T015`, `T024`) có thể viết song song với tầng backend services.
- Trong Phase 8: `T033` (vi.json) và `T034` (en.json) hoàn toàn độc lập, thực hiện song song.

---

## Chiến lược Triển khai (Implementation Strategy)

### MVP Trước tiên (User Story 1)

1. Hoàn thành Phase 1 & Phase 2 (Nền tảng CSDL và Domain Service).
2. Hoàn thành Phase 3 (User Story 1: Tạo Đặt bàn trên giao diện Waiter).
3. **Dừng và Xác minh**: Kiểm thử độc lập khả năng tạo đặt bàn và chuyển trạng thái `AVAILABLE` $\rightarrow$ `RESERVED`.

### Phân phối Tăng dần (Incremental Delivery)

1. **Giai đoạn 1**: Phase 1 + 2 + 3 $\rightarrow$ Đạt MVP (Đặt bàn thành công).
2. **Giai đoạn 2**: Thêm Phase 4 (Đón khách) + Phase 6 (Hủy bàn) $\rightarrow$ Khép kín vòng đời bàn ăn.
3. **Giai đoạn 3**: Thêm Phase 5 (Xem/Sửa booking) $\rightarrow$ Hoàn thiện tiện ích tương tác.
4. **Giai đoạn 4**: Thêm Phase 7 (Background Worker) $\rightarrow$ Tự động hóa vận hành 100%.
5. **Giai đoạn 5**: Phase 8 $\rightarrow$ Kiểm thử hồi quy, song ngữ và đóng gói sản phẩm.
