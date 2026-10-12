import type { AuditedEntityDto } from '@abp/ng.core';

export interface CreateUpdateUnitDto {
  name: string;
  abbreviation?: string | null;
  isActive?: boolean;
}

export interface UnitDto extends AuditedEntityDto<string> {
  name?: string;
  abbreviation?: string | null;
  isActive?: boolean;
}
