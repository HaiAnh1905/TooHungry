using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Recipes;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_Hardening_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly RecipeManager _recipeManager;

    protected OrderAppService_Hardening_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _recipeManager = GetRequiredService<RecipeManager>();
    }

    [Fact]
    public async Task Should_Reject_Update_When_Order_Already_Completed()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Cơm sườn {Guid.NewGuid():N}",
                Price = 50000m,
                IsActive = true
            }, autoSave: true);

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-LOCK-01",
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 1 }
                }
            });

            // Hoàn tất đơn hàng
            await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
            {
                OrderNumber = order.OrderNumber,
                Status = OrderStatus.Completed,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 1 }
                }
            });

            // Thử cập nhật lại đơn hàng đã hoàn tất
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
                {
                    OrderNumber = order.OrderNumber,
                    Note = "Cố gắng sửa ghi chú đơn đã hoàn tất",
                    Status = OrderStatus.Completed,
                    Items = new List<CreateUpdateOrderItemDto>
                    {
                        new() { DishId = dish.Id, Quantity = 2 }
                    }
                });
            });

            ex.Code.ShouldBe("TooHungry:Order:AlreadyCompleted");
        });
    }

    [Fact]
    public async Task Should_Reject_Update_When_Order_Already_Cancelled()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Mì xào {Guid.NewGuid():N}",
                Price = 45000m,
                IsActive = true
            }, autoSave: true);

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-LOCK-02",
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 1 }
                }
            });

            // Hủy đơn hàng
            await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
            {
                OrderNumber = order.OrderNumber,
                Status = OrderStatus.Cancelled,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 1 }
                }
            });

            // Thử cập nhật lại đơn hàng đã hủy
            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
                {
                    OrderNumber = order.OrderNumber,
                    Status = OrderStatus.Pending,
                    Items = new List<CreateUpdateOrderItemDto>
                    {
                        new() { DishId = dish.Id, Quantity = 1 }
                    }
                });
            });

            ex.Code.ShouldBe("TooHungry:Order:AlreadyCancelled");
        });
    }

    [Fact]
    public async Task Should_Deduct_Inventory_Only_Once_On_Order_Completion()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Canh chua {Guid.NewGuid():N}",
                Price = 60000m,
                IsActive = true
            }, autoSave: true);

            var fish = await _ingredientRepository.InsertAsync(new Ingredient(
                Guid.NewGuid(), "Cá lóc", "kg", 2, StorageType.FRESH), autoSave: true);

            var now = DateTime.UtcNow;
            var batch = await _batchRepository.InsertAsync(new InventoryBatch(
                Guid.NewGuid(), fish.Id, "BATCH-FISH-01", 5m, 5m, "kg", 1m, now, now.AddDays(3)), autoSave: true);

            await _recipeManager.CreateAsync(
                dish.Id,
                "Recipe Canh Chua",
                null,
                new List<(Guid, decimal, string, decimal)> { (fish.Id, 0.5m, "kg", 1.0m) }
            );

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-LOCK-03",
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });

            // Lần 1: Hoàn tất đơn hàng (kho giảm 1.0 kg còn 4.0 kg)
            await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
            {
                OrderNumber = order.OrderNumber,
                Status = OrderStatus.Completed,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });

            var reloadedBatch = await _batchRepository.GetAsync(batch.Id);
            reloadedBatch.RemainingQuantity.ShouldBe(4.0m);

            // Cố gắng gọi lại lần 2 -> ném lỗi và tồn kho vẫn giữ nguyên 4.0 kg
            await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _orderAppService.UpdateAsync(order.Id, new CreateUpdateOrderDto
                {
                    OrderNumber = order.OrderNumber,
                    Status = OrderStatus.Completed,
                    Items = new List<CreateUpdateOrderItemDto>
                    {
                        new() { DishId = dish.Id, Quantity = 2 }
                    }
                });
            });

            var finalBatch = await _batchRepository.GetAsync(batch.Id);
            finalBatch.RemainingQuantity.ShouldBe(4.0m);
        });
    }
}
