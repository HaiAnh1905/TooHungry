import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService, ConfirmationService, Confirmation } from '@abp/ng.theme.shared';
import { OrderService } from '../proxy/orders/order.service';
import { OrderDto, CreateUpdateOrderDto } from '../proxy/orders/models';
import { OrderStatus } from '../proxy/orders/order-status.enum';
import { TableService } from '../proxy/tables/table.service';
import { TableStatus } from '../proxy/tables/table-status.enum';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly tableService = inject(TableService);
  private readonly toaster = inject(ToasterService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly localizationService = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  orderId: string | null = null;
  isLoading = signal<boolean>(true);
  isProcessingPayment = signal<boolean>(false);
  order = signal<OrderDto | null>(null);

  paymentMethod = signal<'qr' | 'cash'>('qr');
  cashGiven = signal<number | null>(null);
  isQrLoaded = signal<boolean>(false);
  copiedField = signal<string | null>(null);

  OrderStatus = OrderStatus;

  isCompleted = computed(() => {
    return this.order()?.status === OrderStatus.Completed;
  });

  effectiveTotalAmount = computed(() => {
    const ord = this.order();
    if (!ord) return 0;
    if (ord.totalAmount && ord.totalAmount > 0) return ord.totalAmount;
    if (ord.items && ord.items.length > 0) {
      return ord.items.reduce(
        (sum, i) => sum + (i.totalPrice || ((i.quantity || 0) * (i.unitPrice || 0))),
        0
      );
    }
    return 0;
  });

  changeAmount = computed(() => {
    const total = this.effectiveTotalAmount();
    const given = this.cashGiven() || 0;
    return Math.max(0, given - total);
  });

  vietQrUrl = computed(() => {
    const ord = this.order();
    if (!ord) return '';
    const amount = this.effectiveTotalAmount();
    const memo = `TOOHUNGRY ${ord.orderNumber || ''}`.trim();
    return `https://api.vietqr.io/image/970422-9999888866-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=NHA%20HANG%20TOOHUNGRY`;
  });

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId');
    if (this.orderId) {
      this.fetchOrder(this.orderId);
    } else {
      this.toaster.error('Không tìm thấy mã đơn hàng cần thanh toán!');
      this.router.navigate(['/tables']);
    }
  }

  fetchOrder(id: string): void {
    this.isLoading.set(true);
    this.orderService.get(id).subscribe({
      next: (res) => {
        if (res) {
          if (res.items && res.items.length > 0) {
            res.items = res.items.map(item => ({
              ...item,
              totalPrice: item.totalPrice || ((item.quantity || 0) * (item.unitPrice || 0)),
            }));
            if (!res.totalAmount || res.totalAmount === 0) {
              res.totalAmount = res.items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
            }
          }
        }
        this.order.set(res);
        if (res?.totalAmount) {
          this.cashGiven.set(res.totalAmount);
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('Không thể tải thông tin đơn hàng!');
        this.isLoading.set(false);
        this.router.navigate(['/tables']);
        this.cdr.markForCheck();
      },
    });
  }

  setPaymentMethod(method: 'qr' | 'cash'): void {
    if (this.isCompleted()) return;
    this.paymentMethod.set(method);
  }

  setQuickCash(amount: number): void {
    if (this.isCompleted()) return;
    this.cashGiven.set(amount);
  }

  setExactCash(): void {
    if (this.isCompleted()) return;
    this.cashGiven.set(this.order()?.totalAmount || 0);
  }

  copyToClipboard(text: string, field: string): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedField.set(field);
        setTimeout(() => {
          this.copiedField.set(null);
          this.cdr.markForCheck();
        }, 2000);
        this.cdr.markForCheck();
      });
    }
  }

  onConfirmPayment(): void {
    const currentOrder = this.order();
    if (!currentOrder || !currentOrder.id) return;
    if (this.isCompleted()) {
      this.toaster.warn('Đơn hàng này đã thanh toán hoàn tất!');
      return;
    }

    if (this.paymentMethod() === 'cash') {
      const given = this.cashGiven() || 0;
      const total = this.effectiveTotalAmount();
      if (given < total) {
        this.toaster.error('Số tiền khách đưa không đủ để thanh toán!');
        return;
      }
    }

    const title = this.localizationService.instant('::ConfirmPayment');
    const totalAmountVal = this.effectiveTotalAmount();
    const promptMsg = `Xác nhận thanh toán cho đơn ${currentOrder.orderNumber || ''} với số tiền ${totalAmountVal.toLocaleString('vi-VN')} đ?`;

    this.confirmation.info(promptMsg, title).subscribe((status: Confirmation.Status) => {
      if (status === Confirmation.Status.confirm) {
        this.executePayment(currentOrder);
      }
    });
  }

  private executePayment(currentOrder: OrderDto): void {
    this.isProcessingPayment.set(true);

    const updateInput: CreateUpdateOrderDto = {
      orderNumber: currentOrder.orderNumber,
      orderDate: currentOrder.orderDate,
      status: OrderStatus.Completed,
      totalAmount: this.effectiveTotalAmount(),
      note: currentOrder.note,
      tableId: currentOrder.tableId,
      items: currentOrder.items?.map(i => ({
        dishId: i.dishId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })) || [],
    };

    this.orderService.update(currentOrder.id!, updateInput).subscribe({
      next: (updatedOrder) => {
        this.order.set(updatedOrder);
        this.isProcessingPayment.set(false);
        this.toaster.success(
          'Thanh toán thành công! Đơn hàng đã hoàn tất, đã tự động tính tiêu hao và khấu trừ nguyên liệu theo FEFO.',
          'Hoàn tất đơn hàng'
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.isProcessingPayment.set(false);
        this.toaster.error('Có lỗi xảy ra trong quá trình xử lý thanh toán!');
        this.cdr.markForCheck();
      },
    });
  }

  onPrintReceipt(): void {
    window.print();
  }

  onBackToTables(): void {
    this.router.navigate(['/tables']);
  }
}
