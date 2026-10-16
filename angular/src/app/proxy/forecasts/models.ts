import type { PlanStatus } from './plan-status.enum';
import type { FullAuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface CreateUpdateDemandForecastItemDto {
  dishId: string;
  forecastQuantity: number;
  note?: string | null;
}

export interface CreateUpdateDemandForecastDto {
  forecastDate?: string;
  startDate?: string;
  endDate?: string;
  note?: string | null;
  items?: CreateUpdateDemandForecastItemDto[];
}

export interface DemandForecastItemDto extends EntityDto<string> {
  demandForecastId: string;
  dishId: string;
  dishName: string;
  dishImageUrl?: string | null;
  dishPrice: number;
  forecastQuantity: number;
  totalAmount: number;
  hasRecipe: boolean;
  note?: string | null;
}

export interface DemandForecastDto extends FullAuditedEntityDto<string> {
  forecastDate: string;
  startDate: string;
  endDate: string;
  note?: string | null;
  items: DemandForecastItemDto[];
  totalDishes: number;
  totalQuantity: number;
  projectedRevenue: number;
  ingredientPlanId?: string | null;
  ingredientPlanStatus?: PlanStatus | null;
}

export interface DemandForecastFilterDto extends PagedAndSortedResultRequestDto {
  startDate?: string;
  endDate?: string;
  filter?: string;
}

export interface GenerateForecastInputDto {
  startDate?: string;
  endDate?: string;
  historyDays?: number;
}

export interface ForecastFinancialSummaryDto {
  projectedRevenue: number;
  projectedIngredientCost: number;
  foodCostPercentage: number;
  projectedPurchaseBudget: number;
}

export interface GenerateForecastResultDto {
  startDate: string;
  endDate: string;
  analysisDays: number;
  suggestedItems: DemandForecastItemDto[];
  financialSummary: ForecastFinancialSummaryDto;
}

export interface IngredientPlanItemDto extends EntityDto<string> {
  ingredientPlanId: string;
  ingredientId: string;
  ingredientName: string;
  baseUnit: string;
  requiredQuantity: number;
  currentStock: number;
  suggestedPurchaseQuantity: number;
  estimatedPrice: number;
  estimatedCost: number;
  note?: string | null;
}

export interface IngredientPlanDto extends FullAuditedEntityDto<string> {
  demandForecastId: string;
  planDate: string;
  status: PlanStatus;
  note?: string | null;
  items: IngredientPlanItemDto[];
}

export interface UpdatePlanStatusDto {
  status: PlanStatus;
}
