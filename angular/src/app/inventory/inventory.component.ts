import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CoreModule,
  ListService,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Subscription } from 'rxjs';
import { InventoryService } from '../proxy/inventories/inventory.service';
import { InventoryDto } from '../proxy/inventories/models';
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { IngredientDto } from '../proxy/ingredients/models';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, NgxDatatableModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
  providers: [ListService],
})
export class InventoryComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly inventoryService = inject(InventoryService);
  private readonly ingredientService = inject(IngredientService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  data: PagedResultDto<InventoryDto> = { items: [], totalCount: 0 };
  ingredients: IngredientDto[] = [];
  ingredientOptions: CustomSelectOption[] = [];

  searchTerm = '';
  selectedStatusFilter = ''; // '', 'safe', 'low', 'out'
  sortBy = 'currentStock asc';

  readonly statusFilterOptions: CustomSelectOption[] = [
    { value: '', label: '::AllStockStatuses', icon: 'fa-boxes' },
    { value: 'safe', label: '::StockStatusSafe', icon: 'fa-check-circle' },
    { value: 'low', label: '::StockStatusLow', icon: 'fa-exclamation-triangle' },
    { value: 'out', label: '::StockStatusOut', icon: 'fa-times-circle' },
  ];

  readonly sortOptions: CustomSelectOption[] = [
    { value: 'currentStock asc', label: '::SortStockAsc', icon: 'fa-sort-numeric-down' },
    { value: 'currentStock desc', label: '::SortStockDesc', icon: 'fa-sort-numeric-down-alt' },
    { value: 'minimumStock asc', label: '::SortMinStockAsc', icon: 'fa-sort-amount-down' },
    { value: 'minimumStock desc', label: '::SortMinStockDesc', icon: 'fa-sort-amount-down-alt' },
  ];

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 5, label: '5 ::RowsPerPage' },
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
  ];

  isModalOpen = false;
  form!: FormGroup;
  selectedItem = {} as InventoryDto;

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;

  get currentPage(): number {
    return this.list.page + 1;
  }

  get totalPages(): number {
    const total = this.data?.totalCount || 0;
    return Math.ceil(total / (this.list.maxResultCount || 10)) || 1;
  }

  get fromRecord(): number {
    const total = this.data?.totalCount || 0;
    if (total === 0) return 0;
    return this.list.page * this.list.maxResultCount + 1;
  }

  get toRecord(): number {
    const total = this.data?.totalCount || 0;
    return Math.min((this.list.page + 1) * this.list.maxResultCount, total);
  }

  ngOnInit() {
    this.list.maxResultCount = 10;

    this.ingredientService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.ingredients = res.items || [];
      this.ingredientOptions = this.ingredients.map(ing => ({
        value: ing.id,
        label: `${ing.name}${ing.unitName ? ' (' + ing.unitName + ')' : ''}`,
        icon: 'fa-seedling',
        desc: ing.ingredientCategoryName || undefined,
      }));
      this.cdr.markForCheck();
    });

    const streamCreator = (query: PagedAndSortedResultRequestDto) =>
      this.inventoryService.getList({
        ...query,
        sorting: this.sortBy,
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      let items = res.items || [];

      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const term = this.searchTerm.trim().toLowerCase();
        items = items.filter(
          item => item.ingredientName?.toLowerCase().includes(term)
        );
      }

      if (this.selectedStatusFilter) {
        items = items.filter(item => {
          const current = item.currentStock ?? 0;
          const min = item.minimumStock ?? 0;
          if (this.selectedStatusFilter === 'out') return current <= 0;
          if (this.selectedStatusFilter === 'low') return current > 0 && current <= min;
          if (this.selectedStatusFilter === 'safe') return current > min;
          return true;
        });
      }

      this.data = { items, totalCount: items.length };
      this.cdr.markForCheck();
      this.recalculateTable();
    });
  }

  onSearchChange() {
    this.list.page = 0;
    this.list.get();
  }

  onStatusFilterChange(filter: string) {
    this.selectedStatusFilter = filter;
    this.list.page = 0;
    this.list.get();
  }

  onSortChange(sortBy: string) {
    this.sortBy = sortBy;
    this.list.page = 0;
    this.list.get();
  }

  changePageSize(newSize: number) {
    this.list.page = 0;
    this.list.maxResultCount = Number(newSize);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.list.page = page - 1;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.list.page = this.list.page - 1;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.list.page = this.list.page + 1;
    }
  }

  firstPage() {
    if (this.currentPage !== 1) {
      this.list.page = 0;
    }
  }

  lastPage() {
    if (this.currentPage !== this.totalPages) {
      this.list.page = this.totalPages - 1;
    }
  }

  ngAfterViewInit() {
    if (typeof ResizeObserver !== 'undefined' && this.tableWrapper?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.table?.recalculate();
        this.cdr.markForCheck();
      });
      this.resizeObserver.observe(this.tableWrapper.nativeElement);
    }
    this.recalculateTable();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.listSubscription?.unsubscribe();
  }

  private recalculateTable() {
    requestAnimationFrame(() => {
      this.table?.recalculate();
      window.dispatchEvent(new Event('resize'));
      this.cdr.markForCheck();
    });
    setTimeout(() => {
      this.table?.recalculate();
      window.dispatchEvent(new Event('resize'));
      this.cdr.markForCheck();
    }, 50);
    setTimeout(() => {
      this.table?.recalculate();
      this.cdr.markForCheck();
    }, 200);
  }

  createInventory() {
    this.selectedItem = {} as InventoryDto;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editInventory(id: string) {
    this.inventoryService.get(id).subscribe(inv => {
      this.selectedItem = inv;
      this.buildForm();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    this.form = this.fb.group({
      ingredientId: [this.selectedItem.ingredientId || '', Validators.required],
      currentStock: [this.selectedItem.currentStock ?? 0, [Validators.required, Validators.min(0)]],
      minimumStock: [this.selectedItem.minimumStock ?? 0, [Validators.required, Validators.min(0)]],
    });
  }

  getStockStatusClass(row: InventoryDto): string {
    const current = row.currentStock ?? 0;
    const min = row.minimumStock ?? 0;
    if (current <= 0) return 'status-out';
    if (current <= min) return 'status-low';
    return 'status-safe';
  }

  getStockStatusLabel(row: InventoryDto): string {
    const current = row.currentStock ?? 0;
    const min = row.minimumStock ?? 0;
    if (current <= 0) return '::StockStatusOut';
    if (current <= min) return '::StockStatusLow';
    return '::StockStatusSafe';
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const request = this.selectedItem.id
      ? this.inventoryService.update(this.selectedItem.id, this.form.value)
      : this.inventoryService.create(this.form.value);

    request.subscribe(() => {
      this.isModalOpen = false;
      this.form.reset();
      this.list.get();
      this.cdr.markForCheck();
    });
  }

  delete(id: string) {
    this.confirmation
      .warn('::AreYouSureToDelete', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.inventoryService.delete(id).subscribe(() => {
            this.list.get();
            this.cdr.markForCheck();
          });
        }
      });
  }
}
