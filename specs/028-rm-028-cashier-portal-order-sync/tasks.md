# Danh sách Công việc Triển khai (Tasks): RM-028 Phân hệ Thu ngân & Đồng bộ Thời gian thực (Cashier Portal: Table & Order Management with Real-time Sync)

**Tính năng**: `RM-028 — Phân hệ Thu ngân & Đồng bộ Thời gian thực (Cashier Portal: Table & Order Management with Real-time Sync)`  
**Nhánh (Branch)**: `028-rm-028-cashier-portal-order-sync` | **Ngày**: 2026-10-26  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md) | **Hợp đồng (Contracts)**: [contracts/api-contracts.md](contracts/api-contracts.md) & [contracts/signalr-contract.md](contracts/signalr-contract.md)

---

## Phase 1: Nền tảng Backend, Phân quyền & Mở rộng SignalR Notifier

**Mục tiêu**: Xây dựng cây quyền hạt nhân ABP cho Cashier, mở rộng các sự kiện SignalR thời gian thực trên Backend và tạo các endpoint phục vụ quầy Thu ngân.

- [x] **T001 [Backend]**: Khai báo quyền `TooHungryPermissions.Cashier` trong `TooHungryPermissions.cs` và định nghĩa trong `TooHungryPermissionDefinitionProvider.cs`:
  - `TooHungry.Cashier`
  - `TooHungry.Cashier.ManageTables`
  - `TooHungry.Cashier.ManageOrders`
  - `TooHungry.Cashier.ProcessPayment`
- [x] **T002 [Backend]**: Định nghĩa các DTO sự kiện thời gian thực trong `Acme.TooHungry.Application.Contracts/Tables/` hoặc `Cashier/`:
  - `OrderPlacedOrUpdatedDto`
  - `BillRequestedDto`
  - `PaymentCompletedDto`
- [x] **T003 [Backend]**: Mở rộng interface `ITableRealtimeNotifier` và triển khai trong `TableRealtimeNotifier.cs`:
  - `NotifyOrderPlacedOrUpdatedAsync(...)`
  - `NotifyBillRequestedAsync(...)`
  - `NotifyPaymentCompletedAsync(...)`
- [x] **T004 [Backend]**: Tích hợp gọi `ITableRealtimeNotifier` trong `TableOrderAppService`:
  - Phát `OrderPlacedOrUpdated` khi Waiter tạo đơn mới hoặc gọi thêm món
  - Phát `BillRequested` khi Waiter bấm yêu cầu thanh toán
  - Phát `PaymentCompleted` và `TableStatusChanged` khi hoàn tất thanh toán
- [x] **T005 [Backend]**: Xây dựng `CashierAppService` cung cấp endpoint tổng quan ca trực `GetShiftSummaryAsync` (`/api/app/cashier/shift-summary`).
- [x] **T006 [Backend]**: Viết Integration Tests xUnit kiểm thử `TableRealtimeNotifier` và endpoint thanh toán của Cashier.

---

## Phase 2: Tuyến đường, Gác cổng & Khung Bố cục Shell Frontend

**Mục tiêu**: Xây dựng tuyến đường cơ sở `/cashier`, bộ gác cổng `cashierAuthGuard`, layout 3 vùng chuyên biệt và dịch vụ điều hướng.

- [x] **T007 [Frontend]**: Khởi tạo tệp mô hình dữ liệu `angular/src/app/cashier/models/cashier.models.ts`.
- [x] **T008 [Frontend]**: Xây dựng bộ gác cổng `cashierAuthGuard` trong `angular/src/app/cashier/guards/cashier-auth.guard.ts`.
- [x] **T009 [Frontend]**: Đăng ký tuyến đường `/cashier` với 2 route con (`tables`, `orders`) trong `angular/src/app/app.routes.ts`.
- [x] **T010 [Frontend]**: Cập nhật `UserRoleNavigationService` để tự động điều hướng vai trò `Cashier` về `/cashier/tables`.
- [x] **T011 [Frontend]**: Xây dựng `CashierLayoutComponent` (Topbar ca trực hiển thị doanh thu ca và số bàn phục vụ, Sidebar ngữ cảnh, Main Content Bento Card).
- [x] **T012 [Frontend]**: Viết Unit Tests Vitest cho `cashierAuthGuard` và `CashierLayoutComponent`.

---

## Phase 3: Quản lý Sơ đồ Bàn ăn Thu ngân (`/cashier/tables`)

**Mục tiêu**: Xây dựng sơ đồ bàn Bento Grid tương đồng Waiter nhưng tối ưu hóa cho quầy thu ngân.

- [x] **T013 [Frontend]**: Xây dựng `CashierTablesComponent` hiển thị sơ đồ lưới Bento bàn ăn phân nhóm theo từng Khu vực.
- [x] **T014 [Frontend]**: Triển khai bộ lọc trạng thái bàn nhanh: Tất cả, Trống, Có khách, Đã đặt, Chờ dọn, Khóa bảo trì.
- [x] **T015 [Frontend]**: Thiết kế thẻ bàn Bento Card chuyên biệt cho Cashier: Hiển thị số bàn, số ghế, thời gian khách ngồi, trạng thái đơn hiện tại, tổng tiền tạm tính hiện thời.
- [x] **T016 [Frontend]**: Tích hợp các thao tác nhanh trên thẻ bàn: Mở xem danh sách món đang gọi, đón khách vào bàn tại quầy, chuyển bàn hoặc gộp bàn khi khách yêu cầu.
- [x] **T017 [Frontend]**: Triển khai hiệu ứng nhấp nháy viền cam đỏ cảnh báo nổi bật trên thẻ bàn khi có sự kiện `BillRequested`.
- [x] **T017B [Frontend]**: Trang bị nút Reload Sơ đồ Bàn tại chỗ (`[fa-rotate] Tải lại`) trên thanh công cụ của cả hai phân hệ Waiter (`/waiter/tables`) và Cashier (`/cashier/tables`): Tải lại tức thì danh sách và trạng thái bàn từ máy chủ mà không làm mới (F5) trang web, giữ nguyên bộ lọc khu vực và từ khóa tìm kiếm.

---

## Phase 4: Quản lý Đơn hàng Toàn trình & Thanh toán Đa kênh (`/cashier/orders`)

**Mục tiêu**: Bảng quản lý đơn hàng 4 tab và modal thanh toán đa phương thức Tiền mặt / VietQR.

- [x] **T018 [Frontend]**: Xây dựng `CashierOrdersComponent` với 4 cột/tab Bento: Mới nhận (`Pending`), Đang xử lý (`Processing`), Yêu cầu thanh toán (`Bill Requested`), Đã hoàn tất (`Completed`).
- [x] **T018B [Frontend]**: Trang bị nút Reload Danh sách Đơn hàng tại chỗ (`[fa-rotate] Tải lại`) cho cả hai bên Waiter và Cashier: Cập nhật tức thì các đơn hàng mới mà không làm mới trang web.
- [x] **T019 [Frontend]**: Xây dựng `CashierOrderDetailModalComponent` xem danh sách món chi tiết, cập nhật số lượng, thêm ghi chú chế biến và hủy món có lý do.
- [x] **T020 [Frontend]**: Xây dựng `CashierPaymentModalComponent` kế thừa RM-016: Hóa đơn tạm tính Pre-bill, chọn phương thức Tiền mặt (tự tính tiền thừa) hoặc VietQR động.
- [x] **T021 [Frontend]**: Thực hiện thanh toán: Gọi API trừ kho FEFO an toàn, đóng đơn `COMPLETED`, cập nhật doanh thu ca, in hóa đơn và chuyển bàn sang `CLEANING`.

---

## Phase 5: Hệ thống Đồng bộ Hai chiều Thời gian thực & Âm thanh Chuông báo

**Mục tiêu**: Kết nối thời gian thực SignalR hai chiều giữa Waiter và Cashier.

- [x] **T022 [Frontend]**: Xây dựng `AudioNotificationService` phát âm thanh chuông báo (Chime) khi có đơn mới và chuông cảnh báo khi có yêu cầu thanh toán.
- [x] **T023 [Frontend]**: Xây dựng `CashierSyncService` lắng nghe các sự kiện SignalR từ `TableSignalrService` và cập nhật phản ứng vào State của Cashier.
- [x] **T024 [Frontend]**: Cập nhật phía Waiter (`WaiterTablesComponent`): Lắng nghe sự kiện `PaymentCompleted` để đổi bàn sang `CLEANING` và hiển thị thông báo Toast dọn bàn tức thời.
- [x] **T025 [Frontend]**: Khi Waiter bấm "Đã dọn xong": Bàn chuyển sang `AVAILABLE` và đồng bộ tức thời trên cả hai màn hình Waiter và Cashier.

---

## Phase 6: Đa ngôn ngữ, Tương thích Cảm ứng, Kiểm thử Tự động & Nghiệm thu

**Mục tiêu**: Đảm bảo 100% i18n, chuẩn kích thước cảm ứng và toàn bộ test suites vượt qua.

- [x] **T026 [I18n]**: Cấu hình 100% từ điển đa ngôn ngữ song ngữ trong cả 4 tệp `vi.json` và `en.json` (Angular assets & Domain.Shared).
- [x] **T027 [UX/UI]**: Tối ưu hóa kích thước cảm ứng touch target >= 44×44px cho màn hình Touch POS.
- [x] **T028 [Testing]**: Viết Unit Tests Vitest cho `CashierSyncService`, `CashierTablesComponent`, `CashierOrdersComponent`.
- [x] **T029 [Verification]**: Chạy kiểm tra strict compilation `npm run build` và kiểm thử hồi quy toàn bộ hệ thống.
