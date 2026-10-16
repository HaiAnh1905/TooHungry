import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DemandForecastService } from '../proxy/forecasts/demand-forecast.service';
import { DemandForecastDto, DemandForecastFilterDto } from '../proxy/forecasts/models';
import { PlanStatus } from '../proxy/forecasts/plan-status.enum';
import { ForecastCreateComponent } from './forecast-create/forecast-create.component';

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, FormsModule, ForecastCreateComponent],
  templateUrl: './forecast.component.html',
  styleUrl: './forecast.component.scss',
})
export class ForecastComponent implements OnInit {
  private readonly forecastService = inject(DemandForecastService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly cdr = inject(ChangeDetectorRef);

  forecasts: DemandForecastDto[] = [];
  totalCount = 0;
  isLoading = false;

  pageIndex = 1;
  pageSize = 10;
  startDate = '';
  endDate = '';
  searchTerm = '';

  isCreateModalVisible = false;
  PlanStatus = PlanStatus;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    const input: DemandForecastFilterDto = {
      skipCount: (this.pageIndex - 1) * this.pageSize,
      maxResultCount: this.pageSize,
      sorting: 'forecastDate desc',
      startDate: this.startDate ? new Date(this.startDate).toISOString() : undefined,
      endDate: this.endDate ? new Date(this.endDate).toISOString() : undefined,
      filter: this.searchTerm ? this.searchTerm.trim() : undefined,
    };

    this.forecastService.getList(input).subscribe({
      next: res => {
        this.forecasts = res.items || [];
        this.totalCount = res.totalCount || 0;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toaster.error('::CannotLoadForecastList');
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  clearFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.searchTerm = '';
    this.pageIndex = 1;
    this.loadData();
  }

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  onForecastSaved(created: DemandForecastDto): void {
    this.loadData();
    this.router.navigate(['/forecasts/detail', created.id]);
  }

  viewDetail(item: DemandForecastDto): void {
    if (!item.id) return;
    this.router.navigate(['/forecasts/detail', item.id]);
  }

  deleteForecast(item: DemandForecastDto): void {
    if (!item.id) return;
    this.confirmation
      .warn('::AreYouSureToDelete', '::DeleteForecast')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.forecastService.delete(item.id!).subscribe({
            next: () => {
              this.toaster.success('::DeleteForecastSuccess');
              this.loadData();
            },
            error: () => {
              this.toaster.error('::CannotDeleteForecast');
            },
          });
        }
      });
  }

  onPageChange(page: number): void {
    this.pageIndex = page;
    this.loadData();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }
}
