using System;
using System.Collections.Generic;
using System.Linq;
using Acme.TooHungry.Dishes;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Recipes;

public class Recipe : FullAuditedAggregateRoot<Guid>
{
    public Guid DishId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int Version { get; set; } = 1;

    public bool IsActive { get; set; } = true;

    public string? DeactivationReason { get; set; }

    // Navigation properties
    public Dish? Dish { get; set; }

    public ICollection<RecipeIngredient> Ingredients { get; set; } = new List<RecipeIngredient>();

    public Recipe()
    {
    }

    public Recipe(
        Guid id,
        Guid dishId,
        string name,
        string? description = null,
        int version = 1,
        bool isActive = true)
        : base(id)
    {
        DishId = dishId;
        SetName(name);
        Description = description;
        Version = version > 0 ? version : 1;
        IsActive = isActive;
    }

    public void SetName(string name)
    {
        Check.NotNullOrWhiteSpace(name, nameof(name));
        Check.Length(name, nameof(name), 256);
        Name = name.Trim();
    }

    public RecipeIngredient AddIngredient(
        Guid id,
        Guid ingredientId,
        decimal quantity,
        string unit,
        decimal conversionFactor = 1.0m,
        Guid? recipeUnitId = null)
    {
        var existing = Ingredients.FirstOrDefault(x => x.IngredientId == ingredientId);
        if (existing != null)
        {
            existing.SetQuantity(quantity);
            existing.SetUnit(unit);
            existing.SetConversionFactor(conversionFactor);
            if (recipeUnitId.HasValue)
            {
                existing.RecipeUnitId = recipeUnitId;
            }
            existing.IsActive = true;
            return existing;
        }

        var item = new RecipeIngredient(id, Id, ingredientId, quantity, unit, conversionFactor, recipeUnitId);
        Ingredients.Add(item);
        return item;
    }

    public void RemoveIngredient(Guid ingredientId)
    {
        var item = Ingredients.FirstOrDefault(x => x.IngredientId == ingredientId);
        if (item != null)
        {
            Ingredients.Remove(item);
        }
    }

    public void BumpVersion()
    {
        Version += 1;
    }

    public void Deactivate(string reason)
    {
        Check.NotNullOrWhiteSpace(reason, nameof(reason));
        Check.Length(reason, nameof(reason), 512);
        IsActive = false;
        DeactivationReason = reason.Trim();
    }

    public void Reactivate()
    {
        IsActive = true;
        DeactivationReason = null;
    }
}
