import { mapEnumToOptions } from '@abp/ng.core';

export enum InventoryTransactionType {
  Import = 0,
  Export = 1,
  Adjustment = 2,
  Waste = 3,
}

export const inventoryTransactionTypeOptions = mapEnumToOptions(InventoryTransactionType);
