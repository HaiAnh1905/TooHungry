import { InventoryAlertDto } from '../inventories/models';
import { OrderStatus } from '../orders/order-status.enum';

export enum DashboardPeriod {
  Today = 0,
  Yesterday = 1,
  Last7Days = 2,
  Custom = 3,
}

export interface GetDashboardInput {
  period?: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export interface DashboardSummaryDto {
  currentPeriod: DashboardPeriod;
  fromDate: string;
  toDate: string;
  kpi: DashboardKpiDto;
  tables: LiveTableSummaryDto;
  revenueTrend: RevenueTrendPointDto[];
  topSellingDishes: TopDishDto[];
  recentOrders: RecentOrderDto[];
  alerts: InventoryAlertDto[];
}

export interface DashboardKpiDto {
  totalRevenue: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  totalDishesCount: number;
  totalCategoriesCount: number;
  revenueGrowthPercentage: number;
  orderGrowthPercentage: number;
}

export interface LiveTableSummaryDto {
  totalTables: number;
  occupiedTables: number;
  availableTables: number;
  reservedTables: number;
  cleaningTables: number;
  disabledTables: number;
  occupancyRate: number;
}

export interface RevenueTrendPointDto {
  timeLabel: string;
  timestamp: string;
  revenue: number;
  orderCount: number;
}

export interface TopDishDto {
  dishId: string;
  dishName: string;
  categoryName?: string;
  imageUrl?: string;
  price: number;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface RecentOrderDto {
  orderId: string;
  orderNumber: string;
  tableName?: string;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
}
