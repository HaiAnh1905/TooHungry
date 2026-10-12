using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_TableInfo_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly ITableAppService _tableAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;

    protected OrderAppService_TableInfo_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableAppService = GetRequiredService<ITableAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
    }

    [Fact]
    public async Task Should_Retrieve_Table_Info_For_Order_Screen()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable
            {
                Name = "Bàn 10 - VIP",
                Capacity = 6,
                Status = TableStatus.Occupied
            }, autoSave: true);

            var tableDto = await _tableAppService.GetAsync(table.Id);
            tableDto.ShouldNotBeNull();
            tableDto.Name.ShouldBe("Bàn 10 - VIP");
            tableDto.Capacity.ShouldBe(6);
            tableDto.Status.ShouldBe(TableStatus.Occupied);

            // Bàn mới chưa có active order -> null
            var activeOrder = await _orderAppService.GetActiveOrderByTableIdAsync(table.Id);
            activeOrder.ShouldBeNull();
        });
    }
}
