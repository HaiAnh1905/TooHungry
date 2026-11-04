using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Cashier;

public abstract class CashierAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly ICashierAppService _cashierAppService;
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected CashierAppService_Tests()
    {
        _cashierAppService = GetRequiredService<ICashierAppService>();
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task Should_Return_Shift_Summary()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var summary = await _cashierAppService.GetShiftSummaryAsync();
            summary.ShouldNotBeNull();
            summary.CashierName.ShouldNotBeNullOrWhiteSpace();
            summary.TotalRevenue.ShouldBeGreaterThanOrEqualTo(0);
        });
    }

    [Fact]
    public async Task Should_Return_Cashier_Tables_With_Active_Order()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(
                new RestaurantTable($"Bàn Cashier {Guid.NewGuid():N}", 4, TableStatus.Available),
                autoSave: true
            );

            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Trà Đào Cam Sả {Guid.NewGuid():N}",
                Price = 45000m,
                IsActive = true
            }, autoSave: true);

            var order = await _orderAppService.SubmitOrderAsync(new SubmitOrderInputDto
            {
                TableId = table.Id,
                Items = new List<SubmitOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });

            var result = await _cashierAppService.GetTablesAsync(new GetCashierTablesInputDto
            {
                SearchKeyword = table.Name
            });

            result.Items.Count.ShouldBe(1);
            var card = result.Items[0];
            card.TableNumber.ShouldBe(table.Name);
            card.Status.ShouldBe(TableStatus.Occupied);
            card.ActiveOrderId.ShouldBe(order.Id);
            card.TemporaryTotalAmount.ShouldBe(90000m);
        });
    }

    [Fact]
    public async Task Should_Request_Bill_And_Complete_Payment_Successfully()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(
                new RestaurantTable($"Bàn Bill {Guid.NewGuid():N}", 2, TableStatus.Available),
                autoSave: true
            );

            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Bò Lúc Lắc {Guid.NewGuid():N}",
                Price = 120000m,
                IsActive = true
            }, autoSave: true);

            var order = await _orderAppService.SubmitOrderAsync(new SubmitOrderInputDto
            {
                TableId = table.Id,
                Items = new List<SubmitOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 1 }
                }
            });

            // Yêu cầu bill
            await _orderAppService.RequestBillAsync(order.Id);

            // Hoàn tất thanh toán
            var completedOrder = await _orderAppService.CompletePaymentAsync(order.Id, new CompletePaymentInputDto
            {
                PaymentMethod = PaymentMethod.VietQr,
                PaymentNote = "Chuyển khoản thanh toán"
            });

            completedOrder.Status.ShouldBe(OrderStatus.Completed);

            var refreshedTable = await _tableRepository.GetAsync(table.Id);
            refreshedTable.Status.ShouldBe(TableStatus.Cleaning);
        });
    }
}
