# Hợp đồng Giao tiếp & Kiến trúc (Technical Contracts): RM-019 Trang báo lỗi & Phục hồi điều hướng

**Nhánh**: `019-rm-019-error-pages-and-recovery` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Hợp đồng Giao diện Thành phần (Component Interface)

### `ErrorPageComponent`
- **Bộ chọn (Selector)**: `app-error-page`
- **Loại**: Standalone Angular Component
- **Thuộc tính Đầu vào (`@Input()` / Input Signals)**:
  - `statusCode`: `number` (mặc định lấy từ `ActivatedRoute.data['status']` hoặc `404`).
  - `customTitle`: `string` (tùy chọn ghi đè tiêu đề).
  - `customMessage`: `string` (tùy chọn ghi đè mô tả).
  - `traceId`: `string` (mã đối soát cho 500/505).
  - `autoRedirectDuration`: `number` (mặc định 5 giây).

---

## 2. Hợp đồng Dịch vụ Định tuyến Vai trò (Service Contract)

### `UserRoleNavigationService`
```typescript
export interface IUserRoleNavigationService {
  /**
   * Xác định URL đích trang làm việc của người dùng hiện tại
   * - Waiter -> '/waiter/tables'
   * - Manager/Admin:
   *   + Có quyền 'TooHungry.Dashboard' -> '/'
   *   + Không có quyền 'TooHungry.Dashboard' -> trang nghiệp vụ đầu tiên được cấp quyền ('/tables', '/orders', '/dishes', '/inventory'...)
   * - Cashier -> '/table/layout' hoặc '/tables'
   * - InventoryStaff -> '/inventory'
   * - Khách -> '/' hoặc '/account/login'
   */
  getDefaultHomeRoute(): string;

  /**
   * Trả về khóa bản dịch i18n cho nhãn nút điều hướng chính tương ứng với trang đích
   */
  getDefaultHomeLabelKey(): string;

  /**
   * Kiểm tra xem người dùng hiện tại có vai trò cụ thể hay không
   */
  hasRole(roleName: string): boolean;
}
```

---

## 3. Hợp đồng Định tuyến Tuyến đường (Router Contract)

### Trong `app.routes.ts`:
```typescript
export const APP_ROUTES: Routes = [
  // ... các routes hiện có ...
  {
    path: 'error/403',
    loadComponent: () =>
      import('./shared/components/error-page/error-page.component').then(c => c.ErrorPageComponent),
    data: { status: 403, layout: eLayoutType.empty }
  },
  {
    path: 'error/500',
    loadComponent: () =>
      import('./shared/components/error-page/error-page.component').then(c => c.ErrorPageComponent),
    data: { status: 500, layout: eLayoutType.empty }
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/error-page/error-page.component').then(c => c.ErrorPageComponent),
    data: { status: 404, layout: eLayoutType.empty }
  }
];
```

---

## 4. Hợp đồng Bảo vệ Tuyến đường (`smartPermissionGuard`)

### Trong `smart-permission.guard.ts`:
```typescript
// Khi không có quyền truy cập:
if (authService.isAuthenticated) {
  return router.parseUrl('/error/403');
}
```
