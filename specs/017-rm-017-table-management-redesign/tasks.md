# Danh sách Công việc Triển khai (Tasks): RM-017 Làm lại trang Quản lý bàn (Table Management Redesign)

**Tính năng**: `RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign)`  
**Nhánh (Branch)**: `017-rm-017-table-management-redesign` | **Ngày**: 2026-10-16  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md)

---

## Phase 1: Nền tảng DTOs & Hợp đồng Backend (Setup & Contracts)

**Mục tiêu**: Bổ sung các DTOs cho Chuyển bàn, Gộp bàn, mở rộng giao diện `ITableAppService` và cập nhật Angular Proxies.

- [x] T001 [P] Khởi tạo các DTOs `TransferTableInputDto` (`SourceTableId`, `TargetTableId`, `Note`) và `MergeTablesInputDto` (`PrimaryTableId`, `SecondaryTableId`, `Note`) trong `src/Acme.TooHungry.Application.Contracts/Tables/TableDtos.cs`
- [x] T002 [P] Khai báo các phương thức `Task<TableDto> TransferTableAsync(TransferTableInputDto input)` và `Task<TableDto> MergeTablesAsync(MergeTablesInputDto input)` vào `src/Acme.TooHungry.Application.Contracts/Tables/ITableAppService.cs`
- [x] T003 [P] Cập nhật Angular Proxies trong `angular/src/app/proxy/tables/`:
  - Thêm interface `TransferTableInputDto` và `MergeTablesInputDto` trong `models.ts`
  - Bổ sung phương thức `transferTable(input: TransferTableInputDto)` và `mergeTables(input: MergeTablesInputDto)` vào `table.service.ts`

**Trạm kiểm tra (Checkpoint)**: Toàn bộ hợp đồng dữ liệu backend và proxy client cho Chuyển bàn & Gộp bàn đã sẵn sàng biên dịch thành công.

---

## Phase 2: Triển khai Giao dịch Nguyên tử Backend (Chuyển Bàn & Gộp Bàn) (Priority: P1) 🎯 Core Backend

**Mục tiêu**: Xây dựng nghiệp vụ Chuyển bàn và Gộp bàn an toàn, bảo toàn đơn hàng, phân nhánh trạng thái bàn nguồn thông minh và phát sóng SignalR tức thì.  
**Kiểm thử Độc lập**: Gọi API `TransferTableAsync` $\rightarrow$ Order và `OccupiedTime` chuyển sang bàn đích, bàn nguồn về `CLEANING` (hoặc `AVAILABLE`), SignalR broadcast; gọi API `MergeTablesAsync` $\rightarrow$ các món bàn phụ ghép vào bàn chính, đóng order phụ, giải phóng bàn phụ.

- [x] T004 [US3] Triển khai phương thức `TransferTableAsync` trong `src/Acme.TooHungry.Application/Tables/TableAppService.cs`:
  - Kiểm tra hợp lệ: Bàn nguồn `Status == TableStatus.Occupied`, Bàn đích `Status == TableStatus.Available` (và không bị `Disabled`)
  - Tìm đơn hàng đang hoạt động của Bàn nguồn: Cập nhật `Order.TableId = targetTableId`
  - Cập nhật Bàn đích: `targetTable.Status = TableStatus.Occupied`, `targetTable.OccupiedTime = sourceTable.OccupiedTime ?? DateTime.Now`
  - Phân nhánh Bàn nguồn: Nếu có đơn hàng/dùng món $\rightarrow$ `sourceTable.Status = TableStatus.Cleaning`; nếu chưa có đơn hàng $\rightarrow$ `sourceTable.Status = TableStatus.Available`; gán `sourceTable.OccupiedTime = null`
  - Lưu cơ sở dữ liệu và gọi `_realtimeNotifier.NotifyTableStatusChangedAsync` cho cả 2 bàn
  - Trả về `TableDto` của bàn đích
- [x] T005 [US4] Triển khai phương thức `MergeTablesAsync` trong `src/Acme.TooHungry.Application/Tables/TableAppService.cs`:
  - Kiểm tra hợp lệ: Cả 2 bàn đều đang ở trạng thái `TableStatus.Occupied`
  - Nạp đơn hàng mở của Bàn chính (`orderA`) và Bàn phụ (`orderB`)
  - Nếu Bàn phụ có đơn hàng: Ghép toàn bộ `OrderItem` từ `orderB` sang `orderA`, tính lại `orderA.TotalAmount = sum(Quantity * UnitPrice)`, đóng `orderB` (chuyển sang `Cancelled` kèm ghi chú đã gộp vào bàn chính)
  - Giải phóng Bàn phụ: `secondaryTable.Status = TableStatus.Cleaning`, `secondaryTable.OccupiedTime = null`
  - Lưu cơ sở dữ liệu và phát sự kiện SignalR cập nhật trạng thái Bàn phụ và Order của Bàn chính
  - Trả về `TableDto` của bàn chính

**Trạm kiểm tra (Checkpoint)**: Hai API cốt lõi `TransferTableAsync` và `MergeTablesAsync` hoạt động ổn định, bảo toàn tính toàn vẹn dữ liệu trong Unit of Work.

---

## Phase 3: Xây dựng Bộ Sub-component Modal Dùng Chung Độc lập (Shared Modals) (Priority: P1) 🎯 Core Modals

**Mục tiêu**: Bóc tách các hộp thoại tương tác ngữ cảnh thành các Sub-component độc lập đặt tại `angular/src/app/shared/components/tables/` để tái sử dụng hoàn toàn giữa Waiter và Admin.  
**Kiểm thử Độc lập**: Từng component modal có thể mở/đóng độc lập, nhận input table, phát emit output events, và validation dữ liệu chính xác.

- [x] T006 [US3] Xây dựng component `TableTransferModalComponent` trong `angular/src/app/shared/components/tables/table-transfer-modal/`:
  - Nhận input `[sourceTable]` và two-way binding `[(visible)]`
  - Hiển thị thông tin bàn nguồn (Tên bàn, Khu vực, Sức chứa, Thời gian đã ngồi)
  - Lưới danh sách các bàn trống (`AVAILABLE`) có lọc theo Khu vực và tìm kiếm nhanh
  - Cảnh báo trực quan nếu sức chứa bàn đích nhỏ hơn số khách hiện tại
  - Nút `[Xác nhận chuyển bàn]` gọi `tableService.transferTable`, hiển thị toast thành công và emit `(transferred)`
- [x] T007 [US4] Xây dựng component `TableMergeModalComponent` trong `angular/src/app/shared/components/tables/table-merge-modal/`:
  - Nhận input `[primaryTable]` và two-way binding `[(visible)]`
  - Hiển thị danh sách các bàn `OCCUPIED` khác đang có đơn hàng mở để chọn gộp
  - Hiển thị thông báo xác nhận: Gộp món ăn sang bàn chính và chỉ thanh toán 1 hóa đơn duy nhất
  - Nút `[Xác nhận gộp bàn]` gọi `tableService.mergeTables`, hiển thị toast thành công và emit `(merged)`
- [x] T008 [US2] Chuẩn hóa component `TableEndMealModalComponent` trong `angular/src/app/shared/components/tables/table-end-meal-modal/`:
  - Card Timeline 3 mốc: `Giờ nhận bàn (Seated At) → Thời lượng phục vụ (Elapsed) → Giờ kết thúc (Ended At)`
  - Phân nhánh thông minh:
    + Bàn không có Order: Khối cảnh báo vàng, nút `[Xác nhận trả bàn trống]` chuyển bàn về `AVAILABLE`
    + Bàn có Order: Khối thông báo xanh/cam, nút `[Chuyển sang Thanh toán →]` điều hướng thẳng sang `/payment/:orderId` (RM-016)

**Trạm kiểm tra (Checkpoint)**: Cụm 3 modal dùng chung độc lập hoàn tất, có template và logic riêng biệt, không còn phụ thuộc vào component cha.

---

## Phase 4: Nâng cấp Phân hệ Vận hành Waiter (`/waiter/tables`) (Priority: P1) 🎯 Waiter UX

**Mục tiêu**: Cải tiến thẻ bàn phục vụ, tích hợp hệ thống cảnh báo thời gian dùng bữa 2 tầng (60p & 90p), nhúng các nút Chuyển bàn/Gộp bàn 1 chạm.  
**Kiểm thử Độc lập**: Đón khách $\rightarrow$ đếm giờ chạy; $\ge 60$p hiện badge vàng; $\ge 90$p hiện badge đỏ cam nhấp nháy; bấm `[Chuyển bàn]` hoặc `[Gộp bàn]` mở modal tương ứng; bấm `[Kết thúc bữa ăn]` mở timeline 3 mốc.

- [x] T009 [US1] Triển khai hệ thống cảnh báo thời lượng dùng bữa 2 tầng trong `angular/src/app/waiter/tables/waiter-tables.component.ts`:
  - Cập nhật hàm `getMealDurationMinutes` và `getMealDurationBadgeClass`:
    + $< 60$ phút: `badge-meal-normal` (nền kem xám)
    + $60 \le \text{mins} < 90$: `badge-meal-warning` (nền vàng `#FEF3C7`, chữ `#D97706`, icon `fa-clock`)
    + $\ge 90$ phút: `badge-meal-long` (nền đỏ nhạt `#FEE2E2`, chữ `#DC2626`, icon `fa-hourglass-half` có hiệu ứng nhấp nháy nhẹ)
  - Duy trì Signal Timer 30s cập nhật reactive signal `currentTime`
- [x] T010 [US1, US3, US4] Tích hợp các nút hành động và nhúng Shared Modals vào `waiter-tables.component.html`:
  - Trên thẻ bàn `OCCUPIED`: Bổ sung nút `[Chuyển bàn]` và `[Gộp bàn]` vào menu thao tác nhanh
  - Nhúng `<app-table-transfer-modal>`, `<app-table-merge-modal>` và `<app-table-end-meal-modal>`
  - Kết nối các event handlers `onTableTransferred`, `onTableMerged`, `onMealEnded`
- [x] T011 [US1] Hoàn thiện giao diện nhận diện Cam & Trắng và chuẩn touch target trong `waiter-tables.component.scss`:
  - Đảm bảo toàn bộ các nút bấm có kích thước tối thiểu $\ge 44 \times 44\text{px}$
  - Bo góc `rounded-2xl`, shadow đa tầng sắc nét, màu chủ đạo `#EA580C`
  - Thêm hiệu ứng pulse nhẹ cho `badge-meal-long`

**Trạm kiểm tra (Checkpoint)**: Màn hình `/waiter/tables` đạt chuẩn thẩm mỹ cao cấp, đếm giờ 2 tầng nhạy bén, chuyển bàn và gộp bàn hoạt động mượt mà.

---

## Phase 5: Tái Cấu Trúc & Nâng Cấp Toàn Diện Màn Hình Quản Trị Admin (`/tables`) (Priority: P1) 🎯 Admin Redesign

**Mục tiêu**: Phá vỡ tệp nguyên khối `table.component` (2263 dòng HTML), bóc tách modal thêm/sửa, nhúng shared modals, tinh gọn giao diện và tối ưu hóa chuyển đổi giữa Floor Plan Grid và Datatable List View.  
**Kiểm thử Độc lập**: Màn hình `/tables` chuyển đổi giữa Grid và List View < 100ms; 6 thẻ thống kê mặt bằng lọc chính xác; Thêm/Sửa bàn, Chuyển bàn, Gộp bàn hoạt động trơn tru; file HTML < 500 dòng, file TS < 600 dòng.

- [x] T012 [US5] Xây dựng các Sub-modal Quản trị tại `angular/src/app/table/components/`:
  - Tạo `TableFormModalComponent`: Form thêm mới và chỉnh sửa bàn ăn (Tên bàn, Sức chứa, Khu vực, Vị trí)
  - Tạo `DiningAreaFormModalComponent`: Form thêm mới và chỉnh sửa khu vực ăn uống
- [x] T013 [US5] Tái cấu trúc `angular/src/app/table/table.component.html`:
  - Loại bỏ hoàn toàn Order Modal inline bị nhân bản (chuyển hướng sang `/waiter/order/:tableId`)
  - Thay thế các khối modal inline bằng các component chuyên biệt: `<app-table-form-modal>`, `<app-dining-area-form-modal>`, `<app-table-transfer-modal>`, `<app-table-merge-modal>`, `<app-table-end-meal-modal>`
  - Giữ lại cấu trúc tinh gọn: Header, 6 Thẻ chỉ số mặt bằng, Floor Plan Grid View, và Datatable List View
  - Rút gọn kích thước file từ 2263 dòng xuống dưới 500 dòng
- [x] T014 [US5] Tái cấu trúc `angular/src/app/table/table.component.ts`:
  - Loại bỏ hàng trăm dòng code quản lý món ăn và form gọi món của Order Modal cũ
  - Nhập và tích hợp các Sub-components mới vào imports array của Standalone Component
  - Tích hợp Timer 30s với 2 tầng cảnh báo thời lượng dùng bữa trên thẻ bàn sơ đồ mặt bằng
  - Rút gọn kích thước file từ 1914 dòng xuống dưới 600 dòng
- [x] T015 [US5] Hoàn thiện CSS chuẩn thương hiệu Cam & Trắng trong `table.component.scss`:
  - Đồng bộ màu sắc 6 thẻ chỉ số mặt bằng (Tổng số, Trống, Có khách, Đã đặt, Đang dọn, Tạm ngưng)
  - Thanh tab khu vực bo tròn thanh lịch có badge đếm số lượng bàn
  - Tối ưu hiệu ứng chuyển đổi mượt mà giữa Grid View và List View

**Trạm kiểm tra (Checkpoint)**: Màn hình `/tables` được tái cấu trúc thành công, mã nguồn tinh gọn, tải siêu nhanh và vận hành ổn định.

---

## Phase 6: Đồng Bộ Thời Gian Thực SignalR & Quốc Tế Hóa Song Ngữ (Priority: P1) 🎯 Polish & Verification

**Mục tiêu**: Đảm bảo sự kiện Realtime SignalR đồng bộ tức thì giữa tất cả các màn hình, cập nhật 100% từ điển đa ngôn ngữ trong `vi.json` và `en.json`, kiểm thử toàn diện không có lỗi biên dịch.

- [x] T016 [US6] Tinh chỉnh xử lý SignalR trong `TableSignalrService` và các component:
  - Lắng nghe sự kiện `tableStatusChanged`, cập nhật trực tiếp `OccupiedTime` vào Angular Signals store
  - Đảm bảo khi một nhân viên chuyển bàn hoặc gộp bàn ở thiết bị này, màn hình của nhân viên khác cập nhật tức thì dưới 1 giây
- [x] T017 [P] Bổ sung và đồng bộ đầy đủ các khóa từ điển đa ngôn ngữ trong `angular/src/assets/i18n/vi.json` và `en.json`:
  - Các khóa: `::TransferTable`, `::MergeTables`, `::MealDurationCare`, `::MealDurationOverstay`, `::CapacityWarning`, các nhãn Timeline, v.v.
- [x] T018 [P] Kiểm tra biên dịch hệ thống:
  - Chạy `dotnet build` trên Backend đảm bảo 0 lỗi
  - Kiểm tra Angular dev server / build đảm bảo 0 lỗi TypeScript và CSS
- [x] T019 [P] Thực hiện xác thực 5 kịch bản kiểm thử theo [quickstart.md](quickstart.md) và cập nhật tiến độ vào [roadmap.md](../../docs/roadmap.md)

**Trạm kiểm tra (Checkpoint)**: Toàn bộ tính năng RM-017 hoàn tất 100%, đáp ứng toàn diện tiêu chí thành công (SC-001 đến SC-008).
