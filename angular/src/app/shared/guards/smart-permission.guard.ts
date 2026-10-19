import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import {
  AuthService,
  ConfigStateService,
  HttpErrorReporterService,
  PermissionService,
  RouteBasedCultureUrlService,
  RoutesService,
  findRoute,
} from '@abp/ng.core';

/**
 * Smart Permission Guard:
 * Nếu quyền chưa có trong cache cục bộ của Angular (do Admin vừa cấp quyền ở phiên khác),
 * Guard sẽ tự động gửi yêu cầu nạp lại quyền mới nhất từ máy chủ (refreshAppState)
 * trước khi quyết định từ chối. Nhờ đó, người dùng không cần phải Logout/Login lại!
 */
export const smartPermissionGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const routesService = inject(RoutesService);
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const httpErrorReporter = inject(HttpErrorReporterService);
  const configStateService = inject(ConfigStateService);
  const routeCultureUrl = inject(RouteBasedCultureUrlService);
  const platformId = inject(PLATFORM_ID);

  let { requiredPolicy } = route.data || {};
  if (!requiredPolicy) {
    const routeFound = findRoute(routesService, routeCultureUrl.getRoutePathForMatching(router, state.url));
    requiredPolicy = routeFound?.requiredPolicy;
  }

  if (!requiredPolicy) {
    return of(true);
  }

  if (isPlatformServer(platformId)) {
    return of(true);
  }

  return configStateService.getAll$().pipe(
    filter(config => !!config?.auth?.grantedPolicies),
    take(1),
    switchMap(() => permissionService.getGrantedPolicy$(requiredPolicy)),
    take(1),
    switchMap(hasAccess => {
      if (hasAccess) {
        return of(true);
      }

      // Tự động kiểm tra lại với máy chủ nếu bộ nhớ đệm chưa có
      return configStateService.refreshAppState().pipe(
        switchMap(() => permissionService.getGrantedPolicy$(requiredPolicy)),
        take(1),
        map(refreshedAccess => {
          if (refreshedAccess) {
            return true;
          }

          if (route.data?.['redirectUrl']) {
            return router.parseUrl(route.data['redirectUrl']);
          }

          if (authService.isAuthenticated) {
            return router.parseUrl('/error/403');
          }
          return false;
        })
      );
    })
  );
};
