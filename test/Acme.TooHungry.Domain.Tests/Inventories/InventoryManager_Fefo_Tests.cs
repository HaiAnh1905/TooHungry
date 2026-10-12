using System;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryManager_Fefo_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly InventoryManager _inventoryManager;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;

    protected InventoryManager_Fefo_Tests()
    {
        _inventoryManager = GetRequiredService<InventoryManager>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
    }

    [Fact]
    public async Task Should_Deduct_From_Earliest_Expiring_Batch_First()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Thịt bò Kobe", "kg", 2, StorageType.SHORT_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            // Batch 1: Hết hạn sau 5 ngày (2 kg)
            var b1 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), ingredient.Id, "B001", 2m, 2m, "kg", 1m, now, now.AddDays(5)), autoSave: true);

            // Batch 2: Hết hạn sau 20 ngày (10 kg)
            var b2 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), ingredient.Id, "B002", 10m, 10m, "kg", 1m, now, now.AddDays(20)), autoSave: true);

            // Xuất 0.5 kg
            var result = await _inventoryManager.DeductFefoAsync(ingredient.Id, 0.5m, "ORDER-1");

            result.TotalDeducted.ShouldBe(0.5m);
            result.ShortageQuantity.ShouldBe(0);

            var reloadedB1 = await _batchRepository.GetAsync(b1.Id);
            var reloadedB2 = await _batchRepository.GetAsync(b2.Id);

            reloadedB1.RemainingQuantity.ShouldBe(1.5m);
            reloadedB2.RemainingQuantity.ShouldBe(10m); // Lô 2 chưa bị đụng tới
        });
    }

    [Fact]
    public async Task Should_Skip_Expired_Fresh_Batches()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var salmon = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Cá hồi tươi", "kg", 1, StorageType.FRESH), autoSave: true);

            var now = DateTime.UtcNow;
            // Batch hết hạn ngày hôm qua (2 kg)
            var expiredBatch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), salmon.Id, "EXP-1", 2m, 2m, "kg", 1m, now.AddDays(-2), now.AddDays(-1)), autoSave: true);

            // Batch còn hạn ngày mai (5 kg)
            var validBatch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), salmon.Id, "VAL-1", 5m, 5m, "kg", 1m, now, now.AddDays(1)), autoSave: true);

            // Xuất 1 kg
            var result = await _inventoryManager.DeductFefoAsync(salmon.Id, 1m, "ORDER-FRESH");

            result.TotalDeducted.ShouldBe(1m);
            result.ShortageQuantity.ShouldBe(0);

            var reloadedExp = await _batchRepository.GetAsync(expiredBatch.Id);
            var reloadedVal = await _batchRepository.GetAsync(validBatch.Id);

            reloadedExp.RemainingQuantity.ShouldBe(2m); // Phải bị bỏ qua, giữ nguyên 2 kg
            reloadedVal.RemainingQuantity.ShouldBe(4m); // Trừ vào lô còn hạn
        });
    }

    [Fact]
    public async Task Should_Deduct_Down_To_Zero_And_Report_Shortage_When_Insufficient()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var butter = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Bơ lạt", "kg", 1, StorageType.SHORT_TERM), autoSave: true);

            var now = DateTime.UtcNow;
            // Chỉ còn 0.1 kg
            var b1 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), butter.Id, "BUTTER-01", 0.1m, 0.1m, "kg", 1m, now, now.AddDays(10)), autoSave: true);

            // Cần xuất 0.25 kg
            var result = await _inventoryManager.DeductFefoAsync(butter.Id, 0.25m, "ORDER-INSUFFICIENT");

            result.TotalDeducted.ShouldBe(0.1m);
            result.ShortageQuantity.ShouldBe(0.15m);
            result.HasShortage.ShouldBeTrue();

            var reloadedB1 = await _batchRepository.GetAsync(b1.Id);
            reloadedB1.RemainingQuantity.ShouldBe(0); // Trừ hết về 0
        });
    }

    [Fact]
    public async Task Should_Prioritize_Expiring_Today_Fresh_Batches_And_Record_UnitCost()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var beef = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Thịt bò tươi", "kg", 2, StorageType.FRESH), autoSave: true);

            var now = DateTime.UtcNow;
            // Batch 1: Hết hạn sau 3 ngày (tồn 5 kg, unitCost = 250,000)
            var b1 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), beef.Id, "BEEF-DAY3", 5m, 5m, "kg", 1m, now, now.AddDays(3), unitCost: 250000m), autoSave: true);

            // Batch 2: Hết hạn trong 12 giờ tới (EXPIRING_TODAY, tồn 3 kg, unitCost = 280,000)
            var b2 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), beef.Id, "BEEF-EXP-TODAY", 3m, 3m, "kg", 1m, now, now.AddHours(12), unitCost: 280000m), autoSave: true);

            // Xuất 2 kg
            var result = await _inventoryManager.DeductFefoAsync(beef.Id, 2m, "ORDER-FEFO-PRIORITY");

            result.TotalDeducted.ShouldBe(2m);
            result.ShortageQuantity.ShouldBe(0);

            // Lô b2 phải được ưu tiên trừ trước
            var reloadedB2 = await _batchRepository.GetAsync(b2.Id);
            reloadedB2.RemainingQuantity.ShouldBe(1m);

            var reloadedB1 = await _batchRepository.GetAsync(b1.Id);
            reloadedB1.RemainingQuantity.ShouldBe(5m); // Chưa bị trừ

            // Kiểm tra giao dịch OUT ghi nhận đúng UnitCost của lô b2
            var txs = (await _transactionRepository.GetListAsync())
                .Where(x => x.IngredientId == beef.Id && x.TransactionType == InventoryTransactionType.OUT)
                .ToList();

            txs.Count.ShouldBe(1);
            txs.First().UnitCost.ShouldBe(280000m);
            txs.First().ReferenceId.ShouldBe("ORDER-FEFO-PRIORITY");
        });
    }
}

