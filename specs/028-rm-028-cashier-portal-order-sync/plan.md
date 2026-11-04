# Kế hoạch Triển khai (Implementation Plan): RM-028 Phân hệ Thu ngân & Đồng bộ Thời gian thực (Cashier Portal: Table & Order Management with Real-time Sync)

**Nhánh (Branch)**: `028-rm-028-cashier-portal-order-sync` | **Ngày**: 2026-10-26 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/028-rm-028-cashier-portal-order-sync/spec.md` với 6 quyết định kiến trúc & vận hành then chốt:
1. **Cấu trúc Định tuyến & Bố cục Độc lập (`/cashier`)**: Xây dựng phân hệ riêng biệt với bộ Layout Shell 3 phân vùng, gồm 2 không gian tác nghiệp chính: `/cashier/tables` (Sơ đồ bàn ăn) và `/cashier/orders` (Quản lý đơn hàng toàn trình).
2. **Kế thừa & Chuyên biệt hóa Sơ đồ Bàn ăn**: Kế thừa 100% ngôn ngữ thiết kế Bento Card và máy trạng thái bàn từ Waiter (`RM-008`, `RM-015`, `RM-017`), bổ sung hiển thị tổng tiền tạm tính, nút in Pre-bill và nút thanh toán nhanh tại quầy.
3. **Quản lý Đơn hàng Toàn trình & Thanh toán Đa kênh**: 4 trạng thái đơn hàng (Mới nhận, Đang chế biến, Yêu cầu thanh toán, Đã hoàn tất), xuất hóa đơn tạm tính Pre-bill, thanh toán Tiền mặt (tự tính tiền thối) hoặc VietQR động, tự động trừ kho nguyên liệu FEFO an toàn (`RM-022`).
4. **Hệ thống Đồng bộ Hai chiều Thời gian thực qua SignalR Hub**: Mở rộng `TableHub` và `TableRealtimeNotifier` để phát và lắng nghe các sự kiện nhận bàn, gọi món, yêu cầu hóa đơn và thanh toán hoàn tất với độ trễ < 200ms.
5. **Gác cổng Phân quyền & Tự động Phục hồi Điều hướng**: Bảo vệ phân hệ bằng `cashierAuthGuard` và cập nhật `UserRoleNavigationService` để tự động đưa tài khoản `Cashier` về `/cashier/tables` sau đăng nhập hoặc khi gặp lỗi 404/403/500 (auto-recovery RM-019).
6. **Bền vững Mạng, Idempotency & 100% Quốc tế hóa (i18n)**: Cơ chế auto-reconnect của SignalR, kiểm soát chống thanh toán trùng lặp, hỗ trợ song ngữ toàn diện trong `vi.json` và `en.json`.

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Phân hệ Thu ngân & Đồng bộ Thời gian thực (Cashier Portal: Table & Order Management with Real-time Sync) (RM-028)** thuộc Wave 6. Tính năng này mang lại không gian làm việc chuyên biệt độc lập ("Khoang lái thu ngân" - Cashier Cockpit) dành riêng cho nhân viên Thu ngân (`Cashier`), đóng vai trò trạm điều phối trung tâm tại quầy thanh toán, kết nối mật thiết và đồng bộ tức thời với nhân viên Phục vụ bàn (`Waiter`), giúp tối ưu hóa tốc độ phục vụ và xoay vòng bàn của nhà hàng.

### Các mục tiêu kiến trúc cốt lõi:
1. **Khung Bố cục Shell Chuyên biệt (`CashierLayoutComponent`)**:
   - Layout độc lập cấp ứng dụng (`eLayoutType.empty`), loại bỏ hoàn toàn các thanh menu quản trị cồng kềnh.
   - Bố cục 3 phân vùng chuẩn mực: Topbar ca trực cố định 64px, Sidebar điều hướng ngữ cảnh 260px, Main Content Bento Card cuộn độc lập tối ưu cho màn hình cảm ứng Touch POS / Tablet / Desktop.
2. **Gác cổng An ninh & Điều hướng theo Vai trò (`cashierAuthGuard`)**:
   - Bảo vệ an toàn cụm route `/cashier/*`; chỉ cho phép `Cashier`, `Manager` hoặc `Administrator` sở hữu quyền `TooHungry.Cashier` truy cập.
   - Tự động nhận diện vai trò `Cashier` sau khi đăng nhập để đưa thẳng vào `/cashier/tables`.
3. **Quản lý Sơ đồ Bàn ăn Thu ngân (`CashierTablesComponent`)**:
   - Sơ đồ lưới Bento bàn ăn phân nhóm theo từng Khu vực (Khu A, Khu B, VIP, Tầng 1, Tầng 2...).
   - Bộ lọc trạng thái bàn nhanh: Tất cả, Trống (`AVAILABLE`), Có khách (`OCCUPIED`), Đặt trước (`RESERVED`), Chờ dọn (`CLEANING`), Khóa bảo trì (`INACTIVE`).
   - Thẻ bàn Bento hiển thị số bàn, số ghế, thời gian khách ngồi, trạng thái đơn hiện tại, tổng tiền tạm tính, và hiệu ứng nhấp nháy viền cam đỏ khi có yêu cầu tính tiền.
4. **Quản lý Đơn hàng Tập trung (`CashierOrdersComponent`)**:
   - 4 tab trạng thái đơn: Mới nhận (`PENDING`), Đang xử lý (`PROCESSING`), Yêu cầu thanh toán (`BILL_REQUESTED`), Đã hoàn tất (`COMPLETED`).
   - Xem chi tiết danh sách món, đơn giá, số lượng, thành tiền, ghi chú chế biến, hỗ trợ điều chỉnh/hủy món có lý do.
   - Xuất hóa đơn tạm tính (Pre-bill) và modal thanh toán đa kênh (Tiền mặt - VietQR).
5. **Hệ thống Đồng bộ Hai chiều Thời gian thực (`CashierSyncService` & `TableRealtimeNotifier`)**:
   - Mở rộng Backend `TableHub` & `TableRealtimeNotifier` phát các sự kiện: `TableStatusChanged`, `OrderPlacedOrUpdated`, `BillRequested`, `PaymentCompleted`.
   - Phía Frontend Cashier: Lắng nghe SignalR cập nhật màu thẻ bàn tức thì, phát âm thanh chuông báo & pop-up khi Waiter gọi món mới, nhấp nháy viền đỏ thẻ bàn khi Waiter bấm "Yêu cầu thanh toán".
   - Phía Frontend Waiter: Lắng nghe sự kiện `PaymentCompleted` cập nhật bàn sang `CLEANING` và hiển thị thông báo dọn bàn tức thời.
6. **Phân quyền, Idempotency & 100% Quốc tế hóa Song ngữ (i18n)**:
   - Cây quyền hạt nhân ABP: `TooHungry.Cashier.*`.
   - Toàn bộ từ điển giao diện, thông báo, nhãn nút có đầy đủ trong `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Backend**: C# 12, .NET 9.0, ABP Framework 9.x, Entity Framework Core, ASP.NET Core SignalR
- **Frontend**: TypeScript 5.x, Angular 19+, Standalone Components, Signal Reactive State (`signal`, `computed`, `effect`), RxJS Observables, HTML5 Web Audio API
- **Thư viện tích hợp**: `@abp/ng.core`, `@microsoft/signalr`, FontAwesome Free icons
- **Nền tảng đích**: Màn hình cảm ứng quầy POS (Touch POS 15" - 21"), Máy tính bảng Tablet (iPad/Android 10" - 12"), Máy tính Desktop
- **Ràng buộc Hiệu năng**:
  - Độ trễ phát tín hiệu SignalR giữa Waiter và Cashier < **200ms**
  - Thời gian phản hồi thao tác trên thẻ bàn và form thanh toán < **100ms**
  - Kích thước vùng bấm cảm ứng tối thiểu đạt chuẩn **44 × 44px**
- **Ràng buộc Thương hiệu & Giao diện**:
  - Nhận diện Cam & Trắng (`#EA580C`, nền Warm French Beige `#F6F1E8`, bề mặt thẻ `#FFFFFF`, viền `#EDE4D6`)
  - 100% chuỗi hiển thị được nạp qua `abpLocalization` pipe hoặc `LocalizationService`

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - Kế thừa trọn vẹn Domain Models và Application Services sẵn có (`RestaurantTable`, `Order`, `OrderItem`, `TableOrderAppService`). Mở rộng chuyên biệt không phá vỡ tính đóng gói của Aggregate Root.
- [x] **II. UML & Domain Model Alignment**:
  - Khớp với mô hình kiến trúc phân quyền, chu kỳ trạng thái bàn và luồng vận hành trong `RMS-TH.vpp` và `docs/roadmap.md`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Đảm bảo kiểm thử tự động toàn diện: Unit test `cashierAuthGuard`, `CashierSyncService`, các component phía Angular; Integration test xUnit cho SignalR Notifier và endpoint thanh toán.
- [x] **IV. Hợp đồng API & SignalR**:
  - Xác định rõ ràng hợp đồng API và SignalR listeners/senders tại `contracts/api-contracts.md` và `contracts/signalr-contract.md`.
- [x] **V. Bảo mật & Phân quyền**:
  - Phân hệ được bảo vệ nghiêm ngặt bằng `cashierAuthGuard`; SignalR Hub bắt buộc xác thực bằng Access Token JWT (tuân thủ RM-023).
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Thiết kế Bento Grid, thẻ Card bo góc mềm mại, typography sắc nét `Plus Jakarta Sans`, màu cam chủ đạo `#EA580C`.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% tiêu đề, mô tả, nhãn nút, thông báo thời gian thực có đầy đủ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ kỹ thuật (spec, plan, research, data-model, contracts, checklists) được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (specs/)
```text
specs/028-rm-028-cashier-portal-order-sync/
├── spec.md                            # Đặc tả nghiệp vụ và các quyết định kiến trúc
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật SignalR sync, Touch POS ergonomics, Idempotency
├── data-model.md                      # Thiết kế State Signals, DTOs sự kiện và máy trạng thái
├── contracts/
│   ├── api-contracts.md               # Hợp đồng RESTful API cho Cashier
│   └── signalr-contract.md            # Hợp đồng SignalR Hub methods và event listeners
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng nghiệm thu
```

### Mã nguồn Cần Triển khai & Cập nhật

#### 1. Backend (.NET 9 / C#)
```text
src/
├── Acme.TooHungry.Domain.Shared/
│   ├── Permissions/
│   │   ├── TooHungryPermissions.cs                   # Bổ sung TooHungryPermissions.Cashier.*
│   │   └── TooHungryPermissionDefinitionProvider.cs  # Khai báo cây quyền Cashier
│   └── Localization/TooHungry/
│       ├── vi.json                                   # Khóa bản dịch Tiếng Việt
│       └── en.json                                   # Khóa bản dịch Tiếng Anh
├── Acme.TooHungry.Application.Contracts/
│   ├── Cashier/
│   │   ├── ICashierAppService.cs                     # Interface dịch vụ quầy Thu ngân
│   │   └── CashierDtos.cs                            # CashierShiftSummaryDto, CashierTableDto, v.v.
│   └── Tables/
│       └── ITableRealtimeNotifier.cs                 # Mở rộng phương thức phát sự kiện SignalR
├── Acme.TooHungry.Application/
│   ├── Cashier/
│   │   └── CashierAppService.cs                      # Triển khai API ca trực, bàn và đơn cho Cashier
│   └── Orders/
│       └── TableOrderAppService.cs                   # Tích hợp phát SignalR khi request bill & complete pay
└── Acme.TooHungry.HttpApi.Host/
    └── Hubs/
        └── TableRealtimeNotifier.cs                  # Triển khai broadcast OrderPlacedOrUpdated, BillRequested, PaymentCompleted
```

#### 2. Frontend (Angular 19 / Standalone)
```text
angular/src/
├── app/
│   ├── cashier/
│   │   ├── guards/
│   │   │   └── cashier-auth.guard.ts                 # Gác cổng bảo vệ phân hệ Thu ngân
│   │   ├── layout/
│   │   │   ├── cashier-layout.component.ts           # Khung Layout 3 phân vùng (Topbar ca trực, Sidebar, Main)
│   │   │   ├── cashier-layout.component.html
│   │   │   └── cashier-layout.component.scss
│   │   ├── services/
│   │   │   ├── cashier-sync.service.ts               # Dịch vụ đồng bộ SignalR 2 chiều Waiter ↔ Cashier
│   │   │   ├── cashier-state.service.ts              # Quản lý State sơ đồ bàn & đơn hàng (Angular Signals)
│   │   │   └── audio-notification.service.ts         # Phát âm thanh chuông báo đơn mới & yêu cầu bill
│   │   ├── models/
│   │   │   └── cashier.models.ts                     # Interfaces, Enums và DTOs phía Client
│   │   ├── tables/
│   │   │   ├── cashier-tables.component.ts           # Màn hình Sơ đồ bàn ăn quầy Thu ngân
│   │   │   ├── cashier-tables.component.html
│   │   │   └── cashier-tables.component.scss
│   │   ├── orders/
│   │   │   ├── cashier-orders.component.ts           # Màn hình Quản lý đơn hàng toàn trình 4 tab
│   │   │   ├── cashier-orders.component.html
│   │   │   └── cashier-orders.component.scss
│   │   └── modals/
│   │       ├── cashier-payment-modal/                # Hộp thoại thanh toán đa kênh (Tiền mặt / VietQR)
│   │       │   ├── cashier-payment-modal.component.ts
│   │       │   ├── cashier-payment-modal.component.html
│   │       │   └── cashier-payment-modal.component.scss
│   │       └── cashier-order-detail-modal/           # Hộp thoại xem chi tiết & điều chỉnh món của bàn
│   │           ├── cashier-order-detail-modal.component.ts
│   │           ├── cashier-order-detail-modal.component.html
│   │           └── cashier-order-detail-modal.component.scss
│   ├── shared/
│   │   └── services/
│   │       ├── user-role-navigation.service.ts        # Cập nhật route trang chủ Cashier -> /cashier/tables
│   │       └── table-signalr.service.ts               # Mở rộng lắng nghe sự kiện đơn & bill
│   └── app.routes.ts                                  # Đăng ký cụm route /cashier (tables, orders)
└── assets/
    └── i18n/
        ├── vi.json                                    # Khóa bản dịch Tiếng Việt phía Client
        └── en.json                                    # Khóa bản dịch Tiếng Anh phía Client
```

---

## Các Giai đoạn Triển khai (Implementation Phases)

### Giai đoạn 1: Nền tảng Backend, Phân quyền & Mở rộng SignalR Notifier
- **T-001**: Khai báo quyền hạt nhân `TooHungryPermissions.Cashier.*` trong `TooHungryPermissions.cs` và `TooHungryPermissionDefinitionProvider.cs`.
- **T-002**: Bổ sung DTOs sự kiện thời gian thực (`OrderPlacedOrUpdatedDto`, `BillRequestedDto`, `PaymentCompletedDto`) và mở rộng `ITableRealtimeNotifier`.
- **T-003**: Cập nhật `TableRealtimeNotifier.cs` triển khai broadcast 3 sự kiện SignalR mới qua `TableHub`.
- **T-004**: Tích hợp gọi `ITableRealtimeNotifier` trong `TableOrderAppService` khi Waiter bấm yêu cầu thanh toán (`RequestBillAsync`) và khi Thu ngân hoàn tất thanh toán (`CompleteAndPayAsync`).
- **T-005**: Xây dựng `CashierAppService` cung cấp endpoint tổng quan ca trực (`/api/app/cashier/shift-summary`) và danh sách bàn/đơn tối ưu hóa.

### Giai đoạn 2: Khung Bố cục Shell, Tuyến đường & Gác cổng Phân quyền Frontend
- **T-006**: Khai báo các mô hình dữ liệu, enums và interfaces trong `cashier.models.ts`.
- **T-007**: Xây dựng `cashierAuthGuard` bảo vệ an toàn cụm tuyến đường `/cashier/*`.
- **T-008**: Cấu hình cụm route `/cashier` (với các route con `tables`, `orders`) trong `app.routes.ts`.
- **T-009**: Cập nhật `UserRoleNavigationService` để tự động điều hướng người dùng có vai trò `Cashier` về `/cashier/tables`.
- **T-010**: Xây dựng `CashierLayoutComponent` gồm Topbar ca trực cố định (hiển thị doanh thu ca, bàn phục vụ, đơn chờ), Sidebar điều hướng ngữ cảnh và Main Content Bento Card.

### Giai đoạn 3: Màn hình Quản lý Sơ đồ Bàn ăn dành riêng cho Thu ngân (`/cashier/tables`)
- **T-011**: Xây dựng `CashierTablesComponent` hiển thị sơ đồ lưới Bento bàn ăn phân nhóm theo từng Khu vực (Khu A, Khu B, VIP...).
- **T-012**: Triển khai bộ lọc trạng thái bàn tức thời (Tất cả, Trống, Có khách, Đã đặt, Chờ dọn, Khóa).
- **T-013**: Thiết kế thẻ bàn Bento Card chuyên biệt cho Cashier: Hiển thị số bàn, số ghế, thời gian khách ngồi, trạng thái đơn, tổng tiền tạm tính hiện thời.
- **T-014**: Tích hợp các thao tác nhanh trên thẻ bàn: Mở xem danh sách món đang gọi, đón khách vào bàn tại quầy, chuyển bàn hoặc gộp bàn khi khách yêu cầu.
- **T-015**: Triển khai hiệu ứng nhấp nháy viền cam đỏ cảnh báo nổi bật trên thẻ bàn khi có sự kiện `BillRequested`.
- **T-015B**: Trang bị nút Reload Sơ đồ Bàn tại chỗ (`[fa-rotate] Tải lại`) cho cả hai phân hệ Waiter (`/waiter/tables`) và Cashier (`/cashier/tables`): Tải lại tức thì dữ liệu bàn từ API mà không tải lại toàn bộ trang web (không F5), bảo toàn bộ lọc khu vực và từ khóa tìm kiếm.

### Giai đoạn 4: Màn hình Quản lý Đơn hàng Toàn trình & Thanh toán Đa kênh (`/cashier/orders`)
- **T-016**: Xây dựng `CashierOrdersComponent` với 4 cột/tab Bento: Mới nhận (`Pending`), Đang xử lý (`Processing`), Yêu cầu thanh toán (`Bill Requested`), Đã hoàn tất (`Completed`).
- **T-016B**: Trang bị nút Reload Danh sách Đơn hàng tại chỗ (`[fa-rotate] Tải lại`) cho cả hai bên Waiter và Cashier: Cập nhật tức thì các đơn hàng mới mà không làm mới trang web.
- **T-017**: Xây dựng `CashierOrderDetailModalComponent` xem danh sách món chi tiết, cập nhật số lượng, thêm ghi chú chế biến và hủy món có lý do.
- **T-018**: Xây dựng `CashierPaymentModalComponent` kế thừa RM-016: Hóa đơn tạm tính Pre-bill, chọn phương thức Tiền mặt (tự tính tiền thừa) hoặc VietQR động.
- **T-019**: Thực hiện thanh toán: Gọi API trừ kho FEFO an toàn, đóng đơn `COMPLETED`, cập nhật doanh thu ca, in hóa đơn và chuyển bàn sang `CLEANING`.

### Giai đoạn 5: Dịch vụ Đồng bộ Hai chiều Thời gian thực & Chuông báo Âm thanh
- **T-020**: Xây dựng `AudioNotificationService` phát âm thanh chuông báo (Chime) khi có đơn mới và chuông cảnh báo khi có yêu cầu thanh toán.
- **T-021**: Xây dựng `CashierSyncService` lắng nghe các sự kiện SignalR từ `TableSignalrService` và cập nhật phản ứng vào `CashierStateService`.
- **T-022**: Cập nhật phía Waiter (`WaiterTablesComponent` / `WaiterOrderComponent`): Lắng nghe sự kiện `PaymentCompleted` để đổi bàn sang `CLEANING` và hiển thị thông báo Toast dọn bàn tức thời.
- **T-023**: Khi Waiter bấm "Đã dọn xong": Bàn chuyển sang `AVAILABLE` và đồng bộ tức thời trên cả hai màn hình Waiter và Cashier.
- **T-023B**: Tích hợp cơ chế Reload dự phòng độc lập: Khi mạng Wi-Fi chập chờn hoặc sau khi thiết bị ngủ (sleep/wake), nhân viên ở cả hai vai trò có thể bấm nút Reload tại chỗ để đồng bộ lại trạng thái mới nhất từ server ngay lập tức.

### Giai đoạn 6: Đa ngôn ngữ, Tương thích Cảm ứng, Kiểm thử Tự động & Nghiệm thu
- **T-024**: Cấu hình 100% từ điển đa ngôn ngữ song ngữ trong cả 4 tệp `vi.json` và `en.json` (Angular assets & Domain.Shared).
- **T-025**: Tối ưu hóa kích thước cảm ứng touch target >= 44×44px cho màn hình Touch POS.
- **T-026**: Viết Unit Tests Vitest cho `cashierAuthGuard`, `CashierSyncService`, `CashierTablesComponent`, `CashierOrdersComponent`.
- **T-027**: Viết Integration Tests xUnit cho SignalR Notifier và endpoint thanh toán backend.
- **T-028**: Chạy kiểm tra strict compilation `npm run build` và kiểm thử hồi quy toàn bộ hệ thống.
