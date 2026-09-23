import type { InventoryTransactionType } from './inventory-transaction-type.enum';
import type { AuditedEntityDto } from '@abp/ng.core';

export interface CreateInventoryTransactionDto {
  inventoryId?: string;
  quantity?: number;
  transactionType?: InventoryTransactionType;
  transactionDate?: string;
  note?: string | null;
}

export interface CreateUpdateInventoryBatchDto {
  inventoryId?: string;
  batchNumber?: string;
  quantity?: number;
  expiryDate?: string | null;
  receivedDate?: string;
}

export interface CreateUpdateInventoryDto {
  ingredientId?: string;
  currentStock?: number;
  minimumStock?: number;
}

export interface InventoryBatchDto extends AuditedEntityDto<string> {
  inventoryId?: string;
  batchNumber?: string;
  quantity?: number;
  expiryDate?: string | null;
  receivedDate?: string;
}

export interface InventoryDto extends AuditedEntityDto<string> {
  ingredientId?: string;
  ingredientName?: string | null;
  currentStock?: number;
  minimumStock?: number;
}

export interface InventoryTransactionDto extends AuditedEntityDto<string> {
  inventoryId?: string;
  quantity?: number;
  transactionType?: InventoryTransactionType;
  transactionDate?: string;
  note?: string | null;
}
