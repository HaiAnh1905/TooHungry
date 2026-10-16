using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Forecasts;

public abstract class ForecastAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IDemandForecastAppService _demandForecastAppService;
    private readonly IIngredientPlanAppService _ingredientPlanAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _inventoryBatchRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected ForecastAppService_Tests()
    {
        _demandForecastAppService = GetRequiredService<IDemandForecastAppService>();
        _ingredientPlanAppService = GetRequiredService<IIngredientPlanAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _recipeRepository = GetRequiredService<IRepository<Recipe, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _inventoryBatchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task Should_Generate_Forecast_Using_SMA_Algorithm()
    {
        // 1. Arrange: Create Dish & completed order with 14 items in past 7 days
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Bò Bít Tết {Guid.NewGuid():N}",
            Price = 150000m,
            IsActive = true
        }, autoSave: true);

        var order = new Order
        {
            OrderNumber = $"ORD-{Guid.NewGuid():N}"[..12],
            OrderDate = DateTime.Now.AddDays(-2),
            Status = OrderStatus.Completed,
            TotalAmount = 300000m
        };
        order.Items.Add(new OrderItem
        {
            DishId = dish.Id,
            Quantity = 14,
            UnitPrice = 150000m,
            TotalPrice = 2100000m
        });
        await _orderRepository.InsertAsync(order, autoSave: true);

        // 2. Act: Generate forecast for next 7 days using 7-day history window
        var result = await _demandForecastAppService.GenerateForecastAsync(new GenerateForecastInputDto
        {
            StartDate = DateTime.Now.Date.AddDays(1),
            EndDate = DateTime.Now.Date.AddDays(8),
            HistoryDays = 7
        });

        // 3. Assert
        result.ShouldNotBeNull();
        result.AnalysisDays.ShouldBe(7);
        var item = result.SuggestedItems.FirstOrDefault(x => x.DishId == dish.Id);
        item.ShouldNotBeNull();
        // 14 / 7 = 2/day * 7 days = 14
        item.ForecastQuantity.ShouldBe(14);
        result.FinancialSummary.ProjectedRevenue.ShouldBeGreaterThanOrEqualTo(14 * 150000m);
    }

    [Fact]
    public async Task Should_Create_Forecast_And_Explode_Recipe_Into_IngredientPlan()
    {
        // 1. Arrange: Create Ingredient, Dish, and Recipe
        var beef = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Thịt bò Kobe", "kg", 5m, StorageType.FRESH, estimatedPrice: 500000m), autoSave: true);

        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Bò Lúc Lắc {Guid.NewGuid():N}",
            Price = 200000m,
            IsActive = true
        }, autoSave: true);

        var recipe = new Recipe(Guid.NewGuid(), dish.Id, "Công thức Bò Lúc Lắc", version: 1, isActive: true);
        recipe.AddIngredient(Guid.NewGuid(), beef.Id, quantity: 0.25m, unit: "kg", conversionFactor: 1.0m);
        await _recipeRepository.InsertAsync(recipe, autoSave: true);

        // 2. Act: Create DemandForecast with 10 dishes
        var forecastDto = await _demandForecastAppService.CreateAsync(new CreateUpdateDemandForecastDto
        {
            ForecastDate = DateTime.Now,
            StartDate = DateTime.Now.Date.AddDays(1),
            EndDate = DateTime.Now.Date.AddDays(3),
            Note = "Dự báo cuối tuần",
            Items = new List<CreateUpdateDemandForecastItemDto>
            {
                new()
                {
                    DishId = dish.Id,
                    ForecastQuantity = 10,
                    Note = "Ưu tiên phục vụ bàn VIP"
                }
            }
        });

        // 3. Assert: Forecast is created and linked IngredientPlan is generated
        forecastDto.ShouldNotBeNull();
        forecastDto.Items.Count.ShouldBe(1);
        forecastDto.IngredientPlanId.ShouldNotBeNull();
        forecastDto.IngredientPlanStatus.ShouldBe(PlanStatus.Draft);

        // Verify IngredientPlan items: 10 * 0.25kg = 2.5kg
        var planDto = await _ingredientPlanAppService.GetByForecastIdAsync(forecastDto.Id);
        planDto.ShouldNotBeNull();
        planDto.Status.ShouldBe(PlanStatus.Draft);
        var planItem = planDto.Items.FirstOrDefault(x => x.IngredientId == beef.Id);
        planItem.ShouldNotBeNull();
        planItem.RequiredQuantity.ShouldBe(2.5m);
        planItem.BaseUnit.ShouldBe("kg");
    }

    [Fact]
    public async Task Should_Get_IngredientPlan_With_CurrentStock_And_SuggestedPurchase()
    {
        // 1. Arrange: Ingredient, Batch (1.0kg in stock), Dish, Recipe
        var pepper = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Tiêu Đen", "kg", 2m, StorageType.LONG_TERM, estimatedPrice: 100000m), autoSave: true);

        await _inventoryBatchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(),
            pepper.Id,
            batchCode: "BATCH-PEP-01",
            quantity: 2.0m,
            remainingQuantity: 1.0m, // 1kg available
            purchaseUnit: "kg",
            conversionFactor: 1.0m,
            receivedAt: DateTime.Now.AddDays(-5),
            expiryDate: DateTime.Now.AddDays(30),
            unitCost: 100000m
        ), autoSave: true);

        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Bò Sốt Tiêu {Guid.NewGuid():N}",
            Price = 180000m,
            IsActive = true
        }, autoSave: true);

        var recipe = new Recipe(Guid.NewGuid(), dish.Id, "Công thức Sốt Tiêu", version: 1, isActive: true);
        recipe.AddIngredient(Guid.NewGuid(), pepper.Id, quantity: 0.1m, unit: "kg", conversionFactor: 1.0m);
        await _recipeRepository.InsertAsync(recipe, autoSave: true);

        // 2. Act: Forecast requires 30 portions -> 3.0kg pepper
        var forecastDto = await _demandForecastAppService.CreateAsync(new CreateUpdateDemandForecastDto
        {
            StartDate = DateTime.Now.Date.AddDays(1),
            EndDate = DateTime.Now.Date.AddDays(7),
            Items = new List<CreateUpdateDemandForecastItemDto>
            {
                new() { DishId = dish.Id, ForecastQuantity = 30 }
            }
        });

        var plan = await _ingredientPlanAppService.GetByForecastIdAsync(forecastDto.Id);
        plan.ShouldNotBeNull();
        var item = plan.Items.FirstOrDefault(x => x.IngredientId == pepper.Id);
        item.ShouldNotBeNull();
        item.RequiredQuantity.ShouldBe(3.0m);
        item.CurrentStock.ShouldBe(1.0m);
        // Need to purchase: 3.0 - 1.0 = 2.0kg
        item.SuggestedPurchaseQuantity.ShouldBe(2.0m);
        item.EstimatedCost.ShouldBe(2.0m * 100000m); // 200,000 VND
    }

    [Fact]
    public async Task Should_Update_Plan_Status_And_Check_FinancialSummary()
    {
        // 1. Arrange: Create simple forecast
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Salad Nga {Guid.NewGuid():N}",
            Price = 80000m,
            IsActive = true
        }, autoSave: true);

        var forecast = await _demandForecastAppService.CreateAsync(new CreateUpdateDemandForecastDto
        {
            StartDate = DateTime.Now.Date,
            EndDate = DateTime.Now.Date.AddDays(3),
            Items = new List<CreateUpdateDemandForecastItemDto>
            {
                new() { DishId = dish.Id, ForecastQuantity = 5 }
            }
        });

        // 2. Act: Approve plan
        var plan = await _ingredientPlanAppService.GetByForecastIdAsync(forecast.Id);
        plan.ShouldNotBeNull();

        var updatedPlan = await _ingredientPlanAppService.UpdateStatusAsync(plan.Id, new UpdatePlanStatusDto
        {
            Status = PlanStatus.Confirmed
        });

        // 3. Assert
        updatedPlan.Status.ShouldBe(PlanStatus.Confirmed);

        var summary = await _demandForecastAppService.GetFinancialSummaryAsync(forecast.Id);
        summary.ShouldNotBeNull();
        summary.ProjectedRevenue.ShouldBe(5 * 80000m);
    }

    [Fact]
    public async Task Should_Create_Forecast_With_Multiple_Items()
    {
        // 1. Arrange: Create 2 dishes
        var dish1 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Món 1 {Guid.NewGuid():N}",
            Price = 50000m,
            IsActive = true
        }, autoSave: true);

        var dish2 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Món 2 {Guid.NewGuid():N}",
            Price = 100000m,
            IsActive = true
        }, autoSave: true);

        // 2. Act: Create forecast with multiple items
        var forecast = await _demandForecastAppService.CreateAsync(new CreateUpdateDemandForecastDto
        {
            StartDate = DateTime.Now.Date,
            EndDate = DateTime.Now.Date.AddDays(3),
            Items = new List<CreateUpdateDemandForecastItemDto>
            {
                new() { DishId = dish1.Id, ForecastQuantity = 10 },
                new() { DishId = dish2.Id, ForecastQuantity = 20 }
            }
        });

        // 3. Assert: Both items must be saved with unique Ids
        forecast.ShouldNotBeNull();
        forecast.Items.Count.ShouldBe(2);
        forecast.Items.Select(x => x.Id).Distinct().Count().ShouldBe(2);
        forecast.Items.ShouldAllBe(x => x.Id != Guid.Empty);
    }
}

