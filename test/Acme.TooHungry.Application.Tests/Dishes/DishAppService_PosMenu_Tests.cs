using System;
using System.Linq;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Dishes;

public abstract class DishAppService_PosMenu_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IDishAppService _dishAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<DishCategory, Guid> _categoryRepository;

    protected DishAppService_PosMenu_Tests()
    {
        _dishAppService = GetRequiredService<IDishAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _categoryRepository = GetRequiredService<IRepository<DishCategory, Guid>>();
    }

    [Fact]
    public async Task Should_Return_Active_Dishes_With_Category_For_POS()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var cat = await _categoryRepository.InsertAsync(new DishCategory(Guid.NewGuid())
            {
                Name = "Món Khai Vị POS",
                DisplayOrder = 1
            }, autoSave: true);

            var activeDish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Gỏi Cuốn Tôm Thịt",
                Price = 65000m,
                DishCategoryId = cat.Id,
                IsActive = true
            }, autoSave: true);

            var inactiveDish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Món Tạm Ngưng",
                Price = 80000m,
                DishCategoryId = cat.Id,
                IsActive = false
            }, autoSave: true);

            var result = await _dishAppService.GetMenuForPosAsync();
            result.Items.ShouldNotBeNull();
            result.Items.Any(x => x.Id == activeDish.Id).ShouldBeTrue();
            result.Items.Any(x => x.Id == inactiveDish.Id).ShouldBeFalse();

            var item = result.Items.First(x => x.Id == activeDish.Id);
            item.DishCategoryName.ShouldBe("Món Khai Vị POS");
            item.Price.ShouldBe(65000m);
        });
    }
}
