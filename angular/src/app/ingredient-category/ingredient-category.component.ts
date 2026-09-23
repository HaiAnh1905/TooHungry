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
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IngredientCategoryService } from '../proxy/ingredients/ingredient-category.service';
import { IngredientCategoryDto } from '../proxy/ingredients/models';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-ingredient-category',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    NgxDatatableModule,
    ReactiveFormsModule,
    FormsModule,
    CustomSelectComponent,
    RouterLink,
  ],
  templateUrl: './ingredient-category.component.html',
  styleUrl: './ingredient-category.component.scss',
  providers: [ListService],
})
export class IngredientCategoryComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly categoryService = inject(IngredientCategoryService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  allCategories: IngredientCategoryDto[] = [];
  filteredCategories: IngredientCategoryDto[] = [];
  pagedCategories: IngredientCategoryDto[] = [];

  searchTerm = '';
  sortBy = 'name asc';
  page = 0;
  pageSize = 10;

  readonly sortOptions: CustomSelectOption[] = [
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
  selectedItem = {} as IngredientCategoryDto;

  private resizeObserver?: ResizeObserver;

  get currentPage(): number {
    return this.page + 1;
  }

  get totalCount(): number {
    return this.filteredCategories.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  get fromRecord(): number {
    if (this.totalCount === 0) return 0;
    return this.page * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min((this.page + 1) * this.pageSize, this.totalCount);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.categoryService.getList({ maxResultCount: 200, skipCount: 0, sorting: this.sortBy }).subscribe(res => {
      this.allCategories = res.items || [];
      this.applyFilterAndPagination();
      this.cdr.markForCheck();
      this.recalculateTable();
    });
  }

  applyFilterAndPagination() {
    let result = [...this.allCategories];

    // Lọc theo từ khóa tìm kiếm
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(
        item =>
          item.name?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    // Sắp xếp
    if (this.sortBy === 'name asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (this.sortBy === 'name desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    this.filteredCategories = result;

    // Đảm bảo trang hợp lệ
    const maxPage = Math.max(0, Math.ceil(this.filteredCategories.length / this.pageSize) - 1);
    if (this.page > maxPage) {
      this.page = 0;
    }

    // Phân trang
    const start = this.page * this.pageSize;
    this.pagedCategories = this.filteredCategories.slice(start, start + this.pageSize);
  }

  onSearchChange() {
    this.page = 0;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  onSortChange(sortBy: string) {
    this.sortBy = sortBy;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  changePageSize(newSize: number) {
    this.pageSize = Number(newSize) || 10;
    this.page = 0;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  firstPage() {
    if (this.page !== 0) {
      this.page = 0;
      this.applyFilterAndPagination();
      this.cdr.markForCheck();
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.applyFilterAndPagination();
      this.cdr.markForCheck();
    }
  }

  nextPage() {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.applyFilterAndPagination();
      this.cdr.markForCheck();
    }
  }

  lastPage() {
    if (this.page !== this.totalPages - 1) {
      this.page = this.totalPages - 1;
      this.applyFilterAndPagination();
      this.cdr.markForCheck();
    }
  }

  navigateTo(url: string) {
    this.router.navigateByUrl(url);
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
  }

  createCategory() {
    this.selectedItem = {} as IngredientCategoryDto;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editCategory(id: string) {
    this.categoryService.get(id).subscribe(cat => {
      this.selectedItem = cat;
      this.buildForm();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    this.form = this.fb.group({
      name: [this.selectedItem.name || '', [Validators.required, Validators.maxLength(128)]],
      description: [this.selectedItem.description || '', [Validators.maxLength(512)]],
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const request = this.selectedItem.id
      ? this.categoryService.update(this.selectedItem.id, this.form.value)
      : this.categoryService.create(this.form.value);

    request.subscribe(() => {
      this.isModalOpen = false;
      this.form.reset();
      this.loadData();
      this.cdr.markForCheck();
    });
  }

  delete(id: string) {
    this.confirmation
      .warn('::DeleteIngredientCategoryConfirm', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.categoryService.delete(id).subscribe(() => {
            this.loadData();
            this.cdr.markForCheck();
          });
        }
      });
  }
}
