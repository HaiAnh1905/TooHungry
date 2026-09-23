using System;
using Acme.TooHungry.Dishes;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.DailyMenus;

public class DailyMenuItem : FullAuditedEntity<Guid>
{
    public Guid DailyMenuId { get; set; }

    public DailyMenu? DailyMenu { get; set; }

    public Guid DishId { get; set; }

    public Dish? Dish { get; set; }

    public float? SpecialPrice { get; set; }

    public int? QuantityLimit { get; set; }

    public string? Note { get; set; }
}
