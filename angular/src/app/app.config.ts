import { provideAbpCore, withOptions } from '@abp/ng.core';
import { provideAbpOAuth } from '@abp/ng.oauth';
import { provideSettingManagementConfig } from '@abp/ng.setting-management/config';
import { provideFeatureManagementConfig } from '@abp/ng.feature-management';
import { provideIdentityConfig } from '@abp/ng.identity/config';
import { provideAccountConfig } from '@abp/ng.account/config';
import { provideTenantManagementConfig } from '@abp/ng.tenant-management/config';
import { registerLocaleForEsBuild } from '@abp/ng.core/locale';
import { provideThemeLeptonX } from '@abp/ng.theme.lepton-x';
import { provideSideMenuLayout } from '@abp/ng.theme.lepton-x/layouts';
import {
  provideLogo,
  withEnvironmentOptions,
  ToasterService,
  provideAbpThemeShared,
  withHttpErrorConfig,
  CUSTOM_ERROR_HANDLERS,
} from '@abp/ng.theme.shared';
import { CustomToasterService } from './shared/services/custom-toaster.service';
import { AppHttpErrorHandlerService } from './shared/services/app-http-error-handler.service';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { NZ_I18N, vi_VN } from 'ng-zorro-antd/i18n';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import vi from '@angular/common/locales/vi';

registerLocaleData(vi);
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { APP_ROUTES } from './app.routes';
import { APP_ROUTE_PROVIDER } from './route.provider';
import { FOOTER_PROVIDER } from './footer/footer.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(APP_ROUTES),
    APP_ROUTE_PROVIDER,
    FOOTER_PROVIDER,
    provideAnimations(),
    provideAbpCore(
      withOptions({
        environment,
        registerLocaleFn: registerLocaleForEsBuild(),
      }),
    ),
    provideAbpOAuth(),
    provideIdentityConfig(),
    provideSettingManagementConfig(),
    provideFeatureManagementConfig(),
    provideThemeLeptonX(),
    provideSideMenuLayout(),
    provideLogo(withEnvironmentOptions(environment)),
    provideAccountConfig(),
    // provideTenantManagementConfig(),
    provideAbpThemeShared(
      withHttpErrorConfig({
        skipHandledErrorCodes: [403, 500, 505],
      })
    ),
    {
      provide: CUSTOM_ERROR_HANDLERS,
      useExisting: AppHttpErrorHandlerService,
      multi: true,
    },
    { provide: ToasterService, useClass: CustomToasterService },
    importProvidersFrom(FormsModule, HttpClientModule),
    { provide: NZ_I18N, useValue: vi_VN }
  ],
};
