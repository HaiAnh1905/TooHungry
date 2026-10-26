using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_Consumption_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;
    private readonly RecipeManager _recipeManager;

    protected OrderAppService_Consumption_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
        _recipeManager = GetRequiredService<RecipeManager>();
    }

    [Fact]
    public async Task Should_Deduct_Inventory_When_Completing_Order_With_Recipe()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Bít tết {Guid.NewGuid():N}",
                Price = 200000m,
                IsActive = true
            }, autoSave: true);

            var beef = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Thịt thăn bò", "kg", 5, StorageType.FRESH), autoSave: true);

            var now = DateTime.UtcNow;
            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), beef.Id, "BATCH-BEEF-1", 10m, 10m, "kg", 1m, now, now.AddDays(2)), autoSave: true);

            await _recipeManager.CreateAsync(
                dish.Id,
                "Recipe Bít Tết",
                null,
                new List<(Guid, decimal, string, decimal)> { (beef.Id, 0.2m, "kg", 1.0m) }
            );

            // Tạo đơn hàng mua 2 phần (cần 0.4 kg)
            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-001",
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });

            // Hoàn tất đơn hàng
            await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
            {
                OrderNumber = order.OrderNumber,
                Status = OrderStatus.Completed,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });

            // Kiểm tra tồn kho đã bị trừ 0.4 kg theo FEFO
            var reloadedBatch = await _batchRepository.GetAsync(batch.Id);
            reloadedBatch.RemainingQuantity.ShouldBe(9.6m);

            var txs = (await _transactionRepository.GetListAsync()).Where(x => x.IngredientId == beef.Id).ToList();
            txs.Count.ShouldBeGreaterThanOrEqualTo(1);
            var lastTx = txs.Last();
            lastTx.TransactionType.ShouldBe(InventoryTransactionType.OUT);
            lastTx.Quantity.ShouldBe(0.4m);
        });
    }

    [Fact]
    public async Task Should_Not_Deduct_Inventory_When_Dish_Has_No_Recipe()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Trà Chanh {Guid.NewGuid():N}",
                Price = 20000m,
                IsActive = true
            }, autoSave: true);

            var txCountBefore = (await _transactionRepository.GetListAsync()).Count;

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-002",
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 5 }
                }
            });

            await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
            {
                OrderNumber = order.OrderNumber,
                Status = OrderStatus.Completed,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 5 }
                }
            });

            var txCountAfter = (await _transactionRepository.GetListAsync()).Count;
            txCountAfter.ShouldBe(txCountBefore); // Không phát sinh giao dịch kho
        });
    }

    [Fact]
    public async Task Should_Allow_Order_Completion_When_Stock_Insufficient_And_Deduct_To_Zero()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Tôm Càng {Guid.NewGuid():N}",
                Price = 300000m,
                IsActive = true
            }, autoSave: true);

            var shrimp = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Tôm càng xanh", "con", 1, StorageType.FRESH), autoSave: true);

            var now = DateTime.UtcNow;
            // Chỉ còn 1 con
            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), shrimp.Id, "SHRIMP-01", 1m, 1m, "con", 1m, now, now.AddDays(1)), autoSave: true);

            await _recipeManager.CreateAsync(
                dish.Id,
                "Recipe Tôm Càng",
                null,
                new List<(Guid, decimal, string, decimal)> { (shrimp.Id, 1m, "con", 1.0m) }
            );

            // Khách mua 2 suất (cần 2 con, kho chỉ có 1 con)
            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-003",
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });

            // Hoàn tất đơn hàng: KHÔNG ĐƯỢC CHẶN POS (US2)
            var completedOrder = await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
            {
                OrderNumber = order.OrderNumber,
                Status = OrderStatus.Completed,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });

            completedOrder.Status.ShouldBe(OrderStatus.Completed);

            // Kho bị trừ hết về 0
            var reloadedBatch = await _batchRepository.GetAsync(batch.Id);
            reloadedBatch.RemainingQuantity.ShouldBe(0m);
        });
    }
}
