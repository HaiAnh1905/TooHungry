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

        // Recipes
        var recipes = myGroup.AddPermission(TooHungryPermissions.Recipes.Default, L("Permission:Recipes"));
        recipes.AddChild(TooHungryPermissions.Recipes.Create, L("Permission:Recipes.Create"));
        recipes.AddChild(TooHungryPermissions.Recipes.Edit, L("Permission:Recipes.Edit"));
        recipes.AddChild(TooHungryPermissions.Recipes.Delete, L("Permission:Recipes.Delete"));

        // Orders
        var orders = myGroup.AddPermission(TooHungryPermissions.Orders.Default, L("Permission:Orders"));
        orders.AddChild(TooHungryPermissions.Orders.Create, L("Permission:Orders.Create"));
        orders.AddChild(TooHungryPermissions.Orders.Edit, L("Permission:Orders.Edit"));
        orders.AddChild(TooHungryPermissions.Orders.Delete, L("Permission:Orders.Delete"));

        // Inventories
        var inventories = myGroup.AddPermission(TooHungryPermissions.Inventories.Default, L("Permission:Inventories"));
        inventories.AddChild(TooHungryPermissions.Inventories.Create, L("Permission:Inventories.Create"));
        inventories.AddChild(TooHungryPermissions.Inventories.Edit, L("Permission:Inventories.Edit"));
        inventories.AddChild(TooHungryPermissions.Inventories.Delete, L("Permission:Inventories.Delete"));

        // Ingredients
        var ingredients = myGroup.AddPermission(TooHungryPermissions.Ingredients.Default, L("Permission:Ingredients"));
        ingredients.AddChild(TooHungryPermissions.Ingredients.Create, L("Permission:Ingredients.Create"));
        ingredients.AddChild(TooHungryPermissions.Ingredients.Edit, L("Permission:Ingredients.Edit"));
        ingredients.AddChild(TooHungryPermissions.Ingredients.Delete, L("Permission:Ingredients.Delete"));

        // IngredientCategories
        var ingredientCategories = myGroup.AddPermission(TooHungryPermissions.IngredientCategories.Default, L("Permission:IngredientCategories"));
        ingredientCategories.AddChild(TooHungryPermissions.IngredientCategories.Create, L("Permission:IngredientCategories.Create"));
        ingredientCategories.AddChild(TooHungryPermissions.IngredientCategories.Edit, L("Permission:IngredientCategories.Edit"));
        ingredientCategories.AddChild(TooHungryPermissions.IngredientCategories.Delete, L("Permission:IngredientCategories.Delete"));

        // Tables
        var tables = myGroup.AddPermission(TooHungryPermissions.Tables.Default, L("Permission:Tables"));
        tables.AddChild(TooHungryPermissions.Tables.Create, L("Permission:Tables.Create"));
        tables.AddChild(TooHungryPermissions.Tables.Edit, L("Permission:Tables.Edit"));
        tables.AddChild(TooHungryPermissions.Tables.Delete, L("Permission:Tables.Delete"));

        // DiningAreas
        var diningAreas = myGroup.AddPermission(TooHungryPermissions.DiningAreas.Default, L("Permission:DiningAreas"));
        diningAreas.AddChild(TooHungryPermissions.DiningAreas.Create, L("Permission:DiningAreas.Create"));
        diningAreas.AddChild(TooHungryPermissions.DiningAreas.Edit, L("Permission:DiningAreas.Edit"));
        diningAreas.AddChild(TooHungryPermissions.DiningAreas.Delete, L("Permission:DiningAreas.Delete"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<TooHungryResource>(name);
    }
}
