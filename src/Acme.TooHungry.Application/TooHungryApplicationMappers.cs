using Riok.Mapperly.Abstractions;
using Volo.Abp.Mapperly;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Units;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Forecasts;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Tables;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Recipes;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Reservations;

namespace Acme.TooHungry;

#region Dishes
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
#endregion

#region Units
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
    [MapperIgnoreTarget(nameof(Order.TotalAmount))]
    public override partial Order Map(CreateUpdateOrderDto source);

    [MapperIgnoreTarget(nameof(Order.TotalAmount))]
    public override partial void Map(CreateUpdateOrderDto source, Order destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryOrderItemToOrderItemDtoMapper : MapperBase<OrderItem, OrderItemDto>
{
    [MapProperty(nameof(OrderItem.Dish.Name), nameof(OrderItemDto.DishName))]
    [MapProperty(nameof(OrderItem.Dish.ImageUrl), nameof(OrderItemDto.DishPhotoUrl))]
    public override partial OrderItemDto Map(OrderItem source);

    [MapProperty(nameof(OrderItem.Dish.Name), nameof(OrderItemDto.DishName))]
    [MapProperty(nameof(OrderItem.Dish.ImageUrl), nameof(OrderItemDto.DishPhotoUrl))]
    public override partial void Map(OrderItem source, OrderItemDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateOrderItemDtoToOrderItemMapper : MapperBase<CreateUpdateOrderItemDto, OrderItem>
{
    [MapperIgnoreTarget(nameof(OrderItem.UnitPrice))]
    [MapperIgnoreTarget(nameof(OrderItem.TotalPrice))]
    [MapperIgnoreTarget(nameof(OrderItem.OrderId))]
    [MapperIgnoreTarget(nameof(OrderItem.Order))]
    [MapperIgnoreTarget(nameof(OrderItem.Dish))]
    public override partial OrderItem Map(CreateUpdateOrderItemDto source);

    [MapperIgnoreTarget(nameof(OrderItem.UnitPrice))]
    [MapperIgnoreTarget(nameof(OrderItem.TotalPrice))]
    [MapperIgnoreTarget(nameof(OrderItem.OrderId))]
    [MapperIgnoreTarget(nameof(OrderItem.Order))]
    [MapperIgnoreTarget(nameof(OrderItem.Dish))]
    public override partial void Map(CreateUpdateOrderItemDto source, OrderItem destination);
}
#endregion

#region Forecasts
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDemandForecastToDemandForecastDtoMapper : MapperBase<DemandForecast, DemandForecastDto>
{
    [MapperIgnoreTarget(nameof(DemandForecastDto.ProjectedRevenue))]
    [MapperIgnoreTarget(nameof(DemandForecastDto.IngredientPlanId))]
    [MapperIgnoreTarget(nameof(DemandForecastDto.IngredientPlanStatus))]
    public override partial DemandForecastDto Map(DemandForecast source);

    [MapperIgnoreTarget(nameof(DemandForecastDto.ProjectedRevenue))]
    [MapperIgnoreTarget(nameof(DemandForecastDto.IngredientPlanId))]
    [MapperIgnoreTarget(nameof(DemandForecastDto.IngredientPlanStatus))]
    public override partial void Map(DemandForecast source, DemandForecastDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDemandForecastDtoToDemandForecastMapper : MapperBase<CreateUpdateDemandForecastDto, DemandForecast>
{
    [MapperIgnoreTarget(nameof(DemandForecast.Items))]
    public override partial DemandForecast Map(CreateUpdateDemandForecastDto source);

    [MapperIgnoreTarget(nameof(DemandForecast.Items))]
    public override partial void Map(CreateUpdateDemandForecastDto source, DemandForecast destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryDemandForecastItemToDemandForecastItemDtoMapper : MapperBase<DemandForecastItem, DemandForecastItemDto>
{
    [MapProperty(nameof(DemandForecastItem.Dish.Name), nameof(DemandForecastItemDto.DishName))]
    [MapProperty(nameof(DemandForecastItem.Dish.ImageUrl), nameof(DemandForecastItemDto.DishImageUrl))]
    [MapProperty(nameof(DemandForecastItem.Dish.Price), nameof(DemandForecastItemDto.DishPrice))]
    [MapperIgnoreTarget(nameof(DemandForecastItemDto.HasRecipe))]
    public override partial DemandForecastItemDto Map(DemandForecastItem source);

    [MapProperty(nameof(DemandForecastItem.Dish.Name), nameof(DemandForecastItemDto.DishName))]
    [MapProperty(nameof(DemandForecastItem.Dish.ImageUrl), nameof(DemandForecastItemDto.DishImageUrl))]
    [MapProperty(nameof(DemandForecastItem.Dish.Price), nameof(DemandForecastItemDto.DishPrice))]
    [MapperIgnoreTarget(nameof(DemandForecastItemDto.HasRecipe))]
    public override partial void Map(DemandForecastItem source, DemandForecastItemDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryCreateUpdateDemandForecastItemDtoToDemandForecastItemMapper : MapperBase<CreateUpdateDemandForecastItemDto, DemandForecastItem>
{
    [MapperIgnoreTarget(nameof(DemandForecastItem.DemandForecastId))]
    [MapperIgnoreTarget(nameof(DemandForecastItem.DemandForecast))]
    [MapperIgnoreTarget(nameof(DemandForecastItem.Dish))]
    public override partial DemandForecastItem Map(CreateUpdateDemandForecastItemDto source);

    [MapperIgnoreTarget(nameof(DemandForecastItem.DemandForecastId))]
    [MapperIgnoreTarget(nameof(DemandForecastItem.DemandForecast))]
    [MapperIgnoreTarget(nameof(DemandForecastItem.Dish))]
    public override partial void Map(CreateUpdateDemandForecastItemDto source, DemandForecastItem destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryIngredientPlanToIngredientPlanDtoMapper : MapperBase<IngredientPlan, IngredientPlanDto>
{
    public override partial IngredientPlanDto Map(IngredientPlan source);
    public override partial void Map(IngredientPlan source, IngredientPlanDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryIngredientPlanItemToIngredientPlanItemDtoMapper : MapperBase<IngredientPlanItem, IngredientPlanItemDto>
{
    [MapProperty(nameof(IngredientPlanItem.Ingredient.Name), nameof(IngredientPlanItemDto.IngredientName))]
    [MapProperty(nameof(IngredientPlanItem.Ingredient.BaseUnit), nameof(IngredientPlanItemDto.BaseUnit))]
    [MapProperty(nameof(IngredientPlanItem.Ingredient.EstimatedPrice), nameof(IngredientPlanItemDto.EstimatedPrice))]
    [MapperIgnoreTarget(nameof(IngredientPlanItemDto.CurrentStock))]
    [MapperIgnoreTarget(nameof(IngredientPlanItemDto.SuggestedPurchaseQuantity))]
    [MapperIgnoreTarget(nameof(IngredientPlanItemDto.EstimatedCost))]
    public override partial IngredientPlanItemDto Map(IngredientPlanItem source);

    [MapProperty(nameof(IngredientPlanItem.Ingredient.Name), nameof(IngredientPlanItemDto.IngredientName))]
    [MapProperty(nameof(IngredientPlanItem.Ingredient.BaseUnit), nameof(IngredientPlanItemDto.BaseUnit))]
    [MapProperty(nameof(IngredientPlanItem.Ingredient.EstimatedPrice), nameof(IngredientPlanItemDto.EstimatedPrice))]
    [MapperIgnoreTarget(nameof(IngredientPlanItemDto.CurrentStock))]
    [MapperIgnoreTarget(nameof(IngredientPlanItemDto.SuggestedPurchaseQuantity))]
    [MapperIgnoreTarget(nameof(IngredientPlanItemDto.EstimatedCost))]
    public override partial void Map(IngredientPlanItem source, IngredientPlanItemDto destination);
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

#region Recipes
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryRecipeToRecipeDtoMapper : MapperBase<Recipe, RecipeDto>
{
    [MapProperty(nameof(Recipe.Dish) + "." + nameof(Dish.Name), nameof(RecipeDto.DishName))]
    [MapProperty(nameof(Recipe.Dish) + "." + nameof(Dish.Price), nameof(RecipeDto.DishPrice))]
    [MapperIgnoreTarget(nameof(RecipeDto.TotalEstimatedCost))]
    [MapperIgnoreTarget(nameof(RecipeDto.FoodCostPercentage))]
    [MapperIgnoreTarget(nameof(RecipeDto.HasDeactivatedIngredients))]
    public override partial RecipeDto Map(Recipe source);

    [MapProperty(nameof(Recipe.Dish) + "." + nameof(Dish.Name), nameof(RecipeDto.DishName))]
    [MapProperty(nameof(Recipe.Dish) + "." + nameof(Dish.Price), nameof(RecipeDto.DishPrice))]
    [MapperIgnoreTarget(nameof(RecipeDto.TotalEstimatedCost))]
    [MapperIgnoreTarget(nameof(RecipeDto.FoodCostPercentage))]
    [MapperIgnoreTarget(nameof(RecipeDto.HasDeactivatedIngredients))]
    public override partial void Map(Recipe source, RecipeDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryRecipeIngredientToRecipeIngredientDtoMapper : MapperBase<RecipeIngredient, RecipeIngredientDto>
{
    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.Name), nameof(RecipeIngredientDto.IngredientName))]
    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.BaseUnit), nameof(RecipeIngredientDto.BaseUnit))]
    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.EstimatedPrice), nameof(RecipeIngredientDto.EstimatedPrice))]
    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.IsActive), nameof(RecipeIngredientDto.IsIngredientActive))]
    [MapperIgnoreTarget(nameof(RecipeIngredientDto.BaseQuantity))]
    [MapperIgnoreTarget(nameof(RecipeIngredientDto.ItemEstimatedCost))]
    public override partial RecipeIngredientDto Map(RecipeIngredient source);

    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.Name), nameof(RecipeIngredientDto.IngredientName))]
    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.BaseUnit), nameof(RecipeIngredientDto.BaseUnit))]
    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.EstimatedPrice), nameof(RecipeIngredientDto.EstimatedPrice))]
    [MapProperty(nameof(RecipeIngredient.Ingredient) + "." + nameof(Ingredient.IsActive), nameof(RecipeIngredientDto.IsIngredientActive))]
    [MapperIgnoreTarget(nameof(RecipeIngredientDto.BaseQuantity))]
    [MapperIgnoreTarget(nameof(RecipeIngredientDto.ItemEstimatedCost))]
    public override partial void Map(RecipeIngredient source, RecipeIngredientDto destination);
}
#endregion

#region Inventories
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryInventoryBatchToInventoryBatchDtoMapper : MapperBase<InventoryBatch, InventoryBatchDto>
{
    [MapProperty(nameof(InventoryBatch.Ingredient) + "." + nameof(Ingredient.Name), nameof(InventoryBatchDto.IngredientName))]
    public override partial InventoryBatchDto Map(InventoryBatch source);

    [MapProperty(nameof(InventoryBatch.Ingredient) + "." + nameof(Ingredient.Name), nameof(InventoryBatchDto.IngredientName))]
    public override partial void Map(InventoryBatch source, InventoryBatchDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryInventoryTransactionToInventoryTransactionDtoMapper : MapperBase<InventoryTransaction, InventoryTransactionDto>
{
    [MapProperty(nameof(InventoryTransaction.Ingredient) + "." + nameof(Ingredient.Name), nameof(InventoryTransactionDto.IngredientName))]
    [MapProperty(nameof(InventoryTransaction.Batch) + "." + nameof(InventoryBatch.BatchCode), nameof(InventoryTransactionDto.BatchCode))]
    public override partial InventoryTransactionDto Map(InventoryTransaction source);

    [MapProperty(nameof(InventoryTransaction.Ingredient) + "." + nameof(Ingredient.Name), nameof(InventoryTransactionDto.IngredientName))]
    [MapProperty(nameof(InventoryTransaction.Batch) + "." + nameof(InventoryBatch.BatchCode), nameof(InventoryTransactionDto.BatchCode))]
    public override partial void Map(InventoryTransaction source, InventoryTransactionDto destination);
}
#endregion

#region Ingredients
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public partial class TooHungryIngredientToIngredientDtoMapper : MapperBase<Ingredient, IngredientDto>
{
    public override partial IngredientDto Map(Ingredient source);
    public override partial void Map(Ingredient source, IngredientDto destination);
}
#endregion

#region Reservations
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.None)]
public partial class TooHungryTableReservationToTableReservationDtoMapper : MapperBase<TableReservation, TableReservationDto>
{
    [MapperIgnoreTarget(nameof(TableReservationDto.TableName))]
    public override partial TableReservationDto Map(TableReservation source);

    [MapperIgnoreTarget(nameof(TableReservationDto.TableName))]
    public override partial void Map(TableReservation source, TableReservationDto destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.None)]
public partial class TooHungryCreateTableReservationDtoToTableReservationMapper : MapperBase<CreateTableReservationDto, TableReservation>
{
    public override partial TableReservation Map(CreateTableReservationDto source);
    public override partial void Map(CreateTableReservationDto source, TableReservation destination);
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.None)]
public partial class TooHungryUpdateTableReservationDtoToTableReservationMapper : MapperBase<UpdateTableReservationDto, TableReservation>
{
    public override partial TableReservation Map(UpdateTableReservationDto source);
    public override partial void Map(UpdateTableReservationDto source, TableReservation destination);
}
#endregion

