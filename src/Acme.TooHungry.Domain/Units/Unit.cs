using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Units;

public class Unit : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string Abbreviation { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
