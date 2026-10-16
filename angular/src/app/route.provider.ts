import { AuthService, ConfigStateService, RoutesService, eLayoutType } from '@abp/ng.core';
import { eThemeSharedRouteNames } from '@abp/ng.theme.shared';
import { inject, provideAppInitializer } from '@angular/core';
export const APP_ROUTE_PROVIDER = [
  provideAppInitializer(() => {
    configureRoutes();
  }),
];
function configureRoutes() {
  const routes = inject(RoutesService);
  const authService = inject(AuthService);
  const configState = inject(ConfigStateService);
  const initialInvisible = !authService.isAuthenticated;

  // Bỏ menu Quản trị (Administration) mặc định của ABP khỏi sidebar
  routes.remove([eThemeSharedRouteNames.Administration, 'AbpUiNavigation::Menu:Administration']);
  routes.patch(eThemeSharedRouteNames.Administration, { invisible: true });
  routes.patch('AbpUiNavigation::Menu:Administration', { invisible: true });
  routes.add([
    {
      path: '/',
      name: '::Menu:Home',
      iconClass: 'fas fa-chart-line',
      order: 1,
      layout: eLayoutType.application,
      requiredPolicy: 'TooHungry.Dashboard',
    },
    {
      name: '::Menu:DishGroup',
      iconClass: 'fas fa-utensils',
      layout: eLayoutType.application,
      order: 2,
      requiredPolicy: 'TooHungry.Dishes || TooHungry.DishCategories || TooHungry.Recipes',
    },
    {
      path: '/dishes',
      name: '::Menu:Dishes',
      parentName: '::Menu:DishGroup',
      iconClass: 'fas fa-bowl-food',
      layout: eLayoutType.application,
      order: 1,
      requiredPolicy: 'TooHungry.Dishes',
    },
    {
      path: '/dish-categories',
      name: '::Menu:DishCategories',
      parentName: '::Menu:DishGroup',
      iconClass: 'fas fa-tags',
      layout: eLayoutType.application,
      order: 2,
      requiredPolicy: 'TooHungry.DishCategories',
    },
    {
      path: '/recipes',
      name: '::Menu:Recipes',
      parentName: '::Menu:DishGroup',
      iconClass: 'fas fa-book-open',
      layout: eLayoutType.application,
      order: 3,
      requiredPolicy: 'TooHungry.Recipes',
    },
    {
      path: '/forecasts',
      name: '::Menu:Forecasts',
      iconClass: 'fas fa-chart-line',
      layout: eLayoutType.application,
      order: 3,
      requiredPolicy: 'TooHungry.Forecasts',
    },
    {
      path: '/orders',
      name: '::Menu:Orders',
      iconClass: 'fas fa-receipt',
      layout: eLayoutType.application,
      order: 4,
      requiredPolicy: 'TooHungry.Orders',
    },
    {
      name: '::Menu:InventoryGroup',
      iconClass: 'fas fa-boxes-stacked',
      layout: eLayoutType.application,
      order: 5,
      requiredPolicy: 'TooHungry.Inventories || TooHungry.Ingredients || TooHungry.Units',
    },
    {
      path: '/inventory',
      name: '::Menu:Inventory',
      parentName: '::Menu:InventoryGroup',
      iconClass: 'fas fa-warehouse',
      layout: eLayoutType.application,
      order: 1,
      requiredPolicy: 'TooHungry.Inventories',
    },
    {
      path: '/ingredients',
      name: '::Menu:Ingredients',
      parentName: '::Menu:InventoryGroup',
      iconClass: 'fas fa-carrot',
      layout: eLayoutType.application,
      order: 2,
      requiredPolicy: 'TooHungry.Ingredients',
    },
    {
      path: '/units',
      name: '::Menu:Units',
      parentName: '::Menu:InventoryGroup',
      iconClass: 'fas fa-scale-balanced',
      layout: eLayoutType.application,
      order: 3,
      requiredPolicy: 'TooHungry.Units',
    },
    {
      name: '::Menu:TableGroup',
      iconClass: 'fas fa-chair',
      layout: eLayoutType.application,
      order: 6,
      requiredPolicy: 'TooHungry.Tables || TooHungry.DiningAreas',
    },
    {
      path: '/tables',
      name: '::Menu:Tables',
      parentName: '::Menu:TableGroup',
      iconClass: 'fas fa-chair',
      layout: eLayoutType.application,
      order: 1,
      requiredPolicy: 'TooHungry.Tables',
    },
    {
      path: '/areas',
      name: '::Menu:DiningAreas',
      parentName: '::Menu:TableGroup',
      iconClass: 'fas fa-map-location-dot',
      layout: eLayoutType.application,
      order: 2,
      requiredPolicy: 'TooHungry.DiningAreas',
    },
    {
      name: '::Menu:IdentityGroup',
      iconClass: 'fas fa-shield-halved',
      layout: eLayoutType.application,
      order: 99,
      requiredPolicy: 'AbpIdentity.Roles || AbpIdentity.Users', // Admin only usually
    },
    {
      path: '/identity/users',
      name: '::Menu:Users',
      parentName: '::Menu:IdentityGroup',
      iconClass: 'fas fa-users',
      layout: eLayoutType.application,
      order: 1,
      requiredPolicy: 'AbpIdentity.Users',
    },
    {
      path: '/identity/roles',
      name: '::Menu:Roles',
      parentName: '::Menu:IdentityGroup',
      iconClass: 'fas fa-user-tag',
      layout: eLayoutType.application,
      order: 2,
      requiredPolicy: 'AbpIdentity.Roles',
    },
    {
      path: '/waiter',
      name: '::Menu:WaiterPortal',
      layout: eLayoutType.empty,
      invisible: true,
    },
    {
      path: '/waiter/tables',
      name: '::Menu:WaiterTables',
      layout: eLayoutType.empty,
      invisible: true,
    },
    {
      path: '/payment',
      name: '::Menu:PaymentPortal',
      layout: eLayoutType.empty,
      invisible: true,
    },
  ]);
}
