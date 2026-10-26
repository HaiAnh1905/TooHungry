using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_RaceCondition_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected OrderAppService_RaceCondition_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task Should_Convert_Filtered_Index_Violation_To_BusinessException_On_Duplicate_Active_Order()
    {
        Guid dishId = Guid.Empty;
        Guid tableId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Món Test {Guid.NewGuid():N}",
                Price = 50000m,
                IsActive = true
            }, autoSave: true);
            dishId = dish.Id;

            var table = await _tableRepository.InsertAsync(new RestaurantTable(Guid.NewGuid(), "Bàn Race", 4), autoSave: true);
            tableId = table.Id;
        });

        // Request 1: Tạo đơn thành công
        var order1 = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
        {
            OrderNumber = "ORD-RACE-01",
            TableId = tableId,
            Status = OrderStatus.Pending,
            Items = new List<CreateUpdateOrderItemDto>
            {
                new() { DishId = dishId, Quantity = 1 }
            }
        });
        order1.ShouldNotBeNull();

        // Request 2: Cố gắng tạo đơn thứ 2 đồng thời cho cùng một bàn
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-RACE-02",
                TableId = tableId,
                Status = OrderStatus.Pending,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dishId, Quantity = 1 }
                }
            });
        });

        ex.Code.ShouldBe("TooHungry:Order:TableAlreadyHasActiveOrder");
    }
}
