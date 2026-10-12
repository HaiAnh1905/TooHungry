using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Recipes;
using Acme.TooHungry.Units;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Ingredients;

[RemoteService(IsEnabled = false)]
[Authorize(TooHungryPermissions.Ingredients.Default)]
public class IngredientAppService : TooHungryAppService, IIngredientAppService
{
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<RecipeIngredient, Guid> _recipeIngredientRepository;
    private readonly IRepository<Unit, Guid> _unitRepository;
    private readonly IngredientManager _ingredientManager;
    private readonly TooHungryIngredientToIngredientDtoMapper _ingredientMapper;

    public IngredientAppService(
        IRepository<Ingredient, Guid> ingredientRepository,
        IRepository<InventoryBatch, Guid> batchRepository,
        IRepository<RecipeIngredient, Guid> recipeIngredientRepository,
        IRepository<Unit, Guid> unitRepository,
        IngredientManager ingredientManager,
        TooHungryIngredientToIngredientDtoMapper ingredientMapper)
    {
        _ingredientRepository = ingredientRepository;
        _batchRepository = batchRepository;
        _recipeIngredientRepository = recipeIngredientRepository;
        _unitRepository = unitRepository;
        _ingredientManager = ingredientManager;
        _ingredientMapper = ingredientMapper;
    }

    public virtual async Task<IngredientDto> GetAsync(Guid id)
    {
        var ingredient = await _ingredientRepository.GetAsync(id);
        var dto = _ingredientMapper.Map(ingredient);

        var today = DateTime.UtcNow.Date;
        var batchQueryable = await _batchRepository.GetQueryableAsync();
        var batches = await AsyncExecuter.ToListAsync(
            batchQueryable.Where(x => x.IngredientId == id && x.IsActive)
        );

        dto.CurrentStock = batches
            .Where(x => x.RemainingQuantity > 0 && x.ExpiryDate.Date >= today)
            .Sum(x => x.RemainingQuantity);

        dto.ExpiredStock = batches
            .Where(x => x.RemainingQuantity > 0 && x.ExpiryDate.Date < today)
            .Sum(x => x.RemainingQuantity);

        dto.CanEditUnit = await _ingredientManager.CanChangeUnitAsync(id);

        var allUnits = await _unitRepository.GetListAsync();
        var matchingUnit = allUnits.FirstOrDefault(u =>
            string.Equals(u.Name, ingredient.BaseUnit, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(u.Abbreviation, ingredient.BaseUnit, StringComparison.OrdinalIgnoreCase));
        if (matchingUnit != null)
        {
            dto.UnitId = matchingUnit.Id;
        }

        return dto;
    }

    public virtual async Task<PagedResultDto<IngredientDto>> GetListAsync(GetIngredientsInput input)
    {
        var queryable = await _ingredientRepository.GetQueryableAsync();

        if (input.StorageType.HasValue)
        {
            queryable = queryable.Where(x => x.StorageType == input.StorageType.Value);
        }

        if (input.ConsumptionMethod.HasValue)
        {
            queryable = queryable.Where(x => x.ConsumptionMethod == input.ConsumptionMethod.Value);
        }

        if (input.IsActive.HasValue)
        {
            queryable = queryable.Where(x => x.IsActive == input.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x => x.Name.ToLower().Contains(filter));
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = string.IsNullOrWhiteSpace(input.Sorting) ? "CreationTime desc" : input.Sorting;
        queryable = queryable
            .OrderBy(sorting)
            .Skip(input.SkipCount)
            .Take(input.MaxResultCount);

        var ingredients = await AsyncExecuter.ToListAsync(queryable);
        var ingredientIds = ingredients.Select(x => x.Id).ToList();

        var today = DateTime.UtcNow.Date;
        var batchQueryable = await _batchRepository.GetQueryableAsync();
        var batches = await AsyncExecuter.ToListAsync(
            batchQueryable.Where(x => ingredientIds.Contains(x.IngredientId) && x.IsActive)
        );

        var recipeIngQueryable = await _recipeIngredientRepository.GetQueryableAsync();
        var usedInRecipeIds = (await AsyncExecuter.ToListAsync(
            recipeIngQueryable.Where(x => ingredientIds.Contains(x.IngredientId)).Select(x => x.IngredientId)
        )).Distinct().ToHashSet();

        var batchIngredientIds = batches.Select(x => x.IngredientId).Distinct().ToHashSet();

        var allUnits = await _unitRepository.GetListAsync();

        var dtos = ingredients.Select(ing =>
        {
            var dto = _ingredientMapper.Map(ing);
            var ingBatches = batches.Where(x => x.IngredientId == ing.Id).ToList();

            dto.CurrentStock = ingBatches
                .Where(x => x.RemainingQuantity > 0 && x.ExpiryDate.Date >= today)
                .Sum(x => x.RemainingQuantity);

            dto.ExpiredStock = ingBatches
                .Where(x => x.RemainingQuantity > 0 && x.ExpiryDate.Date < today)
                .Sum(x => x.RemainingQuantity);

            dto.CanEditUnit = !usedInRecipeIds.Contains(ing.Id) && !batchIngredientIds.Contains(ing.Id);

            var matchingUnit = allUnits.FirstOrDefault(u =>
                string.Equals(u.Name, ing.BaseUnit, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(u.Abbreviation, ing.BaseUnit, StringComparison.OrdinalIgnoreCase));
            if (matchingUnit != null)
            {
                dto.UnitId = matchingUnit.Id;
            }
            return dto;
        }).ToList();

        return new PagedResultDto<IngredientDto>(totalCount, dtos);
    }

    [Authorize(TooHungryPermissions.Ingredients.Create)]
    public virtual async Task<IngredientDto> CreateAsync(CreateIngredientDto input)
    {
        Check.NotNullOrWhiteSpace(input.Name, nameof(input.Name));

        if (string.IsNullOrWhiteSpace(input.BaseUnit) && input.UnitId.HasValue)
        {
            var unit = await _unitRepository.FindAsync(input.UnitId.Value);
            if (unit != null)
            {
                input.BaseUnit = unit.Name;
            }
        }

        Check.NotNullOrWhiteSpace(input.BaseUnit, nameof(input.BaseUnit));

        var ingredient = await _ingredientManager.CreateAsync(
            input.Name,
            input.BaseUnit,
            input.MinStock,
            input.EstimatedPrice,
            input.StorageType,
            input.ConsumptionMethod
        );

        var inserted = await _ingredientRepository.InsertAsync(ingredient, autoSave: true);
        var res = _ingredientMapper.Map(inserted);
        res.UnitId = input.UnitId;
        res.CanEditUnit = true;
        return res;
    }

    [Authorize(TooHungryPermissions.Ingredients.Edit)]
    public virtual async Task<IngredientDto> UpdateAsync(Guid id, UpdateIngredientDto input)
    {
        if (string.IsNullOrWhiteSpace(input.BaseUnit) && input.UnitId.HasValue)
        {
            var unit = await _unitRepository.FindAsync(input.UnitId.Value);
            if (unit != null)
            {
                input.BaseUnit = unit.Name;
            }
        }

        Check.NotNullOrWhiteSpace(input.Name, nameof(input.Name));
        Check.NotNullOrWhiteSpace(input.BaseUnit, nameof(input.BaseUnit));

        var ingredient = await _ingredientRepository.GetAsync(id);

        if (!string.Equals(ingredient.BaseUnit?.Trim(), input.BaseUnit.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            await _ingredientManager.CheckCanChangeUnitAsync(id);
        }

        if (!string.Equals(ingredient.Name?.Trim(), input.Name.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            await _ingredientManager.CheckNameAsync(input.Name, id);
        }

        ingredient.Update(
            input.Name,
            input.BaseUnit,
            input.MinStock,
            input.EstimatedPrice,
            input.StorageType,
            input.ConsumptionMethod
        );

        await _ingredientRepository.UpdateAsync(ingredient, autoSave: true);
        return await GetAsync(id);
    }

    [Authorize(TooHungryPermissions.Ingredients.Edit)]
    public virtual async Task<IngredientDto> SmartRestoreAsync(Guid id, SmartRestoreDto input)
    {
        var ingredient = await _ingredientRepository.GetAsync(id);
        ingredient.Restore(input.NewMinStock);

        await _ingredientRepository.UpdateAsync(ingredient, autoSave: true);
        return await GetAsync(id);
    }

    [Authorize(TooHungryPermissions.Inventories.Edit)]
    public virtual async Task<IngredientDto> DeactivateAsync(Guid id, string reason)
    {
        Check.NotNullOrWhiteSpace(reason, nameof(reason));
        await _ingredientManager.DeactivateAsync(id, reason);
        return await GetAsync(id);
    }

    [Authorize(TooHungryPermissions.Inventories.Edit)]
    public virtual async Task<IngredientDto> ReactivateAsync(Guid id)
    {
        await _ingredientManager.ReactivateAsync(id);
        return await GetAsync(id);
    }

    [Authorize(TooHungryPermissions.Ingredients.Delete)]
    public virtual async Task DeleteAsync(Guid id)
    {
        await _ingredientManager.CheckCanDeleteAsync(id);
        await _ingredientRepository.DeleteAsync(id);
    }
}
