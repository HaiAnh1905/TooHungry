using System;
using Acme.TooHungry.Ingredients;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Forecasts;

public class IngredientPlanItem : FullAuditedEntity<Guid>
{
    public Guid IngredientPlanId { get; set; }

    public IngredientPlan? IngredientPlan { get; set; }

    public Guid IngredientId { get; set; }

    public Ingredient? Ingredient { get; set; }

    public decimal RequiredQuantity { get; set; }

    public string? Note { get; set; }
}
