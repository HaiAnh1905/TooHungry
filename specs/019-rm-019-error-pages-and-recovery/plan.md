# Kế hoạch Triển khai (Implementation Plan): RM-019 Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing)

**Nhánh (Branch)**: `019-rm-019-error-pages-and-recovery` | **Ngày**: 2026-10-19 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/019-rm-019-error-pages-and-recovery/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 19-10-2026 với 6 quyết định kiến trúc & vận hành then chốt:
1. **Kiến trúc màn hình lỗi toàn trang (Full-page Layout)**: Chuyển toàn trang sang layout riêng biệt (`eLayoutType.empty`) cho `/error/403`, `/error/500`, `/error/505` và Wildcard `**` (404).
2. **Bộ nút hành động đầy đủ**: Nút chính `[Quay về trang chính của tôi]` (phân giải theo vai trò), nút phụ `[Quay lại trang trước]` (Browser Back an toàn) và nút `[Thử lại]` (cho lỗi 500/505).
3. **Thanh tiến trình đếm ngược 5 giây trực quan (Linear Progress Bar)**: Co dần từ 100% về 0% phía trên nút bấm; hỗ trợ nút `[Tạm dừng]` / `[Tiếp tục]`, tự động dừng khi hover và khi chuyển tab (`document.hidden`).
4. **Quy tắc phân giải trang làm việc theo vai trò (Role-based Recovery Resolution)**: `Waiter` -> `/waiter/tables`, `Manager`/`Admin` -> `/`, `Cashier` -> `/tables`, `InventoryStaff` -> `/inventory`, Khách -> `/account/login` hoặc `/`.
5. **Thiết kế Bento Card hiện đại Cam & Trắng (`#EA580C`)**: Minh họa Vector SVG riêng cho từng mã lỗi (Bàn trống / Ổ khóa / Dây cáp gián đoạn), bo góc lớn `rounded-2xl`, responsive tối ưu mọi thiết bị.
6. **100% Quốc tế hóa (i18n)**: Khai báo song ngữ đầy đủ trong `vi.json` và `en.json`.

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing) (RM-019)** thuộc phân hệ Dùng chung (Shared, Wave 4). Tính năng này cung cấp giải pháp toàn diện để bắt và xử lý thẩm mỹ các mã lỗi phổ biến trong quá trình vận hành nhà hàng (`404 Not Found`, `403 Forbidden`, `500 Internal Server Error`, `505 HTTP Version Not Supported`), thay thế hoàn toàn các màn hình lỗi mặc định thô sơ bằng giao diện Bento Card hiện đại chuẩn nhận diện Cam & Trắng (`#EA580C`), đồng thời tích hợp cơ chế tự động phục hồi thông minh theo vai trò người dùng (Waiter, Manager, Admin, Cashier, InventoryStaff) sau 5 giây đếm ngược mượt mà.

### Các mục tiêu kiến trúc cốt lõi:
1. **Dịch vụ Định tuyến Phục hồi theo Vai trò (`UserRoleNavigationService`)**:
   - Dịch vụ tập trung truy xuất `currentUser.roles` từ ABP `ConfigStateService` để chỉ định chính xác URL trang chính của từng đối tượng người dùng.
   - Ưu tiên vai trò cấp cao (Manager/Admin -> `/`) khi tài khoản sở hữu nhiều quyền đồng thời.
2. **Thành phần Giao diện Lỗi Độc lập (`ErrorPageComponent`)**:
   - Standalone Angular Component tái sử dụng linh hoạt cho cả 4 mã lỗi `404`, `403`, `500`, `505` dựa trên Route Data hoặc Input parameters.
   - Layout toàn trang (`eLayoutType.empty`), không bị che khuất bởi Topbar hoặc Sidebar thông thường.
3. **Bộ Đếm Ngược 5 Giây Thông Minh & Có Kiểm Soát (Smart 5s Countdown Timer)**:
   - Thanh tiến trình đếm ngược (Linear Progress Bar) màu cam `#EA580C` co dần từ 100% về 0% trong 5 giây.
   - Tự động tạm ngưng khi người dùng rê chuột (hover) vào thẻ lỗi, khi bấm nút `[Tạm dừng]`, hoặc khi tab bị ẩn (`document.hidden`).
   - Tự động kích hoạt chuyển hướng về trang làm việc khi hết 5 giây không có tương tác can thiệp.
4. **Bộ Nút Điều Hướng Trực Quan (Primary & Secondary Actions)**:
   - Nút chính (Primary CTA): `[Quay về trang chính của tôi]` (nhãn thay đổi linh hoạt theo vai trò: Danh sách bàn, Dashboard, Đăng nhập...).
   - Nút phụ 1: `[Quay lại trang trước]` (`Location.back()` có kiểm tra an toàn tránh lặp).
   - Nút phụ 2 (Lỗi 500/505): `[Thử lại]` (`window.location.reload()` hoặc kích hoạt lại request) và nút `[Sao chép mã lỗi Trace ID]`.
5. **Đón Bắt Lỗi Toàn Diện Trong Angular & ABP**:
   - Bổ sung Wildcard route `**` trong `app.routes.ts` dẫn về `ErrorPageComponent` (mã 404).
   - Tích hợp với `smartPermissionGuard` để chuyển hướng mượt về `/error/403` khi người dùng bị hạn chế quyền.
   - Đăng ký tuyến đường chuyên biệt `/error/403` và `/error/500`.
6. **100% Quốc tế hóa Song ngữ Toàn diện (i18n)**:
   - Cung cấp đầy đủ từ điển song ngữ trong cả `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: TypeScript 5.x, Angular 19+, ABP Framework 9.x
- **Kiến trúc Frontend**: Angular Standalone Components, Signal Reactive State (`signal`, `computed`, `effect`), RxJS Observables, Angular Router, Angular Common `Location`
- **Thư viện tích hợp**: `@abp/ng.core` (`ConfigStateService`, `AuthService`, `LocalizationService`), FontAwesome Free icons
- **Nền tảng đích**: Web application hỗ trợ đa thiết bị (Máy tính để bàn POS, Máy tính bảng iPad/Android của nhân viên phục vụ, Điện thoại di động)
- **Ràng buộc Hiệu năng**:
  - Thời gian khởi tạo và render trang lỗi < 100ms
  - Khung hình chuyển động thanh tiến trình đếm ngược đạt 60fps
  - Kích thước vùng bấm cảm ứng tối thiểu 44 × 44px
- **Ràng buộc Thương hiệu & I18N**:
  - Nhận diện Cam & Trắng (`#EA580C`, nền `#F8FAFC`, bề mặt thẻ `#FFFFFF`, điểm nhấn `#FFF7ED`)
  - 100% chuỗi hiển thị được nạp qua `abpLocalization` pipe hoặc `LocalizationService`

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - RM-019 là tính năng thuộc tầng UI Shared & Router Infrastructure, không can thiệp vào nghiệp vụ Entity Domain nhưng kế thừa hoàn hảo hệ thống vai trò `currentUser.roles` từ ABP Identity (RM-003).
- [x] **II. UML & Domain Model Alignment**:
  - Khớp với mô hình kiến trúc phân quyền và luồng vận hành người dùng trong `RMS-TH.vpp` và `docs/roadmap.md`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Đảm bảo kiểm thử tự động độc lập: Unit test `UserRoleNavigationService`, kiểm thử logic đếm ngược và chuyển hướng của `ErrorPageComponent`, kiểm thử cấu hình route wildcard.
- [x] **IV. Hợp đồng API & Tích hợp Module**:
  - Xác định rõ ràng hợp đồng component inputs/outputs, route definitions và service interfaces.
- [x] **V. Bảo mật & Phân quyền**:
  - Trang lỗi không lộ thông tin nhạy cảm của hệ thống; mã lỗi 500/505 chỉ hiển thị Trace ID đối soát; quyền hạn được bảo toàn qua `smartPermissionGuard`.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Thiết kế Bento Card bo góc lớn `rounded-2xl`, hiệu ứng Glassmorphism tinh tế, minh họa SVG màu cam ấm `#EA580C`.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% tiêu đề, mô tả, nhãn nút và thông báo đếm ngược có đầy đủ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ kỹ thuật (spec, plan, research, data-model, quickstart, contracts) được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (specs/)
```text
specs/019-rm-019-error-pages-and-recovery/
├── spec.md                            # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật Angular Wildcard, Location.back, Timer, document.hidden
├── data-model.md                      # Thiết kế State Signals, Enum, Interfaces và từ điển i18n
├── quickstart.md                      # Hướng dẫn kiểm thử 6 kịch bản lỗi và điều hướng phục hồi
├── contracts/
│   └── error-page-contracts.md        # Hợp đồng Component, Service Interfaces, Router definitions
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Triển khai & Cập nhật
```text
angular/src/
├── app/
│   ├── shared/
│   │   ├── services/
│   │   │   └── user-role-navigation.service.ts   # Service xác định URL và label đích theo vai trò
│   │   ├── components/
│   │   │   └── error-page/                       # Thành phần giao diện báo lỗi dùng chung
│   │   │       ├── error-page.component.ts       # Standalone component logic đếm ngược 5s, hover, copy Trace ID
│   │   │       ├── error-page.component.html     # Bento Card layout, SVG vector art, Progress bar, Buttons
│   │   │       └── error-page.component.scss     # CSS styling Cam & Trắng, Glassmorphism, animations
│   │   └── guards/
│   │       └── smart-permission.guard.ts         # Cập nhật chuyển hướng mềm sang /error/403 khi bị từ chối
│   └── app.routes.ts                             # Cấu hình routes: /error/403, /error/500, và wildcard **
└── assets/
    └── localization/
        ├── vi.json                               # Khóa từ điển Tiếng Việt ErrorPages.*
        └── en.json                               # Khóa từ điển Tiếng Anh ErrorPages.*
```

---

## Lộ trình Triển khai Chi tiết (Phased Execution Timeline)

### Giai đoạn 1: Dịch vụ Phục hồi Điều hướng theo Vai trò (`UserRoleNavigationService`) (P1)
1. **Xây dựng `user-role-navigation.service.ts`**:
   - Tiêm phụ thuộc `ConfigStateService`, `AuthService`, `Router`.
   - Triển khai phương thức `getDefaultHomeRoute(): string`:
     - Nếu `!authService.isAuthenticated`: trả về `/` (hoặc `/account/login`).
     - Lấy `currentUser = configState.getOne('currentUser')`.
     - Phân tích mảng `roles = currentUser?.roles || []`:
       + Nếu có `Manager`, `Administrator`, `admin`:
         * Kiểm tra quyền `TooHungry.Dashboard` qua `permissionService.getGrantedPolicy('TooHungry.Dashboard')`.
         * Nếu có quyền: trả về `/` (Dashboard).
         * Nếu không có quyền: kiểm tra quyền tiếp theo (`TooHungry.Tables` -> `/tables`, `TooHungry.Orders` -> `/orders`, `TooHungry.Dishes` -> `/dishes`, `TooHungry.Inventories` -> `/inventory`, `AbpIdentity.Users` -> `/identity/users`).
         * Fallback nếu không có quyền nào: `/account/login`.
       + Nếu có `Waiter`: trả về `/waiter/tables`.
       + Nếu có `Cashier`: trả về `/table/layout` (hoặc `/tables`).
       + Nếu có `InventoryStaff`: trả về `/inventory`.
       + Mặc định: trả về `/`.
   - Triển khai phương thức `getDefaultHomeLabelKey(): string`:
     - Trả về khóa bản dịch tương ứng (`ErrorPages.BackToDashboard`, `ErrorPages.BackToTableManagement`, `ErrorPages.BackToOrders`, `ErrorPages.BackToTableList`, `ErrorPages.BackToLogin`...).

### Giai đoạn 2: Thành phần Giao diện Báo lỗi Hiện đại (`ErrorPageComponent`) (P1)
1. **Logic Component (`error-page.component.ts`)**:
   - Sử dụng Angular Signals để quản lý trạng thái:
     - `countdown = signal(5)`
     - `isPaused = signal(false)`
     - `progressPercent = computed(() => (this.countdown() / this.initialDuration) * 100)`
     - `copied = signal(false)`
   - Vòng đời đếm ngược: Khởi tạo `setInterval` 100ms hoặc 1000ms đếm ngược từ 5 về 0.
   - Bắt sự kiện hover: `@HostListener('mouseenter')` tạm dừng, `@HostListener('mouseleave')` tiếp tục nếu người dùng chưa bấm nút Pause thủ công.
   - Bắt sự kiện chuyển tab: Lắng nghe `document.visibilitychange`, tạm ngưng khi `document.hidden === true`.
   - Hành động nút:
     - `goHome()`: Dừng timer và gọi `router.navigate([roleNavService.getDefaultHomeRoute()])`.
     - `goBack()`: Dừng timer, kiểm tra an toàn và gọi `location.back()`.
     - `retry()`: Dừng timer, gọi `window.location.reload()`.
     - `togglePause()`: Đảo trạng thái `isPaused`.
     - `copyTraceId()`: Gọi `navigator.clipboard.writeText(...)` và bật signal `copied` trong 2s.
   - Hủy an toàn trong `ngOnDestroy`: Dọn dẹp toàn bộ timers và event listeners, chống memory leak.
2. **Giao diện HTML (`error-page.component.html`)**:
   - Khung thẻ Bento Card trung tâm nổi bật trên nền Gradient mềm mại Cam - Trắng.
   - Minh họa Vector SVG sắc nét độc quyền cho từng mã lỗi:
     - 404: Đĩa ăn trống bo viền cam và kim la bàn.
     - 403: Ổ khóa bảo mật phân quyền với khiên hộ thân.
     - 500/505: Nồi súp quá nhiệt bốc khói / Đầu cắm cáp dữ liệu bếp bị rút.
   - Khối tiêu đề và mô tả giải thích thân thiện, dễ hiểu.
   - Khối Trace ID đối soát (cho 500/505) kèm nút sao chép nhanh.
   - Thanh tiến trình đếm ngược mỏng tinh tế (`Linear Progress Bar`) nằm ngay phía trên khối nút hành động.
   - Hàng nút hành động:
     - Nút chính `[Quay về trang làm việc]` (màu cam gradient nổi bật).
     - Nút phụ `[Quay lại trang trước]` (outline xám viền mỏng).
     - Nút phụ `[Thử lại]` (nếu là lỗi 500/505).
     - Nút nhỏ `[Tạm dừng / Tiếp tục]` cạnh đồng hồ đếm ngược.
3. **Styling SCSS (`error-page.component.scss`)**:
   - Hiệu ứng Glassmorphism (`backdrop-filter: blur(12px)`, viền `rgba(234, 88, 12, 0.15)`).
   - Animation thanh tiến trình co mượt mà (`transition: width 1s linear`).
   - Micro-animation lơ lửng nhẹ (float animation) cho icon minh họa SVG.
   - Tối ưu hóa chuẩn cảm ứng (touch-target >= 44×44px) và responsive hoàn hảo từ Mobile (360px) đến Desktop POS (1920px).

### Giai đoạn 3: Cấu hình Tuyến đường & Tích hợp Bộ Gác cổng (P1)
1. **Cập nhật `app.routes.ts`**:
   - Thêm tuyến đường chuyên biệt `/error/403` với `data: { status: 403, layout: eLayoutType.empty }`.
   - Thêm tuyến đường chuyên biệt `/error/500` với `data: { status: 500, layout: eLayoutType.empty }`.
   - Thêm Wildcard route `**` ở cuối danh sách route với `data: { status: 404, layout: eLayoutType.empty }`.
2. **Cập nhật `smart-permission.guard.ts`**:
   - Thay vì chỉ ghi log hoặc hiển thị dialog lỗi khi từ chối quyền, guard sẽ chuyển hướng mềm sang `/error/403`:
     ```typescript
     return router.parseUrl('/error/403');
     ```

### Giai đoạn 4: Quốc tế hóa (i18n) & Kiểm thử Xác thực (P1)
1. **Đồng bộ Từ điển Ngôn ngữ**:
   - Bổ sung nhóm từ khóa `"ErrorPages"` vào `angular/src/assets/localization/vi.json`.
   - Bổ sung nhóm từ khóa `"ErrorPages"` vào `angular/src/assets/localization/en.json`.
2. **Kiểm thử Tự động & Thủ công**:
   - Kiểm thử đơn vị (Unit Tests) cho `UserRoleNavigationService`.
   - Kiểm thử luồng 404 (truy cập URL rác như `/something-random`).
   - Kiểm thử luồng 403 (đăng nhập Waiter truy cập `/identity/users`).
   - Kiểm thử luồng 500 (truy cập `/error/500`).
   - Kiểm thử đồng hồ đếm ngược 5 giây, hover tạm dừng, unhover tiếp tục, nút bấm chuyển trang tức thì.
   - Kiểm thử hiển thị trên Desktop, iPad Tablet và Mobile.
   - Đảm bảo `ng build` hoặc `ng test` không có lỗi.
