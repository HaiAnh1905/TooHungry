using System;
using System.Threading.Tasks;
using Acme.TooHungry.DiningAreas;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.Tables;

public abstract class TableAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly ITableAppService _tableAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;

    protected TableAppService_Tests()
    {
        _tableAppService = GetRequiredService<ITableAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _diningAreaRepository = GetRequiredService<IRepository<DiningArea, Guid>>();
    }

    [Fact]
    public async Task Should_Create_Table_Successfully()
    {
        // Arrange
        var area = await _diningAreaRepository.InsertAsync(new DiningArea
        {
            Name = "Khu Bàn Hợp Lệ",
            IsActive = true
        }, autoSave: true);

        // Act
        var result = await _tableAppService.CreateAsync(new CreateUpdateTableDto
        {
            Name = "BAN-TEST-001",
            Capacity = 6,
            DiningAreaId = area.Id
        });

        // Assert
        result.ShouldNotBeNull();
        result.Name.ShouldBe("BAN-TEST-001");
        result.Capacity.ShouldBe(6);
        result.Status.ShouldBe(TableStatus.Available);
    }

    [Fact]
    public async Task Should_Prevent_Duplicate_Table_Name()
    {
        // Arrange
        await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "BAN-TRUNG-01",
            Capacity = 4,
            Status = TableStatus.Available
        }, autoSave: true);

        // Act & Assert
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _tableAppService.CreateAsync(new CreateUpdateTableDto
            {
                Name = "BAN-TRUNG-01",
                Capacity = 4
            });
        });
    }

    [Fact]
    public async Task Should_Prevent_Creating_Table_In_Inactive_Area()
    {
        // Arrange
        var inactiveArea = await _diningAreaRepository.InsertAsync(new DiningArea
        {
            Name = "Khu Đã Đóng Cửa",
            IsActive = false
        }, autoSave: true);

        // Act & Assert
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _tableAppService.CreateAsync(new CreateUpdateTableDto
            {
                Name = "BAN-KHU-KHOA",
                Capacity = 4,
                DiningAreaId = inactiveArea.Id
            });
        });
    }

    [Fact]
    public async Task Should_Prevent_Deleting_Table_When_Occupied()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "BAN-DANG-CO-KHACH",
            Capacity = 4,
            Status = TableStatus.Occupied
        }, autoSave: true);

        // Act & Assert
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _tableAppService.DeleteAsync(table.Id);
        });
    }

    [Fact]
    public async Task Should_Change_Table_Status()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "BAN-DOI-TRANG-THAI",
            Capacity = 4,
            Status = TableStatus.Available
        }, autoSave: true);

        // Act
        var updated = await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Occupied);

        // Assert
        updated.Status.ShouldBe(TableStatus.Occupied);
        var tableInDb = await _tableRepository.GetAsync(table.Id);
        tableInDb.Status.ShouldBe(TableStatus.Occupied);
    }
}
