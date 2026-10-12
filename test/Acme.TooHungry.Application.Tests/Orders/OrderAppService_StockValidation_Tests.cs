using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_StockValidation_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly RecipeManager _recipeManager;

    protected OrderAppService_StockValidation_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _recipeManager = GetRequiredService<RecipeManager>();
    }

    [Fact]
    public async Task Should_Validate_Stock_Successfully_When_Ingredients_Sufficient()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Cá Hồi Nướng {Guid.NewGuid():N}",
                Price = 180000m,
                IsActive = true
            }, autoSave: true);

            var salmon = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Cá hồi phi lê", "kg", 2, StorageType.SHORT_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), salmon.Id, "BATCH-SALMON-1", 5m, 5m, "kg", 1m, now, now.AddDays(7)), autoSave: true);

            await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Cá Hồi",
                null,
                new List<(Guid, decimal, string, decimal)> { (salmon.Id, 0.25m, "kg", 1.0m) }
            );

            // Kiểm tra giỏ hàng đặt 4 phần (cần 1 kg <= 5 kg có sẵn)
            var validation = await _orderAppService.ValidateStockAsync(new ValidateOrderStockInputDto
            {
                Items = new List<SubmitOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 4, UnitPrice = 180000m }
                }
            });

            validation.IsValid.ShouldBeTrue();
            validation.Shortages.ShouldBeEmpty();
        });
    }

    [Fact]
    public async Task Should_Detect_Shortage_When_Ingredient_Stock_Insufficient()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Sườn Cừu {Guid.NewGuid():N}",
                Price = 300000m,
                IsActive = true
            }, autoSave: true);

            var lamb = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Sườn cừu Úc", "kg", 2, StorageType.SHORT_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), lamb.Id, "BATCH-LAMB-1", 1m, 1m, "kg", 1m, now, now.AddDays(7)), autoSave: true);

            await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Sườn Cừu",
                null,
                new List<(Guid, decimal, string, decimal)> { (lamb.Id, 0.5m, "kg", 1.0m) }
            );

            // Đặt 4 phần -> cần 2 kg, kho chỉ còn 1 kg -> thiếu hụt
            var validation = await _orderAppService.ValidateStockAsync(new ValidateOrderStockInputDto
            {
                Items = new List<SubmitOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 4, UnitPrice = 300000m }
                }
            });

            validation.IsValid.ShouldBeFalse();
            validation.Shortages.Count.ShouldBe(1);
            validation.Shortages[0].DishId.ShouldBe(dish.Id);
            validation.Shortages[0].RequiredQuantity.ShouldBe(2.0m);
            validation.Shortages[0].AvailableQuantity.ShouldBe(1.0m);
        });
    }
}
