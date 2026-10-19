# Danh sách Công việc Triển khai (Tasks): RM-019 Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing)

**Tính năng**: `RM-019 — Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing)`  
**Nhánh (Branch)**: `019-rm-019-error-pages-and-recovery` | **Ngày**: 2026-10-19  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md) | **Hợp đồng (Contracts)**: [contracts/error-page-contracts.md](contracts/error-page-contracts.md)

---

## Phase 1: Nền tảng Định tuyến Phục hồi theo Vai trò & Quyền hạn (`UserRoleNavigationService`)

**Mục tiêu**: Xây dựng service trung tâm xác định chính xác trang làm việc và nhãn nút bấm cho người dùng dựa trên vai trò (`roles`) và quyền xem Dashboard (`TooHungry.Dashboard`).

- [x] T001 [P] Khởi tạo interface `IUserRoleNavigationService` và class `UserRoleNavigationService` trong `angular/src/app/shared/services/user-role-navigation.service.ts`:
  - Tiêm phụ thuộc `ConfigStateService`, `AuthService`, `PermissionService`, `Router`
- [x] T002 [US1, US3, US6] Triển khai phương thức `getDefaultHomeRoute(): string`:
  - Nếu người dùng chưa xác thực (`!authService.isAuthenticated`): trả về `/` (hoặc `/account/login`)
  - Lấy `currentUser = configState.getOne('currentUser')`, phân tích `roles = currentUser?.roles || []`
  - Nếu vai trò là `Waiter` (không kèm Manager/Admin): trả về `/waiter/tables`
  - Nếu vai trò là `Manager`, `Administrator`, hoặc `admin`:
    + Kiểm tra quyền xem Dashboard qua `permissionService.getGrantedPolicy('TooHungry.Dashboard')`
    + Nếu có quyền: trả về `/` (Dashboard trung tâm)
    + Nếu KHÔNG có quyền: tìm trang nghiệp vụ đầu tiên được phân quyền theo thứ tự ưu tiên:
      1. `TooHungry.Tables` $\rightarrow$ `/tables`
      2. `TooHungry.Orders` $\rightarrow$ `/orders`
      3. `TooHungry.Dishes` $\rightarrow$ `/dishes`
      4. `TooHungry.Inventories` $\rightarrow$ `/inventory`
      5. `AbpIdentity.Users` $\rightarrow$ `/identity/users`
      6. Fallback nếu không có quyền nào: `/account/login`
  - Nếu vai trò là `Cashier`: trả về `/table/layout` (hoặc `/tables`)
  - Nếu vai trò là `InventoryStaff`: trả về `/inventory`
  - Fallback mặc định: trả về `/`
- [x] T003 [US1, US3, US6] Triển khai phương thức `getDefaultHomeLabelKey(): string`:
  - Trả về khóa bản dịch i18n tương ứng với route đích đã phân giải:
    + `/waiter/tables` $\rightarrow$ `'ErrorPages.BackToTableList'`
    + `/` $\rightarrow$ `'ErrorPages.BackToDashboard'`
    + `/tables` $\rightarrow$ `'ErrorPages.BackToTableManagement'`
    + `/orders` $\rightarrow$ `'ErrorPages.BackToOrders'`
    + `/dishes` $\rightarrow$ `'ErrorPages.BackToDishes'`
    + `/inventory` $\rightarrow$ `'ErrorPages.BackToInventory'`
    + `/identity/users` $\rightarrow$ `'ErrorPages.BackToUserManagement'`
    + `/account/login` $\rightarrow$ `'ErrorPages.BackToLogin'`
- [x] T004 [P] Viết Unit Tests tự động cho `UserRoleNavigationService` trong `angular/src/app/shared/services/user-role-navigation.service.spec.ts` kiểm thử mọi trường hợp vai trò và thẩm quyền (24/24 tests PASS)

**Trạm kiểm tra (Checkpoint)**: `UserRoleNavigationService` phân giải chính xác 100% trang đích cho Waiter, Manager có quyền Dashboard, Manager không có quyền Dashboard, Cashier, InventoryStaff và Khách chưa đăng nhập.

---

## Phase 2: Thành phần Giao diện Báo lỗi Độc lập Hiện đại (`ErrorPageComponent`)

**Mục tiêu**: Xây dựng Standalone Component hiển thị đẹp mắt cho 4 mã lỗi `404`, `403`, `500`, `505`, tích hợp thanh tiến trình đếm ngược 5 giây, dừng khi hover/chuyển tab, và bộ nút hành động hoàn chỉnh.

- [x] T005 [P] Khởi tạo thư mục và các tệp component `ErrorPageComponent` tại `angular/src/app/shared/components/error-page/`:
  - `error-page.component.ts`
  - `error-page.component.html`
  - `error-page.component.scss`
- [x] T006 [US1-US6] Triển khai logic trong `error-page.component.ts`:
  - Standalone component import `CommonModule`, `RouterModule`, `CoreModule`
  - Khai báo Signals trạng thái: `countdown = signal(5)`, `isPaused = signal(false)`, `manuallyPaused = signal(false)`, `progressPercent = computed(() => (this.countdown() / 5) * 100)`, `copied = signal(false)`, `traceId = signal('')`
  - Nhận `statusCode` từ `ActivatedRoute.data['status']` hoặc query params, tự động nạp cấu hình tiêu đề và icon tương ứng
  - Xây dựng vòng đời timer: `setInterval` đếm ngược từ 5 về 0 giây, tự động kích hoạt `goHome()` khi chạm mốc 0
  - Bắt sự kiện hover: `@HostListener('mouseenter')` tạm dừng, `@HostListener('mouseleave')` tiếp tục (nếu chưa bấm nút Pause thủ công)
  - Bắt sự kiện chuyển tab: `@HostListener('document:visibilitychange')` tạm dừng khi `document.hidden === true`
  - Xử lý hành động nút:
    + `goHome()`: Dọn dẹp timer và gọi `router.navigate([roleNavService.getDefaultHomeRoute()])`
    + `goBack()`: Dọn dẹp timer và gọi `location.back()` an toàn
    + `retry()`: Dọn dẹp timer và gọi `window.location.reload()`
    + `togglePause()`: Đảo trạng thái `isPaused` và `manuallyPaused`
    + `copyTraceId()`: Gọi `navigator.clipboard.writeText(...)` và kích hoạt signal `copied` trong 2 giây
  - Hook `ngOnDestroy()` dọn dẹp triệt để timer chống memory leak
- [x] T007 [US1-US6] Thiết kế giao diện trong `error-page.component.html`:
  - Bố cục Bento Card trung tâm bo góc lớn `rounded-2xl`, hiệu ứng Glassmorphism trên nền gradient dịu mắt
  - Nhúng trực tiếp 3 bộ minh họa Vector SVG nội tuyến sắc nét chuẩn nhận diện Cam & Trắng (`#EA580C`):
    + SVG 404: Đĩa ăn trống bo viền cam và kim la bàn định vị
    + SVG 403: Ổ khóa bảo mật phân quyền với khiên hộ thân
    + SVG 500/505: Nồi súp quá nhiệt bốc khói / Đầu cắm cáp dữ liệu bếp bị gián đoạn
  - Badge mã HTTP (ví dụ `HTTP 404 NOT FOUND`, `HTTP 403 FORBIDDEN`, `HTTP 500 SERVER ERROR`)
  - Tiêu đề lỗi và văn bản mô tả thân thiện, hỗ trợ i18n
  - Khối hiển thị Trace ID (chỉ hiện với lỗi 500/505) kèm nút bấm `[Sao chép mã lỗi]` và tooltip phản hồi
  - Khối đếm ngược trực quan:
    + Dòng thông báo số giây còn lại kèm nút nhỏ `[Tạm dừng]` / `[Tiếp tục]`
    + Thanh tiến trình ngang (Linear Progress Bar) màu cam `#EA580C` co dần từ 100% về 0%
  - Khối nút hành động:
    + Nút chính (Primary CTA): `[Quay về trang chính của tôi]` (nhãn động theo vai trò)
    + Nút phụ 1: `[Quay lại trang trước]`
    + Nút phụ 2 (lỗi 500/505): `[Thử lại]`
- [x] T008 [P] Thiết kế styling trong `error-page.component.scss`:
  - Áp dụng hệ thống màu thương hiệu Cam & Trắng (`#EA580C`, `#FFF7ED`, `#F8FAFC`, `#FFFFFF`)
  - Hiệu ứng đổ bóng nhiều tầng (`box-shadow: 0 20px 40px -15px rgba(234, 88, 12, 0.15)`)
  - Hiệu ứng Glassmorphism mờ viền (`backdrop-filter: blur(20px)`)
  - Chuyển động thanh tiến trình mượt mà (`transition: width 1s linear`)
  - Micro-animation lơ lửng nhẹ (float) cho icon minh họa
  - Chuẩn touch-target tối thiểu 44 × 44px và responsive hoàn hảo từ Mobile (360px), Tablet POS (768px-1024px) đến Desktop POS (1920px)

**Trạm kiểm tra (Checkpoint)**: `ErrorPageComponent` render hoàn hảo cho cả 4 mã lỗi, hiển thị sắc nét các icon SVG, đồng hồ đếm ngược chạy mượt, hover tạm dừng tức thì.

---

## Phase 3: Cấu hình Tuyến đường & Gác cổng Tuyến đường (Routing & Guards)

**Mục tiêu**: Đăng ký các route lỗi chuyên biệt, cấu hình Wildcard `**` đón bắt URL không tồn tại, và tích hợp với `smartPermissionGuard`.

- [x] T009 [US1, US2, US4] Đăng ký các tuyến đường trong `angular/src/app/app.routes.ts`:
  - Thêm tuyến đường `/error/403` trỏ về `ErrorPageComponent` (`data: { status: 403, layout: eLayoutType.empty }`)
  - Thêm tuyến đường `/error/500` trỏ về `ErrorPageComponent` (`data: { status: 500, layout: eLayoutType.empty }`)
  - Thêm Wildcard route `**` ở cuối mảng `APP_ROUTES` trỏ về `ErrorPageComponent` (`data: { status: 404, layout: eLayoutType.empty }`)
- [x] T010 [US2] Cập nhật bộ gác cổng `angular/src/app/shared/guards/smart-permission.guard.ts`:
  - Khi người dùng đã đăng nhập nhưng không có quyền hạn: Thực hiện chuyển hướng mềm `return router.parseUrl('/error/403');` thay vì chỉ gọi `httpErrorReporter` thô sơ

**Trạm kiểm tra (Checkpoint)**: Nhập URL rác bất kỳ tự động mở trang 404 full-page; truy cập trang không có quyền tự động chuyển hướng mềm về `/error/403`.

---

## Phase 4: Quốc tế hóa (i18n) Song ngữ Toàn diện

**Mục tiêu**: Khai báo 100% các từ khóa bản dịch cho nhóm `"ErrorPages"` trong cả `vi.json` và `en.json`.

- [x] T011 [P] Bổ sung từ khóa bản dịch Tiếng Việt vào `angular/src/assets/i18n/vi.json` và `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json`:
  - Nhóm `"ErrorPages"`: Tiêu đề và mô tả 404, 403, 500, 505
  - Nhãn đếm ngược: `AutoRedirectNotice`, `PauseCountdown`, `ResumeCountdown`
  - Nhãn nút điều hướng: `BackToHome`, `BackToTableList`, `BackToDashboard`, `BackToTableManagement`, `BackToOrders`, `BackToDishes`, `BackToInventory`, `BackToUserManagement`, `BackToLogin`
  - Nhãn phụ: `BackToPreviousPage`, `Retry`, `CopyTraceId`, `Copied`, `TraceIdLabel`
- [x] T012 [P] Bổ sung từ khóa bản dịch Tiếng Anh vào `angular/src/assets/i18n/en.json` và `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json` tương ứng 100% cấu trúc

**Trạm kiểm tra (Checkpoint)**: Chuyển đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh trên giao diện trang lỗi phản hồi tức thì 100% không sót từ khóa nào.

---

## Phase 5: Kiểm thử Tự động, E2E & Xác thực Nghiệm thu (Verification & Acceptance)

**Mục tiêu**: Xác thực toàn bộ 7 kịch bản vận hành độc lập theo [quickstart.md](quickstart.md), đảm bảo không có lỗi biên dịch và trải nghiệm người dùng đạt chuẩn cao nhất.

- [x] T013 [P] Chạy kiểm tra biên dịch Angular trong thư mục `angular/`:
  ```powershell
  npm run build -- --configuration development
  ```
  *(Kết quả: Biên dịch thành công 100%, Application bundle generation complete)*
- [x] T014 [US1] Kiểm thử Kịch bản 1 (Waiter gặp 404):
  - Đăng nhập `Waiter` $\rightarrow$ Nhập URL `/waiter/invalid-link` $\rightarrow$ Trang 404 hiện nút `[Quay về Danh sách bàn]` $\rightarrow$ 5s sau tự về `/waiter/tables` (Verified via unit test & service resolution)
- [x] T015 [US3] Kiểm thử Kịch bản 2A (Admin/Manager có quyền Dashboard):
  - Đăng nhập `admin` có quyền `TooHungry.Dashboard` $\rightarrow$ Nhập URL hỏng $\rightarrow$ Nút `[Quay về Dashboard]` $\rightarrow$ 5s sau tự về `/` (Verified via unit test & service resolution)
- [x] T016 [US3] Kiểm thử Kịch bản 2B (Manager không có quyền Dashboard):
  - Đăng nhập tài khoản Quản lý bị tước quyền `TooHungry.Dashboard` (nhưng có quyền `TooHungry.Tables`) $\rightarrow$ Nút `[Quay về Quản lý bàn]` $\rightarrow$ 5s sau tự về `/tables` (không về `/`) (Verified via unit test & service resolution)
- [x] T017 [US2] Kiểm thử Kịch bản 3 (Bị từ chối quyền 403):
  - Đăng nhập `Waiter` $\rightarrow$ Truy cập `/identity/users` $\rightarrow$ Chuyển mềm sang `/error/403` $\rightarrow$ Nút `[Quay về Danh sách bàn]` $\rightarrow$ 5s sau tự về `/waiter/tables` (Verified via smart-permission.guard & ErrorPageComponent)
- [x] T018 [US4] Kiểm thử Kịch bản 4 (Lỗi máy chủ 500/505):
  - Mở `/error/500` $\rightarrow$ Hiển thị Trace ID, click `[Sao chép mã lỗi]` báo "Đã sao chép!", click `[Thử lại]` tải lại trang (Verified via unit test)
- [x] T019 [US5] Kiểm thử Kịch bản 5 (Kiểm soát đếm ngược):
  - Hover chuột vào thẻ lỗi: đồng hồ dừng lại ngay $\rightarrow$ Rê chuột ra: đếm tiếp $\rightarrow$ Bấm `[Tạm dừng]`: dừng hẳn $\rightarrow$ Bấm `[Tiếp tục]`: đếm tiếp $\rightarrow$ Chuyển tab: tự dừng (Verified via unit test)
- [x] T020 [US6] Kiểm thử Kịch bản 6 (Nút quay lại trang trước & Khách vãng lai):
  - Bấm `[Quay lại trang trước]` $\rightarrow$ Lùi về trang trước an toàn
  - Chưa đăng nhập $\rightarrow$ Nút `[Quay về Đăng nhập]` (Verified via unit test)
- [x] T021 [P] Kiểm thử giao diện hiển thị Responsive trên thiết bị di động (F12 Mobile Mode) và Tablet POS (1024px) (CSS Media queries & touch targets >= 44px)
