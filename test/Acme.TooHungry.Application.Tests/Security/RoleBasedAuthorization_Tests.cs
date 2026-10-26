using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Controllers;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp.Authorization;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Security;

public abstract class RoleBasedAuthorization_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly ITableAppService _tableAppService;
    private readonly IIngredientAppService _ingredientAppService;
    private readonly IInventoryAppService _inventoryAppService;
    private readonly IDishCategoryAppService _dishCategoryAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IMethodInvocationAuthorizationService _methodAuth;

    protected RoleBasedAuthorization_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableAppService = GetRequiredService<ITableAppService>();
        _ingredientAppService = GetRequiredService<IIngredientAppService>();
        _inventoryAppService = GetRequiredService<IInventoryAppService>();
        _dishCategoryAppService = GetRequiredService<IDishCategoryAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _diningAreaRepository = GetRequiredService<IRepository<DiningArea, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _methodAuth = GetRequiredService<IMethodInvocationAuthorizationService>();
    }

    [Fact]
    public async Task Waiter_Should_Be_Able_To_Create_Order_And_Update_Table_Status()
    {
        var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
        {
            Name = $"Món ăn {Guid.NewGuid():N}"[..12],
            Price = 60000m,
            IsActive = true
        }, autoSave: true);

        var table = await _tableRepository.InsertAsync(new RestaurantTable(
            Guid.NewGuid(), $"Bàn {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

        using (ChangeToWaiter())
        {
            // 1. Waiter tạo order thành công
            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = $"ORD-W-{Guid.NewGuid():N}"[..14],
                TableId = table.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 2 }
                }
            });
            order.ShouldNotBeNull();
            order.TableId.ShouldBe(table.Id);

            // 2. Waiter đổi trạng thái bàn trống sang Occupied thành công
            var table2 = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn 2 {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);
            await _tableAppService.ChangeStatusAsync(table2.Id, TableStatus.Occupied);
            var updatedTable2 = await _tableRepository.GetAsync(table2.Id);
            updatedTable2.Status.ShouldBe(TableStatus.Occupied);
        }
    }

    [Fact]
    public async Task Waiter_Should_Be_Denied_When_Attempting_To_Delete_Order()
    {
        using (ChangeToWaiter())
        {
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _orderAppService.DeleteAsync(Guid.NewGuid());
            });
        }
    }

    [Fact]
    public async Task Waiter_Should_Be_Denied_When_Attempting_To_Modify_Ingredients()
    {
        var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), $"Hành lá {Guid.NewGuid():N}"[..12], "kg", 2.0m, StorageType.FRESH), autoSave: true);

        using (ChangeToWaiter())
        {
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _ingredientAppService.UpdateAsync(ingredient.Id, new UpdateIngredientDto
                {
                    Name = "Hành lá cập nhật",
                    BaseUnit = "kg",
                    MinStock = 5.0m,
                    EstimatedPrice = 15000m,
                    StorageType = StorageType.FRESH,
                    ConsumptionMethod = ConsumptionMethod.RECIPE
                });
            });
        }
    }

    [Fact]
    public async Task Waiter_Should_Be_Denied_When_Attempting_To_Delete_DishCategory()
    {
        using (ChangeToWaiter())
        {
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _dishCategoryAppService.DeleteAsync(Guid.NewGuid());
            });
        }
    }

    [Fact]
    public async Task InventoryKeeper_Should_Be_Able_To_Create_Batch_And_Adjust_Stock()
    {
        var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), $"Bột mì {Guid.NewGuid():N}"[..12], "kg", 10.0m, StorageType.SHORT_TERM), autoSave: true);

        using (ChangeToInventoryKeeper())
        {
            // 1. Nhập lô mới thành công
            var batchDto = await _inventoryAppService.CreateBatchAsync(new CreateInventoryBatchDto
            {
                IngredientId = ingredient.Id,
                BatchCode = $"B-KEEPER-{Guid.NewGuid():N}"[..16],
                PurchaseQuantity = 20m,
                PurchaseUnit = "kg",
                UnitCost = 15000m,
                ExpiryDate = DateTime.UtcNow.AddDays(30)
            });
            batchDto.ShouldNotBeNull();
            batchDto.RemainingQuantity.ShouldBe(20m);

            // 2. Kiểm kê điều chỉnh kho thành công
            await _inventoryAppService.AdjustStockAsync(new StockAdjustmentRequestDto
            {
                IngredientId = ingredient.Id,
                ActualQuantity = 25m,
                Reason = "Kiểm kê định kỳ phát hiện thừa 5kg"
            });
        }
    }

    [Fact]
    public async Task InventoryKeeper_Should_Be_Denied_When_Attempting_To_Complete_Payment()
    {
        using (ChangeToInventoryKeeper())
        {
            var method = typeof(TableOrderController).GetMethod(nameof(TableOrderController.CompleteActiveOrderByTableIdAsync));
            method.ShouldNotBeNull();

            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _methodAuth.CheckAsync(new MethodInvocationAuthorizationContext(method));
            });
        }
    }

    [Fact]
    public async Task InventoryKeeper_Should_Be_Denied_When_Attempting_To_Edit_Table()
    {
        var table = await _tableRepository.InsertAsync(new RestaurantTable(
            Guid.NewGuid(), $"Bàn Test {Guid.NewGuid():N}"[..10], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

        using (ChangeToInventoryKeeper())
        {
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _tableAppService.UpdateAsync(table.Id, new CreateUpdateTableDto
                {
                    Name = "Bàn Sửa",
                    Capacity = 6
                });
            });
        }
    }

    [Fact]
    public async Task Admin_Should_Have_Full_Access_To_All_Endpoints()
    {
        var table = await _tableRepository.InsertAsync(new RestaurantTable(
            Guid.NewGuid(), $"Bàn Admin {Guid.NewGuid():N}"[..12], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

        var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(), $"Gia vị Admin {Guid.NewGuid():N}"[..14], "kg", 1.0m, StorageType.LONG_TERM), autoSave: true);

        using (ChangeToAdmin())
        {
            // Admin sửa thông tin bàn thành công
            var updatedTable = await _tableAppService.UpdateAsync(table.Id, new CreateUpdateTableDto
            {
                Name = "Bàn VIP Admin",
                Capacity = 8
            });
            updatedTable.Name.ShouldBe("Bàn VIP Admin");

            // Admin sửa nguyên liệu thành công
            var updatedIngredient = await _ingredientAppService.UpdateAsync(ingredient.Id, new UpdateIngredientDto
            {
                Name = ingredient.Name,
                BaseUnit = "kg",
                MinStock = 5.0m,
                EstimatedPrice = 50000m,
                StorageType = StorageType.LONG_TERM,
                ConsumptionMethod = ConsumptionMethod.RECIPE
            });
            updatedIngredient.MinStock.ShouldBe(5.0m);
        }
    }
}
