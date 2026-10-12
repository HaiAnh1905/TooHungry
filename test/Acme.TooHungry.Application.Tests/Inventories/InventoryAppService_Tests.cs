using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IInventoryAppService _inventoryAppService;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;

    protected InventoryAppService_Tests()
    {
        _inventoryAppService = GetRequiredService<IInventoryAppService>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
    }

    [Fact]
    public async Task Should_Create_Batch_And_Increase_Stock()
    {
        var fish = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Cá Điêu Hồng", "kg", 5, StorageType.FRESH), autoSave: true);

        var batchDto = await _inventoryAppService.CreateBatchAsync(new CreateInventoryBatchDto
        {
            IngredientId = fish.Id,
            BatchCode = "FISH-BATCH-01",
            PurchaseQuantity = 5m,
            PurchaseUnit = "Két",
            ConversionFactor = 2m, // 5 Két * 2 = 10 kg
            ExpiryDate = DateTime.UtcNow.AddDays(1),
            UnitCost = 50000m
        });

        batchDto.ShouldNotBeNull();
        batchDto.Quantity.ShouldBe(10m);
        batchDto.RemainingQuantity.ShouldBe(10m);

        var txs = await _inventoryAppService.GetTransactionsAsync(fish.Id);
        txs.Count.ShouldBeGreaterThanOrEqualTo(1);
        txs.First().TransactionType.ShouldBe(InventoryTransactionType.IN);
        txs.First().Quantity.ShouldBe(10m);
    }

    [Fact]
    public async Task Should_Adjust_Stock_Through_AppService()
    {
        var salt = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Muối Hạt", "kg", 5, StorageType.LONG_TERM), autoSave: true);

        var now = DateTime.UtcNow;
        var b1 = await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), salt.Id, "SALT-01", 10m, 10m, "kg", 1m, now, now.AddYears(1)), autoSave: true);

        // Điều chỉnh giảm từ 10 kg xuống 3 kg (Difference = -7 kg)
        await _inventoryAppService.AdjustStockAsync(new StockAdjustmentRequestDto
        {
            IngredientId = salt.Id,
            ActualQuantity = 3m,
            Reason = "Đổ vỡ do vận chuyển",
            BatchDeductions = new List<BatchDeductionItemDto>
            {
                new() { BatchId = b1.Id, DeductQuantity = 7m }
            }
        });

        var reloaded = await _batchRepository.GetAsync(b1.Id);
        reloaded.RemainingQuantity.ShouldBe(3m);
    }

    [Fact]
    public async Task Should_Return_Alerts_For_Expired_Fresh_And_Near_Expiry()
    {
        var milk = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Sữa Tươi", "lít", 5, StorageType.FRESH), autoSave: true);

        var carrot = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Cà Rốt", "kg", 5, StorageType.SHORT_TERM), autoSave: true);

        var now = DateTime.UtcNow;
        // Lô FRESH đã hết hạn
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), milk.Id, "MILK-EXP", 2m, 2m, "lít", 1m, now.AddDays(-2), now.AddDays(-1)), autoSave: true);

        // Lô FRESH chưa hết hạn (sau 2 ngày) -> KHÔNG cảnh báo
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), milk.Id, "MILK-NEAR", 5m, 5m, "lít", 1m, now, now.AddDays(2)), autoSave: true);

        // Lô SHORT_TERM gần hết hạn (sau 2 ngày) -> CÓ cảnh báo NEAR_EXPIRY
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), carrot.Id, "CARROT-NEAR", 5m, 5m, "kg", 1m, now, now.AddDays(2)), autoSave: true);

        var alerts = await _inventoryAppService.GetAlertsAsync();

        alerts.ShouldContain(x => x.Type == "EXPIRED_FRESH" && x.Severity == "danger" && x.IngredientId == milk.Id);
        alerts.ShouldNotContain(x => x.BatchCode == "MILK-NEAR");
        alerts.ShouldContain(x => x.Type == "NEAR_EXPIRY" && x.Severity == "warning" && x.IngredientId == carrot.Id);
    }

    [Fact]
    public async Task Should_Auto_Generate_BatchCode_When_Empty_And_Record_UnitCost()
    {
        var pork = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Thịt Heo Nạc", "kg", 2, StorageType.FRESH), autoSave: true);

        var batchDto = await _inventoryAppService.CreateBatchAsync(new CreateInventoryBatchDto
        {
            IngredientId = pork.Id,
            BatchCode = "", // Để trống -> Tự sinh BATCH-yyyyMMddHHmmss
            PurchaseQuantity = 10m,
            ConversionFactor = 1m,
            ExpiryDate = DateTime.UtcNow.AddDays(5),
            UnitCost = 120000m
        });

        batchDto.BatchCode.ShouldStartWith("BATCH-");
        batchDto.UnitCost.ShouldBe(120000m);

        var txs = await _inventoryAppService.GetTransactionsAsync(pork.Id);
        var inTx = txs.FirstOrDefault(x => x.TransactionType == InventoryTransactionType.IN);
        inTx.ShouldNotBeNull();
        inTx.UnitCost.ShouldBe(120000m);
        inTx.BatchCode.ShouldBe(batchDto.BatchCode);
    }

    [Fact]
    public async Task Should_Throw_When_CreateBatch_With_Expired_Date()
    {
        var chicken = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Thịt Gà Ta", "kg", 2, StorageType.FRESH), autoSave: true);

        var ex = await Should.ThrowAsync<Volo.Abp.BusinessException>(async () =>
        {
            await _inventoryAppService.CreateBatchAsync(new CreateInventoryBatchDto
            {
                IngredientId = chicken.Id,
                BatchCode = "CHICKEN-EXP",
                PurchaseQuantity = 5m,
                ExpiryDate = DateTime.UtcNow.AddDays(-1), // Đã hết hạn
                UnitCost = 80000m
            });
        });

        ex.Code.ShouldBe("InventoryBatch:ExpiryDateMustBeInFuture");
    }

    [Fact]
    public async Task Should_Discard_Batch_And_Record_Adjustment_Out_Transaction()
    {
        var shrimp = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Tôm Sú", "kg", 1, StorageType.FRESH), autoSave: true);

        var now = DateTime.UtcNow;
        var batch = await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), shrimp.Id, "SHRIMP-01", 10m, 8m, "kg", 1m, now, now.AddDays(-1), unitCost: 320000m), autoSave: true);

        await _inventoryAppService.DiscardBatchAsync(batch.Id, new DiscardBatchInputDto
        {
            Reason = "Tôm bị ươn, xuất hủy"
        });

        var reloaded = await _batchRepository.GetAsync(batch.Id);
        reloaded.RemainingQuantity.ShouldBe(0m);
        reloaded.IsActive.ShouldBeFalse();

        var txs = await _inventoryAppService.GetTransactionsAsync(shrimp.Id);
        var discardTx = txs.FirstOrDefault(x => x.TransactionType == InventoryTransactionType.ADJUSTMENT_OUT);
        discardTx.ShouldNotBeNull();
        discardTx.Quantity.ShouldBe(8m);
        discardTx.UnitCost.ShouldBe(320000m);
        discardTx.Reason.ShouldBe("Tôm bị ươn, xuất hủy");
    }

    [Fact]
    public async Task Should_Filter_Batches_By_Ingredient_And_OnlyAvailable()
    {
        var onion = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Hành Tây", "kg", 1, StorageType.SHORT_TERM), autoSave: true);

        var now = DateTime.UtcNow;
        // Batch 1: Còn hàng
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), onion.Id, "ONION-01", 10m, 5m, "kg", 1m, now, now.AddDays(10)), autoSave: true);
        // Batch 2: Đã hết hàng
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), onion.Id, "ONION-02", 10m, 0m, "kg", 1m, now, now.AddDays(10)), autoSave: true);

        var resultOnlyAvailable = await _inventoryAppService.GetBatchesAsync(new GetInventoryBatchesInput
        {
            IngredientId = onion.Id,
            OnlyAvailable = true
        });

        resultOnlyAvailable.Items.Count.ShouldBe(1);
        resultOnlyAvailable.Items.First().BatchCode.ShouldBe("ONION-01");

        var resultAll = await _inventoryAppService.GetBatchesAsync(new GetInventoryBatchesInput
        {
            IngredientId = onion.Id,
            OnlyAvailable = false
        });

        resultAll.Items.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Should_Not_Return_Alert_For_Fresh_Batch_Before_Expiry_But_Alert_When_Expired()
    {
        var cheese = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), "Phô Mai Tươi", "kg", 1, StorageType.FRESH), autoSave: true);

        var now = DateTime.UtcNow;
        // Lô tươi sống chưa hết hạn (trong 12h) -> KHÔNG cảnh báo
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), cheese.Id, "CHEESE-TODAY", 3m, 3m, "kg", 1m, now, now.AddHours(12)), autoSave: true);

        // Lô tươi sống đã hết hạn -> CÓ cảnh báo EXPIRED_FRESH
        await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(), cheese.Id, "CHEESE-EXPIRED", 2m, 2m, "kg", 1m, now.AddDays(-1), now.AddHours(-1)), autoSave: true);

        var alerts = await _inventoryAppService.GetAlertsAsync();

        alerts.ShouldNotContain(x => x.BatchCode == "CHEESE-TODAY");
        alerts.ShouldContain(x => x.BatchCode == "CHEESE-EXPIRED" && x.AlertType == "EXPIRED_FRESH" && x.Severity == "danger");
    }
}

