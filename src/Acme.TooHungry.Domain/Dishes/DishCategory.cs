using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Dishes;

public class DishCategory : FullAuditedAggregateRoot<Guid>
{
    public DishCategory()
    {
    }

    public DishCategory(Guid id) : base(id)
    {
    }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int DisplayOrder { get; set; } = 0;

    public ICollection<Dish> Dishes { get; set; } = new List<Dish>();
}
