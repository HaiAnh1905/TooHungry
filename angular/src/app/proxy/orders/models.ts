import type { OrderStatus } from './order-status.enum';
import type { AuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface CreateUpdateOrderDto {
  orderNumber?: string;
  orderDate?: string;
  status?: OrderStatus;
  note?: string | null;
  tableId?: string | null;
  items?: CreateUpdateOrderItemDto[];
}

export interface CreateUpdateOrderItemDto {
  dishId?: string;
  quantity?: number;
  note?: string | null;
}

export interface OrderDto extends AuditedEntityDto<string> {
  orderNumber?: string;
  orderDate?: string;
  status?: OrderStatus;
  totalAmount?: number;
  note?: string | null;
  tableId?: string | null;
  tableName?: string | null;
  items?: OrderItemDto[];
}

export interface OrderItemDto extends EntityDto<string> {
  orderId?: string;
  dishId?: string;
  dishName?: string | null;
  dishPhotoUrl?: string | null;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  note?: string | null;
}

export interface SubmitOrderItemDto {
  dishId?: string;
  quantity?: number;
  note?: string | null;
}

export interface SubmitOrderInputDto {
  orderId?: string | null;
  tableId?: string;
  note?: string | null;
  items?: SubmitOrderItemDto[];
}

export interface CancelOrderInputDto {
  orderId?: string | null;
  reason?: string | null;
}

export interface ValidateOrderStockInputDto {
  items?: SubmitOrderItemDto[];
}

export interface StockShortageItemDto {
  dishId?: string;
  dishName?: string;
  ingredientName?: string;
  requiredQuantity?: number;
  requestedQuantity?: number;
  availableQuantity?: number;
  unitName?: string;
  warningMessage?: string;
}

export interface StockValidationResultDto {
  isValid: boolean;
  shortages: StockShortageItemDto[];
}

export enum PaymentMethod {
  Cash = 1,
  VietQr = 2,
}

export interface CompletePaymentInputDto {
  paymentMethod: PaymentMethod;
  cashGiven?: number;
  paymentNote?: string | null;
}

export interface GetOrdersInputDto extends Partial<PagedAndSortedResultRequestDto> {
  filter?: string;
  status?: OrderStatus;
}

