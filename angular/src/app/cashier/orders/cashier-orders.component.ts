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
import { RouterModule, Router } from '@angular/router';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { OrderDto } from '../../proxy/orders/models';
import { OrderStatus } from '../../proxy/orders/order-status.enum';
import { CashierStateService } from '../services/cashier-state.service';
import { CashierOrderStatusGroup, CashierTableCard } from '../models/cashier.models';
import { CashierPaymentModalComponent } from '../modals/cashier-payment-modal/cashier-payment-modal.component';
import { CashierOrderDetailModalComponent } from '../modals/cashier-order-detail-modal/cashier-order-detail-modal.component';
import { FixMojibakePipe, fixVietnameseMojibake } from '../../shared/pipes/fix-mojibake.pipe';

@Component({
  selector: 'app-cashier-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
    CashierPaymentModalComponent,
    CashierOrderDetailModalComponent,
    FixMojibakePipe,
  ],
  templateUrl: './cashier-orders.component.html',
  styleUrls: ['./cashier-orders.component.scss'],
})
export class CashierOrdersComponent implements OnInit {
  readonly state = inject(CashierStateService);
  private readonly toaster = inject(ToasterService);
  private readonly localization = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  readonly OrderStatus = OrderStatus;

  // Selected Status Tab
  readonly activeTab = signal<CashierOrderStatusGroup>('All');
  readonly searchQuery = signal<string>('');
  readonly isReloading = signal<boolean>(false);

  // Modals
  readonly isPaymentModalOpen = signal<boolean>(false);
  readonly paymentOrderId = signal<string | null>(null);
  readonly paymentTable = signal<CashierTableCard | null>(null);

  readonly isOrderDetailModalOpen = signal<boolean>(false);
  readonly selectedOrderTable = signal<CashierTableCard | null>(null);
  readonly selectedOrderDetail = signal<OrderDto | null>(null);

  // Tabs definition
  readonly tabs: { key: CashierOrderStatusGroup; labelKey: string; icon: string }[] = [
    { key: 'All', labelKey: '::AllOrdersTab', icon: 'fa-list-check' },
    { key: 'Pending', labelKey: '::OrderStatusPending', icon: 'fa-inbox' },
    { key: 'Processing', labelKey: '::OrderStatusProcessing', icon: 'fa-fire-burner' },
    { key: 'BillRequested', labelKey: '::OrderStatusBillRequested', icon: 'fa-bell' },
    { key: 'Completed', labelKey: '::OrderStatusCompletedShort', icon: 'fa-circle-check' },
  ];

  ngOnInit(): void {
    this.reloadOrders();
  }

  selectTab(tab: CashierOrderStatusGroup): void {
    this.activeTab.set(tab);
    this.reloadOrders();
  }

  /**
   * T018B: Trang bị nút Reload Danh sách Đơn hàng tại chỗ ([fa-rotate] Tải lại)
   * Cập nhật tức thì các đơn hàng mới mà không làm mới trang web.
   */
  reloadOrders(): void {
    this.isReloading.set(true);
    const status = this.activeTab() === 'All' ? undefined : this.activeTab();
    this.state
      .loadOrders({
        statusGroup: status,
        searchKeyword: this.searchQuery().trim() || undefined,
        maxResultCount: 50,
        skipCount: 0,
      })
      .subscribe({
        next: () => {
          this.isReloading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isReloading.set(false);
          this.toaster.error(this.localization.instant('::ActionFailedError'));
          this.cdr.markForCheck();
        },
      });
  }

  openPaymentModal(order: OrderDto): void {
    if (!order.id) return;
    this.router.navigate(['/payment', order.id], {
      queryParams: { returnUrl: '/cashier/orders' },
    });
  }

  openOrderDetailModal(order: OrderDto): void {
    this.selectedOrderDetail.set(order);
    this.selectedOrderTable.set({
      id: order.tableId || '',
      tableNumber: order.tableName || 'Bàn',
      capacity: 4,
      status: 1 as any,
      diningAreaName: '',
      activeOrderId: order.id,
      activeOrderCode: order.orderNumber,
      temporaryTotalAmount: order.totalAmount ?? 0,
      isBillRequested: false,
    });
    this.isOrderDetailModalOpen.set(true);
  }

  onModalRequestPayment(table: CashierTableCard): void {
    this.isOrderDetailModalOpen.set(false);
    if (!table.activeOrderId) return;
    this.router.navigate(['/payment', table.activeOrderId], {
      queryParams: { returnUrl: '/cashier/orders' },
    });
  }

  onPaymentSuccess(): void {
    this.isPaymentModalOpen.set(false);
    this.paymentOrderId.set(null);
    this.paymentTable.set(null);
    this.reloadOrders();
    this.state.loadShiftSummary().subscribe();
  }

  isBillRequestedOrder(order: OrderDto): boolean {
    if (!order.note) return false;
    if (order.status !== OrderStatus.Pending && order.status !== OrderStatus.Processing) {
      return false;
    }
    const cleanNote = fixVietnameseMojibake(order.note);
    return cleanNote.includes('[Yêu cầu tính tiền]') || order.note.includes('[Yêu cầu tính tiền]');
  }

  getStatusBadgeClass(status?: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'badge-pending';
      case OrderStatus.Processing:
        return 'badge-processing';
      case OrderStatus.Completed:
        return 'badge-completed';
      case OrderStatus.Cancelled:
        return 'badge-cancelled';
      default:
        return 'badge-secondary';
    }
  }
}
