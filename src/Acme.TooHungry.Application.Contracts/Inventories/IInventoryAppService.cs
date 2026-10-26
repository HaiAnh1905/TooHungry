using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Inventories;

public interface IInventoryAppService : IApplicationService
{
    Task<PagedResultDto<InventoryBatchDto>> GetBatchesAsync(GetInventoryBatchesInput input);

    Task<InventoryBatchDto> CreateBatchAsync(CreateInventoryBatchDto input);

    Task AdjustStockAsync(StockAdjustmentRequestDto input);

    Task DiscardBatchAsync(Guid id, DiscardBatchInputDto input);

    Task BulkDiscardBatchesAsync(BulkDiscardBatchesInputDto input);
 
    Task<InventoryBatchDto> DeactivateBatchAsync(Guid id, DeactivateBatchDto input);

    Task<InventoryBatchDto> ReactivateBatchAsync(Guid id);

    Task<List<InventoryAlertDto>> GetAlertsAsync();

    Task<PagedResultDto<InventoryTransactionDto>> GetTransactionsAsync(Guid ingredientId, PagedAndSortedResultRequestDto input);
}
