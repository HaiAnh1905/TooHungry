using System;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Dishes;

public abstract class DishManager_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly DishManager _dishManager;
    private readonly DishCategoryManager _categoryManager;

    protected DishManager_Tests()
    {
        _dishManager = GetRequiredService<DishManager>();
        _categoryManager = GetRequiredService<DishCategoryManager>();
    }

    [Fact]
    public async Task Should_Create_Dish_With_Decimal_Price_And_IsActive_True()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var category = await _categoryManager.CreateAsync($"Hải Sản {Guid.NewGuid():N}");

            var dish = await _dishManager.CreateAsync(
                name: $"Tôm Hùm Nướng Bơ Tỏi {Guid.NewGuid():N}",
                price: 450000.50m,
                dishCategoryId: category.Id,
                description: "Tôm hùm tươi sống nướng sốt bơ tỏi",
                isActive: true
            );

            dish.ShouldNotBeNull();
            dish.Price.ShouldBe(450000.50m);
            dish.IsActive.ShouldBeTrue();
        });
    }

    [Fact]
    public async Task Should_Not_Allow_Negative_Price()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var exception = await Should.ThrowAsync<UserFriendlyException>(async () =>
            {
                await _dishManager.CreateAsync(
                    name: $"Món Giá Âm {Guid.NewGuid():N}",
                    price: -1000m
                );
            });

            exception.Message.ShouldContain("không được là số âm");
        });
    }

    [Fact]
    public async Task Should_Not_Allow_Duplicate_Dish_Name()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var baseName = $"Phở Bò Tái {Guid.NewGuid():N}";
            await _dishManager.CreateAsync(baseName, 65000m);

            var exception = await Should.ThrowAsync<UserFriendlyException>(async () =>
            {
                await _dishManager.CreateAsync(baseName.ToLowerInvariant(), 70000m);
            });

            exception.Message.ShouldContain("đã tồn tại");
        });
    }

    [Fact]
    public async Task Should_Toggle_IsActive()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishManager.CreateAsync($"Bún Chả Hà Nội {Guid.NewGuid():N}", 50000m, isActive: true);
            dish.IsActive.ShouldBeTrue();

            var toggled = await _dishManager.ToggleActiveAsync(dish);
            toggled.IsActive.ShouldBeFalse();
        });
    }

    [Fact]
    public async Task Should_Delete_With_Reason()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishManager.CreateAsync($"Món Sắp Hủy {Guid.NewGuid():N}", 30000m);

            await _dishManager.DeleteWithReasonAsync(dish, "Ngừng kinh doanh do hết mùa nguyên liệu");
            dish.DeletionReason.ShouldBe("Ngừng kinh doanh do hết mùa nguyên liệu");
        });
    }
}
