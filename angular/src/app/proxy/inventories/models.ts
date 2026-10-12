export enum StorageType {
  FRESH = 0,
  SHORT_TERM = 1,
  LONG_TERM = 2,
}

export enum InventoryTransactionType {
  IN = 1,
  OUT = 2,
  ADJUSTMENT_IN = 3,
  ADJUSTMENT_OUT = 4,
}

export interface InventoryBatchDto {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  batchCode: string;
  receivedAt: string;
  expiryDate?: string;
  initialQuantity: number;
  quantity?: number;
  remainingQuantity: number;
  purchaseUnit?: string;
  unitPrice: number;
  unitCost?: number;
  storageType: StorageType;
  isCleared: boolean;
  isActive?: boolean;
  deactivationReason?: string;
}

export interface DeactivateBatchDto {
  reasonCode?: string;
  reason: string;
}

export interface GetInventoryBatchesInput {
  ingredientId?: string;
  onlyAvailable?: boolean;
  isActive?: boolean;
  filter?: string;
  skipCount?: number;
  maxResultCount?: number;
  sorting?: string;
}

export interface DiscardBatchInputDto {
  reason: string;
}

export interface InventoryTransactionDto {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  batchId?: string;
  batchCode?: string;
  transactionType?: InventoryTransactionType;
  type?: InventoryTransactionType;
  quantity: number;
  unitCost?: number;
  reason?: string;
  referenceId?: string;
  creationTime: string;
}

export interface BatchDeductionItemDto {
  batchId: string;
  quantity: number;
  deductQuantity?: number;
}

export interface StockAdjustmentRequestDto {
  ingredientId: string;
  actualQuantity: number;
  reason: string;
  batchDeductions: BatchDeductionItemDto[];
}

export interface CreateInventoryBatchDto {
  ingredientId: string;
  batchCode: string;
  initialQuantity?: number;
  purchaseQuantity?: number;
  purchaseUnit?: string;
  conversionFactor?: number;
  unitPrice?: number;
  unitCost?: number;
  expiryDate?: string;
  storageType?: StorageType;
}

export interface InventoryAlertDto {
  ingredientId: string;
  ingredientName?: string;
  batchId?: string;
  batchCode?: string;
  severity?: string;
  storageType?: StorageType;
  alertType: string;
  type?: string;
  message: string;
  remainingQuantity?: number;
  expiryDate?: string;
  timestamp?: string;
}
