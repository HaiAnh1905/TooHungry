namespace Acme.TooHungry;

public static class TooHungryDomainErrorCodes
{
    // Bàn ăn (Table)
    public const string TableNameRequired = "TooHungry:Table:NameRequired";
    public const string TableInvalidCapacity = "TooHungry:Table:InvalidCapacity";
    public const string TableNameAlreadyExists = "TooHungry:Table:NameAlreadyExists";
    public const string TableAreaInactive = "TooHungry:Table:AreaInactive";
    public const string TableCannotEditOccupied = "TooHungry:Table:CannotEditOccupied";
    public const string TableCannotDeleteOccupied = "TooHungry:Table:CannotDeleteOccupied";
    public const string TableCannotDeleteWithOrders = "TooHungry:Table:CannotDeleteWithOrders";
    public const string TableInactive = "TooHungry:Table:Inactive";
    public const string TableCleaning = "TooHungry:Table:Cleaning";
    public const string TableAlreadyOccupied = "TooHungry:Table:AlreadyOccupied";
    public const string TablePendingPayment = "TooHungry:Table:PendingPayment";
    public const string TableSameSourceAndTarget = "TooHungry:Table:SameSourceAndTarget";
    public const string TableSourceNotOccupied = "TooHungry:Table:SourceNotOccupied";
    public const string TableTargetNotEmpty = "TooHungry:Table:TargetNotEmpty";
    public const string TableBothMustBeOccupied = "TooHungry:Table:BothMustBeOccupied";

    // Món ăn & Danh mục (Dish & Category)
    public const string DishNegativePrice = "TooHungry:Dish:NegativePrice";
    public const string DishNameAlreadyExists = "TooHungry:Dish:NameAlreadyExists";
    public const string DishCategoryCannotDeleteWithDishes = "TooHungry:DishCategory:CannotDeleteWithDishes";
    public const string DishCategoryNameAlreadyExists = "TooHungry:DishCategory:NameAlreadyExists";

    // Đơn vị tính (Unit)
    public const string UnitNameAlreadyExists = "TooHungry:Unit:NameAlreadyExists";
    public const string UnitCannotDeleteDefault = "TooHungry:Unit:CannotDeleteDefault";
    public const string UnitCannotDeleteInUse = "TooHungry:Unit:CannotDeleteInUse";

    // Dự báo & Kế hoạch (Forecast)
    public const string ForecastInvalidDateRange = "TooHungry:Forecast:InvalidDateRange";
    public const string ForecastNegativeQuantity = "TooHungry:Forecast:NegativeQuantity";

    // Công thức (Recipe)
    public const string RecipeIngredientNotActiveOrNotFound = "TooHungry:Recipe:IngredientNotActiveOrNotFound";
    public const string RecipeActiveAlreadyExists = "Recipe:DishAlreadyHasActiveRecipe";

    // Media
    public const string MediaUploadFailed = "TooHungry:Media:UploadFailed";
}
