using System;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryBatchDomainTests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly InventoryManager _inventoryManager;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    protected InventoryBatchDomainTests()
    {
        _inventoryManager = GetRequiredService<InventoryManager>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
    }

    [Fact]
    public void Batch_Deactivate_And_Reactivate_Domain_Methods_Should_Work()
    {
        var batch = new InventoryBatch(
            Guid.NewGuid(), Guid.NewGuid(), "BATCH-TEST-01", 10m, 10m, "kg", 1m, DateTime.UtcNow, DateTime.UtcNow.AddDays(10));

        batch.IsActive.ShouldBeTrue();
        batch.DeactivationReason.ShouldBeNull();

        // Deactivate
        batch.Deactivate("Chờ kiểm định chất lượng bao bì");
        batch.IsActive.ShouldBeFalse();
        batch.DeactivationReason.ShouldBe("Chờ kiểm định chất lượng bao bì");

        // Reactivate
        batch.Reactivate();
        batch.IsActive.ShouldBeTrue();
        batch.DeactivationReason.ShouldBeNull();
    }

    [Fact]
    public async Task FEFO_Algorithm_Should_Exclude_Inactive_Batches()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        Guid ingredientId = Guid.Empty;
        Guid batch1Id = Guid.Empty;
        Guid batch2Id = Guid.Empty;

        var now = DateTime.UtcNow;

        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), $"Bột Mì {suffix}", "kg", 10m, StorageType.SHORT_TERM), autoSave: true);
            ingredientId = ing.Id;

            // Batch 1: Hết hạn sớm hơn (5 ngày), nhưng BỊ TẠM KHÓA (IsActive = false)
            var b1 = new InventoryBatch(
                Guid.NewGuid(), ing.Id, $"BATCH-1-{suffix}", 10m, 10m, "kg", 1m, now, now.AddDays(5), isActive: false);
            b1.Deactivate("Nghi ngờ mốc");
            b1 = await _batchRepository.InsertAsync(b1, autoSave: true);
            batch1Id = b1.Id;

            // Batch 2: Hết hạn muộn hơn (10 ngày), đang HOẠT ĐỘNG (IsActive = true)
            var b2 = new InventoryBatch(
                Guid.NewGuid(), ing.Id, $"BATCH-2-{suffix}", 10m, 10m, "kg", 1m, now, now.AddDays(10), isActive: true);
            b2 = await _batchRepository.InsertAsync(b2, autoSave: true);
            batch2Id = b2.Id;
        });

        // Act: Khấu trừ FEFO 5 kg inside UnitOfWork
        await WithUnitOfWorkAsync(async () =>
        {
            var result = await _inventoryManager.DeductFefoAsync(ingredientId, 5m, "ORDER-TEST-001");
            result.TotalDeducted.ShouldBe(5m);
            result.ShortageQuantity.ShouldBe(0m);
        });

        // Assert: Trừ thành công 5 kg từ Batch 2, Batch 1 giữ nguyên 10 kg
        await WithUnitOfWorkAsync(async () =>
        {
            var b1 = await _batchRepository.GetAsync(batch1Id);
            b1.RemainingQuantity.ShouldBe(10m); // Không bị trừ

            var b2 = await _batchRepository.GetAsync(batch2Id);
            b2.RemainingQuantity.ShouldBe(5m); // Đã bị trừ 5kg
        });
    }
}
