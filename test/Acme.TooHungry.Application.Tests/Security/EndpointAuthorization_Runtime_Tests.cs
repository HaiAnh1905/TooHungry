using System;
using System.Threading.Tasks;
using Acme.TooHungry.Controllers;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;
using Shouldly;
using Volo.Abp.Authorization;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Security;

public abstract class EndpointAuthorization_Runtime_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IDailyMenuAppService _dailyMenuAppService;
    private readonly IOrderAppService _orderAppService;
    private readonly IDishCategoryAppService _dishCategoryAppService;
    private readonly IMethodInvocationAuthorizationService _methodAuth;

    protected EndpointAuthorization_Runtime_Tests()
    {
        _dailyMenuAppService = GetRequiredService<IDailyMenuAppService>();
        _orderAppService = GetRequiredService<IOrderAppService>();
        _dishCategoryAppService = GetRequiredService<IDishCategoryAppService>();
        _methodAuth = GetRequiredService<IMethodInvocationAuthorizationService>();
    }

    [Fact]
    public async Task UploadDishImageAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_DishesEdit_Permission()
    {
        // Gửi request khi user chưa đăng nhập hoặc thiếu quyền Dishes.Edit
        using (ChangeToWaiter())
        {
            var method = typeof(MediaController).GetMethod(nameof(MediaController.UploadDishImageAsync));
            method.ShouldNotBeNull();

            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _methodAuth.CheckAsync(new MethodInvocationAuthorizationContext(method));
            });
        }
    }

    [Fact]
    public async Task DailyMenuAppService_Should_Throw_AbpAuthorizationException_When_User_Is_Unauthenticated()
    {
        // Khi người dùng chưa đăng nhập, gọi DailyMenuAppService bị từ chối
        using (ChangeToAnonymous())
        {
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _dailyMenuAppService.GetListAsync(new Volo.Abp.Application.Dtos.PagedAndSortedResultRequestDto());
            });
        }
    }

    [Fact]
    public async Task RecipeController_GetActiveByDishIdAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_RecipesDefault()
    {
        // Khi user không có quyền Recipes.Default (ví dụ Waiter)
        using (ChangeToWaiter())
        {
            var method = typeof(RecipeController).GetMethod(nameof(RecipeController.GetActiveByDishIdAsync));
            method.ShouldNotBeNull();

            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _methodAuth.CheckAsync(new MethodInvocationAuthorizationContext(method));
            });
        }
    }

    [Fact]
    public async Task TableOrderController_CompleteActiveOrderByTableIdAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_OrdersEdit()
    {
        // Khi InventoryKeeper cố hoàn tất thanh toán đơn hàng (thiếu quyền Orders.Edit)
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
    public async Task OrderAppService_DeleteAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_OrdersDelete()
    {
        // Nhân viên phục vụ (Waiter) không được phép xóa đơn hàng
        using (ChangeToWaiter())
        {
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _orderAppService.DeleteAsync(Guid.NewGuid());
            });
        }
    }

    [Fact]
    public async Task DishCategoryAppService_DeleteAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_DishCategoriesDelete()
    {
        // Nhân viên phục vụ (Waiter) không được phép xóa danh mục món ăn
        using (ChangeToWaiter())
        {
            await Should.ThrowAsync<AbpAuthorizationException>(async () =>
            {
                await _dishCategoryAppService.DeleteAsync(Guid.NewGuid());
            });
        }
    }
}
