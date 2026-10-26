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
            throw new BusinessException("TooHungry:Inventory:InvalidQuantity");
        }

        var ingredient = await _ingredientRepository.GetAsync(ingredientId);

        var now = Clock.Now;

        // Lấy tất cả các lô còn hàng đang active
        var queryable = await _batchRepository.GetQueryableAsync();
        var allBatches = await AsyncExecuter.ToListAsync(
            queryable.Where(x => x.IngredientId == ingredientId && x.IsActive && x.RemainingQuantity > 0)
        );

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
        var batchesToUpdate = new List<InventoryBatch>();
        var transactionsToInsert = new List<InventoryTransaction>();

        foreach (var batch in batches)
        {
            if (remainingToDeduct <= 0)
            {
                break;
            }

            var amountToDeduct = Math.Min(remainingToDeduct, batch.RemainingQuantity);
            batch.DeductQuantity(amountToDeduct);
            batchesToUpdate.Add(batch);

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
            transactionsToInsert.Add(transaction);

            totalDeducted += amountToDeduct;
            remainingToDeduct -= amountToDeduct;
        }

        if (batchesToUpdate.Count > 0)
        {
            await _batchRepository.UpdateManyAsync(batchesToUpdate, autoSave: true);
        }

        if (transactionsToInsert.Count > 0)
        {
            await _transactionRepository.InsertManyAsync(transactionsToInsert, autoSave: true);
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
        var currentBatches = await AsyncExecuter.ToListAsync(
            queryable.Where(x => x.IngredientId == ingredientId && x.IsActive)
        );

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

            if (batchDeductions.Any(x => x.quantity <= 0))
            {
                throw new BusinessException("TooHungry:Inventory:InvalidQuantity");
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
            // Thừa kho: Tạo lô điều chỉnh tăng với PurchaseUnit, UnitCost, ExpiryDate chuẩn
            var ingredient = await _ingredientRepository.GetAsync(ingredientId);
            var now = Clock.Now;

            // Hạn sử dụng lấy theo hạn xa nhất của các lô còn hạn của nguyên liệu đó trong kho (hoặc 30 ngày)
            var maxExpiryDate = currentBatches
                .Where(b => b.ExpiryDate > now)
                .Select(b => (DateTime?)b.ExpiryDate)
                .Max() ?? now.AddDays(30);

            var batchCode = $"ADJ-{now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..24];

            var adjustmentBatch = new InventoryBatch(
                GuidGenerator.Create(),
                ingredientId,
                batchCode,
                difference,
                difference,
                ingredient.BaseUnit,
                1.0m,
                now,
                maxExpiryDate,
                supplierId: null,
                unitCost: ingredient.EstimatedPrice
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
