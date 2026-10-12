using System;
using System.Linq;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Dishes;

public abstract class DishAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IDishAppService _dishAppService;
    private readonly IDishCategoryAppService _dishCategoryAppService;

    protected DishAppService_Tests()
    {
        _dishAppService = GetRequiredService<IDishAppService>();
        _dishCategoryAppService = GetRequiredService<IDishCategoryAppService>();
    }

    [Fact]
    public async Task Should_Create_Dish()
    {
        var category = await _dishCategoryAppService.CreateAsync(new CreateUpdateDishCategoryDto
        {
            Name = "Món Súp"
        });

        var dish = await _dishAppService.CreateAsync(new CreateUpdateDishDto
        {
            Name = "Súp Cua Bắp Non",
            Price = 45000m,
            DishCategoryId = category.Id,
            Description = "Súp cua nóng hổi"
        });

        dish.ShouldNotBeNull();
        dish.Price.ShouldBe(45000m);

        var reloadedDish = await _dishAppService.GetAsync(dish.Id);
        reloadedDish.ShouldNotBeNull();
        reloadedDish.Name.ShouldBe("Súp Cua Bắp Non");
    }

    [Fact]
    public async Task Should_Delete_Dish_With_Reason()
    {
        var dish = await _dishAppService.CreateAsync(new CreateUpdateDishDto
        {
            Name = "Món Cần Xóa",
            Price = 10000m
        });

        await _dishAppService.DeleteWithReasonAsync(dish.Id, new DeleteDishDto
        {
            DeletionReason = "Không đạt tiêu chuẩn kiểm định an toàn"
        });

        var list = await _dishAppService.GetListAsync(new GetDishesInput());
        list.Items.ShouldNotContain(x => x.Id == dish.Id);
    }

    [Fact]
    public async Task Should_Bulk_Toggle_Active_Dishes()
    {
        var dish1 = await _dishAppService.CreateAsync(new CreateUpdateDishDto
        {
            Name = $"Món Bulk 1 {Guid.NewGuid():N}",
            Price = 20000m,
            IsActive = true
        });

        var dish2 = await _dishAppService.CreateAsync(new CreateUpdateDishDto
        {
            Name = $"Món Bulk 2 {Guid.NewGuid():N}",
            Price = 30000m,
            IsActive = true
        });

        var result = await _dishAppService.BulkToggleActiveAsync(new BulkToggleActiveDishDto
        {
            DishIds = [dish1.Id, dish2.Id],
            IsActive = false
        });

        result.Success.ShouldBeTrue();
        result.UpdatedCount.ShouldBe(2);

        var reloaded1 = await _dishAppService.GetAsync(dish1.Id);
        var reloaded2 = await _dishAppService.GetAsync(dish2.Id);

        reloaded1.IsActive.ShouldBeFalse();
        reloaded2.IsActive.ShouldBeFalse();
    }

    [Fact]
    public async Task Should_Order_Menu_For_Pos_By_Category_DisplayOrder()
    {
        var catLow = await _dishCategoryAppService.CreateAsync(new CreateUpdateDishCategoryDto
        {
            Name = "Món Ưu Tiên 1",
            DisplayOrder = 1
        });

        var catHigh = await _dishCategoryAppService.CreateAsync(new CreateUpdateDishCategoryDto
        {
            Name = "Món Ưu Tiên 99",
            DisplayOrder = 99
        });

        var dishLow = await _dishAppService.CreateAsync(new CreateUpdateDishDto
        {
            Name = "Món Bếp 1",
            Price = 50000m,
            DishCategoryId = catLow.Id,
            IsActive = true
        });

        var dishHigh = await _dishAppService.CreateAsync(new CreateUpdateDishDto
        {
            Name = "Món Bếp 99",
            Price = 60000m,
            DishCategoryId = catHigh.Id,
            IsActive = true
        });

        var posMenu = await _dishAppService.GetMenuForPosAsync();
        var indexLow = posMenu.Items.ToList().FindIndex(x => x.Id == dishLow.Id);
        var indexHigh = posMenu.Items.ToList().FindIndex(x => x.Id == dishHigh.Id);

        indexLow.ShouldBeLessThan(indexHigh);
    }
}
