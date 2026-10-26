using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Orders;

public abstract class OrderAppService_Pricing_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IOrderAppService _orderAppService;
    private readonly IRepository<Dish, Guid> _dishRepository;

    protected OrderAppService_Pricing_Tests()
    {
        _orderAppService = GetRequiredService<IOrderAppService>();
        _dishRepository = GetRequiredService<IRepository<Dish, Guid>>();
    }

    [Fact]
    public async Task Should_Calculate_Price_From_Server_Dish_Price()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Lẩu thái {Guid.NewGuid():N}",
                Price = 250000m,
                IsActive = true
            }, autoSave: true);

            var order = await _orderAppService.CreateAsync(new CreateUpdateOrderDto
            {
                OrderNumber = "ORD-PRICING-01",
                Items = new List<CreateUpdateOrderItemDto>
                {
                    new() { DishId = dish.Id, Quantity = 3 }
                }
            });

            // Tổng tiền = 3 * 250,000 = 750,000
            order.TotalAmount.ShouldBe(750000m);
            order.Items.Count.ShouldBe(1);
            order.Items[0].UnitPrice.ShouldBe(250000m);
            order.Items[0].TotalPrice.ShouldBe(750000m);
        });
    }

    [Fact]
    public async Task Should_Throw_When_Item_Quantity_Is_Zero_Or_Negative()
    {
        await WithUnitOfWorkAsync(async () =>
        {
            var dish = await _dishRepository.InsertAsync(new Dish(Guid.NewGuid())
            {
                Name = $"Bún chả {Guid.NewGuid():N}",
                Price = 60000m,
                IsActive = true
            }, autoSave: true);

            // DTO validation [Range(1, 999)] chặn ngay lập tức và ném AbpValidationException
            var ex = await Should.ThrowAsync<Volo.Abp.Validation.AbpValidationException>(async () =>
            {
                await _orderAppService.CreateAsync(new CreateUpdateOrderDto
                {
                    OrderNumber = "ORD-PRICING-02",
                    Items = new List<CreateUpdateOrderItemDto>
                    {
                        new() { DishId = dish.Id, Quantity = 0 }
                    }
                });
            });

            ex.ValidationErrors.ShouldContain(v => v.ErrorMessage == "TooHungry:Order:QuantityOutOfRange");
        });
    }
}
