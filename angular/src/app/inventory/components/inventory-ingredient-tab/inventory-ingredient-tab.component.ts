import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { IngredientDto } from '../../../proxy/ingredients/models';
import { StorageType } from '../../../proxy/inventories/models';
import { StorageFilterType } from '../../models/inventory-dashboard.models';
import { CustomSelectComponent, CustomSelectOption } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-inventory-ingredient-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, CustomSelectComponent],
  templateUrl: './inventory-ingredient-tab.component.html',
  styleUrls: ['./inventory-ingredient-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryIngredientTabComponent implements OnChanges {
  private readonly localizationService = inject(LocalizationService);

  @Input({ required: true }) ingredients: IngredientDto[] = [];
  @Input() searchQuery: string = '';
  @Input() storageFilter: StorageFilterType = StorageFilterType.All;
  @Input() stockFilter: 'ALL' | 'SAFE' | 'LOW' = 'ALL';
  @Input() statusFilter: 'all' | 'active' | 'deactivated' = 'all';
  @Input() isLoading: boolean = false;
  @Input() highlightedIngredientId: string | null = null;

  @Output() readonly openCreate = new EventEmitter<void>();
  @Output() readonly openEdit = new EventEmitter<IngredientDto>();
  @Output() readonly viewBatches = new EventEmitter<IngredientDto>();
  @Output() readonly quickInbound = new EventEmitter<IngredientDto>();
  @Output() readonly openAdjustment = new EventEmitter<IngredientDto>();
  @Output() readonly deactivateIngredient = new EventEmitter<IngredientDto>();
  @Output() readonly reactivateIngredient = new EventEmitter<IngredientDto>();
  @Output() readonly searchChange = new EventEmitter<string>();
  @Output() readonly storageFilterChange = new EventEmitter<StorageFilterType>();
  @Output() readonly stockFilterChange = new EventEmitter<'ALL' | 'SAFE' | 'LOW'>();
  @Output() readonly statusFilterChange = new EventEmitter<'all' | 'active' | 'deactivated'>();

  readonly StorageTypeEnum = StorageType;
  readonly StorageFilterTypeEnum = StorageFilterType;
  protected readonly Math = Math;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  filteredIngredients: IngredientDto[] = [];

  get pageSizeOptions(): CustomSelectOption[] {
    const unit = this.localizationService.instant('::RowsPerPage');
    return [
      { value: 5, label: `5 ${unit}` },
      { value: 10, label: `10 ${unit}` },
      { value: 20, label: `20 ${unit}` },
      { value: 50, label: `50 ${unit}` },
    ];
  }

  readonly storageFilterOptions: CustomSelectOption[] = [
    { value: StorageFilterType.All, label: '::AllStorage', icon: 'fa-layer-group' },
    { value: StorageFilterType.Chilled, label: '::StorageType_SHORT_TERM', icon: 'fa-snowflake' },
    { value: StorageFilterType.Frozen, label: '::StorageType_LONG_TERM', icon: 'fa-box-archive' },
    { value: StorageFilterType.Dry, label: '::StorageType_FRESH', icon: 'fa-leaf' },
  ];

  readonly stockFilterOptions: CustomSelectOption[] = [
    { value: 'ALL', label: '::AllStockLevels', icon: 'fa-layer-group' },
    { value: 'SAFE', label: '::StockStatusSafe', icon: 'fa-shield-halved' },
    { value: 'LOW', label: '::StockStatusLow', icon: 'fa-triangle-exclamation' },
  ];

  readonly statusFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllStatuses', icon: 'fa-layer-group' },
    { value: 'active', label: '::ActiveOnly', icon: 'fa-circle-check' },
    { value: 'deactivated', label: '::DeactivatedOnly', icon: 'fa-pause-circle' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['ingredients'] ||
      changes['searchQuery'] ||
      changes['storageFilter'] ||
      changes['stockFilter'] ||
      changes['statusFilter']
    ) {
      this.applyFilter();
    }
  }

  applyFilter(): void {
    let list = [...this.ingredients];

    // 1. Search Query
    if (this.searchQuery && this.searchQuery.trim()) {
      const term = this.searchQuery.trim().toLowerCase();
      list = list.filter(
        i =>
          (i.name && i.name.toLowerCase().includes(term)) ||
          (i.code && i.code.toLowerCase().includes(term))
      );
    }

    // 2. Storage Filter
    if (this.storageFilter !== StorageFilterType.All) {
      list = list.filter(i => {
        if (this.storageFilter === StorageFilterType.Dry) {
          return i.storageType === StorageType.FRESH;
        } else if (this.storageFilter === StorageFilterType.Chilled) {
          return i.storageType === StorageType.SHORT_TERM;
        } else if (this.storageFilter === StorageFilterType.Frozen) {
          return i.storageType === StorageType.LONG_TERM;
        }
        return true;
      });
    }

    // 3. Stock Level Filter
    if (this.stockFilter === 'SAFE') {
      list = list.filter(i => (i.currentStock || 0) >= (i.minStock || 0));
    } else if (this.stockFilter === 'LOW') {
      list = list.filter(i => (i.currentStock || 0) < (i.minStock || 0));
    }

    // 4. Status Filter (RM-013)
    if (this.statusFilter === 'active') {
      list = list.filter(i => i.isActive !== false);
    } else if (this.statusFilter === 'deactivated') {
      list = list.filter(i => i.isActive === false);
    }

    this.filteredIngredients = list;

    // Reset pagination if current page exceeds
    const totalPages = this.totalPages;
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages || 1;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredIngredients.length / this.pageSize) || 1;
  }

  get pagedIngredients(): IngredientDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredIngredients.slice(start, start + this.pageSize);
  }

  get fromRecord(): number {
    if (this.filteredIngredients.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredIngredients.length);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  getStockPercentage(item: IngredientDto): number {
    const current = item.currentStock || 0;
    const min = item.minStock || 0;
    if (min <= 0) return current > 0 ? 100 : 0;
    return Math.min(200, Math.round((current / min) * 100));
  }

  getStockProgressColor(item: IngredientDto): string {
    const pct = this.getStockPercentage(item);
    if (pct >= 100) return '#10b981'; // Xanh lá
    if (pct >= 50) return '#f59e0b';  // Vàng cam
    return '#ef4444';                 // Đỏ
  }

  getStockProgressClass(item: IngredientDto): string {
    const pct = this.getStockPercentage(item);
    if (pct >= 100) return 'progress-safe';
    if (pct >= 50) return 'progress-low';
    return 'progress-critical';
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchChange.emit(value);
    this.applyFilter();
  }

  onStorageChange(value: any): void {
    this.storageFilter = value;
    this.storageFilterChange.emit(value);
    this.applyFilter();
  }

  onStockLevelChange(value: any): void {
    this.stockFilter = value;
    this.stockFilterChange.emit(value);
    this.applyFilter();
  }

  onStatusChange(value: any): void {
    this.statusFilter = value;
    this.statusFilterChange.emit(value);
    this.applyFilter();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.storageFilter = StorageFilterType.All;
    this.stockFilter = 'ALL';
    this.statusFilter = 'all';
    this.searchChange.emit('');
    this.storageFilterChange.emit(StorageFilterType.All);
    this.stockFilterChange.emit('ALL');
    this.statusFilterChange.emit('all');
    this.applyFilter();
  }

  get hasActiveFilters(): boolean {
    return (
      !!this.searchQuery.trim() ||
      this.storageFilter !== StorageFilterType.All ||
      this.stockFilter !== 'ALL' ||
      this.statusFilter !== 'all'
    );
  }
}
