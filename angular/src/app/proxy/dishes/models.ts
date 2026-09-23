import type { AuditedEntityDto, EntityDto } from '@abp/ng.core';

export interface CreateUpdateDishCategoryDto {
  name: string;
  description?: string | null;
}

export interface CreateUpdateDishDto {
  name: string;
  price: number;
  imageUrl?: string | null;
  dishCategoryId?: string | null;
  description?: string | null;
}

export interface CreateUpdateRecipeDto {
  dishId: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  recipeIngredients?: CreateUpdateRecipeIngredientDto[];
}

export interface CreateUpdateRecipeIngredientDto {
  ingredientId?: string;
  quantity?: number;
  note?: string | null;
}

export interface DishCategoryDto extends AuditedEntityDto<string> {
  name?: string;
  description?: string | null;
}

export interface DishDto extends AuditedEntityDto<string> {
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  dishCategoryId?: string | null;
  dishCategoryName?: string | null;
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
  quantity?: number;
  note?: string | null;
}
