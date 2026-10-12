import type { FullAuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface RecipeIngredientDto extends EntityDto<string> {
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  baseUnit: string;
  warehouseUnitName?: string;
  estimatedPrice: number;
  quantity: number;
  unit: string;
  recipeUnitId?: string;
  recipeUnitName?: string;
  conversionFactor: number;
  baseQuantity: number;
  itemEstimatedCost: number;
  isActive: boolean;
  isIngredientActive: boolean;
}

export interface RecipeDto extends FullAuditedEntityDto<string> {
  dishId: string;
  dishName: string;
  dishPrice: number;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  deactivationReason?: string;
  totalEstimatedCost: number;
  foodCostPercentage: number;
  hasDeactivatedIngredients: boolean;
  ingredients: RecipeIngredientDto[];
}

export interface CreateRecipeIngredientDto {
  ingredientId: string;
  quantity: number;
  unit?: string;
  recipeUnitId?: string;
  conversionFactor: number;
}

export interface CreateRecipeDto {
  dishId: string;
  name?: string;
  description?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface UpdateRecipeDto {
  name?: string;
  description?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface CreateOrUpdateRecipeDto {
  dishId: string;
  name?: string;
  description?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface RecipeFilterDto extends PagedAndSortedResultRequestDto {
  dishId?: string;
  dishCategoryId?: string;
  isActive?: boolean;
  filter?: string;
}
