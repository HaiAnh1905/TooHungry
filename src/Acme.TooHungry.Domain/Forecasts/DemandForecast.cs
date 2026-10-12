using System;
using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Forecasts;

public class DemandForecast : FullAuditedAggregateRoot<Guid>
{
    public DateTime ForecastDate { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public string? Note { get; set; }

    public ICollection<DemandForecastItem> Items { get; set; } = new List<DemandForecastItem>();
}
