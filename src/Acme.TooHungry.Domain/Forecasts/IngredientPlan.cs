using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Forecasts;

public class IngredientPlan : FullAuditedAggregateRoot<Guid>
{
    public Guid DemandForecastId { get; set; }

    public DemandForecast? DemandForecast { get; set; }

    public DateTime PlanDate { get; set; } = DateTime.Now;

    public PlanStatus Status { get; set; } = PlanStatus.Draft;

    public string? Note { get; set; }

    public ICollection<IngredientPlanItem> Items { get; set; } = new List<IngredientPlanItem>();

    public IngredientPlan()
    {
    }

    public IngredientPlan(Guid id) : base(id)
    {
    }

    public IngredientPlan(
        Guid id,
        Guid demandForecastId,
        DateTime planDate,
        PlanStatus status = PlanStatus.Draft,
        string? note = null)
        : base(id)
    {
        DemandForecastId = demandForecastId;
        PlanDate = planDate;
        Status = status;
        Note = note;
    }
}
