import type { AuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface CreateUpdateDishDto {
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isActive?: boolean;
  dishCategoryId?: string | null;
}

export interface CreateUpdateRecipeDto {
  dishId: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  recipeIngredients?: CreateUpdateRecipeIngredientDto[];
}

export interface CreateUpdateRecipeIngredientDto {
  ingredientId: string;
  quantity?: number;
  note?: string | null;
}

export interface DeleteDishDto {
  deletionReason: string;
}

export interface DishDto extends AuditedEntityDto<string> {
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  isActive?: boolean;
  deletionReason?: string | null;
  dishCategoryId?: string | null;
  dishCategoryName?: string | null;
  hasRecipe?: boolean;
  recipeId?: string | null;
}

export interface GetDishesInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  dishCategoryId?: string | null;
  isActive?: boolean | null;
}

export interface RecipeDto extends AuditedEntityDto<string> {
  dishId?: string;
  dishName?: string | null;
  name?: string;
  description?: string | null;
  instructions?: string | null;
  recipeIngredients?: RecipeIngredientDto[];
}

export interface RecipeIngredientDto extends EntityDto<string> {
  recipeId?: string;
  ingredientId?: string;
  ingredientName?: string | null;
  unitName?: string | null;
  quantity?: number;
  note?: string | null;
}

export interface BulkToggleActiveDishDto {
  dishIds: string[];
  isActive: boolean;
}

export interface BulkActionResultDto {
  success?: boolean;
  updatedCount?: number;
  message?: string | null;
}

export interface CreateUpdateDishCategoryDto {
  name: string;
  description?: string | null;
  displayOrder?: number;
}

export interface DishCategoryDto extends AuditedEntityDto<string> {
  name?: string;
  description?: string | null;
  displayOrder?: number;
}
