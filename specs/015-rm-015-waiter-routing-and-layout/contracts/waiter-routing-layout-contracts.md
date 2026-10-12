# Hợp đồng Kiến trúc & Giao tiếp: RM-015 Điều hướng & Bố cục Waiter

**Tính năng**: `RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Hợp đồng Cấu trúc Định tuyến (Routing Structure Contract)

### 1.1 Khai báo Tuyến đường trong `APP_ROUTES`
Tuyến đường phân hệ Waiter được cấu hình theo cấu trúc phân cấp (Nested Routes) với component cha là `WaiterLayoutComponent`:

```typescript
export const APP_ROUTES: Routes = [
  // Tuyến đường Waiter chuyên biệt (Bọc trong WaiterLayoutComponent)
  {
    path: 'waiter',
    loadComponent: () =>
      import('./waiter/layout/waiter-layout.component').then(c => c.WaiterLayoutComponent),
    canActivate: [authGuard, waiterAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'tables',
        pathMatch: 'full',
      },
      {
        path: 'tables',
        loadComponent: () =>
          import('./waiter/tables/waiter-tables.component').then(c => c.WaiterTablesComponent),
        data: { requiredPolicy: 'TooHungry.Tables' },
      },
      {
        path: 'order/:tableId',
        loadComponent: () =>
          import('./waiter/order/waiter-order.component').then(c => c.WaiterOrderComponent),
        data: { requiredPolicy: 'TooHungry.Orders' },
      },
      {
        path: 'payment/:orderId',
        redirectTo: '/payment/:orderId',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'tables',
      },
    ],
  },

  // Tuyến đường Thanh toán độc lập (RM-016 Standalone View - KHÔNG qua WaiterLayoutComponent)
  {
    path: 'payment/:orderId',
    loadComponent: () =>
      import('./payment/payment.component').then(c => c.PaymentComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Orders' },
  },
  
  // Các tuyến đường khác giữ nguyên...
];
```

---

## 2. Hợp đồng Bộ Gác cổng Tuyến đường (`waiterAuthGuard`)

### 2.1 Chữ ký Phương thức & Ràng buộc
- **Kiểu trả về**: `CanActivateFn` (trả về `boolean | Observable<boolean> | UrlTree`).
- **Nhiệm vụ**: Xác thực phiên đăng nhập, kiểm tra danh sách vai trò hoặc quyền hạn người dùng trước khi kích hoạt bất kỳ route con nào trong `/waiter/*`.

### 2.2 Bảng Quyết định Gác cổng (Guard Decision Matrix)

| Tình trạng Xác thực | Vai trò (`roles`) | Quyền hạn (`grantedPolicies`) | Quyết định | Hành động Điều hướng |
|---|---|---|---|---|
| Chưa đăng nhập | Không có | Không có | **Từ chối (false)** | Chuyển hướng sang `/account/login?returnUrl={currentUrl}` |
| Đã đăng nhập | Chứa `Waiter` | Bất kỳ | **Cho phép (true)** | Vào trang đích `/waiter/*` |
| Đã đăng nhập | Chứa `Manager` | Bất kỳ | **Cho phép (true)** | Vào trang đích `/waiter/*` (Topbar hiện nút `[Quay lại Quản trị]`) |
| Đã đăng nhập | Chứa `Administrator` hoặc `admin` | Bất kỳ | **Cho phép (true)** | Vào trang đích `/waiter/*` (Topbar hiện nút `[Quay lại Quản trị]`) |
| Đã đăng nhập | Chỉ có `InventoryStaff` hoặc `Cashier` | Có `TooHungry.Tables` hoặc `TooHungry.Orders` | **Cho phép (true)** | Vào trang đích `/waiter/*` |
| Đã đăng nhập | Không thuộc các nhóm trên | Không có quyền phục vụ | **Từ chối (false)** | Báo lỗi 403 Forbidden, chuyển hướng về `/` hoặc trang mặc định của vai trò |

---

## 3. Hợp đồng Giao tiếp `WaiterSidebarService` (Service Contract)

Dịch vụ `WaiterSidebarService` là cầu nối phân tách giữa khung layout và nội dung bộ lọc của từng màn hình con:

```typescript
export interface IWaiterSidebarService {
  /** Signal nắm giữ TemplateRef nội dung bộ lọc */
  readonly sidebarTemplate: Signal<TemplateRef<any> | null>;

  /** Signal trạng thái đóng/mở của Drawer trên màn hình di động/tablet */
  readonly isDrawerOpen: Signal<boolean>;

  /** Signal số lượng tiêu chí lọc đang được áp dụng */
  readonly activeFilterCount: Signal<number>;

  /** Signal tiêu đề khu vực lọc */
  readonly titleKey: Signal<string>;

  /** Đăng ký template từ component con */
  registerTemplate(template: TemplateRef<any>, titleKey?: string, filterCount?: number): void;

  /** Thu hồi template khi component con bị hủy */
  clearTemplate(): void;

  /** Cập nhật số lượng tiêu chí lọc đang áp dụng */
  setActiveFilterCount(count: number): void;

  /** Mở ngăn kéo lọc trên mobile */
  openDrawer(): void;

  /** Đóng ngăn kéo lọc trên mobile */
  closeDrawer(): void;

  /** Đảo trạng thái mở/đóng ngăn kéo */
  toggleDrawer(): void;
}
```

---

## 4. Hợp đồng Bố cục Giao diện DOM (`WaiterLayoutComponent`)

### 4.1 Cấu trúc DOM Hierarchy
```html
<div class="waiter-app-wrapper">
  <!-- 1. TOPBAR CỐ ĐỊNH TRÊN CÙNG (Chiều cao 64px) -->
  <header class="waiter-topbar">
    <div class="topbar-left">
      <!-- Nút mở drawer trên mobile/tablet -->
      <button class="btn-toggle-drawer d-lg-none" (click)="sidebarService.toggleDrawer()">
        <i class="fas fa-sliders"></i>
        @if (sidebarService.activeFilterCount() > 0) {
          <span class="badge-filter-count">{{ sidebarService.activeFilterCount() }}</span>
        }
      </button>
      <div class="brand-logo">
        <i class="fas fa-utensils brand-icon"></i>
        <span class="brand-name">Acme.TooHungry</span>
      </div>
      <span class="portal-badge">{{ '::WaiterPortalTitle' | abpLocalization }}</span>
    </div>

    <div class="topbar-right">
      <!-- Trạng thái kết nối realtime -->
      <div class="status-indicator" [class.online]="userInfo.isOnline">
        <span class="dot"></span>
        <span class="status-text">{{ (userInfo.isOnline ? '::RealtimeConnected' : '::RealtimeDisconnected') | abpLocalization }}</span>
      </div>

      <!-- Badge ca trực tự động theo giờ -->
      <span class="shift-badge" [ngClass]="userInfo.shiftType">
        <i class="far fa-clock me-1"></i>
        {{ userInfo.shiftLocalizationKey | abpLocalization }}
      </span>

      <!-- Thông tin nhân viên -->
      <div class="user-profile">
        <div class="avatar-circle">{{ userInitials() }}</div>
        <div class="user-meta d-none d-sm-block">
          <div class="user-name">{{ userInfo.fullName || userInfo.userName }}</div>
          <div class="user-role">{{ '::WaiterRoleBadge' | abpLocalization }}</div>
        </div>
      </div>

      <!-- Nút lối tắt quay lại quản trị (chỉ hiện cho Admin/Manager) -->
      @if (userInfo.canReturnToAdmin) {
        <button class="btn btn-outline-admin" (click)="returnToAdmin()" title="{{ '::ReturnToAdmin' | abpLocalization }}">
          <i class="fas fa-arrow-left"></i>
          <span class="d-none d-md-inline ms-1">{{ '::ReturnToAdmin' | abpLocalization }}</span>
        </button>
      }

      <!-- Nút đăng xuất -->
      <button class="btn btn-logout" (click)="logout()" title="{{ '::Logout' | abpLocalization }}">
        <i class="fas fa-arrow-right-from-bracket"></i>
      </button>
    </div>
  </header>

  <!-- 2. VÙNG NỘI DUNG CHÍNH (SIDEBAR + MAIN CONTENT) -->
  <div class="waiter-body-layout">
    <!-- SIDEBAR DESKTOP (>= 992px) -->
    <aside class="waiter-desktop-sidebar d-none d-lg-block">
      <div class="sidebar-inner-content">
        @if (sidebarService.sidebarTemplate()) {
          <ng-container *ngTemplateOutlet="sidebarService.sidebarTemplate()!"></ng-container>
        }
      </div>
    </aside>

    <!-- MAIN CONTENT (<router-outlet>) -->
    <main class="waiter-main-content">
      <router-outlet></router-outlet>
    </main>
  </div>

  <!-- 3. MOBILE/TABLET OFFCANVAS DRAWER (< 992px) -->
  <div class="waiter-drawer-backdrop d-lg-none" [class.show]="sidebarService.isDrawerOpen()" (click)="sidebarService.closeDrawer()"></div>
  <aside class="waiter-mobile-drawer d-lg-none" [class.open]="sidebarService.isDrawerOpen()">
    <div class="drawer-header">
      <h5 class="drawer-title m-0">
        <i class="fas fa-filter me-2 text-primary-orange"></i>
        {{ sidebarService.titleKey() | abpLocalization }}
      </h5>
      <button class="btn-close-drawer" (click)="sidebarService.closeDrawer()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="drawer-body">
      @if (sidebarService.sidebarTemplate()) {
        <ng-container *ngTemplateOutlet="sidebarService.sidebarTemplate()!"></ng-container>
      }
    </div>
  </aside>
</div>
```
