using System;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryManager_Fefo_Consumption_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly InventoryManager _inventoryManager;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;

    protected InventoryManager_Fefo_Consumption_Tests()
    {
        _inventoryManager = GetRequiredService<InventoryManager>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
    }

    [Fact]
    public async Task DeductFefoAsync_Should_Consume_Multiple_Batches_In_Earliest_Expiry_Order()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var now = DateTime.UtcNow;

            var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(),
                $"Nguyên liệu Đa Lô {Guid.NewGuid():N}"[..18],
                "kg",
                2.0m,
                StorageType.SHORT_TERM,
                ConsumptionMethod.RECIPE,
                100000m
            ), autoSave: true);

            // Lô 1: Hạn 5 ngày nữa (Hết hạn sớm nhất) - 4kg
            var batch1 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingredient.Id,
                $"BATCH-EXP-05-{Guid.NewGuid():N}"[..18],
                4.0m,
                4.0m,
                "kg",
                1.0m,
                now,
                now.AddDays(5),
                null,
                unitCost: 100000m
            ), autoSave: true);

            // Lô 2: Hạn 15 ngày nữa - 6kg
            var batch2 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingredient.Id,
                $"BATCH-EXP-15-{Guid.NewGuid():N}"[..18],
                6.0m,
                6.0m,
                "kg",
                1.0m,
                now,
                now.AddDays(15),
                null,
                unitCost: 100000m
            ), autoSave: true);

            // Lô 3: Hạn 30 ngày nữa (Hạn xa nhất) - 10kg
            var batch3 = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                ingredient.Id,
                $"BATCH-EXP-30-{Guid.NewGuid():N}"[..18],
                10.0m,
                10.0m,
                "kg",
                1.0m,
                now,
                now.AddDays(30),
                null,
                unitCost: 100000m
            ), autoSave: true);

            // Khấu trừ 7kg: Lô 1 hết 4kg, Lô 2 trừ tiếp 3kg, Lô 3 giữ nguyên 10kg
            var result = await _inventoryManager.DeductFefoAsync(ingredient.Id, 7.0m, "TX-FEFO-MULTI");

            result.TotalDeducted.ShouldBe(7.0m);
            result.ShortageQuantity.ShouldBe(0.0m);

            // Kiểm tra từng lô
            var reloaded1 = await _batchRepository.GetAsync(batch1.Id);
            reloaded1.RemainingQuantity.ShouldBe(0.0m);

            var reloaded2 = await _batchRepository.GetAsync(batch2.Id);
            reloaded2.RemainingQuantity.ShouldBe(3.0m); // 6 - 3 = 3kg

            var reloaded3 = await _batchRepository.GetAsync(batch3.Id);
            reloaded3.RemainingQuantity.ShouldBe(10.0m); // Giữ nguyên
        });
    }

    [Fact]
    public async Task DeductFefoAsync_Should_Skip_Expired_Fresh_Batches()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var now = DateTime.UtcNow;

            // Nguyên liệu tươi sống FRESH
            var freshIngredient = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(),
                $"Cá Hồi Tươi {Guid.NewGuid():N}"[..18],
                "kg",
                1.0m,
                StorageType.FRESH,
                ConsumptionMethod.RECIPE,
                350000m
            ), autoSave: true);

            // Lô 1: Đã hết hạn (quá hạn 2 tiếng) - 5kg
            var expiredBatch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                freshIngredient.Id,
                $"BATCH-FRESH-EXP-{Guid.NewGuid():N}"[..18],
                5.0m,
                5.0m,
                "kg",
                1.0m,
                now.AddDays(-1),
                now.AddHours(-2),
                null,
                unitCost: 350000m
            ), autoSave: true);

            // Lô 2: Còn hạn (còn 8 tiếng) - 10kg
            var validBatch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                freshIngredient.Id,
                $"BATCH-FRESH-VAL-{Guid.NewGuid():N}"[..18],
                10.0m,
                10.0m,
                "kg",
                1.0m,
                now,
                now.AddHours(8),
                null,
                unitCost: 350000m
            ), autoSave: true);

            // Khấu trừ 3kg món ăn
            var result = await _inventoryManager.DeductFefoAsync(freshIngredient.Id, 3.0m, "TX-FEFO-FRESH");

            result.TotalDeducted.ShouldBe(3.0m);
            result.ShortageQuantity.ShouldBe(0.0m);

            // 1. Lô FRESH hết hạn phải bị BỎ QUA hoàn toàn, không được dùng để chế biến cho khách
            var reloadedExpired = await _batchRepository.GetAsync(expiredBatch.Id);
            reloadedExpired.RemainingQuantity.ShouldBe(5.0m);

            // 2. Lô FRESH còn hạn được dùng để xuất trừ: 10 - 3 = 7kg
            var reloadedValid = await _batchRepository.GetAsync(validBatch.Id);
            reloadedValid.RemainingQuantity.ShouldBe(7.0m);
        });
    }
}
