using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Recipes;

public class RecipeIngredientDto : EntityDto<Guid>
{
    public Guid RecipeId { get; set; }

    public Guid IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public string BaseUnit { get; set; } = string.Empty;

    public decimal EstimatedPrice { get; set; }

    public decimal Quantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    public Guid? RecipeUnitId { get; set; }

    public decimal ConversionFactor { get; set; }

    public decimal BaseQuantity { get; set; }

    public decimal ItemEstimatedCost { get; set; }

    public bool IsActive { get; set; }

    public bool IsIngredientActive { get; set; }
}

public class CreateRecipeIngredientDto
{
    public Guid IngredientId { get; set; }

    public decimal Quantity { get; set; }

    public string? Unit { get; set; }

    public Guid? RecipeUnitId { get; set; }

    public decimal ConversionFactor { get; set; } = 1.0m;
}

public class RecipeDto : FullAuditedEntityDto<Guid>
{
    public Guid DishId { get; set; }

    public string DishName { get; set; } = string.Empty;

    public decimal DishPrice { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int Version { get; set; }

    public bool IsActive { get; set; }

    public string? DeactivationReason { get; set; }

    public decimal TotalEstimatedCost { get; set; }

    public decimal FoodCostPercentage { get; set; }

    public bool HasDeactivatedIngredients { get; set; }

    public List<RecipeIngredientDto> Ingredients { get; set; } = new();
}

public class CreateRecipeDto
{
    public Guid DishId { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public List<CreateRecipeIngredientDto> Ingredients { get; set; } = new();
}

public class UpdateRecipeDto
{
    public string? Name { get; set; }

    public string? Description { get; set; }

    public List<CreateRecipeIngredientDto> Ingredients { get; set; } = new();
}

public class CreateOrUpdateRecipeDto
{
    public Guid DishId { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public List<CreateRecipeIngredientDto> Ingredients { get; set; } = new();
}

public class RecipeFilterDto : PagedAndSortedResultRequestDto
{
    public Guid? DishId { get; set; }

    public Guid? DishCategoryId { get; set; }

    public bool? IsActive { get; set; }

    public string? Filter { get; set; }
}
