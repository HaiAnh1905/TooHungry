using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.DailyMenus;

public class DailyMenu : FullAuditedAggregateRoot<Guid>
{
    public DateTime Date { get; set; }

    public string? Name { get; set; }

    public bool IsActive { get; set; } = true;

    public string? Note { get; set; }

    public ICollection<DailyMenuItem> Items { get; set; } = new List<DailyMenuItem>();
}
