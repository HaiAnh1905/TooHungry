using System;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Ingredients;

public abstract class IngredientAppService_Reactivate_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IIngredientAppService _ingredientAppService;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<RecipeIngredient, Guid> _recipeIngredientRepository;

    protected IngredientAppService_Reactivate_Tests()
    {
        _ingredientAppService = GetRequiredService<IIngredientAppService>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _recipeRepository = GetRequiredService<IRepository<Recipe, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _recipeIngredientRepository = GetRequiredService<IRepository<RecipeIngredient, Guid>>();
    }

    [Fact]
    public async Task Should_Reactivate_Ingredient_While_Keeping_Recipes_And_Dishes_Inactive()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var created = await _ingredientAppService.CreateAsync(new CreateIngredientDto
        {
            Name = $"Cá Ngừ Đại Dương {suffix}",
            BaseUnit = "kg",
            MinStock = 4m,
            StorageType = StorageType.FRESH
        });

        Guid recipeId = Guid.Empty;
        Guid dishId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Sashimi Cá Ngừ {suffix}",
                Price = 280000m,
                IsActive = true
            }, autoSave: true);
            dishId = dish.Id;

            var recipe = new Recipe(Guid.NewGuid(), dish.Id, $"Công thức Sashimi {suffix}", isActive: true);
            recipe = await _recipeRepository.InsertAsync(recipe, autoSave: true);
            recipeId = recipe.Id;

            await _recipeIngredientRepository.InsertAsync(
                new RecipeIngredient(Guid.NewGuid(), recipe.Id, created.Id, 0.25m, "kg", 1.0m),
                autoSave: true);
        });

        // 1. Deactivate ingredient (cascades to recipe and dish)
        await _ingredientAppService.DeactivateAsync(created.Id, "Tạm hết hàng ngoài khơi");

        // 2. Reactivate ingredient
        var reactivated = await _ingredientAppService.ReactivateAsync(created.Id);

        // Assert: Ingredient is active again
        reactivated.IsActive.ShouldBeTrue();
        reactivated.DeactivationReason.ShouldBeNull();

        // Assert: Recipe and Dish remain Inactive for chef review!
        await WithUnitOfWorkAsync(async () =>
        {
            var recipe = await _recipeRepository.GetAsync(recipeId);
            recipe.IsActive.ShouldBeFalse();

            var dish = await _dishRepository.GetAsync(dishId);
            dish.IsActive.ShouldBeFalse();
        });
    }
}
