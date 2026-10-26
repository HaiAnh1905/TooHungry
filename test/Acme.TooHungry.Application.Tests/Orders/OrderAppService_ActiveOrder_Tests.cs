using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_ActiveOrder_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected OrderAppService_ActiveOrder_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task Should_Enforce_Single_Active_Order_And_Reload_For_Continue_Order()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable
            {
                Name = "Bàn 07",
                Capacity = 4,
                Status = TableStatus.Occupied
            }, autoSave: true);

            var dish1 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Mỳ Ý Bò Bằm",
                Price = 120000m,
                IsActive = true
            }, autoSave: true);

            var dish2 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Trà Đào Cam Sả",
                Price = 45000m,
                IsActive = true
            }, autoSave: true);

            // Waiter tạo đơn đầu tiên (1 Mỳ Ý)
            var order1 = await _orderAppService.SubmitOrderAsync(new SubmitOrderInputDto
            {
                TableId = table.Id,
                Items = new List<SubmitOrderItemDto>
                {
                    new() { DishId = dish1.Id, Quantity = 1, Note = "Ít sốt" }
                }
            });

            order1.ShouldNotBeNull();
            order1.Status.ShouldBe(OrderStatus.Pending);
            order1.Items.Count.ShouldBe(1);

            // Khi vào lại bàn: GetActiveOrderByTableIdAsync tải lại đúng đơn PENDING này
            var activeOrder = await _orderAppService.GetActiveOrderByTableIdAsync(table.Id);
            activeOrder.ShouldNotBeNull();
            activeOrder.Id.ShouldBe(order1.Id);
            activeOrder.Items.Count.ShouldBe(1);
            activeOrder.Items[0].DishName.ShouldBe("Mỳ Ý Bò Bằm");

            // Waiter gọi thêm món (tiếp tục gọi món): Thêm 2 Trà Đào
            var updatedOrder = await _orderAppService.SubmitOrderAsync(new SubmitOrderInputDto
            {
                OrderId = activeOrder.Id,
                TableId = table.Id,
                Items = new List<SubmitOrderItemDto>
                {
                    new() { DishId = dish1.Id, Quantity = 1, Note = "Ít sốt" },
                    new() { DishId = dish2.Id, Quantity = 2, Note = "Ít ngọt" }
                }
            });

            // Vẫn giữ nguyên mã OrderId cũ, không sinh mã mới
            updatedOrder.Id.ShouldBe(order1.Id);
            updatedOrder.Items.Count.ShouldBe(2);
            updatedOrder.TotalAmount.ShouldBe(120000m + 2 * 45000m);

            // Xác nhận trong DB chỉ có duy nhất 1 đơn PENDING cho bàn này
            var pendingOrdersCount = await _orderRepository.CountAsync(x => x.TableId == table.Id && x.Status == OrderStatus.Pending);
            pendingOrdersCount.ShouldBe(1);
        });
    }
}
