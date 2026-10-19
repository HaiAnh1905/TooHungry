# Mô hình Dữ liệu & Trạng thái (Data Model & State Design): RM-019 Trang báo lỗi & Phục hồi điều hướng

**Nhánh**: `019-rm-019-error-pages-and-recovery` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Mô hình Trạng thái Giao diện (Component State Model)

### Interface `ErrorPageState`
```typescript
export interface ErrorPageConfig {
  statusCode: 404 | 403 | 500 | 505;
  titleKey: string;
  descriptionKey: string;
  badgeText: string;
  iconType: 'empty-table' | 'security-lock' | 'server-disconnect';
  showRetryButton: boolean;
  showBackButton: boolean;
  showTraceId: boolean;
}
```

### Bảng cấu hình mã lỗi mặc định (Default Error Config Map)
```typescript
export const ERROR_PAGE_CONFIGS: Record<number, ErrorPageConfig> = {
  404: {
    statusCode: 404,
    titleKey: 'ErrorPages.404.Title',
    descriptionKey: 'ErrorPages.404.Description',
    badgeText: 'HTTP 404 NOT FOUND',
    iconType: 'empty-table',
    showRetryButton: false,
    showBackButton: true,
    showTraceId: false,
  },
  403: {
    statusCode: 403,
    titleKey: 'ErrorPages.403.Title',
    descriptionKey: 'ErrorPages.403.Description',
    badgeText: 'HTTP 403 FORBIDDEN',
    iconType: 'security-lock',
    showRetryButton: false,
    showBackButton: true,
    showTraceId: false,
  },
  500: {
    statusCode: 500,
    titleKey: 'ErrorPages.500.Title',
    descriptionKey: 'ErrorPages.500.Description',
    badgeText: 'HTTP 500 INTERNAL SERVER ERROR',
    iconType: 'server-disconnect',
    showRetryButton: true,
    showBackButton: true,
    showTraceId: true,
  },
  505: {
    statusCode: 505,
    titleKey: 'ErrorPages.505.Title',
    descriptionKey: 'ErrorPages.505.Description',
    badgeText: 'HTTP 505 VERSION NOT SUPPORTED',
    iconType: 'server-disconnect',
    showRetryButton: true,
    showBackButton: true,
    showTraceId: true,
  },
};
```

---

## 2. Mô hình Định tuyến theo Vai trò & Phân quyền (User Role & Permission Navigation Model)

### Ma trận Ánh xạ Vai trò Mặc định (Role Mapping Matrix)
```typescript
export interface RoleRouteTarget {
  route: string;
  labelKey: string;
}

export const ROLE_TARGET_MAP: Record<string, RoleRouteTarget> = {
  Waiter: { route: '/waiter/tables', labelKey: 'ErrorPages.BackToTableList' },
  Cashier: { route: '/table/layout', labelKey: 'ErrorPages.BackToHome' },
  InventoryStaff: { route: '/inventory', labelKey: 'ErrorPages.BackToHome' },
  Unauthenticated: { route: '/', labelKey: 'ErrorPages.BackToLogin' }
};

/**
 * Logic phân giải trang làm việc cho Manager và Admin dựa trên quyền xem Dashboard:
 * 1. Nếu có quyền 'TooHungry.Dashboard': điều hướng về '/' (Dashboard) -> 'ErrorPages.BackToDashboard'
 * 2. Nếu không có 'TooHungry.Dashboard', fallback sang quyền tiếp theo:
 *    - 'TooHungry.Tables' -> '/tables' -> 'ErrorPages.BackToTableManagement'
 *    - 'TooHungry.Orders' -> '/orders' -> 'ErrorPages.BackToOrders'
 *    - 'TooHungry.Dishes' -> '/dishes' -> 'ErrorPages.BackToDishes'
 *    - 'TooHungry.Inventories' -> '/inventory' -> 'ErrorPages.BackToInventory'
 *    - 'AbpIdentity.Users' -> '/identity/users' -> 'ErrorPages.BackToUserManagement'
 *    - Fallback: '/account/login' -> 'ErrorPages.BackToLogin'
 */
export const MANAGER_ADMIN_PERMISSIONS_FALLBACK: { policy: string; route: string; labelKey: string }[] = [
  { policy: 'TooHungry.Dashboard', route: '/', labelKey: 'ErrorPages.BackToDashboard' },
  { policy: 'TooHungry.Tables', route: '/tables', labelKey: 'ErrorPages.BackToTableManagement' },
  { policy: 'TooHungry.Orders', route: '/orders', labelKey: 'ErrorPages.BackToOrders' },
  { policy: 'TooHungry.Dishes', route: '/dishes', labelKey: 'ErrorPages.BackToDishes' },
  { policy: 'TooHungry.Inventories', route: '/inventory', labelKey: 'ErrorPages.BackToInventory' },
  { policy: 'AbpIdentity.Users', route: '/identity/users', labelKey: 'ErrorPages.BackToUserManagement' },
];
```

---

## 3. Quản lý Tín hiệu Phản ứng (Angular Signals State)

Trong `ErrorPageComponent`:
```typescript
// Trạng thái đếm ngược
readonly countdown = signal<number>(5);

// Cờ tạm dừng đếm ngược
readonly isPaused = signal<boolean>(false);

// Cờ ghi nhận tạm dừng thủ công bằng click nút
readonly manuallyPaused = signal<boolean>(false);

// Tỷ lệ phần trăm thanh tiến trình co dần từ 100% về 0%
readonly progressPercent = computed(() => (this.countdown() / 5) * 100);

// Cờ hiển thị thông báo "Đã sao chép" cho Trace ID
readonly copied = signal<boolean>(false);

// Mã đối soát lỗi
readonly traceId = signal<string>('');
```

---

## 4. Cấu trúc Khóa Đa ngôn ngữ (i18n Schema)

```json
{
  "ErrorPages": {
    "404": {
      "Title": "...",
      "Description": "..."
    },
    "403": {
      "Title": "...",
      "Description": "..."
    },
    "500": {
      "Title": "...",
      "Description": "..."
    },
    "505": {
      "Title": "...",
      "Description": "..."
    },
    "AutoRedirectNotice": "Hệ thống sẽ tự động đưa bạn về trang làm việc sau {0} giây...",
    "PauseCountdown": "Tạm dừng",
    "ResumeCountdown": "Tiếp tục",
    "BackToHome": "Quay về trang chính của tôi",
    "BackToTableList": "Quay về Danh sách bàn",
    "BackToDashboard": "Quay về Dashboard",
    "BackToTableManagement": "Quay về Quản lý bàn",
    "BackToOrders": "Quay về Quản lý đơn hàng",
    "BackToDishes": "Quay về Quản lý món ăn",
    "BackToInventory": "Quay về Quản lý kho",
    "BackToUserManagement": "Quay về Quản lý người dùng",
    "BackToLogin": "Quay về Đăng nhập",
    "BackToPreviousPage": "Quay lại trang trước",
    "Retry": "Thử lại",
    "CopyTraceId": "Sao chép mã lỗi",
    "Copied": "Đã sao chép!",
    "TraceIdLabel": "Mã tham chiếu lỗi"
  }
}
```
