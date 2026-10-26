using Acme.TooHungry.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;
using Volo.Abp.MultiTenancy;
namespace Acme.TooHungry.Permissions;
public class TooHungryPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(TooHungryPermissions.GroupName, L("Permission:TooHungry"));
        // Dashboard
        myGroup.AddPermission(TooHungryPermissions.Dashboard.Default, L("Permission:Dashboard"));
        // Dishes
        var dishes = myGroup.AddPermission(TooHungryPermissions.Dishes.Default, L("Permission:Dishes"));
        dishes.AddChild(TooHungryPermissions.Dishes.Create, L("Permission:Dishes.Create"));
        dishes.AddChild(TooHungryPermissions.Dishes.Edit, L("Permission:Dishes.Edit"));
        dishes.AddChild(TooHungryPermissions.Dishes.Delete, L("Permission:Dishes.Delete"));
        // Dish Categories
        var dishCategories = myGroup.AddPermission(TooHungryPermissions.DishCategories.Default, L("Permission:DishCategories"));
        dishCategories.AddChild(TooHungryPermissions.DishCategories.Create, L("Permission:DishCategories.Create"));
        dishCategories.AddChild(TooHungryPermissions.DishCategories.Edit, L("Permission:DishCategories.Edit"));
        dishCategories.AddChild(TooHungryPermissions.DishCategories.Delete, L("Permission:DishCategories.Delete"));
        // Orders
        var orders = myGroup.AddPermission(TooHungryPermissions.Orders.Default, L("Permission:Orders"));
        orders.AddChild(TooHungryPermissions.Orders.Create, L("Permission:Orders.Create"));
        orders.AddChild(TooHungryPermissions.Orders.Edit, L("Permission:Orders.Edit"));
        orders.AddChild(TooHungryPermissions.Orders.Delete, L("Permission:Orders.Delete"));
        orders.AddChild(TooHungryPermissions.Orders.Cancel, L("Permission:Orders.Cancel"));
        // Units
        var units = myGroup.AddPermission(TooHungryPermissions.Units.Default, L("Permission:Units"));
        units.AddChild(TooHungryPermissions.Units.Create, L("Permission:Units.Create"));
        units.AddChild(TooHungryPermissions.Units.Edit, L("Permission:Units.Edit"));
        units.AddChild(TooHungryPermissions.Units.Delete, L("Permission:Units.Delete"));
        // Tables
        var tables = myGroup.AddPermission(TooHungryPermissions.Tables.Default, L("Permission:Tables"));
        tables.AddChild(TooHungryPermissions.Tables.Create, L("Permission:Tables.Create"));
        tables.AddChild(TooHungryPermissions.Tables.Edit, L("Permission:Tables.Edit"));
        tables.AddChild(TooHungryPermissions.Tables.Delete, L("Permission:Tables.Delete"));
        tables.AddChild(TooHungryPermissions.Tables.UpdateStatus, L("Permission:Tables.UpdateStatus"));
        tables.AddChild(TooHungryPermissions.Tables.Manage, L("Permission:Tables.Manage"));
        // DiningAreas
        var diningAreas = myGroup.AddPermission(TooHungryPermissions.DiningAreas.Default, L("Permission:DiningAreas"));
        diningAreas.AddChild(TooHungryPermissions.DiningAreas.Create, L("Permission:DiningAreas.Create"));
        diningAreas.AddChild(TooHungryPermissions.DiningAreas.Edit, L("Permission:DiningAreas.Edit"));
        diningAreas.AddChild(TooHungryPermissions.DiningAreas.Delete, L("Permission:DiningAreas.Delete"));
        diningAreas.AddChild(TooHungryPermissions.DiningAreas.Manage, L("Permission:DiningAreas.Manage"));
        // Reservations
        var reservations = myGroup.AddPermission(TooHungryPermissions.Reservations.Default, L("Permission:Reservations"));
        reservations.AddChild(TooHungryPermissions.Reservations.Create, L("Permission:Reservations.Create"));
        reservations.AddChild(TooHungryPermissions.Reservations.Update, L("Permission:Reservations.Update"));
        reservations.AddChild(TooHungryPermissions.Reservations.Cancel, L("Permission:Reservations.Cancel"));
        reservations.AddChild(TooHungryPermissions.Reservations.CheckIn, L("Permission:Reservations.CheckIn"));
        // Recipes
        var recipes = myGroup.AddPermission(TooHungryPermissions.Recipes.Default, L("Permission:Recipes"));
        recipes.AddChild(TooHungryPermissions.Recipes.Create, L("Permission:Recipes.Create"));
        recipes.AddChild(TooHungryPermissions.Recipes.Edit, L("Permission:Recipes.Edit"));
        recipes.AddChild(TooHungryPermissions.Recipes.Delete, L("Permission:Recipes.Delete"));
        recipes.AddChild(TooHungryPermissions.Recipes.ManageIngredients, L("Permission:Recipes.ManageIngredients"));
        recipes.AddChild(TooHungryPermissions.Recipes.ManageModifiers, L("Permission:Recipes.ManageModifiers"));
        // Inventories
        var inventories = myGroup.AddPermission(TooHungryPermissions.Inventories.Default, L("Permission:Inventories"));
        inventories.AddChild(TooHungryPermissions.Inventories.Create, L("Permission:Inventories.Create"));
        inventories.AddChild(TooHungryPermissions.Inventories.Edit, L("Permission:Inventories.Edit"));
        inventories.AddChild(TooHungryPermissions.Inventories.Delete, L("Permission:Inventories.Delete"));
        inventories.AddChild(TooHungryPermissions.Inventories.TransactionHistory, L("Permission:Inventories.TransactionHistory"));
        inventories.AddChild(TooHungryPermissions.Inventories.Batch, L("Permission:Inventories.Batch"));
        inventories.AddChild(TooHungryPermissions.Inventories.Adjust, L("Permission:Inventories.Adjust"));
        inventories.AddChild(TooHungryPermissions.Inventories.Discard, L("Permission:Inventories.Discard"));
        inventories.AddChild(TooHungryPermissions.Inventories.DeactivateBatch, L("Permission:Inventories.DeactivateBatch"));
        // Ingredients
        var ingredients = myGroup.AddPermission(TooHungryPermissions.Ingredients.Default, L("Permission:Ingredients"));
        ingredients.AddChild(TooHungryPermissions.Ingredients.Create, L("Permission:Ingredients.Create"));
        ingredients.AddChild(TooHungryPermissions.Ingredients.Edit, L("Permission:Ingredients.Edit"));
        ingredients.AddChild(TooHungryPermissions.Ingredients.Delete, L("Permission:Ingredients.Delete"));

        // Forecasts
        var forecasts = myGroup.AddPermission(TooHungryPermissions.Forecasts.Default, L("Permission:Forecasts"));
        forecasts.AddChild(TooHungryPermissions.Forecasts.Create, L("Permission:Forecasts.Create"));
        forecasts.AddChild(TooHungryPermissions.Forecasts.Edit, L("Permission:Forecasts.Edit"));
        forecasts.AddChild(TooHungryPermissions.Forecasts.Delete, L("Permission:Forecasts.Delete"));
        forecasts.AddChild(TooHungryPermissions.Forecasts.Approve, L("Permission:Forecasts.Approve"));
    }
    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<TooHungryResource>(name);
    }
}
