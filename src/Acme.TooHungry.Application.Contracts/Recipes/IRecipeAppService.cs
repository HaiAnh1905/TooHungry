using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Recipes;

public interface IRecipeAppService : IApplicationService
{
    Task<RecipeDto> GetAsync(Guid id);

    Task<PagedResultDto<RecipeDto>> GetListAsync(RecipeFilterDto input);

    Task<RecipeDto?> GetActiveByDishIdAsync(Guid dishId);

    Task<List<RecipeDto>> GetHistoryByDishIdAsync(Guid dishId);

    Task<RecipeDto> CreateAsync(CreateRecipeDto input);
 
    Task<RecipeDto> CreateOrUpdateAsync(CreateOrUpdateRecipeDto input);

    Task<RecipeDto> UpdateAsync(Guid id, UpdateRecipeDto input);

    Task<RecipeDto> DeactivateAsync(Guid id, string reason);

    Task<RecipeDto> ReactivateAsync(Guid id);
}
