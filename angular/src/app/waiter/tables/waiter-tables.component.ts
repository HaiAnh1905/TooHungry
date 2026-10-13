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
import { Subscription } from 'rxjs';
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

  // Confirm End Meal Modal (2 cases)
  isEndMealModalOpen = false;
  isEndingMeal = false;
  endingMealTable: TableDto | null = null;
  endingMealHasOrder = false;
  endingMealOrderId: string | null = null;

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
              ...(isCleared
                ? {
                    reservedCustomerName: undefined,
                    reservedCustomerPhone: undefined,
                    reservedTime: undefined,
                    reservedGuestCount: undefined,
                    reservedNote: undefined,
                    hasActiveOrder: false,
                    activeOrderId: undefined,
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
    this.tableReservationService.getActiveByTableId(table.id).subscribe({
      next: res => {
        if (!res?.id) {
          this.tableService.changeStatus(table.id!, TableStatus.Occupied).subscribe({
            next: updated => {
              this.updateLocalTable(updated);
              this.toaster.success(
                this.localizationService.instant('::CheckInSuccess', table.name || '')
              );
            },
            error: err => this.handleError(err),
          });
          return;
        }

        this.tableReservationService.checkIn(res.id).subscribe({
          next: checkedInDto => {
            this.onReservationCheckedIn(checkedInDto);
            this.toaster.success(
              this.localizationService.instant('::CheckInSuccess', table.name || '')
            );
          },
          error: err => this.handleError(err),
        });
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
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.tableReservationService.getActiveByTableId(table.id!).subscribe({
            next: res => {
              if (!res?.id) {
                this.tableService.changeStatus(table.id!, TableStatus.Available).subscribe({
                  next: updated => {
                    this.updateLocalTable(updated);
                    this.toaster.success(
                      this.localizationService.instant('::CancelReservationSuccess', table.name || '')
                    );
                  },
                  error: err => this.handleError(err),
                });
                return;
              }

              this.tableReservationService.cancel(res.id).subscribe({
                next: cancelledDto => {
                  this.onReservationCancelled(cancelledDto);
                  this.toaster.success(
                    this.localizationService.instant('::CancelReservationSuccess', table.name || '')
                  );
                },
                error: err => this.handleError(err),
              });
            },
            error: err => this.handleError(err),
          });
        }
      });
  }

  // 5. Vô hiệu hóa bàn (AVAILABLE -> DISABLED)
  disableTable(table: TableDto) {
    if (!table.id) return;
    this.confirmation
      .warn(
        this.localizationService.instant('::DisableTableConfirmMessage', table.name || ''),
        this.localizationService.instant('::DisableTableConfirmTitle')
      )
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.tableService.changeStatus(table.id!, TableStatus.Disabled).subscribe({
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

  // 9. Kết thúc bữa ăn 2 nhánh (OCCUPIED)
  endMeal(table: TableDto) {
    if (!table.id) return;
    this.endingMealTable = table;
    this.isEndingMeal = true;

    // Kiểm tra xem bàn có đơn hàng đang hoạt động không
    if (table.hasActiveOrder && table.activeOrderId) {
      this.endingMealHasOrder = true;
      this.endingMealOrderId = table.activeOrderId;
      this.isEndingMeal = false;
      this.isEndMealModalOpen = true;
      this.cdr.markForCheck();
      return;
    }

    // Nếu chưa chắc chắn, tra cứu từ OrderAppService
    this.orderService.getActiveOrderByTableId(table.id).subscribe({
      next: activeOrder => {
        this.isEndingMeal = false;
        if (activeOrder && activeOrder.id) {
          this.endingMealHasOrder = true;
          this.endingMealOrderId = activeOrder.id;
        } else {
          this.endingMealHasOrder = false;
          this.endingMealOrderId = null;
        }
        this.isEndMealModalOpen = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isEndingMeal = false;
        this.endingMealHasOrder = false;
        this.endingMealOrderId = null;
        this.isEndMealModalOpen = true;
        this.cdr.markForCheck();
      },
    });
  }

  closeEndMealModal() {
    this.isEndMealModalOpen = false;
    this.endingMealTable = null;
    this.endingMealOrderId = null;
    this.cdr.markForCheck();
  }

  confirmEndMeal() {
    if (!this.endingMealTable || !this.endingMealTable.id) return;

    if (this.endingMealHasOrder && this.endingMealOrderId) {
      // Nhánh 2: Có order -> Điều hướng sang /payment/:orderId
      const orderId = this.endingMealOrderId;
      this.closeEndMealModal();
      this.router.navigate(['/payment', orderId]);
    } else {
      // Nhánh 1: Không có order -> Giải phóng bàn về Available
      const tableId = this.endingMealTable.id;
      const tableName = this.endingMealTable.name || '';
      this.closeEndMealModal();

      this.tableService.changeStatus(tableId, TableStatus.Available).subscribe({
        next: updated => {
          this.updateLocalTable(updated);
          this.toaster.success(
            this.localizationService.instant('::FreeTableSuccess', tableName)
          );
        },
        error: err => {
          this.handleError(err);
        },
      });
    }
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
}
