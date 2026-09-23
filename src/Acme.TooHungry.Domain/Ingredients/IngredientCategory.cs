using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Ingredients;

public class IngredientCategory : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ICollection<Ingredient> Ingredients { get; set; } = new List<Ingredient>();
}
