import { authGuard, eLayoutType } from '@abp/ng.core';
import { smartPermissionGuard } from './shared/guards/smart-permission.guard';
import { dashboardGuard, adminTableGuard } from './shared/guards/dashboard.guard';
import { waiterAuthGuard } from './waiter/guards/waiter-auth.guard';
import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.component').then(c => c.HomeComponent),
    canActivate: [dashboardGuard],
  },
  {
    path: 'account/register',
    loadComponent: () => import('./account/register/register.component').then(c => c.RegisterComponent),
  },
  {
    path: 'account',
    loadChildren: () => import('@abp/ng.account').then(c => c.createRoutes()),
  },
  {
    path: 'identity',
    children: [
      {
        path: 'users',
        loadComponent: () => import('./identity/users/users').then(c => c.Users),
        canActivate: [authGuard, smartPermissionGuard],
        data: { requiredPolicy: 'AbpIdentity.Users' },
      },
      {
        path: 'roles',
        loadComponent: () => import('./identity/roles/roles').then(c => c.Roles),
        canActivate: [authGuard, smartPermissionGuard],
        data: { requiredPolicy: 'AbpIdentity.Roles' },
      },
    ],
  },
  {
    path: 'setting-management',
    loadChildren: () => import('@abp/ng.setting-management').then(c => c.createRoutes()),
  },
  {
    path: 'dishes',
    loadComponent: () => import('./dish/dish.component').then(c => c.DishComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Dishes' },
  },
  {
    path: 'dish-categories',
    loadComponent: () => import('./dish-category/dish-category.component').then(c => c.DishCategoryComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.DishCategories' },
  },
  {
    path: 'orders',
    loadComponent: () => import('./order/order.component').then(c => c.OrderComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Orders' },
  },
  {
    path: 'units',
    loadComponent: () => import('./unit/unit.component').then(c => c.UnitComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Units' },
  },
  {
    path: 'areas',
    loadComponent: () => import('./dining-area/dining-area.component').then(c => c.DiningAreaComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.DiningAreas' },
  },
  {
    path: 'dining-areas',
    redirectTo: 'areas',
    pathMatch: 'full',
  },
  {
    path: 'tables',
    loadComponent: () => import('./table/table.component').then(c => c.TableComponent),
    canActivate: [authGuard, adminTableGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Tables' },
  },
  {
    path: 'waiter',
    loadComponent: () =>
      import('./waiter/layout/waiter-layout.component').then(c => c.WaiterLayoutComponent),
    canActivate: [authGuard, waiterAuthGuard],
    data: { layout: eLayoutType.empty },
    children: [
      {
        path: '',
        redirectTo: 'tables',
        pathMatch: 'full',
      },
      {
        path: 'tables',
        loadComponent: () =>
          import('./waiter/tables/waiter-tables.component').then(c => c.WaiterTablesComponent),
        canActivate: [smartPermissionGuard],
        data: { requiredPolicy: 'TooHungry.Tables', layout: eLayoutType.empty },
      },
      {
        path: 'order/:tableId',
        loadComponent: () =>
          import('./waiter/order/waiter-order.component').then(c => c.WaiterOrderComponent),
        canActivate: [smartPermissionGuard],
        data: { requiredPolicy: 'TooHungry.Orders', layout: eLayoutType.empty },
      },
      {
        path: 'payment/:orderId',
        redirectTo: '/payment/:orderId',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'tables',
      },
    ],
  },
  {
    path: 'payment/:orderId',
    loadComponent: () => import('./payment/payment.component').then(c => c.PaymentComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Orders', layout: eLayoutType.empty },
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipe/recipe.component').then(c => c.RecipeComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Recipes' },
  },
  {
    path: 'ingredients/deactivated',
    loadComponent: () =>
      import('./ingredient/deactivated-ingredients/deactivated-ingredients.component').then(
        c => c.DeactivatedIngredientsComponent
      ),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Ingredients' },
  },
  {
    path: 'ingredients',
    loadComponent: () => import('./ingredient/ingredient.component').then(c => c.IngredientComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Ingredients' },
  },
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/inventory.component').then(c => c.InventoryComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Inventories' },
  },
  {
    path: 'forecasts',
    loadComponent: () => import('./forecast/forecast.component').then(c => c.ForecastComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Forecasts' },
  },
  {
    path: 'forecasts/detail/:id',
    loadComponent: () =>
      import('./forecast/forecast-detail/forecast-detail.component').then(
        c => c.ForecastDetailComponent
      ),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Forecasts' },
  },
];


