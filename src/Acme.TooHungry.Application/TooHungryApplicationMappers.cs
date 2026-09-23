using Riok.Mapperly.Abstractions;
using Volo.Abp.Mapperly;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Forecasts;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Tables;
using Acme.TooHungry.DiningAreas;

namespace Acme.TooHungry;

#region Dishes & Recipes
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDishToDishDtoMapper : MapperBase<Dish, DishDto>
{
    [MapProperty(nameof(Dish.DishCategory.Name), nameof(DishDto.DishCategoryName))]
    public override partial DishDto Map(Dish source);

    [MapProperty(nameof(Dish.DishCategory.Name), nameof(DishDto.DishCategoryName))]
    public override partial void Map(Dish source, DishDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDishDtoToDishMapper : MapperBase<CreateUpdateDishDto, Dish>
{
    public override partial Dish Map(CreateUpdateDishDto source);
    public override partial void Map(CreateUpdateDishDto source, Dish destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDishCategoryToDishCategoryDtoMapper : MapperBase<DishCategory, DishCategoryDto>
{
    public override partial DishCategoryDto Map(DishCategory source);
    public override partial void Map(DishCategory source, DishCategoryDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDishCategoryDtoToDishCategoryMapper : MapperBase<CreateUpdateDishCategoryDto, DishCategory>
{
    public override partial DishCategory Map(CreateUpdateDishCategoryDto source);
    public override partial void Map(CreateUpdateDishCategoryDto source, DishCategory destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryRecipeToRecipeDtoMapper : MapperBase<Recipe, RecipeDto>
{
    [MapProperty(nameof(Recipe.Dish.Name), nameof(RecipeDto.DishName))]
    public override partial RecipeDto Map(Recipe source);

    [MapProperty(nameof(Recipe.Dish.Name), nameof(RecipeDto.DishName))]
    public override partial void Map(Recipe source, RecipeDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateRecipeDtoToRecipeMapper : MapperBase<CreateUpdateRecipeDto, Recipe>
{
    public override partial Recipe Map(CreateUpdateRecipeDto source);
    public override partial void Map(CreateUpdateRecipeDto source, Recipe destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryRecipeIngredientToRecipeIngredientDtoMapper : MapperBase<RecipeIngredient, RecipeIngredientDto>
{
    [MapProperty(nameof(RecipeIngredient.Ingredient.Name), nameof(RecipeIngredientDto.IngredientName))]
    public override partial RecipeIngredientDto Map(RecipeIngredient source);

    [MapProperty(nameof(RecipeIngredient.Ingredient.Name), nameof(RecipeIngredientDto.IngredientName))]
    public override partial void Map(RecipeIngredient source, RecipeIngredientDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateRecipeIngredientDtoToRecipeIngredientMapper : MapperBase<CreateUpdateRecipeIngredientDto, RecipeIngredient>
{
    public override partial RecipeIngredient Map(CreateUpdateRecipeIngredientDto source);
    public override partial void Map(CreateUpdateRecipeIngredientDto source, RecipeIngredient destination);
}
#endregion

#region Ingredients & Units
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryUnitToUnitDtoMapper : MapperBase<Unit, UnitDto>
{
    public override partial UnitDto Map(Unit source);
    public override partial void Map(Unit source, UnitDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateUnitDtoToUnitMapper : MapperBase<CreateUpdateUnitDto, Unit>
{
    public override partial Unit Map(CreateUpdateUnitDto source);
    public override partial void Map(CreateUpdateUnitDto source, Unit destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryIngredientCategoryToIngredientCategoryDtoMapper : MapperBase<IngredientCategory, IngredientCategoryDto>
{
    public override partial IngredientCategoryDto Map(IngredientCategory source);
    public override partial void Map(IngredientCategory source, IngredientCategoryDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateIngredientCategoryDtoToIngredientCategoryMapper : MapperBase<CreateUpdateIngredientCategoryDto, IngredientCategory>
{
    public override partial IngredientCategory Map(CreateUpdateIngredientCategoryDto source);
    public override partial void Map(CreateUpdateIngredientCategoryDto source, IngredientCategory destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryIngredientToIngredientDtoMapper : MapperBase<Ingredient, IngredientDto>
{
    [MapProperty(nameof(Ingredient.Unit.Name), nameof(IngredientDto.UnitName))]
    [MapProperty(nameof(Ingredient.IngredientCategory.Name), nameof(IngredientDto.IngredientCategoryName))]
    public override partial IngredientDto Map(Ingredient source);

    [MapProperty(nameof(Ingredient.Unit.Name), nameof(IngredientDto.UnitName))]
    [MapProperty(nameof(Ingredient.IngredientCategory.Name), nameof(IngredientDto.IngredientCategoryName))]
    public override partial void Map(Ingredient source, IngredientDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateIngredientDtoToIngredientMapper : MapperBase<CreateUpdateIngredientDto, Ingredient>
{
    public override partial Ingredient Map(CreateUpdateIngredientDto source);
    public override partial void Map(CreateUpdateIngredientDto source, Ingredient destination);
}
#endregion

#region Inventories
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryInventoryToInventoryDtoMapper : MapperBase<Inventory, InventoryDto>
{
    [MapProperty(nameof(Inventory.Ingredient.Name), nameof(InventoryDto.IngredientName))]
    public override partial InventoryDto Map(Inventory source);

    [MapProperty(nameof(Inventory.Ingredient.Name), nameof(InventoryDto.IngredientName))]
    public override partial void Map(Inventory source, InventoryDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateInventoryDtoToInventoryMapper : MapperBase<CreateUpdateInventoryDto, Inventory>
{
    public override partial Inventory Map(CreateUpdateInventoryDto source);
    public override partial void Map(CreateUpdateInventoryDto source, Inventory destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryInventoryBatchToInventoryBatchDtoMapper : MapperBase<InventoryBatch, InventoryBatchDto>
{
    public override partial InventoryBatchDto Map(InventoryBatch source);
    public override partial void Map(InventoryBatch source, InventoryBatchDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateInventoryBatchDtoToInventoryBatchMapper : MapperBase<CreateUpdateInventoryBatchDto, InventoryBatch>
{
    public override partial InventoryBatch Map(CreateUpdateInventoryBatchDto source);
    public override partial void Map(CreateUpdateInventoryBatchDto source, InventoryBatch destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryInventoryTransactionToInventoryTransactionDtoMapper : MapperBase<InventoryTransaction, InventoryTransactionDto>
{
    public override partial InventoryTransactionDto Map(InventoryTransaction source);
    public override partial void Map(InventoryTransaction source, InventoryTransactionDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateInventoryTransactionDtoToInventoryTransactionMapper : MapperBase<CreateInventoryTransactionDto, InventoryTransaction>
{
    public override partial InventoryTransaction Map(CreateInventoryTransactionDto source);
    public override partial void Map(CreateInventoryTransactionDto source, InventoryTransaction destination);
}
#endregion

#region Orders
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryOrderToOrderDtoMapper : MapperBase<Order, OrderDto>
{
    [MapProperty(nameof(Order.Table.Name), nameof(OrderDto.TableName))]
    public override partial OrderDto Map(Order source);

    [MapProperty(nameof(Order.Table.Name), nameof(OrderDto.TableName))]
    public override partial void Map(Order source, OrderDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateOrderDtoToOrderMapper : MapperBase<CreateUpdateOrderDto, Order>
{
    public override partial Order Map(CreateUpdateOrderDto source);
    public override partial void Map(CreateUpdateOrderDto source, Order destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryOrderItemToOrderItemDtoMapper : MapperBase<OrderItem, OrderItemDto>
{
    [MapProperty(nameof(OrderItem.Dish.Name), nameof(OrderItemDto.DishName))]
    public override partial OrderItemDto Map(OrderItem source);

    [MapProperty(nameof(OrderItem.Dish.Name), nameof(OrderItemDto.DishName))]
    public override partial void Map(OrderItem source, OrderItemDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateOrderItemDtoToOrderItemMapper : MapperBase<CreateUpdateOrderItemDto, OrderItem>
{
    public override partial OrderItem Map(CreateUpdateOrderItemDto source);
    public override partial void Map(CreateUpdateOrderItemDto source, OrderItem destination);
}
#endregion

#region Forecasts
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDemandForecastToDemandForecastDtoMapper : MapperBase<DemandForecast, DemandForecastDto>
{
    public override partial DemandForecastDto Map(DemandForecast source);
    public override partial void Map(DemandForecast source, DemandForecastDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDemandForecastDtoToDemandForecastMapper : MapperBase<CreateUpdateDemandForecastDto, DemandForecast>
{
    public override partial DemandForecast Map(CreateUpdateDemandForecastDto source);
    public override partial void Map(CreateUpdateDemandForecastDto source, DemandForecast destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDemandForecastItemToDemandForecastItemDtoMapper : MapperBase<DemandForecastItem, DemandForecastItemDto>
{
    [MapProperty(nameof(DemandForecastItem.Dish.Name), nameof(DemandForecastItemDto.DishName))]
    public override partial DemandForecastItemDto Map(DemandForecastItem source);

    [MapProperty(nameof(DemandForecastItem.Dish.Name), nameof(DemandForecastItemDto.DishName))]
    public override partial void Map(DemandForecastItem source, DemandForecastItemDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDemandForecastItemDtoToDemandForecastItemMapper : MapperBase<CreateUpdateDemandForecastItemDto, DemandForecastItem>
{
    public override partial DemandForecastItem Map(CreateUpdateDemandForecastItemDto source);
    public override partial void Map(CreateUpdateDemandForecastItemDto source, DemandForecastItem destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryIngredientPlanToIngredientPlanDtoMapper : MapperBase<IngredientPlan, IngredientPlanDto>
{
    public override partial IngredientPlanDto Map(IngredientPlan source);
    public override partial void Map(IngredientPlan source, IngredientPlanDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateIngredientPlanDtoToIngredientPlanMapper : MapperBase<CreateUpdateIngredientPlanDto, IngredientPlan>
{
    public override partial IngredientPlan Map(CreateUpdateIngredientPlanDto source);
    public override partial void Map(CreateUpdateIngredientPlanDto source, IngredientPlan destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryIngredientPlanItemToIngredientPlanItemDtoMapper : MapperBase<IngredientPlanItem, IngredientPlanItemDto>
{
    [MapProperty(nameof(IngredientPlanItem.Ingredient.Name), nameof(IngredientPlanItemDto.IngredientName))]
    public override partial IngredientPlanItemDto Map(IngredientPlanItem source);

    [MapProperty(nameof(IngredientPlanItem.Ingredient.Name), nameof(IngredientPlanItemDto.IngredientName))]
    public override partial void Map(IngredientPlanItem source, IngredientPlanItemDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateIngredientPlanItemDtoToIngredientPlanItemMapper : MapperBase<CreateUpdateIngredientPlanItemDto, IngredientPlanItem>
{
    public override partial IngredientPlanItem Map(CreateUpdateIngredientPlanItemDto source);
    public override partial void Map(CreateUpdateIngredientPlanItemDto source, IngredientPlanItem destination);
}
#endregion

#region DailyMenus
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDailyMenuToDailyMenuDtoMapper : MapperBase<DailyMenu, DailyMenuDto>
{
    public override partial DailyMenuDto Map(DailyMenu source);
    public override partial void Map(DailyMenu source, DailyMenuDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDailyMenuDtoToDailyMenuMapper : MapperBase<CreateUpdateDailyMenuDto, DailyMenu>
{
    public override partial DailyMenu Map(CreateUpdateDailyMenuDto source);
    public override partial void Map(CreateUpdateDailyMenuDto source, DailyMenu destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDailyMenuItemToDailyMenuItemDtoMapper : MapperBase<DailyMenuItem, DailyMenuItemDto>
{
    [MapProperty(nameof(DailyMenuItem.Dish.Name), nameof(DailyMenuItemDto.DishName))]
    [MapProperty(nameof(DailyMenuItem.Dish.Price), nameof(DailyMenuItemDto.DishPrice))]
    public override partial DailyMenuItemDto Map(DailyMenuItem source);

    [MapProperty(nameof(DailyMenuItem.Dish.Name), nameof(DailyMenuItemDto.DishName))]
    [MapProperty(nameof(DailyMenuItem.Dish.Price), nameof(DailyMenuItemDto.DishPrice))]
    public override partial void Map(DailyMenuItem source, DailyMenuItemDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.None)]
public partial class TooHungryCreateUpdateDailyMenuItemDtoToDailyMenuItemMapper : MapperBase<CreateUpdateDailyMenuItemDto, DailyMenuItem>
{
    public override partial DailyMenuItem Map(CreateUpdateDailyMenuItemDto source);
    public override partial void Map(CreateUpdateDailyMenuItemDto source, DailyMenuItem destination);
}
#endregion

#region Tables
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryRestaurantTableToTableDtoMapper : MapperBase<RestaurantTable, TableDto>
{
    [MapProperty(nameof(RestaurantTable.DiningArea) + "." + nameof(DiningArea.Name), nameof(TableDto.DiningAreaName))]
    public override partial TableDto Map(RestaurantTable source);

    [MapProperty(nameof(RestaurantTable.DiningArea) + "." + nameof(DiningArea.Name), nameof(TableDto.DiningAreaName))]
    public override partial void Map(RestaurantTable source, TableDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateTableDtoToRestaurantTableMapper : MapperBase<CreateUpdateTableDto, RestaurantTable>
{
    public override partial RestaurantTable Map(CreateUpdateTableDto source);
    public override partial void Map(CreateUpdateTableDto source, RestaurantTable destination);
}
#endregion

#region DiningAreas
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDiningAreaToDiningAreaDtoMapper : MapperBase<DiningArea, DiningAreaDto>
{
    [MapProperty(nameof(DiningArea.Tables) + ".Count", nameof(DiningAreaDto.TableCount))]
    public override partial DiningAreaDto Map(DiningArea source);

    [MapProperty(nameof(DiningArea.Tables) + ".Count", nameof(DiningAreaDto.TableCount))]
    public override partial void Map(DiningArea source, DiningAreaDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDiningAreaDtoToDiningAreaMapper : MapperBase<CreateUpdateDiningAreaDto, DiningArea>
{
    public override partial DiningArea Map(CreateUpdateDiningAreaDto source);
    public override partial void Map(CreateUpdateDiningAreaDto source, DiningArea destination);
}
#endregion

