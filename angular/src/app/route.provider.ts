import { AuthService, ConfigStateService, RoutesService, eLayoutType } from '@abp/ng.core';
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

  routes.add([
    {
      path: '/',
      name: '::Menu:Home',
      iconClass: 'fas fa-chart-line',
      order: 1,
      layout: eLayoutType.application,
    },
    {
      name: '::Menu:DishGroup',
      iconClass: 'fas fa-utensils',
      layout: eLayoutType.application,
      order: 2,
      invisible: initialInvisible,
    },
    {
      path: '/dishes',
      name: '::Menu:Dishes',
      parentName: '::Menu:DishGroup',
      iconClass: 'fas fa-bowl-food',
      layout: eLayoutType.application,
      order: 1,
      invisible: initialInvisible,
    },
    {
      path: '/dish-categories',
      name: '::Menu:DishCategories',
      parentName: '::Menu:DishGroup',
      iconClass: 'fas fa-tags',
      layout: eLayoutType.application,
      order: 2,
      invisible: initialInvisible,
    },
    {
      path: '/recipes',
      name: '::Menu:Recipes',
      parentName: '::Menu:DishGroup',
      iconClass: 'fas fa-book-open',
      layout: eLayoutType.application,
      order: 3,
      invisible: initialInvisible,
    },
    {
      path: '/orders',
      name: '::Menu:Orders',
      iconClass: 'fas fa-receipt',
      layout: eLayoutType.application,
      order: 3,
      invisible: initialInvisible,
    },
    {
      name: '::Menu:InventoryGroup',
      iconClass: 'fas fa-boxes-stacked',
      layout: eLayoutType.application,
      order: 4,
      invisible: initialInvisible,
    },
    {
      path: '/inventories',
      name: '::Menu:Inventories',
      parentName: '::Menu:InventoryGroup',
      iconClass: 'fas fa-warehouse',
      layout: eLayoutType.application,
      order: 1,
      invisible: initialInvisible,
    },
    {
      path: '/ingredients',
      name: '::Menu:Ingredients',
      parentName: '::Menu:InventoryGroup',
      iconClass: 'fas fa-carrot',
      layout: eLayoutType.application,
      order: 2,
      invisible: initialInvisible,
    },
    {
      path: '/ingredient-categories',
      name: '::Menu:IngredientCategories',
      parentName: '::Menu:InventoryGroup',
      iconClass: 'fas fa-tags',
      layout: eLayoutType.application,
      order: 3,
      invisible: initialInvisible,
    },
    {
      path: '/areas',
      name: '::Menu:DiningAreas',
      iconClass: 'fas fa-map-location-dot',
      layout: eLayoutType.application,
      order: 5,
      invisible: initialInvisible,
    },
    {
      path: '/tables',
      name: '::Menu:Tables',
      iconClass: 'fas fa-chair',
      layout: eLayoutType.application,
      order: 6,
      invisible: initialInvisible,
    },
  ]);

  // Lắng nghe trạng thái đăng nhập để tự động ẩn/hiện menu
  configState.getDeep$('currentUser.isAuthenticated').subscribe(isAuth => {
    const shouldHide = !isAuth;
    routes.patch('::Menu:DishGroup', { invisible: shouldHide });
    routes.patch('::Menu:Dishes', { invisible: shouldHide });
    routes.patch('::Menu:DishCategories', { invisible: shouldHide });
    routes.patch('::Menu:Recipes', { invisible: shouldHide });
    routes.patch('::Menu:Orders', { invisible: shouldHide });
    routes.patch('::Menu:InventoryGroup', { invisible: shouldHide });
    routes.patch('::Menu:Inventories', { invisible: shouldHide });
    routes.patch('::Menu:Ingredients', { invisible: shouldHide });
    routes.patch('::Menu:IngredientCategories', { invisible: shouldHide });
    routes.patch('::Menu:DiningAreas', { invisible: shouldHide });
    routes.patch('::Menu:Tables', { invisible: shouldHide });
  });
}
