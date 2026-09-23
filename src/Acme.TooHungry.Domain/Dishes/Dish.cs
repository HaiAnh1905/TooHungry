using System;
using System.Collections.Generic;
using Acme.TooHungry.DailyMenus;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Dishes;

public class Dish : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public float Price { get; set; }
 
    public string? ImageUrl { get; set; }
 
    public Guid? DishCategoryId { get; set; }

    public DishCategory? DishCategory { get; set; }

    public Recipe? Recipe { get; set; }

    public ICollection<DailyMenuItem> DailyMenuItems { get; set; } = new List<DailyMenuItem>();
}

