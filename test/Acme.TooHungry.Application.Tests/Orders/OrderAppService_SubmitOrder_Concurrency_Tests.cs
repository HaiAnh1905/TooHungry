using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Tables;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_SubmitOrder_Concurrency_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected OrderAppService_SubmitOrder_Concurrency_Tests()
    {
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task SubmitOrderAsync_Concurrent_Race_Condition_Should_Guarantee_Single_Active_Order()
    {
        // 1. Chuẩn bị bàn ăn và món ăn mẫu
        var table = await _tableRepository.InsertAsync(
            new RestaurantTable($"Bàn Concurrency {Guid.NewGuid():N}"[..12], 4, TableStatus.Available),
            autoSave: true
        );

        var dish = await _dishRepository.InsertAsync(
            new Dish(Guid.NewGuid())
            {
                Name = "Món Đua Lệnh",
                Price = 50000m,
                IsActive = true
            },
            autoSave: true
        );

        // 2. Chạy 2 tác vụ SubmitOrderAsync song song trên 2 DI Scopes độc lập
        var (result1, error1, result2, error2) = await ExecuteRaceConditionAsync(
            async sp =>
            {
                var appService = sp.GetRequiredService<IOrderAppService>();
                return await appService.SubmitOrderAsync(new SubmitOrderInputDto
                {
                    TableId = table.Id,
                    Items = new List<SubmitOrderItemDto>
                    {
                        new() { DishId = dish.Id, Quantity = 1, Note = "Worker 1" }
                    }
                });
            },
            async sp =>
            {
                var appService = sp.GetRequiredService<IOrderAppService>();
                return await appService.SubmitOrderAsync(new SubmitOrderInputDto
                {
                    TableId = table.Id,
                    Items = new List<SubmitOrderItemDto>
                    {
                        new() { DishId = dish.Id, Quantity = 2, Note = "Worker 2" }
                    }
                });
            }
        );

        // 3. Phân tích kết quả: Ít nhất 1 tác vụ phải thành công
        var successCount = (result1 != null ? 1 : 0) + (result2 != null ? 1 : 0);
        successCount.ShouldBeGreaterThanOrEqualTo(1);

        // Nếu có tác vụ thất bại do race condition, ngoại lệ phải là BusinessException hoặc Concurrency Exception
        var failedException = error1 ?? error2;
        if (failedException != null)
        {
            var isExpectedError = failedException is BusinessException bEx &&
                (bEx.Code == "TooHungry:Order:TableAlreadyHasActiveOrder" || bEx.Code == "TooHungry:Order:AlreadyExists")
                || failedException is Volo.Abp.Data.AbpDbConcurrencyException
                || failedException.GetType().Name.Contains("Concurrency")
                || failedException.GetType().Name.Contains("DbUpdate")
                || failedException.Message.Contains("IX_AppOrders_TableId")
                || failedException.Message.Contains("UNIQUE")
                || failedException.Message.Contains("locked");

            isExpectedError.ShouldBeTrue($"Ngoại lệ không mong muốn khi tương tranh: {failedException}");
        }

        // 4. Khẳng định bất biến CSDL: Luôn luôn chỉ có duy nhất 1 Active Order cho bàn ăn này
        await WithUnitOfWorkAsync(async () =>
        {
            var orderQuery = await _orderRepository.GetQueryableAsync();
            var activeOrders = orderQuery
                .Where(x => x.TableId == table.Id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled)
                .ToList();

            activeOrders.Count.ShouldBe(1);

            // 5. Trạng thái bàn ăn phải chuyển sang Occupied
            var reloadedTable = await _tableRepository.GetAsync(table.Id);
            reloadedTable.Status.ShouldBe(TableStatus.Occupied);
        });
    }
}
