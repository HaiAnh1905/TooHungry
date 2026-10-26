import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  AfterViewInit,
  ElementRef,
  ViewChild,
  HostListener,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule, SessionStateService } from '@abp/ng.core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { RESTAURANT_BUSINESS_HOURS } from '../shared/constants/business-hours.constant';

@Component({
  selector: 'app-sidebar-widgets',
  standalone: true,
  imports: [CommonModule, CoreModule],
  template: `
    <!-- Template chứa 2 widget để inject vào Sidebar -->
    <div #statusWidget class="sidebar-restaurant-status-card">
      <div class="status-indicator-row">
        <span class="status-dot" [class.closed]="!isOpen"></span>
        <span class="status-text" [class.closed]="!isOpen">
          {{ (isOpen ? '::RestaurantOpen' : '::RestaurantClosed') | abpLocalization }}
        </span>
      </div>
      <div class="operating-hours-row">
        {{ '::OperatingHours' | abpLocalization }}
      </div>
    </div>

    <div #clockWidget class="sidebar-bottom-clock-container">
      <div class="sidebar-realtime-clock-card">
        <div class="clock-icon-wrapper">
          <svg
            class="clock-svg-icon"
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="#ff6b35"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="9.5"></circle>
            <polyline points="12 6.5 12 12 15.5 14"></polyline>
          </svg>
        </div>
        <div class="clock-info-wrapper">
          <div class="clock-time-text">{{ timeString }}</div>
          <div class="clock-date-text">{{ dateString }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: none;
    }
  `],
})
export class SidebarWidgetsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router, { optional: true });
  private readonly sessionState = inject(SessionStateService, { optional: true });
  private readonly ngZone = inject(NgZone);

  @ViewChild('statusWidget') statusWidgetRef!: ElementRef<HTMLDivElement>;
  @ViewChild('clockWidget') clockWidgetRef!: ElementRef<HTMLDivElement>;

  timeString = '';
  dateString = '';
  isOpen = true;

  private timerId: any;
  private observerId: any;
  private routerSub?: Subscription;

  ngOnInit() {
    this.updateClock();
    this.ngZone.runOutsideAngular(() => {
      this.timerId = setInterval(() => {
        this.updateClock();
        this.tryInjectWidgets();
        this.ngZone.run(() => {
          this.cdr.markForCheck();
        });
      }, 1000);
    });

    // Khi chuyển trang xong thì tự động đóng popup nếu đang mở
    if (this.router) {
      this.routerSub = this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.closeAllPopups();
        }
      });
    }
  }

  ngAfterViewInit() {
    this.tryInjectWidgets();
    let attempts = 0;
    this.ngZone.runOutsideAngular(() => {
      this.observerId = setInterval(() => {
        attempts++;
        const injected = this.tryInjectWidgets();
        if (injected || attempts >= 10) {
          clearInterval(this.observerId);
        }
      }, 300);
    });
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.observerId) clearInterval(this.observerId);
    if (this.routerSub) this.routerSub.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target) return;

    const wrapper = document.querySelector('#lpx-wrapper');
    const isCollapsed =
      wrapper?.classList.contains('hover-trigger') ||
      document.querySelector('.lpx-sidebar-container')?.classList.contains('hover-trigger');

    if (!isCollapsed) return;

    // 1. Click vào mục menu cha trên thanh sidebar 72px (ví dụ: Quản trị)
    const parentLink = target.closest(
      '.lpx-nav-menu > li > lpx-sub-navbar > .lpx-menu-item-link, .lpx-nav-menu > .outer-menu-item > lpx-sub-navbar > .lpx-menu-item-link, .lpx-nav-menu > li > .lpx-menu-item-link'
    ) as HTMLElement;

    if (parentLink) {
      const subNavbar = parentLink.closest('lpx-sub-navbar') || parentLink.parentElement;
      const innerMenu = subNavbar?.querySelector(':scope > .lpx-inner-menu') as HTMLElement;

      if (innerMenu) {
        event.preventDefault();
        event.stopPropagation();

        const isOpen = innerMenu.classList.contains('popup-open');

        // Đóng tất cả popup trước
        this.closeAllPopups();

        // Nếu trước đó đang đóng thì mở ra
        if (!isOpen) {
          const rect = parentLink.getBoundingClientRect();
          innerMenu.style.top = `${Math.max(10, rect.top)}px`;
          innerMenu.style.left = '76px';
          innerMenu.classList.add('popup-open');
        }
        return;
      }
    }

    // 2. Click vào mục con bên trong popup
    const childLink = target.closest('.lpx-inner-menu .lpx-menu-item-link') as HTMLElement;
    if (childLink) {
      const subMenu = (childLink.nextElementSibling?.classList.contains('lpx-inner-menu')
        ? childLink.nextElementSibling
        : childLink.parentElement?.querySelector(':scope > .lpx-inner-menu')) as HTMLElement;

      if (subMenu) {
        // Nếu mục con có menu lồng (ví dụ: Quản lý danh tính -> Người dùng, Vai trò) -> Toggle hiển thị con
        event.preventDefault();
        event.stopPropagation();
        subMenu.classList.toggle('sub-open');
        return;
      } else {
        // Link đích (trang Người dùng, Vai trò, Cài đặt) -> Đóng popup ngay lập tức
        this.closeAllPopups();
        return;
      }
    }

    // 3. Click ra ngoài popup và ra ngoài sidebar -> Đóng toàn bộ popup mà không thay đổi trang
    const insidePopup = target.closest('.lpx-inner-menu');
    if (!insidePopup) {
      this.closeAllPopups();
    }
  }

  private closeAllPopups() {
    document.querySelectorAll('.lpx-inner-menu.popup-open').forEach(menu => {
      menu.classList.remove('popup-open');
    });
    document.querySelectorAll('.lpx-inner-menu.sub-open').forEach(menu => {
      menu.classList.remove('sub-open');
    });
  }

  private tryInjectWidgets(): boolean {
    const sidebar = document.querySelector('#lpx-wrapper .lpx-sidebar, .lpx-sidebar');
    const logoContainer = document.querySelector('#lpx-wrapper .lpx-logo-container, .lpx-logo-container');

    if (!sidebar || !logoContainer) return false;

    // 1. Chèn Khối trạng thái nhà hàng vào ngay sau Logo Header
    if (this.statusWidgetRef?.nativeElement) {
      const statusEl = this.statusWidgetRef.nativeElement;
      if (statusEl.parentElement !== sidebar) {
        logoContainer.insertAdjacentElement('afterend', statusEl);
      }
    }

    // 2. Chèn Khối đồng hồ vào đáy Sidebar
    if (this.clockWidgetRef?.nativeElement) {
      const clockEl = this.clockWidgetRef.nativeElement;
      if (clockEl.parentElement !== sidebar) {
        sidebar.appendChild(clockEl);
      }
    }

    return true;
  }

  private updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const hoursStr = String(hours).padStart(2, '0');

    this.timeString = `${hoursStr} : ${minutes} : ${seconds}`;
    this.isOpen = hours >= RESTAURANT_BUSINESS_HOURS.OPEN_HOUR && hours < RESTAURANT_BUSINESS_HOURS.CLOSE_HOUR;

    const currentLang = this.sessionState?.getLanguage() || 'vi';
    const isEn = currentLang.toLowerCase().startsWith('en');
    const daysOfWeek = isEn
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = daysOfWeek[now.getDay()];
    const date = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    this.dateString = `${dayName}, ${date}/${month}/${year}`;
  }
}
