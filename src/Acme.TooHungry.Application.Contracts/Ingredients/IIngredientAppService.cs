using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Ingredients;

public interface IIngredientAppService : IApplicationService
{
    Task<IngredientDto> GetAsync(Guid id);

    Task<PagedResultDto<IngredientDto>> GetListAsync(GetIngredientsInput input);

    Task<IngredientDto> CreateAsync(CreateIngredientDto input);

    Task<IngredientDto> UpdateAsync(Guid id, UpdateIngredientDto input);

    Task<IngredientDto> SmartRestoreAsync(Guid id, SmartRestoreDto input);

    Task<IngredientDto> DeactivateAsync(Guid id, string reason);

    Task<IngredientDto> ReactivateAsync(Guid id);

    Task DeleteAsync(Guid id);
}
