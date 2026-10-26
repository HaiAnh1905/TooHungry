using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryAppService_StockAdjustment_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IInventoryAppService _inventoryAppService;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;

    protected InventoryAppService_StockAdjustment_Tests()
    {
        _inventoryAppService = GetRequiredService<IInventoryAppService>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
    }

    [Fact]
    public async Task AdjustStockAsync_Should_Increase_Stock_Calculate_Cost_By_EstimatedPrice_And_Create_Adjustment_In_Transaction()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            const decimal estimatedPrice = 185000m;

            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(),
                $"Nguyên liệu Tăng {Guid.NewGuid():N}"[..18],
                "kg",
                2.0m,
                StorageType.SHORT_TERM,
                ConsumptionMethod.RECIPE,
                estimatedPrice
            ), autoSave: true);

            var initialBatch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingredient.Id,
                $"BATCH-INI-{Guid.NewGuid():N}"[..18],
                5.0m,
                5.0m,
                "kg",
                1.0m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddDays(14),
                null,
                unitCost: estimatedPrice
            ), autoSave: true);

            // Điều chỉnh thừa kho: Thực tế 8kg (Hệ thống 5kg -> Lệch +3kg)
            await _inventoryAppService.AdjustStockAsync(new StockAdjustmentRequestDto
            {
                IngredientId = ingredient.Id,
                ActualQuantity = 8.0m,
                Reason = "Kiểm kê định kỳ phát hiện thừa 3kg do nhập nhầm lần trước"
            });

            // 1. Kiểm tra tổng tồn kho hiện tại tăng lên 8kg
            var batchQuery = await _batchRepository.GetQueryableAsync();
            var batches = batchQuery.Where(x => x.IngredientId == ingredient.Id && x.IsActive).ToList();
            batches.Sum(x => x.RemainingQuantity).ShouldBe(8.0m);

            // 2. Kiểm tra lô điều chỉnh mới được tạo có giá vốn bằng EstimatedPrice
            var adjustmentBatch = batches.FirstOrDefault(x => x.BatchCode.StartsWith("ADJ-"));
            adjustmentBatch.ShouldNotBeNull();
            adjustmentBatch.RemainingQuantity.ShouldBe(3.0m);
            adjustmentBatch.UnitCost.ShouldBe(estimatedPrice);

            // 3. Kiểm tra bản ghi giao dịch kho ADJUSTMENT_IN
            var txQuery = await _transactionRepository.GetQueryableAsync();
            var inTransaction = txQuery.FirstOrDefault(x => x.BatchId == adjustmentBatch.Id && x.TransactionType == InventoryTransactionType.ADJUSTMENT_IN);
            inTransaction.ShouldNotBeNull();
            inTransaction.Quantity.ShouldBe(3.0m);
            inTransaction.UnitCost.ShouldBe(estimatedPrice);
            inTransaction.Reason.ShouldContain("thừa 3kg");
        });
    }

    [Fact]
    public async Task AdjustStockAsync_Should_Decrease_Stock_Via_BatchDeductions_And_Create_Adjustment_Out_Transaction()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(),
                $"Nguyên liệu Giảm {Guid.NewGuid():N}"[..18],
                "kg",
                2.0m,
                StorageType.LONG_TERM,
                ConsumptionMethod.MANUAL,
                120000m
            ), autoSave: true);

            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingredient.Id,
                $"BATCH-DEC-{Guid.NewGuid():N}"[..18],
                10.0m,
                10.0m,
                "kg",
                1.0m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddMonths(6),
                null,
                unitCost: 120000m
            ), autoSave: true);

            // Điều chỉnh thiếu kho: Thực tế 6.5kg (Hệ thống 10kg -> Thiếu 3.5kg)
            await _inventoryAppService.AdjustStockAsync(new StockAdjustmentRequestDto
            {
                IngredientId = ingredient.Id,
                ActualQuantity = 6.5m,
                Reason = "Hao hụt tự nhiên và rơi vãi khi sơ chế",
                BatchDeductions = new List<BatchDeductionItemDto>
                {
                    new() { BatchId = batch.Id, DeductQuantity = 3.5m }
                }
            });

            // 1. Lô hàng bị giảm chính xác 3.5kg: 10 - 3.5 = 6.5kg
            var reloadedBatch = await _batchRepository.GetAsync(batch.Id);
            reloadedBatch.RemainingQuantity.ShouldBe(6.5m);

            // 2. Giao dịch kho ADJUSTMENT_OUT được tạo đầy đủ
            var txQuery = await _transactionRepository.GetQueryableAsync();
            var outTx = txQuery.FirstOrDefault(x => x.BatchId == batch.Id && x.TransactionType == InventoryTransactionType.ADJUSTMENT_OUT);
            outTx.ShouldNotBeNull();
            outTx.Quantity.ShouldBe(3.5m);
            outTx.Reason.ShouldContain("Hao hụt");
        });
    }

    [Fact]
    public async Task AdjustStockAsync_Should_Reject_When_BatchDeductions_Do_Not_Match_Difference()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(),
                $"Nguyên liệu Lệch {Guid.NewGuid():N}"[..18],
                "kg",
                1.0m,
                StorageType.SHORT_TERM,
                ConsumptionMethod.RECIPE,
                50000m
            ), autoSave: true);

            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingredient.Id,
                $"BATCH-ERR-{Guid.NewGuid():N}"[..18],
                10.0m,
                10.0m,
                "kg",
                1.0m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddDays(10),
                null,
                unitCost: 50000m
            ), autoSave: true);

            // Thiếu 4kg (10 -> 6) nhưng chỉ trừ 2kg -> Ném BusinessException
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _inventoryAppService.AdjustStockAsync(new StockAdjustmentRequestDto
                {
                    IngredientId = ingredient.Id,
                    ActualQuantity = 6.0m,
                    Reason = "Khai báo lệch số lượng trừ",
                    BatchDeductions = new List<BatchDeductionItemDto>
                    {
                        new() { BatchId = batch.Id, DeductQuantity = 2.0m }
                    }
                });
            });

            ex.Code.ShouldBe("StockAdjustment:BatchDeductionMustMatchDifference");
        });
    }
}
