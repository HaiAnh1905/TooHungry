using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Tables;

public interface ITableAppService : IApplicationService
{
    Task<TableDto> GetAsync(Guid id);

    Task<PagedResultDto<TableDto>> GetListAsync(GetTablesInput input);

    Task<TableDto> CreateAsync(CreateUpdateTableDto input);

    Task<TableDto> UpdateAsync(Guid id, CreateUpdateTableDto input);

    Task<TableDto> ChangeStatusAsync(Guid id, TableStatus status);

    Task DeleteAsync(Guid id);

    Task SetAreaTablesStatusAsync(Guid diningAreaId, TableStatus status);
    
    Task<TableDto> TransferTableAsync(TransferTableInputDto input);

    Task<TableDto> MergeTablesAsync(MergeTablesInputDto input);
}

