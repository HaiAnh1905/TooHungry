using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Acme.TooHungry.Tables;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry;

public record TableTestFixture(
    DiningArea DiningArea,
    RestaurantTable TableSource,
    RestaurantTable TableTarget,
    RestaurantTable TableExtra
);

public record InventoryTestFixture(
    Ingredient Ingredient,
    InventoryBatch BatchEarlyExpiry,
    InventoryBatch BatchLateExpiry,
    InventoryBatch BatchExpired
);

public record DishRecipeTestFixture(
    Dish Dish,
    Recipe Recipe,
    Ingredient Ingredient
);

public static class TestingDataFixtureFactory
{
    public static async Task<TableTestFixture> CreateTableFixtureAsync(
        IRepository<DiningArea, Guid> diningAreaRepo,
        IRepository<RestaurantTable, Guid> tableRepo)
    {
        var area = await diningAreaRepo.InsertAsync(new DiningArea
        {
            Name = $"Khu Vực {Guid.NewGuid():N}"[..12],
            Description = "Khu vực kiểm thử",
            IsActive = true
        }, autoSave: true);

        var now = DateTime.UtcNow;
        var tableSource = new RestaurantTable(Guid.NewGuid(), $"Bàn S-{Guid.NewGuid():N}"[..10], 4, area.Id, "Tầng 1", TableStatus.Available);
        tableSource.Occupy(now.AddHours(-1));
        await tableRepo.InsertAsync(tableSource, autoSave: true);

        var tableTarget = new RestaurantTable(Guid.NewGuid(), $"Bàn T-{Guid.NewGuid():N}"[..10], 4, area.Id, "Tầng 1", TableStatus.Available);
        await tableRepo.InsertAsync(tableTarget, autoSave: true);

        var tableExtra = new RestaurantTable(Guid.NewGuid(), $"Bàn E-{Guid.NewGuid():N}"[..10], 4, area.Id, "Tầng 1", TableStatus.Available);
        await tableRepo.InsertAsync(tableExtra, autoSave: true);

        return new TableTestFixture(area, tableSource, tableTarget, tableExtra);
    }

    public static async Task<InventoryTestFixture> CreateInventoryFixtureAsync(
        IRepository<Ingredient, Guid> ingredientRepo,
        IRepository<InventoryBatch, Guid> batchRepo,
        string? name = null,
        StorageType storageType = StorageType.FRESH)
    {
        var now = DateTime.UtcNow;
        var ingredient = new Ingredient(
            Guid.NewGuid(),
            name ?? $"Thịt bò {Guid.NewGuid():N}"[..15],
            "kg",
            5.0m,
            storageType,
            ConsumptionMethod.RECIPE,
            estimatedPrice: 250000m
        );
        ingredient.IsActive = true;
        await ingredientRepo.InsertAsync(ingredient, autoSave: true);

        var batchEarly = new InventoryBatch(
            Guid.NewGuid(),
            ingredient.Id,
            $"BATCH-EARLY-{Guid.NewGuid():N}"[..18],
            3.0m,
            3.0m,
            "kg",
            1.0m,
            now.AddDays(-2),
            now.AddDays(3),
            supplierId: null,
            unitCost: 250000m
        );
        await batchRepo.InsertAsync(batchEarly, autoSave: true);

        var batchLate = new InventoryBatch(
            Guid.NewGuid(),
            ingredient.Id,
            $"BATCH-LATE-{Guid.NewGuid():N}"[..18],
            10.0m,
            10.0m,
            "kg",
            1.0m,
            now.AddDays(-1),
            now.AddDays(30),
            supplierId: null,
            unitCost: 250000m
        );
        await batchRepo.InsertAsync(batchLate, autoSave: true);

        var batchExpired = new InventoryBatch(
            Guid.NewGuid(),
            ingredient.Id,
            $"BATCH-EXP-{Guid.NewGuid():N}"[..18],
            5.0m,
            5.0m,
            "kg",
            1.0m,
            now.AddDays(-10),
            now.AddDays(-1),
            supplierId: null,
            unitCost: 250000m
        );
        await batchRepo.InsertAsync(batchExpired, autoSave: true);

        return new InventoryTestFixture(ingredient, batchEarly, batchLate, batchExpired);
    }

    public static async Task<DishRecipeTestFixture> CreateDishRecipeFixtureAsync(
        IRepository<Dish, Guid> dishRepo,
        IRepository<Ingredient, Guid> ingredientRepo,
        RecipeManager recipeManager,
        decimal dishPrice = 120000m,
        decimal ingredientQtyPerServing = 0.5m)
    {
        var dish = await dishRepo.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Món bò sốt {Guid.NewGuid():N}"[..15],
            Price = dishPrice,
            IsActive = true
        }, autoSave: true);

        var ingredient = await ingredientRepo.InsertAsync(new Ingredient(
            Guid.NewGuid(),
            $"Nguyên liệu {Guid.NewGuid():N}"[..15],
            "kg",
            5.0m,
            StorageType.LONG_TERM,
            ConsumptionMethod.RECIPE,
            estimatedPrice: 200000m
        ), autoSave: true);

        var recipe = await recipeManager.CreateAsync(
            dish.Id,
            $"Công thức {dish.Name}",
            "Mô tả công thức kiểm thử",
            new List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor, Guid? recipeUnitId)>
            {
                (ingredient.Id, ingredientQtyPerServing, "kg", 1.0m, null)
            }
        );

        return new DishRecipeTestFixture(dish, recipe, ingredient);
    }
}
