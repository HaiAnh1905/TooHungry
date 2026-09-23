import type { AuditedEntityDto } from '@abp/ng.core';

export interface CreateUpdateIngredientCategoryDto {
  name?: string;
  description?: string | null;
}

export interface CreateUpdateIngredientDto {
  name?: string;
  unitId?: string;
  ingredientCategoryId?: string;
}

export interface CreateUpdateUnitDto {
  name?: string;
  abbreviation?: string | null;
}

export interface IngredientCategoryDto extends AuditedEntityDto<string> {
  name?: string;
  description?: string | null;
}

export interface IngredientDto extends AuditedEntityDto<string> {
  name?: string;
  unitId?: string;
  unitName?: string | null;
  ingredientCategoryId?: string;
  ingredientCategoryName?: string | null;
}

export interface UnitDto extends AuditedEntityDto<string> {
  name?: string;
  abbreviation?: string | null;
}
