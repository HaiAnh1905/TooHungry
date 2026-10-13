import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, ConfigStateService, CoreModule, PermissionService } from '@abp/ng.core';
import { DishService } from '../proxy/controllers/dish.service';
import { DishCategoryService } from '../proxy/dishes/dish-category.service';
import { OrderService } from '../proxy/orders/order.service';
import { UnitService } from '../proxy/units/unit.service';
import { InventoryService } from '../proxy/inventories/inventory.service';
import { InventoryAlertDto } from '../proxy/inventories/models';
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
  public authService = inject(AuthService);
  public permissionService = inject(PermissionService);
  private configState = inject(ConfigStateService);
  private router = inject(Router);
  private dishService = inject(DishService);
  private dishCategoryService = inject(DishCategoryService);
  private orderService = inject(OrderService);
  private unitService = inject(UnitService);
  private inventoryService = inject(InventoryService);
  private cdr = inject(ChangeDetectorRef);

  alerts: InventoryAlertDto[] = [];

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
    totalUnits: 0,
    totalRevenue: 0,
  };

  recentDishes: any[] = [];
  recentOrders: any[] = [];
  isLoading = true;

  ngOnInit() {
    if (this.hasLoggedIn) {
      const currentUser = this.configState.getOne('currentUser') as any;
      const roles: string[] = currentUser?.roles || [];
      const isManagerOrAdmin = roles.some(r =>
        ['Manager', 'Administrator', 'admin'].includes(r)
      );

      if (roles.includes('Waiter') && !isManagerOrAdmin) {
        this.router.navigate(['/waiter/tables']);
        return;
      }

      this.loadDashboardData();
    }
  }

  get debugPermissions(): string {
    const policies = (this.permissionService as any).store?.state?.auth?.grantedPolicies;
    return JSON.stringify(policies || {}, null, 2);
  }

  login() {
    this.authService.navigateToLogin();
  }

  loadDashboardData() {
    this.isLoading = true;
    
    const hasDishesPerm = this.permissionService.getGrantedPolicy('TooHungry.Dishes');
    const hasCategoriesPerm = this.permissionService.getGrantedPolicy('TooHungry.DishCategories');
    const hasOrdersPerm = this.permissionService.getGrantedPolicy('TooHungry.Orders');
    const hasUnitsPerm = this.permissionService.getGrantedPolicy('TooHungry.Units');
    const hasInventoriesPerm = this.permissionService.getGrantedPolicy('TooHungry.Inventories');

    forkJoin({
      dishes: hasDishesPerm ? this.dishService.getList({ maxResultCount: 5, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load dishes:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ) : of({ totalCount: 0, items: [] as any[] }),
      categories: hasCategoriesPerm ? this.dishCategoryService.getList({ maxResultCount: 1, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load categories:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ) : of({ totalCount: 0, items: [] as any[] }),
      orders: hasOrdersPerm ? this.orderService.getList({ maxResultCount: 5, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load orders:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ) : of({ totalCount: 0, items: [] as any[] }),
      units: hasUnitsPerm ? this.unitService.getList({ maxResultCount: 1, skipCount: 0 }).pipe(
        catchError(err => {
          console.warn('Could not load units:', err);
          return of({ totalCount: 0, items: [] as any[] });
        })
      ) : of({ totalCount: 0, items: [] as any[] }),
      alerts: hasInventoriesPerm ? this.inventoryService.getAlerts().pipe(
        catchError(err => {
          console.warn('Could not load inventory alerts:', err);
          return of([] as InventoryAlertDto[]);
        })
      ) : of([] as InventoryAlertDto[]),
    }).subscribe({
      next: res => {
        this.stats.totalDishes = res.dishes.totalCount || 0;
        this.stats.totalCategories = res.categories.totalCount || 0;
        this.stats.totalOrders = res.orders.totalCount || 0;
        this.stats.totalUnits = res.units.totalCount || 0;

        this.recentDishes = res.dishes.items || [];
        this.recentOrders = res.orders.items || [];
        this.alerts = res.alerts || [];

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
