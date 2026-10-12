using System;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Ingredients;

public abstract class IngredientAppService_SmartRestore_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IIngredientAppService _ingredientAppService;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    protected IngredientAppService_SmartRestore_Tests()
    {
        _ingredientAppService = GetRequiredService<IIngredientAppService>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
    }

    [Fact]
    public async Task Should_Throw_When_Creating_Duplicate_Deactivated_Ingredient_And_Allow_Smart_Restore()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var name = $"Nấm Truffle {suffix}";

        Guid inactiveId = Guid.Empty;
        await WithUnitOfWorkAsync(async () =>
        {
            var ing = new Ingredient(Guid.NewGuid(), name, "g", 100m, StorageType.SHORT_TERM);
            ing.Deactivate("Tạm ngưng nhập");
            ing = await _ingredientRepository.InsertAsync(ing, autoSave: true);
            inactiveId = ing.Id;
        });

        // 1. Thử tạo mới trùng tên -> Ném ngoại lệ chứa IngredientId
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _ingredientAppService.CreateAsync(new CreateIngredientDto
            {
                Name = name,
                BaseUnit = "g",
                MinStock = 50m
            });
        });

        ex.Data["IngredientId"].ShouldNotBeNull();
        ((Guid)ex.Data["IngredientId"]!).ShouldBe(inactiveId);

        // 2. Gọi SmartRestoreAsync để khôi phục kèm MinStock mới
        var restored = await _ingredientAppService.SmartRestoreAsync(inactiveId, new SmartRestoreDto
        {
            NewMinStock = 200m
        });

        restored.IsActive.ShouldBeTrue();
        restored.DeactivationReason.ShouldBeNull();
        restored.MinStock.ShouldBe(200m);
    }
}
