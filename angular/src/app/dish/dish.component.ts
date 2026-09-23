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
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CoreModule,
  ListService,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, NGX_DATATABLE_MESSAGES } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Observable, Subscription, map, shareReplay } from 'rxjs';
import { DishService } from '../proxy/dishes/dish.service';
import { DishCategoryService } from '../proxy/dishes/dish-category.service';
import { DishDto, DishCategoryDto } from '../proxy/dishes/models';
import { MediaService } from '../proxy/media/media.service';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-dish',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, NgxDatatableModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './dish.component.html',
  styleUrl: './dish.component.scss',
  providers: [ListService],
})
export class DishComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly dishService = inject(DishService);
  private readonly dishCategoryService = inject(DishCategoryService);
  private readonly mediaService = inject(MediaService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

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

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;

  // Pagination getters
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
      });
    this.listSubscription = this.list.hookToQuery(dishStreamCreator).subscribe(res => {
      this.dish = res;
      this.cdr.markForCheck();
      this.recalculateTable();
    });

    this.loadCategories();
  }

  loadCategories() {
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
    this.list.page = 0;
    this.list.get();
  }

  onCategoryFilterChange(categoryId: string) {
    this.selectedCategoryId = categoryId;
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
      this.cdr.markForCheck();
    }, 200);
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

    // Xem trước ảnh tạm thời ngay lập tức
    const reader = new FileReader();
    reader.onload = e => {
      this.imagePreviewUrl = e.target?.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);

    // Tải ảnh lên Cloudinary qua Backend API
    this.mediaService.uploadDishImage(file).subscribe({
      next: res => {
        this.isUploadingImage = false;
        this.form.get('imageUrl')?.setValue(res.url);
        this.imagePreviewUrl = res.url;
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
      this.list.get(); // Refresh lại danh sách datatable
      this.cdr.markForCheck();
    });
  }

  delete(id: string) {
    this.confirmation
      .warn('::AreYouSureToDelete', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.dishService.delete(id).subscribe(() => {
            this.list.get();
            this.cdr.markForCheck();
          });
        }
      });
  }
}
