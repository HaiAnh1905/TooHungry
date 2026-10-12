using System;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryBatch_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    [Fact]
    public void Should_Initialize_Batch_Properly()
    {
        var now = DateTime.UtcNow;
        var batch = new InventoryBatch(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "BATCH-001",
            45m,
            45m,
            "Thùng",
            15m,
            now,
            now.AddDays(10),
            unitCost: 200000m
        );

        batch.BatchCode.ShouldBe("BATCH-001");
        batch.Quantity.ShouldBe(45m);
        batch.RemainingQuantity.ShouldBe(45m);
        batch.PurchaseUnit.ShouldBe("Thùng");
        batch.ConversionFactor.ShouldBe(15m);
        batch.UnitCost.ShouldBe(200000m);
        batch.IsActive.ShouldBeTrue();
    }

    [Fact]
    public void Should_Deduct_Quantity_Safely_And_Not_Negative()
    {
        var now = DateTime.UtcNow;
        var batch = new InventoryBatch(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "BATCH-002",
            10m,
            10m,
            "kg",
            1m,
            now,
            now.AddDays(5)
        );

        var deducted1 = batch.DeductQuantity(4m);
        deducted1.ShouldBe(4m);
        batch.RemainingQuantity.ShouldBe(6m);

        var deducted2 = batch.DeductQuantity(10m);
        deducted2.ShouldBe(6m);
        batch.RemainingQuantity.ShouldBe(0m);

        var deducted3 = batch.DeductQuantity(5m);
        deducted3.ShouldBe(0m);
        batch.RemainingQuantity.ShouldBe(0m);
    }

    [Fact]
    public void Should_Discard_Batch_Set_Zero_And_Inactive()
    {
        var now = DateTime.UtcNow;
        var batch = new InventoryBatch(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "BATCH-DISCARD",
            20m,
            15m,
            "kg",
            1m,
            now,
            now.AddDays(-1)
        );

        batch.Discard();

        batch.RemainingQuantity.ShouldBe(0m);
        batch.IsActive.ShouldBeFalse();
    }

    [Fact]
    public void Should_Throw_When_Negative_Quantity()
    {
        var now = DateTime.UtcNow;
        var ex = Should.Throw<BusinessException>(() =>
        {
            _ = new InventoryBatch(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "INVALID",
                -5m,
                -5m,
                "kg",
                1m,
                now,
                now.AddDays(5)
            );
        });

        ex.Code.ShouldBe("InventoryBatch:QuantityMustBeNonNegative");
    }
}
