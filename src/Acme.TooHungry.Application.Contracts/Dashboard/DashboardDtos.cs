using System;
using System.Collections.Generic;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;

namespace Acme.TooHungry.Dashboard;

public enum DashboardPeriod
{
    Today = 0,
    Yesterday = 1,
    Last7Days = 2,
    Custom = 3
}

public class GetDashboardInput
{
    public DashboardPeriod Period { get; set; } = DashboardPeriod.Last7Days;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

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
