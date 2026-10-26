using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Orders;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Tables;

public abstract class TableAppService_Merge_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly ITableAppService _tableAppService;
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected TableAppService_Merge_Tests()
    {
        _tableAppService = GetRequiredService<ITableAppService>();
        _orderAppService = GetRequiredService<IOrderAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task Should_Merge_Tables_Preserve_Notes_And_Recalculate_Listed_Price()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            // Tạo 2 món ăn
            var dish1 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Phở Bò {Guid.NewGuid():N}",
                Price = 85000m,
                IsActive = true
            }, autoSave: true);

            var dish2 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Trà Đá {Guid.NewGuid():N}",
                Price = 10000m,
                IsActive = true
            }, autoSave: true);

            // Tạo 2 bàn ăn và chuyển sang Occupied
            var table1 = await _tableRepository.InsertAsync(new RestaurantTable(Guid.NewGuid(), "Bàn Chính", 4), autoSave: true);
            table1.Occupy(DateTime.UtcNow);
            await _tableRepository.UpdateAsync(table1, autoSave: true);

            var table2 = await _tableRepository.InsertAsync(new RestaurantTable(Guid.NewGuid(), "Bàn Phụ", 4), autoSave: true);
            table2.Occupy(DateTime.UtcNow);
            await _tableRepository.UpdateAsync(table2, autoSave: true);

            // Tạo đơn cho Bàn 1: 1 Phở (ít bánh)
            var order1 = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-TABLE-1",
                TableId = table1.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish1.Id, Quantity = 1, Note = "Ít bánh" }
                }
            });

            // Tạo đơn cho Bàn 2: 2 Phở (không hành), 3 Trà đá (ít đá)
            var order2 = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-TABLE-2",
                TableId = table2.Id,
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish1.Id, Quantity = 2, Note = "Không hành" },
                    new() { DishId = dish2.Id, Quantity = 3, Note = "Ít đá" }
                }
            });

            // Thực hiện gộp Bàn 2 vào Bàn 1
            await _tableAppService.MergeTablesAsync(new MergeTablesInputDto
            {
                PrimaryTableId = table1.Id,
                SecondaryTableId = table2.Id
            });

            // Kiểm tra bàn phụ đã chuyển sang Cleaning
            var reloadedSecondaryTable = await _tableRepository.GetAsync(table2.Id);
            reloadedSecondaryTable.Status.ShouldBe(TableStatus.Cleaning);

            // Kiểm tra đơn hàng bàn phụ đã bị Cancelled
            var reloadedOrder2 = await _orderRepository.GetAsync(order2.Id);
            reloadedOrder2.Status.ShouldBe(OrderStatus.Cancelled);

            // Kiểm tra đơn hàng bàn chính:
            // - Món Phở trùng DishId được gom về 1 dòng: số lượng 1 + 2 = 3
            // - Đơn giá chuẩn 85,000đ, thành tiền = 3 * 85,000 = 255,000đ
            // - Ghi chú nối chuỗi: "Ít bánh | [Gộp từ Bàn Phụ: Không hành]"
            var queryable = await _orderRepository.WithDetailsAsync(x => x.Items);
            var reloadedOrder1 = queryable.First(x => x.Id == order1.Id);

            reloadedOrder1.Items.Count.ShouldBe(2);

            var mergedPho = reloadedOrder1.Items.First(x => x.DishId == dish1.Id);
            mergedPho.Quantity.ShouldBe(3);
            mergedPho.UnitPrice.ShouldBe(85000m);
            mergedPho.TotalPrice.ShouldBe(255000m);
            mergedPho.Note.ShouldBe("Ít bánh | [Gộp từ Bàn Phụ: Không hành]");

            var traDa = reloadedOrder1.Items.First(x => x.DishId == dish2.Id);
            traDa.Quantity.ShouldBe(3);
            traDa.UnitPrice.ShouldBe(10000m);
            traDa.TotalPrice.ShouldBe(30000m);
            traDa.Note.ShouldBe("[Gộp từ Bàn Phụ: Ít đá]");

            reloadedOrder1.TotalAmount.ShouldBe(285000m);
        });
    }
}
