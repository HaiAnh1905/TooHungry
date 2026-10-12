using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.DiningAreas;

public interface IDiningAreaAppService : IApplicationService
{
    Task<DiningAreaDto> GetAsync(Guid id);

    Task<PagedResultDto<DiningAreaDto>> GetListAsync(GetDiningAreasInput input);

    Task<ListResultDto<DiningAreaDto>> GetLookupAsync();

    Task<DiningAreaDto> CreateAsync(CreateUpdateDiningAreaDto input);

    Task<DiningAreaDto> UpdateAsync(Guid id, CreateUpdateDiningAreaDto input);

    Task DeactivateAsync(Guid id);

    Task ActivateAsync(Guid id);

    Task DeleteAsync(Guid id);
}

