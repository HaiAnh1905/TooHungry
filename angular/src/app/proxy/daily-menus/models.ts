import type { AuditedEntityDto, EntityDto } from '@abp/ng.core';

export interface CreateUpdateDailyMenuDto {
  date: string;
  name?: string | null;
  isActive?: boolean;
  note?: string | null;
  items?: CreateUpdateDailyMenuItemDto[];
}

export interface CreateUpdateDailyMenuItemDto {
  dishId: string;
  specialPrice?: number | null;
  quantityLimit?: number | null;
  note?: string | null;
}

export interface DailyMenuDto extends AuditedEntityDto<string> {
  date?: string;
  name?: string | null;
  isActive?: boolean;
  note?: string | null;
  items?: DailyMenuItemDto[];
}

export interface DailyMenuItemDto extends EntityDto<string> {
  dailyMenuId?: string;
  dishId?: string;
  dishName?: string | null;
  dishPrice?: number | null;
  specialPrice?: number | null;
  quantityLimit?: number | null;
  note?: string | null;
}
