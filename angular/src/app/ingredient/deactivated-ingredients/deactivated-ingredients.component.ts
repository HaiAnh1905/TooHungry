import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CoreModule } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { IngredientDto } from '../../proxy/ingredients/models';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-deactivated-ingredients',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    FormsModule,
    RouterModule,
    CustomSelectComponent,
  ],
  templateUrl: './deactivated-ingredients.component.html',
  styleUrls: ['./deactivated-ingredients.component.scss'],
})
export class DeactivatedIngredientsComponent implements OnInit {
  private readonly ingredientService = inject(IngredientService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly cdr = inject(ChangeDetectorRef);

  ingredients: IngredientDto[] = [];
  totalCount = 0;
  loading = false;
  searchTerm = '';

  page = 1;
  pageSize = 10;
  pageSizeOptions: CustomSelectOption[] = [
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
  ];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get fromRecord(): number {
    if (this.totalCount === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.ingredientService
      .getList({
        isActive: false,
        filter: this.searchTerm.trim() || undefined,
        skipCount: (this.page - 1) * this.pageSize,
        maxResultCount: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.ingredients = res.items || [];
          this.totalCount = res.totalCount || 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra khi tải dữ liệu');
          this.cdr.detectChanges();
        },
      });
  }

  onSearchChange(): void {
    this.page = 1;
    this.loadData();
  }

  changePageSize(size: number): void {
    this.pageSize = Number(size);
    this.page = 1;
    this.loadData();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.loadData();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadData();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadData();
    }
  }

  reactivate(item: IngredientDto): void {
    this.confirmation
      .warn('::ReactivateIngredientConfirmMessage', '::ReactivateIngredientTitle', {
        messageLocalizationParams: [item.name],
      })
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.ingredientService.reactivate(item.id).subscribe({
            next: () => {
              this.toaster.success('::ReactivateIngredientSuccess');
              this.loadData();
            },
            error: (err) => {
              this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra');
            },
          });
        }
      });
  }
}
