# Thiết kế Mô hình Dữ liệu, Trạng thái & Giao diện: RM-015 Điều hướng & Bố cục Waiter

**Tính năng**: `RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout)`  
**Ngày**: 2026-10-12  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Các Kiểu Liệt kê (Enums)

### `WaiterShiftType`
Định nghĩa ca làm việc của nhân viên phục vụ trong ngày:

```typescript
export enum WaiterShiftType {
  Morning = 'Morning',       // Ca sáng: 09:00 - 15:00
  Evening = 'Evening',       // Ca tối: 15:00 - 23:00
  OffShift = 'OffShift'      // Ngoài giờ phục vụ: 23:00 - 09:00
}
```

---

## 2. Các Mô hình Trạng thái Giao diện (UI State Models)

### `WaiterUserInfo`
Thông tin nhân viên phục vụ hiển thị trên thanh Topbar:

```typescript
export interface WaiterUserInfo {
  /**
   * Mã định danh người dùng trong hệ thống
   */
  userId: string;

  /**
   * Tên tài khoản đăng nhập (Username)
   */
  userName: string;

  /**
   * Tên hiển thị đầy đủ của nhân viên
   */
  fullName: string;

  /**
   * Danh sách vai trò của tài khoản (Ví dụ: ['Waiter'], ['Manager', 'Waiter'])
   */
  roles: string[];

  /**
   * Loại ca trực hiện tại tính theo giờ đồng hồ
   */
  shiftType: WaiterShiftType;

  /**
   * Khóa bản dịch hiển thị ca trực (::ShiftMorning, ::ShiftEvening, ::ShiftOff)
   */
  shiftLocalizationKey: string;

  /**
   * Trạng thái kết nối máy chủ thời gian thực (SignalR)
   */
  isOnline: boolean;

  /**
   * Cờ cho biết có quyền hiển thị nút [Quay lại Quản trị] hay không (Chỉ true khi role là Manager hoặc Admin)
   */
  canReturnToAdmin: boolean;
}
```

---

### `WaiterSidebarState`
Mô hình trạng thái quản lý Sidebar và Drawer:

```typescript
import { TemplateRef } from '@angular/core';

export interface WaiterSidebarState {
  /**
   * Template nội dung bộ lọc do trang con đăng ký
   */
  template: TemplateRef<any> | null;

  /**
   * Trạng thái đóng/mở của Drawer trên màn hình nhỏ (< 992px)
   */
  isDrawerOpen: boolean;

  /**
   * Số lượng tiêu chí lọc đang được áp dụng (hiển thị badge trên nút Bộ lọc)
   */
  activeFilterCount: number;

  /**
   * Tiêu đề tùy chọn của Sidebar (Mặc định: ::Filters)
   */
  titleKey: string;
}
```

---

## 3. Giao diện Dịch vụ `WaiterSidebarService`

```typescript
import { Injectable, TemplateRef, signal, computed } from '@angular/core';
import { WaiterSidebarState } from './models';

@Injectable({
  providedIn: 'root'
})
export class WaiterSidebarService {
  // Signals quản lý trạng thái
  readonly sidebarTemplate = signal<TemplateRef<any> | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly activeFilterCount = signal<number>(0);
  readonly titleKey = signal<string>('::Filters');

  // Computed state
  readonly hasTemplate = computed(() => this.sidebarTemplate() !== null);

  /**
   * Đăng ký template bộ lọc từ trang con
   */
  registerTemplate(template: TemplateRef<any>, titleKey = '::Filters', filterCount = 0): void {
    this.sidebarTemplate.set(template);
    this.titleKey.set(titleKey);
    this.activeFilterCount.set(filterCount);
  }

  /**
   * Thu hồi template khi trang con bị hủy
   */
  clearTemplate(): void {
    this.sidebarTemplate.set(null);
    this.isDrawerOpen.set(false);
    this.activeFilterCount.set(0);
  }

  /**
   * Cập nhật số lượng tiêu chí lọc đang chọn
   */
  setActiveFilterCount(count: number): void {
    this.activeFilterCount.set(count);
  }

  /**
   * Mở Drawer trên thiết bị di động/tablet
   */
  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  /**
   * Đóng Drawer
   */
  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  /**
   * Bật/tắt Drawer
   */
  toggleDrawer(): void {
    this.isDrawerOpen.update(open => !open);
  }
}
```

---

## 4. Từ điển Chuỗi Bản dịch Đa ngôn ngữ (I18N Localization Keys)

Toàn bộ các chuỗi văn bản mới phục vụ cho Layout Waiter bắt buộc được bổ sung vào cả hai tệp `vi.json` và `en.json`:

| Localization Key | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) | Ngữ cảnh sử dụng |
|---|---|---|---|
| `::WaiterPortalTitle` | Không gian Phục vụ | Waiter Portal | Tiêu đề phân hệ trên thanh điều hướng |
| `::WaiterRoleBadge` | Phục vụ bàn | Waiter | Huy hiệu vai trò nhân viên trên Topbar |
| `::ShiftMorning` | Ca Sáng | Morning Shift | Huy hiệu ca trực từ 09:00 đến 15:00 |
| `::ShiftEvening` | Ca Tối | Evening Shift | Huy hiệu ca trực từ 15:00 đến 23:00 |
| `::ShiftOff` | Ngoài ca trực | Off Shift | Huy hiệu ngoài khung giờ phục vụ |
| `::ReturnToAdmin` | Quay lại Quản trị | Return to Admin | Nút lối tắt cho Admin/Manager trên Topbar |
| `::FilterDrawerTitle` | Bộ lọc & Tìm kiếm | Filters & Search | Tiêu đề trên đầu ngăn kéo Drawer |
| `::OpenFilters` | Bộ lọc | Filters | Nút mở Drawer trên Topbar di động |
| `::CloseFilters` | Đóng | Close | Nút đóng ngăn kéo Drawer |
| `::ConfirmLogoutTitle` | Xác nhận Đăng xuất | Confirm Logout | Tiêu đề hộp thoại xác nhận đăng xuất |
| `::ConfirmLogoutMessage` | Bạn có chắc chắn muốn kết thúc ca làm việc và đăng xuất không? | Are you sure you want to end your shift and logout? | Nội dung hộp thoại xác nhận đăng xuất |
| `::RealtimeConnected` | Trực tuyến | Online | Trạng thái kết nối SignalR thời gian thực |
| `::RealtimeDisconnected` | Mất kết nối | Offline | Cảnh báo mất kết nối thời gian thực |
