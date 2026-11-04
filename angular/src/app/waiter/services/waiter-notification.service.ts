import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LocalizationService, ConfigStateService } from '@abp/ng.core';
import { ToasterService } from '@abp/ng.theme.shared';
import { TableSignalrService } from '../../shared/services/table-signalr.service';
import { AudioNotificationService } from '../../cashier/services/audio-notification.service';
import { TableStatus } from '../../proxy/tables/table-status.enum';

export type WaiterNotificationType =
  | 'payment_completed'
  | 'cashier_payment'
  | 'table_occupied'
  | 'cashier_seated'
  | 'table_transferred'
  | 'cashier_freed'
  | 'bill_requested'
  | 'order_placed'
  | 'table_reserved'
  | 'cashier_reserved';

export interface WaiterNotificationItem {
  id: string;
  type: WaiterNotificationType;
  tableId?: string;
  tableName?: string;
  titleKey: string;
  messageKey: string;
  messageArgs?: string[];
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WaiterNotificationService implements OnDestroy {
  private readonly signalrService = inject(TableSignalrService);
  private readonly audioService = inject(AudioNotificationService);
  private readonly toaster = inject(ToasterService);
  private readonly localization = inject(LocalizationService);
  private readonly configState = inject(ConfigStateService);

  private readonly _notifications = signal<WaiterNotificationItem[]>([]);
  public readonly notifications = this._notifications.asReadonly();

  public readonly unreadCount = computed(() => {
    return this._notifications().filter(n => !n.read).length;
  });

  private readonly _hasNewAlert = signal<boolean>(false);
  public readonly hasNewAlert = this._hasNewAlert.asReadonly();

  private alertTimeoutId?: any;
  private subscriptions = new Subscription();

  constructor() {
    this.listenToSignalrEvents();
  }

  private isCurrentUser(userId?: string, userName?: string): boolean {
    const currentUser = this.configState.getOne('currentUser');
    if (!currentUser) return false;

    // So sánh UserId
    if (userId && currentUser.id && userId.toLowerCase() === currentUser.id.toLowerCase()) {
      return true;
    }

    // So sánh Username hoặc Tên hiển thị đầy đủ
    if (userName) {
      const cleanName = userName.trim().toLowerCase();
      const currentUName = (currentUser.userName || '').trim().toLowerCase();
      const currentFullName = `${currentUser.name || ''} ${currentUser.surName || ''}`.trim().toLowerCase();
      const currentReversedName = `${currentUser.surName || ''} ${currentUser.name || ''}`.trim().toLowerCase();
      const currentNameOnly = (currentUser.name || '').trim().toLowerCase();

      if (
        cleanName === currentUName ||
        (currentFullName && cleanName === currentFullName) ||
        (currentReversedName && cleanName === currentReversedName) ||
        (currentNameOnly && cleanName === currentNameOnly)
      ) {
        return true;
      }
    }
    return false;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.alertTimeoutId) {
      clearTimeout(this.alertTimeoutId);
    }
  }

  private listenToSignalrEvents(): void {
    // 1. Thu ngân thanh toán thành công đơn hàng
    this.subscriptions.add(
      this.signalrService.paymentCompleted$.subscribe(evt => {
        // Bỏ qua nếu chính tài khoản hiện tại thực hiện thanh toán (đã có toast tại chỗ)
        if (this.isCurrentUser(evt.cashierId, evt.cashierName)) {
          return;
        }

        const tableName = evt.tableNumber || 'Bàn';
        const cashierName = evt.cashierName || 'Thu ngân';
        const formattedAmount = (evt.paidAmount || 0).toLocaleString('vi-VN');

        const titleKey = '::NotificationCashierPaymentTitle';
        const msgKey = '::NotificationCashierPaymentMsg';

        const toastTitle = this.localization.instant(titleKey);
        const toastMsg = this.localization.instant(msgKey, cashierName, tableName, formattedAmount);
        this.toaster.success(toastMsg, toastTitle);

        this.addNotification({
          type: 'cashier_payment',
          tableId: evt.tableId,
          tableName,
          titleKey,
          messageKey: msgKey,
          messageArgs: [cashierName, tableName, formattedAmount],
        });
      })
    );

    // 2. Trạng thái bàn thay đổi (Thu ngân xếp khách, trả bàn, dọn dẹp hoặc nhận đặt bàn)
    this.subscriptions.add(
      this.signalrService.tableStatusChanged$.subscribe(evt => {
        // Bỏ qua nếu chính mình là người thao tác
        if (this.isCurrentUser(evt.performedByUserId, evt.performedByName)) {
          return;
        }

        // Kiểm tra xem thao tác có đến từ vai trò Thu ngân / Quản lý / Admin không
        const isFromCashier =
          evt.performedByRole === 'Cashier' ||
          evt.performedByRole === 'Manager' ||
          evt.performedByRole === 'Administrator' ||
          (!!evt.performedByRole && evt.performedByRole !== 'Waiter');

                // Bàn nguồn khi chuyển bàn: không bắn Toast để tránh trùng lặp
        if (evt.actionType === 'table_transferred_source') {
          return;
        }

        // Bất kỳ bên nào chuyển bàn (Waiter/Cashier/Manager), các bên khác đều nhận thông báo chuyển bàn
        if (evt.actionType === 'table_transferred') {
          const sourceName = evt.sourceTableName || 'Bàn';
          const targetName = evt.targetTableName || evt.tableName || 'Bàn';
          const operatorName = evt.performedByName || 'Nhân viên';

          const titleKey = '::NotificationTableTransferredTitle';
          const msgKey = '::NotificationTableTransferredMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, operatorName, sourceName, targetName);
          this.toaster.info(toastMsg, toastTitle);

          this.addNotification({
            type: 'table_transferred',
            tableId: evt.tableId,
            tableName: targetName,
            titleKey,
            messageKey: msgKey,
            messageArgs: [operatorName, sourceName, targetName],
          });
          return;
        }

        // Phục vụ chỉ cần nhận thông báo khi Thu ngân / Quản lý thao tác, bỏ qua nếu do Waiter làm
        if (!isFromCashier) {
          return;
        }

        const tableName = evt.tableName || 'Bàn';
        const operatorName = evt.performedByName || 'Thu ngân';

        // A. Thu ngân xếp khách vào bàn / Đón khách đặt trước
        if (
          evt.status === TableStatus.Occupied ||
          evt.actionType === 'seated' ||
          evt.actionType === 'reservation_seated'
        ) {
          const isFromReservation = evt.actionType === 'reservation_seated';
          const titleKey = isFromReservation
            ? '::NotificationCashierReservationSeatedTitle'
            : '::NotificationCashierSeatedTitle';
          const msgKey = isFromReservation
            ? '::NotificationCashierReservationSeatedMsg'
            : '::NotificationCashierSeatedMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, operatorName, tableName);
          this.toaster.info(toastMsg, toastTitle);

          this.addNotification({
            type: 'cashier_seated',
            tableId: evt.tableId,
            tableName,
            titleKey,
            messageKey: msgKey,
            messageArgs: [operatorName, tableName],
          });
        }
        // B. Thu ngân trả bàn hoặc kết thúc ca phục vụ / dọn dẹp
        else if (
          evt.status === TableStatus.Available ||
          evt.actionType === 'freed' ||
          evt.actionType === 'cleaning'
        ) {
          const titleKey = '::NotificationCashierFreedTitle';
          const msgKey = '::NotificationCashierFreedMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, operatorName, tableName);
          this.toaster.info(toastMsg, toastTitle);

          this.addNotification({
            type: 'cashier_freed',
            tableId: evt.tableId,
            tableName,
            titleKey,
            messageKey: msgKey,
            messageArgs: [operatorName, tableName],
          });
        }
        // C. Thu ngân nhận lịch đặt bàn trước
        else if (evt.status === TableStatus.Reserved || evt.actionType === 'reserved') {
          const titleKey = '::NotificationCashierReservedTitle';
          const msgKey = '::NotificationCashierReservedMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, operatorName, tableName);
          this.toaster.info(toastMsg, toastTitle);

          this.addNotification({
            type: 'cashier_reserved',
            tableId: evt.tableId,
            tableName,
            titleKey,
            messageKey: msgKey,
            messageArgs: [operatorName, tableName],
          });
        }
      })
    );

    // 3. Khách yêu cầu tính tiền
    this.subscriptions.add(
      this.signalrService.billRequested$.subscribe(evt => {
        // Bỏ qua nếu chính mình là người gửi yêu cầu tính tiền
        if (this.isCurrentUser(evt.waiterId, evt.waiterName)) {
          return;
        }

        const tableName = evt.tableNumber || 'Bàn';
        const formattedAmount = (evt.totalAmount || 0).toLocaleString('vi-VN');

        this.addNotification({
          type: 'bill_requested',
          tableId: evt.tableId,
          tableName,
          titleKey: '::NotificationBillRequestedTitle',
          messageKey: '::NotificationBillRequestedMsg',
          messageArgs: [tableName, formattedAmount],
        });
      })
    );

    // 4. Đơn hàng mới hoặc bổ sung món
    this.subscriptions.add(
      this.signalrService.orderPlacedOrUpdated$.subscribe(evt => {
        // Bỏ qua nếu chính mình là người tạo/cập nhật đơn
        if (this.isCurrentUser(evt.waiterId, evt.waiterName)) {
          return;
        }

        const tableName = evt.tableNumber || 'Bàn';

        this.addNotification({
          type: 'order_placed',
          tableId: evt.tableId,
          tableName,
          titleKey: '::NotificationOrderPlacedTitle',
          messageKey: '::NotificationOrderPlacedMsg',
          messageArgs: [tableName, String(evt.totalItemCount ?? 1)],
        });
      })
    );
  }

  public addNotification(item: Omit<WaiterNotificationItem, 'id' | 'timestamp' | 'read'>): void {
    const newItem: WaiterNotificationItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
      read: false,
    };

    // Thêm vào đầu mảng và giới hạn tối đa 30 thông báo gần nhất
    this._notifications.update(list => [newItem, ...list.slice(0, 29)]);

    // Phát âm thanh chuông nhẹ (nếu không bị mute)
    this.audioService.playChime();

    // Kích hoạt hiệu ứng rung chuông trong 3.5 giây
    this._hasNewAlert.set(true);
    if (this.alertTimeoutId) {
      clearTimeout(this.alertTimeoutId);
    }
    this.alertTimeoutId = setTimeout(() => {
      this._hasNewAlert.set(false);
    }, 3500);
  }

  public markAsRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }

  public markAllAsRead(): void {
    this._notifications.update(list =>
      list.map(n => ({ ...n, read: true }))
    );
    this._hasNewAlert.set(false);
  }

  public clearAll(): void {
    this._notifications.set([]);
    this._hasNewAlert.set(false);
  }
}
