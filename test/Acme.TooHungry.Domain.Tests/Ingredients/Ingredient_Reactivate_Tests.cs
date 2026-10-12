using System;
using Shouldly;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Ingredients;

public abstract class Ingredient_Reactivate_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    [Fact]
    public void Ingredient_Reactivate_Should_Reset_IsActive_And_Clear_DeactivationReason()
    {
        var ingredient = new Ingredient(Guid.NewGuid(), "Mù tạt Wasabi", "hộp", 5m, StorageType.SHORT_TERM);
        ingredient.Deactivate("Hết hạn hợp đồng cung cấp");

        ingredient.IsActive.ShouldBeFalse();
        ingredient.DeactivationReason.ShouldBe("Hết hạn hợp đồng cung cấp");

        // Reactivate
        ingredient.Reactivate();

        ingredient.IsActive.ShouldBeTrue();
        ingredient.DeactivationReason.ShouldBeNull();
    }
}
