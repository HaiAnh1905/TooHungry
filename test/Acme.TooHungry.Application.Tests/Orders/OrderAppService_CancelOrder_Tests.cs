using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_CancelOrder_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly RecipeManager _recipeManager;

    protected OrderAppService_CancelOrder_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
        _recipeManager = GetRequiredService<RecipeManager>();
    }

    [Fact]
    public async Task CancelOrderAsync_Should_Release_Table_To_Available_And_Not_Consume_Inventory()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            // 1. Tạo bàn, nguyên liệu tồn kho 10kg, món ăn và công thức 1kg/món
            var table = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Hủy {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var dishFixture = await TestingDataFixtureFactory.CreateDishRecipeFixtureAsync(
                _dishRepository, _ingredientRepository, _recipeManager, dishPrice: 120000m, ingredientQtyPerServing: 1.0m);

            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                dishFixture.Ingredient.Id,
                $"BATCH-CNL-{Guid.NewGuid():N}"[..18],
                10.0m,
                10.0m,
                "kg",
                1.0m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddDays(25),
                null,
                unitCost: 150000m
            ), autoSave: true);

            // 2. Tạo đơn hàng gắn với bàn ăn (Bàn tự động chuyển sang Occupied)
            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = $"ORD-CNL-{Guid.NewGuid():N}"[..14],
                TableId = table.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dishFixture.Dish.Id, Quantity = 3 }
                }
            });

            var occupiedTable = await _tableRepository.GetAsync(table.Id);
            occupiedTable.Status.ShouldBe(TableStatus.Occupied);

            // 3. Thực hiện Hủy đơn hàng
            await _orderAppService.CancelOrderAsync(order.Id, new CancelOrderInputDto
            {
                Reason = "Khách có việc gấp phải về ngay"
            });

            // 4. Assert Đơn hàng: Chuyển sang Cancelled và ghi nhận lý do
            var reloadedOrder = await _orderRepository.GetAsync(order.Id);
            reloadedOrder.Status.ShouldBe(OrderStatus.Cancelled);
            reloadedOrder.Note.ShouldContain("việc gấp");

            // 5. Assert Bàn ăn: Được giải phóng về trạng thái Available sẵn sàng đón khách mới
            var reloadedTable = await _tableRepository.GetAsync(table.Id);
            reloadedTable.Status.ShouldBe(TableStatus.Available);

            // 6. Assert Kho hàng: Tuyệt đối không bị trừ, giữ nguyên 10kg và không sinh transaction OUT
            var reloadedBatch = await _batchRepository.GetAsync(batch.Id);
            reloadedBatch.RemainingQuantity.ShouldBe(10.0m);

            var txQuery = await _transactionRepository.GetQueryableAsync();
            var outTxCount = txQuery.Count(x => x.BatchId == batch.Id && x.TransactionType == InventoryTransactionType.OUT);
            outTxCount.ShouldBe(0);
        });
    }

    [Fact]
    public async Task CancelOrderAsync_Should_Reject_When_Order_Already_Completed()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn C-Cnl {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Món Đã Ăn",
                Price = 60000m,
                IsActive = true
            }, autoSave: true);

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = $"ORD-ALC-{Guid.NewGuid():N}"[..14],
                TableId = table.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 1 }
                }
            });

            // Hoàn tất đơn hàng
            await _orderAppService.CompletePaymentAsync(order.Id, new CompletePaymentInputDto
            {
                PaymentMethod = PaymentMethod.Cash
            });

            // Thử hủy đơn hàng đã hoàn tất -> Phải bị từ chối bằng BusinessException
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _orderAppService.CancelOrderAsync(order.Id, new CancelOrderInputDto
                {
                    Reason = "Cố tình hủy sau khi đã thanh toán"
                });
            });

            ex.Code.ShouldBe("TooHungry:Order:AlreadyCompleted");
        });
    }
}
