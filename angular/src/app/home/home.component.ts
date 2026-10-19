import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
  DestroyRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, ConfigStateService, CoreModule, PermissionService } from '@abp/ng.core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, Observable, Subject } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

import { DashboardService } from '../proxy/dashboard/dashboard.service';
import {
  DashboardSummaryDto,
  DashboardPeriod,
  GetDashboardInput,
  RevenueTrendPointDto,
} from '../proxy/dashboard/models';
import { InventoryAlertDto } from '../proxy/inventories/models';
import { TableSignalrService } from '../shared/services/table-signalr.service';
import { UserRoleNavigationService } from '../shared/services/user-role-navigation.service';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CoreModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  public permissionService = inject(PermissionService);
  private userRoleNav = inject(UserRoleNavigationService);
  private configState = inject(ConfigStateService);
  private router = inject(Router);
  private dashboardService = inject(DashboardService);
  private tableSignalr = inject(TableSignalrService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('revenueChartCanvas') chartCanvasRef?: ElementRef<HTMLCanvasElement>;

  // Constants
  readonly DashboardPeriod = DashboardPeriod;

  // Reactive State Signals
  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly selectedPeriod = signal<DashboardPeriod>(DashboardPeriod.Last7Days);
  readonly showCustomPicker = signal<boolean>(false);

  // Custom Date Picker inputs
  customStartDate: string = '';
  customEndDate: string = '';

  // SignalR Debounce trigger
  private realtimeRefresh$ = new Subject<void>();
  private chart: Chart | null = null;

  get hasLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }

  // Realtime clock & restaurant status for Terminal Mode (unauthenticated)
  readonly time$: Observable<Date> = timer(0, 1000).pipe(map(() => new Date()));
  readonly isRestaurantOpen$: Observable<boolean> = this.time$.pipe(
    map(date => {
      const hours = date.getHours();
      return hours >= 9 && hours < 23;
    })
  );

  // Computed percentages for Live Table Multi-Segment Progress Bar
  readonly tablePercent = computed(() => {
    const t = this.summary()?.tables;
    if (!t || t.totalTables === 0) {
      return { available: 0, occupied: 0, reserved: 0, cleaning: 0, disabled: 0 };
    }
    const total = t.totalTables;
    return {
      available: (t.availableTables / total) * 100,
      occupied: (t.occupiedTables / total) * 100,
      reserved: (t.reservedTables / total) * 100,
      cleaning: (t.cleaningTables / total) * 100,
      disabled: (t.disabledTables / total) * 100,
    };
  });

  ngOnInit() {
    if (this.hasLoggedIn) {
      if (!this.permissionService.getGrantedPolicy('TooHungry.Dashboard')) {
        const targetRoute = this.userRoleNav.getDefaultHomeRoute();
        if (targetRoute && targetRoute !== '/') {
          this.router.navigate([targetRoute]);
        } else {
          this.router.navigate(['/error/403']);
        }
        return;
      }

      this.initDefaultDates();
      this.loadDashboardData(DashboardPeriod.Last7Days);
      this.setupSignalRListeners();
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  login() {
    this.authService.navigateToLogin();
  }

  private initDefaultDates() {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(now.getDate() - 6);
    const start = startDate.toISOString().split('T')[0];
    this.customStartDate = start;
    this.customEndDate = end;
  }

  private setupSignalRListeners() {
    // Debounced reload when orders or table statuses change via SignalR
    this.realtimeRefresh$
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadDashboardData(this.selectedPeriod(), false);
      });

    this.tableSignalr.tableStatusChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.realtimeRefresh$.next();
      });

    this.tableSignalr.tableOrderUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.realtimeRefresh$.next();
      });
  }

  setPeriod(period: DashboardPeriod) {
    this.selectedPeriod.set(period);
    if (period === DashboardPeriod.Custom) {
      this.showCustomPicker.set(true);
    } else {
      this.showCustomPicker.set(false);
      this.loadDashboardData(period);
    }
  }

  applyCustomRange() {
    if (!this.customStartDate || !this.customEndDate) {
      return;
    }
    this.selectedPeriod.set(DashboardPeriod.Custom);
    this.loadDashboardData(DashboardPeriod.Custom);
  }

  loadDashboardData(period: DashboardPeriod = this.selectedPeriod(), showSpinner: boolean = true) {
    if (showSpinner) {
      this.isLoading.set(true);
    }

    const input: GetDashboardInput = {
      period: period,
    };

    if (period === DashboardPeriod.Custom) {
      if (this.customStartDate) {
        input.startDate = new Date(this.customStartDate + 'T00:00:00Z').toISOString();
      }
      if (this.customEndDate) {
        input.endDate = new Date(this.customEndDate + 'T23:59:59Z').toISOString();
      }
    }

    this.dashboardService.getSummary(input).subscribe({
      next: data => {
        this.summary.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();

        // Render or update chart
        setTimeout(() => {
          this.renderChart(data.revenueTrend || []);
        }, 50);
      },
      error: err => {
        console.error('Failed to load dashboard data:', err);
        this.isLoading.set(false);
        this.cdr.markForCheck();
        if (err?.status === 403) {
          this.router.navigate(['/error/403']);
        } else if (err?.status === 500) {
          const traceId = err?.headers?.get?.('x-correlation-id') || err?.error?.error?.data?.traceId || '';
          this.router.navigate(['/error/500'], { queryParams: traceId ? { traceId } : undefined });
        }
      },
    });
  }

  private renderChart(trendPoints: RevenueTrendPointDto[]) {
    if (!this.chartCanvasRef?.nativeElement) {
      return;
    }

    const ctx = this.chartCanvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const labels = trendPoints.map(p => p.timeLabel);
    const revenueData = trendPoints.map(p => p.revenue);
    const orderData = trendPoints.map(p => p.orderCount);

    this.chart = new Chart(ctx, {
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: 'Doanh thu (VND)',
            data: revenueData,
            backgroundColor: 'rgba(234, 88, 12, 0.82)',
            hoverBackgroundColor: '#C2410C',
            borderRadius: 6,
            yAxisID: 'yRevenue',
            order: 2,
          },
          {
            type: 'line',
            label: 'Số đơn hàng',
            data: orderData,
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            pointBackgroundColor: '#2563EB',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: false,
            yAxisID: 'yOrders',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        layout: {
          padding: {
            top: 10,
            bottom: 6,
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              boxWidth: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 24,
              font: {
                family: "'Inter', sans-serif",
                size: 13,
                weight: 'bold',
              },
              color: '#475569',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const val = context.parsed.y ?? 0;
                if (context.dataset.yAxisID === 'yRevenue') {
                  return ` ${label}: ${Number(val).toLocaleString('vi-VN')} đ`;
                }
                return ` ${label}: ${val} đơn`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: { size: 11, weight: 500 },
              color: '#64748B',
              padding: 8,
            },
          },
          yRevenue: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            grid: {
              color: 'rgba(226, 232, 240, 0.6)',
            },
            ticks: {
              font: { size: 11 },
              color: '#EA580C',
              callback: (value) => {
                const val = Number(value);
                if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M đ';
                if (val >= 1_000) return (val / 1_000).toFixed(0) + 'k đ';
                return val.toLocaleString('vi-VN') + ' đ';
              },
            },
          },
          yOrders: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              color: '#2563EB',
            },
          },
        },
      },
    });
  }

  getAlertBadgeInfo(alert: InventoryAlertDto): { textKey: string; defaultText: string; cssClass: string; iconClass: string } {
    switch (alert.alertType) {
      case 'EXPIRED':
      case 'EXPIRED_FRESH':
        return {
          textKey: '::AlertExpired',
          defaultText: 'Đã quá hạn',
          cssClass: 'bg-danger text-white',
          iconClass: 'fa-ban text-danger',
        };
      case 'OUT_OF_STOCK':
        return {
          textKey: '::AlertOutOfStock',
          defaultText: 'Hết hàng',
          cssClass: 'bg-danger text-white',
          iconClass: 'fa-box-open text-danger',
        };
      case 'NEAR_EXPIRY':
      case 'EXPIRING_SOON':
        return {
          textKey: '::AlertNearExpiry',
          defaultText: 'Sắp hết hạn',
          cssClass: 'bg-warning text-dark',
          iconClass: 'fa-clock text-warning',
        };
      case 'SHORTAGE':
      default:
        return {
          textKey: '::AlertShortage',
          defaultText: 'Tồn kho thấp',
          cssClass: 'bg-warning text-dark',
          iconClass: 'fa-triangle-exclamation text-warning',
        };
    }
  }

  getAlertQueryParams(alert: InventoryAlertDto) {
    const isBatchAlert =
      alert.alertType === 'EXPIRED' ||
      alert.alertType === 'EXPIRED_FRESH' ||
      alert.alertType === 'NEAR_EXPIRY' ||
      alert.alertType === 'EXPIRING_SOON' ||
      !!alert.batchCode;
    const queryParams: any = {};
    if (alert.ingredientName) {
      queryParams.search = alert.ingredientName;
    }
    if (alert.ingredientId) {
      queryParams.ingredientId = alert.ingredientId;
    }
    queryParams.tab = isBatchAlert ? 'batches' : 'ingredients';
    if (alert.batchCode) {
      queryParams.batchCode = alert.batchCode;
    }
    if (alert.batchId) {
      queryParams.batchId = alert.batchId;
    }
    return queryParams;
  }
}
