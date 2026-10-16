using System;
using System.Threading.Tasks;
using Acme.TooHungry.Forecasts;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app")]
public class ForecastController : TooHungryController
{
    private readonly IDemandForecastAppService _demandForecastAppService;
    private readonly IIngredientPlanAppService _ingredientPlanAppService;

    public ForecastController(
        IDemandForecastAppService demandForecastAppService,
        IIngredientPlanAppService ingredientPlanAppService)
    {
        _demandForecastAppService = demandForecastAppService;
        _ingredientPlanAppService = ingredientPlanAppService;
    }

    [HttpPost("demand-forecast/generate")]
    [Authorize(TooHungryPermissions.Forecasts.Create)]
    public virtual Task<GenerateForecastResultDto> GenerateForecastAsync([FromBody] GenerateForecastInputDto input)
    {
        return _demandForecastAppService.GenerateForecastAsync(input);
    }

    [HttpPost("demand-forecast")]
    [Authorize(TooHungryPermissions.Forecasts.Create)]
    public virtual Task<DemandForecastDto> CreateAsync([FromBody] CreateUpdateDemandForecastDto input)
    {
        return _demandForecastAppService.CreateAsync(input);
    }

    [HttpPut("demand-forecast/{id:guid}")]
    [Authorize(TooHungryPermissions.Forecasts.Edit)]
    public virtual Task<DemandForecastDto> UpdateAsync(Guid id, [FromBody] CreateUpdateDemandForecastDto input)
    {
        return _demandForecastAppService.UpdateAsync(id, input);
    }

    [HttpGet("demand-forecast/{id:guid}")]
    [Authorize(TooHungryPermissions.Forecasts.Default)]
    public virtual Task<DemandForecastDto> GetAsync(Guid id)
    {
        return _demandForecastAppService.GetAsync(id);
    }

    [HttpGet("demand-forecast")]
    [Authorize(TooHungryPermissions.Forecasts.Default)]
    public virtual Task<PagedResultDto<DemandForecastDto>> GetListAsync([FromQuery] DemandForecastFilterDto input)
    {
        return _demandForecastAppService.GetListAsync(input);
    }

    [HttpDelete("demand-forecast/{id:guid}")]
    [Authorize(TooHungryPermissions.Forecasts.Delete)]
    public virtual Task DeleteAsync(Guid id)
    {
        return _demandForecastAppService.DeleteAsync(id);
    }

    [HttpGet("demand-forecast/{id:guid}/financial-summary")]
    [Authorize(TooHungryPermissions.Forecasts.Default)]
    public virtual Task<ForecastFinancialSummaryDto> GetFinancialSummaryAsync(Guid id)
    {
        return _demandForecastAppService.GetFinancialSummaryAsync(id);
    }

    [HttpGet("ingredient-plan/by-forecast/{demandForecastId:guid}")]
    [Authorize(TooHungryPermissions.Forecasts.Default)]
    public virtual Task<IngredientPlanDto?> GetIngredientPlanByForecastIdAsync(Guid demandForecastId)
    {
        return _ingredientPlanAppService.GetByForecastIdAsync(demandForecastId);
    }

    [HttpPut("ingredient-plan/{id:guid}/status")]
    [Authorize(TooHungryPermissions.Forecasts.Approve)]
    public virtual Task<IngredientPlanDto> UpdateIngredientPlanStatusAsync(Guid id, [FromBody] UpdatePlanStatusDto input)
    {
        return _ingredientPlanAppService.UpdateStatusAsync(id, input);
    }
}
