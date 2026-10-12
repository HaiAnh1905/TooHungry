# Kế hoạch Triển khai (Implementation Plan): RM-015 Điều hướng & Bố cục Waiter

**Nhánh (Branch)**: `015-rm-015-waiter-routing-and-layout` | **Ngày**: 2026-10-12 | **Đặc tả (Spec)**: [specs/015-rm-015-waiter-routing-and-layout/spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/015-rm-015-waiter-routing-and-layout/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 12-10-2026.

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Điều hướng & Bố cục Waiter (Waiter Routing & Layout) (RM-015)** thuộc phân hệ Nhân viên phục vụ (Waiter, Wave 2). Tính năng này cung cấp hạ tầng khung giao diện ứng dụng (Application Shell) chuyên biệt cho toàn bộ quy trình vận hành bàn và gọi món tại chỗ của Acme.TooHungry, đồng thời thiết lập cơ chế định tuyến dựa trên vai trò (Role-based Routing) và bộ gác cổng bảo mật (`waiterAuthGuard`).

Các mục tiêu kiến trúc cốt lõi:
1. **Tự động điều hướng sau đăng nhập (Role-based Navigation)**: Khi người dùng có vai trò `Waiter` đăng nhập qua RM-001, hệ thống lập tức chuyển hướng vào tuyến đường mặc định `/waiter/tables`.
2. **Khung Layout Waiter Chuyên biệt 3 phân vùng (`WaiterLayoutComponent`)**:
   - **Topbar (64px)**: Logo nhà hàng, thông tin nhân viên, badge ca trực tính toán tự động theo thời gian thực (09:00 - 15:00 và 15:00 - 23:00), trạng thái kết nối SignalR trực tuyến, nút lối tắt `[Quay lại Quản trị]` (dành riêng cho Admin/Manager) và nút `[Đăng xuất]`.
   - **Sidebar Ngữ cảnh Động (Dynamic Contextual Sidebar, 280px)**: Dành riêng cho Tìm kiếm & Bộ lọc (Search/Filter), hoạt động theo mô hình Service-driven Portal (`WaiterSidebarService`).
   - **Main Content**: Vùng hiển thị trung tâm độc lập qua `<router-outlet>`.
3. **Bộ Gác cổng Tuyến đường (`waiterAuthGuard`)**: Bảo vệ toàn bộ cụm `/waiter/*`, chỉ cho phép `Waiter`, `Manager`, `Administrator` truy cập; chuyển hướng tài khoản chưa đăng nhập về trang Login kèm `returnUrl`; từ chối và cảnh báo 403 đối với tài khoản không đúng thẩm quyền.
4. **Trải nghiệm Responsive Drawer trên Tablet / Mobile (< 992px)**: Tự động chuyển đổi Sidebar thành ngăn kéo trượt (Offcanvas/Drawer) mở qua nút `[Bộ lọc]` trên Topbar, hỗ trợ đóng qua backdrop và đáp ứng chuẩn touch target >= 44×44px.
5. **Định tuyến độc lập cho Màn hình Thanh toán (RM-016)**: Tách `/payment/:orderId` thành route độc lập cấp App (Standalone Layout), không bị áp đặt Topbar và Sidebar của Waiter.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Phiên bản**: TypeScript 5.x, Node.js 20.x, Angular 19+
- **Kiến trúc Frontend**: Angular Standalone Components, Signal State Management, TemplateRef Portals, CanActivateFn Guards, RxJS
- **Thư viện tích hợp**: `@abp/ng.core` (`AuthService`, `ConfigStateService`), `@abp/ng.theme.shared`, FontAwesome Free icons
- **Nền tảng đích**: Web application tối ưu hóa cảm ứng (iPad/Tablet, màn hình POS cảm ứng, Laptop/Desktop)
- **Mục tiêu hiệu suất**:
  - Thời gian khởi tạo `WaiterLayoutComponent` < 150ms
  - Chuyển đổi ngữ cảnh Sidebar giữa các trang con < 50ms
  - Hiệu ứng trượt Drawer Offcanvas đạt 60fps, thời gian mở/đóng < 250ms
- **Ràng buộc**:
  - Tuân thủ nghiêm ngặt Hiến pháp Acme.TooHungry (Điều I đến VIII)
  - Hệ thống nhận diện màu Cam & Trắng (Orange & White Theme: `#EA580C`, `#F8FAFC`, `#FFFFFF`)
  - Hỗ trợ song ngữ 100% qua `vi.json` và `en.json` (Hiến pháp Điều VII)
  - Tất cả tài liệu Markdown sử dụng Tiếng Việt (Hiến pháp Điều VIII)

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi nghiên cứu và thiết kế chi tiết.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - RM-015 là tính năng tầng UI Layout & Client Routing, kế thừa hệ thống phân quyền ABP Identity (`ConfigStateService`, `currentUser.roles`) từ RM-003 mà không phá vỡ ranh giới module.
- [x] **II. UML & Domain Model Alignment**:
  - Khớp với mô hình vận hành Waiter trong `RMS-TH.vpp` và lộ trình Roadmap (chuỗi tuần tự từ Login -> Waiter Layout -> Tables -> POS Order -> Payment).
- [x] **III. Test-First & Automated Quality Gates**:
  - Thiết kế có thể kiểm thử độc lập: Test `waiterAuthGuard`, test `WaiterSidebarService`, test build Angular không lỗi.
- [x] **IV. Hợp đồng API & Tích hợp Module Angular**:
  - Định nghĩa rõ ràng hợp đồng `WaiterSidebarService`, `WAITER_ROUTES`, `waiterAuthGuard` và cấu trúc DOM layout.
- [x] **V. Bảo mật & Phân quyền**:
  - Kiểm soát truy cập chặt chẽ bằng `waiterAuthGuard` cho route `/waiter/*`, chặn trái quyền ở client và kết hợp bảo mật API ở backend.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Layout hiện đại với thanh Topbar trắng sạch viền cam tinh tế (`#EA580C`), nút thao tác cam nổi bật, nền xám nhạt (`#F8FAFC`).
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% các chuỗi nhãn trên Topbar, Sidebar, Drawer, ca trực, nút đăng xuất đều được khai báo song ngữ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ tài liệu đặc tả, kế hoạch, nghiên cứu, hợp đồng được viết 100% bằng Tiếng Việt.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Thiết kế (specs/)

```text
specs/015-rm-015-waiter-routing-and-layout/
├── spec.md                            # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                            # Kế hoạch triển khai kiến trúc chi tiết (tệp này)
├── research.md                        # Nghiên cứu giải pháp kỹ thuật, mẫu Portal và UX Tablet
├── data-model.md                      # Thiết kế mô hình trạng thái, Enums, DTOs và từ điển i18n
├── quickstart.md                      # Hướng dẫn kiểm thử tự động và kịch bản E2E
├── contracts/                         # Hợp đồng giao tiếp kiến trúc
│   └── waiter-routing-layout-contracts.md
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng đặc tả (Đạt 100%)
```

### Mã nguồn Triển khai (Mã nguồn thực tế trong repo)

```text
angular/src/app/
├── app.routes.ts                      # Cấu hình cụm route /waiter với WaiterLayoutComponent và gác cổng
├── app.component.ts                   # Điều chỉnh điều hướng sau đăng nhập cho vai trò Waiter
├── waiter/
│   ├── layout/                        # Bố cục chuyên biệt Waiter
│   │   ├── waiter-layout.component.ts
│   │   ├── waiter-layout.component.html
│   │   └── waiter-layout.component.scss
│   ├── guards/                        # Gác cổng phân hệ Waiter
│   │   └── waiter-auth.guard.ts
│   ├── services/                      # Dịch vụ quản lý Sidebar theo ngữ cảnh
│   │   └── waiter-sidebar.service.ts
│   ├── tables/                        # Màn hình Sơ đồ bàn (RM-008) - Cắm template lọc vào Sidebar
│   │   ├── waiter-tables.component.ts
│   │   └── waiter-tables.component.html
│   └── order/                         # Màn hình Gọi món POS (RM-010) - Cắm template lọc vào Sidebar
│       ├── waiter-order.component.ts
│       └── waiter-order.component.html
└── payment/                           # Màn hình Thanh toán (RM-016) - Tuyến đường độc lập Standalone
    ├── payment.component.ts
    └── payment.component.html
```

---

## Lộ trình Thực hiện theo Giai đoạn (Phases & Deliverables)

### Giai đoạn 1: Khởi tạo Hạ tầng Dịch vụ & Gác cổng Tuyến đường
- **Mục tiêu**: Xây dựng `WaiterSidebarService` và `waiterAuthGuard`.
- **Hạng mục**:
  1. Tạo `waiter-sidebar.service.ts` với Angular Signals: `sidebarTemplate`, `isDrawerOpen`, `activeFilterCount`.
  2. Tạo `waiter-auth.guard.ts` kiểm tra xác thực và vai trò (`Waiter`, `Manager`, `Administrator`).
  3. Cập nhật `app.component.ts` để nhân viên có role `Waiter` sau khi đăng nhập tự động chuyển hướng về `/waiter/tables`.

### Giai đoạn 2: Xây dựng Component Bố cục `WaiterLayoutComponent`
- **Mục tiêu**: Hoàn thiện bộ layout 3 phân vùng chuẩn nhận diện Cam & Trắng.
- **Hạng mục**:
  1. Xây dựng template HTML: Topbar với tên nhà hàng, thông tin nhân viên, badge ca trực tự động, nút lối tắt Admin, nút đăng xuất, nút mở Drawer; Sidebar với slot `<ng-container *ngTemplateOutlet="sidebarTemplate()"></ng-container>`; Main Content với `<router-outlet>`.
  2. Viết SCSS hiện đại, tối ưu responsive < 992px cho Drawer Offcanvas trượt mượt mà.
  3. Xử lý tính toán ca trực theo giờ đồng hồ thực tế (`09:00 - 15:00`, `15:00 - 23:00`).

### Giai đoạn 3: Tái cấu trúc Cụm Định tuyến `/waiter` & Cắm ghép Ngữ cảnh Trang con
- **Mục tiêu**: Tái tổ chức `app.routes.ts` và kết nối màn hình bàn/order vào Sidebar Service.
- **Hạng mục**:
  1. Cấu hình tuyến đường cha `/waiter` sử dụng `WaiterLayoutComponent`, canActivate `[authGuard, waiterAuthGuard]`, các tuyến con: `tables`, `order/:tableId`, redirect mặc định về `tables`.
  2. Đảm bảo tuyến đường `/payment/:orderId` tách biệt ở cấp App (hoặc alias redirect).
  3. Trong `WaiterTablesComponent`: Đăng ký `TemplateRef` bộ lọc bàn vào `WaiterSidebarService`.
  4. Trong `WaiterOrderComponent`: Đăng ký `TemplateRef` Table Info Card & danh mục món vào `WaiterSidebarService`.

### Giai đoạn 4: Đa ngôn ngữ (I18N), Kiểm thử & Xác thực Chất lượng
- **Mục tiêu**: Đảm bảo 100% song ngữ và vượt qua toàn bộ tiêu chí kiểm định.
- **Hạng mục**:
  1. Bổ sung từ điển bản dịch vào `vi.json` và `en.json`.
  2. Kiểm tra biên dịch Angular (`npm run build`).
  3. Kiểm tra kịch bản kiểm thử E2E: Redirect đăng nhập, chuyển trang Tables <-> Order đổi sidebar, drawer trên tablet, lối tắt Admin.
