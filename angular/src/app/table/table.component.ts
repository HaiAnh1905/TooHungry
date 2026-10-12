import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  ElementRef,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  CoreModule,
  ListService,
  LocalizationService,
  PagedResultDto,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Subscription, interval, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TableService } from '../proxy/tables/table.service';
import { TableDto, GetTablesInput } from '../proxy/tables/models';
import { TableStatus } from '../proxy/tables/table-status.enum';
import { DiningAreaService } from '../proxy/dining-areas/dining-area.service';
import { DiningAreaDto } from '../proxy/dining-areas/models';
import { DishService } from '../proxy/controllers/dish.service';
import { DishDto } from '../proxy/dishes/models';
import { RecipeService } from '../proxy/recipes/recipe.service';
import { RecipeDto } from '../proxy/recipes/models';
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { IngredientDto } from '../proxy/ingredients/models';
import { OrderService } from '../proxy/orders/order.service';
import { OrderStatus } from '../proxy/orders/order-status.enum';
import { OrderDto } from '../proxy/orders/models';

import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';
import { TableSignalrService } from '../shared/services/table-signalr.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, NgxDatatableModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  providers: [ListService],
})
export class TableComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly tableService = inject(TableService);
  private readonly recipeService = inject(RecipeService);
  private readonly ingredientService = inject(IngredientService);
  private readonly diningAreaService = inject(DiningAreaService);
  private readonly dishService = inject(DishService);
  private readonly orderService = inject(OrderService);
  private readonly toaster = inject(ToasterService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly localizationService = inject(LocalizationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly tableSignalrService = inject(TableSignalrService);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  data: PagedResultDto<TableDto> = { items: [], totalCount: 0 };

  // Signals quản lý dữ liệu thời gian thực (Real-time Reactive State)
  readonly allTables = signal<TableDto[]>([]);
  readonly diningAreas = signal<DiningAreaDto[]>([]);

  tableStatuses = [
    { value: TableStatus.Available, key: '::TableStatusAvailable' },
    { value: TableStatus.Occupied, key: '::TableStatusOccupied' },
    { value: TableStatus.Reserved, key: '::TableStatusReserved' },
    { value: TableStatus.Cleaning, key: '::TableStatusCleaning' },
    { value: TableStatus.Disabled, key: '::TableStatusDisabled' },
  ];
  TableStatus = TableStatus;

  // Modal Gọi món cho bàn (Order Modal)
  isOrderModalOpen = false;
  activeOrderId: string | null = null;
  selectedTableForOrder?: TableDto;
  orderForm!: FormGroup;
  dishes: DishDto[] = [];

  // Chế độ xem: 'grid' (Sơ đồ mặt bằng bàn ăn - Mặc định) hoặc 'table' (Bảng danh sách)
  readonly viewMode = signal<'grid' | 'table'>('grid');

  // Filter & Search signals
  searchTerm = '';
  readonly searchTermSignal = signal<string>('');
  readonly selectedStatus = signal<number | null>(null);
  readonly selectedAreaId = signal<string | null>(null);
  readonly currentTime = signal<number>(Date.now());
  sortBy = 'name asc';

  readonly gridPageSizeOptions: CustomSelectOption[] = [
    { value: 8, label: '8 ::TablesPerPage' },
    { value: 12, label: '12 ::TablesPerPage' },
    { value: 16, label: '16 ::TablesPerPage' },
    { value: 24, label: '24 ::TablesPerPage' },
    { value: 32, label: '32 ::TablesPerPage' },
  ];

  readonly listPageSizeOptions: CustomSelectOption[] = [
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
    { value: 50, label: '50 ::RowsPerPage' },
  ];

  isModalOpen = false;
  form!: FormGroup;
  selectedItem = {} as TableDto;

  // Modal tạo nhanh khu vực mới
  isAreaModalOpen = false;
  areaForm!: FormGroup;

  // Modal Đặt bàn (Reservation)
  isReserveModalOpen = false;
  reserveForm!: FormGroup;
  reservingTable?: TableDto;

  // Modal Chi tiết Đặt bàn (Reservation Details)
  isReservationDetailModalOpen = false;
  selectedReservedTable?: TableDto;

  // Modal Cảnh báo chuyển bàn khi Disable bàn có lịch đặt trước
  isDisableConfirmModalOpen = false;
  pendingDisableTable?: TableDto;

  // Modal Cảnh báo khi Khóa cả khu vực có bàn đặt trước
  isDisableAreaConfirmModalOpen = false;
  pendingDisableAreaTables: TableDto[] = [];
  pendingDisableAreaName = '';
  pendingDisableAreaId = '';

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;
  private timerSubscription?: Subscription;
  private signalrSubscription?: Subscription;

  // Helper so khớp bàn với khu vực (ưu tiên diningAreaId chuẩn, chỉ fallback location khi bàn chưa có diningAreaId)
  isTableInArea(t: TableDto, areaId: string | null): boolean {
    if (!areaId) return true;
    if (t.diningAreaId) {
      return t.diningAreaId.toLowerCase() === areaId.toLowerCase();
    }
    const targetArea = this.diningAreas().find(a => !!a.id && a.id.toLowerCase() === areaId.toLowerCase());
    if (targetArea && targetArea.name) {
      const areaNameLower = targetArea.name.trim().toLowerCase();
      if (t.diningAreaName && t.diningAreaName.trim().toLowerCase() === areaNameLower) {
        return true;
      }
      if (t.location && t.location.trim().toLowerCase() === areaNameLower) {
        return true;
      }
    }
    return false;
  }

  // Computed Signal: Toàn bộ danh sách bàn sau khi lọc theo area / status / search trên client
  readonly filteredTableList = computed<TableDto[]>(() => {
    let list = this.allTables() || [];
    const areaId = this.selectedAreaId();
    const status = this.selectedStatus();
    const search = this.searchTermSignal();

    if (areaId) {
      list = list.filter(t => this.isTableInArea(t, areaId));
    }

    if (status !== null) {
      list = list.filter(t => t.status === status);
    }

    if (search && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      list = list.filter(t =>
        t.name?.toLowerCase().includes(term) ||
        (t.diningAreaName && t.diningAreaName.toLowerCase().includes(term)) ||
        (t.location && t.location.toLowerCase().includes(term)) ||
        (t.reservedCustomerName && t.reservedCustomerName.toLowerCase().includes(term)) ||
        (t.reservedCustomerPhone && t.reservedCustomerPhone.includes(term))
      );
    }

    return list;
  });

  // Pagination signals cho Sơ đồ mặt bằng bàn ăn (Floor Plan / Grid view)
  readonly gridPage = signal<number>(1);
  readonly gridPageSize = signal<number>(8);

  readonly gridTotalPages = computed(() => {
    const total = this.filteredTableList().length;
    return Math.ceil(total / this.gridPageSize()) || 1;
  });

  readonly gridFromRecord = computed(() => {
    const total = this.filteredTableList().length;
    if (total === 0) return 0;
    return (this.gridPage() - 1) * this.gridPageSize() + 1;
  });

  readonly gridToRecord = computed(() => {
    const total = this.filteredTableList().length;
    return Math.min(this.gridPage() * this.gridPageSize(), total);
  });

  // Chế độ Grid View: Hiển thị danh sách bàn đã lọc và phân trang
  readonly filteredGridTables = computed<TableDto[]>(() => {
    const list = this.filteredTableList();
    const page = this.gridPage();
    const size = this.gridPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // Chế độ Table View: Hiển thị danh sách bàn sau khi phân trang client
  readonly pagedTableRows = computed<TableDto[]>(() => {
    const list = this.filteredTableList();
    const page = this.list.page || 0;
    const pageSize = this.list.maxResultCount || 10;
    const start = page * pageSize;
    return list.slice(start, start + pageSize);
  });

  // Computed Signals: Thống kê số lượng cập nhật thời gian thực
  readonly totalCount = computed(() => this.allTables().length);
  readonly availableCount = computed(() => this.allTables().filter(t => t.status === TableStatus.Available).length);
  readonly occupiedCount = computed(() => this.allTables().filter(t => t.status === TableStatus.Occupied).length);
  readonly reservedCount = computed(() => this.allTables().filter(t => t.status === TableStatus.Reserved).length);
  readonly cleaningCount = computed(() => this.allTables().filter(t => t.status === TableStatus.Cleaning).length);
  readonly disabledCount = computed(() => this.allTables().filter(t => t.status === TableStatus.Disabled).length);

  readonly isRestaurantOpen = computed(() => {
    const now = new Date(this.currentTime());
    const hours = now.getHours();
    return hours >= 9 && hours < 23;
  });

  // Helper computed cho khu vực đang chọn
  readonly currentAreaTables = computed(() => {
    const areaId = this.selectedAreaId();
    if (!areaId) return [];
    return this.allTables().filter(t => this.isTableInArea(t, areaId));
  });

  readonly isCurrentAreaAllDisabled = computed(() => {
    const tables = this.currentAreaTables();
    return tables.length > 0 && tables.every(t => t.status === TableStatus.Disabled);
  });

  readonly currentAreaName = computed(() => {
    const areaId = this.selectedAreaId();
    if (!areaId) return '';
    const a = this.diningAreas().find(x => x.id === areaId);
    return a?.name || '';
  });

  // Pagination getters cho Table view
  get currentPage(): number {
    return this.list.page + 1;
  }

  get totalPages(): number {
    const total = this.filteredTableList().length;
    return Math.ceil(total / (this.list.maxResultCount || 10)) || 1;
  }

  get fromRecord(): number {
    const total = this.filteredTableList().length;
    if (total === 0) return 0;
    return this.list.page * this.list.maxResultCount + 1;
  }

  get toRecord(): number {
    const total = this.filteredTableList().length;
    return Math.min((this.list.page + 1) * this.list.maxResultCount, total);
  }

  ngOnInit() {
    this.list.maxResultCount = 50; // Cho phép tải nhiều bàn hiển thị trên sơ đồ

    const initialAreaId = this.route.snapshot.queryParamMap.get('areaId');
    if (initialAreaId) {
      this.selectedAreaId.set(initialAreaId);
    }

    this.loadDiningAreas();

    const streamCreator = (query: GetTablesInput) =>
      this.tableService.getList({
        ...query,
        sorting: this.sortBy,
        maxResultCount: 200, // Tải đầy đủ mặt bằng để Single Source of Truth cho toàn bộ tín hiệu Reactive Signals
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      this.data = res;
      this.allTables.set(res.items || []);
      this.cdr.markForCheck();
      this.recalculateTable();
    });

    // Tự động cập nhật đồng hồ đếm thời gian trôi qua mỗi 10 giây thời gian thực
    this.timerSubscription = interval(10000).subscribe(() => {
      this.currentTime.set(Date.now());
      this.cdr.markForCheck();
    });

    // Lắng nghe sự kiện cập nhật trạng thái bàn thời gian thực từ SignalR Hub
    this.signalrSubscription = this.tableSignalrService.tableStatusChanged$.subscribe(event => {
      this.allTables.update(tables =>
        tables.map(t => (t.id === event.tableId ? { ...t, status: event.status as TableStatus } : t))
      );
      if (this.data?.items) {
        this.data.items = this.data.items.map(t =>
          t.id === event.tableId ? { ...t, status: event.status as TableStatus } : t
        );
      }
      this.cdr.markForCheck();
    });
  }

  loadDiningAreas() {
    this.diningAreaService.getList({ maxResultCount: 100 }).subscribe(res => {
      this.diningAreas.set(res.items || []);
      this.cdr.markForCheck();
    });
  }

  setViewMode(mode: 'grid' | 'table') {
    this.viewMode.set(mode);
    this.cdr.markForCheck();
    if (mode === 'table') {
      this.recalculateTable();
    }
  }

  // Lọc theo Khu vực: Phản ứng tức thì (0ms) cho cả Grid và Table qua Signals
  selectArea(areaId?: string | null) {
    this.selectedAreaId.set(areaId || null);
    this.list.page = 0;
    this.gridPage.set(1);
    this.cdr.markForCheck();
    this.recalculateTable();
  }

  // Lọc theo Trạng thái bàn: Phản ứng tức thì (0ms)
  filterByStatus(status: number | null) {
    this.selectedStatus.set(status);
    this.list.page = 0;
    this.gridPage.set(1);
    this.cdr.markForCheck();
    this.recalculateTable();
  }

  // Tìm kiếm bàn ăn: Phản ứng tức thì (0ms)
  onSearchChange() {
    this.searchTermSignal.set(this.searchTerm);
    this.list.page = 0;
    this.gridPage.set(1);
    this.cdr.markForCheck();
    this.recalculateTable();
  }

  onTablePageChange(event: any) {
    this.list.page = event?.offset ?? 0;
    this.cdr.markForCheck();
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

  // Floor Plan / Grid pagination methods
  changeGridPageSize(newSize: number) {
    this.gridPageSize.set(Number(newSize));
    this.gridPage.set(1);
    this.cdr.markForCheck();
  }

  gridFirstPage() {
    this.gridPage.set(1);
    this.cdr.markForCheck();
  }

  gridPrevPage() {
    if (this.gridPage() > 1) {
      this.gridPage.update(p => p - 1);
      this.cdr.markForCheck();
    }
  }

  gridNextPage() {
    if (this.gridPage() < this.gridTotalPages()) {
      this.gridPage.update(p => p + 1);
      this.cdr.markForCheck();
    }
  }

  gridLastPage() {
    this.gridPage.set(this.gridTotalPages());
    this.cdr.markForCheck();
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
    this.timerSubscription?.unsubscribe();
    this.signalrSubscription?.unsubscribe();
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

  createTable() {
    this.selectedItem = {
      name: '',
      capacity: 4,
      status: TableStatus.Available,
      diningAreaId: this.selectedAreaId() || undefined,
      location: '',
    } as TableDto;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editTable(id?: string) {
    if (!id) return;

    // Guard: Không cho phép chỉnh sửa bàn đang có khách sử dụng
    const localTable = this.allTables().find(t => t.id === id);
    if (localTable && localTable.status === TableStatus.Occupied) {
      this.toaster.warn(
        this.localizationService.instant('::CannotEditOccupiedTableMessage'),
        this.localizationService.instant('::Warning')
      );
      return;
    }

    this.tableService.get(id).subscribe(table => {
      if (table.status === TableStatus.Occupied) {
        this.toaster.warn(
          this.localizationService.instant('::CannotEditOccupiedTableMessage'),
          this.localizationService.instant('::Warning')
        );
        return;
      }
      this.selectedItem = table;
      this.buildForm();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    this.isAreaDropdownOpen = false;
    this.isStatusDropdownOpen = false;
    this.areaDropdownSearch = '';
    this.form = this.fb.group({
      name: [this.selectedItem.name || '', Validators.required],
      capacity: [this.selectedItem.capacity || 4, [Validators.required, Validators.min(1), Validators.max(100)]],
      status: [this.selectedItem.status ?? TableStatus.Available, Validators.required],
      diningAreaId: [this.selectedItem.diningAreaId || null],
      location: [this.selectedItem.location || ''],
    });
  }

  openQuickAreaModal() {
    this.areaForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
    });
    this.isAreaModalOpen = true;
    this.cdr.markForCheck();
  }

  saveQuickArea() {
    if (this.areaForm.invalid) return;

    this.diningAreaService.create(this.areaForm.value).subscribe({
      next: (newArea) => {
        this.isAreaModalOpen = false;
        this.diningAreas.update(areas => [...areas, newArea].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        if (this.form) {
          this.form.patchValue({ diningAreaId: newArea.id });
        }
        this.isAreaDropdownOpen = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  // Custom Dining Area Dropdown state and handlers
  isAreaDropdownOpen = false;
  areaDropdownSearch = '';

  // Custom Table Status Dropdown state and handlers
  isStatusDropdownOpen = false;

  readonly statusOptionsList = [
    { value: TableStatus.Available, key: '::TableStatusAvailable', descKey: '::TableStatusAvailableDesc', icon: 'fa-check-circle' },
    { value: TableStatus.Occupied, key: '::TableStatusOccupied', descKey: '::TableStatusOccupiedDesc', icon: 'fa-utensils' },
    { value: TableStatus.Reserved, key: '::TableStatusReserved', descKey: '::TableStatusReservedDesc', icon: 'fa-calendar-check' },
    { value: TableStatus.Cleaning, key: '::TableStatusCleaning', descKey: '::TableStatusCleaningDesc', icon: 'fa-broom' },
    { value: TableStatus.Disabled, key: '::TableStatusDisabled', descKey: '::TableStatusDisabledDesc', icon: 'fa-ban' }
  ];

  toggleStatusDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    if (this.isStatusDropdownOpen) {
      this.isAreaDropdownOpen = false;
    }
    this.cdr.markForCheck();
  }

  selectTableStatus(val: TableStatus) {
    this.form?.patchValue({ status: val });
    this.isStatusDropdownOpen = false;
    this.cdr.markForCheck();
  }

  getSelectedStatusLabel(status: TableStatus | undefined | null): string {
    const found = this.statusOptionsList.find(s => s.value === status);
    return found ? this.localizationService.instant(found.key) : '';
  }

  getSelectedStatusIcon(status: TableStatus | undefined | null): string {
    const found = this.statusOptionsList.find(s => s.value === status);
    return found ? found.icon : 'fa-check-circle';
  }

  toggleAreaDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.isAreaDropdownOpen = !this.isAreaDropdownOpen;
    if (this.isAreaDropdownOpen) {
      this.isStatusDropdownOpen = false;
    }
    this.areaDropdownSearch = '';
    this.cdr.markForCheck();
  }

  selectDiningArea(areaId: string | null | undefined) {
    const found = areaId ? this.diningAreas().find(a => a.id === areaId) : null;
    this.form?.patchValue({
      diningAreaId: areaId || null,
      location: found?.name || ''
    });
    this.isAreaDropdownOpen = false;
    this.cdr.markForCheck();
  }

  clearSelectedArea(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.form?.patchValue({ diningAreaId: null, location: '' });
    this.cdr.markForCheck();
  }

  getSelectedAreaName(): string {
    const areaId = this.form?.get('diningAreaId')?.value;
    if (!areaId) return '';
    const found = this.diningAreas().find(a => a.id === areaId);
    return found?.name || '';
  }

  getFilteredDiningAreas(): DiningAreaDto[] {
    const list = this.diningAreas().filter(a => a.isActive !== false);
    if (!this.areaDropdownSearch) return list;
    const term = this.areaDropdownSearch.trim().toLowerCase();
    return list.filter(a => (a.name || '').toLowerCase().includes(term) || (a.description && a.description.toLowerCase().includes(term)));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isAreaDropdownOpen && !target.closest('.custom-area-dropdown-container')) {
      this.isAreaDropdownOpen = false;
      this.cdr.markForCheck();
    }
    if (this.isStatusDropdownOpen && !target.closest('.custom-status-dropdown-container')) {
      this.isStatusDropdownOpen = false;
      this.cdr.markForCheck();
    }
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    // Guard: Không cho phép lưu chỉnh sửa bàn đang có khách sử dụng
    if (this.selectedItem?.id && this.selectedItem?.status === TableStatus.Occupied) {
      this.toaster.warn(
        this.localizationService.instant('::CannotEditOccupiedTableMessage'),
        this.localizationService.instant('::Warning')
      );
      return;
    }

    const request = this.selectedItem.id
      ? this.tableService.update(this.selectedItem.id, this.form.value)
      : this.tableService.create(this.form.value);

    request.subscribe({
      next: () => {
        if (this.selectedItem.id && this.form.value.status === TableStatus.Available && this.selectedItem.status === TableStatus.Occupied) {
          this.orderService.completeActiveOrderByTableId(this.selectedItem.id).subscribe({
            error: () => {},
          });
        }
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

  delete(id?: string) {
    if (!id) return;

    // Guard: Không cho phép xóa bàn đang có khách sử dụng
    const localTable = this.allTables().find(t => t.id === id);
    if (localTable && localTable.status === TableStatus.Occupied) {
      this.toaster.warn(
        this.localizationService.instant('::CannotDeleteOccupiedTableMessage'),
        this.localizationService.instant('::Warning')
      );
      return;
    }

    this.confirmation
      .warn('::AreYouSureToDelete', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          // Cập nhật Signal xóa bàn ngay lập tức (0ms UI feedback)
          this.allTables.update(tables => tables.filter(t => t.id !== id));
          if (this.data?.items) {
            this.data.items = this.data.items.filter(t => t.id !== id);
          }
          this.cdr.markForCheck();

          this.tableService.delete(id).subscribe({
            next: () => {
              this.list.get();
            },
            error: () => {
              this.list.get();
            },
          });
        }
      });
  }

  // Getter lấy thời gian tối thiểu cho input datetime-local (thời điểm hiện tại hoặc giờ đặt cũ nếu đang sửa)
  get minReservationTime(): string {
    if (this.reservingTable?.status === TableStatus.Reserved && this.reservingTable?.reservedTime) {
      const existingDate = new Date(this.reservingTable.reservedTime);
      if (!isNaN(existingDate.getTime())) {
        return new Date(existingDate.getTime() - existingDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
    }
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  // Mở modal Đặt bàn / Chỉnh sửa đặt bàn
  openReserveModal(table: TableDto) {
    this.reservingTable = table;
    const now = new Date();
    const initialTime = new Date(now);
    initialTime.setHours(initialTime.getHours() + 1);
    initialTime.setMinutes(0);

    // Điều chỉnh giờ gợi ý ban đầu để luôn rơi vào khung giờ nhận đặt bàn 08:00 - 22:00
    const currentHour = initialTime.getHours();
    if (currentHour < 8) {
      initialTime.setHours(8, 30, 0, 0);
    } else if (currentHour >= 22) {
      initialTime.setDate(initialTime.getDate() + 1);
      initialTime.setHours(8, 30, 0, 0);
    }

    let localIso = new Date(initialTime.getTime() - initialTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    // Nếu bàn đã có lịch đặt trước (chế độ Chỉnh sửa - Edit), load lại toàn bộ dữ liệu có sẵn!
    if (table.reservedTime) {
      const existingDate = new Date(table.reservedTime);
      if (!isNaN(existingDate.getTime())) {
        localIso = new Date(existingDate.getTime() - existingDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
    }

    this.reserveForm = this.fb.group({
      customerName: [table.reservedCustomerName || '', Validators.required],
      customerPhone: [table.reservedCustomerPhone || '', [Validators.required, Validators.pattern(/^[0-9+ ]{8,15}$/)]],
      reservedTime: [localIso, [Validators.required, this.createReservationTimeValidator(table.reservedTime ? localIso : undefined)]],
      guestCount: [table.reservedGuestCount || table.capacity || 4, [Validators.required, Validators.min(1)]],
      note: [table.reservedNote || ''],
    });

    this.isReserveModalOpen = true;
    this.cdr.markForCheck();
  }

  // Mở modal Chi tiết Đặt bàn
  openReservationDetailModal(table: TableDto, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedReservedTable = table;
    this.isReservationDetailModalOpen = true;
    this.cdr.markForCheck();
  }

  // Sao chép số điện thoại khách hàng
  copyPhoneNumber(phone?: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => {
      this.toaster.success(this.localizationService.instant('::CopyPhoneSuccess'));
    });
  }

  // Validator: Không cho phép đặt giờ trong quá khứ và chỉ nhận đặt trong khung giờ 08:00 - 22:00 (đóng cửa 23:00)
  private createReservationTimeValidator(originalTimeIso?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      // Nếu người dùng giữ nguyên giờ đặt cũ khi sửa thông tin khác, không phạt lỗi quá khứ
      if (originalTimeIso && control.value === originalTimeIso) {
        return null;
      }

      const selectedDate = new Date(control.value);
      if (isNaN(selectedDate.getTime())) {
        return { invalidDate: true };
      }

      const now = new Date();
      // 1. Không cho phép đặt trong quá khứ (dung sai 60 giây)
      if (selectedDate.getTime() < now.getTime() - 60000) {
        return { pastTime: true };
      }

      // 2. Không cho phép đặt ngoài khung giờ nhận đặt bàn (08:00 - 22:00)
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      const openMinutes = 8 * 60;   // 08:00 AM
      const closeMinutes = 22 * 60; // 10:00 PM (22:00 - giới hạn nhận đặt bàn)

      if (totalMinutes < openMinutes || totalMinutes > closeMinutes) {
        return { outsideOperatingHours: true };
      }

      return null;
    };
  }

  // Kiểm tra số khách có vượt quá sức chứa của bàn không
  get isGuestCountExceeded(): boolean {
    if (!this.reservingTable || !this.reserveForm) return false;
    const count = this.reserveForm.get('guestCount')?.value;
    const cap = this.reservingTable.capacity;
    return !!(count && cap && Number(count) > Number(cap));
  }

  // Thông điệp cảnh báo số khách vượt quá sức chứa
  get capacityWarningMessage(): string {
    const count = this.reserveForm?.get('guestCount')?.value || 0;
    const cap = this.reservingTable?.capacity || 0;
    return this.localizationService.instant(
      '::GuestCountExceedsCapacityWarning',
      String(count),
      String(cap)
    );
  }

  // Lưu thông tin Đặt bàn
  saveReservation() {
    if (!this.reservingTable?.id || this.reserveForm.invalid) return;

    // Guard cảnh báo nếu số khách vượt quá sức chứa của bàn
    if (this.isGuestCountExceeded) {
      const guestCount = this.reserveForm.get('guestCount')?.value;
      const capacity = this.reservingTable.capacity;
      this.confirmation
        .warn(
          this.localizationService.instant(
            '::GuestCountExceedsCapacityConfirm',
            String(guestCount),
            String(capacity)
          ),
          '::Warning'
        )
        .subscribe((status: Confirmation.Status) => {
          if (status === Confirmation.Status.confirm) {
            this.executeSaveReservation();
          }
        });
      return;
    }

    this.executeSaveReservation();
  }

  private executeSaveReservation() {
    if (!this.reservingTable?.id || this.reserveForm.invalid) return;

    const val = this.reserveForm.value;
    const tableId = this.reservingTable.id;
    const tableRef = this.reservingTable;
    const nowIso = new Date().toISOString();

    // 1. Cập nhật Signal tức thì theo thời gian thực (0ms)
    this.allTables.update(tables =>
      tables.map(t =>
        t.id === tableId
          ? {
              ...t,
              status: TableStatus.Reserved,
              reservedCustomerName: val.customerName,
              reservedCustomerPhone: val.customerPhone,
              reservedTime: val.reservedTime,
              reservedGuestCount: val.guestCount,
              reservedNote: val.note,
              lastModificationTime: nowIso,
            }
          : t
      )
    );

    if (this.data?.items) {
      this.data.items = this.data.items.map(t =>
        t.id === tableId
          ? {
              ...t,
              status: TableStatus.Reserved,
              reservedCustomerName: val.customerName,
              reservedCustomerPhone: val.customerPhone,
              reservedTime: val.reservedTime,
              reservedGuestCount: val.guestCount,
              reservedNote: val.note,
              lastModificationTime: nowIso,
            }
          : t
      );
    }

    this.isReserveModalOpen = false;
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // 2. Gửi request lên server
    this.tableService
      .update(tableId, {
        name: tableRef.name,
        capacity: tableRef.capacity,
        status: TableStatus.Reserved,
        diningAreaId: tableRef.diningAreaId,
        location: tableRef.location,
        reservedCustomerName: val.customerName,
        reservedCustomerPhone: val.customerPhone,
        reservedTime: val.reservedTime,
        reservedGuestCount: val.guestCount,
        reservedNote: val.note,
      })
      .subscribe({
        next: (updated) => {
          if (updated) {
            this.allTables.update(tables =>
              tables.map(t => (t.id === tableId ? { ...t, ...updated, status: TableStatus.Reserved } : t))
            );
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.list.get();
        },
      });
  }

  // Hủy đặt bàn thời gian thực với Signal
  cancelReservation(table: TableDto) {
    const tableId = table.id;
    if (!tableId) return;

    this.confirmation
      .warn('::CancelReservationConfirm', '::CancelReservation')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.executeCancelReservation(tableId, table);
        }
      });
  }

  private executeCancelReservation(tableId: string, table: TableDto) {
    const nowIso = new Date().toISOString();

    // 1. Cập nhật Signal tức thì ngay khi ấn xác nhận hủy (0ms real-time feedback)
    this.allTables.update(tables =>
      tables.map(t =>
        t.id === tableId
          ? {
              ...t,
              status: TableStatus.Available,
              reservedCustomerName: undefined,
              reservedCustomerPhone: undefined,
              reservedTime: undefined,
              reservedGuestCount: undefined,
              reservedNote: undefined,
              lastModificationTime: nowIso,
            }
          : t
      )
    );

    if (this.data?.items) {
      this.data.items = this.data.items.map(t =>
        t.id === tableId
          ? {
              ...t,
              status: TableStatus.Available,
              reservedCustomerName: undefined,
              reservedCustomerPhone: undefined,
              reservedTime: undefined,
              reservedGuestCount: undefined,
              reservedNote: undefined,
              lastModificationTime: nowIso,
            }
          : t
      );
    }

    // Buộc Angular kích hoạt re-render ngay tức khắc
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // 2. Gửi request lên server
    this.tableService
      .update(tableId, {
        name: table.name,
        capacity: table.capacity,
        status: TableStatus.Available,
        diningAreaId: table.diningAreaId,
        location: table.location,
        reservedCustomerName: undefined,
        reservedCustomerPhone: undefined,
        reservedTime: undefined,
        reservedGuestCount: undefined,
        reservedNote: undefined,
      })
      .subscribe({
        next: (updatedTable) => {
          if (updatedTable) {
            this.allTables.update(tables =>
              tables.map(t => (t.id === tableId ? { ...t, ...updatedTable, status: TableStatus.Available } : t))
            );
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.list.get();
        },
      });
  }

  // Đổi trạng thái 1 chạm nhanh trên thẻ bàn với Signal thời gian thực
  quickUpdateStatus(table: TableDto, newStatus: TableStatus) {
    const tableId = table.id;
    if (!tableId) return;

    // 1. Cập nhật tức thì trên Signal (Optimistic UI Update 0ms)
    const originalTable = { ...table };
    const nowIso = new Date().toISOString();

    this.allTables.update(tables =>
      tables.map(t => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          status: newStatus,
          lastModificationTime: nowIso,
          ...(newStatus === TableStatus.Available
            ? {
                reservedCustomerName: undefined,
                reservedCustomerPhone: undefined,
                reservedTime: undefined,
                reservedGuestCount: undefined,
                reservedNote: undefined,
              }
            : {}),
        };
      })
    );

    if (this.data?.items) {
      this.data.items = this.data.items.map(t => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          status: newStatus,
          lastModificationTime: nowIso,
          ...(newStatus === TableStatus.Available
            ? {
                reservedCustomerName: undefined,
                reservedCustomerPhone: undefined,
                reservedTime: undefined,
                reservedGuestCount: undefined,
                reservedNote: undefined,
              }
            : {}),
        };
      });
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // 2. Gửi request cập nhật lên máy chủ qua endpoint chuyên biệt đổi trạng thái
    this.tableService
      .changeStatus(tableId, newStatus as any)
      .subscribe({
        next: (updatedTable) => {
          if (updatedTable) {
            this.allTables.update(tables =>
              tables.map(t => (t.id === tableId ? { ...t, ...updatedTable, status: newStatus } : t))
            );
          }
          if (newStatus === TableStatus.Available && originalTable?.status === TableStatus.Occupied) {
            this.orderService.completeActiveOrderByTableId(tableId).subscribe({
              error: () => {},
            });
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đổi trạng thái bàn!');
          // Khôi phục trạng thái cũ nếu lỗi
          this.allTables.update(tables => tables.map(t => (t.id === tableId ? originalTable : t)));
          this.list.get();
          this.cdr.markForCheck();
        },
      });
  }

  // Khóa / Mở lại một bàn đơn lẻ (bàn hỏng / bảo trì)
  toggleDisableTable(table: TableDto) {
    if (!table?.id) return;

    const isDisabled = table.status === TableStatus.Disabled;

    // Khi bàn đang có lịch đặt trước mà muốn disable -> Mở Modal Cảnh báo Highlight chuyên nghiệp
    if (!isDisabled && (table.status === TableStatus.Reserved || !!table.reservedCustomerName || !!table.reservedTime)) {
      this.pendingDisableTable = table;
      this.isDisableConfirmModalOpen = true;
      this.cdr.markForCheck();
      return;
    }

    const confirmKey = isDisabled ? '::EnableTableConfirm' : '::DisableTableConfirm';
    const titleKey = isDisabled ? '::EnableTable' : '::DisableTable';
    const targetStatus = isDisabled ? TableStatus.Available : TableStatus.Disabled;

    this.confirmation
      .warn(confirmKey, titleKey)
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.quickUpdateStatus(table, targetStatus);
        }
      });
  }

  // Xác nhận từ Modal cảnh báo chuyển bàn
  confirmDisableReservedTable() {
    if (!this.pendingDisableTable) return;
    const targetTable = this.pendingDisableTable;
    this.isDisableConfirmModalOpen = false;
    this.quickUpdateStatus(targetTable, TableStatus.Disabled);
  }

  // Kết thúc bữa ăn & Xác nhận chuyển sang trang thanh toán
  onEndMeal(table: TableDto) {
    if (!table?.id) return;

    this.orderService.getActiveOrderByTableId(table.id).subscribe({
      next: (activeOrder) => {
        if (activeOrder && activeOrder.id) {
          const message = this.localizationService.instant(
            '::ConfirmEndMealWithOrder',
            table.name || ''
          );
          const title = this.localizationService.instant('::ConfirmEndMealTitle');

          this.confirmation.info(message, title).subscribe((status: Confirmation.Status) => {
            if (status === Confirmation.Status.confirm) {
              this.router.navigate(['/payment', activeOrder.id]);
            }
          });
        } else {
          const message = this.localizationService.instant(
            '::ConfirmEndMealWithoutOrder',
            table.name || ''
          );
          const title = this.localizationService.instant('::ConfirmEndMealTitle');

          this.confirmation.info(message, title).subscribe((status: Confirmation.Status) => {
            if (status === Confirmation.Status.confirm) {
              this.quickUpdateStatus(table, TableStatus.Cleaning);
            }
          });
        }
      },
      error: () => {
        const message = this.localizationService.instant(
          '::ConfirmEndMealWithoutOrder',
          table.name || ''
        );
        const title = this.localizationService.instant('::ConfirmEndMealTitle');
        this.confirmation.info(message, title).subscribe((status: Confirmation.Status) => {
          if (status === Confirmation.Status.confirm) {
            this.quickUpdateStatus(table, TableStatus.Cleaning);
          }
        });
      },
    });
  }

  // Khóa / Mở lại toàn bộ bàn trong khu vực đang chọn
  toggleDisableCurrentArea() {
    const areaId = this.selectedAreaId();
    if (!areaId) return;

    const areaName = this.currentAreaName();
    const shouldEnable = this.isCurrentAreaAllDisabled();
    const targetStatus = shouldEnable ? TableStatus.Available : TableStatus.Disabled;

    // Nếu đang muốn Khóa khu vực, kiểm tra xem có bàn nào đang có lịch đặt trước không
    if (!shouldEnable) {
      const reservedTables = this.currentAreaTables().filter(
        t => t.status === TableStatus.Reserved || !!t.reservedCustomerName || !!t.reservedTime
      );

      if (reservedTables.length > 0) {
        this.pendingDisableAreaTables = reservedTables;
        this.pendingDisableAreaName = areaName;
        this.pendingDisableAreaId = areaId;
        this.isDisableAreaConfirmModalOpen = true;
        this.cdr.markForCheck();
        return;
      }
    }

    const confirmMsg = shouldEnable
      ? this.localizationService.instant('::EnableAreaTablesConfirm', areaName)
      : this.localizationService.instant('::DisableAreaTablesConfirm', areaName);
    const confirmTitle = shouldEnable
      ? this.localizationService.instant('::EnableAreaTables')
      : this.localizationService.instant('::DisableAreaTables');

    this.confirmation
      .warn(confirmMsg, confirmTitle)
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.executeToggleAreaStatus(areaId, targetStatus);
        }
      });
  }

  // Xác nhận từ Modal cảnh báo khóa khu vực có bàn đặt trước
  confirmDisableAreaWithReserved() {
    if (!this.pendingDisableAreaId) return;
    const areaId = this.pendingDisableAreaId;
    this.isDisableAreaConfirmModalOpen = false;
    this.executeToggleAreaStatus(areaId, TableStatus.Disabled);
  }

  private executeToggleAreaStatus(areaId: string, targetStatus: TableStatus) {
    const nowIso = new Date().toISOString();

    // 1. Cập nhật Signal tức thì trên giao diện (Optimistic 0ms)
    this.allTables.update(tables =>
      tables.map(t => {
        if (!this.isTableInArea(t, areaId)) return t;
        return {
          ...t,
          status: targetStatus,
          lastModificationTime: nowIso,
          ...(targetStatus === TableStatus.Disabled || targetStatus === TableStatus.Available
            ? {
                reservedCustomerName: undefined,
                reservedCustomerPhone: undefined,
                reservedTime: undefined,
                reservedGuestCount: undefined,
                reservedNote: undefined,
              }
            : {}),
        };
      })
    );

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // 2. Gửi request lên server
    this.tableService.setAreaTablesStatus(areaId, targetStatus).subscribe({
      next: () => {
        const areaName = this.currentAreaName();
        const msg = targetStatus === TableStatus.Disabled
          ? `Đã tạm ngưng phục vụ toàn bộ bàn khu vực "${areaName}" thành công!`
          : `Đã mở lại hoạt động toàn bộ bàn khu vực "${areaName}" thành công!`;
        this.toaster.success(msg);
        this.list.get();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra khi cập nhật trạng thái khu vực!');
        this.list.get();
        this.cdr.markForCheck();
      },
    });
  }

  getStatusBadgeClass(status: TableStatus | undefined | null): string {
    switch (status) {
      case TableStatus.Available:
        return 'badge-status-available';
      case TableStatus.Occupied:
        return 'badge-status-occupied';
      case TableStatus.Reserved:
        return 'badge-status-reserved';
      case TableStatus.Cleaning:
        return 'badge-status-cleaning';
      case TableStatus.Disabled:
        return 'badge-status-disabled';
      default:
        return 'badge-status-default';
    }
  }

  getStatusLabel(status: TableStatus | undefined | null): string {
    switch (status) {
      case TableStatus.Available:
        return '::TableStatusAvailable';
      case TableStatus.Occupied:
        return '::TableStatusOccupied';
      case TableStatus.Reserved:
        return '::TableStatusReserved';
      case TableStatus.Cleaning:
        return '::TableStatusCleaning';
      case TableStatus.Disabled:
        return '::TableStatusDisabled';
      default:
        return '';
    }
  }

  // Tính thời gian trôi qua từ lúc bàn được đặt / có khách (kết nối trực tiếp với Signal currentTime thời gian thực)
  getElapsedTime(table: TableDto): string {
    // Đọc signal currentTime để đăng ký dependency reactivity
    const now = this.currentTime();

    const rawTime = table.lastModificationTime || table.creationTime;
    if (!rawTime) return '';

    const then = new Date(rawTime).getTime();
    const diffMs = now - then;

    if (diffMs < 0 || isNaN(diffMs)) return '';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) {
      return this.localizationService.instant('::JustNow');
    }
    if (diffMinutes < 60) {
      return this.localizationService.instant('::MinutesElapsed', diffMinutes.toString());
    }

    const diffHours = Math.floor(diffMinutes / 60);
    const remMinutes = diffMinutes % 60;
    if (diffHours < 24) {
      return remMinutes > 0
        ? this.localizationService.instant('::HoursMinutesElapsed', diffHours.toString(), remMinutes.toString())
        : this.localizationService.instant('::HoursElapsed', diffHours.toString());
    }

    const diffDays = Math.floor(diffHours / 24);
    return this.localizationService.instant('::DaysElapsed', diffDays.toString());
  }

  getElapsedTimeTooltip(table: TableDto): string {
    this.currentTime();
    const rawTime = table.lastModificationTime || table.creationTime;
    if (!rawTime) return '';
    try {
      const d = new Date(rawTime);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString();
      return this.localizationService.instant('::StartedAtTime', timeStr, dateStr);
    } catch {
      return '';
    }
  }

  // --- QUẢN LÝ GỌI MÓN (ORDER) CHO BÀN ĐANG SỬ DỤNG ---
  dishSearchTerm = '';

  get orderItemsArray(): FormArray {
    return (this.orderForm?.get('items') as FormArray) || this.fb.array([]);
  }

  get filteredDishes(): DishDto[] {
    if (!this.dishes) return [];
    if (!this.dishSearchTerm || this.dishSearchTerm.trim() === '') {
      return this.dishes;
    }
    const term = this.dishSearchTerm.trim().toLowerCase();
    return this.dishes.filter(
      d =>
        (d.name && d.name.toLowerCase().includes(term)) ||
        (d.dishCategoryName && d.dishCategoryName.toLowerCase().includes(term))
    );
  }

  // Quản lý trạng thái mở / đóng của từng Course / Category
  expandedCategories: Set<string> = new Set<string>();

  get groupedDishes(): { categoryName: string; dishes: DishDto[] }[] {
    const filtered = this.filteredDishes;
    if (!filtered || filtered.length === 0) return [];

    const otherCatName = this.localizationService.instant('::OtherDishes');
    const groupsMap = new Map<string, DishDto[]>();

    for (const dish of filtered) {
      const catName = dish.dishCategoryName?.trim() || otherCatName;
      if (!groupsMap.has(catName)) {
        groupsMap.set(catName, []);
      }
      groupsMap.get(catName)!.push(dish);
    }

    // Chỉ hiển thị các category có ít nhất một dish
    const result: { categoryName: string; dishes: DishDto[] }[] = [];
    groupsMap.forEach((dishes, categoryName) => {
      if (dishes.length > 0) {
        result.push({ categoryName, dishes });
      }
    });

    return result;
  }

  toggleCategory(categoryName: string) {
    if (this.expandedCategories.has(categoryName)) {
      this.expandedCategories.delete(categoryName);
    } else {
      this.expandedCategories.add(categoryName);
    }
  }

  isCategoryExpanded(categoryName: string): boolean {
    // Nếu đang tìm kiếm món ăn thì luôn mở ra để thấy kết quả
    if (this.dishSearchTerm && this.dishSearchTerm.trim() !== '') {
      return true;
    }
    return this.expandedCategories.has(categoryName);
  }

  getDishById(id?: string): DishDto | undefined {
    if (!id) return undefined;
    return this.dishes?.find(d => d.id === id);
  }

  getDishName(id?: string): string {
    if (!id) return '';
    return this.getDishById(id)?.name || '';
  }

  getDishPrice(id?: string): number {
    if (!id) return 0;
    return this.getDishById(id)?.price || 0;
  }

  getDishImageUrl(id?: string): string | null {
    if (!id) return null;
    return this.getDishById(id)?.imageUrl || null;
  }

  onImgError(event: Event) {
    const img = event.target as HTMLElement;
    img.style.display = 'none';
  }

  getItemQuantityInOrder(dishId?: string): number {
    if (!dishId || !this.orderItemsArray) return 0;
    const item = this.orderItemsArray.controls.find(c => c.get('dishId')?.value === dishId);
    return item ? Number(item.get('quantity')?.value || 0) : 0;
  }

  recipes: RecipeDto[] = [];
  ingredients: IngredientDto[] = [];
  recipeByDishId = new Map<string, RecipeDto>();
  ingredientById = new Map<string, IngredientDto>();

  getDishStockInfo(
    dishId?: string,
    quantity: number = 1
  ): {
    isOutOfStock: boolean;
    isShortage: boolean;
    warningMessage?: string;
    ingredientName?: string;
    unitStr?: string;
    currentStock?: number;
    missingAmount?: number;
  } {
    if (!dishId) return { isOutOfStock: false, isShortage: false };
    const recipe = this.recipeByDishId.get(dishId);
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      return { isOutOfStock: false, isShortage: false };
    }

    for (const item of recipe.ingredients) {
      const ing = this.ingredientById.get(item.ingredientId);
      if (!ing) continue;

      const currentStock = Number(ing.currentStock || 0);
      const conversion = Number(item.conversionFactor || 1);
      const neededPerDish = Number(item.quantity || 0) * conversion;
      const totalNeeded = neededPerDish * quantity;
      const unitStr = ing.baseUnit || item.warehouseUnitName || item.unit || '';

      if (currentStock <= 0) {
        return {
          isOutOfStock: true,
          isShortage: true,
          ingredientName: ing.name,
          unitStr,
          currentStock: 0,
          missingAmount: totalNeeded,
          warningMessage: this.localizationService.instant(
            '::StockShortageOutOfStock',
            ing.name,
            unitStr
          ),
        };
      }

      if (currentStock < totalNeeded) {
        const missing = Number((totalNeeded - currentStock).toFixed(1));
        return {
          isOutOfStock: false,
          isShortage: true,
          ingredientName: ing.name,
          unitStr,
          currentStock,
          missingAmount: missing,
          warningMessage: this.localizationService.instant(
            '::StockShortageDeficit',
            missing.toString(),
            unitStr,
            ing.name,
            currentStock.toString()
          ),
        };
      }
    }

    return { isOutOfStock: false, isShortage: false };
  }

  initialDishQuantities = new Map<string, number>();
  initialOrderSnapshot = '';

  private getOrderSnapshot(): string {
    if (!this.orderForm) return '';
    const items = (this.orderItemsArray?.controls || [])
      .map(c => ({
        dishId: c.get('dishId')?.value,
        quantity: Number(c.get('quantity')?.value || 0),
        unitPrice: Number(c.get('unitPrice')?.value || 0),
      }))
      .sort((a, b) => (a.dishId || '').localeCompare(b.dishId || ''));

    const note = (this.orderForm.get('note')?.value || '').trim();
    return JSON.stringify({ items, note });
  }

  get hasOrderChanged(): boolean {
    if (!this.activeOrderId) return true;
    return this.getOrderSnapshot() !== this.initialOrderSnapshot;
  }

  isDishOutOfStock(dishId?: string): boolean {
    return this.getDishStockInfo(dishId, 1).isOutOfStock;
  }

  getDishStockWarning(dishId?: string, quantity: number = 1): string | null {
    if (!dishId) return null;
    const initialQty = this.initialDishQuantities.get(dishId) || 0;
    // Nếu món đã có trong đơn từ trước và không tăng số lượng -> không hiện cảnh báo
    if (initialQty > 0 && quantity <= initialQty) {
      return null;
    }

    const info = this.getDishStockInfo(dishId, quantity);
    return info.warningMessage || null;
  }

  openOrderModal(table: TableDto) {
    this.selectedTableForOrder = table;
    this.dishSearchTerm = '';

    const setupModal = () => {
      if (table.id) {
        this.orderService.getActiveOrderByTableId(table.id).subscribe({
          next: (activeOrder) => {
            if (activeOrder && activeOrder.id) {
              this.activeOrderId = activeOrder.id;
              this.loadOrderToForm(activeOrder);
            } else {
              this.activeOrderId = null;
              this.initOrderForm();
            }
            this.expandedCategories = new Set<string>();
            this.isOrderModalOpen = true;
            this.cdr.markForCheck();
          },
          error: () => {
            this.activeOrderId = null;
            this.initOrderForm();
            this.expandedCategories = new Set<string>();
            this.isOrderModalOpen = true;
            this.cdr.markForCheck();
          },
        });
      } else {
        this.activeOrderId = null;
        this.initOrderForm();
        this.expandedCategories = new Set<string>();
        this.isOrderModalOpen = true;
        this.cdr.markForCheck();
      }
    };

    // Tải đồng bộ món ăn, công thức và tồn kho nguyên liệu
    forkJoin({
      dishesRes: this.dishService.getList({ maxResultCount: 200, skipCount: 0 } as any).pipe(catchError(() => of({ items: [] }))),
      recipesRes: this.recipeService.getList({ maxResultCount: 1000 } as any).pipe(catchError(() => of({ items: [] }))),
      ingredientsRes: this.ingredientService.getList({ maxResultCount: 1000 } as any).pipe(catchError(() => of({ items: [] }))),
    }).subscribe({
      next: ({ dishesRes, recipesRes, ingredientsRes }) => {
        this.dishes = (dishesRes as any)?.items || [];
        this.recipes = (recipesRes as any)?.items || [];
        this.ingredients = (ingredientsRes as any)?.items || [];

        this.recipeByDishId.clear();
        for (const r of this.recipes) {
          if (r.dishId && r.isActive) {
            this.recipeByDishId.set(r.dishId, r);
          }
        }

        this.ingredientById.clear();
        for (const ing of this.ingredients) {
          if (ing.id) {
            this.ingredientById.set(ing.id, ing);
          }
        }

        setupModal();
      },
      error: () => {
        setupModal();
      },
    });
  }

  private loadOrderToForm(order: OrderDto) {
    const itemGroups = (order.items || []).map(item =>
      this.fb.group({
        dishId: [item.dishId, Validators.required],
        quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
        unitPrice: [item.unitPrice || 0, [Validators.required, Validators.min(0)]],
      })
    );

    this.orderForm = this.fb.group({
      orderNumber: [order.orderNumber || 'ORD-' + Math.floor(100000 + Math.random() * 900000), Validators.required],
      orderDate: [order.orderDate ? order.orderDate.substring(0, 10) : new Date().toISOString().substring(0, 10), Validators.required],
      status: [order.status ?? OrderStatus.Pending],
      note: [order.note || ''],
      totalAmount: [order.totalAmount || 0],
      items: this.fb.array(itemGroups),
    });
    this.calculateOrderTotal();
    this.dishSearchTerm = '';

    this.initialDishQuantities.clear();
    for (const item of order.items || []) {
      if (item.dishId) {
        this.initialDishQuantities.set(item.dishId, item.quantity || 0);
      }
    }
    this.initialOrderSnapshot = this.getOrderSnapshot();
  }

  private initOrderForm() {
    this.orderForm = this.fb.group({
      orderNumber: ['ORD-' + Math.floor(100000 + Math.random() * 900000), Validators.required],
      orderDate: [new Date().toISOString().substring(0, 10), Validators.required],
      status: [OrderStatus.Pending],
      note: [''],
      totalAmount: [0],
      items: this.fb.array([]),
    });
    this.dishSearchTerm = '';
    this.initialDishQuantities.clear();
    this.initialOrderSnapshot = '';
  }

  private lastWarningMsg = '';
  private lastWarningTime = 0;

  private showStockWarningToast(message?: string, title?: string) {
    if (!message) return;
    const now = Date.now();
    if (this.lastWarningMsg === message && now - this.lastWarningTime < 1500) {
      return;
    }
    this.lastWarningMsg = message;
    this.lastWarningTime = now;
    this.toaster.warn(message, title);
  }

  addDishToOrder(dish: DishDto) {
    if (!dish || !dish.id) return;
    const existingIndex = this.orderItemsArray.controls.findIndex(
      c => c.get('dishId')?.value === dish.id
    );

    if (existingIndex >= 0) {
      this.increaseQuantity(existingIndex);
      return;
    }

    const stockInfo = this.getDishStockInfo(dish.id, 1);
    if (stockInfo.isShortage && stockInfo.warningMessage) {
      this.showStockWarningToast(stockInfo.warningMessage, `Cảnh báo: ${dish.name}`);
    }

    this.orderItemsArray.push(
      this.fb.group({
        dishId: [dish.id, Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: [dish.price || 0, [Validators.required, Validators.min(0)]],
      })
    );
    this.calculateOrderTotal();
  }

  increaseQuantity(index: number) {
    const row = this.orderItemsArray.at(index);
    const current = Number(row.get('quantity')?.value || 1);
    const dishId = row.get('dishId')?.value;
    const newQty = current + 1;

    const initialQty = this.initialDishQuantities.get(dishId) || 0;
    // Chỉ hiện cảnh báo nếu số lượng mới vượt quá số lượng ban đầu của đơn
    if (newQty > initialQty) {
      const stockInfo = this.getDishStockInfo(dishId, newQty);
      if (stockInfo.isShortage && stockInfo.warningMessage) {
        this.showStockWarningToast(stockInfo.warningMessage, `Cảnh báo: ${this.getDishName(dishId)}`);
      }
    }

    row.patchValue({ quantity: newQty });
    this.calculateOrderTotal();
  }

  decreaseQuantity(index: number) {
    const row = this.orderItemsArray.at(index);
    const current = Number(row.get('quantity')?.value || 1);
    if (current > 1) {
      row.patchValue({ quantity: current - 1 });
      this.calculateOrderTotal();
    } else {
      this.removeOrderItem(index);
    }
  }

  removeOrderItem(index: number) {
    this.orderItemsArray.removeAt(index);
    this.calculateOrderTotal();
  }

  clearAllOrderItems() {
    this.orderItemsArray.clear();
    this.calculateOrderTotal();
  }

  calculateOrderTotal() {
    let total = 0;
    if (this.orderItemsArray) {
      const items = this.orderItemsArray.controls;
      for (const item of items) {
        const q = item.get('quantity')?.value || 0;
        const p = item.get('unitPrice')?.value || 0;
        total += q * p;
      }
    }
    this.orderForm?.get('totalAmount')?.setValue(total);
    this.cdr.markForCheck();
  }

  saveOrderForTable() {
    if (!this.selectedTableForOrder?.id || !this.orderForm) return;

    if (this.orderForm.invalid || this.orderItemsArray.length === 0) {
      this.toaster.warn(this.localizationService.instant('::PleaseSelectAtLeastOneDish'));
      return;
    }

    const formVal = { ...this.orderForm.value };
    formVal.tableId = this.selectedTableForOrder.id;

    const executeSave = () => {
      if (this.activeOrderId) {
        this.orderService.update(this.activeOrderId, formVal).subscribe({
          next: () => {
            const tableName = this.selectedTableForOrder?.name || '';
            this.toaster.success(
              this.localizationService.instant('::OrderUpdatedSuccessfully', tableName)
            );
            this.isOrderModalOpen = false;
            this.orderForm.reset();
            this.activeOrderId = null;
            this.cdr.markForCheck();
          },
          error: () => {},
        });
      } else {
        formVal.orderDate = new Date().toISOString();
        formVal.status = OrderStatus.Pending;

        this.orderService.create(formVal).subscribe({
          next: () => {
            const tableName = this.selectedTableForOrder?.name || '';
            this.toaster.success(
              this.localizationService.instant('::OrderCreatedSuccessfully', tableName)
            );
            this.isOrderModalOpen = false;
            this.orderForm.reset();
            this.activeOrderId = null;
            this.cdr.markForCheck();
          },
          error: () => {},
        });
      }
    };

    // Kiểm tra xem trong đơn có món nào thiếu/hết nguyên liệu không (chỉ xét món mới hoặc món tăng số lượng)
    const shortages: string[] = [];
    for (const item of this.orderItemsArray.controls) {
      const dId = item.get('dishId')?.value;
      const q = Number(item.get('quantity')?.value || 1);
      const initialQty = this.initialDishQuantities.get(dId) || 0;

      // Nếu món đã có từ trước và không tăng số lượng -> không cảnh báo
      if (initialQty > 0 && q <= initialQty) {
        continue;
      }

      const s = this.getDishStockInfo(dId, q);
      if (s.isShortage && s.warningMessage) {
        const line = this.localizationService.instant(
          '::StockShortageDishLine',
          this.getDishName(dId),
          q.toString(),
          s.warningMessage
        );
        shortages.push(line);
      }
    }

    if (shortages.length > 0) {
      const alertList = shortages.join('<br>');
      const alertMsg = this.localizationService.instant('::OrderHasStockShortageAlert', alertList);
      this.confirmation.warn(
        alertMsg,
        this.localizationService.instant('::StockShortageWarningTitle'),
        {
          hideCancelBtn: true,
          yesText: '::Close',
        }
      );
      return;
    }

    executeSave();
  }

  // Điều hướng phụ trợ nếu cần
  navigateToOrder(table?: TableDto) {
    this.router.navigate(['/orders']);
  }
}
