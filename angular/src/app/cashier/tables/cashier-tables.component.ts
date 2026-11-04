import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { TableStatus } from '../../proxy/tables/table-status.enum';
import { TableService } from '../../proxy/tables/table.service';
import { TableDto } from '../../proxy/tables/models';
import { DiningAreaService } from '../../proxy/dining-areas/dining-area.service';
import { DiningAreaDto } from '../../proxy/dining-areas/models';
import { CashierStateService } from '../services/cashier-state.service';
import { CashierTableCard } from '../models/cashier.models';
import { TableStatusPipe } from '../../shared/pipes/table-status.pipe';
import { CashierPaymentModalComponent } from '../modals/cashier-payment-modal/cashier-payment-modal.component';
import { CashierOrderDetailModalComponent } from '../modals/cashier-order-detail-modal/cashier-order-detail-modal.component';
import { TableReservationService } from '../../proxy/reservations/table-reservation.service';
import { TableReservationDto } from '../../proxy/reservations/models';
import { TableReservationModalComponent } from '../../waiter/reservation-modal/table-reservation-modal.component';
import { TableReservationDetailModalComponent } from '../../waiter/reservation-modal/table-reservation-detail-modal.component';
import { TableTransferModalComponent } from '../../shared/components/tables/table-transfer-modal.component';
import { TableMergeModalComponent } from '../../shared/components/tables/table-merge-modal.component';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';

export interface AreaFilterItem {
  id: string | null;
  name: string;
}

@Component({
  selector: 'app-cashier-tables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
    TableStatusPipe,
    CashierPaymentModalComponent,
    CashierOrderDetailModalComponent,
    TableReservationModalComponent,
    TableReservationDetailModalComponent,
    TableTransferModalComponent,
    TableMergeModalComponent,
    CustomSelectComponent,
  ],
  templateUrl: './cashier-tables.component.html',
  styleUrls: ['./cashier-tables.component.scss'],
})
export class CashierTablesComponent implements OnInit {
  readonly state = inject(CashierStateService);
  private readonly tableService = inject(TableService);
  private readonly diningAreaService = inject(DiningAreaService);
  private readonly tableReservationService = inject(TableReservationService);
  private readonly toaster = inject(ToasterService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly localization = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly TableStatus = TableStatus;
  readonly focusedTableId = signal<string | null>(null);

  // Filters State
  readonly selectedAreaId = signal<string | null>(null);
  readonly selectedStatus = signal<TableStatus | null>(null);
  readonly searchQuery = signal<string>('');
  readonly isReloading = signal<boolean>(false);

  // Dining Areas State
  readonly diningAreas = signal<DiningAreaDto[]>([]);

  readonly areaOptions = computed<CustomSelectOption<string | null>[]>(() => [
    {
      value: null,
      label: '::AllDiningAreas',
      icon: 'fa-border-all',
    },
    ...this.diningAreas().map(area => ({
      value: area.id || null,
      label: area.name || '',
      icon: 'fa-layer-group',
    })),
  ]);

  // Modals State
  readonly isPaymentModalOpen = signal<boolean>(false);
  readonly paymentOrderId = signal<string | null>(null);
  readonly paymentTable = signal<CashierTableCard | null>(null);

  readonly isOrderDetailModalOpen = signal<boolean>(false);
  readonly detailTable = signal<CashierTableCard | null>(null);

  // Reservation Modals State (RM-009)
  isReservationModalOpen = false;
  reservingTable: TableDto | null = null;

  isReservationDetailModalOpen = false;
  selectedReservedTable: TableDto | null = null;

  // Table Ops Modals State (RM-017)
  isTransferModalOpen = false;
  selectedTransferTable: TableDto | null = null;

  isMergeModalOpen = false;
  selectedPrimaryMergeTable: TableDto | null = null;

  readonly allTablesAsDto = computed(() =>
    this.state.tables().map(t => this.asTableDto(t))
  );

  // Computed Filtered Tables
  readonly filteredTables = computed(() => {
    let list = this.state.tables();
    const areaId = this.selectedAreaId();
    const status = this.selectedStatus();
    const query = this.searchQuery().trim().toLowerCase();

    if (areaId) {
      list = list.filter(t => t.diningAreaId === areaId);
    }

    if (status !== null) {
      list = list.filter(t => t.status === status);
    }

    if (query) {
      list = list.filter(t =>
        t.tableNumber.toLowerCase().includes(query) ||
        (t.activeOrderCode && t.activeOrderCode.toLowerCase().includes(query)) ||
        (t.diningAreaName && t.diningAreaName.toLowerCase().includes(query))
      );
    }

    return list;
  });

  // Table counts by status
  readonly availableCount = computed(() => this.state.tables().filter(t => t.status === TableStatus.Available).length);
  readonly occupiedCount = computed(() => this.state.tables().filter(t => t.status === TableStatus.Occupied).length);
  readonly reservedCount = computed(() => this.state.tables().filter(t => t.status === TableStatus.Reserved).length);
  readonly cleaningCount = computed(() => this.state.tables().filter(t => t.status === TableStatus.Cleaning).length);
  readonly disabledCount = computed(() => this.state.tables().filter(t => t.status === TableStatus.Disabled).length);

  ngOnInit(): void {
    this.loadDiningAreas();
    this.reloadTables();

    this.route.queryParams.subscribe(params => {
      const focusId = params['focusTableId'];
      if (focusId) {
        this.focusedTableId.set(focusId);
        // Scroll to table card after view updates
        setTimeout(() => {
          const el = document.getElementById(`table-card-${focusId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);

        setTimeout(() => {
          if (this.focusedTableId() === focusId) {
            this.focusedTableId.set(null);
          }
        }, 4000);

        // Dọn sạch query param khỏi URL để khi reload (F5) không bị highlight lại
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { focusTableId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  loadDiningAreas(): void {
    this.diningAreaService.getList({ maxResultCount: 100 }).subscribe({
      next: res => {
        this.diningAreas.set(res.items || []);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * T017B: Nút Reload Sơ đồ Bàn tại chỗ (In-place Fallback Refresh)
   * Tải lại tức thì dữ liệu bàn từ API mà không tải lại toàn bộ trang web (không F5),
   * bảo toàn bộ lọc khu vực và từ khóa tìm kiếm.
   */
  reloadTables(): void {
    this.isReloading.set(true);
    this.state.loadTables().subscribe({
      next: () => {
        this.isReloading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isReloading.set(false);
        this.toaster.error(err?.error?.error?.message || this.localization.instant('::ActionFailedError'));
        this.cdr.markForCheck();
      },
    });
  }

  // --- ACTIONS TRÊN THẺ BÀN ---

  // 1. Đón khách tại quầy (AVAILABLE -> OCCUPIED)
  seatGuestsAtCounter(table: CashierTableCard): void {
    this.tableService.changeStatus(table.id, TableStatus.Occupied).subscribe({
      next: () => {
        this.toaster.success(this.localization.instant('::SeatGuestsSuccess', table.tableNumber));
        this.reloadTables();
      },
      error: err => {
        this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
      },
    });
  }

  // 2. Mở chi tiết đơn / gọi món
  openOrderDetails(table: CashierTableCard): void {
    this.detailTable.set(table);
    this.isOrderDetailModalOpen.set(true);
  }

  // 3. Mở thanh toán nhanh
  openPayment(table: CashierTableCard): void {
    if (!table.activeOrderId) {
      this.toaster.warn(this.localization.instant('::NoActiveOrderToPay'));
      return;
    }
    this.router.navigate(['/payment', table.activeOrderId], {
      queryParams: { returnUrl: '/cashier/tables' },
    });
  }

  // 4. In Pre-bill tạm tính
  printPreBill(table: CashierTableCard): void {
    if (!table.activeOrderId) {
      this.toaster.warn(this.localization.instant('::NoActiveOrderToPay'));
      return;
    }
    // Mở chi tiết hoặc in phiếu
    this.detailTable.set(table);
    this.isOrderDetailModalOpen.set(true);
  }

  // 5. Hoàn tất dọn dẹp (CLEANING -> AVAILABLE)
  finishCleaning(table: CashierTableCard): void {
    this.tableService.changeStatus(table.id, TableStatus.Available).subscribe({
      next: () => {
        this.toaster.success(this.localization.instant('::FinishCleaningSuccess', table.tableNumber));
        this.reloadTables();
      },
      error: err => {
        this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
      },
    });
  }

  // 5b. Trả bàn trống (khi khách rời đi hoặc xếp nhầm mà chưa gọi món)
  freeTable(table: CashierTableCard): void {
    this.confirmation
      .warn(
        this.localization.instant('::FreeTableConfirmMessage', table.tableNumber),
        this.localization.instant('::FreeTableConfirmTitle')
      )
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.tableService.changeStatus(table.id, TableStatus.Available).subscribe({
            next: () => {
              this.toaster.success(this.localization.instant('::FreeTableSuccess', table.tableNumber));
              this.reloadTables();
            },
            error: err => {
              this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
            },
          });
        }
      });
  }

  // 6. Xử lý sau khi thanh toán thành công trong Modal
  onPaymentSuccess(): void {
    this.isPaymentModalOpen.set(false);
    this.paymentTable.set(null);
    this.paymentOrderId.set(null);
    this.reloadTables();
    this.state.loadShiftSummary().subscribe();
  }

  // Helpers
  asTableDto(card: CashierTableCard): TableDto {
    return {
      id: card.id,
      name: card.tableNumber,
      capacity: card.capacity,
      status: card.status,
      diningAreaId: card.diningAreaId,
      diningAreaName: card.diningAreaName,
      reservedCustomerName: card.reservedCustomerName,
      reservedCustomerPhone: card.reservedCustomerPhone,
      reservedTime: card.reservedTime,
      reservedGuestCount: card.reservedGuestCount,
      reservedNote: card.reservedNote,
      activeOrderId: card.activeOrderId,
      hasActiveOrder: !!card.activeOrderId,
    } as TableDto;
  }

  isTableBillRequested(table: CashierTableCard): boolean {
    return table.isBillRequested || this.state.billRequestedTableIds().has(table.id);
  }

  formatDuration(minutes?: number): string {
    if (minutes === undefined || minutes === null) return '';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  // --- THAO TÁC ĐẶT BÀN (RM-009) ---

  // Mở modal tạo Đặt bàn mới
  openReservationModal(table: CashierTableCard): void {
    this.reservingTable = this.asTableDto(table);
    this.isReservationModalOpen = true;
    this.cdr.markForCheck();
  }

  onReservationCreated(res: TableReservationDto): void {
    this.reloadTables();
  }

  // Mở modal Chi tiết / Sửa Đặt bàn
  openReservationDetailModal(table: CashierTableCard): void {
    this.selectedReservedTable = this.asTableDto(table);
    this.isReservationDetailModalOpen = true;
    this.cdr.markForCheck();
  }

  onReservationUpdated(res: TableReservationDto): void {
    this.reloadTables();
  }

  onReservationCheckedIn(res: TableReservationDto): void {
    this.reloadTables();
  }

  onReservationCancelled(res: TableReservationDto): void {
    this.reloadTables();
  }

  // Khách đặt bàn đến nhận bàn trực tiếp tại quầy (RESERVED -> OCCUPIED)
  checkInReservation(table: CashierTableCard): void {
    if (!table.id) return;
    this.tableReservationService.getActiveByTableId(table.id).subscribe({
      next: res => {
        if (!res?.id) {
          this.tableService.changeStatus(table.id, TableStatus.Occupied).subscribe({
            next: () => {
              this.toaster.success(this.localization.instant('::CheckInSuccess', table.tableNumber));
              this.reloadTables();
            },
            error: err => {
              this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
            },
          });
          return;
        }
        this.tableReservationService.checkIn(res.id).subscribe({
          next: () => {
            this.toaster.success(this.localization.instant('::CheckInSuccess', table.tableNumber));
            this.reloadTables();
          },
          error: err => {
            this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
          },
        });
      },
      error: err => {
        this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
      },
    });
  }

  // Hủy đặt bàn trực tiếp (RESERVED -> AVAILABLE)
  cancelReservation(table: CashierTableCard): void {
    if (!table.id) return;
    this.confirmation
      .warn(
        this.localization.instant('::CancelReservationConfirmMessage', table.tableNumber),
        this.localization.instant('::CancelReservationConfirmTitle')
      )
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.tableReservationService.getActiveByTableId(table.id).subscribe({
            next: res => {
              if (!res?.id) {
                this.tableService.changeStatus(table.id, TableStatus.Available).subscribe({
                  next: () => {
                    this.toaster.success(this.localization.instant('::CancelReservationSuccess', table.tableNumber));
                    this.reloadTables();
                  },
                  error: err => {
                    this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
                  },
                });
                return;
              }
              this.tableReservationService.cancel(res.id).subscribe({
                next: () => {
                  this.toaster.success(this.localization.instant('::CancelReservationSuccess', table.tableNumber));
                  this.reloadTables();
                },
                error: err => {
                  this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
                },
              });
            },
            error: err => {
              this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
            },
          });
        }
      });
  }

  // --- THAO TÁC BÀN ĂN: CHUYỂN BÀN & GỘP BÀN (RM-017) ---

  openTransferModal(table: CashierTableCard): void {
    this.selectedTransferTable = this.asTableDto(table);
    this.isTransferModalOpen = true;
    this.cdr.markForCheck();
  }

  onTableTransferred(event: { sourceTable: TableDto; targetTable: TableDto }): void {
    this.reloadTables();
  }

  openMergeModal(table: CashierTableCard): void {
    this.selectedPrimaryMergeTable = this.asTableDto(table);
    this.isMergeModalOpen = true;
    this.cdr.markForCheck();
  }

  onTablesMerged(event: { primaryTable: TableDto; secondaryTable: TableDto }): void {
    this.reloadTables();
  }
}
