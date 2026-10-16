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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  CoreModule,
  ListService,
  LocalizationService,
  PagedResultDto,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Subscription, interval } from 'rxjs';
import { TableService } from '../proxy/tables/table.service';
import { TableDto, GetTablesInput } from '../proxy/tables/models';
import { TableStatus } from '../proxy/tables/table-status.enum';
import { DiningAreaService } from '../proxy/dining-areas/dining-area.service';
import { DiningAreaDto } from '../proxy/dining-areas/models';

import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';
import { TableSignalrService } from '../shared/services/table-signalr.service';
import { TableReservationModalComponent } from '../waiter/reservation-modal/table-reservation-modal.component';
import { TableReservationDetailModalComponent } from '../waiter/reservation-modal/table-reservation-detail-modal.component';
import { TableTransferModalComponent } from '../shared/components/tables/table-transfer-modal.component';
import { TableMergeModalComponent } from '../shared/components/tables/table-merge-modal.component';
import { TableEndMealModalComponent } from '../shared/components/tables/table-end-meal-modal.component';
import { TableFormModalComponent } from './components/table-form-modal.component';
import { DiningAreaFormModalComponent } from './components/dining-area-form-modal.component';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
    NgxDatatableModule,
    ReactiveFormsModule,
    FormsModule,
    CustomSelectComponent,
    TableFormModalComponent,
    DiningAreaFormModalComponent,
    TableReservationModalComponent,
    TableReservationDetailModalComponent,
    TableTransferModalComponent,
    TableMergeModalComponent,
    TableEndMealModalComponent,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  providers: [ListService],
})
export class TableComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly tableService = inject(TableService);
  private readonly diningAreaService = inject(DiningAreaService);
  private readonly toaster = inject(ToasterService);
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

  readonly tableStatuses = [
    { value: TableStatus.Available, key: '::TableStatusAvailable' },
    { value: TableStatus.Occupied, key: '::TableStatusOccupied' },
    { value: TableStatus.Reserved, key: '::TableStatusReserved' },
    { value: TableStatus.Cleaning, key: '::TableStatusCleaning' },
    { value: TableStatus.Disabled, key: '::TableStatusDisabled' },
  ];
  readonly TableStatus = TableStatus;

  // Chế độ xem: 'grid' (Sơ đồ mặt bằng - Mặc định) hoặc 'table' (Bảng danh sách)
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

  // Modals Quản lý bàn & Khu vực
  isModalOpen = false;
  selectedItem: TableDto | null = null;
  isAreaModalOpen = false;

  // Modals Đặt bàn (RM-009)
  isReservationModalOpen = false;
  reservingTable: TableDto | null = null;
  isReservationDetailModalOpen = false;
  selectedReservedTable: TableDto | null = null;

  // Modals Vận hành Bàn ăn (RM-017)
  isTransferModalOpen = false;
  selectedTransferTable: TableDto | null = null;
  isMergeModalOpen = false;
  selectedPrimaryMergeTable: TableDto | null = null;
  isEndMealModalOpen = false;
  selectedEndMealTable: TableDto | null = null;

  // Modal Cảnh báo khi Khóa cả khu vực có bàn đặt trước
  isDisableAreaConfirmModalOpen = false;
  pendingDisableAreaTables: TableDto[] = [];
  pendingDisableAreaName = '';
  pendingDisableAreaId = '';

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;
  private timerSubscription?: Subscription;
  private signalrSubscription?: Subscription;

  // Helper so khớp bàn với khu vực
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

  // Danh sách bàn sau khi lọc theo area / status / search
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

  // Pagination signals cho Grid view
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

  readonly filteredGridTables = computed<TableDto[]>(() => {
    const list = this.filteredTableList();
    const page = this.gridPage();
    const size = this.gridPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // Table View rows
  readonly pagedTableRows = computed<TableDto[]>(() => {
    const list = this.filteredTableList();
    const page = this.list.page || 0;
    const pageSize = this.list.maxResultCount || 10;
    const start = page * pageSize;
    return list.slice(start, start + pageSize);
  });

  // 6 Thẻ chỉ số tổng quan
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
    this.list.maxResultCount = 50;

    const initialAreaId = this.route.snapshot.queryParamMap.get('areaId');
    if (initialAreaId) {
      this.selectedAreaId.set(initialAreaId);
    }

    this.loadDiningAreas();

    const streamCreator = (query: GetTablesInput) =>
      this.tableService.getList({
        ...query,
        sorting: this.sortBy,
        maxResultCount: 200,
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      this.data = res;
      this.allTables.set(res.items || []);
      this.cdr.markForCheck();
      this.recalculateTable();
    });

    // Cập nhật Timer mỗi 10 giây
    this.timerSubscription = interval(10000).subscribe(() => {
      this.currentTime.set(Date.now());
      this.cdr.markForCheck();
    });

    // SignalR realtime event listener
    this.signalrSubscription = this.tableSignalrService.tableStatusChanged$.subscribe(event => {
      this.allTables.update(tables =>
        tables.map(t =>
          t.id === event.tableId
            ? {
                ...t,
                status: event.status as TableStatus,
                occupiedTime: event.occupiedTime ?? t.occupiedTime,
              }
            : t
        )
      );
      if (this.data?.items) {
        this.data.items = this.data.items.map(t =>
          t.id === event.tableId
            ? {
                ...t,
                status: event.status as TableStatus,
                occupiedTime: event.occupiedTime ?? t.occupiedTime,
              }
            : t
        );
      }
      this.cdr.markForCheck();
    });

    this.signalrSubscription.add(
      this.tableSignalrService.tableOrderUpdated$.subscribe(event => {
        this.allTables.update(tables =>
          tables.map(t =>
            t.id === event.tableId
              ? {
                  ...t,
                  hasActiveOrder: event.hasActiveOrder,
                  activeOrderId: event.activeOrderId || undefined,
                }
              : t
          )
        );
        if (this.data?.items) {
          this.data.items = this.data.items.map(t =>
            t.id === event.tableId
              ? {
                  ...t,
                  hasActiveOrder: event.hasActiveOrder,
                  activeOrderId: event.activeOrderId || undefined,
                }
              : t
          );
        }
        this.cdr.markForCheck();
      })
    );
  }

  ngAfterViewInit() {
    this.setupResizeObserver();
  }

  ngOnDestroy() {
    this.listSubscription?.unsubscribe();
    this.timerSubscription?.unsubscribe();
    this.signalrSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    const elem = this.tableWrapper?.nativeElement;
    if (!elem) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.recalculateTable();
    });
    this.resizeObserver.observe(elem);
  }

  recalculateTable() {
    if (this.viewMode() === 'table' && this.table) {
      setTimeout(() => {
        this.table?.recalculate();
        this.cdr.markForCheck();
      }, 50);
    }
  }

  loadDiningAreas() {
    this.diningAreaService.getList({ maxResultCount: 100 }).subscribe(res => {
      this.diningAreas.set(res.items || []);
      this.cdr.markForCheck();
    });
  }

  // --- ACTIONS & MODAL CONTROLLERS ---
  createTable() {
    this.selectedItem = null;
    this.isModalOpen = true;
  }

  editTable(id?: string) {
    if (!id) return;
    this.tableService.get(id).subscribe(res => {
      this.selectedItem = res;
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  delete(id?: string) {
    if (!id) return;
    const table = this.allTables().find(t => t.id === id);
    const tableName: string = (table?.name) || '';
    this.confirmation
      .warn('::TableDeletionConfirmationMessage', '::AreYouSure', {
        messageLocalizationParams: [tableName],
      })
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.tableService.delete(id).subscribe({
            next: () => {
              this.toaster.success(this.localizationService.instant('::SuccessfullyDeleted'));
              this.list.get();
            },
            error: (err) => {
              const msg = err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::ActionFailed');
              this.toaster.error(msg, this.localizationService.instant('::Error'));
            },
          });
        }
      });
  }

  quickUpdateStatus(table: TableDto, status: TableStatus) {
    if (!table.id) return;
    this.tableService.changeStatus(table.id, status).subscribe({
      next: (updated) => {
        this.allTables.update(tables =>
          tables.map(t => (t.id === updated.id ? { ...t, ...updated } : t))
        );
        this.toaster.success(this.localizationService.instant('::SuccessfullyUpdated'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::ActionFailed');
        this.toaster.error(msg, this.localizationService.instant('::Error'));
        this.list.get();
      },
    });
  }

  toggleDisableTable(table: TableDto) {
    if (!table.id) return;
    const newStatus = table.status === TableStatus.Disabled ? TableStatus.Available : TableStatus.Disabled;
    this.quickUpdateStatus(table, newStatus);
  }

  toggleDisableCurrentArea() {
    const areaId = this.selectedAreaId();
    if (!areaId) return;

    const allDisabled = this.isCurrentAreaAllDisabled();
    const newStatus = allDisabled ? TableStatus.Available : TableStatus.Disabled;
    const areaName = this.currentAreaName();

    const titleKey = allDisabled ? '::ConfirmEnableAreaTablesTitle' : '::ConfirmDisableAreaTablesTitle';
    const messageKey = allDisabled ? '::ConfirmEnableAreaTablesMessage' : '::ConfirmDisableAreaTablesMessage';

    this.confirmation
      .warn(messageKey, titleKey, {
        messageLocalizationParams: [areaName],
      })
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.tableService.setAreaTablesStatus(areaId, newStatus).subscribe({
            next: () => {
              this.toaster.success(this.localizationService.instant('::AreaTablesStatusUpdatedSuccess'));
              this.list.get();
            },
            error: (err) => {
              const msg = err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::ActionFailed');
              this.toaster.error(msg, this.localizationService.instant('::Error'));
            },
          });
        }
      });
  }

  // --- RM-017: TRANSFER, MERGE, END MEAL & ORDER ---
  openTransferModal(table: TableDto) {
    this.selectedTransferTable = table;
    this.isTransferModalOpen = true;
  }

  openMergeModal(table: TableDto) {
    this.selectedPrimaryMergeTable = table;
    this.isMergeModalOpen = true;
  }

  onEndMeal(table: TableDto) {
    this.selectedEndMealTable = table;
    this.isEndMealModalOpen = true;
  }

  goToOrder(table: TableDto) {
    if (!table.id) return;
    this.router.navigate(['/waiter/order', table.id]);
  }

  getActionLabel(
    action: 'order' | 'endMeal' | 'transfer' | 'merge' | 'seatGuests' | 'reserve' | 'disable' | 'checkIn' | 'reservationDetails',
    hasActiveOrder: boolean = false
  ): string {
    const lang = this.localizationService.currentLang || 'vi';
    const isVi = lang.toLowerCase().startsWith('vi');

    switch (action) {
      case 'order':
        return hasActiveOrder ? (isVi ? 'Xem đơn' : 'View Order') : (isVi ? 'Gọi món' : 'Order');
      case 'endMeal':
        return isVi ? 'Kết thúc' : 'End Meal';
      case 'transfer':
        return isVi ? 'Đổi bàn' : 'Transfer';
      case 'merge':
        return isVi ? 'Gộp bàn' : 'Merge';
      case 'seatGuests':
        return isVi ? 'Đón khách' : 'Seat Guests';
      case 'reserve':
        return isVi ? 'Đặt lịch' : 'Reserve';
      case 'disable':
        return isVi ? 'Khóa bàn' : 'Disable';
      case 'checkIn':
        return isVi ? 'Nhận bàn' : 'Check In';
      case 'reservationDetails':
        return isVi ? 'Chi tiết' : 'Details';
      default:
        return '';
    }
  }

  // --- RESERVATION MODALS ---
  openReserveModal(table: TableDto) {
    this.reservingTable = table;
    this.isReservationModalOpen = true;
  }

  openReservationDetailModal(table: TableDto, event?: Event) {
    event?.stopPropagation();
    this.selectedReservedTable = table;
    this.isReservationDetailModalOpen = true;
  }

  openQuickAreaModal() {
    this.isAreaModalOpen = true;
  }

  onAreaCreated(area: DiningAreaDto) {
    this.loadDiningAreas();
  }

  // --- FILTER & VIEW CONTROLS ---
  setViewMode(mode: 'grid' | 'table') {
    this.viewMode.set(mode);
    if (mode === 'table') {
      this.recalculateTable();
    }
  }

  selectArea(areaId?: string | null) {
    this.selectedAreaId.set(areaId ?? null);
    this.gridPage.set(1);
    this.list.page = 0;
  }

  filterByStatus(status: number | null) {
    this.selectedStatus.set(status);
    this.gridPage.set(1);
    this.list.page = 0;
  }

  onSearchChange() {
    this.searchTermSignal.set(this.searchTerm);
    this.gridPage.set(1);
    this.list.page = 0;
  }

  // Grid pagination
  changeGridPageSize(size: any) {
    this.gridPageSize.set(Number(size));
    this.gridPage.set(1);
  }

  gridFirstPage() {
    this.gridPage.set(1);
  }

  gridPrevPage() {
    this.gridPage.update(p => Math.max(1, p - 1));
  }

  gridNextPage() {
    this.gridPage.update(p => Math.min(this.gridTotalPages(), p + 1));
  }

  gridLastPage() {
    this.gridPage.set(this.gridTotalPages());
  }

  // Table pagination
  onTablePageChange(event: any) {
    this.list.page = event.offset;
  }

  changePageSize(size: any) {
    this.list.maxResultCount = Number(size);
    this.list.page = 0;
  }

  firstPage() {
    this.list.page = 0;
  }

  prevPage() {
    if (this.list.page > 0) {
      this.list.page--;
    }
  }

  nextPage() {
    if (this.list.page < this.totalPages - 1) {
      this.list.page++;
    }
  }

  lastPage() {
    this.list.page = this.totalPages - 1;
  }

  // --- TIME & STATUS HELPERS ---
  getMealDurationMinutes(occupiedTime?: string | null): number {
    if (!occupiedTime) return 0;
    const start = new Date(occupiedTime).getTime();
    if (isNaN(start)) return 0;
    const end = this.currentTime();
    return Math.max(0, Math.floor((end - start) / 60000));
  }

  getMealDurationWarningClass(occupiedTime?: string | null): string {
    const mins = this.getMealDurationMinutes(occupiedTime);
    if (mins >= 90) {
      return 'badge-meal-long pulse-warning';
    }
    if (mins >= 60) {
      return 'badge-meal-warning';
    }
    return 'badge-meal-normal';
  }

  getElapsedTime(t: TableDto): string {
    if (!t.occupiedTime) return '';
    const mins = this.getMealDurationMinutes(t.occupiedTime);
    if (mins < 1) {
      return this.localizationService.instant('::JustSeated') || 'Vừa vào';
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours === 0) {
      return `${mins}m`;
    }
    return `${hours}h ${remMins}m`;
  }

  getElapsedTimeTooltip(t: TableDto): string {
    if (!t.occupiedTime) return '';
    const dateStr = new Date(t.occupiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${this.localizationService.instant('::TableSeatedAt')}: ${dateStr}`;
  }

  getStatusBadgeClass(status?: TableStatus): string {
    const s = status ?? TableStatus.Available;
    switch (s) {
      case TableStatus.Available:
        return 'badge-available';
      case TableStatus.Occupied:
        return 'badge-occupied';
      case TableStatus.Reserved:
        return 'badge-reserved';
      case TableStatus.Cleaning:
        return 'badge-cleaning';
      case TableStatus.Disabled:
        return 'badge-disabled';
      default:
        return '';
    }
  }

  getStatusLabel(status?: TableStatus): string {
    const s = status ?? TableStatus.Available;
    switch (s) {
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
        return '::Unknown';
    }
  }
}
