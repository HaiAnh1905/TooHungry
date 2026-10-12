using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Data;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Inventories;

[RemoteService(IsEnabled = false)]
public class InventoryAppService : TooHungryAppService, IInventoryAppService
{
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly InventoryManager _inventoryManager;
    private readonly TooHungryInventoryBatchToInventoryBatchDtoMapper _batchMapper;
    private readonly TooHungryInventoryTransactionToInventoryTransactionDtoMapper _txMapper;

    public InventoryAppService(
        IRepository<InventoryBatch, Guid> batchRepository,
        IRepository<InventoryTransaction, Guid> transactionRepository,
        IRepository<Ingredient, Guid> ingredientRepository,
        InventoryManager inventoryManager,
        TooHungryInventoryBatchToInventoryBatchDtoMapper batchMapper,
        TooHungryInventoryTransactionToInventoryTransactionDtoMapper txMapper)
    {
        _batchRepository = batchRepository;
        _transactionRepository = transactionRepository;
        _ingredientRepository = ingredientRepository;
        _inventoryManager = inventoryManager;
        _batchMapper = batchMapper;
        _txMapper = txMapper;
    }

    public virtual async Task<PagedResultDto<InventoryBatchDto>> GetBatchesAsync(GetInventoryBatchesInput input)
    {
        var queryable = await _batchRepository.WithDetailsAsync(x => x.Ingredient!);

        if (input.IngredientId.HasValue)
        {
            queryable = queryable.Where(x => x.IngredientId == input.IngredientId.Value);
        }

        if (input.IsActive.HasValue)
        {
            queryable = queryable.Where(x => x.IsActive == input.IsActive.Value);
        }
        else if (input.OnlyAvailable)
        {
            queryable = queryable.Where(x => x.IsActive && x.RemainingQuantity > 0);
        }

        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x => x.BatchCode.ToLower().Contains(filter) ||
                (x.Ingredient != null && x.Ingredient.Name.ToLower().Contains(filter)));
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        // FEFO: Mặc định sắp xếp theo ExpiryDate ASC, ReceivedAt ASC
        var sorting = string.IsNullOrWhiteSpace(input.Sorting) ? "ExpiryDate asc, ReceivedAt asc" : input.Sorting;
        queryable = queryable
            .OrderBy(sorting)
            .Skip(input.SkipCount)
            .Take(input.MaxResultCount);

        var batches = await AsyncExecuter.ToListAsync(queryable);
        var dtos = batches.Select(b =>
        {
            var dto = _batchMapper.Map(b);
            if (b.Ingredient != null)
            {
                dto.IngredientName = b.Ingredient.Name;
                dto.StorageType = b.Ingredient.StorageType;
            }
            return dto;
        }).ToList();

        return new PagedResultDto<InventoryBatchDto>(totalCount, dtos);
    }

    public virtual async Task<InventoryBatchDto> CreateBatchAsync(CreateInventoryBatchDto input)
    {
        var ingredient = await _ingredientRepository.GetAsync(input.IngredientId);

        var qty = input.PurchaseQuantity > 0
            ? input.PurchaseQuantity
            : (input.InitialQuantity ?? 0);

        var cost = input.UnitCost > 0
            ? input.UnitCost
            : (input.UnitPrice ?? 0);

        var factor = input.ConversionFactor > 0 ? input.ConversionFactor : 1.0m;

        var purchaseUnit = !string.IsNullOrWhiteSpace(input.PurchaseUnit)
            ? input.PurchaseUnit.Trim()
            : (!string.IsNullOrWhiteSpace(ingredient.BaseUnit) ? ingredient.BaseUnit.Trim() : "đơn vị");

        var now = DateTime.UtcNow;
        var expiry = input.ExpiryDate.HasValue && input.ExpiryDate.Value != default
            ? input.ExpiryDate.Value
            : now.AddDays(7);

        if (expiry.Date < now.Date)
        {
            throw new BusinessException("InventoryBatch:ExpiryDateMustBeInFuture");
        }

        if (expiry.TimeOfDay == TimeSpan.Zero)
        {
            expiry = expiry.Date.AddDays(1).AddTicks(-1);
        }

        var batchCode = string.IsNullOrWhiteSpace(input.BatchCode)
            ? $"BATCH-{now:yyyyMMddHHmmss}"
            : input.BatchCode.Trim();

        var baseQuantity = qty * factor;

        var batch = new InventoryBatch(
            GuidGenerator.Create(),
            input.IngredientId,
            batchCode,
            baseQuantity,
            baseQuantity,
            purchaseUnit,
            factor,
            now,
            expiry,
            input.SupplierId,
            cost
        );

        var inserted = await _batchRepository.InsertAsync(batch, autoSave: true);

        // Ghi nhận giao dịch nhập kho IN
        var tx = new InventoryTransaction(
            GuidGenerator.Create(),
            input.IngredientId,
            inserted.Id,
            InventoryTransactionType.IN,
            baseQuantity,
            "Purchase Receipt",
            referenceId: null,
            unitCost: cost
        );
        await _transactionRepository.InsertAsync(tx, autoSave: true);

        var queryable = await _batchRepository.WithDetailsAsync(x => x.Ingredient!);
        var loaded = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == inserted.Id);
        var res = _batchMapper.Map(loaded ?? inserted);
        res.IngredientName = ingredient.Name;
        res.StorageType = ingredient.StorageType;
        return res;
    }

    public virtual async Task AdjustStockAsync(StockAdjustmentRequestDto input)
    {
        var batchDeductions = input.BatchDeductions?.Select(x => (x.BatchId, x.DeductQuantity > 0 ? x.DeductQuantity : x.Quantity)).ToList();
        var retryCount = 0;
        while (true)
        {
            try
            {
                await _inventoryManager.AdjustStockAsync(input.IngredientId, input.ActualQuantity, input.Reason, batchDeductions);
                break;
            }
            catch (AbpDbConcurrencyException) when (retryCount < 3)
            {
                retryCount++;
                await Task.Delay(50 * retryCount);
            }
        }
    }

    public virtual async Task DiscardBatchAsync(Guid id, DiscardBatchInputDto input)
    {
        Check.NotNullOrWhiteSpace(input.Reason, nameof(input.Reason));

        var batch = await _batchRepository.GetAsync(id);
        if (!batch.IsActive || batch.RemainingQuantity <= 0)
        {
            throw new BusinessException("InventoryBatch:AlreadyEmptyOrInactive");
        }

        var discardedQuantity = batch.RemainingQuantity;
        batch.Discard();
        await _batchRepository.UpdateAsync(batch, autoSave: true);

        var tx = new InventoryTransaction(
            GuidGenerator.Create(),
            batch.IngredientId,
            batch.Id,
            InventoryTransactionType.ADJUSTMENT_OUT,
            discardedQuantity,
            input.Reason.Trim(),
            referenceId: null,
            unitCost: batch.UnitCost
        );
        await _transactionRepository.InsertAsync(tx, autoSave: true);
    }

    [Authorize(TooHungryPermissions.Inventories.Adjust)]
    public virtual async Task<InventoryBatchDto> DeactivateBatchAsync(Guid id, DeactivateBatchDto input)
    {
        Check.NotNull(input, nameof(input));
        Check.NotNullOrWhiteSpace(input.Reason, nameof(input.Reason));

        var batch = await _batchRepository.GetAsync(id);
        batch.Deactivate(input.Reason);
        await _batchRepository.UpdateAsync(batch, autoSave: true);

        var queryable = await _batchRepository.WithDetailsAsync(x => x.Ingredient!);
        var loaded = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        var res = _batchMapper.Map(loaded ?? batch);
        if (loaded?.Ingredient != null)
        {
            res.IngredientName = loaded.Ingredient.Name;
            res.StorageType = loaded.Ingredient.StorageType;
        }
        return res;
    }

    [Authorize(TooHungryPermissions.Inventories.Adjust)]
    public virtual async Task<InventoryBatchDto> ReactivateBatchAsync(Guid id)
    {
        var batch = await _batchRepository.GetAsync(id);
        batch.Reactivate();
        await _batchRepository.UpdateAsync(batch, autoSave: true);

        var queryable = await _batchRepository.WithDetailsAsync(x => x.Ingredient!);
        var loaded = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        var res = _batchMapper.Map(loaded ?? batch);
        if (loaded?.Ingredient != null)
        {
            res.IngredientName = loaded.Ingredient.Name;
            res.StorageType = loaded.Ingredient.StorageType;
        }
        return res;
    }

    public virtual async Task<List<InventoryAlertDto>> GetAlertsAsync()
    {
        var alerts = new List<InventoryAlertDto>();
        var now = DateTime.UtcNow;

        var batchQueryable = await _batchRepository.WithDetailsAsync(x => x.Ingredient!);
        var batches = await AsyncExecuter.ToListAsync(batchQueryable.Where(x => x.IsActive && x.RemainingQuantity > 0));

        foreach (var b in batches)
        {
            var isFresh = b.Ingredient != null && b.Ingredient.StorageType == StorageType.FRESH;

            // Cảnh báo đỏ: Lô hàng đã quá hạn sử dụng
            if (b.ExpiryDate <= now)
            {
                alerts.Add(new InventoryAlertDto
                {
                    AlertType = isFresh ? "EXPIRED_FRESH" : "EXPIRED",
                    Severity = "danger",
                    IngredientId = b.IngredientId,
                    IngredientName = b.Ingredient?.Name ?? string.Empty,
                    BatchId = b.Id,
                    BatchCode = b.BatchCode,
                    Message = isFresh
                        ? $"Lô hàng tươi sống {b.BatchCode} ({b.Ingredient?.Name}) đã quá hạn ngày {b.ExpiryDate:dd/MM/yyyy}. Cần hủy bỏ ngay."
                        : $"Lô hàng {b.BatchCode} ({b.Ingredient?.Name}) đã quá hạn ngày {b.ExpiryDate:dd/MM/yyyy}.",
                    Timestamp = now
                });
            }
            // Cảnh báo vàng: Lô hàng sắp hết hạn trong 3 ngày (CHỈ áp dụng cho nguyên liệu KHÔNG PHẢI tươi sống)
            else if (!isFresh && b.ExpiryDate <= now.AddDays(3))
            {
                var daysLeft = Math.Max(1, (int)Math.Ceiling((b.ExpiryDate - now).TotalDays));
                alerts.Add(new InventoryAlertDto
                {
                    AlertType = "NEAR_EXPIRY",
                    Severity = "warning",
                    IngredientId = b.IngredientId,
                    IngredientName = b.Ingredient?.Name ?? string.Empty,
                    BatchId = b.Id,
                    BatchCode = b.BatchCode,
                    Message = $"Lô hàng {b.BatchCode} ({b.Ingredient?.Name}) sắp hết hạn trong {daysLeft} ngày.",
                    Timestamp = now
                });
            }
        }

        // Cảnh báo dưới mức tồn tối thiểu
        var ingredients = await _ingredientRepository.GetListAsync(x => x.IsActive);
        foreach (var ing in ingredients)
        {
            var totalStock = batches.Where(x => x.IngredientId == ing.Id).Sum(x => x.RemainingQuantity);
            if (totalStock <= 0)
            {
                alerts.Add(new InventoryAlertDto
                {
                    AlertType = "OUT_OF_STOCK",
                    Severity = "danger",
                    IngredientId = ing.Id,
                    IngredientName = ing.Name,
                    Message = $"Nguyên liệu {ing.Name} đã hết hàng.",
                    Timestamp = now
                });
            }
            else if (totalStock < ing.MinStock)
            {
                alerts.Add(new InventoryAlertDto
                {
                    AlertType = "SHORTAGE",
                    Severity = "warning",
                    IngredientId = ing.Id,
                    IngredientName = ing.Name,
                    Message = $"Nguyên liệu {ing.Name} hiện tồn ({totalStock:0.##} {ing.BaseUnit}) dưới mức tối thiểu ({ing.MinStock:0.##} {ing.BaseUnit}).",
                    Timestamp = now
                });
            }
        }

        return alerts;
    }

    public virtual async Task<List<InventoryTransactionDto>> GetTransactionsAsync(Guid ingredientId)
    {
        var queryable = await _transactionRepository.WithDetailsAsync(x => x.Ingredient!, x => x.Batch!);
        var txs = await AsyncExecuter.ToListAsync(
            queryable.Where(x => x.IngredientId == ingredientId).OrderByDescending(x => x.CreationTime)
        );

        return txs.Select(t =>
        {
            var dto = _txMapper.Map(t);
            if (t.Ingredient != null)
            {
                dto.IngredientName = t.Ingredient.Name;
            }
            if (t.Batch != null)
            {
                dto.BatchCode = t.Batch.BatchCode;
            }
            return dto;
        }).ToList();
    }
}
