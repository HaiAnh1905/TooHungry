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

  constructor() {
    this.oauthService.events.subscribe((event: OAuthEvent) => {
      if (event.type === 'token_received') {
        // Fetch current user and redirect based on role
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
    }
  }
}
