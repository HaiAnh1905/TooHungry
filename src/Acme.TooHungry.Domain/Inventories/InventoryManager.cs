using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Acme.TooHungry.Inventories;

public class DeductionResult
{
    public decimal TotalDeducted { get; set; }
    public decimal ShortageQuantity { get; set; }
    public bool HasShortage => ShortageQuantity > 0;
}

public class InventoryManager : DomainService
{
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    public InventoryManager(
        IRepository<InventoryBatch, Guid> batchRepository,
        IRepository<InventoryTransaction, Guid> transactionRepository,
        IRepository<Ingredient, Guid> ingredientRepository)
    {
        _batchRepository = batchRepository;
        _transactionRepository = transactionRepository;
        _ingredientRepository = ingredientRepository;
    }

    /// <summary>
    /// Thuật toán xuất kho FEFO (First Expired, First Out).
    /// Tự động bỏ qua các lô FRESH quá hạn.
    /// Nếu thiếu kho, trừ hết về 0, không chặn đơn hàng và trả về ShortageQuantity.
    /// </summary>
    public async Task<DeductionResult> DeductFefoAsync(Guid ingredientId, decimal requiredQuantity, string referenceId)
    {
        if (requiredQuantity <= 0)
        {
            return new DeductionResult { TotalDeducted = 0, ShortageQuantity = 0 };
        }

        var ingredient = await _ingredientRepository.GetAsync(ingredientId);

        var now = DateTime.UtcNow;

        // Lấy tất cả các lô còn hàng đang active
        var queryable = await _batchRepository.GetQueryableAsync();
        var allBatches = queryable
            .Where(x => x.IngredientId == ingredientId && x.IsActive && x.RemainingQuantity > 0)
            .ToList();

        // Lọc bỏ các lô đồ tươi sống FRESH quá hạn
        var validBatches = allBatches
            .Where(b => !(ingredient.StorageType == StorageType.FRESH && b.ExpiryDate < now))
            .ToList();

        // Ưu tiên các lô FRESH hết hạn trong vòng 24h lên đầu, sau đó sắp xếp theo ExpiryDate ASC và ReceivedAt ASC
        var batches = validBatches
            .OrderByDescending(b => ingredient.StorageType == StorageType.FRESH && b.ExpiryDate <= now.AddHours(24))
            .ThenBy(b => b.ExpiryDate)
            .ThenBy(b => b.ReceivedAt)
            .ToList();

        decimal remainingToDeduct = requiredQuantity;
        decimal totalDeducted = 0;

        foreach (var batch in batches)
        {
            if (remainingToDeduct <= 0)
            {
                break;
            }

            var amountToDeduct = Math.Min(remainingToDeduct, batch.RemainingQuantity);
            batch.DeductQuantity(amountToDeduct);
            await _batchRepository.UpdateAsync(batch, autoSave: true);

            var transaction = new InventoryTransaction(
                GuidGenerator.Create(),
                ingredientId,
                batch.Id,
                InventoryTransactionType.OUT,
                amountToDeduct,
                "Recipe Consumption",
                referenceId,
                batch.UnitCost
            );
            await _transactionRepository.InsertAsync(transaction, autoSave: true);

            totalDeducted += amountToDeduct;
            remainingToDeduct -= amountToDeduct;
        }

        return new DeductionResult
        {
            TotalDeducted = totalDeducted,
            ShortageQuantity = remainingToDeduct
        };
    }

    /// <summary>
    /// Điều chỉnh tồn kho khi kiểm kê thực tế (Stock Adjustment - US4).
    /// </summary>
    public async Task AdjustStockAsync(
        Guid ingredientId,
        decimal actualQuantity,
        string reason,
        List<(Guid batchId, decimal quantity)>? batchDeductions = null)
    {
        Check.NotNullOrWhiteSpace(reason, nameof(reason));

        var queryable = await _batchRepository.GetQueryableAsync();
        var currentBatches = queryable
            .Where(x => x.IngredientId == ingredientId && x.IsActive)
            .ToList();

        var systemQuantity = currentBatches.Sum(x => x.RemainingQuantity);
        var difference = actualQuantity - systemQuantity;

        if (difference == 0)
        {
            return;
        }

        if (difference < 0)
        {
            // Thiếu hụt kho: Bắt buộc chọn đích danh từng lô hàng cụ thể để trừ
            if (batchDeductions == null || !batchDeductions.Any())
            {
                throw new BusinessException("StockAdjustment:BatchSelectionRequiredForDeficit");
            }

            var totalBatchDeduction = batchDeductions.Sum(x => x.quantity);
            if (Math.Abs(difference) != totalBatchDeduction)
            {
                throw new BusinessException("StockAdjustment:BatchDeductionMustMatchDifference");
            }

            foreach (var item in batchDeductions)
            {
                var batch = currentBatches.FirstOrDefault(x => x.Id == item.batchId);
                if (batch == null)
                {
                    throw new BusinessException("StockAdjustment:BatchNotFound");
                }

                if (item.quantity > batch.RemainingQuantity)
                {
                    throw new BusinessException("StockAdjustment:DeductionExceedsBatchRemaining");
                }

                batch.DeductQuantity(item.quantity);
                await _batchRepository.UpdateAsync(batch, autoSave: true);

                var tx = new InventoryTransaction(
                    GuidGenerator.Create(),
                    ingredientId,
                    batch.Id,
                    InventoryTransactionType.ADJUSTMENT_OUT,
                    item.quantity,
                    reason,
                    null,
                    batch.UnitCost
                );
                await _transactionRepository.InsertAsync(tx, autoSave: true);
            }
        }
        else
        {
            // Thừa kho: Tạo lô điều chỉnh tăng
            var now = DateTime.UtcNow;
            var adjustmentBatch = new InventoryBatch(
                GuidGenerator.Create(),
                ingredientId,
                $"ADJ-{now:yyyyMMddHHmmss}",
                difference,
                difference,
                "BaseUnit",
                1.0m,
                now,
                now.AddYears(1)
            );
            await _batchRepository.InsertAsync(adjustmentBatch, autoSave: true);

            var tx = new InventoryTransaction(
                GuidGenerator.Create(),
                ingredientId,
                adjustmentBatch.Id,
                InventoryTransactionType.ADJUSTMENT_IN,
                difference,
                reason,
                null,
                adjustmentBatch.UnitCost
            );
            await _transactionRepository.InsertAsync(tx, autoSave: true);
        }
    }
}
