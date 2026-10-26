using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Units;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Recipes;

[RemoteService(IsEnabled = false)]
public class RecipeAppService : TooHungryAppService, IRecipeAppService
{
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly RecipeManager _recipeManager;
    private readonly TooHungryRecipeToRecipeDtoMapper _recipeMapper;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<Unit, Guid> _unitRepository;

    public RecipeAppService(
        IRepository<Recipe, Guid> recipeRepository,
        RecipeManager recipeManager,
        TooHungryRecipeToRecipeDtoMapper recipeMapper,
        IRepository<Dish, Guid> dishRepository,
        IRepository<Ingredient, Guid> ingredientRepository,
        IRepository<Unit, Guid> unitRepository)
    {
        _recipeRepository = recipeRepository;
        _recipeManager = recipeManager;
        _recipeMapper = recipeMapper;
        _dishRepository = dishRepository;
        _ingredientRepository = ingredientRepository;
        _unitRepository = unitRepository;
    }

    public virtual async Task<RecipeDto> GetAsync(Guid id)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.Dish!, x => x.Ingredients);
        var recipe = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (recipe == null)
        {
            throw new EntityNotFoundException(typeof(Recipe), id);
        }

        var dto = _recipeMapper.Map(recipe);
        await PopulateAdditionalIngredientDataAsync(dto, recipe);
        return dto;
    }

    public virtual async Task<PagedResultDto<RecipeDto>> GetListAsync(RecipeFilterDto input)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.Dish!, x => x.Ingredients);

        if (input.DishId.HasValue)
        {
            queryable = queryable.Where(x => x.DishId == input.DishId.Value);
        }

        if (input.DishCategoryId.HasValue)
        {
            queryable = queryable.Where(x => x.Dish != null && x.Dish.DishCategoryId == input.DishCategoryId.Value);
        }

        if (input.IsActive.HasValue)
        {
            queryable = queryable.Where(x => x.IsActive == input.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x => x.Name.ToLower().Contains(filter) || (x.Dish != null && x.Dish.Name.ToLower().Contains(filter)));
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = string.IsNullOrWhiteSpace(input.Sorting) ? "CreationTime desc" : input.Sorting;
        queryable = queryable
            .OrderBy(sorting)
            .Skip(input.SkipCount)
            .Take(input.MaxResultCount);

        var recipes = await AsyncExecuter.ToListAsync(queryable);

        var dtos = recipes.Select(r => _recipeMapper.Map(r)).ToList();
        await PopulateAdditionalIngredientDataAsync(dtos.Zip(recipes, (dto, r) => (dto, r)));

        return new PagedResultDto<RecipeDto>(totalCount, dtos);
    }

    public virtual async Task<RecipeDto?> GetActiveByDishIdAsync(Guid dishId)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.Dish!, x => x.Ingredients);
        var recipe = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.DishId == dishId && x.IsActive);
        if (recipe == null)
        {
            return null;
        }

        var dto = _recipeMapper.Map(recipe);
        await PopulateAdditionalIngredientDataAsync(dto, recipe);
        return dto;
    }

    public virtual async Task<List<RecipeDto>> GetHistoryByDishIdAsync(Guid dishId)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.Dish!, x => x.Ingredients);
        var recipes = await AsyncExecuter.ToListAsync(
            queryable.Where(x => x.DishId == dishId).OrderByDescending(x => x.Version)
        );

        var dtos = recipes.Select(r => _recipeMapper.Map(r)).ToList();
        await PopulateAdditionalIngredientDataAsync(dtos.Zip(recipes, (dto, r) => (dto, r)));

        return dtos;
    }

    public virtual async Task<RecipeDto> CreateOrUpdateAsync(CreateOrUpdateRecipeDto input)
    {
        var activeRecipe = await _recipeRepository.FirstOrDefaultAsync(x => x.DishId == input.DishId && x.IsActive);
        var name = input.Name;
        if (string.IsNullOrWhiteSpace(name))
        {
            var dish = await _dishRepository.FindAsync(input.DishId);
            name = dish != null ? $"Công thức {dish.Name}" : "Công thức món ăn";
        }

        var ingredientTuples = await PrepareIngredientsAsync(input.Ingredients);

        if (activeRecipe != null)
        {
            var updated = await _recipeManager.UpdateAsync(activeRecipe.Id, name, input.Description, ingredientTuples);
            return await GetAsync(updated.Id);
        }
        else
        {
            var created = await _recipeManager.CreateAsync(input.DishId, name, input.Description, ingredientTuples);
            return await GetAsync(created.Id);
        }
    }

    public virtual async Task<RecipeDto> CreateAsync(CreateRecipeDto input)
    {
        var name = input.Name;
        if (string.IsNullOrWhiteSpace(name))
        {
            var dish = await _dishRepository.FindAsync(input.DishId);
            name = dish != null ? $"Công thức {dish.Name}" : "Công thức món ăn";
        }

        var ingredientTuples = await PrepareIngredientsAsync(input.Ingredients);
        var created = await _recipeManager.CreateAsync(input.DishId, name, input.Description, ingredientTuples);
        return await GetAsync(created.Id);
    }

    public virtual async Task<RecipeDto> UpdateAsync(Guid id, UpdateRecipeDto input)
    {
        var recipe = await _recipeRepository.GetAsync(id);
        var name = input.Name;
        if (string.IsNullOrWhiteSpace(name))
        {
            name = recipe.Name;
        }

        var ingredientTuples = await PrepareIngredientsAsync(input.Ingredients);
        var updated = await _recipeManager.UpdateAsync(id, name, input.Description, ingredientTuples);

        return await GetAsync(updated.Id);
    }

    public virtual async Task<RecipeDto> DeactivateAsync(Guid id, string reason)
    {
        var recipe = await _recipeManager.DeactivateAsync(id, reason);
        return await GetAsync(recipe.Id);
    }

    public virtual async Task<RecipeDto> ReactivateAsync(Guid id)
    {
        var recipe = await _recipeManager.ReactivateAsync(id);
        return await GetAsync(recipe.Id);
    }

    private async Task<List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor, Guid? recipeUnitId)>> PrepareIngredientsAsync(List<CreateRecipeIngredientDto> items)
    {
        var result = new List<(Guid, decimal, string, decimal, Guid?)>();
        if (items.Count == 0) return result;

        var unitIds = items.Where(x => string.IsNullOrWhiteSpace(x.Unit) && x.RecipeUnitId.HasValue)
                           .Select(x => x.RecipeUnitId!.Value)
                           .Distinct()
                           .ToList();
        var unitMap = unitIds.Count > 0
            ? (await _unitRepository.GetListAsync(x => unitIds.Contains(x.Id))).ToDictionary(x => x.Id)
            : new Dictionary<Guid, Unit>();

        var ingIds = items.Where(x => string.IsNullOrWhiteSpace(x.Unit))
                          .Select(x => x.IngredientId)
                          .Distinct()
                          .ToList();
        var ingMap = ingIds.Count > 0
            ? (await _ingredientRepository.GetListAsync(x => ingIds.Contains(x.Id))).ToDictionary(x => x.Id)
            : new Dictionary<Guid, Ingredient>();

        foreach (var item in items)
        {
            var unit = item.Unit;
            if (string.IsNullOrWhiteSpace(unit) && item.RecipeUnitId.HasValue && unitMap.TryGetValue(item.RecipeUnitId.Value, out var unitEntity))
            {
                unit = unitEntity.Name;
            }

            if (string.IsNullOrWhiteSpace(unit) && ingMap.TryGetValue(item.IngredientId, out var ing))
            {
                unit = ing.BaseUnit;
            }

            if (string.IsNullOrWhiteSpace(unit))
            {
                unit = "Phần";
            }

            result.Add((item.IngredientId, item.Quantity, unit, item.ConversionFactor <= 0 ? 1.0m : item.ConversionFactor, item.RecipeUnitId));
        }

        return result;
    }

    private async Task PopulateAdditionalIngredientDataAsync(IEnumerable<(RecipeDto Dto, Recipe Entity)> items)
    {
        var itemList = items.ToList();
        if (itemList.Count == 0) return;

        // 1. Nạp danh mục Unit 1 lần duy nhất
        var units = await _unitRepository.GetListAsync();

        // 2. Gom nhóm các DishId thiếu tên/giá
        var missingDishIds = itemList
            .Where(x => x.Entity.Dish == null && x.Dto.DishId != Guid.Empty && (string.IsNullOrWhiteSpace(x.Dto.DishName) || x.Dto.DishPrice == 0))
            .Select(x => x.Dto.DishId)
            .Distinct()
            .ToList();

        var dishMap = new Dictionary<Guid, Dish>();
        if (missingDishIds.Count > 0)
        {
            var dishes = await _dishRepository.GetListAsync(x => missingDishIds.Contains(x.Id));
            dishMap = dishes.ToDictionary(x => x.Id);
        }

        // 3. Gom nhóm toàn bộ IngredientIds của tất cả Recipes
        var allIngredientIds = itemList
            .SelectMany(x => x.Dto.Ingredients.Select(i => i.IngredientId))
            .Distinct()
            .ToList();

        var ingMap = new Dictionary<Guid, Ingredient>();
        if (allIngredientIds.Count > 0)
        {
            var ingredientEntities = await _ingredientRepository.GetListAsync(x => allIngredientIds.Contains(x.Id));
            ingMap = ingredientEntities.ToDictionary(x => x.Id);
        }

        // 4. Map in-memory O(1)
        foreach (var (dto, recipe) in itemList)
        {
            if (recipe.Dish != null)
            {
                dto.DishName = recipe.Dish.Name;
                dto.DishPrice = recipe.Dish.Price;
            }
            else if (dishMap.TryGetValue(dto.DishId, out var dish))
            {
                dto.DishName = dish.Name;
                dto.DishPrice = dish.Price;
            }

            foreach (var item in dto.Ingredients)
            {
                var entityItem = recipe.Ingredients.FirstOrDefault(x => x.Id == item.Id || x.IngredientId == item.IngredientId);
                if (entityItem != null)
                {
                    item.BaseQuantity = entityItem.CalculateBaseQuantity();
                    item.RecipeUnitId = entityItem.RecipeUnitId;
                }

                if (ingMap.TryGetValue(item.IngredientId, out var ing))
                {
                    item.IngredientName = ing.Name;
                    item.BaseUnit = ing.BaseUnit;
                    item.EstimatedPrice = ing.EstimatedPrice;
                    item.IsIngredientActive = ing.IsActive;
                }

                item.ItemEstimatedCost = item.BaseQuantity * item.EstimatedPrice;

                if (!string.IsNullOrWhiteSpace(item.Unit))
                {
                    var matchedUnit = units.FirstOrDefault(u => string.Equals(u.Name, item.Unit, StringComparison.OrdinalIgnoreCase) ||
                                                               string.Equals(u.Abbreviation, item.Unit, StringComparison.OrdinalIgnoreCase));
                    if (matchedUnit != null)
                    {
                        item.RecipeUnitId = matchedUnit.Id;
                    }
                }
            }

            dto.TotalEstimatedCost = dto.Ingredients.Sum(x => x.ItemEstimatedCost);
            dto.FoodCostPercentage = dto.DishPrice > 0 ? Math.Round((dto.TotalEstimatedCost / dto.DishPrice) * 100m, 2) : 0m;
            dto.HasDeactivatedIngredients = dto.Ingredients.Any(x => !x.IsIngredientActive);
        }
    }

    private Task PopulateAdditionalIngredientDataAsync(RecipeDto dto, Recipe recipe)
    {
        return PopulateAdditionalIngredientDataAsync(new[] { (dto, recipe) });
    }
}
