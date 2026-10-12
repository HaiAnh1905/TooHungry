import { mapEnumToOptions } from '@abp/ng.core';

export enum ReservationStatus {
  Confirmed = 1,
  Completed = 2,
  Cancelled = 3,
  AutoCancelled = 4,
}

export const reservationStatusOptions = mapEnumToOptions(ReservationStatus);
