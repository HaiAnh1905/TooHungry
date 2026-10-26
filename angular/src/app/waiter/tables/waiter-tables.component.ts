import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { Subscription, filter, switchMap, map } from 'rxjs';
import { TableService } from '../../proxy/tables/table.service';
import { TableDto, CreateUpdateTableDto } from '../../proxy/tables/models';
import { TableStatus } from '../../proxy/tables/table-status.enum';
import { DiningAreaService } from '../../proxy/dining-areas/dining-area.service';
import { DiningAreaDto } from '../../proxy/dining-areas/models';
import { OrderService } from '../../proxy/orders/order.service';
import { TableSignalrService } from '../../shared/services/table-signalr.service';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';
import { TableReservationService } from '../../proxy/reservations/table-reservation.service';
import { TableReservationDto } from '../../proxy/reservations/models';
import { TableReservationModalComponent } from '../reservation-modal/table-reservation-modal.component';
import { TableReservationDetailModalComponent } from '../reservation-modal/table-reservation-detail-modal.component';
import { WaiterSidebarService } from '../services/waiter-sidebar.service';
import { TableTransferModalComponent } from '../../shared/components/tables/table-transfer-modal.component';
import { TableMergeModalComponent } from '../../shared/components/tables/table-merge-modal.component';
import { TableEndMealModalComponent } from '../../shared/components/tables/table-end-meal-modal.component';
import { TableCardComponent } from '../../shared/components/tables/table-card/table-card.component';
import { TableStateService } from '../../shared/services/table-state.service';

@Component({
  selector: 'app-waiter-tables',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CoreModule,
    ThemeSharedModule,
    CustomSelectComponent,
    TableReservationModalComponent,
    TableReservationDetailModalComponent,
    TableTransferModalComponent,
    TableMergeModalComponent,
    TableEndMealModalComponent,
    TableCardComponent,
  ],
  templateUrl: './waiter-tables.component.html',
  styleUrl: './waiter-tables.component.scss',
})
export class WaiterTablesComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly sidebarService = inject(WaiterSidebarService);
  private readonly tableService = inject(TableService);
  private readonly diningAreaService = inject(DiningAreaService);
  private readonly orderService = inject(OrderService);
  private readonly tableReservationService = inject(TableReservationService);
  private readonly signalrService = inject(TableSignalrService);
  private readonly tableState = inject(TableStateService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('tablesSidebarFilter') tablesSidebarFilter!: TemplateRef<any>;

  readonly TableStatus = TableStatus;

  // State signals
  readonly tables = signal<TableDto[]>([]);
  readonly diningAreas = signal<DiningAreaDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly selectedAreaId = signal<string | null>(null);
  readonly selectedStatus = signal<number | null>(null);
  readonly searchQuery = signal<string>('');

  // Reservation Modals (RM-009)
  isReservationModalOpen = false;
  reservingTable: TableDto | null = null;

  isReservationDetailModalOpen = false;
  selectedReservedTable: TableDto | null = null;

  // Modals (RM-017)
  isTransferModalOpen = false;
  selectedTransferTable: TableDto | null = null;

  isMergeModalOpen = false;
  selectedPrimaryMergeTable: TableDto | null = null;

  isEndMealModalOpen = false;
  selectedEndMealTable: TableDto | null = null;

  // Timer cập nhật thời gian phục vụ mỗi 30s
  readonly currentTime = signal<Date>(new Date());
  private timerInterval?: any;

  private signalrSubscription?: Subscription;

  // Status Filter Options for Dropdown
  readonly statusOptions: CustomSelectOption[] = [
    { value: -1, label: '::AllStatuses', icon: 'fa-layer-group' },
    { value: TableStatus.Available, label: '::TableStatusAvailable', icon: 'fa-check-circle' },
    { value: TableStatus.Occupied, label: '::TableStatusOccupied', icon: 'fa-utensils' },
    { value: TableStatus.Reserved, label: '::TableStatusReserved', icon: 'fa-calendar-check' },
    { value: TableStatus.Cleaning, label: '::TableStatusCleaning', icon: 'fa-broom' },
    { value: TableStatus.Disabled, label: '::TableStatusDisabled', icon: 'fa-ban' },
  ];

  // Active dining areas (IsActive = true only)
  readonly activeDiningAreas = computed(() =>
    this.diningAreas().filter(a => a.isActive)
  );

  // Tổng số lượng bàn thỏa mãn filter status đang chọn (cho badge All Areas)
  readonly statusFilteredTotalCount = computed(() => {
    const status = this.selectedStatus();
    if (status !== null && status !== -1) {
      return this.tables().filter(t => t.status === status).length;
    }
    return this.tables().length;
  });

  // Danh sách Dining Areas đang hoạt động và có số lượng bàn > 0 theo trạng thái đang lọc
  readonly filteredDiningAreas = computed(() => {
    const status = this.selectedStatus();
    const allTables = this.tables();
    const matchingTables =
      status !== null && status !== -1
        ? allTables.filter(t => t.status === status)
        : allTables;

    const countMap = new Map<string, number>();
    for (const t of matchingTables) {
      if (t.diningAreaId) {
        countMap.set(t.diningAreaId, (countMap.get(t.diningAreaId) || 0) + 1);
      }
    }

    return this.diningAreas()
      .filter(area => area.isActive)
      .map(area => ({
        ...area,
        tableCount: countMap.get(area.id || '') || 0,
      }))
      .filter(area => (area.tableCount || 0) > 0);
  });

  // Computed summary counts
  readonly totalCount = computed(() => this.tables().length);
  readonly availableCount = computed(
    () => this.tables().filter(t => t.status === TableStatus.Available).length
  );
  readonly occupiedCount = computed(
    () => this.tables().filter(t => t.status === TableStatus.Occupied).length
  );
  readonly reservedCount = computed(
    () => this.tables().filter(t => t.status === TableStatus.Reserved).length
  );
  readonly cleaningCount = computed(
    () => this.tables().filter(t => t.status === TableStatus.Cleaning).length
  );
  readonly disabledCount = computed(
    () => this.tables().filter(t => t.status === TableStatus.Disabled).length
  );

  // Filtered tables for display
  readonly filteredTables = computed(() => {
    let list = this.tables();

    // 1. Filter by Active Area
    const areaId = this.selectedAreaId();
    if (areaId) {
      list = list.filter(t => t.diningAreaId === areaId);
    } else {
      // Khi chọn "Tất cả", chỉ hiển thị bàn thuộc khu vực đang hoạt động hoặc không thuộc khu nào
      const activeIds = new Set(this.activeDiningAreas().map(a => a.id));
      list = list.filter(t => !t.diningAreaId || activeIds.has(t.diningAreaId));
    }

    // 2. Filter by Status
    const status = this.selectedStatus();
    if (status !== null && status !== -1) {
      list = list.filter(t => t.status === status);
    }

    // 3. Filter by Search Query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(
        t =>
          (t.name && t.name.toLowerCase().includes(query)) ||
          (t.diningAreaName && t.diningAreaName.toLowerCase().includes(query)) ||
          (t.location && t.location.toLowerCase().includes(query)) ||
          (t.reservedCustomerName && t.reservedCustomerName.toLowerCase().includes(query)) ||
          (t.reservedCustomerPhone && t.reservedCustomerPhone.toLowerCase().includes(query))
      );
    }

    return list;
  });

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedAreaId() !== null) count++;
    const status = this.selectedStatus();
    if (status !== null && status !== -1) count++;
    if (this.searchQuery().trim()) count++;
    return count;
  });

  ngOnInit() {
    this.loadData();
    this.listenToSignalr();
    this.timerInterval = setInterval(() => {
      this.currentTime.set(new Date());
      this.cdr.markForCheck();
    }, 30000);
  }

  ngAfterViewInit() {
    if (this.tablesSidebarFilter) {
      this.sidebarService.registerTemplate(
        this.tablesSidebarFilter,
        '::FilterDrawerTitle',
        this.activeFilterCount()
      );
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.signalrSubscription?.unsubscribe();
    this.sidebarService.clearTemplate();
  }

  loadData() {
    this.isLoading.set(true);

    // Load areas
    this.diningAreaService.getLookup().subscribe({
      next: res => {
        this.diningAreas.set(res.items || []);
        this.cdr.markForCheck();
      },
    });

    // Load tables (lấy toàn bộ để vận hành trực quan)
    this.tableService
      .getList({
        maxResultCount: 500,
        skipCount: 0,
        sorting: 'name asc',
      })
      .subscribe({
        next: res => {
          this.tables.set(res.items || []);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  listenToSignalr() {
    this.signalrSubscription = this.signalrService.tableStatusChanged$.subscribe(event => {
      this.tables.update(list =>
        list.map(table => {
          if (table.id === event.tableId) {
            const isCleared =
              event.status === TableStatus.Available ||
              event.status === TableStatus.Cleaning ||
              event.status === TableStatus.Disabled;

            return {
              ...table,
              status: event.status as TableStatus,
              occupiedTime:
                event.occupiedTime !== undefined
                  ? event.occupiedTime
                  : event.status === TableStatus.Occupied
                    ? (table.occupiedTime || new Date().toISOString())
                    : undefined,
              ...(isCleared
                ? {
                    reservedCustomerName: undefined,
                    reservedCustomerPhone: undefined,
                    reservedTime: undefined,
                    reservedGuestCount: undefined,
                    reservedNote: undefined,
                    hasActiveOrder: false,
                    activeOrderId: undefined,
                    occupiedTime: undefined,
                  }
                : {}),
            };
          }
          return table;
        })
      );
      this.cdr.markForCheck();
    });

    this.signalrSubscription.add(
      this.signalrService.tableOrderUpdated$.subscribe(event => {
        this.tables.update(list =>
          list.map(table => {
            if (table.id === event.tableId) {
              return {
                ...table,
                hasActiveOrder: event.hasActiveOrder,
                activeOrderId: event.activeOrderId ?? undefined,
              };
            }
            return table;
          })
        );
        this.cdr.markForCheck();
      })
    );
  }

  selectArea(areaId: string | null) {
    this.selectedAreaId.set(areaId);
    this.sidebarService.setActiveFilterCount(this.activeFilterCount());
  }

  onStatusChange(status: any) {
    const val = Number(status);
    this.selectedStatus.set(val === -1 ? null : val);

    // Nếu khu vực đang chọn không còn nằm trong danh sách các khu vực có bàn theo trạng thái mới, reset về All Areas
    const currentAreaId = this.selectedAreaId();
    if (currentAreaId) {
      const validAreaIds = new Set(this.filteredDiningAreas().map(a => a.id));
      if (!validAreaIds.has(currentAreaId)) {
        this.selectedAreaId.set(null);
      }
    }

    this.sidebarService.setActiveFilterCount(this.activeFilterCount());
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.sidebarService.setActiveFilterCount(this.activeFilterCount());
  }

  resetFilters() {
    this.selectedAreaId.set(null);
    this.selectedStatus.set(null);
    this.searchQuery.set('');
    this.sidebarService.setActiveFilterCount(0);
  }

  // --- ACTIONS THEO NGỮ CẢNH ---

  // 1. Đón khách (AVAILABLE -> OCCUPIED)
  seatGuests(table: TableDto) {
    if (!table.id) return;
    this.tableService.changeStatus(table.id, TableStatus.Occupied).subscribe({
      next: updated => {
        this.updateLocalTable(updated);
        this.toaster.success(
          this.localizationService.instant('::SeatGuestsSuccess', table.name || '')
        );
      },
      error: err => {
        this.handleError(err);
      },
    });
  }

  // 2. Mở dialog Đặt bàn (AVAILABLE -> RESERVED)
  openReservationModal(table: TableDto) {
    this.reservingTable = table;
    this.isReservationModalOpen = true;
    this.cdr.detectChanges();
  }

  onReservationCreated(res: TableReservationDto) {
    this.tables.update(list =>
      list.map(t =>
        t.id === res.tableId
          ? {
              ...t,
              status: TableStatus.Reserved,
              reservedCustomerName: res.customerName,
              reservedCustomerPhone: res.customerPhone,
              reservedTime: res.reservationTime,
              reservedGuestCount: res.guestCount,
              reservedNote: res.note || undefined,
            }
          : t
      )
    );
    this.cdr.detectChanges();
  }

  // 3. Mở dialog Xem/Sửa Đặt bàn (RESERVED)
  openReservationDetailModal(table: TableDto) {
    this.selectedReservedTable = table;
    this.isReservationDetailModalOpen = true;
    this.cdr.detectChanges();
  }

  onReservationUpdated(res: TableReservationDto) {
    this.tables.update(list =>
      list.map(t =>
        t.id === res.tableId
          ? {
              ...t,
              reservedCustomerName: res.customerName,
              reservedCustomerPhone: res.customerPhone,
              reservedTime: res.reservationTime,
              reservedGuestCount: res.guestCount,
              reservedNote: res.note || undefined,
            }
          : t
      )
    );
    this.cdr.markForCheck();
  }

  onReservationCheckedIn(res: TableReservationDto) {
    this.tables.update(list =>
      list.map(t =>
        t.id === res.tableId
          ? {
              ...t,
              status: TableStatus.Occupied,
              reservedCustomerName: undefined,
              reservedCustomerPhone: undefined,
              reservedTime: undefined,
              reservedGuestCount: undefined,
              reservedNote: undefined,
            }
          : t
      )
    );
    this.cdr.markForCheck();
  }

  onReservationCancelled(res: TableReservationDto) {
    this.tables.update(list =>
      list.map(t =>
        t.id === res.tableId
          ? {
              ...t,
              status: TableStatus.Available,
              reservedCustomerName: undefined,
              reservedCustomerPhone: undefined,
              reservedTime: undefined,
              reservedGuestCount: undefined,
              reservedNote: undefined,
            }
          : t
      )
    );
    this.cdr.markForCheck();
  }

  // 4. Khách đặt đến nhận bàn (RESERVED -> OCCUPIED)
  checkInReservation(table: TableDto) {
    if (!table.id) return;
    this.tableReservationService
      .getActiveByTableId(table.id)
      .pipe(
        switchMap(res => {
          if (!res?.id) {
            return this.tableService
              .changeStatus(table.id!, TableStatus.Occupied)
              .pipe(map(updated => ({ type: 'table' as const, data: updated })));
          }
          return this.tableReservationService
            .checkIn(res.id)
            .pipe(map(checkedInDto => ({ type: 'reservation' as const, data: checkedInDto })));
        })
      )
      .subscribe({
        next: result => {
          if (result.type === 'table') {
            this.updateLocalTable(result.data as TableDto);
          } else {
            this.onReservationCheckedIn(result.data as TableReservationDto);
          }
          this.toaster.success(
            this.localizationService.instant('::CheckInSuccess', table.name || '')
          );
        },
        error: err => this.handleError(err),
      });
  }

  // 5. Hủy đặt bàn (RESERVED -> AVAILABLE)
  cancelReservation(table: TableDto) {
    if (!table.id) return;
    this.confirmation
      .warn(
        this.localizationService.instant('::CancelReservationConfirmMessage', table.name || ''),
        this.localizationService.instant('::CancelReservationConfirmTitle')
      )
      .pipe(
        filter((status: Confirmation.Status) => status === Confirmation.Status.confirm),
        switchMap(() => this.tableReservationService.getActiveByTableId(table.id!)),
        switchMap(res => {
          if (!res?.id) {
            return this.tableService
              .changeStatus(table.id!, TableStatus.Available)
              .pipe(map(updated => ({ type: 'table' as const, data: updated })));
          }
          return this.tableReservationService
            .cancel(res.id)
            .pipe(map(cancelledDto => ({ type: 'reservation' as const, data: cancelledDto })));
        })
      )
      .subscribe({
        next: result => {
          if (result.type === 'table') {
            this.updateLocalTable(result.data as TableDto);
          } else {
            this.onReservationCancelled(result.data as TableReservationDto);
          }
          this.toaster.success(
            this.localizationService.instant('::CancelReservationSuccess', table.name || '')
          );
        },
        error: err => this.handleError(err),
      });
  }

  // 6. Vô hiệu hóa bàn (AVAILABLE -> DISABLED)
  disableTable(table: TableDto) {
    if (!table.id) return;
    this.confirmation
      .warn(
        this.localizationService.instant('::DisableTableConfirmMessage', table.name || ''),
        this.localizationService.instant('::DisableTableConfirmTitle')
      )
      .pipe(
        filter((status: Confirmation.Status) => status === Confirmation.Status.confirm),
        switchMap(() => this.tableService.changeStatus(table.id!, TableStatus.Disabled))
      )
      .subscribe({
        next: updated => {
          this.updateLocalTable(updated);
          this.toaster.success(
            this.localizationService.instant('::DisableTableSuccess', table.name || '')
          );
        },
        error: err => {
          this.handleError(err);
        },
      });
  }

  // 6. Kích hoạt bàn (DISABLED -> AVAILABLE)
  enableTable(table: TableDto) {
    if (!table.id) return;
    this.tableService.changeStatus(table.id, TableStatus.Available).subscribe({
      next: updated => {
        this.updateLocalTable(updated);
        this.toaster.success(
          this.localizationService.instant('::EnableTableSuccess', table.name || '')
        );
      },
      error: err => {
        this.handleError(err);
      },
    });
  }

  // 7. Dọn dẹp xong (CLEANING -> AVAILABLE)
  finishCleaning(table: TableDto) {
    if (!table.id) return;
    this.tableService.changeStatus(table.id, TableStatus.Available).subscribe({
      next: updated => {
        this.updateLocalTable(updated);
        this.toaster.success(
          this.localizationService.instant('::FinishCleaningSuccess', table.name || '')
        );
      },
      error: err => {
        this.handleError(err);
      },
    });
  }

  // 8. Chuyển sang Order (OCCUPIED)
  goToOrder(table: TableDto) {
    if (!table.id) return;
    this.router.navigate(['/waiter/order', table.id]);
  }

  // 9. Thao tác thẻ bàn RM-017 (OCCUPIED)
  openTransferModal(table: TableDto) {
    if (!table.id) return;
    this.selectedTransferTable = table;
    this.isTransferModalOpen = true;
    this.cdr.markForCheck();
  }

  onTableTransferred(event: { sourceTable: TableDto; targetTable: TableDto }) {
    this.loadData();
  }

  openMergeModal(table: TableDto) {
    if (!table.id) return;
    this.selectedPrimaryMergeTable = table;
    this.isMergeModalOpen = true;
    this.cdr.markForCheck();
  }

  onTablesMerged(event: { primaryTable: TableDto; secondaryTable: TableDto }) {
    this.loadData();
  }

  endMeal(table: TableDto) {
    if (!table.id) return;
    this.selectedEndMealTable = table;
    this.isEndMealModalOpen = true;
    this.cdr.markForCheck();
  }

  onMealEnded(event: { table: TableDto; action: 'freed' | 'payment'; orderId?: string }) {
    if (event.action === 'freed') {
      this.updateLocalTable(event.table);
    } else {
      this.loadData();
    }
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

  // Helper cập nhật local list mượt mà
  private updateLocalTable(updated: TableDto) {
    this.tables.update(list =>
      list.map(t => (t.id === updated.id ? { ...t, ...updated } : t))
    );
    this.cdr.markForCheck();
  }

  private handleError(err: any) {
    const msg =
      err?.error?.message ||
      err?.message ||
      this.localizationService.instant('::ActionFailedError');
    this.toaster.error(msg);
    // Reload lại để đồng bộ state mới nhất khi có xung đột đồng thời
    this.loadData();
  }

  getStatusClass(status?: TableStatus): string {
    const s = status ?? TableStatus.Available;
    return (TableStatus[s] || 'available').toLowerCase();
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

  getStatusIcon(status?: TableStatus): string {
    const s = status ?? TableStatus.Available;
    switch (s) {
      case TableStatus.Available:
        return 'fa-check-circle';
      case TableStatus.Occupied:
        return 'fa-utensils';
      case TableStatus.Reserved:
        return 'fa-calendar-check';
      case TableStatus.Cleaning:
        return 'fa-broom';
      case TableStatus.Disabled:
        return 'fa-ban';
      default:
        return 'fa-circle-question';
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

  // --- HELPER FORMAT THỜI GIAN DÙNG BỮA ---
  getMealDuration(occupiedTime?: string | null, targetTime?: Date | null): string {
    if (!occupiedTime) return '';
    const start = new Date(occupiedTime).getTime();
    if (isNaN(start)) return '';
    const end = (targetTime || this.currentTime()).getTime();
    const diffMs = Math.max(0, end - start);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return this.localizationService.instant('::JustSeated') || 'Vừa nhận bàn';
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours === 0) {
      const minUnit = this.localizationService.instant('::MinutesShort') || 'phút';
      return `${diffMins} ${minUnit}`;
    }

    const template = this.localizationService.instant('::HoursAndMinutes', hours.toString(), mins.toString());
    if (template && !template.includes('::')) {
      return template;
    }
    const hrUnit = this.localizationService.instant('::HoursShort') || 'giờ';
    const minUnit = this.localizationService.instant('::MinutesShort') || 'phút';
    return `${hours} ${hrUnit} ${mins} ${minUnit}`;
  }

  getMealDurationMinutes(occupiedTime?: string | null, targetTime?: Date | null): number {
    if (!occupiedTime) return 0;
    const start = new Date(occupiedTime).getTime();
    if (isNaN(start)) return 0;
    const end = (targetTime || this.currentTime()).getTime();
    return Math.max(0, Math.floor((end - start) / 60000));
  }

  getActionLabel(action: string, hasActiveOrder: boolean = false): string {
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
}
