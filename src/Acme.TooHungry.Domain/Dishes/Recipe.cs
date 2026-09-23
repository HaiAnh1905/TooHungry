using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Dishes;

public class Recipe : FullAuditedAggregateRoot<Guid>
{
    public Recipe()
    {
    }

    public Recipe(Guid id) : base(id)
    {
    }

    public Guid DishId { get; set; }

    public Dish? Dish { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Instructions { get; set; }

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}
