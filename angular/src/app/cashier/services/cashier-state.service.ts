import { Injectable, inject, signal, computed } from '@angular/core';
import { RestService } from '@abp/ng.core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TableStatus } from '../../proxy/tables/table-status.enum';
import { OrderDto } from '../../proxy/orders/models';
import {
  CashierShiftSummary,
  CashierTableCard,
  GetCashierOrdersParams,
  OrderPlacedOrUpdatedDto,
  BillRequestedDto,
  PaymentCompletedDto,
  CashierNotificationItem,
} from '../models/cashier.models';
import { TableStatusChangedEvent } from '../../shared/services/table-signalr.service';

@Injectable({
  providedIn: 'root',
})
export class CashierStateService {
  private readonly restService = inject(RestService);

  // --- SIGNALS STATE ---
  public readonly shiftSummary = signal<CashierShiftSummary>({
    cashierName: 'Mai Thu Ngân',
    shiftStartTime: new Date().toISOString(),
    totalRevenue: 0,
    activeTableCount: 0,
    pendingOrderCount: 0,
    billRequestedCount: 0,
  });

  public readonly tables = signal<CashierTableCard[]>([]);
  public readonly orders = signal<OrderDto[]>([]);
  public readonly totalOrdersCount = signal<number>(0);

  // Danh sách thông báo realtime (nhận bàn, gọi món, yêu cầu tính tiền, thanh toán)
  public readonly notifications = signal<CashierNotificationItem[]>([]);
  public readonly unreadNotificationCount = computed(
    () => this.notifications().filter(n => !n.read).length
  );
  public readonly hasNewAlert = signal<boolean>(false);

  public readonly isLoadingShift = signal<boolean>(false);
  public readonly isLoadingTables = signal<boolean>(false);
  public readonly isLoadingOrders = signal<boolean>(false);

  // Set chứa các tableId đang có yêu cầu thanh toán (nhấp nháy viền đỏ)
  public readonly billRequestedTableIds = signal<Set<string>>(new Set<string>());

  // Computed badges
  public readonly pendingOrderCount = computed(() => this.shiftSummary().pendingOrderCount);
  public readonly billRequestedCount = computed(() => this.shiftSummary().billRequestedCount);
  public readonly totalRevenue = computed(() => this.shiftSummary().totalRevenue);
  public readonly activeTableCount = computed(() => this.shiftSummary().activeTableCount);

  // --- NOTIFICATION MANAGEMENT ---
  public addNotification(item: Omit<CashierNotificationItem, 'id' | 'timestamp' | 'read'>): void {
    const newItem: CashierNotificationItem = {
      ...item,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date(),
      read: false,
    };

    this.notifications.update(list => [newItem, ...list.slice(0, 49)]); // Lưu tối đa 50 thông báo gần nhất
    this.hasNewAlert.set(true);
    setTimeout(() => this.hasNewAlert.set(false), 3000);
  }

  public markNotificationAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }

  public markAllNotificationsAsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  public clearAllNotifications(): void {
    this.notifications.set([]);
  }

  // --- API CALLS ---

  public loadShiftSummary(): Observable<CashierShiftSummary> {
    this.isLoadingShift.set(true);
    return this.restService
      .request<any, CashierShiftSummary>({
        method: 'GET',
        url: '/api/app/cashier/shift-summary',
      })
      .pipe(
        tap({
          next: summary => {
            this.shiftSummary.set(summary);
            this.isLoadingShift.set(false);
          },
          error: () => this.isLoadingShift.set(false),
        })
      );
  }

  public loadTables(params?: { diningAreaId?: string; status?: number; searchKeyword?: string }): Observable<{ items: CashierTableCard[] }> {
    this.isLoadingTables.set(true);
    return this.restService
      .request<any, { items: CashierTableCard[] }>({
        method: 'GET',
        url: '/api/app/cashier/tables',
        params: params || {},
      })
      .pipe(
        tap({
          next: res => {
            const list = res.items || [];
            this.tables.set(list);

            // Cập nhật lại danh sách bàn đang yêu cầu bill
            const billReqSet = new Set<string>();
            for (const t of list) {
              if (t.isBillRequested) {
                billReqSet.add(t.id);
              }
            }
            this.billRequestedTableIds.set(billReqSet);
            this.isLoadingTables.set(false);
          },
          error: () => this.isLoadingTables.set(false),
        })
      );
  }

  public loadOrders(params?: GetCashierOrdersParams): Observable<{ totalCount: number; items: OrderDto[] }> {
    this.isLoadingOrders.set(true);
    return this.restService
      .request<any, { totalCount: number; items: OrderDto[] }>({
        method: 'GET',
        url: '/api/app/cashier/orders',
        params: params || {},
      })
      .pipe(
        tap({
          next: res => {
            this.orders.set(res.items || []);
            this.totalOrdersCount.set(res.totalCount || 0);
            this.isLoadingOrders.set(false);
          },
          error: () => this.isLoadingOrders.set(false),
        })
      );
  }

  public completeAndPay(orderId: string, body: any): Observable<OrderDto> {
    return this.restService.request<any, OrderDto>({
      method: 'POST',
      url: `/api/app/table-orders/${orderId}/complete-and-pay`,
      body: body,
    });
  }

  public requestBill(orderId: string): Observable<void> {
    return this.restService.request<any, void>({
      method: 'POST',
      url: `/api/app/table-orders/${orderId}/request-bill`,
    });
  }

  // --- SIGNALR EVENT HANDLERS ---

  public handleTableStatusChanged(evt: TableStatusChangedEvent): void {
    this.tables.update(list =>
      list.map(t => {
        if (t.id === evt.tableId) {
          return {
            ...t,
            status: evt.status as TableStatus,
            occupiedDurationMinutes: evt.status === TableStatus.Occupied ? t.occupiedDurationMinutes ?? 0 : undefined,
          };
        }
        return t;
      })
    );

    // Cập nhật số bàn phục vụ trong ca
    const currentOccupied = this.tables().filter(t => t.status === TableStatus.Occupied).length;
    this.shiftSummary.update(s => ({
      ...s,
      activeTableCount: currentOccupied,
    }));
  }

  public handleOrderPlacedOrUpdated(evt: OrderPlacedOrUpdatedDto): void {
    // 1. Cập nhật thẻ bàn tương ứng
    let isNewOrder = false;
    this.tables.update(list =>
      list.map(t => {
        if (t.id === evt.tableId) {
          if (!t.activeOrderId || t.activeOrderId !== evt.orderId) {
            isNewOrder = true;
          }
          return {
            ...t,
            activeOrderId: evt.orderId,
            activeOrderCode: evt.orderCode,
            temporaryTotalAmount: evt.totalEstimatedAmount,
            status: TableStatus.Occupied,
          };
        }
        return t;
      })
    );

    // 2. Chỉ tăng số đếm đơn chờ trong summary nếu là đơn mới
    if (isNewOrder || evt.action === 'Placed') {
      this.shiftSummary.update(s => ({
        ...s,
        pendingOrderCount: s.pendingOrderCount + 1,
      }));
    }
  }

  public handleBillRequested(evt: BillRequestedDto): void {
    // 1. Gắn cờ nhấp nháy đỏ trên thẻ bàn
    this.billRequestedTableIds.update(set => {
      const next = new Set(set);
      next.add(evt.tableId);
      return next;
    });

    this.tables.update(list =>
      list.map(t => {
        if (t.id === evt.tableId) {
          return {
            ...t,
            isBillRequested: true,
            temporaryTotalAmount: evt.totalAmount,
          };
        }
        return t;
      })
    );

    // 2. Tăng số lượng đơn yêu cầu thanh toán
    this.shiftSummary.update(s => ({
      ...s,
      billRequestedCount: s.billRequestedCount + 1,
    }));
  }

  public handlePaymentCompleted(evt: PaymentCompletedDto): void {
    // 1. Bỏ cờ bill requested cho bàn
    this.billRequestedTableIds.update(set => {
      const next = new Set(set);
      next.delete(evt.tableId);
      return next;
    });

    // 2. Chuyển bàn sang CLEANING và xóa thông tin active order
    this.tables.update(list =>
      list.map(t => {
        if (t.id === evt.tableId) {
          return {
            ...t,
            status: TableStatus.Cleaning,
            isBillRequested: false,
            activeOrderId: undefined,
            activeOrderCode: undefined,
            temporaryTotalAmount: 0,
            occupiedDurationMinutes: undefined,
          };
        }
        return t;
      })
    );

    // 3. Tăng tổng doanh thu ca trực, giảm số bàn phục vụ và số đơn yêu cầu bill
    this.shiftSummary.update(s => ({
      ...s,
      totalRevenue: s.totalRevenue + evt.paidAmount,
      activeTableCount: Math.max(0, s.activeTableCount - 1),
      pendingOrderCount: Math.max(0, s.pendingOrderCount - 1),
      billRequestedCount: Math.max(0, s.billRequestedCount - 1),
    }));
  }
}
