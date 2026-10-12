using System;
using Acme.TooHungry.Ingredients;
using Volo.Abp;
using Volo.Abp.Domain.Entities;

namespace Acme.TooHungry.Recipes;

public class RecipeIngredient : Entity<Guid>
{
    public Guid RecipeId { get; set; }

    public Guid IngredientId { get; set; }

    public decimal Quantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    public Guid? RecipeUnitId { get; set; }

    public decimal ConversionFactor { get; set; } = 1.0m;

    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Recipe? Recipe { get; set; }

    public Ingredient? Ingredient { get; set; }

    public RecipeIngredient()
    {
    }

    public RecipeIngredient(
        Guid id,
        Guid recipeId,
        Guid ingredientId,
        decimal quantity,
        string unit,
        decimal conversionFactor = 1.0m,
        Guid? recipeUnitId = null,
        bool isActive = true)
        : base(id)
    {
        RecipeId = recipeId;
        IngredientId = ingredientId;
        SetQuantity(quantity);
        SetUnit(unit);
        SetConversionFactor(conversionFactor);
        RecipeUnitId = recipeUnitId;
        IsActive = isActive;
    }

    public void SetQuantity(decimal quantity)
    {
        if (quantity <= 0)
        {
            throw new BusinessException("RecipeIngredient:QuantityMustBePositive");
        }
        Quantity = quantity;
    }

    public void SetUnit(string unit)
    {
        Check.NotNullOrWhiteSpace(unit, nameof(unit));
        Unit = unit.Trim();
    }

    public void SetConversionFactor(decimal conversionFactor)
    {
        if (conversionFactor <= 0)
        {
            throw new BusinessException("RecipeIngredient:ConversionFactorMustBePositive");
        }
        ConversionFactor = conversionFactor;
    }

    public decimal CalculateBaseQuantity()
    {
        return Quantity * ConversionFactor;
    }
}
