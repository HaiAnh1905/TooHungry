import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, CoreModule } from '@abp/ng.core';
import { DishService } from '../proxy/dishes/dish.service';
import { DishCategoryService } from '../proxy/dishes/dish-category.service';
import { OrderService } from '../proxy/orders/order.service';
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { forkJoin, of, timer, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CoreModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private dishService = inject(DishService);
  private dishCategoryService = inject(DishCategoryService);
  private orderService = inject(OrderService);
  private ingredientService = inject(IngredientService);
  private cdr = inject(ChangeDetectorRef);

  get hasLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }

  readonly time$: Observable<Date> = timer(0, 1000).pipe(map(() => new Date()));
  readonly isRestaurantOpen$: Observable<boolean> = this.time$.pipe(
    map(date => {
      const hours = date.getHours();
      return hours >= 9 && hours < 23;
    })
  );

  stats = {
    totalDishes: 0,
    totalCategories: 0,
    totalOrders: 0,
    totalIngredients: 0,
    totalRevenue: 0,
  };

  recentDishes: any[] = [];
  recentOrders: any[] = [];
  isLoading = true;

  ngOnInit() {
    if (this.hasLoggedIn) {
      this.loadDashboardData();
    }
  }

  login() {
    this.authService.navigateToLogin();
  }

  loadDashboardData() {
    this.isLoading = true;
    forkJoin({
      dishes: this.dishService.getList({ maxResultCount: 5, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load dishes:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ),
      categories: this.dishCategoryService.getList({ maxResultCount: 1, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load categories:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ),
      orders: this.orderService.getList({ maxResultCount: 5, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load orders:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ),
      ingredients: this.ingredientService.getList({ maxResultCount: 1, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load ingredients:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ),
    }).subscribe({
      next: res => {
        this.stats.totalDishes = res.dishes.totalCount || 0;
        this.stats.totalCategories = res.categories.totalCount || 0;
        this.stats.totalOrders = res.orders.totalCount || 0;
        this.stats.totalIngredients = res.ingredients.totalCount || 0;

        this.recentDishes = res.dishes.items || [];
        this.recentOrders = res.orders.items || [];

        // Tính sơ bộ tổng doanh thu từ orders
        this.stats.totalRevenue = (res.orders.items || []).reduce(
          (sum, item) => sum + ((item as any).totalAmount || 0),
          0
        );

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
