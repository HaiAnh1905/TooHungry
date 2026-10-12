using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Dishes;

public interface IDishAppService : IApplicationService
{
    Task<DishDto> GetAsync(Guid id);
    Task<PagedResultDto<DishDto>> GetListAsync(GetDishesInput input);
    Task<DishDto> CreateAsync(CreateUpdateDishDto input);
    Task<DishDto> UpdateAsync(Guid id, CreateUpdateDishDto input);
    Task<DishDto> ToggleActiveAsync(Guid id);
    Task<BulkActionResultDto> BulkToggleActiveAsync(BulkToggleActiveDishDto input);
    Task DeleteAsync(Guid id);
    Task DeleteWithReasonAsync(Guid id, DeleteDishDto input);
    Task<ListResultDto<DishDto>> GetMenuForPosAsync();
}

public interface IDishCategoryAppService : IApplicationService
{
    Task<DishCategoryDto> GetAsync(Guid id);
    Task<PagedResultDto<DishCategoryDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DishCategoryDto> CreateAsync(CreateUpdateDishCategoryDto input);
    Task<DishCategoryDto> UpdateAsync(Guid id, CreateUpdateDishCategoryDto input);
    Task DeleteAsync(Guid id);
}
