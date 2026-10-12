using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.DiningAreas;

public abstract class DiningAreaAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly IDiningAreaAppService _diningAreaAppService;
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;

    protected DiningAreaAppService_Tests()
    {
        _diningAreaAppService = GetRequiredService<IDiningAreaAppService>();
        _diningAreaRepository = GetRequiredService<IRepository<DiningArea, Guid>>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
    }

    [Fact]
    public async Task Should_Create_DiningArea_With_IsActive_True()
    {
        // Act
        var result = await _diningAreaAppService.CreateAsync(new CreateUpdateDiningAreaDto
        {
            Name = "Sân Vườn Test",
            Description = "Mô tả test",
            IsActive = true
        });

        // Assert
        result.ShouldNotBeNull();
        result.Name.ShouldBe("Sân Vườn Test");
        result.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task Should_Deactivate_DiningArea_And_Set_Tables_Disabled()
    {
        // Arrange
        var area = await _diningAreaRepository.InsertAsync(new DiningArea
        {
            Name = "Khu Vực Bàn Trống",
            IsActive = true
        }, autoSave: true);

        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-BAN-01",
            Capacity = 4,
            Status = TableStatus.Available,
            DiningAreaId = area.Id
        }, autoSave: true);

        // Act
        await _diningAreaAppService.DeactivateAsync(area.Id);

        // Assert
        var updatedArea = await _diningAreaRepository.GetAsync(area.Id);
        updatedArea.IsActive.ShouldBeFalse();

        var updatedTable = await _tableRepository.GetAsync(table.Id);
        updatedTable.Status.ShouldBe(TableStatus.Disabled);
    }

    [Fact]
    public async Task Should_Prevent_Deactivation_When_Table_Occupied()
    {
        // Arrange
        var area = await _diningAreaRepository.InsertAsync(new DiningArea
        {
            Name = "Khu Vực Có Khách",
            IsActive = true
        }, autoSave: true);

        await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-BAN-02",
            Capacity = 4,
            Status = TableStatus.Occupied,
            DiningAreaId = area.Id
        }, autoSave: true);

        // Act & Assert
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _diningAreaAppService.DeactivateAsync(area.Id);
        });
    }

    [Fact]
    public async Task Should_Prevent_Hard_Delete_Of_DiningArea()
    {
        // Arrange
        var area = await _diningAreaRepository.InsertAsync(new DiningArea
        {
            Name = "Khu Vực Thử Xóa",
            IsActive = true
        }, autoSave: true);

        // Act & Assert
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _diningAreaAppService.DeleteAsync(area.Id);
        });
    }
}
