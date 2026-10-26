using System;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Dishes;

public abstract class DishCategoryManager_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly DishCategoryManager _categoryManager;

    protected DishCategoryManager_Tests()
    {
        _categoryManager = GetRequiredService<DishCategoryManager>();
    }

    [Fact]
    public async Task Should_Create_Category_Successfully()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var name = $"Món Nướng Đặc Biệt {Guid.NewGuid():N}";
            var category = await _categoryManager.CreateAsync(name, "Danh mục món nướng than hoa", displayOrder: 5);

            category.ShouldNotBeNull();
            category.Name.ShouldBe(name);
            category.Description.ShouldBe("Danh mục món nướng than hoa");
            category.DisplayOrder.ShouldBe(5);
        });
    }

    [Fact]
    public async Task Should_Not_Allow_Duplicate_Category_Name_Case_Insensitive()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var baseName = $"Lẩu Nướng {Guid.NewGuid():N}";
            await _categoryManager.CreateAsync(baseName);

            var exception = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _categoryManager.CreateAsync(baseName.ToLowerInvariant());
            });

            exception.Code.ShouldBe(TooHungryDomainErrorCodes.DishCategoryNameAlreadyExists);
        });
    }

    [Fact]
    public async Task Should_Check_Can_Delete_Category_When_Has_Dishes()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var category = await _categoryManager.CreateAsync($"Danh mục thử xóa {Guid.NewGuid():N}");
            var dishRepo = GetRequiredService<Volo.Abp.Domain.Repositories.IRepository<Dish, Guid>>();
            await dishRepo.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Món test {Guid.NewGuid():N}",
                Price = 10000m,
                DishCategoryId = category.Id
            }, autoSave: true);

            var exception = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _categoryManager.CheckCanDeleteAsync(category.Id);
            });

            exception.Code.ShouldBe(TooHungryDomainErrorCodes.DishCategoryCannotDeleteWithDishes);
        });
    }
}
