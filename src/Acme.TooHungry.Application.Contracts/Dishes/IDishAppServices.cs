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
    Task DeleteAsync(Guid id);
}

public interface IDishCategoryAppService : IApplicationService
{
    Task<DishCategoryDto> GetAsync(Guid id);
    Task<PagedResultDto<DishCategoryDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DishCategoryDto> CreateAsync(CreateUpdateDishCategoryDto input);
    Task<DishCategoryDto> UpdateAsync(Guid id, CreateUpdateDishCategoryDto input);
    Task DeleteAsync(Guid id);
}

public interface IRecipeAppService : IApplicationService
{
    Task<RecipeDto> GetAsync(Guid id);
    Task<PagedResultDto<RecipeDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<RecipeDto> CreateAsync(CreateUpdateRecipeDto input);
    Task<RecipeDto> UpdateAsync(Guid id, CreateUpdateRecipeDto input);
    Task DeleteAsync(Guid id);
}
