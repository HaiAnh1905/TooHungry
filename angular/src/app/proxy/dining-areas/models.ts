import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface DiningAreaDto extends FullAuditedEntityDto<string> {
  name: string;
  description?: string;
  tableCount: number;
}

export interface CreateUpdateDiningAreaDto {
  name: string;
  description?: string;
}

export interface GetDiningAreasInput extends PagedAndSortedResultRequestDto {
  filter?: string;
}
