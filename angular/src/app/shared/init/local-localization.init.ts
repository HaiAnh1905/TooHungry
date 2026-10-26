import { inject, APP_INITIALIZER, Provider } from '@angular/core';
import { LocalizationService } from '@abp/ng.core';
import viData from '../../../assets/i18n/vi.json';
import enData from '../../../assets/i18n/en.json';

export function initializeLocalLocalization(): () => void {
  const localizationService = inject(LocalizationService);
  return () => {
    localizationService.addLocalization([
      {
        culture: 'vi',
        resources: [
          {
            resourceName: 'TooHungry',
            texts: viData as Record<string, string>,
          },
        ],
      },
      {
        culture: 'en',
        resources: [
          {
            resourceName: 'TooHungry',
            texts: enData as Record<string, string>,
          },
        ],
      },
    ]);
  };
}

export const LOCAL_LOCALIZATION_PROVIDER: Provider = {
  provide: APP_INITIALIZER,
  useFactory: initializeLocalLocalization,
  multi: true,
};
