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
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public string? DeletionReason { get; set; }
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
    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    [StringLength(1024)]
    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid? DishCategoryId { get; set; }
}

public class DeleteDishDto
{
    [Required]
    [StringLength(256)]
    public string DeletionReason { get; set; } = string.Empty;
}

public class GetDishesInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
    public Guid? DishCategoryId { get; set; }
    public bool? IsActive { get; set; }
}

public class BulkToggleActiveDishDto
{
    [Required]
    public List<Guid> DishIds { get; set; } = new();

    public bool IsActive { get; set; }
}

public class BulkActionResultDto
{
    public bool Success { get; set; } = true;
    public int UpdatedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
#endregion

#region DishCategory
public class DishCategoryDto : AuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; } = 0;
}

public class CreateUpdateDishCategoryDto
{
    [Required]
    [StringLength(128)]
    public string Name { get; set; } = string.Empty;

    [StringLength(512)]
    public string? Description { get; set; }

    public int DisplayOrder { get; set; } = 0;
}
#endregion
