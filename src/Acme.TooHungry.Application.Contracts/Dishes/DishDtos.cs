using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Dishes;

#region Dish
public class DishDto : AuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public float Price { get; set; }
    public string? ImageUrl { get; set; }
    public Guid? DishCategoryId { get; set; }
    public string? DishCategoryName { get; set; }
}

public class CreateUpdateDishDto
{
    [Required]
    [StringLength(128)]
    public string Name { get; set; } = string.Empty;

    [StringLength(512)]
    public string? Description { get; set; }

    [Required]
    public float Price { get; set; }

    [StringLength(1024)]
    public string? ImageUrl { get; set; }

    public Guid? DishCategoryId { get; set; }
}

public class GetDishesInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
    public Guid? DishCategoryId { get; set; }
}
#endregion

#region DishCategory
public class DishCategoryDto : AuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateUpdateDishCategoryDto
{
    [Required]
    [StringLength(128)]
    public string Name { get; set; } = string.Empty;

    [StringLength(512)]
    public string? Description { get; set; }
}
#endregion

#region Recipe & RecipeIngredient
public class RecipeIngredientDto : EntityDto<Guid>
{
    public Guid RecipeId { get; set; }
    public Guid IngredientId { get; set; }
    public string? IngredientName { get; set; }
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
}

public class CreateUpdateRecipeIngredientDto
{
    [Required]
    public Guid IngredientId { get; set; }
    public decimal Quantity { get; set; }
    [StringLength(256)]
    public string? Note { get; set; }
}

public class RecipeDto : AuditedEntityDto<Guid>
{
    public Guid DishId { get; set; }
    public string? DishName { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public List<RecipeIngredientDto> RecipeIngredients { get; set; } = new();
}

public class CreateUpdateRecipeDto
{
    [Required]
    public Guid DishId { get; set; }

    [Required]
    [StringLength(128)]
    public string Name { get; set; } = string.Empty;

    [StringLength(512)]
    public string? Description { get; set; }

    public string? Instructions { get; set; }

    public List<CreateUpdateRecipeIngredientDto> RecipeIngredients { get; set; } = new();
}
#endregion
