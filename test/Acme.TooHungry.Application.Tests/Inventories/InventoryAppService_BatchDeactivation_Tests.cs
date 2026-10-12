using System;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryAppService_BatchDeactivation_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IInventoryAppService _inventoryAppService;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    protected InventoryAppService_BatchDeactivation_Tests()
    {
        _inventoryAppService = GetRequiredService<IInventoryAppService>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
    }

    [Fact]
    public async Task Should_Deactivate_And_Reactivate_Batch_Via_AppService()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        Guid ingredientId = Guid.Empty;
        Guid batchId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), $"Trứng Gà {suffix}", "quả", 20m, StorageType.SHORT_TERM), autoSave: true);
            ingredientId = ing.Id;

            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), ing.Id, $"BATCH-EGG-{suffix}", 50m, 50m, "quả", 1m, DateTime.UtcNow, DateTime.UtcNow.AddDays(14)), autoSave: true);
            batchId = batch.Id;
        });

        // 1. Deactivate batch
        var deactivated = await _inventoryAppService.DeactivateBatchAsync(batchId, new DeactivateBatchDto
        {
            ReasonCode = "PACKAGING_DEFECT",
            Reason = "Vỡ vỏ hộp đựng"
        });

        deactivated.IsActive.ShouldBeFalse();
        deactivated.DeactivationReason.ShouldBe("Vỡ vỏ hộp đựng");

        // 2. Reactivate batch
        var reactivated = await _inventoryAppService.ReactivateBatchAsync(batchId);

        reactivated.IsActive.ShouldBeTrue();
        reactivated.DeactivationReason.ShouldBeNull();
    }
}
