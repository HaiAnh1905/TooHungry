using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Recipes;

public abstract class RecipeAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IRecipeAppService _recipeAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    protected RecipeAppService_Tests()
    {
        _recipeAppService = GetRequiredService<IRecipeAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
    }

    [Fact]
    public async Task Should_Create_And_Get_Recipe()
    {
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Món Lẩu {Guid.NewGuid():N}",
            Price = 250000m,
            IsActive = true
        }, autoSave: true);

        var beef = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Ba chỉ bò", "kg", 10, StorageType.FRESH), autoSave: true);

        var dto = await _recipeAppService.CreateAsync(new CreateRecipeDto
        {
            DishId = dish.Id,
            Name = "Công thức Lẩu Bò",
            Description = "1 nồi lẩu",
            Ingredients = new List<CreateRecipeIngredientDto>
            {
                new()
                {
                    IngredientId = beef.Id,
                    Quantity = 0.3m,
                    Unit = "kg",
                    ConversionFactor = 1.0m
                }
            }
        });

        dto.ShouldNotBeNull();
        dto.DishId.ShouldBe(dish.Id);
        dto.Version.ShouldBe(1);
        dto.IsActive.ShouldBeTrue();
        dto.Ingredients.Count.ShouldBe(1);

        var loaded = await _recipeAppService.GetAsync(dto.Id);
        loaded.ShouldNotBeNull();
        loaded.Name.ShouldBe("Công thức Lẩu Bò");
    }

    [Fact]
    public async Task Should_Deactivate_And_Reactivate_Recipe()
    {
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Cơm Chiên {Guid.NewGuid():N}",
            Price = 60000m,
            IsActive = true
        }, autoSave: true);

        var rice = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Gạo ST25", "kg", 20, StorageType.LONG_TERM), autoSave: true);

        var recipe = await _recipeAppService.CreateAsync(new CreateRecipeDto
        {
            DishId = dish.Id,
            Name = "Công thức Cơm Chiên Trứng",
            Ingredients = new List<CreateRecipeIngredientDto>
            {
                new() { IngredientId = rice.Id, Quantity = 0.15m, Unit = "kg", ConversionFactor = 1m }
            }
        });

        // Deactivate
        var deactivated = await _recipeAppService.DeactivateAsync(recipe.Id, "Tạm dừng đổi công thức mới");
        deactivated.IsActive.ShouldBeFalse();
        deactivated.DeactivationReason.ShouldBe("Tạm dừng đổi công thức mới");

        // Reactivate
        var reactivated = await _recipeAppService.ReactivateAsync(recipe.Id);
        reactivated.IsActive.ShouldBeTrue();
        reactivated.DeactivationReason.ShouldBeNull();
    }

    [Fact]
    public async Task Should_Get_List_With_Paging_And_Filter()
    {
        var dish1 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Bún Bò Huế {Guid.NewGuid():N}",
            Price = 65000m,
            IsActive = true
        }, autoSave: true);

        var beef = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Nạm bò", "kg", 10, StorageType.FRESH), autoSave: true);

        var recipe1 = await _recipeAppService.CreateAsync(new CreateRecipeDto
        {
            DishId = dish1.Id,
            Name = "Công thức Bún Bò Huế Chuẩn",
            Ingredients = new List<CreateRecipeIngredientDto>
            {
                new() { IngredientId = beef.Id, Quantity = 0.15m, Unit = "kg", ConversionFactor = 1m }
            }
        });

        var result = await _recipeAppService.GetListAsync(new RecipeFilterDto
        {
            DishId = dish1.Id,
            MaxResultCount = 10
        });

        result.ShouldNotBeNull();
        result.TotalCount.ShouldBeGreaterThanOrEqualTo(1);
        result.Items.ShouldContain(x => x.Id == recipe1.Id);
    }

    [Fact]
    public async Task Should_Get_Version_History_By_DishId()
    {
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Mì Quảng {Guid.NewGuid():N}",
            Price = 55000m,
            IsActive = true
        }, autoSave: true);

        var pork = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Thịt ba chỉ", "kg", 10, StorageType.FRESH), autoSave: true);

        var v1 = await _recipeAppService.CreateAsync(new CreateRecipeDto
        {
            DishId = dish.Id,
            Name = "Công thức Mì Quảng v1",
            Ingredients = new List<CreateRecipeIngredientDto>
            {
                new() { IngredientId = pork.Id, Quantity = 0.1m, Unit = "kg", ConversionFactor = 1m }
            }
        });

        var v2 = await _recipeAppService.UpdateAsync(v1.Id, new UpdateRecipeDto
        {
            Name = "Công thức Mì Quảng v2",
            Ingredients = new List<CreateRecipeIngredientDto>
            {
                new() { IngredientId = pork.Id, Quantity = 0.15m, Unit = "kg", ConversionFactor = 1m }
            }
        });

        v2.Version.ShouldBe(2);

        var history = await _recipeAppService.GetHistoryByDishIdAsync(dish.Id);
        history.ShouldNotBeNull();
        history.Count.ShouldBeGreaterThanOrEqualTo(1);
        history[0].Version.ShouldBe(2);
    }

    [Fact]
    public async Task Should_Calculate_Food_Cost_And_Deactivated_Ingredients_Flag()
    {
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Cá Hồi Nướng {Guid.NewGuid():N}",
            Price = 200000m,
            IsActive = true
        }, autoSave: true);

        var salmon = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Phi lê cá hồi", "kg", 5, StorageType.FRESH)
        {
            EstimatedPrice = 400000m // 400k/kg
        }, autoSave: true);

        var butter = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Bơ lạt", "kg", 2, StorageType.SHORT_TERM)
        {
            EstimatedPrice = 200000m, // 200k/kg
            IsActive = false // Nguyên liệu bị tạm ngưng
        }, autoSave: true);

        var recipe = await _recipeAppService.CreateAsync(new CreateRecipeDto
        {
            DishId = dish.Id,
            Name = "Công thức Cá Hồi Nướng Bơ",
            Ingredients = new List<CreateRecipeIngredientDto>
            {
                new() { IngredientId = salmon.Id, Quantity = 0.2m, Unit = "kg", ConversionFactor = 1m }, // 0.2 * 400k = 80k
                new() { IngredientId = butter.Id, Quantity = 50m, Unit = "g", ConversionFactor = 0.001m } // 0.05 * 200k = 10k
            }
        });

        recipe.TotalEstimatedCost.ShouldBe(90000m); // 80k + 10k
        recipe.FoodCostPercentage.ShouldBe(45.0m);  // (90k / 200k) * 100 = 45%
        recipe.HasDeactivatedIngredients.ShouldBeTrue();
    }

    [Fact]
    public async Task Should_Get_Active_Recipe_For_POS_And_Null_When_Deactivated()
    {
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Trà Đào {Guid.NewGuid():N}",
            Price = 35000m,
            IsActive = true
        }, autoSave: true);

        var tea = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Trà túi lọc", "gói", 50, StorageType.LONG_TERM), autoSave: true);

        var recipe = await _recipeAppService.CreateAsync(new CreateRecipeDto
        {
            DishId = dish.Id,
            Name = "Công thức Trà Đào Cam Sả",
            Ingredients = new List<CreateRecipeIngredientDto>
            {
                new() { IngredientId = tea.Id, Quantity = 1m, Unit = "gói", ConversionFactor = 1m }
            }
        });

        // 1. Khi Recipe active -> GetActiveByDishIdAsync trả về công thức
        var activeRecipe = await _recipeAppService.GetActiveByDishIdAsync(dish.Id);
        activeRecipe.ShouldNotBeNull();
        activeRecipe.Id.ShouldBe(recipe.Id);
        activeRecipe.Ingredients.First().BaseQuantity.ShouldBe(1m);

        // 2. Khi tạm ngưng Recipe -> POS nhận về null
        await _recipeAppService.DeactivateAsync(recipe.Id, "Hết nguyên liệu trà");
        var afterDeactivation = await _recipeAppService.GetActiveByDishIdAsync(dish.Id);
        afterDeactivation.ShouldBeNull();
    }
}
