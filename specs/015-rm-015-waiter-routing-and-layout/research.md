# Nghiên cứu Kỹ thuật & Quyết định Kiến trúc: RM-015 Điều hướng & Bố cục Waiter

**Tính năng**: `RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Nghiên cứu Kiến trúc Sidebar Ngữ cảnh Động (Dynamic Contextual Sidebar)

### Bối cảnh
Phân hệ Waiter gồm các màn hình có nhu cầu hiển thị Sidebar hoàn toàn khác nhau:
- Màn hình Sơ đồ bàn (`/waiter/tables`): Sidebar cần ô tìm kiếm số bàn, bộ chọn khu vực ăn uống và bộ lọc 5 trạng thái bàn.
- Màn hình Gọi món (`/waiter/order/:tableId`): Sidebar cần Table Information Card (thông tin bàn hiện tại) và danh sách Danh mục món ăn (Menu Categories).

Đồng thời, Sidebar phải nằm trong khung layout tổng (`WaiterLayoutComponent`) để tận dụng tính năng co giãn responsive (Drawer Offcanvas) mà không bị nhân bản mã HTML/CSS ở từng trang.

### Các phương án xem xét
- **Phương án 1 (Named Router Outlets - `<router-outlet name="sidebar">`)**:
  - *Cách làm*: Cấu hình router cho mỗi URL tải đồng thời 2 component: 1 cho sidebar, 1 cho main content.
  - *Nhược điểm*: Chia tách trạng thái (State Splitting). Component sidebar và component main content là 2 thể hiện độc lập, việc truyền dữ liệu lọc (ví dụ: gõ từ khóa bàn trên sidebar để cập nhật lưới bàn ở main) phải thông qua Event Bus hoặc Service trung gian rất phức tạp, dễ gây lỗi vòng đời (lifecycle race conditions).
- **Phương án 2 (Service-driven Portal / TemplateRef)** *(Được chọn)*:
  - *Cách làm*: `WaiterLayoutComponent` cung cấp một vị trí chứa template:
    ```html
    <aside class="waiter-sidebar">
      <ng-container *ngTemplateOutlet="sidebarService.sidebarTemplate()"></ng-container>
    </aside>
    ```
    Mỗi component con (ví dụ `WaiterTablesComponent`) khai báo `<ng-template #sidebarFilter>...</ng-template>` trực tiếp trong file HTML của mình. Trong `ngAfterViewInit()`, component gửi `sidebarTemplate` vào `WaiterSidebarService.registerTemplate(template)`. Khi component bị hủy (`ngOnDestroy`), nó tự động gọi `sidebarService.clearTemplate()`.
  - *Ưu điểm*:
    1. Toàn bộ logic lọc, dữ liệu signal, hàm xử lý sự kiện vẫn nằm trọn vẹn trong component con, không cần tách component hay chia đôi state.
    2. Hỗ trợ 2 chiều mượt mà giữa bộ lọc và danh sách hiển thị.
    3. Hoàn toàn tương thích với Angular Signals và Angular 19 Standalone.

---

## 2. Nghiên cứu Tự động Điều hướng theo Vai trò sau Đăng nhập

### Bối cảnh
Khi nhân viên đăng nhập qua màn hình login chuẩn RM-001 (OpenIddict / OAuth token), sự kiện `token_received` được phát ra trong `AppComponent`.

Hiện tại trong `angular/src/app/app.component.ts`:
```typescript
} else if (roles.includes('Waiter')) {
  this.router.navigate(['/table']); // Đang trỏ nhầm về /table cũ thay vì /waiter/tables
}
```

### Quyết định Kiến trúc
- Sửa đổi trực tiếp trong `AppComponent`:
  ```typescript
  } else if (roles.includes('Waiter')) {
    this.router.navigate(['/waiter/tables']);
  }
  ```
- Đồng thời trong `app.routes.ts`, cấu hình tuyến đường mặc định:
  - Khi truy cập `/waiter` -> tự động `redirectTo: 'tables', pathMatch: 'full'`.
  - Khi truy cập `/` với vai trò `Waiter` -> `waiterAuthGuard` hoặc `home.component.ts` tự động phát hiện role và chuyển tiếp sang `/waiter/tables`.

---

## 3. Nghiên cứu Bộ Gác cổng Tuyến đường (`waiterAuthGuard`)

### Bối cảnh
Phân hệ `/waiter/*` chứa dữ liệu nhạy cảm về sơ đồ bàn, khách đặt chỗ và đơn hàng tại chỗ. Cần một bộ gác cổng chuyên biệt (`CanActivateFn`) kết hợp kiểm tra:
1. Đã đăng nhập chưa (`authService.isAuthenticated`)?
2. Có vai trò hợp lệ không (`Waiter`, `Manager`, `Administrator`)?
3. Hoặc có sở hữu quyền hạn phục vụ không (`TooHungry.Tables` hoặc `TooHungry.Orders`)?

### Quyết định Thiết kế
```typescript
export const waiterAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const configState = inject(ConfigStateService);

  if (!authService.isAuthenticated) {
    // Chuyển hướng về login kèm returnUrl
    router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const currentUser = configState.getOne('currentUser');
  const roles = currentUser?.roles || [];
  const allowedRoles = ['Waiter', 'Manager', 'Administrator', 'admin'];

  const hasAllowedRole = roles.some(r => allowedRoles.includes(r));
  if (hasAllowedRole) {
    return true;
  }

  // Nếu không có role hợp lệ, kiểm tra policy quyền hạn
  const permissions = configState.getOne('auth')?.grantedPolicies || {};
  if (permissions['TooHungry.Tables'] || permissions['TooHungry.Orders']) {
    return true;
  }

  // Từ chối và chuyển hướng an toàn
  router.navigate(['/']);
  return false;
};
```

---

## 4. Nghiên cứu Tự động Tính toán Ca trực (Shift Calculation)

### Bối cảnh
Topbar cần hiển thị ca trực hiện tại của nhân viên nhằm tạo cảm giác chuyên nghiệp và nhận thức thời gian ca làm việc. Theo quy định nhà hàng từ RM-009, nhà hàng hoạt động trong khung giờ `09:00 - 23:00`.

### Quyết định Thiết kế
Tự động tính toán phía Client dựa trên đồng hồ hệ thống (`new Date().getHours()`) mà không đòi hỏi thêm API bảng ca trực phức tạp:
- **Ca Sáng** (`09:00` đến `14:59`): `hours >= 9 && hours < 15` $\rightarrow$ Badge màu cam nhẹ `[Ca Sáng]`.
- **Ca Tối** (`15:00` đến `22:59`): `hours >= 15 && hours < 23` $\rightarrow$ Badge màu xanh tím `[Ca Tối]`.
- **Ngoài ca trực** (`23:00` đến `08:59`): `hours >= 23 || hours < 9` $\rightarrow$ Badge màu xám `[Ngoài ca trực]`.

Thông tin này được đóng gói trong một Signal `currentShift` cập nhật tự động mỗi phút.

---

## 5. Nghiên cứu Tách biệt Màn hình Thanh toán RM-016 (Standalone Route)

### Bối cảnh
Roadmap RM-016 quy định rõ:
> *"Màn hình chuyên biệt độc lập, **KHÔNG sử dụng Sidebar và Topbar** thông thường của Waiter layout... Bố cục 2 cột chia tỉ lệ 60% hóa đơn : 40% thanh toán."*

### Quyết định Thiết kế
Tuyến đường `/payment/:orderId` được cấu hình là route độc lập ở cấp ứng dụng chính trong `APP_ROUTES`, sử dụng trực tiếp `PaymentComponent` (Standalone) không nằm trong cây con của `WaiterLayoutComponent`.
Đồng thời trong cụm `/waiter`, cấu hình route alias:
```typescript
{
  path: 'payment/:orderId',
  redirectTo: '/payment/:orderId',
  pathMatch: 'full'
}
```
Nhờ đó, khi bấm `[Kết thúc bữa ăn]` chuyển sang thanh toán từ sơ đồ bàn, người dùng đi thẳng vào giao diện thanh toán toàn màn hình mà không bị kẹt Topbar hay Sidebar của Waiter.

---

## 6. Nghiên cứu Trải nghiệm Responsive Drawer (Offcanvas) cho Tablet & Mobile

### Bối cảnh
Nhân viên phục vụ thường dùng iPad / Máy tính bảng xoay dọc (Portrait: độ rộng 768px - 834px). Nếu cố định Sidebar 280px, diện tích còn lại cho sơ đồ bàn chỉ còn ~500px, khiến thẻ bàn bị ép nhỏ.

### Quyết định Thiết kế
- **Breakpoint chuẩn**: `992px` (chuẩn Bootstrap / modern tablet breakpoint).
- **>= 992px (Desktop & Tablet Landscape)**:
  - Sidebar hiển thị cố định bên trái (chiều rộng cố định 280px), thanh cuộn nội bộ độc lập.
  - Nút mở Drawer trên Topbar tự động ẩn.
- **< 992px (Tablet Portrait & Mobile)**:
  - Sidebar ẩn hoàn toàn khỏi luồng layout (DOM được chuyển sang chế độ Fixed Drawer).
  - Topbar xuất hiện nút `[Bộ lọc]` có badge số lượng tiêu chí đang chọn.
  - Khi bấm, Drawer trượt ra từ cạnh trái với hiệu ứng CSS transform: `translateX(0)` trong 200ms, lớp Backdrop nền tối che phủ 40% opacity. Chạm ra ngoài hoặc bấm icon `[✕]` đóng Drawer tức thì.
  - Vùng chạm của tất cả các nút tối thiểu 44 × 44px, hỗ trợ thao tác bằng ngón cái.
