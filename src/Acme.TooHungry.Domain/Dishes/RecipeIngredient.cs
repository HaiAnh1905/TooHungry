using System;
using Acme.TooHungry.Ingredients;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Dishes;

public class RecipeIngredient : FullAuditedEntity<Guid>
{
    public RecipeIngredient()
    {
    }

    public RecipeIngredient(Guid id) : base(id)
    {
    }

    public Guid RecipeId { get; set; }

    public Recipe? Recipe { get; set; }

    public Guid IngredientId { get; set; }

    public Ingredient? Ingredient { get; set; }

    public decimal Quantity { get; set; }

    public string? Note { get; set; }
}
