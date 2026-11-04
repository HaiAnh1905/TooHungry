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
import { FormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { OrderDto } from '../../../proxy/orders/models';
import { OrderService } from '../../../proxy/orders/order.service';
import { CashierTableCard } from '../../models/cashier.models';
import { CashierStateService } from '../../services/cashier-state.service';
import { FixMojibakePipe } from '../../../shared/pipes/fix-mojibake.pipe';

@Component({
  selector: 'app-cashier-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule, FixMojibakePipe],
  templateUrl: './cashier-payment-modal.component.html',
  styleUrls: ['./cashier-payment-modal.component.scss'],
})
export class CashierPaymentModalComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly state = inject(CashierStateService);
  private readonly toaster = inject(ToasterService);
  private readonly localization = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) orderId!: string;
  @Input() table: CashierTableCard | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<void>();

  readonly order = signal<OrderDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Form Fields
  readonly paymentMethod = signal<'Cash' | 'VietQr'>('Cash');
  readonly cashGiven = signal<number>(0);
  readonly discountAmount = signal<number>(0);
  readonly discountNote = signal<string>('');
  readonly paymentNote = signal<string>('');
  readonly printInvoice = signal<boolean>(true);

  // Pre-set cash quick buttons
  readonly quickCashAmounts = [50000, 100000, 200000, 500000, 1000000];

  // Computations
  readonly finalTotal = computed(() => {
    const o = this.order();
    if (!o) return 0;
    const baseTotal = o.totalAmount || 0;
    const disc = this.discountAmount() || 0;
    return Math.max(0, baseTotal - disc);
  });

  readonly changeAmount = computed(() => {
    if (this.paymentMethod() !== 'Cash') return 0;
    const given = this.cashGiven() || 0;
    const total = this.finalTotal();
    return Math.max(0, given - total);
  });

  readonly isCashShortage = computed(() => {
    if (this.paymentMethod() !== 'Cash') return false;
    const given = this.cashGiven() || 0;
    const total = this.finalTotal();
    return given < total;
  });

  ngOnInit(): void {
    this.loadOrderDetails();
  }

  loadOrderDetails(): void {
    this.isLoading.set(true);
    this.orderService.get(this.orderId).subscribe({
      next: res => {
        this.order.set(res);
        this.cashGiven.set(res.totalAmount || 0);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.isLoading.set(false);
        this.toaster.error(err.error?.error?.message || this.localization.instant('::CannotLoadOrder'));
        this.close();
      },
    });
  }

  setCashAmount(amount: number): void {
    this.cashGiven.set(amount);
  }

  setExactAmount(): void {
    this.cashGiven.set(this.finalTotal());
  }

  confirmPayment(): void {
    if (this.paymentMethod() === 'Cash' && this.isCashShortage()) {
      this.toaster.warn(this.localization.instant('::CashShortage'));
      return;
    }

    this.isSubmitting.set(true);
    const body = {
      paymentMethod: this.paymentMethod() === 'Cash' ? 1 : 2, // 1: Cash, 2: VietQr
      cashGiven: this.paymentMethod() === 'Cash' ? this.cashGiven() : this.finalTotal(),
      discountAmount: this.discountAmount(),
      discountNote: this.discountNote().trim() || null,
      paymentNote: this.paymentNote().trim() || (this.paymentMethod() === 'Cash' ? 'Tiền mặt' : 'VietQR'),
      printInvoice: this.printInvoice(),
    };

    this.state.completeAndPay(this.orderId, body).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toaster.success(this.localization.instant('::PaymentSuccessMessage'));
        if (this.printInvoice()) {
          this.triggerPrint();
        }
        this.paymentSuccess.emit();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.toaster.error(err.error?.error?.message || this.localization.instant('::ActionFailedError'));
        this.cdr.markForCheck();
      },
    });
  }

  triggerPrint(): void {
    const orderNumber = this.order()?.orderNumber || '';
    const codeDisplay = orderNumber ? `#${orderNumber}` : (this.table?.tableNumber || '');
    const successTemplate = this.localization.instant('::PrintBillSuccess', codeDisplay);
    const successMsg = successTemplate || `In hóa đơn thành công! (${codeDisplay})`;
    const successTitle = this.localization.instant('::PrintSuccess') || 'In hóa đơn';
    this.toaster.success(successMsg, successTitle);
  }

  close(): void {
    this.closed.emit();
  }
}
