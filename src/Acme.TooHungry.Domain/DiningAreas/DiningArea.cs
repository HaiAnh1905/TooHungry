using System;
using System.Collections.Generic;
using Acme.TooHungry.Tables;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.DiningAreas;

public class DiningArea : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ICollection<RestaurantTable> Tables { get; set; } = new List<RestaurantTable>();
}
