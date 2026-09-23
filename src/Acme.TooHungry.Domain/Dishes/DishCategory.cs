using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Dishes;

public class DishCategory : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ICollection<Dish> Dishes { get; set; } = new List<Dish>();
}
