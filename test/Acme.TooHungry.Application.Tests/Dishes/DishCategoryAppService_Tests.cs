using System;
using System.Linq;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Dishes;

public abstract class DishCategoryAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IDishCategoryAppService _dishCategoryAppService;
    private readonly IDishAppService _dishAppService;

    protected DishCategoryAppService_Tests()
    {
        _dishCategoryAppService = GetRequiredService<IDishCategoryAppService>();
        _dishAppService = GetRequiredService<IDishAppService>();
    }

    [Fact]
    public async Task Should_Create_Category_And_Get_In_List()
    {
        var created = await _dishCategoryAppService.CreateAsync(new CreateUpdateDishCategoryDto
        {
            Name = "Món Tráng Miệng",
            Description = "Chè, kem, trái cây"
        });

        created.ShouldNotBeNull();
        created.Name.ShouldBe("Món Tráng Miệng");

        var list = await _dishCategoryAppService.GetListAsync(new PagedAndSortedResultRequestDto());
        list.Items.ShouldContain(x => x.Id == created.Id);
    }

    [Fact]
    public async Task Should_Prevent_Deleting_Category_With_Dishes()
    {
        var category = await _dishCategoryAppService.CreateAsync(new CreateUpdateDishCategoryDto
        {
            Name = "Danh Mục Có Món"
        });

        await _dishAppService.CreateAsync(new CreateUpdateDishDto
        {
            Name = "Món Trong Danh Mục",
            Price = 25000m,
            DishCategoryId = category.Id
        });

        var exception = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _dishCategoryAppService.DeleteAsync(category.Id);
        });

        exception.Code.ShouldBe(TooHungryDomainErrorCodes.DishCategoryCannotDeleteWithDishes);
    }

    [Fact]
    public async Task Should_Sort_Categories_By_DisplayOrder_Ascending()
    {
        var cat1 = await _dishCategoryAppService.CreateAsync(new CreateUpdateDishCategoryDto
        {
            Name = "Đồ uống - Order 20",
            DisplayOrder = 20
        });

        var cat2 = await _dishCategoryAppService.CreateAsync(new CreateUpdateDishCategoryDto
        {
            Name = "Khai vị - Order 1",
            DisplayOrder = 1
        });

        var list = await _dishCategoryAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            MaxResultCount = 100
        });

        var indexCat1 = list.Items.ToList().FindIndex(x => x.Id == cat1.Id);
        var indexCat2 = list.Items.ToList().FindIndex(x => x.Id == cat2.Id);

        indexCat2.ShouldBeLessThan(indexCat1);
    }
}
