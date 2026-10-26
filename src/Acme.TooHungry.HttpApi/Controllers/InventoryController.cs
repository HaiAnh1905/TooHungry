using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/inventory")]
public class InventoryController : TooHungryController
{
    private readonly IInventoryAppService _inventoryAppService;

    public InventoryController(IInventoryAppService inventoryAppService)
    {
        _inventoryAppService = inventoryAppService;
    }

    [HttpGet("batches")]
    [Authorize(TooHungryPermissions.Inventories.Default)]
    public virtual Task<PagedResultDto<InventoryBatchDto>> GetBatchesAsync([FromQuery] GetInventoryBatchesInput input)
    {
        return _inventoryAppService.GetBatchesAsync(input);
    }

    [HttpPost("batches")]
    [Authorize(TooHungryPermissions.Inventories.Create)]
    public virtual Task<InventoryBatchDto> CreateBatchAsync([FromBody] CreateInventoryBatchDto input)
    {
        return _inventoryAppService.CreateBatchAsync(input);
    }

    [HttpPost("stock-adjustment")]
    [Authorize(TooHungryPermissions.Inventories.Adjust)]
    public virtual Task AdjustStockAsync([FromBody] StockAdjustmentRequestDto input)
    {
        return _inventoryAppService.AdjustStockAsync(input);
    }

    [HttpPost("batches/{id:guid}/discard")]
    [Authorize(TooHungryPermissions.Inventories.Discard)]
    public virtual Task DiscardBatchAsync(Guid id, [FromBody] DiscardBatchInputDto input)
    {
        return _inventoryAppService.DiscardBatchAsync(id, input);
    }

    [HttpPost("batches/bulk-discard")]
    [Authorize(TooHungryPermissions.Inventories.Discard)]
    public virtual Task BulkDiscardBatchesAsync([FromBody] BulkDiscardBatchesInputDto input)
    {
        return _inventoryAppService.BulkDiscardBatchesAsync(input);
    }

    [HttpPost("batches/{id:guid}/deactivate")]
    [Authorize(TooHungryPermissions.Inventories.Adjust)]
    public virtual Task<InventoryBatchDto> DeactivateBatchAsync(Guid id, [FromBody] DeactivateBatchDto input)
    {
        return _inventoryAppService.DeactivateBatchAsync(id, input);
    }

    [HttpPost("batches/{id:guid}/reactivate")]
    [Authorize(TooHungryPermissions.Inventories.Adjust)]
    public virtual Task<InventoryBatchDto> ReactivateBatchAsync(Guid id)
    {
        return _inventoryAppService.ReactivateBatchAsync(id);
    }

    [HttpGet("alerts")]
    [Authorize(TooHungryPermissions.Inventories.Default)]
    public virtual Task<List<InventoryAlertDto>> GetAlertsAsync()
    {
        return _inventoryAppService.GetAlertsAsync();
    }

    [HttpGet("transactions/{ingredientId:guid}")]
    [Authorize(TooHungryPermissions.Inventories.Default)]
    public virtual Task<PagedResultDto<InventoryTransactionDto>> GetTransactionsAsync(Guid ingredientId, [FromQuery] PagedAndSortedResultRequestDto input)
    {
        return _inventoryAppService.GetTransactionsAsync(ingredientId, input);
    }
}
