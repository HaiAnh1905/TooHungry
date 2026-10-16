import type { TableStatus } from './table-status.enum';
import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface CreateUpdateTableDto {
  name?: string;
  capacity?: number;
  status?: TableStatus;
  diningAreaId?: string | null;
  location?: string | null;
  reservedCustomerName?: string | null;
  reservedCustomerPhone?: string | null;
  reservedTime?: string | null;
  reservedGuestCount?: number | null;
  reservedNote?: string | null;
  occupiedTime?: string | null;
}

export interface GetTablesInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  status?: TableStatus | null;
  diningAreaId?: string | null;
}

export interface TableDto extends FullAuditedEntityDto<string> {
  name?: string;
  capacity?: number;
  status?: TableStatus;
  diningAreaId?: string | null;
  diningAreaName?: string | null;
  location?: string | null;
  reservedCustomerName?: string | null;
  reservedCustomerPhone?: string | null;
  reservedTime?: string | null;
  reservedGuestCount?: number | null;
  reservedNote?: string | null;
  activeOrderId?: string | null;
  hasActiveOrder?: boolean;
  occupiedTime?: string | null;
}

export interface TransferTableInputDto {
  sourceTableId: string;
  targetTableId: string;
  note?: string | null;
}

export interface MergeTablesInputDto {
  primaryTableId: string;
  secondaryTableId: string;
  note?: string | null;
}

