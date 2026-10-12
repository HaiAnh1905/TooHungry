using System;
using System.Threading.Tasks;
using Acme.TooHungry.Inventories;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Ingredients;

public abstract class IngredientAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IIngredientAppService _ingredientAppService;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;

    protected IngredientAppService_Tests()
    {
        _ingredientAppService = GetRequiredService<IIngredientAppService>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
    }

    [Fact]
    public async Task Should_Create_And_Get_Ingredient_With_StorageType()
    {
        var dto = await _ingredientAppService.CreateAsync(new CreateIngredientDto
        {
            Name = "Cá Hồi Na Uy",
            BaseUnit = "kg",
            MinStock = 5m,
            StorageType = StorageType.FRESH,
            ConsumptionMethod = ConsumptionMethod.RECIPE
        });

        dto.ShouldNotBeNull();
        dto.Name.ShouldBe("Cá Hồi Na Uy");
        dto.StorageType.ShouldBe(StorageType.FRESH);
        dto.IsActive.ShouldBeTrue();

        var loaded = await _ingredientAppService.GetAsync(dto.Id);
        loaded.ShouldNotBeNull();
        loaded.StorageType.ShouldBe(StorageType.FRESH);
    }

    [Fact]
    public async Task Should_Throw_AlreadyExistsInactive_When_Creating_Duplicate_Inactive_Ingredient()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Thịt Bò Úc", "kg", 2m, StorageType.FRESH)
            {
                IsActive = false,
                DeactivationReason = "Ngừng nhập"
            }, autoSave: true);
        });

        // Tạo mới nguyên liệu trùng tên "Thịt Bò Úc" đang bị inactive -> Báo lỗi để kích hoạt popup Smart Restore
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _ingredientAppService.CreateAsync(new CreateIngredientDto
            {
                Name = "Thịt Bò Úc",
                BaseUnit = "kg",
                MinStock = 5m,
                StorageType = StorageType.FRESH
            });
        });

        ex.Code.ShouldBe("Ingredient:AlreadyExistsInactive");
    }

    [Fact]
    public async Task Should_Smart_Restore_Inactive_Ingredient_And_Keep_Old_Stock()
    {
        Guid ingredientId = Guid.Empty;
        await WithUnitOfWorkAsync(async () =>
        {
            var ing = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Thịt Bò Wagyu", "kg", 2m, StorageType.FRESH)
            {
                IsActive = false,
                DeactivationReason = "Hết hàng lâu ngày"
            }, autoSave: true);
            ingredientId = ing.Id;

            // Tồn cũ 2 kg
            var now = DateTime.UtcNow;
            await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), ing.Id, "WAGYU-OLD", 2m, 2m, "kg", 1m, now, now.AddDays(5)), autoSave: true);
        });

        // Thực hiện Smart Restore với MinStock mới = 6 kg
        var restored = await _ingredientAppService.SmartRestoreAsync(ingredientId, new SmartRestoreDto
        {
            NewMinStock = 6m
        });

        restored.IsActive.ShouldBeTrue();
        restored.DeactivationReason.ShouldBeNull();
        restored.MinStock.ShouldBe(6m);
        restored.CurrentStock.ShouldBe(2m); // Giữ nguyên tồn cũ 2 kg
    }

    [Fact]
    public async Task Should_Calculate_CurrentStock_Excluding_Expired_Batches()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        var created = await _ingredientAppService.CreateAsync(new CreateIngredientDto
        {
            Name = $"Sữa Tươi {idStr}",
            BaseUnit = "lít",
            MinStock = 10m,
            EstimatedPrice = 25000m,
            StorageType = StorageType.SHORT_TERM,
            ConsumptionMethod = ConsumptionMethod.RECIPE
        });

        var now = DateTime.UtcNow;
        // Batch 1: Còn hạn 5 lít
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), created.Id, $"VALID-{idStr}", 5m, 5m, "lít", 1m, now, now.AddDays(7)
        ), autoSave: true);

        // Batch 2: Đã quá hạn 3 lít
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), created.Id, $"EXPIRED-{idStr}", 3m, 3m, "lít", 1m, now.AddDays(-10), now.AddDays(-1)
        ), autoSave: true);

        var detail = await _ingredientAppService.GetAsync(created.Id);
        detail.CurrentStock.ShouldBe(5m); // Chỉ tính batch còn hạn
        detail.ExpiredStock.ShouldBe(3m); // Báo cáo tồn quá hạn riêng
    }

    [Fact]
    public async Task Should_Deactivate_And_Reactivate_Ingredient()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        var created = await _ingredientAppService.CreateAsync(new CreateIngredientDto
        {
            Name = $"Bơ Lạt {idStr}",
            BaseUnit = "kg",
            MinStock = 2m,
            EstimatedPrice = 80000m,
            StorageType = StorageType.SHORT_TERM,
            ConsumptionMethod = ConsumptionMethod.RECIPE
        });

        // Deactivate
        var deactivated = await _ingredientAppService.DeactivateAsync(created.Id, "Nhà cung cấp tạm ngưng sản xuất");
        deactivated.IsActive.ShouldBeFalse();
        deactivated.DeactivationReason.ShouldBe("Nhà cung cấp tạm ngưng sản xuất");

        // Reactivate
        var reactivated = await _ingredientAppService.ReactivateAsync(created.Id);
        reactivated.IsActive.ShouldBeTrue();
        reactivated.DeactivationReason.ShouldBeNull();
    }

    [Fact]
    public async Task Should_Delete_Unused_Ingredient_Successfully()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        var created = await _ingredientAppService.CreateAsync(new CreateIngredientDto
        {
            Name = $"Gia Vị Thử Nghiệm {idStr}",
            BaseUnit = "g",
            MinStock = 0m,
            EstimatedPrice = 5000m,
            StorageType = StorageType.LONG_TERM,
            ConsumptionMethod = ConsumptionMethod.RECIPE
        });

        await _ingredientAppService.DeleteAsync(created.Id);

        var ex = await Should.ThrowAsync<Exception>(async () =>
        {
            await _ingredientAppService.GetAsync(created.Id);
        });
        ex.ShouldNotBeNull();
    }
}
