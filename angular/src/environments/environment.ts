import { Environment } from '@abp/ng.core';

const baseUrl = 'http://localhost:4200';

const oAuthConfig = {
  issuer: 'https://localhost:44353/',
  redirectUri: baseUrl,
  clientId: 'TooHungry_App',
  responseType: 'code',
  scope: 'offline_access TooHungry',
  requireHttps: true,
};

export const environment = {
  production: false,
  application: {
    baseUrl,
    name: 'TooHungry',
  },
  oAuthConfig,
  apis: {
    default: {
      url: 'https://localhost:44353',
      rootNamespace: 'Acme.TooHungry',
    },
    AbpAccountPublic: {
      url: oAuthConfig.issuer,
      rootNamespace: 'AbpAccountPublic',
    },
  },
  vietQrConfig: {
    bankId: '970422',
    bankName: 'MBBank',
    accountNo: '9999888866',
    accountName: 'NHA HANG TOOHUNGRY',
    template: 'compact2',
  },
} as Environment & {
  vietQrConfig: {
    bankId: string;
    bankName: string;
    accountNo: string;
    accountName: string;
    template: string;
  };
};
