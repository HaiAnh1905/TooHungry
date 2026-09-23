import { authGuard, permissionGuard } from '@abp/ng.core';
import { Routes } from '@angular/router';
export const APP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.component').then(c => c.HomeComponent),
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
    loadChildren: () => import('@abp/ng.identity').then(c => c.createRoutes()),
  },
  // {
  //   path: 'tenant-management',
  //   loadChildren: () => import('@abp/ng.tenant-management').then(c => c.createRoutes()),
  // },
  {
    path: 'setting-management',
    loadChildren: () => import('@abp/ng.setting-management').then(c => c.createRoutes()),
  },
  {
    path: 'dishes',
    loadComponent: () => import('./dish/dish.component').then(c => c.DishComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dish-categories',
    loadComponent: () => import('./dish-category/dish-category.component').then(c => c.DishCategoryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipe/recipe.component').then(c => c.RecipeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    loadComponent: () => import('./order/order.component').then(c => c.OrderComponent),
    canActivate: [authGuard],
  },
  {
    path: 'inventories',
    loadComponent: () => import('./inventory/inventory.component').then(c => c.InventoryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ingredients',
    loadComponent: () => import('./ingredient/ingredient.component').then(c => c.IngredientComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ingredient-categories',
    loadComponent: () => import('./ingredient-category/ingredient-category.component').then(c => c.IngredientCategoryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'areas',
    loadComponent: () => import('./dining-area/dining-area.component').then(c => c.DiningAreaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dining-areas',
    redirectTo: 'areas',
    pathMatch: 'full',
  },
  {
    path: 'tables',
    loadComponent: () => import('./table/table.component').then(c => c.TableComponent),
    canActivate: [authGuard],
  },
  {
    path: 'payment/:orderId',
    loadComponent: () => import('./payment/payment.component').then(c => c.PaymentComponent),
    canActivate: [authGuard],
  },
];
