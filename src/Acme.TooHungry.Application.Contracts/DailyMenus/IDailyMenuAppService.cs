using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.DailyMenus;

public interface IDailyMenuAppService : IApplicationService
{
    Task<DailyMenuDto> GetAsync(Guid id);
    Task<PagedResultDto<DailyMenuDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DailyMenuDto> CreateAsync(CreateUpdateDailyMenuDto input);
    Task<DailyMenuDto> UpdateAsync(Guid id, CreateUpdateDailyMenuDto input);
    Task DeleteAsync(Guid id);
    Task<DailyMenuDto?> GetByDateAsync(DateTime date);
}
