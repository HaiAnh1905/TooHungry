using System;
using System.Collections.Generic;
using Acme.TooHungry.DailyMenus;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Dishes;

public class Dish : FullAuditedAggregateRoot<Guid>
{
    public Dish()
    {
    }

    public Dish(Guid id) : base(id)
    {
    }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }
 
    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public string? DeletionReason { get; set; }
 
    public Guid? DishCategoryId { get; set; }

    public DishCategory? DishCategory { get; set; }

    public ICollection<DailyMenuItem> DailyMenuItems { get; set; } = new List<DailyMenuItem>();

    public void Deactivate(string reason)
    {
        Volo.Abp.Check.NotNullOrWhiteSpace(reason, nameof(reason));
        IsActive = false;
        DeletionReason = reason.Trim();
    }

    public void Reactivate()
    {
        IsActive = true;
        DeletionReason = null;
    }
}

