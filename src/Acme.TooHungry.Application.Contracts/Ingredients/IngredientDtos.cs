using System;
using System.ComponentModel.DataAnnotations;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Ingredients;

#region Unit
public class UnitDto : AuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Abbreviation { get; set; }
}

public class CreateUpdateUnitDto
{
    [Required]
    [StringLength(64)]
    public string Name { get; set; } = string.Empty;

    [StringLength(16)]
    public string? Abbreviation { get; set; }
}
#endregion

#region IngredientCategory
public class IngredientCategoryDto : AuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateUpdateIngredientCategoryDto
{
    [Required]
    [StringLength(128)]
    public string Name { get; set; } = string.Empty;

    [StringLength(512)]
    public string? Description { get; set; }
}
#endregion

#region Ingredient
public class IngredientDto : AuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public Guid UnitId { get; set; }
    public string? UnitName { get; set; }
    public Guid IngredientCategoryId { get; set; }
    public string? IngredientCategoryName { get; set; }
}

public class CreateUpdateIngredientDto
{
    [Required]
    [StringLength(128)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid UnitId { get; set; }

    [Required]
    public Guid IngredientCategoryId { get; set; }
}
#endregion
