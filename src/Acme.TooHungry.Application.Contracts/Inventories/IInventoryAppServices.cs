using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Inventories;

public interface IInventoryAppService : IApplicationService
{
    Task<InventoryDto> GetAsync(Guid id);
    Task<PagedResultDto<InventoryDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<InventoryDto> CreateAsync(CreateUpdateInventoryDto input);
    Task<InventoryDto> UpdateAsync(Guid id, CreateUpdateInventoryDto input);
    Task DeleteAsync(Guid id);
}

public interface IInventoryBatchAppService : IApplicationService
{
    Task<InventoryBatchDto> GetAsync(Guid id);
    Task<PagedResultDto<InventoryBatchDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<InventoryBatchDto> CreateAsync(CreateUpdateInventoryBatchDto input);
    Task<InventoryBatchDto> UpdateAsync(Guid id, CreateUpdateInventoryBatchDto input);
    Task DeleteAsync(Guid id);
}

public interface IInventoryTransactionAppService : IApplicationService
{
    Task<InventoryTransactionDto> GetAsync(Guid id);
    Task<PagedResultDto<InventoryTransactionDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<InventoryTransactionDto> CreateAsync(CreateInventoryTransactionDto input);
    Task<InventoryTransactionDto> UpdateAsync(Guid id, CreateInventoryTransactionDto input);
    Task DeleteAsync(Guid id);
}
