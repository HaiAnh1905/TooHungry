import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CoreModule } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DemandForecastService } from '../../proxy/forecasts/demand-forecast.service';
import { IngredientPlanService } from '../../proxy/forecasts/ingredient-plan.service';
import {
  DemandForecastDto,
  DemandForecastItemDto,
  ForecastFinancialSummaryDto,
  IngredientPlanDto,
  IngredientPlanItemDto,
} from '../../proxy/forecasts/models';
import { PlanStatus } from '../../proxy/forecasts/plan-status.enum';

@Component({
  selector: 'app-forecast-detail',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, FormsModule],
  templateUrl: './forecast-detail.component.html',
  styleUrl: './forecast-detail.component.scss',
})
export class ForecastDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly forecastService = inject(DemandForecastService);
  private readonly planService = inject(IngredientPlanService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly cdr = inject(ChangeDetectorRef);

  forecastId = '';
  forecast: DemandForecastDto | null = null;
  ingredientPlan: IngredientPlanDto | null = null;
  financialSummary: ForecastFinancialSummaryDto = {
    projectedRevenue: 0,
    projectedIngredientCost: 0,
    foodCostPercentage: 0,
    projectedPurchaseBudget: 0,
  };

  activeTab: 'dishes' | 'ingredients' = 'dishes';
  isLoading = true;
  isApproving = false;
  PlanStatus = PlanStatus;

  // Pagination & filter options
  readonly pageSizeOptions = [10, 20, 50];

  // Tab 1: Dishes Filter & Pagination
  dishSearch = '';
  dishRecipeFilter: 'all' | 'hasRecipe' | 'noRecipe' = 'all';
  dishPageIndex = 1;
  dishPageSize = 10;

  get filteredDishes(): DemandForecastItemDto[] {
    if (!this.forecast?.items) return [];
    let items = this.forecast.items;

    if (this.dishSearch.trim()) {
      const q = this.dishSearch.toLowerCase().trim();
      items = items.filter(d => (d.dishName || '').toLowerCase().includes(q));
    }

    if (this.dishRecipeFilter === 'hasRecipe') {
      items = items.filter(d => d.hasRecipe);
    } else if (this.dishRecipeFilter === 'noRecipe') {
      items = items.filter(d => !d.hasRecipe);
    }

    return items;
  }

  get pagedDishes(): DemandForecastItemDto[] {
    const start = (this.dishPageIndex - 1) * this.dishPageSize;
    return this.filteredDishes.slice(start, start + this.dishPageSize);
  }

  get dishTotalPages(): number {
    return Math.ceil(this.filteredDishes.length / this.dishPageSize) || 1;
  }

  get dishPageNumbers(): number[] {
    const total = this.dishTotalPages;
    const current = this.dishPageIndex;
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  onDishPageChange(page: number): void {
    if (page >= 1 && page <= this.dishTotalPages) {
      this.dishPageIndex = page;
    }
  }

  onDishPageSizeChange(size: number): void {
    this.dishPageSize = Number(size);
    this.dishPageIndex = 1;
  }

  onDishSearchChange(): void {
    this.dishPageIndex = 1;
  }

  // Tab 2: Ingredients Filter & Pagination
  ingredientSearch = '';
  ingredientStockFilter: 'all' | 'needBuy' | 'sufficient' = 'all';
  ingredientPageIndex = 1;
  ingredientPageSize = 10;

  get filteredIngredients(): IngredientPlanItemDto[] {
    if (!this.ingredientPlan?.items) return [];
    let items = this.ingredientPlan.items;

    if (this.ingredientSearch.trim()) {
      const q = this.ingredientSearch.toLowerCase().trim();
      items = items.filter(i => (i.ingredientName || '').toLowerCase().includes(q));
    }

    if (this.ingredientStockFilter === 'needBuy') {
      items = items.filter(i => (i.suggestedPurchaseQuantity || 0) > 0);
    } else if (this.ingredientStockFilter === 'sufficient') {
      items = items.filter(i => (i.suggestedPurchaseQuantity || 0) <= 0);
    }

    return items;
  }

  get pagedIngredients(): IngredientPlanItemDto[] {
    const start = (this.ingredientPageIndex - 1) * this.ingredientPageSize;
    return this.filteredIngredients.slice(start, start + this.ingredientPageSize);
  }

  get ingredientTotalPages(): number {
    return Math.ceil(this.filteredIngredients.length / this.ingredientPageSize) || 1;
  }

  get ingredientPageNumbers(): number[] {
    const total = this.ingredientTotalPages;
    const current = this.ingredientPageIndex;
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  onIngredientPageChange(page: number): void {
    if (page >= 1 && page <= this.ingredientTotalPages) {
      this.ingredientPageIndex = page;
    }
  }

  onIngredientPageSizeChange(size: number): void {
    this.ingredientPageSize = Number(size);
    this.ingredientPageIndex = 1;
  }

  onIngredientSearchChange(): void {
    this.ingredientPageIndex = 1;
  }

  ngOnInit(): void {
    this.forecastId = this.route.snapshot.paramMap.get('id') || '';
    if (this.forecastId) {
      this.loadData();
    } else {
      this.router.navigate(['/forecasts']);
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.forecastService.get(this.forecastId).subscribe({
      next: fc => {
        this.forecast = fc;
        this.loadPlan();
        this.loadFinancialSummary();
      },
      error: () => {
        this.isLoading = false;
        this.toaster.error('::CannotLoadForecast');
        this.cdr.markForCheck();
      },
    });
  }

  loadPlan(): void {
    this.planService.getByForecastId(this.forecastId).subscribe({
      next: pl => {
        this.ingredientPlan = pl;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadFinancialSummary(): void {
    this.forecastService.getFinancialSummary(this.forecastId).subscribe({
      next: sum => {
        this.financialSummary = sum;
        this.cdr.markForCheck();
      },
    });
  }

  switchTab(tab: 'dishes' | 'ingredients'): void {
    this.activeTab = tab;
  }

  approvePlan(): void {
    if (!this.ingredientPlan?.id) return;

    this.confirmation
      .warn('::ConfirmApprovePlan', '::ApprovePlan')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.isApproving = true;
          this.planService
            .updateStatus(this.ingredientPlan!.id!, { status: PlanStatus.Confirmed })
            .subscribe({
              next: updated => {
                this.isApproving = false;
                this.ingredientPlan = updated;
                if (this.forecast) {
                  this.forecast.ingredientPlanStatus = PlanStatus.Confirmed;
                }
                this.toaster.success('::ApprovePlanSuccess');
                this.cdr.markForCheck();
              },
              error: err => {
                this.isApproving = false;
                this.toaster.error(err?.error?.message || '::CannotApprovePlan');
                this.cdr.markForCheck();
              },
            });
        }
      });
  }

  exportExcel(): void {
    if (!this.ingredientPlan || !this.ingredientPlan.items || this.ingredientPlan.items.length === 0) {
      this.toaster.warn('::NoIngredientDataToExport');
      return;
    }

    const startStr = this.forecast?.startDate ? new Date(this.forecast.startDate).toISOString().slice(0, 10).replace(/-/g, '') : 'START';
    const endStr = this.forecast?.endDate ? new Date(this.forecast.endDate).toISOString().slice(0, 10).replace(/-/g, '') : 'END';
    const filename = `KeHoachMuaHang_${startStr}_${endStr}.csv`;

    const headers = [
      'STT',
      'Mã nguyên liệu',
      'Tên nguyên liệu',
      'Đơn vị cơ sở',
      'Nhu cầu chế biến',
      'Tồn kho khả dụng',
      'Cần mua thêm',
      'Đơn giá ước tính (đ)',
      'Thành tiền dự toán (đ)',
    ];

    const rows: string[][] = [];
    let totalBudget = 0;

    this.ingredientPlan.items.forEach((it, idx) => {
      totalBudget += it.estimatedCost || 0;
      rows.push([
        (idx + 1).toString(),
        `"${it.ingredientId}"`,
        `"${it.ingredientName || ''}"`,
        `"${it.baseUnit || ''}"`,
        it.requiredQuantity?.toFixed(4) || '0',
        it.currentStock?.toFixed(4) || '0',
        it.suggestedPurchaseQuantity?.toFixed(4) || '0',
        Math.round(it.estimatedPrice || 0).toString(),
        Math.round(it.estimatedCost || 0).toString(),
      ]);
    });

    // Dòng tổng cộng
    rows.push([
      'TỔNG CỘNG',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      Math.round(totalBudget).toString(),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toaster.success('Đã tải xuống bảng kê mua hàng thành công!');
  }

  printA4(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/forecasts']);
  }
}
