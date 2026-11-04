import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { OrderDto } from '../../../proxy/orders/models';
import { OrderStatus } from '../../../proxy/orders/order-status.enum';
import { OrderService } from '../../../proxy/orders/order.service';
import { CashierTableCard } from '../../models/cashier.models';
import { CashierStateService } from '../../services/cashier-state.service';
import { ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';
import { FixMojibakePipe } from '../../../shared/pipes/fix-mojibake.pipe';

@Component({
  selector: 'app-cashier-order-detail-modal',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, ImgFallbackDirective, FixMojibakePipe],
  templateUrl: './cashier-order-detail-modal.component.html',
  styleUrls: ['./cashier-order-detail-modal.component.scss'],
})
export class CashierOrderDetailModalComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly state = inject(CashierStateService);
  private readonly toaster = inject(ToasterService);
  private readonly localization = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  @Input({ required: true }) table!: CashierTableCard;
  @Input() orderInput?: OrderDto;
  @Output() closed = new EventEmitter<void>();
  @Output() requestPayment = new EventEmitter<CashierTableCard>();

  readonly order = signal<OrderDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isPrinting = signal<boolean>(false);

  readonly totalItemsCount = computed(() => {
    const items = this.order()?.items || [];
    return items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  });

  readonly totalDishCount = computed(() => {
    return this.order()?.items?.length || 0;
  });

  readonly isPaid = computed(() => {
    return this.order()?.status === OrderStatus.Completed;
  });

  readonly orderStatusBadge = computed(() => {
    const status = this.order()?.status;
    switch (status) {
      case OrderStatus.Pending:
        return { labelKey: '::OrderStatusPending', class: 'status-pending', icon: 'fa-inbox' };
      case OrderStatus.Processing:
        return { labelKey: '::OrderStatusProcessing', class: 'status-processing', icon: 'fa-fire-burner' };
      case OrderStatus.Completed:
        return { labelKey: '::OrderStatusCompletedShort', class: 'status-completed', icon: 'fa-circle-check' };
      case OrderStatus.Cancelled:
        return { labelKey: '::OrderStatusCancelled', class: 'status-cancelled', icon: 'fa-ban' };
      default:
        return { labelKey: '::OrderStatusProcessing', class: 'status-processing', icon: 'fa-fire-burner' };
    }
  });

  readonly paymentMethodInfo = computed(() => {
    const note = this.order()?.note || '';
    if (note.includes('VietQr') || note.includes('VIETQR')) {
      return { type: 'VietQR', label: 'VietQR Napas 247', icon: 'fa-qrcode', color: 'badge-vietqr' };
    }
    if (note.includes('Tiền mặt') || note.includes('Cash') || note.includes('CASH')) {
      return { type: 'Cash', label: 'Tiền mặt', icon: 'fa-money-bill-wave', color: 'badge-cash' };
    }
    return null;
  });

  ngOnInit(): void {
    if (this.orderInput) {
      this.order.set(this.orderInput);
      this.isLoading.set(false);
    }
    this.loadOrder();
  }

  loadOrder(): void {
    const orderId = this.table.activeOrderId || this.orderInput?.id;
    if (!orderId) {
      // Tìm active order theo table id
      this.orderService.getActiveOrderByTableId(this.table.id).subscribe({
        next: res => {
          this.order.set(res);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
      return;
    }

    this.orderService.get(orderId).subscribe({
      next: res => {
        this.order.set(res);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  printBill(): void {
    if (this.isPrinting()) return;
    this.isPrinting.set(true);

    const orderNumber = this.order()?.orderNumber || this.table?.activeOrderCode || '';
    const codeDisplay = orderNumber ? `#${orderNumber}` : (this.table?.tableNumber || '');

    setTimeout(() => {
      this.isPrinting.set(false);
      const successTemplate = this.localization.instant('::PrintBillSuccess', codeDisplay);
      const successMsg = successTemplate || `In hóa đơn thành công! (${codeDisplay})`;
      const successTitle = this.localization.instant('::PrintSuccess') || 'In hóa đơn';
      this.toaster.success(successMsg, successTitle);
      this.cdr.markForCheck();
    }, 450);
  }

  proceedToPay(): void {
    const orderId = this.order()?.id || this.table?.activeOrderId || this.orderInput?.id;
    this.closed.emit();
    if (orderId) {
      this.router.navigate(['/payment', orderId], {
        queryParams: { returnUrl: this.router.url },
      });
    } else {
      this.requestPayment.emit(this.table);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
