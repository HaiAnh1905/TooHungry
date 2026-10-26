using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Acme.TooHungry.Recipes;

public class RecipeManager : DomainService
{
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    public RecipeManager(
        IRepository<Recipe, Guid> recipeRepository,
        IRepository<Dish, Guid> dishRepository,
        IRepository<Ingredient, Guid> ingredientRepository)
    {
        _recipeRepository = recipeRepository;
        _dishRepository = dishRepository;
        _ingredientRepository = ingredientRepository;
    }

    public async Task<Recipe> CreateAsync(
        Guid dishId,
        string name,
        string? description,
        List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor, Guid? recipeUnitId)> ingredients)
    {
        var dish = await _dishRepository.FindAsync(dishId);
        if (dish == null)
        {
            throw new BusinessException("Recipe:DishNotFound");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            name = $"Công thức {dish.Name}";
        }
        Check.NotNullOrWhiteSpace(name, nameof(name));

        var activeRecipe = await _recipeRepository.FirstOrDefaultAsync(x => x.DishId == dishId && x.IsActive);
        if (activeRecipe != null)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.RecipeActiveAlreadyExists);
        }

        // Validate 100% nguyên liệu tồn tại trong hệ thống
        var inputIngIds = ingredients.Select(x => x.ingredientId).Distinct().ToList();
        var validIngredients = await _ingredientRepository.GetListAsync(x => inputIngIds.Contains(x.Id));
        if (validIngredients.Count != inputIngIds.Count)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.RecipeIngredientNotActiveOrNotFound);
        }

        var recipe = new Recipe(
            GuidGenerator.Create(),
            dishId,
            name,
            description,
            version: 1,
            isActive: true
        );

        var groupedIngredients = ingredients
            .GroupBy(x => x.ingredientId)
            .Select(g =>
            {
                var first = g.First();
                var totalQty = g.Sum(x => x.quantity);
                return (first.ingredientId, totalQty, first.unit, first.conversionFactor, first.recipeUnitId);
            })
            .ToList();

        foreach (var item in groupedIngredients)
        {
            var unit = string.IsNullOrWhiteSpace(item.unit) ? "Phần" : item.unit;
            recipe.AddIngredient(
                GuidGenerator.Create(),
                item.ingredientId,
                item.totalQty,
                unit,
                item.conversionFactor <= 0 ? 1.0m : item.conversionFactor,
                item.recipeUnitId
            );
        }

        return await _recipeRepository.InsertAsync(recipe, autoSave: true);
    }

    public Task<Recipe> CreateAsync(
        Guid dishId,
        string name,
        string? description,
        List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor)> ingredients)
    {
        return CreateAsync(
            dishId,
            name,
            description,
            ingredients.Select(x => (x.ingredientId, x.quantity, x.unit, x.conversionFactor, (Guid?)null)).ToList());
    }

    public async Task<Recipe> UpdateAsync(
        Guid id,
        string name,
        string? description,
        List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor, Guid? recipeUnitId)> ingredients)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.Ingredients);
        var recipe = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id) ?? await _recipeRepository.GetAsync(id);

        if (string.IsNullOrWhiteSpace(name))
        {
            name = recipe.Name;
        }
        Check.NotNullOrWhiteSpace(name, nameof(name));

        // 1. Kiểm tra 100% nguyên liệu tồn tại trong hệ thống
        var inputIngIds = ingredients.Select(x => x.ingredientId).Distinct().ToList();
        var validIngredients = await _ingredientRepository.GetListAsync(x => inputIngIds.Contains(x.Id));
        if (validIngredients.Count != inputIngIds.Count)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.RecipeIngredientNotActiveOrNotFound);
        }

        // 2. Clone bản ghi cũ thành snapshot lịch sử với IsActive = false, cùng Version cũ
        var snapshotId = GuidGenerator.Create();
        var snapshotRecipe = new Recipe(
            snapshotId,
            recipe.DishId,
            recipe.Name,
            recipe.Description,
            version: recipe.Version,
            isActive: false
        );

        foreach (var oldIng in recipe.Ingredients)
        {
            snapshotRecipe.AddIngredient(
                GuidGenerator.Create(),
                oldIng.IngredientId,
                oldIng.Quantity,
                oldIng.Unit,
                oldIng.ConversionFactor,
                oldIng.RecipeUnitId
            );
        }
        await _recipeRepository.InsertAsync(snapshotRecipe, autoSave: true);

        // 3. Tăng Version++ và cập nhật bản ghi chính với IsActive = true
        recipe.SetName(name);
        recipe.Description = description;
        recipe.BumpVersion();

        var groupedIngredients = ingredients
            .GroupBy(x => x.ingredientId)
            .Select(g =>
            {
                var first = g.First();
                var totalQty = g.Sum(x => x.quantity);
                return (first.ingredientId, totalQty, first.unit, first.conversionFactor, first.recipeUnitId);
            })
            .ToList();

        // Cập nhật danh sách nguyên liệu
        var currentIngredientIds = groupedIngredients.Select(x => x.ingredientId).ToHashSet();
        var toRemove = recipe.Ingredients.Where(x => !currentIngredientIds.Contains(x.IngredientId)).ToList();
        foreach (var r in toRemove)
        {
            recipe.Ingredients.Remove(r);
        }

        foreach (var item in groupedIngredients)
        {
            var unit = string.IsNullOrWhiteSpace(item.unit) ? "Phần" : item.unit;
            recipe.AddIngredient(
                GuidGenerator.Create(),
                item.ingredientId,
                item.totalQty,
                unit,
                item.conversionFactor <= 0 ? 1.0m : item.conversionFactor,
                item.recipeUnitId
            );
        }

        return await _recipeRepository.UpdateAsync(recipe, autoSave: true);
    }

    public Task<Recipe> UpdateAsync(
        Guid id,
        string name,
        string? description,
        List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor)> ingredients)
    {
        return UpdateAsync(
            id,
            name,
            description,
            ingredients.Select(x => (x.ingredientId, x.quantity, x.unit, x.conversionFactor, (Guid?)null)).ToList());
    }

    public async Task<Recipe> DeactivateAsync(Guid id, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new BusinessException("Recipe:DeactivationReasonRequired");
        }

        var recipe = await _recipeRepository.GetAsync(id);
        recipe.Deactivate(reason);
        return await _recipeRepository.UpdateAsync(recipe, autoSave: true);
    }

    public async Task<Recipe> ReactivateAsync(Guid id)
    {
        var recipe = await _recipeRepository.GetAsync(id);

        var existingActive = await _recipeRepository.FirstOrDefaultAsync(x => x.DishId == recipe.DishId && x.IsActive && x.Id != id);
        if (existingActive != null)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.RecipeActiveAlreadyExists);
        }

        recipe.Reactivate();
        return await _recipeRepository.UpdateAsync(recipe, autoSave: true);
    }
}
