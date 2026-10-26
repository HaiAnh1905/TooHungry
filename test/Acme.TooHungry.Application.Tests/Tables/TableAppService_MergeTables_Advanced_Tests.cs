using System;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Orders;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Tables;

public abstract class TableAppService_MergeTables_Advanced_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly ITableAppService _tableAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Order, Guid> _orderRepository;

    protected TableAppService_MergeTables_Advanced_Tests()
    {
        _tableAppService = GetRequiredService<ITableAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
        _orderRepository = GetRequiredService<IRepository<Order, Guid>>();
    }

    [Fact]
    public async Task MergeTablesAsync_Should_Merge_Items_Preserve_Db_Prices_And_Cancel_Secondary_Order()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            // 1. Tạo 2 món ăn với giá niêm yết chuẩn CSDL
            var dish1 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Phở Bò Đặc Biệt",
                Price = 65000m,
                IsActive = true
            }, autoSave: true);

            var dish2 = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = "Trà Đá Hà Nội",
                Price = 10000m,
                IsActive = true
            }, autoSave: true);

            // 2. Tạo 2 bàn ăn trạng thái Occupied
            var primaryTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Chính {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Occupied), autoSave: true);

            var secondaryTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Phụ {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Occupied), autoSave: true);

            // 3. Tạo đơn hàng bàn chính: 2 bát Phở Bò
            var primaryOrder = new Order(
                Guid.NewGuid(),
                $"ORD-P-{Guid.NewGuid():N}"[..14],
                DateTime.UtcNow,
                primaryTable.Id,
                "Đơn bàn chính"
            );
            primaryOrder.Items.Add(new OrderItem(Guid.NewGuid())
            {
                OrderId = primaryOrder.Id,
                DishId = dish1.Id,
                Quantity = 2,
                UnitPrice = dish1.Price,
                TotalPrice = 2 * dish1.Price,
                Note = "Nhiều hành"
            });
            primaryOrder.RecalculateTotalAmount();
            await _orderRepository.InsertAsync(primaryOrder, autoSave: true);

            // 4. Tạo đơn hàng bàn phụ: 3 bát Phở Bò (món trùng) + 2 ly Trà Đá (món mới)
            var secondaryOrder = new Order(
                Guid.NewGuid(),
                $"ORD-S-{Guid.NewGuid():N}"[..14],
                DateTime.UtcNow,
                secondaryTable.Id,
                "Đơn bàn phụ"
            );
            secondaryOrder.Items.Add(new OrderItem(Guid.NewGuid())
            {
                OrderId = secondaryOrder.Id,
                DishId = dish1.Id,
                Quantity = 3,
                UnitPrice = dish1.Price,
                TotalPrice = 3 * dish1.Price,
                Note = "Không cay"
            });
            secondaryOrder.Items.Add(new OrderItem(Guid.NewGuid())
            {
                OrderId = secondaryOrder.Id,
                DishId = dish2.Id,
                Quantity = 2,
                UnitPrice = dish2.Price,
                TotalPrice = 2 * dish2.Price,
                Note = "Ít đá"
            });
            secondaryOrder.RecalculateTotalAmount();
            await _orderRepository.InsertAsync(secondaryOrder, autoSave: true);

            // 5. Gọi nghiệp vụ Gộp bàn
            var result = await _tableAppService.MergeTablesAsync(new MergeTablesInputDto
            {
                PrimaryTableId = primaryTable.Id,
                SecondaryTableId = secondaryTable.Id
            });

            // 6. Kiểm tra Đơn hàng bàn chính:
            var orderQuery = await _orderRepository.WithDetailsAsync(x => x.Items);
            var reloadedPrimaryOrder = orderQuery.First(x => x.Id == primaryOrder.Id);

            // Món 1 (Phở Bò): Được gộp cộng dồn số lượng: 2 + 3 = 5 bát
            var mergedDish1 = reloadedPrimaryOrder.Items.FirstOrDefault(x => x.DishId == dish1.Id);
            mergedDish1.ShouldNotBeNull();
            mergedDish1.Quantity.ShouldBe(5);
            mergedDish1.UnitPrice.ShouldBe(dish1.Price);
            mergedDish1.TotalPrice.ShouldBe(5 * dish1.Price);
            mergedDish1.Note.ShouldContain("Nhiều hành");
            mergedDish1.Note.ShouldContain("Không cay");

            // Món 2 (Trà Đá): Món mới từ bàn phụ được chuyển sang: 2 ly
            var mergedDish2 = reloadedPrimaryOrder.Items.FirstOrDefault(x => x.DishId == dish2.Id);
            mergedDish2.ShouldNotBeNull();
            mergedDish2.Quantity.ShouldBe(2);
            mergedDish2.UnitPrice.ShouldBe(dish2.Price);
            mergedDish2.TotalPrice.ShouldBe(2 * dish2.Price);

            // Tổng tiền đơn chính khớp công thức: (5 * 65.000) + (2 * 10.000) = 345.000
            reloadedPrimaryOrder.TotalAmount.ShouldBe(345000m);
            reloadedPrimaryOrder.Note.ShouldContain(secondaryTable.Name);

            // 7. Kiểm tra Đơn hàng bàn phụ: Đã bị HỦY (Cancelled) an toàn với ghi chú truy vết
            var reloadedSecondaryOrder = await _orderRepository.GetAsync(secondaryOrder.Id);
            reloadedSecondaryOrder.Status.ShouldBe(OrderStatus.Cancelled);
            reloadedSecondaryOrder.Note.ShouldContain("Đã gộp vào");

            // 8. Bàn phụ chuyển sang trạng thái Cleaning để dọn dẹp
            var reloadedSecondaryTable = await _tableRepository.GetAsync(secondaryTable.Id);
            reloadedSecondaryTable.Status.ShouldBe(TableStatus.Cleaning);
        });
    }

    [Fact]
    public async Task MergeTablesAsync_Should_Reject_When_Tables_Are_Same()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn Cùng {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Occupied), autoSave: true);

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _tableAppService.MergeTablesAsync(new MergeTablesInputDto
                {
                    PrimaryTableId = table.Id,
                    SecondaryTableId = table.Id
                });
            });

            ex.Code.ShouldBe(TooHungryDomainErrorCodes.TableSameSourceAndTarget);
        });
    }

    [Fact]
    public async Task MergeTablesAsync_Should_Reject_When_Tables_Are_Not_Occupied()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var primaryTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn P-Empty {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var secondaryTable = await _tableRepository.InsertAsync(new RestaurantTable(
                Guid.NewGuid(), $"Bàn S-Empty {Guid.NewGuid():N}"[..8], 4, null, "Tầng 1", TableStatus.Available), autoSave: true);

            var ex = await Should.ThrowAsync<BusinessException>(async () =>
            {
                await _tableAppService.MergeTablesAsync(new MergeTablesInputDto
                {
                    PrimaryTableId = primaryTable.Id,
                    SecondaryTableId = secondaryTable.Id
                });
            });

            ex.Code.ShouldBe(TooHungryDomainErrorCodes.TableBothMustBeOccupied);
        });
    }
}
