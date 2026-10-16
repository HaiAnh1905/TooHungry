import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DemandForecastService } from '../../proxy/forecasts/demand-forecast.service';
import {
  CreateUpdateDemandForecastDto,
  DemandForecastDto,
  DemandForecastItemDto,
  ForecastFinancialSummaryDto,
} from '../../proxy/forecasts/models';
import { DishService } from '../../proxy/controllers/dish.service';
import { RecipeService } from '../../proxy/recipes/recipe.service';

@Component({
  selector: 'app-forecast-create',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, FormsModule],
  templateUrl: './forecast-create.component.html',
  styleUrl: './forecast-create.component.scss',
})
export class ForecastCreateComponent implements OnInit {
  private readonly forecastService = inject(DemandForecastService);
  private readonly dishService = inject(DishService);
  private readonly recipeService = inject(RecipeService);
  private readonly toaster = inject(ToasterService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() isVisible = false;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<DemandForecastDto>();

  startDate = '';
  endDate = '';
  historyDays = 7;
  note = '';

  items: DemandForecastItemDto[] = [];
  financialSummary: ForecastFinancialSummaryDto = {
    projectedRevenue: 0,
    projectedIngredientCost: 0,
    foodCostPercentage: 0,
    projectedPurchaseBudget: 0,
  };

  isGenerating = false;
  isSaving = false;
  isLoadingDishes = false;

  historyOptions = [
    { value: 7, label: '::History7Days' },
    { value: 14, label: '::History14Days' },
    { value: 30, label: '::History30Days' },
  ];

  ngOnInit(): void {
    this.initDates();
    this.loadDishes();
  }

  initDates(): void {
    const today = new Date();
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);
    const endDay = new Date(nextDay);
    endDay.setDate(nextDay.getDate() + 6);

    this.startDate = this.formatDate(nextDay);
    this.endDate = this.formatDate(endDay);
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  loadDishes(): void {
    this.isLoadingDishes = true;
    this.dishService.getList({ skipCount: 0, maxResultCount: 200 }).subscribe({
      next: res => {
        this.items = (res.items || [])
          .filter(d => d.isActive)
          .map(d => ({
            id: '',
            demandForecastId: '',
            dishId: d.id || '',
            dishName: d.name || '',
            dishImageUrl: d.imageUrl,
            dishPrice: d.price || 0,
            forecastQuantity: 0,
            totalAmount: 0,
            hasRecipe: false,
            note: '',
          }));
        this.isLoadingDishes = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingDishes = false;
        this.cdr.markForCheck();
      },
    });
  }

  generateSMA(): void {
    if (!this.startDate || !this.endDate) {
      this.toaster.warn('::PleaseSelectDates');
      return;
    }
    if (this.startDate > this.endDate) {
      this.toaster.warn('::StartDateMustBeBeforeEndDate');
      return;
    }

    this.isGenerating = true;
    this.forecastService
      .generateForecast({
        startDate: this.startDate,
        endDate: this.endDate,
        historyDays: Number(this.historyDays),
      })
      .subscribe({
        next: res => {
          this.isGenerating = false;
          this.items = res.suggestedItems || [];
          this.financialSummary = res.financialSummary;
          this.recalculateSummary();
          this.toaster.success('::AutoGenerateSuccess');
          this.cdr.markForCheck();
        },
        error: err => {
          this.isGenerating = false;
          this.toaster.error(err?.error?.message || '::AutoGenerateFailed');
          this.cdr.markForCheck();
        },
      });
  }

  onQuantityChange(item: DemandForecastItemDto, value: number): void {
    item.forecastQuantity = Math.max(0, Number(value) || 0);
    item.totalAmount = item.forecastQuantity * item.dishPrice;
    this.recalculateSummary();
  }

  recalculateSummary(): void {
    let rev = 0;
    for (const it of this.items) {
      rev += it.forecastQuantity * it.dishPrice;
    }
    this.financialSummary.projectedRevenue = rev;
    if (this.financialSummary.projectedRevenue > 0 && this.financialSummary.projectedIngredientCost > 0) {
      this.financialSummary.foodCostPercentage = Math.round(
        (this.financialSummary.projectedIngredientCost / this.financialSummary.projectedRevenue) * 100
      );
    }
  }

  get totalPortions(): number {
    return this.items.reduce((sum, x) => sum + (x.forecastQuantity || 0), 0);
  }

  get activeDishesCount(): number {
    return this.items.filter(x => (x.forecastQuantity || 0) > 0).length;
  }

  save(): void {
    if (!this.startDate || !this.endDate) {
      this.toaster.warn('::PleaseSelectDates');
      return;
    }
    if (this.startDate > this.endDate) {
      this.toaster.warn('::StartDateMustBeBeforeEndDate');
      return;
    }

    const payload: CreateUpdateDemandForecastDto = {
      forecastDate: new Date().toISOString(),
      startDate: new Date(this.startDate).toISOString(),
      endDate: new Date(this.endDate).toISOString(),
      note: this.note,
      items: this.items.map(it => ({
        dishId: it.dishId,
        forecastQuantity: it.forecastQuantity || 0,
        note: it.note,
      })),
    };

    this.isSaving = true;
    this.forecastService.create(payload).subscribe({
      next: res => {
        this.isSaving = false;
        this.toaster.success('::CreateForecastSuccess');
        this.saved.emit(res);
        this.close();
      },
      error: err => {
        this.isSaving = false;
        this.toaster.error(err?.error?.message || '::CreateForecastFailed');
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.isVisible = false;
    this.isVisibleChange.emit(false);
  }
}
