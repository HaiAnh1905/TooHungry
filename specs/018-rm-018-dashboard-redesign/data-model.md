# Thiết kế Mô hình Dữ liệu, Trạng thái & Giao diện: RM-018 Làm mới trang Dashboard

**Tính năng**: `RM-018 — Làm mới trang Dashboard (Dashboard Redesign)`  
**Ngày thực hiện**: 2026-10-16  
**Đặc tả**: [spec.md](spec.md) | **Kế hoạch**: [plan.md](plan.md)

---

## 1. Mô hình Dữ liệu Backend (C# DTOs)

### 1.1. Tham số Đầu vào Lọc Dữ liệu (`GetDashboardInput`)
```csharp
namespace Acme.TooHungry.Dashboard;

public enum DashboardPeriod
{
    Today = 0,       // Hôm nay (00:00:00 -> 23:59:59)
    Yesterday = 1,   // Hôm qua (00:00:00 -> 23:59:59)
    Last7Days = 2,   // 7 ngày gần nhất (mặc định)
    Custom = 3       // Tùy chỉnh theo StartDate & EndDate
}

public class GetDashboardInput
{
    public DashboardPeriod Period { get; set; } = DashboardPeriod.Last7Days;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
```

### 1.2. DTO Tổng hợp Toàn diện (`DashboardSummaryDto`)
```csharp
using System;
using System.Collections.Generic;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;

namespace Acme.TooHungry.Dashboard;

public class DashboardSummaryDto
{
    public DashboardPeriod CurrentPeriod { get; set; } = DashboardPeriod.Last7Days;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    
    // 4 Thẻ KPI chính
    public DashboardKpiDto Kpi { get; set; } = new();
    
    // Thống kê mặt bằng bàn ăn
    public LiveTableSummaryDto Tables { get; set; } = new();
    
    // Dữ liệu vẽ biểu đồ Chart.js theo chuỗi thời gian
    public List<RevenueTrendPointDto> RevenueTrend { get; set; } = new();
    
    // Top 5 món ăn bán chạy nhất
    public List<TopDishDto> TopSellingDishes { get; set; } = new();
    
    // 5 Đơn hàng mới nhất
    public List<RecentOrderDto> RecentOrders { get; set; } = new();
    
    // Cảnh báo kho nguyên liệu & lô hàng cận date
    public List<InventoryAlertDto> Alerts { get; set; } = new();
}

public class DashboardKpiDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalOrdersCount { get; set; }
    public int CompletedOrdersCount { get; set; }
    public int PendingOrdersCount { get; set; }
    public int TotalDishesCount { get; set; }
    public int TotalCategoriesCount { get; set; }
    
    // Tỷ lệ tăng trưởng so với kỳ trước (+% hoặc -%)
    public decimal RevenueGrowthPercentage { get; set; }
    public decimal OrderGrowthPercentage { get; set; }
}

public class LiveTableSummaryDto
{
    public int TotalTables { get; set; }
    public int OccupiedTables { get; set; }
    public int AvailableTables { get; set; }
    public int ReservedTables { get; set; }
    public int CleaningTables { get; set; }
    public int DisabledTables { get; set; }
    public double OccupancyRate { get; set; } // (Occupied / Total) * 100
}

public class RevenueTrendPointDto
{
    public string TimeLabel { get; set; } = string.Empty; // "09:00", "10:00" hoặc "10/10", "11/10"
    public DateTime Timestamp { get; set; }
    public decimal Revenue { get; set; }
    public int OrderCount { get; set; }
}

public class TopDishDto
{
    public Guid DishId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Price { get; set; }
    public int TotalQuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class RecentOrderDto
{
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? TableName { get; set; }
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; }
}
```

---

## 2. Mô hình Giao diện TypeScript & Signals Frontend

### 2.1. TypeScript Interfaces (`angular/src/app/proxy/dashboard/models.ts`)
```typescript
import { InventoryAlertDto } from '../inventories/models';
import { OrderStatus } from '../orders/models';

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
```

### 2.2. Reactive Signal State trong `HomeComponent`
```typescript
// Trạng thái dữ liệu phản ứng (Signals)
export class HomeComponent implements OnInit, OnDestroy {
  // Trạng thái chính
  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly selectedPeriod = signal<DashboardPeriod>(DashboardPeriod.Last7Days);
  
  // Tỷ lệ phần trăm tính toán (Computed Signals)
  readonly tablePercent = computed(() => {
    const t = this.summary()?.tables;
    if (!t || t.totalTables === 0) return { available: 0, occupied: 0, reserved: 0, cleaning: 0, disabled: 0 };
    return {
      available: (t.availableTables / t.totalTables) * 100,
      occupied: (t.occupiedTables / t.totalTables) * 100,
      reserved: (t.reservedTables / t.totalTables) * 100,
      cleaning: (t.cleaningTables / t.totalTables) * 100,
      disabled: (t.disabledTables / t.totalTables) * 100,
    };
  });
}
```

---

## 3. Bộ Từ điển Bản dịch Quốc tế Hóa (i18n Dictionary)

### 3.1. Tiếng Việt (`vi.json`)
```json
{
  "DashboardTitle": "Bảng Điều Khiển Trung Tâm",
  "DashboardSubtitle": "Tổng quan vận hành, doanh thu và nhịp độ nhà hàng",
  "Today": "Hôm nay",
  "Yesterday": "Hôm qua",
  "Last7Days": "7 ngày gần nhất",
  "CustomDateRange": "Tùy chỉnh ngày",
  "RevenueCardTitle": "Tổng Doanh Thu",
  "OrdersCardTitle": "Tổng Đơn Hàng",
  "TableOccupancyCardTitle": "Tỷ Lệ Lấp Đầy Bàn",
  "InventoryAlertsCardTitle": "Cảnh Báo Tồn Kho",
  "CompletedOrdersLabel": "Đã thanh toán",
  "PendingOrdersLabel": "Đang phục vụ",
  "GrowthFromPreviousPeriod": "so với kỳ trước",
  "RevenueTrendTitle": "Xu Hướng Doanh Thu & Đơn Hàng",
  "LiveTableStatusTitle": "Sơ Đồ Bàn Ăn Trực Tiếp",
  "BestSellersTitle": "Top Món Ăn Bán Chạy",
  "RecentOrdersTitle": "Đơn Hàng Gần Đây",
  "QuickActionsTitle": "Lối Tắt Vận Hành",
  "ActionFloorMap": "Sơ Đồ Bàn",
  "ActionMenu": "Thực Đơn",
  "ActionInventory": "Kiểm Kê Kho",
  "ActionForecast": "Kế Hoạch Mua",
  "ActionPOS": "Gọi Món POS",
  "ViewFullMap": "Xem sơ đồ chi tiết",
  "ViewAllOrders": "Xem tất cả đơn",
  "ViewAllDishes": "Xem thực đơn đầy đủ",
  "RankHeader": "Hạng",
  "SoldQuantity": "Đã bán",
  "SafeInventoryMessage": "Kho nguyên liệu ổn định, không có cảnh báo nào."
}
```

### 3.2. Tiếng Anh (`en.json`)
```json
{
  "DashboardTitle": "Central Command Dashboard",
  "DashboardSubtitle": "Overview of restaurant operations, revenue, and live rhythm",
  "Today": "Today",
  "Yesterday": "Yesterday",
  "Last7Days": "Last 7 Days",
  "CustomDateRange": "Custom Date Range",
  "RevenueCardTitle": "Total Revenue",
  "OrdersCardTitle": "Total Orders",
  "TableOccupancyCardTitle": "Table Occupancy Rate",
  "InventoryAlertsCardTitle": "Inventory Alerts",
  "CompletedOrdersLabel": "Completed",
  "PendingOrdersLabel": "Serving",
  "GrowthFromPreviousPeriod": "vs previous period",
  "RevenueTrendTitle": "Revenue & Orders Trend",
  "LiveTableStatusTitle": "Live Table Occupancy",
  "BestSellersTitle": "Best Selling Dishes",
  "RecentOrdersTitle": "Recent Orders",
  "QuickActionsTitle": "Quick Operations",
  "ActionFloorMap": "Floor Plan",
  "ActionMenu": "Menu Dishes",
  "ActionInventory": "Inventory",
  "ActionForecast": "Purchase Plan",
  "ActionPOS": "POS Order",
  "ViewFullMap": "View detailed map",
  "ViewAllOrders": "View all orders",
  "ViewAllDishes": "View full menu",
  "RankHeader": "Rank",
  "SoldQuantity": "Sold",
  "SafeInventoryMessage": "Inventory is healthy with no critical alerts."
}
```
