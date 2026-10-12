import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface CreateUpdateDiningAreaDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface DiningAreaDto extends FullAuditedEntityDto<string> {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  tableCount?: number;
}

export interface GetDiningAreasInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  isActive?: boolean | null;
}
