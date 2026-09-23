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
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { IngredientDto, IngredientCategoryDto, UnitDto } from '../proxy/ingredients/models';
import { IngredientCategoryService } from '../proxy/ingredients/ingredient-category.service';
import { UnitService } from '../proxy/ingredients/unit.service';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-ingredient',
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
  templateUrl: './ingredient.component.html',
  styleUrl: './ingredient.component.scss',
  providers: [ListService],
})
export class IngredientComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly ingredientService = inject(IngredientService);
  private readonly categoryService = inject(IngredientCategoryService);
  private readonly unitService = inject(UnitService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  allIngredients: IngredientDto[] = [];
  filteredIngredients: IngredientDto[] = [];
  pagedIngredients: IngredientDto[] = [];

  categories: IngredientCategoryDto[] = [];
  units: UnitDto[] = [];

  searchTerm = '';
  selectedCategoryId = '';
  sortBy = 'name asc';
  page = 0;
  pageSize = 10;

  categoryFilterOptions: CustomSelectOption[] = [];
  modalCategoryOptions: CustomSelectOption[] = [];
  modalUnitOptions: CustomSelectOption[] = [];

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
  selectedItem = {} as IngredientDto;

  private resizeObserver?: ResizeObserver;

  get currentPage(): number {
    return this.page + 1;
  }

  get totalCount(): number {
    return this.filteredIngredients.length;
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
    // Load categories
    this.categoryService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.categories = res.items || [];
      this.categoryFilterOptions = [
        { value: '', label: '::AllCategories', icon: 'fa-tags' },
        ...this.categories.map(c => ({
          value: c.id,
          label: c.name || '',
          icon: 'fa-tag',
        })),
      ];
      this.modalCategoryOptions = this.categories.map(c => ({
        value: c.id,
        label: c.name || '',
        icon: 'fa-tag',
      }));
      this.cdr.markForCheck();
    });

    // Load units
    this.unitService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.units = res.items || [];
      this.modalUnitOptions = this.units.map(u => ({
        value: u.id,
        label: `${u.name}${u.abbreviation ? ' (' + u.abbreviation + ')' : ''}`,
        icon: 'fa-scale-balanced',
      }));
      this.cdr.markForCheck();
    });

    // Load all ingredients
    this.loadData();
  }

  loadData() {
    this.ingredientService.getList({ maxResultCount: 1000, skipCount: 0, sorting: this.sortBy }).subscribe(res => {
      this.allIngredients = res.items || [];
      this.applyFilterAndPagination();
      this.cdr.markForCheck();
      this.recalculateTable();
    });
  }

  applyFilterAndPagination() {
    let result = [...this.allIngredients];

    // Lọc theo Danh mục
    if (this.selectedCategoryId) {
      result = result.filter(x => x.ingredientCategoryId === this.selectedCategoryId);
    }

    // Lọc theo từ khóa tìm kiếm
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(
        item =>
          item.name?.toLowerCase().includes(term) ||
          item.ingredientCategoryName?.toLowerCase().includes(term) ||
          item.unitName?.toLowerCase().includes(term)
      );
    }

    // Sắp xếp
    if (this.sortBy === 'name asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (this.sortBy === 'name desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    this.filteredIngredients = result;

    // Đảm bảo trang hiện tại hợp lệ
    const maxPage = Math.max(0, Math.ceil(this.filteredIngredients.length / this.pageSize) - 1);
    if (this.page > maxPage) {
      this.page = 0;
    }

    // Phân trang
    const start = this.page * this.pageSize;
    this.pagedIngredients = this.filteredIngredients.slice(start, start + this.pageSize);
  }

  getUnitDisplay(row: IngredientDto): string {
    const unit = this.units.find(u => u.id === row.unitId);
    if (!unit) return row.unitName || '-';
    if (unit.abbreviation && unit.name && unit.abbreviation.toLowerCase() !== unit.name.toLowerCase()) {
      return `${unit.name} (${unit.abbreviation})`;
    }
    return unit.name || row.unitName || '-';
  }

  getUnitTooltip(row: IngredientDto): string {
    const unit = this.units.find(u => u.id === row.unitId);
    return unit ? `${unit.name} (${unit.abbreviation || ''})` : (row.unitName || '');
  }

  onSearchChange() {
    this.page = 0;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  onCategoryFilterChange(categoryId: string) {
    this.selectedCategoryId = categoryId;
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

  createIngredient() {
    this.selectedItem = {} as IngredientDto;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editIngredient(id: string) {
    this.ingredientService.get(id).subscribe(item => {
      this.selectedItem = item;
      this.buildForm();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  // Chú ý: Tuyệt đối KHÔNG có trường description cho Ingredient
  buildForm() {
    this.form = this.fb.group({
      name: [this.selectedItem.name || '', [Validators.required, Validators.maxLength(128)]],
      ingredientCategoryId: [this.selectedItem.ingredientCategoryId || '', Validators.required],
      unitId: [this.selectedItem.unitId || '', Validators.required],
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const request = this.selectedItem.id
      ? this.ingredientService.update(this.selectedItem.id, this.form.value)
      : this.ingredientService.create(this.form.value);

    request.subscribe(() => {
      this.isModalOpen = false;
      this.form.reset();
      this.loadData();
      this.cdr.markForCheck();
    });
  }

  delete(id: string) {
    this.confirmation
      .warn('::DeleteIngredientConfirm', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.ingredientService.delete(id).subscribe(() => {
            this.loadData();
            this.cdr.markForCheck();
          });
        }
      });
  }
}
