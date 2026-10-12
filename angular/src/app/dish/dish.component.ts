import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CoreModule,
  ListService,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
  PermissionService,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Observable, Subscription, map, shareReplay, of } from 'rxjs';
import { DishService } from '../proxy/controllers/dish.service';
import { DishCategoryService } from '../proxy/dishes/dish-category.service';
import { DishDto, DishCategoryDto } from '../proxy/dishes/models';
import { MediaService } from '../proxy/controllers/media.service';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';
import { ImgFallbackDirective } from '../shared/directives/img-fallback.directive';
import { RecipeModalComponent } from '../recipe/recipe-modal/recipe-modal.component';

@Component({
  selector: 'app-dish',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    NgxDatatableModule,
    ReactiveFormsModule,
    FormsModule,
    CustomSelectComponent,
    ImgFallbackDirective,
    RecipeModalComponent,
  ],
  templateUrl: './dish.component.html',
  styleUrl: './dish.component.scss',
  providers: [ListService],
})
export class DishComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly dishService = inject(DishService);
  private readonly dishCategoryService = inject(DishCategoryService);
  private readonly permissionService = inject(PermissionService);
  private readonly mediaService = inject(MediaService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  // Selection & Bulk Actions
  selectedDishIds = new Set<string>();
  isBulkOperating = false;

  // Tab Filtering & Badge Counts
  activeTab: 'all' | 'active' | 'inactive' = 'all';
  allCount = 0;
  activeCount = 0;
  inactiveCount = 0;

  // Image Upload & Preview states
  imagePreviewUrl: string | null = null;
  isUploadingImage = false;
  uploadError: string | null = null;
  isDirectUrlMode = false;

  dish: PagedResultDto<DishDto> = { items: [], totalCount: 0 };
  categories$!: Observable<DishCategoryDto[]>;
  categoriesList: DishCategoryDto[] = [];
  private categoriesSubscription?: Subscription;

  // Filter & Search states
  searchTerm = '';
  selectedCategoryId = '';
  sortBy = 'name asc';

  // Recipe Modal
  isRecipeModalOpen = false;
  selectedDishForRecipe?: DishDto;

  openRecipeModal(dish: DishDto): void {
    this.selectedDishForRecipe = dish;
    this.isRecipeModalOpen = true;
  }

  onRecipeSaved(): void {
    this.list.get();
  }

  get categoryOptions(): CustomSelectOption[] {
    const defaultOpt: CustomSelectOption = {
      value: '',
      label: '::AllCategories',
      icon: 'fa-layer-group',
    };
    const catOpts: CustomSelectOption[] = this.categoriesList.map(c => ({
      value: c.id || '',
      label: c.name || '',
      icon: 'fa-tag',
    }));
    return [defaultOpt, ...catOpts];
  }

  get modalCategoryOptions(): CustomSelectOption[] {
    const unassignedOpt: CustomSelectOption = {
      value: null,
      label: '::UnassignedCategory',
      icon: 'fa-times-circle',
    };
    const catOpts: CustomSelectOption[] = this.categoriesList.map(c => ({
      value: c.id,
      label: c.name || '',
      icon: 'fa-tag',
    }));
    return [unassignedOpt, ...catOpts];
  }

  readonly sortOptions: CustomSelectOption[] = [
    { value: 'name asc', label: '::SortNameAsc', icon: 'fa-sort-alpha-down' },
    { value: 'name desc', label: '::SortNameDesc', icon: 'fa-sort-alpha-down-alt' },
    { value: 'price asc', label: '::SortPriceAsc', icon: 'fa-sort-numeric-down' },
    { value: 'price desc', label: '::SortPriceDesc', icon: 'fa-sort-numeric-down-alt' },
  ];

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 5, label: '5 ::RowsPerPage' },
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
  ];

  isModalOpen = false;
  isCategoryDropdownOpen = false;
  selectedCategoryName: string | null = null;
  form!: FormGroup;
  selectedDish = {} as DishDto;

  // Delete Dialog With Reason (Kiểm toán)
  isDeleteModalOpen = false;
  deletingDish: DishDto | null = null;
  deletionReason = '';
  isDeletingDish = false;

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;

  get currentPage(): number {
    return this.list.page + 1;
  }

  get totalPages(): number {
    const total = this.dish?.totalCount || 0;
    return Math.ceil(total / (this.list.maxResultCount || 10)) || 1;
  }

  get fromRecord(): number {
    const total = this.dish?.totalCount || 0;
    if (total === 0) return 0;
    return this.list.page * this.list.maxResultCount + 1;
  }

  get toRecord(): number {
    const total = this.dish?.totalCount || 0;
    return Math.min((this.list.page + 1) * this.list.maxResultCount, total);
  }

  ngOnInit() {
    this.list.maxResultCount = 10;

    const dishStreamCreator = (query: PagedAndSortedResultRequestDto) =>
      this.dishService.getList({
        ...query,
        sorting: this.sortBy,
        filter: this.searchTerm ? this.searchTerm.trim() : undefined,
        dishCategoryId: this.selectedCategoryId ? this.selectedCategoryId : undefined,
        isActive: this.activeTab === 'all' ? undefined : (this.activeTab === 'active' ? true : false),
      });

    this.listSubscription = this.list.hookToQuery(dishStreamCreator).subscribe(res => {
      this.dish = res;
      this.cdr.markForCheck();
      this.recalculateTable();
    });

    this.loadCategories();
    this.loadCounts();
  }

  loadCounts() {
    this.dishService.getList({ maxResultCount: 1, skipCount: 0 }).subscribe(res => {
      this.allCount = res.totalCount ?? 0;
      this.cdr.markForCheck();
    });
    this.dishService.getList({ maxResultCount: 1, skipCount: 0, isActive: true }).subscribe(res => {
      this.activeCount = res.totalCount ?? 0;
      this.cdr.markForCheck();
    });
    this.dishService.getList({ maxResultCount: 1, skipCount: 0, isActive: false }).subscribe(res => {
      this.inactiveCount = res.totalCount ?? 0;
      this.cdr.markForCheck();
    });
  }

  setTab(tab: 'all' | 'active' | 'inactive') {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.clearSelection();
    this.list.page = 0;
    this.list.get();
  }

  // Selection & Bulk Action helpers
  isSelected(id?: string): boolean {
    return !!id && this.selectedDishIds.has(id);
  }

  toggleSelect(id?: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!id) return;
    if (this.selectedDishIds.has(id)) {
      this.selectedDishIds.delete(id);
    } else {
      this.selectedDishIds.add(id);
    }
    this.cdr.markForCheck();
  }

  isAllSelected(): boolean {
    const items = this.dish?.items || [];
    if (items.length === 0) return false;
    return items.every(item => item.id && this.selectedDishIds.has(item.id));
  }

  toggleSelectAll(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const items = this.dish?.items || [];
    if (this.isAllSelected()) {
      items.forEach(item => {
        if (item.id) this.selectedDishIds.delete(item.id);
      });
    } else {
      items.forEach(item => {
        if (item.id) this.selectedDishIds.add(item.id);
      });
    }
    this.cdr.markForCheck();
  }

  clearSelection(): void {
    this.selectedDishIds.clear();
    this.cdr.markForCheck();
  }

  bulkToggleActive(isActive: boolean): void {
    const ids = Array.from(this.selectedDishIds);
    if (ids.length === 0) return;

    this.isBulkOperating = true;
    this.dishService.bulkToggleActive({ dishIds: ids, isActive }).subscribe({
      next: res => {
        this.isBulkOperating = false;
        this.toaster.success(res.message || 'Cập nhật trạng thái thành công!');
        this.clearSelection();
        this.list.get();
        this.loadCounts();
        this.cdr.markForCheck();
      },
      error: () => {
        this.isBulkOperating = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadCategories() {
    const hasCategoryPermission = this.permissionService.getGrantedPolicy('TooHungry.DishCategories');
    if (!hasCategoryPermission) {
      this.categoriesList = [];
      this.categories$ = of([]);
      return;
    }

    this.categories$ = this.dishCategoryService
      .getList({ maxResultCount: 100, skipCount: 0 })
      .pipe(
        map(res => {
          this.categoriesList = res.items || [];
          this.updateSelectedCategoryName();
          this.cdr.markForCheck();
          return this.categoriesList;
        }),
        shareReplay(1)
      );

    this.categoriesSubscription?.unsubscribe();
    this.categoriesSubscription = this.categories$.subscribe();
  }

  onSearchChange() {
    this.clearSelection();
    this.list.page = 0;
    this.list.get();
  }

  onCategoryFilterChange(categoryId: string) {
    this.selectedCategoryId = categoryId;
    this.clearSelection();
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
    this.categoriesSubscription?.unsubscribe();
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
      window.dispatchEvent(new Event('resize'));
      this.cdr.markForCheck();
    }, 200);
  }

  // Toggle IsActive
  toggleActive(dish: DishDto, event: Event) {
    event.stopPropagation();
    const previous = dish.isActive;
    this.dishService.toggleActive(dish.id!).subscribe({
      next: (updated) => {
        dish.isActive = updated.isActive;
        this.loadCounts();
        this.cdr.markForCheck();
      },
      error: () => {
        dish.isActive = previous;
        this.cdr.markForCheck();
      },
    });
  }

  createDish() {
    this.selectedDish = {} as DishDto;
    this.selectedCategoryName = null;
    this.isCategoryDropdownOpen = false;
    this.imagePreviewUrl = null;
    this.isUploadingImage = false;
    this.uploadError = null;
    this.isDirectUrlMode = false;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editDish(id: string) {
    this.isCategoryDropdownOpen = false;
    this.isUploadingImage = false;
    this.uploadError = null;
    this.isDirectUrlMode = false;
    this.dishService.get(id).subscribe(dish => {
      this.selectedDish = dish;
      this.imagePreviewUrl = dish.imageUrl || null;
      this.buildForm();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    this.form = this.fb.group({
      name: [this.selectedDish.name || '', Validators.required],
      price: [this.selectedDish.price || null, [Validators.required, Validators.min(0)]],
      dishCategoryId: [this.selectedDish.dishCategoryId || null],
      imageUrl: [this.selectedDish.imageUrl || ''],
      description: [this.selectedDish.description || ''],
      isActive: [this.selectedDish.isActive ?? true],
    });
    this.updateSelectedCategoryName();
  }

  triggerFileInput() {
    this.fileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];

    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validExtensions.includes(file.type)) {
      this.uploadError = 'Chỉ chấp nhận file ảnh JPG, PNG, WEBP hoặc GIF!';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = 'Dung lượng ảnh vượt quá 5MB!';
      this.cdr.markForCheck();
      return;
    }

    this.uploadError = null;
    this.isUploadingImage = true;

    const reader = new FileReader();
    reader.onload = e => {
      this.imagePreviewUrl = e.target?.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    this.mediaService.uploadDishImage(formData).subscribe({
      next: res => {
        this.isUploadingImage = false;
        this.form.get('imageUrl')?.setValue((res as any).url);
        this.imagePreviewUrl = (res as any).url;
        this.cdr.markForCheck();
      },
      error: err => {
        this.isUploadingImage = false;
        this.uploadError = err?.error?.error?.message || err?.message || 'Tải ảnh lên Cloudinary thất bại!';
        this.cdr.markForCheck();
      },
    });
  }

  removeImage() {
    this.form.get('imageUrl')?.setValue('');
    this.imagePreviewUrl = null;
    this.uploadError = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.cdr.markForCheck();
  }

  onImageUrlChange(url: string) {
    const trimmed = url?.trim() || '';
    this.form.get('imageUrl')?.setValue(trimmed);
    this.imagePreviewUrl = trimmed || null;
    this.uploadError = null;
    this.cdr.markForCheck();
  }

  toggleDirectUrlMode() {
    this.isDirectUrlMode = !this.isDirectUrlMode;
    this.cdr.markForCheck();
  }

  onImgError(event: Event) {
    const img = event.target as HTMLElement;
    img.style.display = 'none';
  }

  updateSelectedCategoryName() {
    const categoryId = this.form?.get('dishCategoryId')?.value || this.selectedDish?.dishCategoryId;
    if (categoryId && this.categoriesList.length > 0) {
      const found = this.categoriesList.find(c => c.id === categoryId);
      this.selectedCategoryName = found ? (found.name ?? null) : null;
    } else {
      this.selectedCategoryName = null;
    }
    this.cdr.markForCheck();
  }

  selectCategory(id?: string | null, name?: string | null) {
    this.form.get('dishCategoryId')?.setValue(id ?? null);
    this.selectedCategoryName = name ?? null;
    this.isCategoryDropdownOpen = false;
    this.cdr.markForCheck();
  }

  toggleCategoryDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-container')) {
      if (this.isCategoryDropdownOpen) {
        this.isCategoryDropdownOpen = false;
        this.cdr.markForCheck();
      }
    }
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const request = this.selectedDish.id
      ? this.dishService.update(this.selectedDish.id, this.form.value)
      : this.dishService.create(this.form.value);

    request.subscribe(() => {
      this.isModalOpen = false;
      this.form.reset();
      this.list.get();
      this.loadCounts();
      this.cdr.markForCheck();
    });
  }

  // Delete With Reason (Kiểm toán)
  openDeleteModal(dish: DishDto) {
    this.deletingDish = dish;
    this.deletionReason = '';
    this.isDeleteModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.deletingDish = null;
    this.deletionReason = '';
    this.cdr.markForCheck();
  }

  confirmDeleteWithReason() {
    if (!this.deletingDish || !this.deletionReason.trim()) return;
    this.isDeletingDish = true;
    this.dishService.deleteWithReason(this.deletingDish.id!, { deletionReason: this.deletionReason.trim() }).subscribe({
      next: () => {
        this.isDeletingDish = false;
        this.isDeleteModalOpen = false;
        this.deletingDish = null;
        this.deletionReason = '';
        this.list.get();
        this.loadCounts();
        this.cdr.markForCheck();
      },
      error: () => {
        this.isDeletingDish = false;
        this.cdr.markForCheck();
      }
    });
  }
}
