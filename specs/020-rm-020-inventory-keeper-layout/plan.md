# Kế hoạch Triển khai (Implementation Plan): RM-020 Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)

**Nhánh (Branch)**: `020-rm-020-inventory-keeper-layout` | **Ngày**: 2026-10-19 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/020-rm-020-inventory-keeper-layout/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 19-10-2026 với 6 quyết định kiến trúc & vận hành then chốt:
1. **Cấu trúc Đa Tuyến đường Con Chuyên biệt**: Xây dựng cụm route `/inventory-keeper` với 3 phân hệ con (`/dashboard` Tổng quan & FEFO, `/batches` Quản lý Lô & Thao tác 1 chạm, `/transactions` Nhật ký biến động & Kiểm kê), giữ nguyên trang `/inventory` cũ cho cấp Quản lý tra cứu báo cáo.
2. **Cơ chế Quét Barcode / QR Kép Linh hoạt**: Tự động nhận diện súng quét mã vạch phần cứng HID (USB/Bluetooth) ở cấp Layout kết hợp hộp thoại quét Camera HTML5 trên thiết bị di động/tablet.
3. **Cơ chế Đồng bộ Số liệu Cảnh báo Topbar**: Tải dữ liệu ban đầu khi vào ca, tự động làm mới tức thì (reactive event) sau mỗi thao tác kho (Nhập/Xuất/Khóa/Kiểm kê) kèm nút `[Làm mới]` thủ công.
4. **Bộ Gác cổng Tuyến đường & Tự động Điều hướng theo Vai trò**: `inventoryKeeperAuthGuard` bảo vệ an toàn cụm route; tài khoản `InventoryStaff` được tự động đưa thẳng vào `/inventory-keeper/dashboard` sau đăng nhập.
5. **Tái sử dụng Trọn vẹn API Backend & Modal Nghiệp vụ**: Kế thừa 100% API từ RM-011, RM-012, RM-013 và các modal nhập/xuất/khóa/kiểm kê mà không làm phát sinh nợ kỹ thuật backend.
6. **Tương thích Màn hình Cảm ứng & Phục hồi Điều hướng RM-019**: Drawer trượt Offcanvas trên màn hình < 992px, kích thước touch target >= 44×44px, tự động đưa người dùng về trang làm việc sau 5 giây nếu gặp sự cố mã lỗi.

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout) (RM-020)** thuộc phân hệ Kho (Inventory, Wave 4). Tính năng này mang lại không gian làm việc chuyên biệt độc lập ("Khoang lái tác nghiệp" - Operational Cockpit) dành riêng cho Thủ kho (`InventoryStaff`), giải phóng nhân viên kho khỏi giao diện quản trị cồng kềnh của ABP Framework, tập trung cao độ vào kiểm soát hạn dùng FEFO, phát hiện cảnh báo nguy cơ cạn kho và xử lý hàng hóa nhanh chóng tại quầy kho.

### Các mục tiêu kiến trúc cốt lõi:
1. **Khung Bố cục Shell Chuyên biệt (`InventoryKeeperLayoutComponent`)**:
   - Layout độc lập cấp ứng dụng (`eLayoutType.empty`), loại bỏ hoàn toàn các thanh menu quản trị ABP thông thường.
   - Bố cục 3 phân vùng chuẩn mực: Topbar cố định 64px, Sidebar ngữ cảnh động 280px (chuyển thành Offcanvas Drawer trên thiết bị < 992px), Main Content cuộn độc lập với phong cách Bento Card chuẩn nhận diện Cam & Trắng (`#EA580C`).
2. **Cơ chế Điều hướng theo Vai trò & Gác cổng An ninh (`inventoryKeeperAuthGuard`)**:
   - Cập nhật `dashboardGuard` và `UserRoleNavigationService` để nhận diện vai trò `InventoryStaff` tự động đưa về `/inventory-keeper/dashboard`.
   - Bảo vệ nghiêm ngặt các route con, chặn đứng các vai trò không liên quan (`Waiter`, `Cashier`) và chuyển tiếp sang màn hình báo lỗi 403 Bento Card RM-019.
3. **Thanh Topbar Tinh gọn & 3 Thẻ Cảnh báo KPI Thời gian thực**:
   - Tên nhà hàng, thông tin thủ kho, badge ca trực tự động (`[Ca Sáng]`, `[Ca Chiều/Tối]`, `[Ngoài Ca Trực]`).
   - 3 Thẻ KPI cảnh báo: Lô cận date (Cam), Thiếu tồn an toàn (Đỏ), Lô quá hạn cần hủy (Đen).
   - Nút `[Làm mới]` thủ công kèm hiệu ứng xoay và nút `[Quay lại Quản trị]` (dành riêng cho Admin/Manager).
4. **Dịch vụ Sidebar Ngữ cảnh Động (`InventoryKeeperSidebarService`)**:
   - Quản lý nội dung Sidebar linh hoạt thông qua Template Portal Pattern.
   - Tích hợp ô tìm kiếm tức thì theo mã lô, tên nguyên liệu, nhà cung cấp (hỗ trợ phím tắt `Ctrl + K` / `Cmd + K`).
   - Bộ lọc phân loại 4 điều kiện bảo quản nhiệt độ (Tất cả, Mát, Đông, Khô).
   - Bộ lọc trạng thái hạn dùng của lô hàng (Tất cả, Đang dùng, Cận date, Quá hạn, Đã khóa).
5. **Dịch vụ Quét Mã vạch Kép (`BarcodeScannerService`)**:
   - Tự động bắt tín hiệu súng quét mã vạch phần cứng HID trên bàn phím toàn cục.
   - Cung cấp hộp thoại quét mã bằng Camera HTML5 (`BarcodeCameraModalComponent`) trên thiết bị di động/tablet.
6. **Tích hợp Tác vụ Nhanh 1 Chạm tại Quầy kho**:
   - Mở nhanh modal Nhập lô mới (`CreateInventoryBatchModal`), Xuất hủy lô (`DiscardBatchModal`), Tạm khóa/Mở khóa lô (RM-013), Kiểm kê điều chỉnh (RM-011).
7. **100% Quốc tế hóa Song ngữ Toàn diện (i18n)**:
   - Cung cấp đầy đủ từ điển song ngữ trong `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: TypeScript 5.x, Angular 19+, ABP Framework 9.x
- **Kiến trúc Frontend**: Angular Standalone Components, Signal Reactive State (`signal`, `computed`, `effect`), RxJS Observables, Angular Router
- **Thư viện tích hợp**: `@abp/ng.core` (`ConfigStateService`, `AuthService`, `LocalizationService`, `PermissionService`), FontAwesome Free icons, HTML5 Web Media Devices API
- **Nền tảng đích**: Web application hỗ trợ đa thiết bị (Máy tính quầy kho Desktop POS, Máy tính bảng iPad/Android của thủ kho, Điện thoại di động)
- **Ràng buộc Hiệu năng**:
  - Thời gian tải layout và render giao diện < 100ms
  - Thời gian phản hồi tìm kiếm / quét mã vạch < 150ms
  - Kích thước vùng bấm cảm ứng tối thiểu 44 × 44px
- **Ràng buộc Thương hiệu & I18N**:
  - Nhận diện Cam & Trắng (`#EA580C`, nền `#F8FAFC`, bề mặt thẻ `#FFFFFF`, viền `#E2E8F0`, điểm nhấn `#FFF7ED`)
  - 100% chuỗi hiển thị được nạp qua `abpLocalization` pipe hoặc `LocalizationService`

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - Kế thừa trọn vẹn Domain Models và Application Services sẵn có của phân hệ Kho (`InventoryBatch`, `InventoryTransaction`, `IInventoryAppService`, `IIngredientAppService`). Không can thiệp sửa đổi trái phép cấu trúc Aggregate Root hoặc Entity.
- [x] **II. UML & Domain Model Alignment**:
  - Khớp với mô hình kiến trúc phân quyền và luồng vận hành người dùng trong `RMS-TH.vpp` và `docs/roadmap.md`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Đảm bảo kiểm thử tự động độc lập: Unit test `inventoryKeeperAuthGuard`, kiểm thử logic tính ca trực của `InventoryKeeperLayoutComponent`, kiểm thử `BarcodeScannerService` và `InventoryAlertStateService`.
- [x] **IV. Hợp đồng API & Tích hợp Module**:
  - Xác định rõ ràng hợp đồng component inputs/outputs, route definitions và service interfaces tại `contracts/inventory-keeper-contracts.md`.
- [x] **V. Bảo mật & Phân quyền**:
  - Phân hệ được bảo vệ nghiêm ngặt bằng `inventoryKeeperAuthGuard`; chỉ những tài khoản có vai trò `InventoryStaff`, `Manager` hoặc `Administrator` sở hữu quyền `TooHungry.Inventories` mới được truy cập.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Thiết kế Bento Card bo góc lớn `rounded-2xl`, hiệu ứng Glassmorphism tinh tế, màu cam chủ đạo `#EA580C`.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% tiêu đề, mô tả, nhãn nút và thẻ cảnh báo có đầy đủ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ kỹ thuật (spec, plan, research, data-model, quickstart, contracts) được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (specs/)
```text
specs/020-rm-020-inventory-keeper-layout/
├── spec.md                            # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật Angular Shell, Barcode Scanner, Alert Synchronizer
├── data-model.md                      # Thiết kế State Signals, Enum, Interfaces và từ điển i18n
├── quickstart.md                      # Hướng dẫn kiểm thử 6 kịch bản vận hành phân hệ Thủ kho
├── contracts/
│   └── inventory-keeper-contracts.md  # Hợp đồng Component, Service Interfaces, Router definitions
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Triển khai & Cập nhật
```text
angular/src/
├── app/
│   ├── inventory-keeper/
│   │   ├── guards/
│   │   │   └── inventory-keeper-auth.guard.ts       # Gác cổng bảo vệ phân hệ Thủ kho
│   │   ├── layout/
│   │   │   ├── inventory-keeper-layout.component.ts # Component khung Layout 3 phân vùng
│   │   │   ├── inventory-keeper-layout.component.html
│   │   │   └── inventory-keeper-layout.component.scss
│   │   ├── services/
│   │   │   ├── inventory-keeper-sidebar.service.ts  # Quản lý Template Sidebar ngữ cảnh động
│   │   │   ├── barcode-scanner.service.ts           # Xử lý quét mã HID bàn phím & Camera
│   │   │   └── inventory-alert-state.service.ts     # Đồng bộ chỉ số KPI cảnh báo Topbar
│   │   ├── models/
│   │   │   └── inventory-keeper.models.ts           # Khai báo Enums và State Interfaces
│   │   ├── dashboard/
│   │   │   ├── inventory-keeper-dashboard.component.ts
│   │   │   ├── inventory-keeper-dashboard.component.html
│   │   │   └── inventory-keeper-dashboard.component.scss
│   │   ├── batches/
│   │   │   ├── inventory-keeper-batches.component.ts
│   │   │   ├── inventory-keeper-batches.component.html
│   │   │   └── inventory-keeper-batches.component.scss
│   │   ├── transactions/
│   │   │   ├── inventory-keeper-transactions.component.ts
│   │   │   ├── inventory-keeper-transactions.component.html
│   │   │   └── inventory-keeper-transactions.component.scss
│   │   └── barcode-modal/
│   │       ├── barcode-camera-modal.component.ts    # Hộp thoại quét mã vạch qua Camera
│   │       ├── barcode-camera-modal.component.html
│   │       └── barcode-camera-modal.component.scss
│   ├── shared/
│   │   ├── guards/
│   │   │   └── dashboard.guard.ts                   # Cập nhật điều hướng InventoryStaff về /inventory-keeper
│   │   └── services/
│   │       └── user-role-navigation.service.ts      # Cập nhật route trang chủ InventoryStaff -> /inventory-keeper
│   └── app.routes.ts                                # Đăng ký cụm route /inventory-keeper và alias /keeper
└── assets/
    └── i18n/
        ├── vi.json                                  # Bổ sung 30+ khóa bản dịch Tiếng Việt
        └── en.json                                  # Bổ sung 30+ khóa bản dịch Tiếng Anh
```

---

## Các Giai đoạn Triển khai (Implementation Phases)

### Giai đoạn 1: Tuyến đường & Bộ Gác cổng Phân quyền (Routing & Security Guard)
- **T-001**: Khai báo các mô hình dữ liệu, enums và interfaces trong `inventory-keeper.models.ts`.
- **T-002**: Xây dựng `inventoryKeeperAuthGuard` kiểm tra quyền `TooHungry.Inventories` và các vai trò hợp lệ.
- **T-003**: Cấu hình cụm route `/inventory-keeper` (kèm các route con `dashboard`, `batches`, `transactions`) và alias `/keeper` trong `app.routes.ts`.
- **T-004**: Cập nhật `UserRoleNavigationService` và `dashboardGuard` để điều hướng tự động `InventoryStaff` về `/inventory-keeper/dashboard`.

### Giai đoạn 2: Khung Bố cục Shell & Dịch vụ Nền tảng (Layout Shell & Core Services)
- **T-005**: Xây dựng `InventoryKeeperSidebarService` điều khiển Template Portal và trạng thái Offcanvas Drawer.
- **T-006**: Xây dựng `InventoryAlertStateService` tải và làm mới reactive các chỉ số KPI cảnh báo.
- **T-007**: Xây dựng `InventoryKeeperLayoutComponent` với 3 phân vùng (Topbar cố định 64px, Dynamic Sidebar 280px, Main Content Bento Card).
- **T-008**: Triển khai logic tính ca trực tự động theo giờ hệ thống kết hợp hiển thị thông tin thủ kho và các badge KPI cảnh báo trên Topbar.
- **T-009**: Thiết lập nút `[Làm mới]` thủ công trên Topbar và nút `[Quay lại Quản trị]` có điều kiện cho Admin/Manager.

### Giai đoạn 3: Màn hình Nghiệp vụ Con (Operational Views & Bento Cards)
- **T-010**: Xây dựng `InventoryKeeperDashboardComponent` hiển thị các thẻ Bento Card tổng quan chỉ số, cảnh báo cận date FEFO và danh sách tác vụ nhanh.
- **T-011**: Xây dựng `InventoryKeeperBatchesComponent` hiển thị danh mục lô hàng, tích hợp bộ lọc điều kiện bảo quản nhiệt độ (Mát, Đông, Khô) và trạng thái hạn dùng.
- **T-012**: Xây dựng `InventoryKeeperTransactionsComponent` hiển thị nhật ký xuất nhập tồn bất biến và nút mở modal kiểm kê điều chỉnh cân đối kho.

### Giai đoạn 4: Dịch vụ Quét Barcode / QR Kép & Thao tác Nhanh 1 Chạm
- **T-013**: Xây dựng `BarcodeScannerService` lắng nghe sự kiện bàn phím toàn cục từ súng quét mã vạch HID (USB/Bluetooth).
- **T-014**: Xây dựng `BarcodeCameraModalComponent` quét mã vạch bằng Camera HTML5 trên máy tính bảng/di động.
- **T-015**: Tích hợp các modal nghiệp vụ 1 chạm: Nhập lô mới (`CreateInventoryBatchModal`), Xuất hủy lô (`DiscardBatchModal`), Tạm khóa/Mở khóa lô (RM-013), Kiểm kê điều chỉnh (RM-011).

### Giai đoạn 5: Tương thích Cảm ứng, Quốc tế hóa & Kiểm thử Toàn diện
- **T-016**: Triển khai cơ chế Drawer Offcanvas trên màn hình < 992px kèm nút `[Bộ lọc & Quét mã]` trên Topbar, chuẩn touch target >= 44×44px.
- **T-017**: Cấu hình 100% từ điển đa ngôn ngữ song ngữ trong `vi.json` và `en.json`.
- **T-018**: Viết Unit Test tự động cho `inventoryKeeperAuthGuard`, `InventoryKeeperLayoutComponent`, `BarcodeScannerService` và `InventoryAlertStateService`.
- **T-019**: Chạy build kiểm tra toàn bộ ứng dụng Angular (`npm run build`) và đối soát 6 kịch bản theo `quickstart.md`.
