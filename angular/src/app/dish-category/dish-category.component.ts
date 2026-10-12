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
import { DishCategoryService } from '../proxy/dishes/dish-category.service';
import { DishCategoryDto } from '../proxy/dishes/models';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-dish-category',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, NgxDatatableModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './dish-category.component.html',
  styleUrl: './dish-category.component.scss',
  providers: [ListService],
})
export class DishCategoryComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly dishCategoryService = inject(DishCategoryService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  data: PagedResultDto<DishCategoryDto> = { items: [], totalCount: 0 };

  // Filter & Search states
  searchTerm = '';
  sortBy = 'displayOrder asc, name asc';

  readonly sortOptions: CustomSelectOption[] = [
    { value: 'displayOrder asc, name asc', label: '::SortDisplayOrderAsc', icon: 'fa-sort-numeric-down' },
    { value: 'displayOrder desc', label: '::SortDisplayOrderDesc', icon: 'fa-sort-numeric-down-alt' },
    { value: 'name asc', label: '::SortNameAsc', icon: 'fa-sort-alpha-down' },
    { value: 'name desc', label: '::SortNameDesc', icon: 'fa-sort-alpha-down-alt' },
  ];

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 5, label: '5 ::RowsPerPage' },
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
  ];

  isModalOpen = false;
  form!: FormGroup;
  selectedItem = {} as DishCategoryDto;

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;

  // Pagination getters
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

    const streamCreator = (query: PagedAndSortedResultRequestDto) =>
      this.dishCategoryService.getList({
        ...query,
        sorting: this.sortBy,
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      // If frontend search term is entered, filter in-memory if backend doesn't take filter parameter
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const term = this.searchTerm.trim().toLowerCase();
        const filtered = (res.items || []).filter(
          item =>
            item.name?.toLowerCase().includes(term) ||
            item.description?.toLowerCase().includes(term)
        );
        this.data = { items: filtered, totalCount: filtered.length };
      } else {
        this.data = res;
      }
      this.cdr.markForCheck();
      this.recalculateTable();
    });
  }

  onSearchChange() {
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

  createCategory() {
    this.selectedItem = {} as DishCategoryDto;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editCategory(id: string) {
    this.dishCategoryService.get(id).subscribe(category => {
      this.selectedItem = category;
      this.buildForm();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    this.form = this.fb.group({
      name: [this.selectedItem.name || '', Validators.required],
      description: [this.selectedItem.description || ''],
      displayOrder: [this.selectedItem.displayOrder ?? 0, [Validators.min(0)]],
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const request = this.selectedItem.id
      ? this.dishCategoryService.update(this.selectedItem.id, this.form.value)
      : this.dishCategoryService.create(this.form.value);

    request.subscribe({
      next: () => {
        this.isModalOpen = false;
        this.form.reset();
        this.list.get();
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  delete(id: string) {
    this.confirmation
      .warn('::AreYouSureToDelete', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.dishCategoryService.delete(id).subscribe({
            next: () => {
              this.list.get();
              this.cdr.markForCheck();
            },
            error: () => {
              this.cdr.markForCheck();
            },
          });
        }
      });
  }
}
