import type { OrderStatus } from './order-status.enum';
import type { AuditedEntityDto, EntityDto } from '@abp/ng.core';

export interface CreateUpdateOrderDto {
  orderNumber?: string;
  orderDate?: string;
  status?: OrderStatus;
  totalAmount?: number;
  note?: string | null;
  tableId?: string | null;
  items?: CreateUpdateOrderItemDto[];
}

export interface CreateUpdateOrderItemDto {
  dishId?: string;
  quantity?: number;
  unitPrice?: number;
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
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}
