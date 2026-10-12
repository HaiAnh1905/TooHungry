using System;
using System.Threading.Tasks;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Ingredients;

public abstract class IngredientManager_Cascading_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IngredientManager _ingredientManager;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<RecipeIngredient, Guid> _recipeIngredientRepository;
    private readonly IRepository<DailyMenu, Guid> _dailyMenuRepository;
    private readonly IRepository<DailyMenuItem, Guid> _dailyMenuItemRepository;

    protected IngredientManager_Cascading_Tests()
    {
        _ingredientManager = GetRequiredService<IngredientManager>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _recipeRepository = GetRequiredService<IRepository<Recipe, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _recipeIngredientRepository = GetRequiredService<IRepository<RecipeIngredient, Guid>>();
        _dailyMenuRepository = GetRequiredService<IRepository<DailyMenu, Guid>>();
        _dailyMenuItemRepository = GetRequiredService<IRepository<DailyMenuItem, Guid>>();
    }

    [Fact]
    public async Task Should_Cascade_Deactivate_Recipes_Dishes_And_DailyMenuItems()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        Guid ingredientId = Guid.Empty;
        Guid recipeId = Guid.Empty;
        Guid dishId = Guid.Empty;
        Guid dailyMenuItemId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), $"Bò Kobe {suffix}", "kg", 5m, StorageType.FRESH), autoSave: true);
            ingredientId = ing.Id;

            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Bít tết Kobe {suffix}",
                Price = 500000m,
                IsActive = true
            }, autoSave: true);
            dishId = dish.Id;

            var recipe = new Recipe(Guid.NewGuid(), dish.Id, $"Công thức bít tết {suffix}", isActive: true);
            recipe = await _recipeRepository.InsertAsync(recipe, autoSave: true);
            recipeId = recipe.Id;

            var recipeIng = new RecipeIngredient(Guid.NewGuid(), recipe.Id, ing.Id, 0.3m, "kg", 1.0m);
            await _recipeIngredientRepository.InsertAsync(recipeIng, autoSave: true);

            var dailyMenu = await _dailyMenuRepository.InsertAsync(new DailyMenu
            {
                Date = DateTime.UtcNow.Date,
                Name = $"Menu {suffix}",
                IsActive = true
            }, autoSave: true);

            var dailyItem = await _dailyMenuItemRepository.InsertAsync(new DailyMenuItem
            {
                DailyMenuId = dailyMenu.Id,
                DishId = dish.Id,
                Note = "Món bán chạy"
            }, autoSave: true);
            dailyMenuItemId = dailyItem.Id;
        });

        // Act: Vô hiệu hóa Ingredient kèm lý do
        await WithUnitOfWorkAsync(async () =>
        {
            await _ingredientManager.DeactivateAsync(ingredientId, "Ngừng cung ứng");
        });

        // Assert
        await WithUnitOfWorkAsync(async () =>
        {
            var updatedIng = await _ingredientRepository.GetAsync(ingredientId);
            updatedIng.IsActive.ShouldBeFalse();
            updatedIng.DeactivationReason.ShouldBe("Ngừng cung ứng");

            var updatedRecipe = await _recipeRepository.GetAsync(recipeId);
            updatedRecipe.IsActive.ShouldBeFalse();
            updatedRecipe.DeactivationReason.ShouldNotBeNull();
            updatedRecipe.DeactivationReason.ShouldContain("Bò Kobe");
            updatedRecipe.DeactivationReason.ShouldContain("Ngừng cung ứng");

            var updatedDish = await _dishRepository.GetAsync(dishId);
            updatedDish.IsActive.ShouldBeFalse();
            updatedDish.DeletionReason.ShouldNotBeNull();
            updatedDish.DeletionReason.ShouldContain("Bò Kobe");

            var updatedDailyItem = await _dailyMenuItemRepository.GetAsync(dailyMenuItemId);
            updatedDailyItem.Note.ShouldNotBeNull();
            updatedDailyItem.Note.ShouldContain("[Đã ngừng phục vụ]");
        });
    }
}
