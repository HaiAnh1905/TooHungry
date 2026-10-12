using System;
using System.Threading.Tasks;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Orders;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.Tables;

public abstract class TableAppService_Status_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly ITableAppService _tableAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected TableAppService_Status_Tests()
    {
        _tableAppService = GetRequiredService<ITableAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task Should_Allow_Occupied_Status_With_No_Order()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-STATUS-NO-ORDER-01",
            Capacity = 4,
            Status = TableStatus.Available
        }, autoSave: true);

        // Act - Tiếp đón khách (Available -> Occupied)
        var updated = await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Occupied);

        // Assert
        updated.Status.ShouldBe(TableStatus.Occupied);
        updated.HasActiveOrder.ShouldBeFalse();
        updated.ActiveOrderId.ShouldBeNull();

        var inDb = await _tableRepository.GetAsync(table.Id);
        inDb.Status.ShouldBe(TableStatus.Occupied);
    }

    [Fact]
    public async Task Should_Allow_Freeing_Occupied_Table_When_No_Order()
    {
        // Arrange: Bàn Occupied nhưng khách không gọi món
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-STATUS-FREE-EMPTY-01",
            Capacity = 4,
            Status = TableStatus.Occupied
        }, autoSave: true);

        // Act: Kết thúc bữa ăn không có món -> chuyển về Available
        var updated = await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Available);

        // Assert
        updated.Status.ShouldBe(TableStatus.Available);
        var inDb = await _tableRepository.GetAsync(table.Id);
        inDb.Status.ShouldBe(TableStatus.Available);
    }

    [Fact]
    public async Task Should_Prevent_Freeing_Occupied_Table_When_Active_Order_Exists()
    {
        // Arrange: Bàn Occupied có đơn hàng đang xử lý
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-STATUS-ACTIVE-ORDER-01",
            Capacity = 4,
            Status = TableStatus.Occupied
        }, autoSave: true);

        await _orderRepository.InsertAsync(new Order
        {
            OrderNumber = "ORD-TEST-001",
            TableId = table.Id,
            Status = OrderStatus.Processing
        }, autoSave: true);

        // Act & Assert: Chặn giải phóng về Available khi chưa thanh toán
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Available);
        });
    }

    [Fact]
    public async Task Should_Allow_Cleaning_To_Available()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-STATUS-CLEAN-01",
            Capacity = 4,
            Status = TableStatus.Cleaning
        }, autoSave: true);

        // Act: Dọn dẹp xong -> Available
        var updated = await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Available);

        // Assert
        updated.Status.ShouldBe(TableStatus.Available);
    }

    [Fact]
    public async Task Should_Prevent_Seating_When_Cleaning()
    {
        // Arrange: Bàn đang dọn dẹp
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-STATUS-CLEAN-BLOCK-01",
            Capacity = 4,
            Status = TableStatus.Cleaning
        }, autoSave: true);

        // Act & Assert: Không cho đón khách khi chưa dọn xong
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Occupied);
        });
    }

    [Fact]
    public async Task Should_Prevent_Seating_When_Already_Occupied_Concurrent()
    {
        // Arrange: Bàn đã có khách
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-STATUS-CONCURRENT-01",
            Capacity = 4,
            Status = TableStatus.Occupied
        }, autoSave: true);

        // Act & Assert: Nhân viên khác bấm đón khách tiếp trên cùng bàn -> Bị từ chối
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Occupied);
        });
    }

    [Fact]
    public async Task Should_Prevent_Direct_Status_Change_When_Disabled()
    {
        // Arrange: Bàn bị vô hiệu hóa
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-STATUS-DISABLED-01",
            Capacity = 4,
            Status = TableStatus.Disabled
        }, autoSave: true);

        // Act & Assert: Không cho chuyển sang Occupied mà phải kích hoạt trước
        await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await _tableAppService.ChangeStatusAsync(table.Id, TableStatus.Occupied);
        });
    }
}
