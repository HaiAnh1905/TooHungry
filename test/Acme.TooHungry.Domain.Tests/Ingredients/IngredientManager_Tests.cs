using System;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Ingredients;

public abstract class IngredientManager_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IngredientManager _ingredientManager;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<RecipeIngredient, Guid> _recipeIngredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;

    protected IngredientManager_Tests()
    {
        _ingredientManager = GetRequiredService<IngredientManager>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _recipeIngredientRepository = GetRequiredService<IRepository<RecipeIngredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _recipeRepository = GetRequiredService<IRepository<Recipe, Guid>>();
    }

    [Fact]
    public async Task Should_Create_Ingredient_Successfully()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientManager.CreateAsync(
                $"Hành Tây {idStr}",
                "kg",
                2m,
                15000m,
                StorageType.SHORT_TERM,
                ConsumptionMethod.RECIPE
            );

            ing.ShouldNotBeNull();
            ing.Name.ShouldBe($"Hành Tây {idStr}");
            ing.BaseUnit.ShouldBe("kg");
            ing.MinStock.ShouldBe(2m);
            ing.EstimatedPrice.ShouldBe(15000m);
            ing.IsActive.ShouldBeTrue();
        });
    }

    [Fact]
    public async Task Should_Throw_When_Duplicate_Active_Name()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientManager.CreateAsync(
                $"Tỏi Lý Sơn {idStr}",
                "kg",
                1m,
                50000m,
                StorageType.LONG_TERM,
                ConsumptionMethod.RECIPE
            );
            await _ingredientRepository.InsertAsync(ing, autoSave: true);
        });

        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await WithUnitOfWorkAsync(async () =>
            {
                await _ingredientManager.CreateAsync(
                    $"tỏi lý sơn {idStr} ",
                    "kg",
                    1m,
                    50000m,
                    StorageType.LONG_TERM,
                    ConsumptionMethod.RECIPE
                );
            });
        });

        ex.Code.ShouldBe("Ingredient:NameAlreadyExists");
    }

    [Fact]
    public async Task Should_Throw_AlreadyExistsInactive_When_Inactive_Duplicate()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        Guid oldId = Guid.Empty;
        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientManager.CreateAsync(
                $"Gừng Tươi {idStr}",
                "kg",
                0.5m,
                30000m,
                StorageType.SHORT_TERM,
                ConsumptionMethod.RECIPE
            );
            ing.Deactivate("Hết mùa");
            var inserted = await _ingredientRepository.InsertAsync(ing, autoSave: true);
            oldId = inserted.Id;
        });

        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await WithUnitOfWorkAsync(async () =>
            {
                await _ingredientManager.CreateAsync(
                    $"  gừng tươi {idStr} ",
                    "kg",
                    0.5m,
                    30000m,
                    StorageType.SHORT_TERM,
                    ConsumptionMethod.RECIPE
                );
            });
        });

        ex.Code.ShouldBe("Ingredient:AlreadyExistsInactive");
        ex.Data["IngredientId"].ShouldBe(oldId);
    }

    [Fact]
    public async Task Should_Lock_Unit_Change_And_Delete_When_Used_In_Recipe()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        Guid ingId = Guid.Empty;
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Món Thử Nghiệm {idStr}",
                Price = 50000m,
                IsActive = true
            }, autoSave: true);

            var recipe = await _recipeRepository.InsertAsync(new Recipe(
                Guid.NewGuid(),
                dish.Id,
                $"Công Thức {idStr}"
            ), autoSave: true);

            var ing = await _ingredientManager.CreateAsync(
                $"Tiêu Đen {idStr}",
                "g",
                0.1m,
                10000m,
                StorageType.LONG_TERM,
                ConsumptionMethod.RECIPE
            );
            var inserted = await _ingredientRepository.InsertAsync(ing, autoSave: true);
            ingId = inserted.Id;

            await _recipeIngredientRepository.InsertAsync(new RecipeIngredient
            {
                RecipeId = recipe.Id,
                IngredientId = ingId,
                Quantity = 5m,
                Unit = "g"
            }, autoSave: true);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var canChange = await _ingredientManager.CanChangeUnitAsync(ingId);
            canChange.ShouldBeFalse();

            var exUnit = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _ingredientManager.CheckCanChangeUnitAsync(ingId);
            });
            exUnit.Code.ShouldBe("Ingredient:CannotChangeUnitWithExistingData");

            var exDel = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _ingredientManager.CheckCanDeleteAsync(ingId);
            });
            exDel.Code.ShouldBe("Ingredient:CannotDeleteUsedInRecipe");
        });
    }

    [Fact]
    public async Task Should_Lock_Unit_Change_And_Delete_When_Has_Batches()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        Guid ingId = Guid.Empty;
        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientManager.CreateAsync(
                $"Đường Kính {idStr}",
                "kg",
                5m,
                22000m,
                StorageType.LONG_TERM,
                ConsumptionMethod.RECIPE
            );
            var inserted = await _ingredientRepository.InsertAsync(ing, autoSave: true);
            ingId = inserted.Id;

            await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingId,
                $"BATCH-{idStr}",
                10m,
                10m,
                "kg",
                1m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddMonths(6)
            ), autoSave: true);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var canChange = await _ingredientManager.CanChangeUnitAsync(ingId);
            canChange.ShouldBeFalse();

            var exDel = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _ingredientManager.CheckCanDeleteAsync(ingId);
            });
            exDel.Code.ShouldBe("Ingredient:CannotDeleteHasBatches");
        });
    }
}
