using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Units;

public interface IUnitAppService : IApplicationService
{
    Task<UnitDto> GetAsync(Guid id);
    Task<PagedResultDto<UnitDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<UnitDto> CreateAsync(CreateUpdateUnitDto input);
    Task<UnitDto> UpdateAsync(Guid id, CreateUpdateUnitDto input);
    Task DeleteAsync(Guid id);
}
