import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export enum TableStatus {
  Available = 0,
  Occupied = 1,
  Reserved = 2,
  Disabled = 3,
}

export const tableStatusOptions = [
  { value: TableStatus.Available, key: '::TableStatusAvailable' },
  { value: TableStatus.Occupied, key: '::TableStatusOccupied' },
  { value: TableStatus.Reserved, key: '::TableStatusReserved' },
  { value: TableStatus.Disabled, key: '::TableStatusDisabled' },
];

export interface TableDto extends FullAuditedEntityDto<string> {
  name: string;
  capacity: number;
  status: TableStatus;
  diningAreaId?: string;
  diningAreaName?: string;
  location?: string;
  reservedCustomerName?: string;
  reservedCustomerPhone?: string;
  reservedTime?: string;
  reservedGuestCount?: number;
  reservedNote?: string;
}

export interface CreateUpdateTableDto {
  name: string;
  capacity: number;
  status: TableStatus;
  diningAreaId?: string;
  location?: string;
  reservedCustomerName?: string;
  reservedCustomerPhone?: string;
  reservedTime?: string;
  reservedGuestCount?: number;
  reservedNote?: string;
}

export interface GetTablesInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: TableStatus;
  diningAreaId?: string;
}
