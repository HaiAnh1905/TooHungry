# Danh sách Công việc Triển khai (Tasks): RM-020 Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)

**Tính năng**: `RM-020 — Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)`  
**Nhánh (Branch)**: `020-rm-020-inventory-keeper-layout` | **Ngày**: 2026-10-19  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md) | **Hợp đồng (Contracts)**: [contracts/inventory-keeper-contracts.md](contracts/inventory-keeper-contracts.md)

---

## Phase 1: Nền tảng Mô hình Dữ liệu, Tuyến đường & Bộ Gác cổng (`inventoryKeeperAuthGuard`)

**Mục tiêu**: Xây dựng nền tảng định tuyến cơ sở `/inventory-keeper`, mô hình dữ liệu trạng thái và bộ gác cổng an ninh bảo vệ toàn bộ cụm tuyến đường của Thủ kho.

- [x] T001 [P] Khởi tạo tệp mô hình dữ liệu `angular/src/app/inventory-keeper/models/inventory-keeper.models.ts`:
  - Khai báo các enum: `InventoryKeeperShiftType` (Morning, AfternoonEvening, OffShift), `StorageConditionType` (All, Chilled, Frozen, Dry), `BatchStatusFilterType` (All, InUse, ExpiringSoon, Expired, Deactivated)
  - Khai báo các interface: `InventoryKeeperUserInfo`, `InventoryKeeperKpiSummary`, `BarcodeScanEvent`, `InventoryKeeperFilterState`
- [x] T002 [US1, US3] Xây dựng bộ gác cổng `inventoryKeeperAuthGuard` trong `angular/src/app/inventory-keeper/guards/inventory-keeper-auth.guard.ts`:
  - Tiêm `AuthService`, `ConfigStateService`, `PermissionService`, `Router`
  - Chặn người dùng chưa đăng nhập, chuyển hướng về `/account/login?returnUrl=...`
  - Kiểm tra vai trò: bắt buộc sở hữu ít nhất một trong các vai trò `['InventoryStaff', 'Manager', 'Administrator', 'admin']`
  - Kiểm tra quyền hạn: bắt buộc có quyền `TooHungry.Inventories`
  - Nếu không thỏa mãn: Chuyển hướng sang `/error/403` Bento Card RM-019
- [x] T003 [US1, US3] Cấu hình định tuyến cơ sở và các tuyến đường con trong `angular/src/app/app.routes.ts`:
  - Đăng ký cụm route `/inventory-keeper` với layout độc lập `eLayoutType.empty` và guards `[authGuard, inventoryKeeperAuthGuard]`
  - Cấu hình các route con:
    + `''` $\rightarrow$ redirect về `dashboard`
    + `'dashboard'` $\rightarrow$ `InventoryKeeperDashboardComponent`
    + `'batches'` $\rightarrow$ `InventoryKeeperBatchesComponent`
    + `'transactions'` $\rightarrow$ `InventoryKeeperTransactionsComponent`
    + `'**'` $\rightarrow$ redirect về `dashboard`
  - Đăng ký alias route `'keeper'` $\rightarrow$ redirect về `/inventory-keeper`
- [x] T004 [US1] Cập nhật `dashboardGuard` và `UserRoleNavigationService` trong `angular/src/app/shared/`:
  - Cập nhật `UserRoleNavigationService.getDefaultHomeRoute()`: Khi vai trò là `InventoryStaff` $\rightarrow$ trả về `/inventory-keeper/dashboard` (thay vì `/inventory` chung)
  - Cập nhật `UserRoleNavigationService.getDefaultHomeLabelKey()`: Gắn nhãn `'::InventoryKeeperPortal'`
  - Đảm bảo `dashboardGuard` tự động đưa tài khoản `InventoryStaff` về `/inventory-keeper/dashboard` khi truy cập URL gốc `/`
- [x] T005 [P] Viết Unit Tests tự động cho `inventoryKeeperAuthGuard` trong `angular/src/app/inventory-keeper/guards/inventory-keeper-auth.guard.spec.ts` kiểm thử các kịch bản vai trò hợp lệ, không hợp lệ và chưa đăng nhập.

**Trạm kiểm tra (Checkpoint)**: Truy cập `/inventory-keeper` khi chưa đăng nhập bị chặn về `/account/login`; tài khoản `InventoryStaff` đăng nhập tự động vào `/inventory-keeper/dashboard`; tài khoản `Waiter` bị chặn 403.

---

## Phase 2: Dịch vụ Nền tảng Phân hệ Thủ kho (Core Services)

**Mục tiêu**: Xây dựng 3 dịch vụ trung tâm quản lý giao diện: Template Portal của Sidebar, Đồng bộ Cảnh báo KPI trên Topbar, và Bộ lắng nghe máy quét mã vạch HID bàn phím toàn cục.

- [x] T006 [US4, US6] Xây dựng `InventoryKeeperSidebarService` trong `angular/src/app/inventory-keeper/services/inventory-keeper-sidebar.service.ts`:
  - Triển khai `BehaviorSubject<TemplateRef<any> | null>` cho nội dung dynamic sidebar
  - Các hàm: `setTemplate()`, `getTemplate$()`, `clearTemplate()`
  - Quản lý trạng thái mở/đóng ngăn kéo trượt trên di động: `isMobileDrawerOpen$`, `setMobileDrawerOpen(boolean)`, `toggleMobileDrawer()`
- [x] T007 [US2, US5] Xây dựng `InventoryAlertStateService` trong `angular/src/app/inventory-keeper/services/inventory-alert-state.service.ts`:
  - Tiêm `IInventoryAppService`
  - Quản lý Angular Signals: `alerts = signal<InventoryAlertDto[]>([])`, `kpiSummary = signal<InventoryKeeperKpiSummary>(...)`, `isLoading = signal<boolean>(false)`
  - Triển khai hàm `loadAlerts()`: Gọi `inventoryAppService.getAlerts()` và phân tích số lượng lô cận date (<= 7 ngày), thiếu tồn an toàn, lô quá hạn
  - Triển khai cơ chế Reactive Refresh: `refreshAlerts()` kèm debounce 1000ms chống spam gọi API
  - Cung cấp Observable sự kiện làm mới cho toàn phân hệ
- [x] T008 [US4] Xây dựng `BarcodeScannerService` trong `angular/src/app/inventory-keeper/services/barcode-scanner.service.ts`:
  - Lắng nghe sự kiện `keydown` trên `window` (Global HID Keyboard Listener)
  - Thuật toán nhận diện súng quét phần cứng: kiểm tra thời gian giữa 2 phím liên tiếp < 50ms
  - Khi gặp phím `Enter`, nếu chuỗi ký tự tích lũy >= 3 ký tự $\rightarrow$ phát sự kiện `scanned$ = new Subject<BarcodeScanEvent>()` và xóa buffer
  - Cung cấp hàm `emitScanResult(code, 'CAMERA')` cho modal quét camera
- [x] T009 [P] Viết Unit Tests tự động cho `BarcodeScannerService` và `InventoryAlertStateService` trong thư mục `services/`.

**Trạm kiểm tra (Checkpoint)**: Các dịch vụ nền tảng hoạt động trơn tru; giả lập gõ phím nhanh từ súng quét mã vạch phát ra đúng sự kiện `scanned$`; service cảnh báo nạp đúng dữ liệu từ backend.

---

## Phase 3: Khung Bố cục Shell Chuyên biệt (`InventoryKeeperLayoutComponent`)

**Mục tiêu**: Hiện thực hóa layout chuyên biệt 3 phân vùng (Topbar quầy kho, Dynamic Sidebar, Main Content) với nhận diện Cam & Trắng (`#EA580C`), bo góc Bento Card và thanh ca trực thông minh.

- [x] T010 [P] Khởi tạo component `InventoryKeeperLayoutComponent` tại `angular/src/app/inventory-keeper/layout/`:
  - `inventory-keeper-layout.component.ts`
  - `inventory-keeper-layout.component.html`
  - `inventory-keeper-layout.component.scss`
- [x] T011 [US2] Triển khai logic trong `inventory-keeper-layout.component.ts`:
  - Tiêm `ConfigStateService`, `AuthService`, `Router`, `InventoryKeeperSidebarService`, `InventoryAlertStateService`, `BarcodeScannerService`
  - Tính toán ca trực kho tự động dựa trên giờ thực tế:
    + `08:00 - 15:00` $\rightarrow$ `Morning` (`[Ca Sáng]`)
    + `15:00 - 22:00` $\rightarrow$ `AfternoonEvening` (`[Ca Chiều/Tối]`)
    + Ngoài khung giờ $\rightarrow$ `OffShift` (`[Ngoài Ca Trực]`)
  - Xác định cờ `canReturnToAdmin`: Hiển thị nút `[Quay lại Quản trị]` khi vai trò chứa `Manager` hoặc `Administrator`
  - Lắng nghe `kpiSummary` từ `InventoryAlertStateService` để cập nhật số lượng cảnh báo lên Topbar
  - Quản lý đóng/mở Drawer trên màn hình nhỏ và khởi động `BarcodeScannerService.startHidListener()`
  - Xử lý hành động đăng xuất nhanh kèm dialog xác nhận
- [x] T012 [US2, US6] Thiết kế giao diện `inventory-keeper-layout.component.html`:
  - **Topbar (64px)**:
    + Cột trái: Logo "Acme.TooHungry" sắc cam `#EA580C`, biểu tượng kho hàng, Tên phân hệ "Quầy Kho"
    + Cột giữa: Huy hiệu ca trực tự động theo giờ, thông tin tên thủ kho đăng nhập, trạng thái trực tuyến
    + Cột phải: 3 Thẻ Badge KPI cảnh báo khẩn cấp (Lô cận date, Thiếu tồn, Quá hạn), nút icon `[Làm mới]` xoay tròn, nút `[Quay lại Quản trị]` (nếu có quyền), nút `[Đăng xuất]`
    + Nút bấm `[Bộ lọc & Quét mã]` (chỉ xuất hiện trên màn hình < 992px)
  - **Sidebar (280px desktop / Offcanvas Drawer mobile)**:
    + Khung chứa `<ng-container *ngTemplateOutlet="currentSidebarTemplate$ | async"></ng-container>`
    + Lớp nền mờ (Backdrop blur) và nút đóng `[✕]` khi hiển thị dạng Drawer
  - **Main Content**:
    + Không gian trung tâm cuộn độc lập, chứa thanh chuyển đổi tab điều hướng nhanh (`/dashboard`, `/batches`, `/transactions`) và thẻ `<router-outlet>`
- [x] T013 [P] Thiết kế styling trong `inventory-keeper-layout.component.scss`:
  - Chuẩn nhận diện Cam & Trắng (`#EA580C`, `#FFF7ED`, nền `#F8FAFC`, viền `#E2E8F0`)
  - Bố cục Grid / Flexbox 3 phân vùng mượt mà
  - Hiệu ứng trượt Drawer Offcanvas chuyển động CSS 250ms ease-in-out
  - Chuẩn kích thước chạm touch target >= 44×44px cho tất cả các nút Topbar và thanh điều hướng

**Trạm kiểm tra (Checkpoint)**: Bố cục 3 vùng hiển thị sắc nét, Topbar hiển thị đúng ca trực và 3 badge cảnh báo; nút Làm mới xoay mượt mà; responsive thu gọn thành Drawer khi màn hình < 992px.

---

## Phase 4: Các Màn hình Nghiệp vụ Con (Dashboard, Batches, Transactions)

**Mục tiêu**: Xây dựng 3 màn hình nghiệp vụ con với giao diện Bento Card hiện đại, hỗ trợ tìm kiếm tức thì, lọc nhiệt độ bảo quản và nhật ký giao dịch.

- [x] T014 [US4, US5] Khởi tạo và xây dựng `InventoryKeeperDashboardComponent` tại `angular/src/app/inventory-keeper/dashboard/`:
  - Hiển thị 4 thẻ Bento Card tổng quan (Tổng số lô, Lô cận date, Lô quá hạn, Tồn an toàn)
  - Bảng ưu tiên xuất kho theo nguyên tắc FEFO (Top các lô gần hết hạn nhất cần xuất trước)
  - Khối phím tắt tác vụ nhanh 1 chạm (Nhập lô mới, Xuất hủy nhanh, Kiểm kê)
  - Đăng ký template bộ lọc Dashboard vào `InventoryKeeperSidebarService`
- [x] T015 [US4, US5] Khởi tạo và xây dựng `InventoryKeeperBatchesComponent` tại `angular/src/app/inventory-keeper/batches/`:
  - Bảng danh mục lô hàng `SharedTable` tinh gọn, hiển thị Mã lô, Tên nguyên liệu, Hạn dùng, Trạng thái (Expiration Badge), Số lượng tồn, Đơn vị chuẩn
  - Đăng ký template Sidebar:
    + Ô tìm kiếm nhanh mã lô, tên nguyên liệu (debounce 300ms, phím tắt `Ctrl + K`)
    + Bộ lọc 4 trạng thái nhiệt độ bảo quản (Tất cả, Mát 0-4°C, Đông -18°C, Khô)
    + Bộ lọc trạng thái lô hàng (Đang dùng, Cận date, Quá hạn, Đã khóa)
    + Nút mở modal quét mã vạch
  - Tích hợp lắng nghe sự kiện `barcodeScannerService.scanned$`: Tự động điền mã vào ô tìm kiếm và cuộn mượt (smooth scroll) đến dòng lô hàng tương ứng
- [x] T016 [US5] Khởi tạo và xây dựng `InventoryKeeperTransactionsComponent` tại `angular/src/app/inventory-keeper/transactions/`:
  - Bảng lịch sử biến động kho xuất nhập tồn bất biến (`InventoryTransactionDto`)
  - Lọc theo loại giao dịch: Nhập kho (Inbound), Xuất món POS, Xuất hủy (Discard), Kiểm kê cân đối (Adjustment)
  - Nút bấm `[+ Lập biên bản kiểm kê]` mở modal cân đối kho

**Trạm kiểm tra (Checkpoint)**: Chuyển đổi giữa 3 tab con mượt mà; Sidebar tự động biến đổi nội dung tương ứng theo trang; tìm kiếm và lọc nhiệt độ bảo quản hoạt động tức thì < 150ms.

---

## Phase 5: Hộp thoại Quét Mã vạch Camera & Tích hợp Tác vụ Nhanh 1 Chạm

**Mục tiêu**: Xây dựng modal quét mã vạch qua Camera HTML5 và tích hợp các modal nghiệp vụ sẵn có vào các nút bấm 1 chạm tại quầy kho.

- [x] T017 [US4] Xây dựng component `BarcodeCameraModalComponent` tại `angular/src/app/inventory-keeper/barcode-modal/`:
  - Standalone modal sử dụng `navigator.mediaDevices.getUserMedia`
  - Khung ngắm laser quét mã màu cam `#EA580C` có animation quét lên xuống
  - Giải mã chuỗi Barcode / QR bằng thư viện hoặc Native BarcodeDetector API
  - Bắt mã thành công: Phát âm thanh beep nhẹ, đóng modal và gửi mã qua `BarcodeScannerService.emitScanResult(code, 'CAMERA')`
  - Hỗ trợ ô nhập tay mã dự phòng nếu camera thiết bị không nhận diện được
- [x] T018 [US5] Tích hợp các Modal nghiệp vụ 1 chạm trên `InventoryKeeperBatchesComponent` và `Dashboard`:
  - **Nhập kho nhanh**: Kết nối nút `[+ Nhập lô mới]` với `CreateInventoryBatchModalComponent`, tự động nạp ngày nhập hôm nay
  - **Xuất hủy nhanh**: Kết nối nút `[Xuất hủy]` trên từng dòng với `DiscardBatchModalComponent`, cập nhật lý do hủy
  - **Khóa / Mở khóa lô (RM-013)**: Kết nối nút `[Khóa lô]` / `[Mở khóa]` với `DeactivateBatchModalComponent` và API `reactivateBatch`
  - **Kiểm kê điều chỉnh (RM-011)**: Kết nối nút `[Kiểm kê]` với `StockAdjustmentModalComponent`
  - Đảm bảo sau khi bất kỳ modal nào đóng thành công $\rightarrow$ gọi `inventoryAlertStateService.refreshAlerts()` để tự động nhảy số thẻ KPI trên Topbar

**Trạm kiểm tra (Checkpoint)**: Mở modal quét camera thành công; các thao tác Nhập lô mới, Xuất hủy, Khóa lô và Kiểm kê cập nhật số liệu kho tức thì mà không cần reload trang.

---

## Phase 6: Tương thích Cảm ứng, Đa Ngôn ngữ Song ngữ (i18n) & Kiểm thử Toàn diện

**Mục tiêu**: Hoàn thiện trải nghiệm responsive trên thiết bị di động/tablet, đồng bộ 100% từ điển song ngữ Tiếng Việt & Tiếng Anh, và xác thực 6 kịch bản kiểm thử.

- [x] T019 [US6] Tối ưu hóa trải nghiệm trên thiết bị di động / máy tính bảng (< 992px):
  - Kiểm tra toàn bộ các nút bấm và icon đạt kích thước vùng chạm touch target tối thiểu 44 × 44px
  - Ngăn kéo trượt Drawer Offcanvas hoạt động mượt mà, chạm nền mờ (backdrop) hoặc nút `[✕]` đóng lại tức thì
  - Hỗ trợ cử chỉ vuốt (swipe-to-close) trên màn hình cảm ứng
- [x] T020 [P] Cập nhật từ điển đa ngôn ngữ song ngữ trong `angular/src/assets/i18n/`:
  - Bổ sung 30+ khóa bản dịch vào `vi.json` (Thủ kho, Ca trực, Cảnh báo hạn dùng, Điều kiện bảo quản, Quét mã vạch...)
  - Bổ sung 30+ khóa bản dịch tương ứng vào `en.json`
- [x] T021 [P] Kiểm thử hồi quy và đối soát 6 kịch bản theo `specs/020-rm-020-inventory-keeper-layout/quickstart.md`:
  - Kịch bản 1: Đăng nhập vai trò `InventoryStaff` tự động vào `/inventory-keeper/dashboard`
  - Kịch bản 2: Bảo vệ phân hệ `inventoryKeeperAuthGuard`, chặn vai trò khác
  - Kịch bản 3: Bố cục 3 vùng, Topbar ca trực và 3 thẻ KPI cảnh báo
  - Kịch bản 4: Quét mã vạch súng quét HID và quét qua Camera HTML5
  - Kịch bản 5: Tác vụ nhanh 1 chạm (Nhập kho, Xuất hủy, Khóa/Mở khóa lô)
  - Kịch bản 6: Drawer Offcanvas trên màn hình < 992px và Touch Target >= 44×44px
- [x] T022 [P] Chạy kiểm tra biên dịch toàn bộ ứng dụng Angular (`npm run build`) đảm bảo không phát sinh lỗi lint hoặc compile error.

**Trạm kiểm tra (Checkpoint)**: Toàn bộ 22 nhiệm vụ hoàn tất; ứng dụng biên dịch thành công 100%; đạt 6/6 kịch bản kiểm thử chất lượng cao.
