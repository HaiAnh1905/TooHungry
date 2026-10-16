namespace Acme.TooHungry.Permissions;

public static class TooHungryPermissions
{
    public const string GroupName = "TooHungry";

    public static class Dashboard
    {
        public const string Default = GroupName + ".Dashboard";
    }

    public static class Dishes
    {
        public const string Default = GroupName + ".Dishes";
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

    public static class Orders
    {
        public const string Default = GroupName + ".Orders";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
        public const string Cancel = Default + ".Cancel";
    }

    public static class Units
    {
        public const string Default = GroupName + ".Units";
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
        public const string UpdateStatus = Default + ".UpdateStatus";
        public const string Manage = Default + ".Manage";
    }

    public static class DiningAreas
    {
        public const string Default = GroupName + ".DiningAreas";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
        public const string Manage = Default + ".Manage";
    }

    public static class Reservations
    {
        public const string Default = GroupName + ".Reservations";
        public const string Create = Default + ".Create";
        public const string Update = Default + ".Update";
        public const string Cancel = Default + ".Cancel";
        public const string CheckIn = Default + ".CheckIn";
    }

    public static class Recipes
    {
        public const string Default = GroupName + ".Recipes";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
        public const string ManageIngredients = Default + ".ManageIngredients";
        public const string ManageModifiers = Default + ".ManageModifiers";
    }

    public static class Inventories
    {
        public const string Default = GroupName + ".Inventories";
        public const string View = Default + ".View";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
        public const string TransactionHistory = Default + ".TransactionHistory";
        public const string Batch = Default + ".Batch";
        public const string Adjust = Default + ".Adjust";
        public const string Discard = Default + ".Discard";
        public const string DeactivateBatch = Default + ".DeactivateBatch";
    }

    public static class Ingredients
    {
        public const string Default = GroupName + ".Ingredients";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class UnitConversions
    {
        public const string Default = GroupName + ".UnitConversions";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Receivings
    {
        public const string Default = GroupName + ".Receivings";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class StockAdjustments
    {
        public const string Default = GroupName + ".StockAdjustments";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Wastes
    {
        public const string Default = GroupName + ".Wastes";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Stocktakings
    {
        public const string Default = GroupName + ".Stocktakings";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Bills
    {
        public const string Default = GroupName + ".Bills";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Payments
    {
        public const string Default = GroupName + ".Payments";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class Forecasts
    {
        public const string Default = GroupName + ".Forecasts";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
        public const string Approve = Default + ".Approve";
    }
}
