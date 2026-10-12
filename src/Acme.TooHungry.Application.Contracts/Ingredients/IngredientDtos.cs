using System;
using System.ComponentModel.DataAnnotations;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Ingredients;

public class IngredientDto : FullAuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string BaseUnit { get; set; } = string.Empty;

    public string UnitName => BaseUnit;

    public Guid? UnitId { get; set; }

    public decimal MinStock { get; set; }

    public decimal EstimatedPrice { get; set; }

    public StorageType StorageType { get; set; }

    public ConsumptionMethod ConsumptionMethod { get; set; }

    public decimal CurrentStock { get; set; }

    public decimal ExpiredStock { get; set; }

    public bool CanEditUnit { get; set; } = true;

    public bool IsActive { get; set; }

    public string? DeactivationReason { get; set; }
}

public class CreateIngredientDto
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(32)]
    public string BaseUnit { get; set; } = string.Empty;

    public Guid? UnitId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal MinStock { get; set; } = 0;

    [Range(0, double.MaxValue)]
    public decimal EstimatedPrice { get; set; } = 0;

    public StorageType StorageType { get; set; } = StorageType.SHORT_TERM;

    public ConsumptionMethod ConsumptionMethod { get; set; } = ConsumptionMethod.RECIPE;
}

public class UpdateIngredientDto
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(32)]
    public string BaseUnit { get; set; } = string.Empty;

    public Guid? UnitId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal MinStock { get; set; }

    [Range(0, double.MaxValue)]
    public decimal EstimatedPrice { get; set; }

    public StorageType StorageType { get; set; }

    public ConsumptionMethod ConsumptionMethod { get; set; }
}

public class GetIngredientsInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }

    public StorageType? StorageType { get; set; }

    public ConsumptionMethod? ConsumptionMethod { get; set; }

    public bool? IsActive { get; set; }
}

public class SmartRestoreDto
{
    [Range(0, double.MaxValue)]
    public decimal NewMinStock { get; set; }
}
