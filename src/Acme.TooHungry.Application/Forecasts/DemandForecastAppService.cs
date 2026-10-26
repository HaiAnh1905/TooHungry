using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Recipes;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Forecasts;

[RemoteService(IsEnabled = false)]
[Authorize(TooHungryPermissions.Forecasts.Default)]
public class DemandForecastAppService : ApplicationService, IDemandForecastAppService
{
    private readonly IRepository<DemandForecast, Guid> _demandForecastRepository;
    private readonly IRepository<IngredientPlan, Guid> _ingredientPlanRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<InventoryBatch, Guid> _inventoryBatchRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    public DemandForecastAppService(
        IRepository<DemandForecast, Guid> demandForecastRepository,
        IRepository<IngredientPlan, Guid> ingredientPlanRepository,
        IRepository<Dish, Guid> dishRepository,
        IRepository<Recipe, Guid> recipeRepository,
        IRepository<Order, Guid> orderRepository,
        IRepository<InventoryBatch, Guid> inventoryBatchRepository,
        IRepository<Ingredient, Guid> ingredientRepository)
    {
        _demandForecastRepository = demandForecastRepository;
        _ingredientPlanRepository = ingredientPlanRepository;
        _dishRepository = dishRepository;
        _recipeRepository = recipeRepository;
        _orderRepository = orderRepository;
        _inventoryBatchRepository = inventoryBatchRepository;
        _ingredientRepository = ingredientRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một bản dự báo nhu cầu theo Id (kèm danh sách món dự báo và liên kết kế hoạch)
    /// </summary>
    public virtual async Task<DemandForecastDto> GetAsync(Guid id)
    {
        var queryable = await _demandForecastRepository.WithDetailsAsync(x => x.Items);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (entity == null)
        {
            throw new EntityNotFoundException(typeof(DemandForecast), id);
        }

        var dto = ObjectMapper.Map<DemandForecast, DemandForecastDto>(entity);
        await PopulateAdditionalForecastDataAsync(new[] { dto });
        return dto;
    }

    /// <summary>
    /// Lấy danh sách các bản dự báo nhu cầu có phân trang và lọc theo ngày/từ khóa
    /// </summary>
    public virtual async Task<PagedResultDto<DemandForecastDto>> GetListAsync(DemandForecastFilterDto input)
    {
        var queryable = await _demandForecastRepository.WithDetailsAsync(x => x.Items);

        if (input.StartDate.HasValue)
        {
            queryable = queryable.Where(x => x.StartDate >= input.StartDate.Value);
        }

        if (input.EndDate.HasValue)
        {
            queryable = queryable.Where(x => x.EndDate <= input.EndDate.Value);
        }

        if (!input.Filter.IsNullOrWhiteSpace())
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x => x.Note != null && x.Note.ToLower().Contains(filter));
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(DemandForecast.ForecastDate) + " desc" : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<DemandForecast>, List<DemandForecastDto>>(items);

        await PopulateAdditionalForecastDataAsync(dtos);

        return new PagedResultDto<DemandForecastDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tự động tính toán dự báo nhu cầu món ăn dựa trên Trung bình động đơn giản (SMA)
    /// </summary>
    [Authorize(TooHungryPermissions.Forecasts.Create)]
    public virtual async Task<GenerateForecastResultDto> GenerateForecastAsync(GenerateForecastInputDto input)
    {
        if (input.StartDate > input.EndDate)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.ForecastInvalidDateRange);
        }

        var historyDays = input.HistoryDays > 0 ? input.HistoryDays : 7;
        var now = Clock.Now;
        var historyStart = now.AddDays(-historyDays);

        // Lấy các đơn hàng Completed trong khoảng thời gian phân tích
        var orderQuery = await _orderRepository.WithDetailsAsync(x => x.Items);
        var completedOrders = await AsyncExecuter.ToListAsync(
            orderQuery.Where(x => x.Status == OrderStatus.Completed && x.OrderDate >= historyStart && x.OrderDate <= now)
        );

        // Nhóm số lượng bán theo DishId
        var salesByDish = completedOrders
            .SelectMany(x => x.Items)
            .GroupBy(x => x.DishId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

        // Tính số ngày kỳ dự báo N
        var forecastDaysDiff = (input.EndDate.Date - input.StartDate.Date).TotalDays;
        var nDays = Math.Max(1, (int)Math.Ceiling(forecastDaysDiff) + (forecastDaysDiff == 0 ? 1 : 0));

        // Lấy tất cả món ăn đang kích hoạt
        var dishes = await _dishRepository.GetListAsync(x => x.IsActive);
        var dishIds = dishes.Select(x => x.Id).ToList();

        // Kiểm tra công thức đang kích hoạt
        var recipeQuery = await _recipeRepository.WithDetailsAsync(x => x.Ingredients);
        var activeRecipes = await AsyncExecuter.ToListAsync(
            recipeQuery.Where(x => dishIds.Contains(x.DishId) && x.IsActive)
        );
        var recipeDishIds = new HashSet<Guid>(activeRecipes.Select(x => x.DishId));

        // Tối ưu T009: Nạp trước toàn bộ Ingredient map trong bộ nhớ để loại bỏ N+1 query lặp
        var allIngIds = activeRecipes
            .SelectMany(r => r.Ingredients.Where(i => i.IsActive).Select(i => i.IngredientId))
            .Distinct()
            .ToList();
        var allIngredients = allIngIds.Count > 0
            ? await _ingredientRepository.GetListAsync(x => allIngIds.Contains(x.Id))
            : new List<Ingredient>();
        var ingredientMap = allIngredients.ToDictionary(x => x.Id);

        var suggestedItems = new List<DemandForecastItemDto>();
        decimal projectedRevenue = 0;
        decimal projectedIngredientCost = 0;

        foreach (var dish in dishes)
        {
            salesByDish.TryGetValue(dish.Id, out var totalSold);
            var dailyAverage = (decimal)totalSold / historyDays;
            var suggestedQuantity = (int)Math.Ceiling(dailyAverage * nDays);

            var hasRecipe = recipeDishIds.Contains(dish.Id);
            var itemDto = new DemandForecastItemDto
            {
                DishId = dish.Id,
                DishName = dish.Name,
                DishImageUrl = dish.ImageUrl,
                DishPrice = dish.Price,
                ForecastQuantity = suggestedQuantity,
                HasRecipe = hasRecipe,
                Note = totalSold > 0 ? $"SMA {historyDays} ngày: bán {totalSold} phần ({dailyAverage:F1} phần/ngày)" : null
            };

            suggestedItems.Add(itemDto);
            projectedRevenue += suggestedQuantity * dish.Price;

            if (hasRecipe && suggestedQuantity > 0)
            {
                var recipe = activeRecipes.FirstOrDefault(r => r.DishId == dish.Id);
                if (recipe != null)
                {
                    foreach (var ri in recipe.Ingredients.Where(i => i.IsActive))
                    {
                        ingredientMap.TryGetValue(ri.IngredientId, out var ing);
                        var estPrice = ing?.EstimatedPrice ?? 0;
                        var qtyInBase = ri.Quantity * ri.ConversionFactor * suggestedQuantity;
                        projectedIngredientCost += qtyInBase * estPrice;
                    }
                }
            }
        }

        var foodCostPct = projectedRevenue > 0 ? Math.Round((projectedIngredientCost / projectedRevenue) * 100, 2) : 0;

        return new GenerateForecastResultDto
        {
            StartDate = input.StartDate,
            EndDate = input.EndDate,
            AnalysisDays = historyDays,
            SuggestedItems = suggestedItems,
            FinancialSummary = new ForecastFinancialSummaryDto
            {
                ProjectedRevenue = projectedRevenue,
                ProjectedIngredientCost = projectedIngredientCost,
                FoodCostPercentage = foodCostPct,
                ProjectedPurchaseBudget = 0 // Sẽ tính chính xác khi đối chiếu tồn kho thực tế
            }
        };
    }

    /// <summary>
    /// Tạo mới một bản dự báo nhu cầu món ăn đồng thời tự động bóc tách công thức sinh Kế hoạch nguyên liệu
    /// </summary>
    [Authorize(TooHungryPermissions.Forecasts.Create)]
    public virtual async Task<DemandForecastDto> CreateAsync(CreateUpdateDemandForecastDto input)
    {
        if (input.StartDate > input.EndDate)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.ForecastInvalidDateRange);
        }

        if (input.Items != null && input.Items.Any(x => x.ForecastQuantity < 0))
        {
            throw new BusinessException(TooHungryDomainErrorCodes.ForecastNegativeQuantity);
        }

        var forecastId = GuidGenerator.Create();
        var entity = new DemandForecast(forecastId)
        {
            ForecastDate = input.ForecastDate,
            StartDate = input.StartDate,
            EndDate = input.EndDate,
            Note = input.Note
        };

        if (input.Items != null)
        {
            foreach (var itemDto in input.Items)
            {
                entity.Items.Add(new DemandForecastItem(GuidGenerator.Create())
                {
                    DemandForecastId = forecastId,
                    DishId = itemDto.DishId,
                    ForecastQuantity = itemDto.ForecastQuantity,
                    Note = itemDto.Note
                });
            }
        }

        var inserted = await _demandForecastRepository.InsertAsync(entity, autoSave: true);

        // Tự động sinh Kế hoạch nguyên liệu (Recipe Explosion)
        await GenerateAndSaveIngredientPlanAsync(inserted);

        return await GetAsync(inserted.Id);
    }

    /// <summary>
    /// Cập nhật thông tin bản dự báo nhu cầu và tính toán lại kế hoạch nguyên liệu
    /// </summary>
    [Authorize(TooHungryPermissions.Forecasts.Edit)]
    public virtual async Task<DemandForecastDto> UpdateAsync(Guid id, CreateUpdateDemandForecastDto input)
    {
        if (input.StartDate > input.EndDate)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.ForecastInvalidDateRange);
        }

        if (input.Items != null && input.Items.Any(x => x.ForecastQuantity < 0))
        {
            throw new BusinessException(TooHungryDomainErrorCodes.ForecastNegativeQuantity);
        }

        var queryable = await _demandForecastRepository.WithDetailsAsync(x => x.Items);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (entity == null)
        {
            throw new EntityNotFoundException(typeof(DemandForecast), id);
        }

        entity.ForecastDate = input.ForecastDate;
        entity.StartDate = input.StartDate;
        entity.EndDate = input.EndDate;
        entity.Note = input.Note;

        entity.Items.Clear();
        if (input.Items != null && input.Items.Count > 0)
        {
            foreach (var itemDto in input.Items)
            {
                entity.Items.Add(new DemandForecastItem(GuidGenerator.Create())
                {
                    DemandForecastId = id,
                    DishId = itemDto.DishId,
                    ForecastQuantity = itemDto.ForecastQuantity,
                    Note = itemDto.Note
                });
            }
        }

        await _demandForecastRepository.UpdateAsync(entity, autoSave: true);

        // Cập nhật lại kế hoạch nguyên liệu nếu ở trạng thái Draft
        await GenerateAndSaveIngredientPlanAsync(entity);

        return await GetAsync(id);
    }

    /// <summary>
    /// Xóa một bản dự báo nhu cầu khỏi hệ thống (cascade dọn dẹp kế hoạch nguyên liệu liên kết)
    /// </summary>
    [Authorize(TooHungryPermissions.Forecasts.Delete)]
    public virtual async Task DeleteAsync(Guid id)
    {
        var existingPlan = await _ingredientPlanRepository.FirstOrDefaultAsync(x => x.DemandForecastId == id);
        if (existingPlan != null)
        {
            await _ingredientPlanRepository.DeleteAsync(existingPlan, autoSave: true);
        }

        await _demandForecastRepository.DeleteAsync(id, autoSave: true);
    }

    /// <summary>
    /// Lấy báo cáo phân tích tài chính dự toán cho bản dự báo
    /// </summary>
    public virtual async Task<ForecastFinancialSummaryDto> GetFinancialSummaryAsync(Guid id)
    {
        var queryable = await _demandForecastRepository.WithDetailsAsync(x => x.Items);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (entity == null)
        {
            throw new EntityNotFoundException(typeof(DemandForecast), id);
        }

        var distinctDishIds = entity.Items.Select(x => x.DishId).Distinct().ToList();
        var dishes = distinctDishIds.Count > 0
            ? await _dishRepository.GetListAsync(x => distinctDishIds.Contains(x.Id))
            : new List<Dish>();
        var dishMap = dishes.ToDictionary(x => x.Id);

        decimal projectedRevenue = 0;
        foreach (var item in entity.Items)
        {
            if (dishMap.TryGetValue(item.DishId, out var dish))
            {
                projectedRevenue += item.ForecastQuantity * dish.Price;
            }
        }

        // Lấy kế hoạch nguyên liệu tương ứng
        var planQuery = await _ingredientPlanRepository.WithDetailsAsync(x => x.Items);
        var plan = await AsyncExecuter.FirstOrDefaultAsync(planQuery, x => x.DemandForecastId == id);

        decimal projectedIngredientCost = 0;
        decimal projectedPurchaseBudget = 0;

        if (plan != null && plan.Items.Count > 0)
        {
            var ingredientIds = plan.Items.Select(x => x.IngredientId).Distinct().ToList();
            var ingredients = await _ingredientRepository.GetListAsync(x => ingredientIds.Contains(x.Id));
            var ingredientMap = ingredients.ToDictionary(x => x.Id);

            var today = Clock.Now.Date;
            var batches = await _inventoryBatchRepository.GetListAsync(
                b => ingredientIds.Contains(b.IngredientId) && b.IsActive && b.RemainingQuantity > 0 && b.ExpiryDate >= today
            );

            var currentStockMap = batches
                .GroupBy(b => b.IngredientId)
                .ToDictionary(g => g.Key, g => g.Sum(b => b.RemainingQuantity));

            foreach (var item in plan.Items)
            {
                ingredientMap.TryGetValue(item.IngredientId, out var ingredient);
                var estPrice = ingredient?.EstimatedPrice ?? 0;

                projectedIngredientCost += item.RequiredQuantity * estPrice;

                var stock = currentStockMap.GetValueOrDefault(item.IngredientId, 0);
                var needToBuy = Math.Max(0, item.RequiredQuantity - stock);
                projectedPurchaseBudget += needToBuy * estPrice;
            }
        }

        var foodCostPct = projectedRevenue > 0 ? Math.Round((projectedIngredientCost / projectedRevenue) * 100, 2) : 0;

        return new ForecastFinancialSummaryDto
        {
            ProjectedRevenue = projectedRevenue,
            ProjectedIngredientCost = projectedIngredientCost,
            FoodCostPercentage = foodCostPct,
            ProjectedPurchaseBudget = projectedPurchaseBudget
        };
    }

    #region Helper Methods
    private async Task PopulateAdditionalForecastDataAsync(IEnumerable<DemandForecastDto> dtos)
    {
        var dtoList = dtos.ToList();
        if (dtoList.Count == 0) return;

        var allDishIds = dtoList
            .SelectMany(d => d.Items.Select(i => i.DishId))
            .Distinct()
            .ToList();

        var dishMap = new Dictionary<Guid, Dish>();
        if (allDishIds.Count > 0)
        {
            var dishes = await _dishRepository.GetListAsync(x => allDishIds.Contains(x.Id));
            dishMap = dishes.ToDictionary(x => x.Id);
        }

        var recipeQuery = await _recipeRepository.GetQueryableAsync();
        var activeDishRecipes = allDishIds.Count > 0
            ? (await AsyncExecuter.ToListAsync(recipeQuery.Where(r => allDishIds.Contains(r.DishId) && r.IsActive)))
                .Select(r => r.DishId)
                .ToHashSet()
            : new HashSet<Guid>();

        var forecastIds = dtoList.Select(d => d.Id).ToList();
        var plans = await _ingredientPlanRepository.GetListAsync(x => forecastIds.Contains(x.DemandForecastId));
        var planMap = plans.ToDictionary(x => x.DemandForecastId);

        foreach (var dto in dtoList)
        {
            decimal revenue = 0;
            foreach (var item in dto.Items)
            {
                if (dishMap.TryGetValue(item.DishId, out var dish))
                {
                    item.DishName = dish.Name;
                    item.DishImageUrl = dish.ImageUrl;
                    item.DishPrice = dish.Price;
                    item.HasRecipe = activeDishRecipes.Contains(item.DishId);
                    revenue += item.ForecastQuantity * dish.Price;
                }
            }
            dto.ProjectedRevenue = revenue;

            if (planMap.TryGetValue(dto.Id, out var plan))
            {
                dto.IngredientPlanId = plan.Id;
                dto.IngredientPlanStatus = plan.Status;
            }
        }
    }

    private async Task GenerateAndSaveIngredientPlanAsync(DemandForecast forecast)
    {
        var existingPlan = await _ingredientPlanRepository.FirstOrDefaultAsync(x => x.DemandForecastId == forecast.Id);

        // Nếu kế hoạch đã có và không phải Draft thì không ghi đè tự động
        if (existingPlan != null && existingPlan.Status != PlanStatus.Draft)
        {
            return;
        }

        var dishIdsWithQuantity = forecast.Items
            .Where(x => x.ForecastQuantity > 0)
            .GroupBy(x => x.DishId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.ForecastQuantity));

        var recipeQuery = await _recipeRepository.WithDetailsAsync(x => x.Ingredients);
        var activeRecipes = await AsyncExecuter.ToListAsync(
            recipeQuery.Where(x => dishIdsWithQuantity.Keys.Contains(x.DishId) && x.IsActive)
        );

        // Bóc tách định lượng: tổng hợp lượng nguyên liệu cần theo BaseUnit
        var ingredientRequirements = new Dictionary<Guid, decimal>();
        foreach (var recipe in activeRecipes)
        {
            if (dishIdsWithQuantity.TryGetValue(recipe.DishId, out var dishQty))
            {
                foreach (var ri in recipe.Ingredients.Where(i => i.IsActive))
                {
                    var baseAmount = ri.Quantity * ri.ConversionFactor * dishQty;
                    if (ingredientRequirements.ContainsKey(ri.IngredientId))
                    {
                        ingredientRequirements[ri.IngredientId] += baseAmount;
                    }
                    else
                    {
                        ingredientRequirements[ri.IngredientId] = baseAmount;
                    }
                }
            }
        }

        if (existingPlan == null)
        {
            var planId = GuidGenerator.Create();
            var newPlan = new IngredientPlan(planId)
            {
                DemandForecastId = forecast.Id,
                PlanDate = Clock.Now,
                Status = PlanStatus.Draft,
                Note = $"Kế hoạch nguyên liệu cho kỳ {forecast.StartDate:dd/MM/yyyy} - {forecast.EndDate:dd/MM/yyyy}"
            };

            foreach (var kvp in ingredientRequirements)
            {
                newPlan.Items.Add(new IngredientPlanItem(GuidGenerator.Create())
                {
                    IngredientPlanId = planId,
                    IngredientId = kvp.Key,
                    RequiredQuantity = Math.Round(kvp.Value, 4)
                });
            }

            await _ingredientPlanRepository.InsertAsync(newPlan, autoSave: true);
        }
        else
        {
            var planWithItems = await AsyncExecuter.FirstOrDefaultAsync(
                (await _ingredientPlanRepository.WithDetailsAsync(x => x.Items)).Where(x => x.Id == existingPlan.Id)
            );

            if (planWithItems != null)
            {
                planWithItems.Items.Clear();
                foreach (var kvp in ingredientRequirements)
                {
                    planWithItems.Items.Add(new IngredientPlanItem(GuidGenerator.Create())
                    {
                        IngredientPlanId = planWithItems.Id,
                        IngredientId = kvp.Key,
                        RequiredQuantity = Math.Round(kvp.Value, 4)
                    });
                }
                await _ingredientPlanRepository.UpdateAsync(planWithItems, autoSave: true);
            }
        }
    }
    #endregion
}
