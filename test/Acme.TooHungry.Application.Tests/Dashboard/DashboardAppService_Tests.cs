using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Dashboard;

public abstract class DashboardAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IDashboardAppService _dashboardAppService;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<OrderItem, Guid> _orderItemRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<DishCategory, Guid> _categoryRepository;

    protected DashboardAppService_Tests()
    {
        _dashboardAppService = GetRequiredService<IDashboardAppService>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
        _orderItemRepository = GetRequiredService<IRepository<OrderItem, Guid>>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _categoryRepository = GetRequiredService<IRepository<DishCategory, Guid>>();
    }

    [Fact]
    public async Task Should_Calculate_Kpi_And_Revenue_Correctly()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var now = DateTime.UtcNow;

            // Đơn hoàn tất hôm nay
            var completedOrder = await _orderRepository.InsertAsync(new Order
            {
                OrderNumber = "ORD-TEST-001",
                OrderDate = now,
                Status = OrderStatus.Completed,
                TotalAmount = 500000m
            }, autoSave: true);

            // Đơn đang phục vụ hôm nay
            var pendingOrder = await _orderRepository.InsertAsync(new Order
            {
                OrderNumber = "ORD-TEST-002",
                OrderDate = now,
                Status = OrderStatus.Processing,
                TotalAmount = 300000m
            }, autoSave: true);

            var summary = await _dashboardAppService.GetSummaryAsync(new GetDashboardInput
            {
                Period = DashboardPeriod.Today
            });

            summary.ShouldNotBeNull();
            summary.Kpi.TotalRevenue.ShouldBeGreaterThanOrEqualTo(500000m);
            summary.Kpi.CompletedOrdersCount.ShouldBeGreaterThanOrEqualTo(1);
            summary.Kpi.PendingOrdersCount.ShouldBeGreaterThanOrEqualTo(1);
            summary.Kpi.TotalOrdersCount.ShouldBe(summary.Kpi.CompletedOrdersCount + summary.Kpi.PendingOrdersCount);
        });
    }

    [Fact]
    public async Task Should_Calculate_Table_Occupancy_Rate_Correctly()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            await _tableRepository.InsertAsync(new RestaurantTable
            {
                Name = "Table T1",
                Capacity = 4,
                Status = TableStatus.Occupied
            }, autoSave: true);

            await _tableRepository.InsertAsync(new RestaurantTable
            {
                Name = "Table T2",
                Capacity = 2,
                Status = TableStatus.Available
            }, autoSave: true);

            var summary = await _dashboardAppService.GetSummaryAsync(new GetDashboardInput
            {
                Period = DashboardPeriod.Today
            });

            summary.Tables.ShouldNotBeNull();
            summary.Tables.TotalTables.ShouldBeGreaterThanOrEqualTo(2);
            summary.Tables.OccupiedTables.ShouldBeGreaterThanOrEqualTo(1);
            summary.Tables.AvailableTables.ShouldBeGreaterThanOrEqualTo(1);
            summary.Tables.OccupancyRate.ShouldBeGreaterThan(0);
        });
    }

    [Fact]
    public async Task Should_Retrieve_Top_Selling_Dishes_In_Period()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var now = DateTime.UtcNow;

            var category = await _categoryRepository.InsertAsync(new DishCategory
            {
                Name = "Món Nổi Bật",
                DisplayOrder = 1
            }, autoSave: true);

            var dish1 = await _dishRepository.InsertAsync(new Dish
            {
                Name = "Bò Lúc Lắc",
                Price = 150000m,
                DishCategoryId = category.Id,
                IsActive = true
            }, autoSave: true);

            var dish2 = await _dishRepository.InsertAsync(new Dish
            {
                Name = "Cơm Chiên Hải Sản",
                Price = 100000m,
                DishCategoryId = category.Id,
                IsActive = true
            }, autoSave: true);

            var order = await _orderRepository.InsertAsync(new Order
            {
                OrderNumber = "ORD-TOP-001",
                OrderDate = now,
                Status = OrderStatus.Completed,
                TotalAmount = 550000m
            }, autoSave: true);

            await _orderItemRepository.InsertAsync(new OrderItem
            {
                OrderId = order.Id,
                DishId = dish1.Id,
                Quantity = 3,
                UnitPrice = 150000m,
                TotalPrice = 450000m
            }, autoSave: true);

            await _orderItemRepository.InsertAsync(new OrderItem
            {
                OrderId = order.Id,
                DishId = dish2.Id,
                Quantity = 1,
                UnitPrice = 100000m,
                TotalPrice = 100000m
            }, autoSave: true);

            var summary = await _dashboardAppService.GetSummaryAsync(new GetDashboardInput
            {
                Period = DashboardPeriod.Today
            });

            summary.TopSellingDishes.ShouldNotBeNull();
            summary.TopSellingDishes.Count.ShouldBeGreaterThanOrEqualTo(2);
            // Món có số lượng bán nhiều nhất xếp trước
            var firstDish = summary.TopSellingDishes[0];
            firstDish.DishId.ShouldBe(dish1.Id);
            firstDish.TotalQuantitySold.ShouldBe(3);
            firstDish.TotalRevenue.ShouldBe(450000m);
        });
    }

    [Fact]
    public async Task Should_Generate_Hourly_And_Daily_Trend_Points()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            // Hourly trend for Today (09:00 -> 23:00)
            var summaryToday = await _dashboardAppService.GetSummaryAsync(new GetDashboardInput
            {
                Period = DashboardPeriod.Today
            });

            summaryToday.RevenueTrend.ShouldNotBeNull();
            summaryToday.RevenueTrend.Count.ShouldBe(15); // 9 to 23
            summaryToday.RevenueTrend[0].TimeLabel.ShouldBe("09:00");
            summaryToday.RevenueTrend[^1].TimeLabel.ShouldBe("23:00");

            // Daily trend for Last7Days (7 points)
            var summary7Days = await _dashboardAppService.GetSummaryAsync(new GetDashboardInput
            {
                Period = DashboardPeriod.Last7Days
            });

            summary7Days.RevenueTrend.ShouldNotBeNull();
            summary7Days.RevenueTrend.Count.ShouldBe(7);
        });
    }
}
