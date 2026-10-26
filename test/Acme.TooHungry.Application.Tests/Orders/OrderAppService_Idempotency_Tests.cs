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

public abstract class OrderAppService_Idempotency_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly RecipeManager _recipeManager;

    protected OrderAppService_Idempotency_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _recipeManager = GetRequiredService<RecipeManager>();
    }

    [Fact]
    public async Task CompletePaymentAsync_Should_Be_Idempotent_And_Reject_Duplicate_Calls_With_BusinessException()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            // 1. Tạo bàn, nguyên liệu (10kg tồn kho), món ăn và công thức (1kg/món)
            var table = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var dishFixture = await TestingDataFixtureFactory.CreateDishRecipeFixtureAsync(
                _dishRepository, _ingredientRepository, _recipeManager, dishPrice: 100000m, ingredientQtyPerServing: 1.0m);

            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                dishFixture.Ingredient.Id,
                $"BATCH-{Guid.NewGuid():N}"[..18],
                10.0m,
                10.0m,
                "kg",
                1.0m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddDays(30),
                null,
                unitCost: 200000m
            ), autoSave: true);

            // 2. Tạo đơn hàng 2 món (= tiêu hao 2kg)
            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = $"ORD-IDEM-{Guid.NewGuid():N}"[..14],
                TableId = table.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dishFixture.Dish.Id, Quantity = 2 }
                }
            });

            // 3. Lần gọi 1: CompletePaymentAsync thành công
            var completedDto = await _orderAppService.CompletePaymentAsync(order.Id, new CompletePaymentInputDto
            {
                PaymentMethod = PaymentMethod.Cash,
                PaymentNote = "Khách thanh toán tiền mặt"
            });
            completedDto.Status.ShouldBe(OrderStatus.Completed);

            // Xác nhận tồn kho giảm đúng 2kg: 10kg - 2kg = 8kg
            var batchAfterFirstCall = await _batchRepository.GetAsync(batch.Id);
            batchAfterFirstCall.RemainingQuantity.ShouldBe(8.0m);

            var txQuery = await _transactionRepository.GetQueryableAsync();
            var txCountAfterFirstCall = txQuery.Count(x => x.ReferenceId == $"ORDER-{order.OrderNumber}");
            txCountAfterFirstCall.ShouldBe(1);

            // 4. Lần gọi 2 (Duplicate / Idempotent call): Bị từ chối bằng BusinessException
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _orderAppService.CompletePaymentAsync(order.Id, new CompletePaymentInputDto
                {
                    PaymentMethod = PaymentMethod.Cash,
                    PaymentNote = "Cố tình thanh toán lại lần 2"
                });
            });
            ex.Code.ShouldBe("TooHungry:Order:AlreadyCompleted");

            // 5. Khẳng định số dư tồn kho và số giao dịch kho giữ nguyên 100%, không bị trừ lần 2
            var batchAfterSecondCall = await _batchRepository.GetAsync(batch.Id);
            batchAfterSecondCall.RemainingQuantity.ShouldBe(8.0m);

            var txCountAfterSecondCall = txQuery.Count(x => x.ReferenceId == $"ORDER-{order.OrderNumber}");
            txCountAfterSecondCall.ShouldBe(1);
        });
    }

    [Fact]
    public async Task UpdateAsync_With_Completed_Status_Should_Not_Consume_Inventory_Twice()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var dishFixture = await TestingDataFixtureFactory.CreateDishRecipeFixtureAsync(
                _dishRepository, _ingredientRepository, _recipeManager, dishPrice: 80000m, ingredientQtyPerServing: 0.5m);

            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                dishFixture.Ingredient.Id,
                $"BATCH-U-{Guid.NewGuid():N}"[..18],
                5.0m,
                5.0m,
                "kg",
                1.0m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddDays(15),
                null,
                unitCost: 150000m
            ), autoSave: true);

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = $"ORD-U-{Guid.NewGuid():N}"[..14],
                TableId = table.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dishFixture.Dish.Id, Quantity = 2 }
                }
            });

            // Hoàn tất đơn hàng lần 1 qua UpdateAsync
            await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
            {
                OrderNumber = order.OrderNumber,
                TableId = table.Id,
                Status = OrderStatus.Completed,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dishFixture.Dish.Id, Quantity = 2 }
                }
            });

            var batchAfterComplete = await _batchRepository.GetAsync(batch.Id);
            batchAfterComplete.RemainingQuantity.ShouldBe(4.0m); // 5 - (2 * 0.5) = 4

            // Gọi UpdateAsync lần 2 với Status = Completed
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
                {
                    OrderNumber = order.OrderNumber,
                    TableId = table.Id,
                    Status = OrderStatus.Completed,
                    Items = new List<CreateUpdateOrderItemDto>
                    {
                        new() { DishId = dishFixture.Dish.Id, Quantity = 2 }
                    }
                });
            });
            ex.Code.ShouldBe("TooHungry:Order:AlreadyCompleted");

            // Kho hàng không bị trừ lần 2
            var batchAfterDuplicate = await _batchRepository.GetAsync(batch.Id);
            batchAfterDuplicate.RemainingQuantity.ShouldBe(4.0m);
        });
    }

    [Fact]
    public async Task CompleteActiveOrderByTableIdAsync_Should_Be_Idempotent_Under_Rapid_Repeated_Calls()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn R-{Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var dishFixture = await TestingDataFixtureFactory.CreateDishRecipeFixtureAsync(
                _dishRepository, _ingredientRepository, _recipeManager, dishPrice: 90000m, ingredientQtyPerServing: 1.0m);

            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(),
                dishFixture.Ingredient.Id,
                $"BATCH-R-{Guid.NewGuid():N}"[..18],
                10.0m,
                10.0m,
                "kg",
                1.0m,
                DateTime.UtcNow,
                DateTime.UtcNow.AddDays(20),
                null,
                unitCost: 180000m
            ), autoSave: true);

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = $"ORD-R-{Guid.NewGuid():N}"[..14],
                TableId = table.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dishFixture.Dish.Id, Quantity = 3 }
                }
            });

            // Lần 1: Hoàn tất đơn theo bàn
            await _orderAppService.CompleteActiveOrderByTableIdAsync(table.Id);

            var batchAfterFirst = await _batchRepository.GetAsync(batch.Id);
            batchAfterFirst.RemainingQuantity.ShouldBe(7.0m); // 10 - 3 = 7

            // Lần 2: Gọi lặp lại nhanh trên cùng bàn ăn (không còn active order)
            await _orderAppService.CompleteActiveOrderByTableIdAsync(table.Id);

            // Assert: Kho hàng không bị trừ thêm bất kỳ đơn vị nào
            var batchAfterSecond = await _batchRepository.GetAsync(batch.Id);
            batchAfterSecond.RemainingQuantity.ShouldBe(7.0m);
        });
    }
}
