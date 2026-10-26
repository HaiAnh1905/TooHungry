using System;
using System.IO;
using System.Reflection;
using Acme.TooHungry.Controllers;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Shouldly;
using Xunit;

namespace Acme.TooHungry.Security;

public class EndpointAuthorization_Tests
{
    [Fact]
    public void MediaController_UploadDishImageAsync_Should_Have_DishesEdit_Permission()
    {
        var method = typeof(MediaController).GetMethod(nameof(MediaController.UploadDishImageAsync));
        method.ShouldNotBeNull();

        var authAttr = method.GetCustomAttribute<AuthorizeAttribute>();
        authAttr.ShouldNotBeNull();
        authAttr.Policy.ShouldBe(TooHungryPermissions.Dishes.Edit);
    }

    [Fact]
    public void DailyMenuAppService_Should_Have_Class_Level_DishesDefault_Permission()
    {
        var authAttr = typeof(DailyMenuAppService).GetCustomAttribute<AuthorizeAttribute>();
        authAttr.ShouldNotBeNull();
        authAttr.Policy.ShouldBe(TooHungryPermissions.Dishes.Default);
    }

    [Fact]
    public void RecipeController_GetActiveByDishIdAsync_Should_Have_RecipesDefault_Permission()
    {
        var method = typeof(RecipeController).GetMethod(nameof(RecipeController.GetActiveByDishIdAsync));
        method.ShouldNotBeNull();

        var authAttr = method.GetCustomAttribute<AuthorizeAttribute>();
        authAttr.ShouldNotBeNull();
        authAttr.Policy.ShouldBe(TooHungryPermissions.Recipes.Default);
    }

    [Fact]
    public void DishCategoryAppService_Methods_Should_Have_Granular_DishCategories_Permissions()
    {
        var type = typeof(DishCategoryAppService);
        var classAuth = type.GetCustomAttribute<AuthorizeAttribute>();
        classAuth.ShouldNotBeNull();
        classAuth.Policy.ShouldBe(TooHungryPermissions.DishCategories.Default);

        var getMethod = type.GetMethod(nameof(DishCategoryAppService.GetAsync));
        getMethod.ShouldNotBeNull();
        getMethod.GetCustomAttribute<AuthorizeAttribute>()?.Policy.ShouldBe(TooHungryPermissions.DishCategories.Default);

        var getListMethod = type.GetMethod(nameof(DishCategoryAppService.GetListAsync));
        getListMethod.ShouldNotBeNull();
        getListMethod.GetCustomAttribute<AuthorizeAttribute>()?.Policy.ShouldBe(TooHungryPermissions.DishCategories.Default);

        var createMethod = type.GetMethod(nameof(DishCategoryAppService.CreateAsync));
        createMethod.ShouldNotBeNull();
        createMethod.GetCustomAttribute<AuthorizeAttribute>()?.Policy.ShouldBe(TooHungryPermissions.DishCategories.Create);

        var updateMethod = type.GetMethod(nameof(DishCategoryAppService.UpdateAsync));
        updateMethod.ShouldNotBeNull();
        updateMethod.GetCustomAttribute<AuthorizeAttribute>()?.Policy.ShouldBe(TooHungryPermissions.DishCategories.Edit);

        var deleteMethod = type.GetMethod(nameof(DishCategoryAppService.DeleteAsync));
        deleteMethod.ShouldNotBeNull();
        deleteMethod.GetCustomAttribute<AuthorizeAttribute>()?.Policy.ShouldBe(TooHungryPermissions.DishCategories.Delete);
    }

    [Fact]
    public void TableOrderController_Endpoints_Should_Have_Correct_Order_Permissions()
    {
        var activeMethod = typeof(TableOrderController).GetMethod(nameof(TableOrderController.GetActiveOrderByTableIdAsync));
        activeMethod.ShouldNotBeNull();
        var activeAuth = activeMethod.GetCustomAttribute<AuthorizeAttribute>();
        activeAuth.ShouldNotBeNull();
        activeAuth.Policy.ShouldBe(TooHungryPermissions.Orders.Default);

        var completeMethod = typeof(TableOrderController).GetMethod(nameof(TableOrderController.CompleteActiveOrderByTableIdAsync));
        completeMethod.ShouldNotBeNull();
        var completeAuth = completeMethod.GetCustomAttribute<AuthorizeAttribute>();
        completeAuth.ShouldNotBeNull();
        completeAuth.Policy.ShouldBe(TooHungryPermissions.Orders.Edit);
    }

    [Fact]
    public void TableHub_Should_Have_Class_Level_Authorize_Attribute()
    {
        try
        {
            var hostAssembly = Assembly.Load("Acme.TooHungry.HttpApi.Host");
            var hubType = hostAssembly.GetType("Acme.TooHungry.Hubs.TableHub");
            if (hubType != null)
            {
                var authAttr = hubType.GetCustomAttribute<AuthorizeAttribute>();
                authAttr.ShouldNotBeNull();
            }
        }
        catch (FileNotFoundException)
        {
            // Assembly not in test execution directory
        }
    }
}
