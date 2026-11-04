import { TableStatus } from '../../proxy/tables/table-status.enum';
import { OrderDto, OrderItemDto } from '../../proxy/orders/models';

export interface CashierShiftSummary {
  cashierName: string;
  shiftStartTime: string;
  totalRevenue: number;
  activeTableCount: number;
  pendingOrderCount: number;
  billRequestedCount: number;
}

export interface CashierTableCard {
  id: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  diningAreaId?: string;
  diningAreaName: string;
  occupiedDurationMinutes?: number;
  activeOrderId?: string;
  activeOrderCode?: string;
  temporaryTotalAmount: number;
  isBillRequested: boolean;
  assignedWaiterName?: string;
  reservedCustomerName?: string;
  reservedCustomerPhone?: string;
  reservedTime?: string;
  reservedGuestCount?: number;
  reservedNote?: string;
}

export interface OrderPlacedOrUpdatedDto {
  orderId: string;
  orderCode: string;
  tableId: string;
  tableNumber: string;
  totalItemCount: number;
  totalEstimatedAmount: number;
  action: 'Placed' | 'ItemsAdded' | 'Modified' | string;
  waiterName?: string;
  waiterId?: string;
  timestamp: string;
}

export interface BillRequestedDto {
  tableId: string;
  tableNumber: string;
  orderId: string;
  orderCode: string;
  totalAmount: number;
  waiterName?: string;
  waiterId?: string;
  requestedTime: string;
}

export interface PaymentCompletedDto {
  orderId: string;
  orderCode: string;
  tableId: string;
  tableNumber: string;
  paidAmount: number;
  paymentMethod: 'CASH' | 'VIETQR' | string;
  cashierName: string;
  cashierId?: string;
  completedTime: string;
}

export type CashierOrderStatusGroup = 'All' | 'Pending' | 'Processing' | 'BillRequested' | 'Completed';

export interface GetCashierOrdersParams {
  statusGroup?: CashierOrderStatusGroup;
  searchKeyword?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export type CashierNotificationType =
  | 'table_occupied'
  | 'waiter_seated'
  | 'table_transferred'
  | 'meal_ended'
  | 'table_reserved'
  | 'order_placed'
  | 'bill_requested'
  | 'payment_completed'
  | 'table_status';

export interface CashierNotificationItem {
  id: string;
  type: CashierNotificationType;
  titleKey: string;
  messageKey: string;
  titleParam?: string;
  messageParams?: any[];
  rawTitle?: string;
  rawMessage?: string;
  tableId?: string;
  tableName?: string;
  orderId?: string;
  orderCode?: string;
  timestamp: Date;
  read: boolean;
}

