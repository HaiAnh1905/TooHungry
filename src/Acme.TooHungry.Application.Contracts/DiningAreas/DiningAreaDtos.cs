using System;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.DiningAreas;

public class DiningAreaDto : FullAuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public int TableCount { get; set; }
}

public class CreateUpdateDiningAreaDto
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}

public class GetDiningAreasInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }

    public bool? IsActive { get; set; }
}
