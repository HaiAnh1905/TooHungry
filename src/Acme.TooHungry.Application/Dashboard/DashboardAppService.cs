using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Tables;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Dashboard;

[RemoteService(IsEnabled = false)]
[Authorize(TooHungryPermissions.Dashboard.Default)]
public class DashboardAppService : TooHungryAppService, IDashboardAppService
{
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<OrderItem, Guid> _orderItemRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<DishCategory, Guid> _categoryRepository;
    private readonly IInventoryAppService _inventoryAppService;

    public DashboardAppService(
        IRepository<Order, Guid> orderRepository,
        IRepository<OrderItem, Guid> orderItemRepository,
        IRepository<RestaurantTable, Guid> tableRepository,
        IRepository<Dish, Guid> dishRepository,
        IRepository<DishCategory, Guid> categoryRepository,
        IInventoryAppService inventoryAppService)
    {
        _orderRepository = orderRepository;
        _orderItemRepository = orderItemRepository;
        _tableRepository = tableRepository;
        _dishRepository = dishRepository;
        _categoryRepository = categoryRepository;
        _inventoryAppService = inventoryAppService;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(GetDashboardInput input)
    {
        input ??= new GetDashboardInput();

        // 1. Xác định ranh giới thời gian hiện tại và kỳ đối sánh
        var (fromDate, toDate, prevFromDate, prevToDate) = CalculatePeriodBoundaries(input);

        var ordersQuery = await _orderRepository.GetQueryableAsync();
        var orderItemsQuery = await _orderItemRepository.GetQueryableAsync();
        var tablesQuery = await _tableRepository.GetQueryableAsync();
        var dishesQuery = await _dishRepository.GetQueryableAsync();
        var categoriesQuery = await _categoryRepository.GetQueryableAsync();

        // 2. Doanh thu & Đơn hàng trong kỳ
        var completedOrdersInPeriod = ordersQuery.Where(o =>
            o.Status == OrderStatus.Completed &&
            o.OrderDate >= fromDate &&
            o.OrderDate <= toDate);

        var currentCompletedList = await AsyncExecuter.ToListAsync(
            completedOrdersInPeriod.Select(o => new OrderTrendSummary(o.OrderDate, o.TotalAmount)));

        var totalRevenue = currentCompletedList.Sum(o => o.TotalAmount);
        var completedOrdersCount = currentCompletedList.Count;

        // Đơn hàng đang phục vụ (Pending hoặc Processing)
        var pendingOrdersCount = await AsyncExecuter.CountAsync(
            ordersQuery.Where(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Processing));

        var totalOrdersCount = completedOrdersCount + pendingOrdersCount;

        // Số liệu kỳ trước để tính tăng trưởng
        var prevCompletedOrders = ordersQuery.Where(o =>
            o.Status == OrderStatus.Completed &&
            o.OrderDate >= prevFromDate &&
            o.OrderDate <= prevToDate);

        var prevAmounts = await AsyncExecuter.ToListAsync(prevCompletedOrders.Select(o => o.TotalAmount));
        var prevRevenue = prevAmounts.Sum();
        var prevOrdersCount = prevAmounts.Count;

        var revenueGrowthPercentage = CalculateGrowthPercentage(totalRevenue, prevRevenue);
        var orderGrowthPercentage = CalculateGrowthPercentage(completedOrdersCount, prevOrdersCount);

        // Món ăn & Danh mục
        var totalDishesCount = await AsyncExecuter.CountAsync(dishesQuery.Where(d => d.IsActive));
        var totalCategoriesCount = await AsyncExecuter.CountAsync(categoriesQuery);

        // 3. Thống kê bàn ăn trực tiếp
        var tableStatuses = await AsyncExecuter.ToListAsync(tablesQuery.Select(t => t.Status));
        var totalTables = tableStatuses.Count;
        var occupiedTables = tableStatuses.Count(s => s == TableStatus.Occupied);
        var availableTables = tableStatuses.Count(s => s == TableStatus.Available);
        var reservedTables = tableStatuses.Count(s => s == TableStatus.Reserved);
        var cleaningTables = tableStatuses.Count(s => s == TableStatus.Cleaning);
        var disabledTables = tableStatuses.Count(s => s == TableStatus.Disabled);
        var occupancyRate = totalTables > 0
            ? Math.Round((occupiedTables / (double)totalTables) * 100, 1)
            : 0;

        // 4. Chuỗi xu hướng doanh thu & đơn hàng
        var revenueTrend = CalculateRevenueTrend(currentCompletedList, input.Period, fromDate, toDate);

        // 5. Top 5 món bán chạy nhất
        var topSellingDishes = await CalculateTopSellingDishesAsync(orderItemsQuery, ordersQuery, fromDate, toDate);

        // 6. Đơn hàng mới nhất (5 đơn)
        var recentOrdersWithTableQuery = (await _orderRepository.WithDetailsAsync(o => o.Table!))
            .OrderByDescending(o => o.OrderDate)
            .Take(5);

        var recentOrderEntities = await AsyncExecuter.ToListAsync(recentOrdersWithTableQuery);
        var recentOrders = recentOrderEntities.Select(o => new RecentOrderDto
        {
            OrderId = o.Id,
            OrderNumber = o.OrderNumber,
            TableName = o.Table != null ? o.Table.Name : null,
            OrderDate = o.OrderDate,
            TotalAmount = o.TotalAmount,
            Status = o.Status
        }).ToList();

        // 7. Cảnh báo kho nguyên liệu
        List<InventoryAlertDto> alerts;
        try
        {
            alerts = await _inventoryAppService.GetAlertsAsync() ?? new List<InventoryAlertDto>();
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Không thể tải danh sách cảnh báo tồn kho cho Dashboard. Trả về danh sách rỗng an toàn.");
            alerts = new List<InventoryAlertDto>();
        }

        return new DashboardSummaryDto
        {
            CurrentPeriod = input.Period,
            FromDate = fromDate,
            ToDate = toDate,
            Kpi = new DashboardKpiDto
            {
                TotalRevenue = totalRevenue,
                TotalOrdersCount = totalOrdersCount,
                CompletedOrdersCount = completedOrdersCount,
                PendingOrdersCount = pendingOrdersCount,
                TotalDishesCount = totalDishesCount,
                TotalCategoriesCount = totalCategoriesCount,
                RevenueGrowthPercentage = revenueGrowthPercentage,
                OrderGrowthPercentage = orderGrowthPercentage
            },
            Tables = new LiveTableSummaryDto
            {
                TotalTables = totalTables,
                OccupiedTables = occupiedTables,
                AvailableTables = availableTables,
                ReservedTables = reservedTables,
                CleaningTables = cleaningTables,
                DisabledTables = disabledTables,
                OccupancyRate = occupancyRate
            },
            RevenueTrend = revenueTrend,
            TopSellingDishes = topSellingDishes,
            RecentOrders = recentOrders,
            Alerts = alerts
        };
    }

    private (DateTime fromDate, DateTime toDate, DateTime prevFromDate, DateTime prevToDate) CalculatePeriodBoundaries(GetDashboardInput input)
    {
        var now = Clock.Now;
        var todayStart = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        var todayEnd = todayStart.AddDays(1).AddTicks(-1);

        DateTime fromDate;
        DateTime toDate;
        DateTime prevFromDate;
        DateTime prevToDate;

        switch (input.Period)
        {
            case DashboardPeriod.Today:
                fromDate = todayStart;
                toDate = todayEnd;
                prevFromDate = todayStart.AddDays(-1);
                prevToDate = todayStart.AddTicks(-1);
                break;

            case DashboardPeriod.Yesterday:
                fromDate = todayStart.AddDays(-1);
                toDate = todayStart.AddTicks(-1);
                prevFromDate = todayStart.AddDays(-2);
                prevToDate = fromDate.AddTicks(-1);
                break;

            case DashboardPeriod.Custom:
                var start = input.StartDate ?? todayStart.AddDays(-6);
                var end = input.EndDate ?? todayStart;
                if (start > end)
                {
                    (start, end) = (end, start);
                }
                fromDate = new DateTime(start.Year, start.Month, start.Day, 0, 0, 0, DateTimeKind.Utc);
                toDate = new DateTime(end.Year, end.Month, end.Day, 23, 59, 59, 999, DateTimeKind.Utc);

                var span = toDate - fromDate;
                prevToDate = fromDate.AddTicks(-1);
                prevFromDate = prevToDate - span;
                break;

            case DashboardPeriod.Last7Days:
            default:
                fromDate = todayStart.AddDays(-6);
                toDate = todayEnd;
                prevToDate = fromDate.AddTicks(-1);
                prevFromDate = fromDate.AddDays(-7);
                break;
        }

        return (fromDate, toDate, prevFromDate, prevToDate);
    }

    private static decimal CalculateGrowthPercentage(decimal current, decimal previous)
    {
        if (previous == 0)
        {
            return current > 0 ? 100m : 0m;
        }

        var growth = ((current - previous) / previous) * 100m;
        return Math.Round(growth, 1);
    }

    private static List<RevenueTrendPointDto> CalculateRevenueTrend(
        IReadOnlyList<OrderTrendSummary> orders,
        DashboardPeriod period,
        DateTime fromDate,
        DateTime toDate)
    {
        var isSingleDay = period == DashboardPeriod.Today ||
                          period == DashboardPeriod.Yesterday ||
                          (toDate - fromDate).TotalHours <= 25;

        var trendPoints = new List<RevenueTrendPointDto>();

        if (isSingleDay)
        {
            // 15 khung giờ từ 09:00 đến 23:00
            for (var hour = 9; hour <= 23; hour++)
            {
                var ordersInHour = orders.Where(o => o.OrderDate.Hour == hour).ToList();
                trendPoints.Add(new RevenueTrendPointDto
                {
                    TimeLabel = $"{hour:D2}:00",
                    Timestamp = fromDate.Date.AddHours(hour),
                    Revenue = ordersInHour.Sum(o => o.TotalAmount),
                    OrderCount = ordersInHour.Count
                });
            }
        }
        else
        {
            // Theo từng ngày từ fromDate đến toDate
            var currentDay = fromDate.Date;
            var endDay = toDate.Date;

            while (currentDay <= endDay)
            {
                var day = currentDay;
                var ordersInDay = orders.Where(o => o.OrderDate.Date == day).ToList();

                trendPoints.Add(new RevenueTrendPointDto
                {
                    TimeLabel = day.ToString("dd/MM"),
                    Timestamp = day,
                    Revenue = ordersInDay.Sum(o => o.TotalAmount),
                    OrderCount = ordersInDay.Count
                });

                currentDay = currentDay.AddDays(1);
            }
        }

        return trendPoints;
    }

    private async Task<List<TopDishDto>> CalculateTopSellingDishesAsync(
        IQueryable<OrderItem> orderItemsQuery,
        IQueryable<Order> ordersQuery,
        DateTime fromDate,
        DateTime toDate)
    {
        var topSoldQuery = (
            from item in orderItemsQuery
            join order in ordersQuery on item.OrderId equals order.Id
            where order.Status == OrderStatus.Completed &&
                  order.OrderDate >= fromDate &&
                  order.OrderDate <= toDate
            group item by item.DishId into g
            select new
            {
                DishId = g.Key,
                TotalQuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.TotalPrice)
            }
        )
        .OrderByDescending(x => x.TotalQuantitySold)
        .Take(5);

        var topSoldStats = await AsyncExecuter.ToListAsync(topSoldQuery);

        if (topSoldStats.Count == 0)
        {
            return new List<TopDishDto>();
        }

        var dishIds = topSoldStats.Select(s => s.DishId).ToList();
        var dishesWithCategoryQuery = (await _dishRepository.WithDetailsAsync(d => d.DishCategory!))
            .Where(d => dishIds.Contains(d.Id));

        var dishEntities = await AsyncExecuter.ToListAsync(dishesWithCategoryQuery);
        var dishMap = dishEntities.ToDictionary(d => d.Id);

        var result = new List<TopDishDto>();
        foreach (var stat in topSoldStats)
        {
            dishMap.TryGetValue(stat.DishId, out var dish);
            result.Add(new TopDishDto
            {
                DishId = stat.DishId,
                DishName = dish?.Name ?? "Món không xác định",
                CategoryName = dish?.DishCategory?.Name,
                ImageUrl = dish?.ImageUrl,
                Price = dish?.Price ?? 0m,
                TotalQuantitySold = stat.TotalQuantitySold,
                TotalRevenue = stat.TotalRevenue
            });
        }

        return result;
    }
}

public record OrderTrendSummary(DateTime OrderDate, decimal TotalAmount);
