using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Forecasts;

[RemoteService(IsEnabled = false)]
[Authorize(TooHungryPermissions.Forecasts.Default)]
public class IngredientPlanAppService : ApplicationService, IIngredientPlanAppService
{
    private readonly IRepository<IngredientPlan, Guid> _ingredientPlanRepository;
    private readonly IRepository<InventoryBatch, Guid> _inventoryBatchRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    public IngredientPlanAppService(
        IRepository<IngredientPlan, Guid> ingredientPlanRepository,
        IRepository<InventoryBatch, Guid> inventoryBatchRepository,
        IRepository<Ingredient, Guid> ingredientRepository)
    {
        _ingredientPlanRepository = ingredientPlanRepository;
        _inventoryBatchRepository = inventoryBatchRepository;
        _ingredientRepository = ingredientRepository;
    }

    /// <summary>
    /// Lấy kế hoạch nguyên liệu theo Id bản dự báo, đối soát tồn kho khả dụng và tính toán số lượng gợi ý mua
    /// </summary>
    public virtual async Task<IngredientPlanDto?> GetByForecastIdAsync(Guid demandForecastId)
    {
        var queryable = await _ingredientPlanRepository.WithDetailsAsync(x => x.Items);
        var plan = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.DemandForecastId == demandForecastId);
        if (plan == null)
        {
            return null;
        }

        var dto = ObjectMapper.Map<IngredientPlan, IngredientPlanDto>(plan);

        if (dto.Items.Count > 0)
        {
            var ingredientIds = dto.Items.Select(x => x.IngredientId).Distinct().ToList();
            var ingredients = await _ingredientRepository.GetListAsync(x => ingredientIds.Contains(x.Id));
            var ingredientMap = ingredients.ToDictionary(x => x.Id);

            var today = Clock.Now.Date;
            var batches = await _inventoryBatchRepository.GetListAsync(
                b => ingredientIds.Contains(b.IngredientId) && b.IsActive && b.RemainingQuantity > 0 && b.ExpiryDate >= today
            );

            var currentStockMap = batches
                .GroupBy(b => b.IngredientId)
                .ToDictionary(g => g.Key, g => g.Sum(b => b.RemainingQuantity));

            foreach (var item in dto.Items)
            {
                if (ingredientMap.TryGetValue(item.IngredientId, out var ing))
                {
                    item.IngredientName = ing.Name;
                    item.BaseUnit = ing.BaseUnit;
                    item.EstimatedPrice = ing.EstimatedPrice;
                }

                var stock = currentStockMap.GetValueOrDefault(item.IngredientId, 0);
                item.CurrentStock = stock;
                item.SuggestedPurchaseQuantity = Math.Max(0, item.RequiredQuantity - stock);
                item.EstimatedCost = item.SuggestedPurchaseQuantity * item.EstimatedPrice;
            }
        }

        return dto;
    }

    /// <summary>
    /// Cập nhật trạng thái kế hoạch nguyên liệu (Draft -> Confirmed -> Executed)
    /// </summary>
    [Authorize(TooHungryPermissions.Forecasts.Approve)]
    public virtual async Task<IngredientPlanDto> UpdateStatusAsync(Guid id, UpdatePlanStatusDto input)
    {
        var plan = await _ingredientPlanRepository.GetAsync(id);

        if (plan.Status == PlanStatus.Executed && input.Status != PlanStatus.Executed)
        {
            throw new BusinessException("TooHungry:Forecast:CannotRevertExecutedPlan");
        }

        plan.Status = input.Status;
        await _ingredientPlanRepository.UpdateAsync(plan, autoSave: true);

        return (await GetByForecastIdAsync(plan.DemandForecastId))!;
    }
}
