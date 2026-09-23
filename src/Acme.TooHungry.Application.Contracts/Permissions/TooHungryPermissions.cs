namespace Acme.TooHungry.Permissions;

public static class TooHungryPermissions
{
    public const string GroupName = "TooHungry";

    public static class Dishes
    {
        public const string Default = GroupName + ".Dishes";        // "TooHungry.Dishes"
        public const string Create = Default + ".Create";           // "TooHungry.Dishes.Create"
        public const string Edit = Default + ".Edit";               // "TooHungry.Dishes.Edit"
        public const string Delete = Default + ".Delete";           // "TooHungry.Dishes.Delete"
    }

    public static class DishCategories
    {
        public const string Default = GroupName + ".DishCategories";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Recipes
    {
        public const string Default = GroupName + ".Recipes";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Orders
    {
        public const string Default = GroupName + ".Orders";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Inventories
    {
        public const string Default = GroupName + ".Inventories";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Ingredients
    {
        public const string Default = GroupName + ".Ingredients";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class IngredientCategories
    {
        public const string Default = GroupName + ".IngredientCategories";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Tables
    {
        public const string Default = GroupName + ".Tables";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class DiningAreas
    {
        public const string Default = GroupName + ".DiningAreas";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }
}
