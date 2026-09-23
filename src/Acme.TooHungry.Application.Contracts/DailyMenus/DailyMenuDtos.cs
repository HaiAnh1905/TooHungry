using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.DailyMenus;

public class DailyMenuItemDto : EntityDto<Guid>
{
    public Guid DailyMenuId { get; set; }
    public Guid DishId { get; set; }
    public string? DishName { get; set; }
    public float? DishPrice { get; set; }
    public float? SpecialPrice { get; set; }
    public int? QuantityLimit { get; set; }
    public string? Note { get; set; }
}

public class CreateUpdateDailyMenuItemDto
{
    [Required]
    public Guid DishId { get; set; }
    public float? SpecialPrice { get; set; }
    public int? QuantityLimit { get; set; }
    [StringLength(256)]
    public string? Note { get; set; }
}

public class DailyMenuDto : AuditedEntityDto<Guid>
{
    public DateTime Date { get; set; }
    public string? Name { get; set; }
    public bool IsActive { get; set; }
    public string? Note { get; set; }
    public List<DailyMenuItemDto> Items { get; set; } = new();
}

public class CreateUpdateDailyMenuDto
{
    [Required]
    public DateTime Date { get; set; } = DateTime.Today;

    [StringLength(128)]
    public string? Name { get; set; }

    public bool IsActive { get; set; } = true;

    [StringLength(512)]
    public string? Note { get; set; }

    public List<CreateUpdateDailyMenuItemDto> Items { get; set; } = new();
}
