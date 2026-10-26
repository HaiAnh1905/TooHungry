using System;
using System.Threading.Tasks;
using Acme.TooHungry.Orders;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Tables;

public abstract class TableAppService_TransferTable_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly ITableAppService _tableAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected TableAppService_TransferTable_Tests()
    {
        _tableAppService = GetRequiredService<ITableAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task TransferTableAsync_Should_Successfully_Transfer_ActiveOrder_And_OccupiedTime()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var occupiedTime = DateTime.UtcNow.AddMinutes(-45);

            var sourceTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Đi {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);
            sourceTable.Occupy(occupiedTime);
            await _tableRepository.UpdateAsync(sourceTable, autoSave: true);

            var targetTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Đến {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var order = await _orderRepository.InsertAsync(new Order(
                Guid.NewGuid(),
                $"ORD-TR-{Guid.NewGuid():N}"[..14],
                occupiedTime,
                sourceTable.Id,
                "Khách ngồi bàn ban đầu"
            ), autoSave: true);

            // Thực hiện chuyển bàn
            var result = await _tableAppService.TransferTableAsync(new TransferTableInputDto
            {
                SourceTableId = sourceTable.Id,
                TargetTableId = targetTable.Id,
                Note = "Chuyển sang bàn cạnh cửa sổ"
            });

            // 1. Kiểm tra Bàn đích: Trạng thái Occupied, kế thừa OccupiedTime của bàn nguồn
            var reloadedTarget = await _tableRepository.GetAsync(targetTable.Id);
            reloadedTarget.Status.ShouldBe(TableStatus.Occupied);
            reloadedTarget.OccupiedTime.ShouldNotBeNull();
            reloadedTarget.OccupiedTime.Value.Date.ShouldBe(occupiedTime.Date);

            // 2. Kiểm tra Bàn nguồn: Trạng thái chuyển sang Cleaning vì đã có đơn món
            var reloadedSource = await _tableRepository.GetAsync(sourceTable.Id);
            reloadedSource.Status.ShouldBe(TableStatus.Cleaning);

            // 3. Kiểm tra Đơn hàng: Đã chuyển sang bàn đích và cập nhật Note truy vết
            var reloadedOrder = await _orderRepository.GetAsync(order.Id);
            reloadedOrder.TableId.ShouldBe(targetTable.Id);
            reloadedOrder.Note.ShouldContain("Chuyển từ");
            reloadedOrder.Note.ShouldContain("cạnh cửa sổ");

            // 4. Kết quả DTO trả về cho Bàn đích có thông tin đơn active
            result.HasActiveOrder.ShouldBeTrue();
            result.ActiveOrderId.ShouldBe(order.Id);
        });
    }

    [Fact]
    public async Task TransferTableAsync_Should_Reject_When_Source_And_Target_Are_Same()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Trùng {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Occupied), autoSave: true);

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _tableAppService.TransferTableAsync(new TransferTableInputDto
                {
                    SourceTableId = table.Id,
                    TargetTableId = table.Id
                });
            });

            ex.Code.ShouldBe(TooHungryDomainErrorCodes.TableSameSourceAndTarget);
        });
    }

    [Fact]
    public async Task TransferTableAsync_Should_Reject_When_Source_Is_Not_Occupied()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var sourceTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Rỗng {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var targetTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Target {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _tableAppService.TransferTableAsync(new TransferTableInputDto
                {
                    SourceTableId = sourceTable.Id,
                    TargetTableId = targetTable.Id
                });
            });

            ex.Code.ShouldBe(TooHungryDomainErrorCodes.TableSourceNotOccupied);
        });
    }

    [Fact]
    public async Task TransferTableAsync_Should_Reject_When_Target_Is_Not_Available()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var sourceTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Đi {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Occupied), autoSave: true);

            var targetTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Bận {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Cleaning), autoSave: true);

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _tableAppService.TransferTableAsync(new TransferTableInputDto
                {
                    SourceTableId = sourceTable.Id,
                    TargetTableId = targetTable.Id
                });
            });

            ex.Code.ShouldBe(TooHungryDomainErrorCodes.TableTargetNotEmpty);
        });
    }
}
