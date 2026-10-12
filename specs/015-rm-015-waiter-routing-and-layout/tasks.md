# Danh sách Công việc Triển khai (Tasks): RM-015 Điều hướng & Bố cục Waiter

**Tính năng**: `RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout)`  
**Nhánh (Branch)**: `015-rm-015-waiter-routing-and-layout` | **Ngày**: 2026-10-12  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md)

---

## Phase 1: Nền tảng Dùng chung & Thiết lập (Setup & Foundation)

**Mục tiêu**: Chuẩn bị các mô hình trạng thái, dịch vụ quản lý Sidebar ngữ cảnh động và từ điển bản dịch song ngữ nền tảng cho phân hệ Waiter.

- [x] T001 [P] Khởi tạo mô hình dữ liệu và Enums trong `angular/src/app/waiter/models/waiter-layout.models.ts` (`WaiterShiftType`, `WaiterUserInfo`, `WaiterSidebarState`)
- [x] T002 [P] Xây dựng dịch vụ `WaiterSidebarService` trong `angular/src/app/waiter/services/waiter-sidebar.service.ts` sử dụng Angular Signals (`sidebarTemplate`, `isDrawerOpen`, `activeFilterCount`, `titleKey`, các methods: `registerTemplate`, `clearTemplate`, `openDrawer`, `closeDrawer`, `toggleDrawer`, `setActiveFilterCount`)
- [x] T003 [P] Bổ sung bộ từ điển song ngữ i18n cho toàn bộ nhãn, ca trực, nút tác vụ và drawer của Waiter Layout trong `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json` và `vi.json`

**Trạm kiểm tra (Checkpoint)**: Dịch vụ `WaiterSidebarService` và từ điển bản dịch đã sẵn sàng để cắm ghép vào component layout và các trang con.

---

## Phase 2: User Story 1 - Tự động Điều hướng theo Vai trò sau Đăng nhập (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Đảm bảo nhân viên có vai trò `Waiter` sau khi đăng nhập thành công qua RM-001 được điều hướng trực tiếp vào màn hình sơ đồ bàn mặc định `/waiter/tables`.  
**Kiểm thử Độc lập**: Đăng nhập bằng tài khoản role `Waiter` $\rightarrow$ hệ thống chuyển hướng tức thì vào `/waiter/tables` mà không qua trang chủ hay dashboard quản trị.

- [x] T004 [US1] Cập nhật logic điều hướng theo vai trò sau sự kiện `token_received` trong `angular/src/app/app.component.ts`: chuyển hướng tài khoản có vai trò `Waiter` về `/waiter/tables` (thay thế đường dẫn cũ `/table`)
- [x] T005 [US1] Cấu hình tuyến đường chuyển tiếp mặc định của cụm `/waiter` trong `angular/src/app/app.routes.ts`: `''` tự động chuyển về `tables` và wildcard `'**'` tự động chuyển về `tables`

**Trạm kiểm tra (Checkpoint)**: Luồng đăng nhập của nhân viên phục vụ dẫn thẳng vào không gian làm việc bàn ăn an toàn và tiện lợi.

---

## Phase 3: User Story 2 - Cấu trúc Bố cục Giao diện Waiter Chuyên biệt 3 Vùng (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Xây dựng component bố cục chuyên biệt `WaiterLayoutComponent` gồm Topbar (64px), Sidebar (280px) và Main Content (`<router-outlet>`), loại bỏ hoàn toàn các thanh menu quản trị cồng kềnh của ABP Framework.  
**Kiểm thử Độc lập**: Truy cập `/waiter/tables` $\rightarrow$ quan sát màn hình chia đúng 3 khu vực, Topbar hiển thị tên nhà hàng "Acme.TooHungry", thông tin nhân viên, badge ca trực tự động theo giờ, trạng thái SignalR trực tuyến, và nút lối tắt `[Quay lại Quản trị]` (dành riêng cho Admin/Manager).

- [x] T006 [US2] Khởi tạo component `WaiterLayoutComponent` tại `angular/src/app/waiter/layout/waiter-layout.component.ts`:
  - Khai báo Standalone component, inject `AuthService`, `ConfigStateService`, `OAuthService`, `Router`, `WaiterSidebarService`
  - Tính toán `userInfo` và xác định cờ `canReturnToAdmin = true` khi tài khoản chứa role `Manager` hoặc `Administrator`
  - Thuật toán xác định ca trực tự động theo giờ hệ thống: `09:00 - 15:00` (Ca Sáng), `15:00 - 23:00` (Ca Tối), ngoài giờ (Ngoài ca trực)
  - Xử lý sự kiện `returnToAdmin()` chuyển về `/` và `logout()` nhanh kèm hộp thoại xác nhận
- [x] T007 [US2] Triển khai giao diện HTML trong `angular/src/app/waiter/layout/waiter-layout.component.html`:
  - Topbar cố định 64px chứa logo, portal badge, realtime status, shift badge, user info, nút admin shortcut và nút logout
  - Khung Sidebar desktop chứa slot `<ng-container *ngTemplateOutlet="sidebarService.sidebarTemplate()"></ng-container>`
  - Vùng Main Content chứa `<router-outlet>` cuộn độc lập
- [x] T008 [US2] Xây dựng phong cách giao diện SCSS trong `angular/src/app/waiter/layout/waiter-layout.component.scss` tuân thủ bảng màu nhận diện Cam & Trắng đặc trưng (`#EA580C`, Clean White `#FFFFFF`, Background `#F8FAFC`, Border `#E2E8F0`)

**Trạm kiểm tra (Checkpoint)**: Khung Layout Waiter hiển thị chuyên nghiệp, tối giản, hiển thị đúng ca trực và các nút điều hướng theo vai trò.

---

## Phase 4: User Story 3 - Bộ Gác cổng Tuyến đường (Waiter Auth Guard & Access Control) (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Xây dựng `waiterAuthGuard` bảo vệ toàn bộ cụm tuyến đường `/waiter/*`, chỉ cho phép tài khoản đã xác thực và sở hữu vai trò hoặc quyền phục vụ phù hợp truy cập.  
**Kiểm thử Độc lập**: Truy cập `/waiter/tables` khi chưa đăng nhập $\rightarrow$ chuyển hướng về `/account/login?returnUrl=/waiter/tables`. Đăng nhập bằng tài khoản trái thẩm quyền (ví dụ `InventoryStaff`) $\rightarrow$ từ chối (403) và điều hướng về `/inventory`.

- [x] T009 [US3] Xây dựng bộ gác cổng `waiterAuthGuard` tại `angular/src/app/waiter/guards/waiter-auth.guard.ts`:
  - Kiểm tra `authService.isAuthenticated`; nếu false $\rightarrow$ `router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } })`
  - Kiểm tra vai trò: Cho phép `Waiter`, `Manager`, `Administrator`, `admin`
  - Kiểm tra quyền dự phòng: Cho phép khi có `TooHungry.Tables` hoặc `TooHungry.Orders`
  - Từ chối truy cập và chuyển hướng về trang tương ứng với vai trò nếu không có quyền
- [x] T010 [US3] Tái cấu trúc tuyến đường cụm `/waiter` trong `angular/src/app/app.routes.ts`:
  - Khai báo route cha `path: 'waiter'` sử dụng `WaiterLayoutComponent` và bảo vệ bằng `canActivate: [authGuard, waiterAuthGuard]`
  - Di chuyển các route con `tables` và `order/:tableId` vào danh sách `children` của tuyến đường cha `/waiter`

**Trạm kiểm tra (Checkpoint)**: Cụm route `/waiter/*` được bảo vệ an toàn 100%, ngăn chặn truy cập trái phép ở tầng client.

---

## Phase 5: User Story 4 - Sidebar Ngữ cảnh Động qua Cơ chế Service-driven Portal (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Cắm ghép linh hoạt nội dung bộ lọc của trang Danh sách bàn (`/waiter/tables`) và trang Gọi món (`/waiter/order/:tableId`) vào Sidebar của layout chung thông qua `WaiterSidebarService`.  
**Kiểm thử Độc lập**: Mở `/waiter/tables` $\rightarrow$ Sidebar hiển thị bộ lọc tìm kiếm và trạng thái bàn; chuyển sang `/waiter/order/:tableId` $\rightarrow$ Sidebar tự động chuyển thành Table Info Card và danh mục món mà không làm reload layout.

- [x] T011 [US4] Cập nhật màn hình Danh sách bàn `WaiterTablesComponent` (`angular/src/app/waiter/tables/`):
  - Trong `waiter-tables.component.html`: bọc phần toolbar tìm kiếm, lọc khu vực và lọc trạng thái vào `<ng-template #tablesSidebarFilter>`
  - Trong `waiter-tables.component.ts`: inject `WaiterSidebarService`, đăng ký template tại `ngAfterViewInit()`, giải phóng template tại `ngOnDestroy()`
  - Tối ưu lại phần Main Content của trang bàn chiếm trọn không gian hiển thị của layout
- [x] T012 [US4] Cập nhật màn hình Gọi món `WaiterOrderComponent` (`angular/src/app/waiter/order/`):
  - Trong `waiter-order.component.html`: bọc **Table Information Card** và **Menu Categories** vào `<ng-template #orderSidebarFilter>`
  - Trong `waiter-order.component.ts`: inject `WaiterSidebarService`, đăng ký template tại `ngAfterViewInit()`, giải phóng template tại `ngOnDestroy()`
  - Tối ưu lại phần Main Content hiển thị lưới món ăn và thanh tìm kiếm món

**Trạm kiểm tra (Checkpoint)**: Sidebar tự động đổi nội dung chính xác theo từng trang con, loại bỏ hiện tượng giật màn hình hoặc reload DOM.

---

## Phase 6: User Story 5 - Khả năng Tương thích Thiết bị Cảm ứng & Thu gọn Dạng Drawer (Priority: P2)

**Mục tiêu**: Cung cấp trải nghiệm ngăn kéo trượt (Offcanvas/Drawer) mượt mà trên màn hình tablet portrait hoặc mobile (< 992px), đảm bảo kích thước vùng chạm touch target >= 44×44px.  
**Kiểm thử Độc lập**: Thu nhỏ màn hình < 992px $\rightarrow$ Sidebar ẩn, Topbar hiện nút `[Bộ lọc]`; chạm nút `[Bộ lọc]` $\rightarrow$ Drawer trượt ra từ mép trái; chạm backdrop $\rightarrow$ Drawer tự động đóng.

- [x] T013 [US5] Triển khai cấu trúc ngăn kéo **Offcanvas Drawer** trong `waiter-layout.component.html` và `.scss`:
  - Nút mở `[Bộ lọc]` hiển thị trên Topbar khi màn hình < 992px (kèm badge `activeFilterCount`)
  - Drawer trượt ra từ mép trái với hiệu ứng CSS transform mượt mà (thời gian trượt < 250ms)
  - Lớp nền mờ (Backdrop) che phủ khi Drawer mở, hỗ trợ đóng khi chạm vào backdrop hoặc nút đóng `[✕]`
- [x] T014 [US5] Rà soát và chuẩn hóa kích thước vùng chạm (Touch targets):
  - Đảm bảo toàn bộ các nút trên Topbar, Sidebar, Drawer và các thẻ lọc đạt diện tích tối thiểu 44 × 44px
  - Đảm bảo khoảng cách giữa các phần tử có thể chạm tối thiểu 8px để chống bấm nhầm ngón tay

**Trạm kiểm tra (Checkpoint)**: Trải nghiệm trên máy tính bảng và thiết bị cảm ứng đạt chuẩn touch-first mượt mà và trực quan.

---

## Phase 7: Hoàn thiện Tuyến đường Standalone Thanh toán (RM-016), Đa ngôn ngữ & Kiểm thử (Polish & Verification)

**Mục tiêu**: Bảo đảm tính độc lập của màn hình thanh toán RM-016, kiểm tra tính toàn vẹn đa ngôn ngữ song ngữ và xác thực 100% kịch bản kiểm thử.

- [x] T015 [P] Cấu hình tuyến đường Standalone cho Màn hình Thanh toán RM-016 trong `angular/src/app/app.routes.ts`:
  - Cấu hình route `/payment/:orderId` ở cấp App độc lập, hoàn toàn không kế thừa `WaiterLayoutComponent`
  - Cấu hình alias `/waiter/payment/:orderId` tự động redirect về `/payment/:orderId`
- [x] T016 [P] Cập nhật bản dịch đa ngôn ngữ cho toàn bộ các nhãn mới trong cả backend `Domain.Shared/Localization/TooHungry/` và frontend `assets/localization/` (`vi.json`, `en.json`)
- [x] T017 Kiểm tra biên dịch toàn bộ dự án Angular (`cd angular && npm run build`) và xử lý dứt điểm các lỗi biên dịch hoặc cảnh báo linter
- [x] T018 Thực hiện kiểm thử thủ công End-to-End theo toàn bộ 6 kịch bản trong `quickstart.md` và kiểm tra chéo các yêu cầu chức năng (FR-001 đến FR-018)
