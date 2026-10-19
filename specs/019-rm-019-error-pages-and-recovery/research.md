# Nghiên cứu Kỹ thuật (Technical Research): RM-019 Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing)

**Nhánh**: `019-rm-019-error-pages-and-recovery` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

---

## Nghiên cứu 1: Đón bắt Lỗi 404 qua Wildcard Route & Layout Độc lập

### Vấn đề:
Hiện tại `app.routes.ts` chưa có cấu hình Wildcard `**`. Khi người dùng gõ nhầm một URL không tồn tại, Angular Router sẽ throw lỗi `Cannot match any routes` trong Console và hiển thị màn hình trắng rỗng. Ngoài ra, các trang lỗi nếu hiển thị trong layout mặc định sẽ bị thanh Topbar và Sidebar chiếm dụng không gian, gây rối mắt.

### Giải pháp kỹ thuật:
1. Thêm route Wildcard ở cuối cùng của mảng `APP_ROUTES`:
```typescript
{
  path: '**',
  loadComponent: () =>
    import('./shared/components/error-page/error-page.component').then(c => c.ErrorPageComponent),
  data: { status: 404, layout: eLayoutType.empty }
}
```
2. Đặt `data: { layout: eLayoutType.empty }` để ABP Framework Theme (`@abp/ng.theme.basic` hoặc `@abp/ng.theme.shared`) tự động chuyển sang layout trống (không có Topbar/Sidebar của hệ thống), giúp trang lỗi hiển thị toàn màn hình độc lập, tập trung và sang trọng.

---

## Nghiên cứu 2: Quản lý Đếm ngược 5 giây bằng Angular Signals & Tương tác Người dùng

### Vấn đề:
Đồng hồ đếm ngược 5 giây cần:
- Cập nhật số giây mượt mà từ 5 về 0.
- Thanh tiến trình ngang (Linear Progress Bar) co dần từ 100% về 0% theo thời gian thực (60fps).
- Tạm dừng ngay khi người dùng rê chuột vào thẻ lỗi (hover) hoặc nhấn nút `[Tạm dừng]`.
- Tạm dừng khi người dùng chuyển sang tab khác của trình duyệt (`document.hidden`), và chỉ đếm tiếp khi người dùng quay lại tab để tránh người dùng bị chuyển trang ngầm mà không hay biết.
- Hủy timer an toàn khi component bị destroy (người dùng bấm nút hoặc rời trang sớm) để tránh memory leak.

### Giải pháp kỹ thuật:
1. Sử dụng **Angular Signals** kết hợp `requestAnimationFrame` hoặc `setInterval`:
```typescript
readonly initialDuration = 5; // 5 giây
countdown = signal(5);
isPaused = signal(false);
progressPercent = computed(() => (this.countdown() / this.initialDuration) * 100);

private timerId: any = null;

startTimer() {
  this.clearTimer();
  this.timerId = setInterval(() => {
    if (!this.isPaused()) {
      const next = this.countdown() - 1;
      if (next <= 0) {
        this.countdown.set(0);
        this.clearTimer();
        this.autoRedirect();
      } else {
        this.countdown.set(next);
      }
    }
  }, 1000);
}
```
2. Lắng nghe sự kiện chuyển tab:
```typescript
@HostListener('document:visibilitychange')
onVisibilityChange() {
  if (document.hidden) {
    this.isPaused.set(true);
  } else if (!this.manuallyPaused) {
    this.isPaused.set(false);
  }
}
```
3. Lắng nghe hover bằng `@HostListener('mouseenter')` và `@HostListener('mouseleave')`.

---

## Nghiên cứu 3: Xử lý Nút `[Quay lại trang trước]` An toàn (Safe Browser Back)

### Vấn đề:
Nếu người dùng dùng `Location.back()` khi trang trước đó chính là một trang lỗi hoặc trang không hợp lệ, người dùng sẽ rơi vào vòng lặp vô tận (Loop between error pages).

### Giải pháp kỹ thuật:
1. Sử dụng Angular Common `Location`:
```typescript
import { Location } from '@angular/common';

constructor(private location: Location, private roleNavService: UserRoleNavigationService) {}

goBack() {
  this.clearTimer();
  // Kiểm tra lịch sử duyệt web
  if (window.history.length > 1) {
    this.location.back();
  } else {
    // Nếu không có lịch sử trước đó (mở link trực tiếp): Chuyển về trang vai trò
    this.goHome();
  }
}
```

---

## Nghiên cứu 4: Tích hợp với `smartPermissionGuard` cho Lỗi 403

### Vấn đề:
Trong `smart-permission.guard.ts` hiện tại:
```typescript
if (authService.isAuthenticated) {
  httpErrorReporter.reportError(new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));
}
return false;
```
Khi bị từ chối quyền, guard báo lỗi qua `httpErrorReporter` làm xuất hiện popup mặc định của ABP hoặc đứng yên tại trang cũ.

### Giải pháp kỹ thuật:
Thay đổi thành điều hướng mềm sang route chuyên biệt `/error/403`:
```typescript
if (authService.isAuthenticated) {
  return router.parseUrl('/error/403');
}
```
Nhờ đó, người dùng sẽ lập tức nhìn thấy màn hình lỗi 403 chuyên biệt, giải thích rõ ràng và có đồng hồ đếm ngược 5 giây đưa về trang làm việc của họ.

---

## Nghiên cứu 5: Minh họa Vector SVG Nội Tuyến Chuẩn Cam & Trắng `#EA580C`

### Vấn đề:
Sử dụng hình ảnh bên ngoài (png/jpg/external link) có thể bị vỡ link, tải chậm hoặc không đồng bộ với giao diện khi mạng chập chờn.

### Giải pháp kỹ thuật:
Nhúng trực tiếp mã Vector SVG nội tuyến (Inline SVG) vào template HTML của `ErrorPageComponent`:
1. **SVG 404 (Bàn ăn trống & Bản đồ thất lạc)**: Tông màu cam ấm `#EA580C`, nét vẽ thanh thoát, điểm xuyết các hạt đồ họa lơ lửng nhẹ (float animation).
2. **SVG 403 (Ổ khóa bảo mật phân quyền)**: Khung khiên bảo vệ với ổ khóa vàng cam sáng bóng.
3. **SVG 500/505 (Gián đoạn kết nối máy chủ)**: Minh họa nồi nấu quá nhiệt và dây cáp nối thiết bị bếp gián đoạn.
- Đảm bảo tải tức thì 0 mili-giây, dung lượng siêu nhẹ (< 3KB cho mỗi SVG), co giãn sắc nét trên mọi độ phân giải Retina/4K.
