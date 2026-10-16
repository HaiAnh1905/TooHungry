using System;
using System.Collections.Generic;
using System.Linq;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Forecasts;

public class DemandForecastItemDto : EntityDto<Guid>
{
    public Guid DemandForecastId { get; set; }
    public Guid DishId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string? DishImageUrl { get; set; }
    public decimal DishPrice { get; set; }
    public int ForecastQuantity { get; set; }
    public decimal TotalAmount => ForecastQuantity * DishPrice;
    public bool HasRecipe { get; set; }
    public string? Note { get; set; }
}

public class CreateUpdateDemandForecastItemDto
{
    public Guid DishId { get; set; }
    public int ForecastQuantity { get; set; }
    public string? Note { get; set; }
}

public class DemandForecastDto : FullAuditedEntityDto<Guid>
{
    public DateTime ForecastDate { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Note { get; set; }
    public List<DemandForecastItemDto> Items { get; set; } = new();

    public int TotalDishes => Items?.Count ?? 0;
    public int TotalQuantity => Items?.Sum(x => x.ForecastQuantity) ?? 0;
    public decimal ProjectedRevenue { get; set; }
    public Guid? IngredientPlanId { get; set; }
    public PlanStatus? IngredientPlanStatus { get; set; }
}

public class CreateUpdateDemandForecastDto
{
    public DateTime ForecastDate { get; set; } = DateTime.Now;
    public DateTime StartDate { get; set; } = DateTime.Now;
    public DateTime EndDate { get; set; } = DateTime.Now.AddDays(7);
    public string? Note { get; set; }
    public List<CreateUpdateDemandForecastItemDto> Items { get; set; } = new();
}

public class DemandForecastFilterDto : PagedAndSortedResultRequestDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Filter { get; set; }
}

public class GenerateForecastInputDto
{
    public DateTime StartDate { get; set; } = DateTime.Now;
    public DateTime EndDate { get; set; } = DateTime.Now.AddDays(7);
    public int HistoryDays { get; set; } = 7;
}

public class GenerateForecastResultDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int AnalysisDays { get; set; }
    public List<DemandForecastItemDto> SuggestedItems { get; set; } = new();
    public ForecastFinancialSummaryDto FinancialSummary { get; set; } = new();
}

public class IngredientPlanDto : FullAuditedEntityDto<Guid>
{
    public Guid DemandForecastId { get; set; }
    public DateTime PlanDate { get; set; }
    public PlanStatus Status { get; set; }
    public string? Note { get; set; }
    public List<IngredientPlanItemDto> Items { get; set; } = new();
}

public class IngredientPlanItemDto : EntityDto<Guid>
{
    public Guid IngredientPlanId { get; set; }
    public Guid IngredientId { get; set; }
    public string IngredientName { get; set; } = string.Empty;
    public string BaseUnit { get; set; } = string.Empty;
    public decimal RequiredQuantity { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal SuggestedPurchaseQuantity { get; set; }
    public decimal EstimatedPrice { get; set; }
    public decimal EstimatedCost { get; set; }
    public string? Note { get; set; }
}

public class UpdatePlanStatusDto
{
    public PlanStatus Status { get; set; }
}

public class ForecastFinancialSummaryDto
{
    public decimal ProjectedRevenue { get; set; }
    public decimal ProjectedIngredientCost { get; set; }
    public decimal FoodCostPercentage { get; set; }
    public decimal ProjectedPurchaseBudget { get; set; }
}
