using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Forecasts;

public interface IDemandForecastAppService : IApplicationService
{
    Task<DemandForecastDto> GetAsync(Guid id);
    Task<PagedResultDto<DemandForecastDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DemandForecastDto> CreateAsync(CreateUpdateDemandForecastDto input);
    Task<DemandForecastDto> UpdateAsync(Guid id, CreateUpdateDemandForecastDto input);
    Task DeleteAsync(Guid id);
}

public interface IIngredientPlanAppService : IApplicationService
{
    Task<IngredientPlanDto> GetAsync(Guid id);
    Task<PagedResultDto<IngredientPlanDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<IngredientPlanDto> CreateAsync(CreateUpdateIngredientPlanDto input);
    Task<IngredientPlanDto> UpdateAsync(Guid id, CreateUpdateIngredientPlanDto input);
    Task DeleteAsync(Guid id);
}
