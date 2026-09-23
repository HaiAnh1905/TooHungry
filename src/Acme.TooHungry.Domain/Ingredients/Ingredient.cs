using System;
using System.Collections.Generic;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Inventories;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Ingredients;

public class Ingredient : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public Guid UnitId { get; set; }

    public Unit? Unit { get; set; }

    public Guid IngredientCategoryId { get; set; }

    public IngredientCategory? IngredientCategory { get; set; }

    public Inventory? Inventory { get; set; }

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}
