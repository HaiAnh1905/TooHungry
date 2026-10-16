using System;
using Acme.TooHungry.Dishes;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Forecasts;

public class DemandForecastItem : FullAuditedEntity<Guid>
{
    public DemandForecastItem()
    {
    }

    public DemandForecastItem(Guid id) : base(id)
    {
    }

    public Guid DemandForecastId { get; set; }

    public DemandForecast? DemandForecast { get; set; }

    public Guid DishId { get; set; }

    public Dish? Dish { get; set; }

    public int ForecastQuantity { get; set; }

    public string? Note { get; set; }
}
