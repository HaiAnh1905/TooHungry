using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Forecasts;

public interface IDemandForecastAppService : IApplicationService
{
    Task<DemandForecastDto> GetAsync(Guid id);
    Task<PagedResultDto<DemandForecastDto>> GetListAsync(DemandForecastFilterDto input);
    Task<DemandForecastDto> CreateAsync(CreateUpdateDemandForecastDto input);
    Task<DemandForecastDto> UpdateAsync(Guid id, CreateUpdateDemandForecastDto input);
    Task DeleteAsync(Guid id);
    Task<GenerateForecastResultDto> GenerateForecastAsync(GenerateForecastInputDto input);
    Task<ForecastFinancialSummaryDto> GetFinancialSummaryAsync(Guid id);
}

public interface IIngredientPlanAppService : IApplicationService
{
    Task<IngredientPlanDto?> GetByForecastIdAsync(Guid demandForecastId);
    Task<IngredientPlanDto> UpdateStatusAsync(Guid id, UpdatePlanStatusDto input);
}
