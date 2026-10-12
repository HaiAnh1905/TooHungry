using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.DiningAreas;

public interface IDiningAreaAppService :
    ICrudAppService<
        DiningAreaDto,
        Guid,
        GetDiningAreasInput,
        CreateUpdateDiningAreaDto>
{
    Task<ListResultDto<DiningAreaDto>> GetLookupAsync();

    Task DeactivateAsync(Guid id);

    Task ActivateAsync(Guid id);
}
