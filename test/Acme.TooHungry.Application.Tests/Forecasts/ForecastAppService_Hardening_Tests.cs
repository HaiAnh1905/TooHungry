using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Forecasts;

public abstract class ForecastAppService_Hardening_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IIngredientPlanAppService _ingredientPlanAppService;
    private readonly IDemandForecastAppService _demandForecastAppService;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _inventoryBatchRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<DemandForecast, Guid> _demandForecastRepository;
    private readonly IRepository<IngredientPlan, Guid> _ingredientPlanRepository;

    protected ForecastAppService_Hardening_Tests()
    {
        _ingredientPlanAppService = GetRequiredService<IIngredientPlanAppService>();
        _demandForecastAppService = GetRequiredService<IDemandForecastAppService>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _inventoryBatchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _recipeRepository = GetRequiredService<IRepository<Recipe, Guid>>();
        _demandForecastRepository = GetRequiredService<IRepository<DemandForecast, Guid>>();
        _ingredientPlanRepository = GetRequiredService<IRepository<IngredientPlan, Guid>>();
    }

    [Fact]
    public async Task Should_Calculate_CurrentStock_Without_Multiplying_ConversionFactor_Again()
    {
        Guid forecastId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), $"Gạo Test {Guid.NewGuid():N}", "kg", 5m, StorageType.LONG_TERM, estimatedPrice: 20000m), autoSave: true);

            // RemainingQuantity = 10 kg, ConversionFactor = 50. Không được tính thành 10 * 50 = 500!
            await _inventoryBatchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingredient.Id,
                batchCode: $"BAT-{Guid.NewGuid():N}"[..12],
                quantity: 10m,
                remainingQuantity: 10m,
                purchaseUnit: "Bao 50kg",
                conversionFactor: 50m,
                receivedAt: DateTime.Now,
                expiryDate: DateTime.Now.AddDays(30),
                unitCost: 1000000m
            ), autoSave: true);

            var forecast = await _demandForecastRepository.InsertAsync(new DemandForecast(Guid.NewGuid())
            {
                ForecastDate = DateTime.Now.Date,
                StartDate = DateTime.Now.Date,
                EndDate = DateTime.Now.Date.AddDays(7),
                Note = "Hardening test"
            }, autoSave: true);
            forecastId = forecast.Id;

            var plan = new IngredientPlan(Guid.NewGuid())
            {
                DemandForecastId = forecast.Id,
                Status = PlanStatus.Draft
            };
            plan.Items.Add(new IngredientPlanItem(Guid.NewGuid())
            {
                IngredientId = ingredient.Id,
                RequiredQuantity = 25m
            });
            await _ingredientPlanRepository.InsertAsync(plan, autoSave: true);
        });

        var planDto = await _ingredientPlanAppService.GetByForecastIdAsync(forecastId);
        planDto.ShouldNotBeNull();
        planDto.Items.Count.ShouldBe(1);

        // Stock phải bằng đúng RemainingQuantity (10), không phải 10 * 50 = 500
        planDto.Items[0].CurrentStock.ShouldBe(10m);
        // Cần mua thêm: 25 - 10 = 15
        planDto.Items[0].SuggestedPurchaseQuantity.ShouldBe(15m);
    }

    [Fact]
    public async Task Should_Prevent_Reverting_Executed_IngredientPlan()
    {
        Guid planId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var forecast = await _demandForecastRepository.InsertAsync(new DemandForecast(Guid.NewGuid())
            {
                ForecastDate = DateTime.Now.Date,
                StartDate = DateTime.Now.Date,
                EndDate = DateTime.Now.Date.AddDays(7)
            }, autoSave: true);

            var plan = await _ingredientPlanRepository.InsertAsync(new IngredientPlan(Guid.NewGuid())
            {
                DemandForecastId = forecast.Id,
                Status = PlanStatus.Executed
            }, autoSave: true);
            planId = plan.Id;
        });

        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _ingredientPlanAppService.UpdateStatusAsync(planId, new UpdatePlanStatusDto
            {
                Status = PlanStatus.Draft
            });
        });

        ex.Code.ShouldBe("TooHungry:Forecast:CannotRevertExecutedPlan");
    }

    [Fact]
    public async Task Should_Handle_Duplicate_Dish_In_DemandForecast_Without_Crashing()
    {
        Guid dishId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Món Trùng Forecast {Guid.NewGuid():N}",
                Price = 60000m,
                IsActive = true
            }, autoSave: true);
            dishId = dish.Id;

            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), $"Gia Vị {Guid.NewGuid():N}", "g", 10m, StorageType.SHORT_TERM, estimatedPrice: 100m), autoSave: true);

            var recipe = new Recipe(Guid.NewGuid(), dish.Id, "Công thức Test Trùng", version: 1, isActive: true);
            recipe.AddIngredient(Guid.NewGuid(), ingredient.Id, quantity: 50m, unit: "g", conversionFactor: 1m);
            await _recipeRepository.InsertAsync(recipe, autoSave: true);
        });

        // Tạo DemandForecast chứa 2 item trùng cùng DishId
        var forecastDto = await _demandForecastAppService.CreateAsync(new CreateUpdateDemandForecastDto
        {
            ForecastDate = DateTime.Now.Date,
            StartDate = DateTime.Now.Date.AddDays(1),
            EndDate = DateTime.Now.Date.AddDays(3),
            Note = "Dự báo trùng dish",
            Items = new List<CreateUpdateDemandForecastItemDto>
            {
                new() { DishId = dishId, ForecastQuantity = 10 },
                new() { DishId = dishId, ForecastQuantity = 15 }
            }
        });

        forecastDto.ShouldNotBeNull();
        forecastDto.IngredientPlanId.ShouldNotBeNull();

        var planDto = await _ingredientPlanAppService.GetByForecastIdAsync(forecastDto.Id);
        planDto.ShouldNotBeNull();
        // Tổng lượng nguyên liệu: (10 + 15) * 50g = 1250g
        var planItem = planDto.Items.FirstOrDefault();
        planItem.ShouldNotBeNull();
        planItem.RequiredQuantity.ShouldBe(1250m);
    }
}
