import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DynamicLayoutComponent, ConfigStateService } from '@abp/ng.core';
import { LoaderBarComponent } from '@abp/ng.theme.shared';
import { SidebarWidgetsComponent } from './sidebar-widgets/sidebar-widgets.component';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  template: `
    <abp-loader-bar />
    <abp-dynamic-layout />
    <app-sidebar-widgets />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [LoaderBarComponent, DynamicLayoutComponent, SidebarWidgetsComponent],
})
export class AppComponent {
  private oauthService = inject(OAuthService);
  private configState = inject(ConfigStateService);
  private router = inject(Router);
  private hasInitialNavigated = false;

  constructor() {
    this.oauthService.events.subscribe((event: OAuthEvent) => {
      if (event.type === 'logout') {
        this.hasInitialNavigated = false;
        return;
      }

      // Chỉ điều hướng 1 lần duy nhất khi vừa đăng nhập thành công từ trang Login,
      // tuyệt đối KHÔNG điều hướng khi token được tự động làm mới ngầm (Silent Refresh) định kỳ!
      if (event.type === 'token_received' && !this.hasInitialNavigated) {
        const currentUrl = this.router.url;
        const isAtLoginOrRoot = !currentUrl || currentUrl === '/' || currentUrl.startsWith('/account/login');

        // Nếu người dùng đang đứng ở bất kỳ trang làm việc nào khác, giữ nguyên trang đó
        if (!isAtLoginOrRoot) {
          this.hasInitialNavigated = true;
          return;
        }

        // Bỏ qua nếu đây là sự kiện silent refresh ngầm trong nền
        if ((event as any).info === 'silent') {
          return;
        }

        this.hasInitialNavigated = true;

        // Fetch current user and redirect based on role CHỈ KHI vừa login xong
        this.configState.getOne$('currentUser').subscribe(user => {
          if (user?.isAuthenticated) {
            const roles = user.roles || [];
            if (roles.includes('Administrator') || roles.includes('admin')) {
              this.router.navigate(['/identity/users']);
            } else if (roles.includes('Manager')) {
              this.router.navigate(['/']);
            } else if (roles.includes('InventoryStaff')) {
              this.router.navigate(['/inventory']);
            } else if (roles.includes('Waiter')) {
              this.router.navigate(['/waiter/tables']);
            } else if (roles.includes('Cashier')) {
              this.router.navigate(['/table/layout']);
            } else {
              this.router.navigate(['/']);
            }
          }
        });
      }
    });

    // Tự động đồng bộ quyền khi người dùng quay lại tab làm việc (không cần F5/Logout)
    if (typeof document !== 'undefined') {
      let lastRefreshTime = 0;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          if (now - lastRefreshTime > 4000) {
            lastRefreshTime = now;
            this.configState.getOne$('currentUser').subscribe(user => {
              if (user?.isAuthenticated) {
                this.configState.refreshAppState().subscribe();
              }
            });
          }
        }
      });

      // Hỗ trợ kích hoạt dropdown ngôn ngữ khi click vào bất cứ vị trí nào trên nút
      document.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const langContainer = target?.closest('.lpx-language-selection');
        if (langContainer && target === langContainer) {
          const toggle = langContainer.querySelector('[ngbDropdownToggle]') as HTMLElement;
          toggle?.click();
        }
      });
    }
  }
}

