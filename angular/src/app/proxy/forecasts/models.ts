import type { PlanStatus } from './plan-status.enum';
import type { AuditedEntityDto, EntityDto } from '@abp/ng.core';

export interface CreateUpdateDemandForecastDto {
  forecastDate?: string;
  startDate?: string;
  endDate?: string;
  note?: string | null;
  items?: CreateUpdateDemandForecastItemDto[];
}

export interface CreateUpdateDemandForecastItemDto {
  dishId?: string;
  forecastQuantity?: number;
}

export interface CreateUpdateIngredientPlanDto {
  demandForecastId?: string;
  planDate?: string;
  status?: PlanStatus;
  items?: CreateUpdateIngredientPlanItemDto[];
}

export interface CreateUpdateIngredientPlanItemDto {
  ingredientId?: string;
  requiredQuantity?: number;
}

export interface DemandForecastDto extends AuditedEntityDto<string> {
  forecastDate?: string;
  startDate?: string;
  endDate?: string;
  note?: string | null;
  items?: DemandForecastItemDto[];
}

export interface DemandForecastItemDto extends EntityDto<string> {
  demandForecastId?: string;
  dishId?: string;
  dishName?: string | null;
  forecastQuantity?: number;
}

export interface IngredientPlanDto extends AuditedEntityDto<string> {
  demandForecastId?: string;
  planDate?: string;
  status?: PlanStatus;
  items?: IngredientPlanItemDto[];
}

export interface IngredientPlanItemDto extends EntityDto<string> {
  ingredientPlanId?: string;
  ingredientId?: string;
  ingredientName?: string | null;
  requiredQuantity?: number;
}
