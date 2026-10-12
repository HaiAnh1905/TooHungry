using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Forecasts;

public class DemandForecastItemDto : EntityDto<Guid>
{
    public Guid DemandForecastId { get; set; }
    public Guid DishId { get; set; }
    public string? DishName { get; set; }
    public decimal ForecastQuantity { get; set; }
}

public class CreateUpdateDemandForecastItemDto
{
    public Guid DishId { get; set; }
    public decimal ForecastQuantity { get; set; }
}

public class DemandForecastDto : AuditedEntityDto<Guid>
{
    public DateTime ForecastDate { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Note { get; set; }
    public List<DemandForecastItemDto> Items { get; set; } = new();
}

public class CreateUpdateDemandForecastDto
{
    public DateTime ForecastDate { get; set; } = DateTime.Now;
    public DateTime StartDate { get; set; } = DateTime.Now;
    public DateTime EndDate { get; set; } = DateTime.Now.AddDays(7);
    public string? Note { get; set; }
    public List<CreateUpdateDemandForecastItemDto> Items { get; set; } = new();
}
