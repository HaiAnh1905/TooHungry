using System;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Acme.TooHungry.Ingredients;

public class IngredientManager : DomainService
{
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<RecipeIngredient, Guid> _recipeIngredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<DailyMenuItem, Guid> _dailyMenuItemRepository;

    public IngredientManager(
        IRepository<Ingredient, Guid> ingredientRepository,
        IRepository<RecipeIngredient, Guid> recipeIngredientRepository,
        IRepository<InventoryBatch, Guid> batchRepository,
        IRepository<Recipe, Guid> recipeRepository,
        IRepository<Dish, Guid> dishRepository,
        IRepository<DailyMenuItem, Guid> dailyMenuItemRepository)
    {
        _ingredientRepository = ingredientRepository;
        _recipeIngredientRepository = recipeIngredientRepository;
        _batchRepository = batchRepository;
        _recipeRepository = recipeRepository;
        _dishRepository = dishRepository;
        _dailyMenuItemRepository = dailyMenuItemRepository;
    }

    public virtual async Task CheckNameAsync(string name, Guid? excludeId = null)
    {
        Check.NotNullOrWhiteSpace(name, nameof(name));
        var cleanName = name.Trim();

        var allIngredients = await _ingredientRepository.GetListAsync();
        var allWithSameName = allIngredients
            .Where(x => string.Equals(x.Name?.Trim(), cleanName, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (excludeId.HasValue)
        {
            allWithSameName = allWithSameName.Where(x => x.Id != excludeId.Value).ToList();
        }

        var activeMatch = allWithSameName.FirstOrDefault(x => x.IsActive);
        if (activeMatch != null)
        {
            throw new BusinessException("Ingredient:NameAlreadyExists")
                .WithData("Name", cleanName);
        }

        var inactiveMatch = allWithSameName.FirstOrDefault(x => !x.IsActive);
        if (inactiveMatch != null)
        {
            var ex = new BusinessException("Ingredient:AlreadyExistsInactive")
                .WithData("Name", cleanName)
                .WithData("IngredientId", inactiveMatch.Id);
            throw ex;
        }
    }

    public virtual async Task<Ingredient> CreateAsync(
        string name,
        string baseUnit,
        decimal minStock,
        decimal estimatedPrice,
        StorageType storageType,
        ConsumptionMethod consumptionMethod = ConsumptionMethod.RECIPE)
    {
        await CheckNameAsync(name);

        return new Ingredient(
            GuidGenerator.Create(),
            name.Trim(),
            baseUnit.Trim(),
            minStock,
            storageType,
            consumptionMethod,
            estimatedPrice
        );
    }

    public virtual async Task<bool> CanChangeUnitAsync(Guid ingredientId)
    {
        var hasRecipe = await _recipeIngredientRepository.AnyAsync(x => x.IngredientId == ingredientId);
        if (hasRecipe)
        {
            return false;
        }

        var hasBatch = await _batchRepository.AnyAsync(x => x.IngredientId == ingredientId);
        if (hasBatch)
        {
            return false;
        }

        return true;
    }

    public virtual async Task CheckCanChangeUnitAsync(Guid ingredientId)
    {
        var canChange = await CanChangeUnitAsync(ingredientId);
        if (!canChange)
        {
            throw new BusinessException("Ingredient:CannotChangeUnitWithExistingData");
        }
    }

    public virtual async Task CheckCanDeleteAsync(Guid ingredientId)
    {
        var ingredient = await _ingredientRepository.FindAsync(ingredientId);
        if (ingredient == null)
        {
            throw new EntityNotFoundException(typeof(Ingredient), ingredientId);
        }

        var hasRecipe = await _recipeIngredientRepository.AnyAsync(x => x.IngredientId == ingredientId);
        if (hasRecipe)
        {
            throw new BusinessException("Ingredient:CannotDeleteUsedInRecipe");
        }

        var hasBatch = await _batchRepository.AnyAsync(x => x.IngredientId == ingredientId);
        if (hasBatch)
        {
            throw new BusinessException("Ingredient:CannotDeleteHasBatches");
        }
    }

    public virtual async Task<Ingredient> DeactivateAsync(Guid ingredientId, string reason)
    {
        var ingredient = await _ingredientRepository.GetAsync(ingredientId);
        return await DeactivateAsync(ingredient, reason);
    }

    public virtual async Task<Ingredient> DeactivateAsync(Ingredient ingredient, string reason)
    {
        Check.NotNull(ingredient, nameof(ingredient));
        Check.NotNullOrWhiteSpace(reason, nameof(reason));

        ingredient.Deactivate(reason);
        await _ingredientRepository.UpdateAsync(ingredient, autoSave: true);

        var recipeIngredients = await _recipeIngredientRepository.GetListAsync(x => x.IngredientId == ingredient.Id);
        var recipeIds = recipeIngredients.Select(x => x.RecipeId).Distinct().ToList();
        var cascadingReason = $"Vô hiệu hóa do nguyên liệu '{ingredient.Name}' bị vô hiệu hóa: {reason.Trim()}";

        foreach (var recipeId in recipeIds)
        {
            var recipe = await _recipeRepository.FindAsync(recipeId);
            if (recipe != null)
            {
                recipe.Deactivate(cascadingReason);
                await _recipeRepository.UpdateAsync(recipe, autoSave: true);

                if (recipe.DishId != Guid.Empty)
                {
                    var dish = await _dishRepository.FindAsync(recipe.DishId);
                    if (dish != null)
                    {
                        dish.Deactivate(cascadingReason);
                        await _dishRepository.UpdateAsync(dish, autoSave: true);

                        var dailyItems = await _dailyMenuItemRepository.GetListAsync(x => x.DishId == dish.Id);
                        foreach (var item in dailyItems)
                        {
                            const string stoppedTag = "[Đã ngừng phục vụ]";
                            if (string.IsNullOrWhiteSpace(item.Note))
                            {
                                item.Note = stoppedTag;
                            }
                            else if (!item.Note.Contains(stoppedTag))
                            {
                                item.Note = $"{item.Note} {stoppedTag}";
                            }
                            await _dailyMenuItemRepository.UpdateAsync(item, autoSave: true);
                        }
                    }
                }
            }
        }

        return ingredient;
    }

    public virtual async Task<Ingredient> ReactivateAsync(Guid ingredientId)
    {
        var ingredient = await _ingredientRepository.GetAsync(ingredientId);
        return await ReactivateAsync(ingredient);
    }

    public virtual async Task<Ingredient> ReactivateAsync(Ingredient ingredient)
    {
        Check.NotNull(ingredient, nameof(ingredient));
        ingredient.Reactivate();
        await _ingredientRepository.UpdateAsync(ingredient, autoSave: true);
        return ingredient;
    }
}
