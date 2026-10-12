using System;
using System.Threading.Tasks;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Ingredients;

public abstract class IngredientAppService_Deactivate_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IIngredientAppService _ingredientAppService;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<RecipeIngredient, Guid> _recipeIngredientRepository;

    protected IngredientAppService_Deactivate_Tests()
    {
        _ingredientAppService = GetRequiredService<IIngredientAppService>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _recipeRepository = GetRequiredService<IRepository<Recipe, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _recipeIngredientRepository = GetRequiredService<IRepository<RecipeIngredient, Guid>>();
    }

    [Fact]
    public async Task Should_Deactivate_Ingredient_And_Cascade_Via_AppService()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var created = await _ingredientAppService.CreateAsync(new CreateIngredientDto
        {
            Name = $"Bò Fuji {suffix}",
            BaseUnit = "kg",
            MinStock = 3m,
            StorageType = StorageType.FRESH
        });

        Guid recipeId = Guid.Empty;
        Guid dishId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Bít tết Fuji {suffix}",
                Price = 300000m,
                IsActive = true
            }, autoSave: true);
            dishId = dish.Id;

            var recipe = new Recipe(Guid.NewGuid(), dish.Id, $"Công thức Fuji {suffix}", isActive: true);
            recipe = await _recipeRepository.InsertAsync(recipe, autoSave: true);
            recipeId = recipe.Id;

            await _recipeIngredientRepository.InsertAsync(
                new RecipeIngredient(Guid.NewGuid(), recipe.Id, created.Id, 0.2m, "kg", 1.0m),
                autoSave: true);
        });

        // Act
        var result = await _ingredientAppService.DeactivateAsync(created.Id, "Ngừng hợp tác nhà cung cấp");

        result.IsActive.ShouldBeFalse();
        result.DeactivationReason.ShouldBe("Ngừng hợp tác nhà cung cấp");

        await WithUnitOfWorkAsync(async () =>
        {
            var updatedRecipe = await _recipeRepository.GetAsync(recipeId);
            updatedRecipe.IsActive.ShouldBeFalse();

            var updatedDish = await _dishRepository.GetAsync(dishId);
            updatedDish.IsActive.ShouldBeFalse();
        });
    }

    [Fact]
    public async Task Should_Throw_Exception_When_Deactivating_Without_Reason()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var created = await _ingredientAppService.CreateAsync(new CreateIngredientDto
        {
            Name = $"Nguyên liệu mẫu {suffix}",
            BaseUnit = "g",
            MinStock = 1m
        });

        await Should.ThrowAsync<ArgumentException>(async () =>
        {
            await _ingredientAppService.DeactivateAsync(created.Id, "");
        });
    }
}
