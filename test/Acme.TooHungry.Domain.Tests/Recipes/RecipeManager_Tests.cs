using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Recipes;

public abstract class RecipeManager_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly RecipeManager _recipeManager;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    protected RecipeManager_Tests()
    {
        _recipeManager = GetRequiredService<RecipeManager>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
    }

    [Fact]
    public async Task Should_Create_Recipe_With_Ingredients_And_ConversionFactor()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Baked Lobster {Guid.NewGuid():N}",
                Price = 500000m,
                IsActive = true
            }, autoSave: true);

            var lobster = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Tôm hùm", "con", 5, StorageType.FRESH), autoSave: true);
            var salt = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Muối tinh", "kg", 10, StorageType.LONG_TERM), autoSave: true);

            var ingredients = new List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor)>
            {
                (lobster.Id, 1m, "con", 1.0m),
                (salt.Id, 2m, "g", 0.001m) // 2g = 0.002 kg
            };

            var recipe = await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Tôm Hùm Nướng",
                "Định lượng chuẩn 1 phần",
                ingredients
            );

            recipe.ShouldNotBeNull();
            recipe.DishId.ShouldBe(dish.Id);
            recipe.Version.ShouldBe(1);
            recipe.IsActive.ShouldBeTrue();
            recipe.Ingredients.Count.ShouldBe(2);

            var saltIngredient = recipe.Ingredients.First(x => x.IngredientId == salt.Id);
            saltIngredient.Quantity.ShouldBe(2m);
            saltIngredient.ConversionFactor.ShouldBe(0.001m);
            saltIngredient.CalculateBaseQuantity().ShouldBe(0.002m);
        });
    }

    [Fact]
    public async Task Should_Throw_When_Dish_Already_Has_Active_Recipe()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Steak {Guid.NewGuid():N}",
                Price = 300000m,
                IsActive = true
            }, autoSave: true);

            var beef = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Thịt bò", "kg", 5, StorageType.FRESH), autoSave: true);

            await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Bò Bít Tết v1",
                null,
                new List<(Guid, decimal, string, decimal)> { (beef.Id, 0.2m, "kg", 1.0m) }
            );

            // Cố gắng tạo Recipe thứ 2 đang active cho cùng một món ăn -> Phải báo lỗi
            var exception = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _recipeManager.CreateAsync(
                    dish.Id,
                    "Công thức Bò Bít Tết v2 trùng",
                    null,
                    new List<(Guid, decimal, string, decimal)> { (beef.Id, 0.25m, "kg", 1.0m) }
                );
            });

            exception.Code.ShouldBe("Recipe:DishAlreadyHasActiveRecipe");
        });
    }

    [Fact]
    public async Task Should_Bump_Version_When_Updating_Recipe()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Salad {Guid.NewGuid():N}",
                Price = 100000m,
                IsActive = true
            }, autoSave: true);

            var vegetable = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Rau xà lách", "kg", 2, StorageType.FRESH), autoSave: true);

            var recipe = await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Salad v1",
                null,
                new List<(Guid, decimal, string, decimal)> { (vegetable.Id, 0.1m, "kg", 1.0m) }
            );

            recipe.Version.ShouldBe(1);

            // Cập nhật công thức với định lượng mới -> Version phải tự động tăng lên 2
            var updated = await _recipeManager.UpdateAsync(
                recipe.Id,
                "Công thức Salad v2 cải tiến",
                "Tăng lượng rau",
                new List<(Guid, decimal, string, decimal)> { (vegetable.Id, 0.15m, "kg", 1.0m) }
            );

            updated.Version.ShouldBe(2);
            updated.Ingredients.First().Quantity.ShouldBe(0.15m);
        });
    }

    [Fact]
    public async Task Should_Throw_When_Deactivating_Without_Reason()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Chè {Guid.NewGuid():N}",
                Price = 30000m,
                IsActive = true
            }, autoSave: true);

            var bean = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Đậu đỏ", "kg", 5, StorageType.LONG_TERM), autoSave: true);

            var recipe = await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Chè",
                null,
                new List<(Guid, decimal, string, decimal)> { (bean.Id, 0.05m, "kg", 1.0m) }
            );

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _recipeManager.DeactivateAsync(recipe.Id, "");
            });

            ex.Code.ShouldBe("Recipe:DeactivationReasonRequired");
        });
    }

    [Fact]
    public async Task Should_Throw_When_Reactivating_And_Another_Active_Recipe_Exists()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Bún chả {Guid.NewGuid():N}",
                Price = 50000m,
                IsActive = true
            }, autoSave: true);

            var meat = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Thịt lợn", "kg", 10, StorageType.FRESH), autoSave: true);

            var recipe1 = await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Bún chả v1",
                null,
                new List<(Guid, decimal, string, decimal)> { (meat.Id, 0.2m, "kg", 1.0m) }
            );

            await _recipeManager.DeactivateAsync(recipe1.Id, "Tạm ngưng để thử nghiệm v2");

            var recipe2 = await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Bún chả v2",
                null,
                new List<(Guid, decimal, string, decimal)> { (meat.Id, 0.25m, "kg", 1.0m) }
            );

            // Cố gắng reactivate v1 khi v2 đang active -> Phải throw Recipe:DishAlreadyHasActiveRecipe
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _recipeManager.ReactivateAsync(recipe1.Id);
            });

            ex.Code.ShouldBe("Recipe:DishAlreadyHasActiveRecipe");
        });
    }

    [Fact]
    public async Task Should_Merge_Duplicate_Ingredients_In_Recipe()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Nước Cam {Guid.NewGuid():N}",
                Price = 40000m,
                IsActive = true
            }, autoSave: true);

            var orange = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Cam sành", "kg", 10, StorageType.FRESH), autoSave: true);

            var ingredients = new List<(Guid, decimal, string, decimal)>
            {
                (orange.Id, 0.2m, "kg", 1.0m),
                (orange.Id, 0.1m, "kg", 1.0m) // trùng orange -> tự động gộp thành 0.3m
            };

            var recipe = await _recipeManager.CreateAsync(
                dish.Id,
                "Công thức Nước Cam",
                null,
                ingredients
            );

            recipe.Ingredients.Count.ShouldBe(1);
            recipe.Ingredients.First().Quantity.ShouldBe(0.3m);
        });
    }
}
