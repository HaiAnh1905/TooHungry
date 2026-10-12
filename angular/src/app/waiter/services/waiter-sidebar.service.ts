import { Injectable, TemplateRef, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
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
