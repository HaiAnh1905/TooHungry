import { mapEnumToOptions } from '@abp/ng.core';

export enum PlanStatus {
  Draft = 0,
  Confirmed = 1,
  Executed = 2,
  Cancelled = 3,
}

export const planStatusOptions = mapEnumToOptions(PlanStatus);
