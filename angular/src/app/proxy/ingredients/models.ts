import { StorageType } from '../inventories/models';

export enum ConsumptionMethod {
  RECIPE = 1,
  MANUAL = 2,
  HYBRID = 3,
}

export interface IngredientDto {
  id: string;
  name: string;
  code?: string;
  baseUnit?: string | null;
  unitName?: string;
  unitId?: string;
  minStock: number;
  estimatedPrice?: number;
  storageType: StorageType;
  consumptionMethod: ConsumptionMethod;
  currentStock: number;
  expiredStock?: number;
  canEditUnit?: boolean;
  isActive: boolean;
  deactivationReason?: string;
  creationTime?: string;
}

export interface CreateIngredientDto {
  name: string;
  code?: string;
  baseUnit?: string | null;
  unitId?: string;
  minStock: number;
  estimatedPrice?: number;
  storageType: StorageType;
  consumptionMethod: ConsumptionMethod;
}

export interface UpdateIngredientDto {
  name: string;
  code?: string;
  baseUnit?: string | null;
  unitId?: string;
  minStock: number;
  estimatedPrice?: number;
  storageType: StorageType;
  consumptionMethod: ConsumptionMethod;
  isActive?: boolean;
}

export interface GetIngredientsInput {
  filter?: string;
  storageType?: StorageType;
  consumptionMethod?: ConsumptionMethod;
  isActive?: boolean;
  skipCount?: number;
  maxResultCount?: number;
  sorting?: string;
}

export interface SmartRestoreDto {
  newMinStock: number;
}

export interface DeactivateInput {
  reason: string;
}
