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

public abstract class OrderAppService_SubmitOrder_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected OrderAppService_SubmitOrder_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task Should_Reject_Empty_Cart_On_Submit()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable
            {
                Name = $"Bàn Test Submit 1 {Guid.NewGuid():N}",
                Capacity = 2,
                Status = TableStatus.Available
            }, autoSave: true);

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _orderAppService.SubmitOrderAsync(new SubmitOrderInputDto
                {
                    TableId = table.Id,
                    Items = new List<SubmitOrderItemDto>()
                });
            });

            ex.Code.ShouldBe("TooHungry:Order:CartCannotBeEmpty");
        });
    }

    [Fact]
    public async Task Should_Cancel_Order_Successfully()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable
            {
                Name = $"Bàn Test Cancel 2 {Guid.NewGuid():N}",
                Capacity = 4,
                Status = TableStatus.Occupied
            }, autoSave: true);

            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Cơm Chiên Hải Sản",
                Price = 85000m,
                IsActive = true
            }, autoSave: true);

            var order = await _orderAppService.SubmitOrderAsync(new SubmitOrderInputDto
            {
                TableId = table.Id,
                Items = new List<SubmitOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 1, UnitPrice = 85000m }
                }
            });

            order.Status.ShouldBe(OrderStatus.Pending);

            // Hủy đơn hàng
            await _orderAppService.CancelOrderAsync(order.Id, new CancelOrderInputDto
            {
                Reason = "Khách đổi ý muốn thanh toán nước rồi về"
            });

            var reloadedOrder = await _orderRepository.GetAsync(order.Id);
            reloadedOrder.Status.ShouldBe(OrderStatus.Cancelled);
            reloadedOrder.Note.ShouldContain("Khách đổi ý");

            // Bàn không còn active pending order
            var activeOrder = await _orderAppService.GetActiveOrderByTableIdAsync(table.Id);
            activeOrder.ShouldBeNull();
        });
    }
}
