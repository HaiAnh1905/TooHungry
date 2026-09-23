using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Ingredients;

public interface IUnitAppService : IApplicationService
{
    Task<UnitDto> GetAsync(Guid id);
    Task<PagedResultDto<UnitDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<UnitDto> CreateAsync(CreateUpdateUnitDto input);
    Task<UnitDto> UpdateAsync(Guid id, CreateUpdateUnitDto input);
    Task DeleteAsync(Guid id);
}

public interface IIngredientCategoryAppService : IApplicationService
{
    Task<IngredientCategoryDto> GetAsync(Guid id);
    Task<PagedResultDto<IngredientCategoryDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<IngredientCategoryDto> CreateAsync(CreateUpdateIngredientCategoryDto input);
    Task<IngredientCategoryDto> UpdateAsync(Guid id, CreateUpdateIngredientCategoryDto input);
    Task DeleteAsync(Guid id);
}

public interface IIngredientAppService : IApplicationService
{
    Task<IngredientDto> GetAsync(Guid id);
    Task<PagedResultDto<IngredientDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<IngredientDto> CreateAsync(CreateUpdateIngredientDto input);
    Task<IngredientDto> UpdateAsync(Guid id, CreateUpdateIngredientDto input);
    Task DeleteAsync(Guid id);
}
