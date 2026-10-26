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

public abstract class InventoryManager_Adjustment_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly InventoryManager _inventoryManager;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;

    protected InventoryManager_Adjustment_Tests()
    {
        _inventoryManager = GetRequiredService<InventoryManager>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
    }

    [Fact]
    public async Task Should_Adjust_Stock_Negative_Difference_When_Batches_Selected()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var salt = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Muối tinh", "kg", 5, StorageType.LONG_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            var b1 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), salt.Id, "SALT-B1", 6m, 6m, "kg", 1m, now, now.AddYears(1)), autoSave: true);
            var b2 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), salt.Id, "SALT-B2", 4m, 4m, "kg", 1m, now, now.AddYears(1)), autoSave: true);

            // Tổng tồn hệ thống = 10 kg. Thực tế kiểm kê = 2 kg (Difference = -8 kg)
            // Chọn trừ 6 kg ở b1, 2 kg ở b2
            var deductions = new List<(Guid batchId, decimal quantity)>
            {
                (b1.Id, 6m),
                (b2.Id, 2m)
            };

            await _inventoryManager.AdjustStockAsync(salt.Id, 2m, "Bao bì rách, ẩm ướt", deductions);

            var reloadedB1 = await _batchRepository.GetAsync(b1.Id);
            var reloadedB2 = await _batchRepository.GetAsync(b2.Id);

            reloadedB1.RemainingQuantity.ShouldBe(0m);
            reloadedB2.RemainingQuantity.ShouldBe(2m);

            var txs = (await _transactionRepository.GetListAsync())
                .Where(x => x.IngredientId == salt.Id && x.TransactionType == InventoryTransactionType.ADJUSTMENT_OUT)
                .ToList();

            txs.Count.ShouldBe(2);
            txs.Sum(x => x.Quantity).ShouldBe(8m);
        });
    }

    [Fact]
    public async Task Should_Throw_When_Negative_Difference_Without_Batch_Selection()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var sugar = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Đường cát", "kg", 5, StorageType.LONG_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), sugar.Id, "SUGAR-01", 10m, 10m, "kg", 1m, now, now.AddYears(1)), autoSave: true);

            // Thực tế = 5 kg, Difference = -5 kg nhưng không chọn lô nào -> Bắt buộc ném lỗi
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _inventoryManager.AdjustStockAsync(sugar.Id, 5m, "Thiếu hụt", null);
            });

            ex.Code.ShouldBe("StockAdjustment:BatchSelectionRequiredForDeficit");
        });
    }

    [Fact]
    public async Task Should_Throw_When_Batch_Deduction_Quantity_Does_Not_Match_Difference()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var pepper = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Tiêu đen", "kg", 1, StorageType.LONG_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            var b1 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), pepper.Id, "PEPPER-01", 5m, 5m, "kg", 1m, now, now.AddYears(1)), autoSave: true);

            // Thiếu 3 kg (tồn 5 kg -> thực tế 2 kg), nhưng chỉ chọn trừ 2 kg
            var deductions = new List<(Guid batchId, decimal quantity)>
            {
                (b1.Id, 2m)
            };

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _inventoryManager.AdjustStockAsync(pepper.Id, 2m, "Hao hụt", deductions);
            });

            ex.Code.ShouldBe("StockAdjustment:BatchDeductionMustMatchDifference");
        });
    }

    [Fact]
    public async Task Should_Adjust_Stock_Positive_Difference_And_Create_Adjustment_Batch()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var oil = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Dầu ăn", "lít", 5, StorageType.LONG_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), oil.Id, "OIL-01", 2m, 2m, "lít", 1m, now, now.AddYears(1)), autoSave: true);

            // Tồn hệ thống = 2 lít, thực tế = 5 lít (Difference = +3 lít)
            await _inventoryManager.AdjustStockAsync(oil.Id, 5m, "Tìm thấy thêm 1 can dầu sót trong kho");

            var batches = (await _batchRepository.GetListAsync()).Where(x => x.IngredientId == oil.Id && x.IsActive).ToList();
            batches.Sum(x => x.RemainingQuantity).ShouldBe(5m);

            var adjBatch = batches.FirstOrDefault(x => x.BatchCode.StartsWith("ADJ-"));
            adjBatch.ShouldNotBeNull();
            adjBatch.PurchaseUnit.ShouldBe(oil.BaseUnit);
            adjBatch.UnitCost.ShouldBe(oil.EstimatedPrice);
            adjBatch.RemainingQuantity.ShouldBe(3m);

            var txs = (await _transactionRepository.GetListAsync())
                .Where(x => x.IngredientId == oil.Id && x.TransactionType == InventoryTransactionType.ADJUSTMENT_IN)
                .ToList();

            txs.Count.ShouldBe(1);
            txs.First().Quantity.ShouldBe(3m);
        });
    }

    [Fact]
    public async Task Should_Throw_When_Deduct_Quantity_Is_Zero_Or_Negative()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Tiêu Đen Test", "g", 10, StorageType.LONG_TERM), autoSave: true);

            var b1 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), ingredient.Id, "PEP-01", 100m, 100m, "g", 1m, DateTime.UtcNow, DateTime.UtcNow.AddDays(30)), autoSave: true);

            // 1. FEFO với số lượng âm -> ném TooHungry:Inventory:InvalidQuantity
            var exFefo = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _inventoryManager.DeductFefoAsync(ingredient.Id, -5m, "Test");
            });
            exFefo.Code.ShouldBe("TooHungry:Inventory:InvalidQuantity");

            // 2. AdjustStock với quantity âm trong batchDeductions
            var exAdj = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _inventoryManager.AdjustStockAsync(ingredient.Id, 90m, "Kiểm kê", new List<(Guid batchId, decimal quantity)>
                {
                    (b1.Id, -10m)
                });
            });
            exAdj.Code.ShouldBe("TooHungry:Inventory:InvalidQuantity");
        });
    }
}
