using System;
using System.ComponentModel.DataAnnotations;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Units;

public class UnitDto : AuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string Abbreviation { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class CreateUpdateUnitDto
{
    [Required]
    [StringLength(64)]
    public string Name { get; set; } = string.Empty;

    [StringLength(16)]
    public string? Abbreviation { get; set; }

    public bool IsActive { get; set; } = true;
}
