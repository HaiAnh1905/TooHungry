import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LocalizationService, ConfigStateService } from '@abp/ng.core';
import { ToasterService } from '@abp/ng.theme.shared';
import { TableSignalrService } from '../../shared/services/table-signalr.service';
import { CashierStateService } from './cashier-state.service';
import { AudioNotificationService } from './audio-notification.service';

@Injectable({
  providedIn: 'root',
})
export class CashierSyncService implements OnDestroy {
  private readonly signalrService = inject(TableSignalrService);
  private readonly state = inject(CashierStateService);
  private readonly audioService = inject(AudioNotificationService);
  private readonly toaster = inject(ToasterService);
  private readonly localization = inject(LocalizationService);
  private readonly configState = inject(ConfigStateService);

  private readonly subs = new Subscription();

  constructor() {
    this.initSync();
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

  public initSync(): void {
    // 1. Sự kiện thay đổi trạng thái bàn (Nhận bàn, Kết thúc bữa ăn, Đặt bàn)
    this.subs.add(
      this.signalrService.tableStatusChanged$.subscribe(evt => {
        const oldTable = this.state.tables().find(t => t.id === evt.tableId);

        // Luôn đồng bộ dữ liệu giao diện sơ đồ bàn
        this.state.handleTableStatusChanged(evt);

        const isSelf = this.isCurrentUser(evt.performedByUserId, evt.performedByName);
        if (isSelf) {
          return;
        }

        // Xử lý sự kiện CHUYỂN BÀN ĂN (Table Transferred)
        if (evt.actionType === 'table_transferred_source') {
          return; // Bàn nguồn đã cập nhật state sơ đồ bàn ở trên, không bắn Toast
        }
        if (evt.actionType === 'table_transferred') {
          this.audioService.playChime();
          const sourceName = evt.sourceTableName || 'Bàn cũ';
          const targetName = evt.targetTableName || evt.tableName || 'Bàn mới';
          const operatorName = evt.performedByName || 'Nhân viên';

          const titleKey = '::NotificationTableTransferredTitle';
          const msgKey = '::NotificationTableTransferredMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, operatorName, sourceName, targetName);
          this.toaster.info(toastMsg, toastTitle);

          this.state.addNotification({
            type: 'table_transferred',
            titleKey,
            messageKey: msgKey,
            messageParams: [operatorName, sourceName, targetName],
            rawTitle: `Chuyển bàn ăn (${operatorName})`,
            rawMessage: `${operatorName} vừa chuyển khách từ ${sourceName} sang ${targetName}!`,
            tableId: evt.tableId,
            tableName: targetName,
          });
          return;
        }

        const isFromWaiter = evt.performedByRole === 'Waiter';
        const isCashierAction =
          evt.performedByRole === 'Cashier' ||
          evt.performedByRole === 'Manager' ||
          evt.performedByRole === 'Administrator';

        // Nếu hành động phát sinh từ vai trò Cashier tại quầy (đã có Toast trực tiếp từ API)
        // hoặc không phải từ Waiter mà do chính user thao tác:
        if (isCashierAction || (!isFromWaiter && isSelf)) {
          return;
        }

        const tableName = evt.tableName || oldTable?.tableNumber || 'Bàn';
        const operatorName = evt.performedByName ? ` (${evt.performedByName})` : '';

        // A. Waiter nhận bàn cho khách (chuyển sang Occupied)
        if (evt.status === 1) { // Occupied
          this.audioService.playChime();
          const isFromReservation = evt.actionType === 'reservation_seated';
          const titleKey = isFromReservation
            ? '::NotificationWaiterReservationSeatedTitle'
            : '::NotificationWaiterSeatedTitle';
          const msgKey = isFromReservation
            ? '::NotificationWaiterReservationSeatedMsg'
            : '::NotificationWaiterSeatedMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, tableName, evt.performedByName || '');
          this.toaster.info(toastMsg, toastTitle);

          this.state.addNotification({
            type: 'waiter_seated',
            titleKey,
            messageKey: msgKey,
            messageParams: [tableName, evt.performedByName || ''],
            rawTitle: isFromReservation ? `Đã đón khách thành công${operatorName}` : `Phục vụ nhận bàn${operatorName}`,
            rawMessage: isFromReservation
              ? `${tableName} đã đón khách đặt trước thành công!`
              : `${tableName} vừa có khách vào nhận bàn!`,
            tableId: evt.tableId,
            tableName,
          });
        }
        // B. Waiter kết thúc đơn nhận bàn / trả bàn / giải phóng bàn
        else if (evt.status === 0 || evt.status === 3 || evt.actionType === 'freed' || evt.actionType === 'cleaning') {
          this.audioService.playChime();
          const titleKey = '::NotificationMealEndedTitle';
          const msgKey = '::NotificationMealEndedMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, tableName, evt.performedByName || '');
          this.toaster.info(toastMsg, toastTitle);

          this.state.addNotification({
            type: 'meal_ended',
            titleKey,
            messageKey: msgKey,
            messageParams: [tableName, evt.performedByName || ''],
            rawTitle: `Kết thúc dùng bữa${operatorName}`,
            rawMessage: `${tableName} đã kết thúc phục vụ và được trả bàn!`,
            tableId: evt.tableId,
            tableName,
          });
        }
        // C. Có lịch đặt bàn mới (từ phía khác ngoài Cashier)
        else if (evt.status === 2 || evt.actionType === 'reserved') { // Reserved
          this.audioService.playChime();
          const titleKey = '::NotificationTableReservedTitle';
          const msgKey = '::NotificationTableReservedMsg';

          const toastTitle = this.localization.instant(titleKey);
          const toastMsg = this.localization.instant(msgKey, tableName);
          this.toaster.info(toastMsg, toastTitle);

          this.state.addNotification({
            type: 'table_reserved',
            titleKey,
            messageKey: msgKey,
            messageParams: [tableName],
            rawTitle: 'Bàn đặt trước',
            rawMessage: `${tableName} vừa có khách đặt chỗ trước!`,
            tableId: evt.tableId,
            tableName,
          });
        }
      })
    );

    // 2. Sự kiện Waiter gọi món mới hoặc thêm món
    this.subs.add(
      this.signalrService.orderPlacedOrUpdated$.subscribe(evt => {
        this.state.handleOrderPlacedOrUpdated(evt);

        const isSelf = this.isCurrentUser(evt.waiterId, evt.waiterName);
        if (isSelf) return;

        this.audioService.playChime();
        const waiterInfo = evt.waiterName ? ` (${evt.waiterName})` : '';
        const msg = this.localization.instant('::CashierToastOrderPlaced', evt.tableNumber, String(evt.totalItemCount));
        this.toaster.info(msg, this.localization.instant('::NewOrderReceivedTitle'));

        this.state.addNotification({
          type: 'order_placed',
          titleKey: '::NotificationOrderPlacedTitle',
          messageKey: '::NotificationOrderPlacedMsg',
          messageParams: [evt.tableNumber, String(evt.totalItemCount)],
          rawTitle: `Đơn mới từ bàn${waiterInfo}`,
          rawMessage: `Bàn ${evt.tableNumber} vừa đặt ${evt.totalItemCount} món mới`,
          tableId: evt.tableId,
          tableName: evt.tableNumber,
          orderId: evt.orderId,
          orderCode: evt.orderCode,
        });
      })
    );

    // 3. Sự kiện Yêu cầu thanh toán (Bill Requested)
    this.subs.add(
      this.signalrService.billRequested$.subscribe(evt => {
        this.state.handleBillRequested(evt);

        const isSelf = this.isCurrentUser(evt.waiterId, evt.waiterName);
        if (isSelf) return;

        this.audioService.playAlert();
        const waiterInfo = evt.waiterName ? ` (${evt.waiterName})` : '';
        const msg = this.localization.instant('::CashierToastBillRequested', evt.tableNumber, evt.totalAmount.toLocaleString('vi-VN'));
        this.toaster.warn(msg, this.localization.instant('::BillRequestedTitle'));

        this.state.addNotification({
          type: 'bill_requested',
          titleKey: '::NotificationBillRequestedTitle',
          messageKey: '::NotificationBillRequestedMsg',
          messageParams: [evt.tableNumber, evt.totalAmount.toLocaleString('vi-VN')],
          rawTitle: `Yêu cầu tính tiền${waiterInfo}`,
          rawMessage: `Bàn ${evt.tableNumber} yêu cầu tính tiền: ${evt.totalAmount.toLocaleString('vi-VN')} đ`,
          tableId: evt.tableId,
          tableName: evt.tableNumber,
          orderId: evt.orderId,
          orderCode: evt.orderCode,
        });
      })
    );

    // 4. Sự kiện Thanh toán hoàn tất (Payment Completed)
    this.subs.add(
      this.signalrService.paymentCompleted$.subscribe(evt => {
        this.state.handlePaymentCompleted(evt);

        const isSelf = this.isCurrentUser(evt.cashierId, evt.cashierName);
        // Nếu chính Thu ngân này vừa thanh toán thì modal thanh toán đã hiển thị Toast thành công rồi
        if (isSelf) return;

        const cashierInfo = evt.cashierName ? ` (${evt.cashierName})` : '';
        const msg = this.localization.instant('::CashierToastPaymentCompleted', evt.tableNumber, evt.paidAmount.toLocaleString('vi-VN'));
        this.toaster.success(msg, this.localization.instant('::PaymentCompletedTitle'));

        this.state.addNotification({
          type: 'payment_completed',
          titleKey: '::NotificationPaymentCompletedTitle',
          messageKey: '::NotificationPaymentCompletedMsg',
          messageParams: [evt.tableNumber, evt.paidAmount.toLocaleString('vi-VN')],
          rawTitle: `Thanh toán thành công${cashierInfo}`,
          rawMessage: `Bàn ${evt.tableNumber} đã thanh toán thành công ${evt.paidAmount.toLocaleString('vi-VN')} đ`,
          tableId: evt.tableId,
          tableName: evt.tableNumber,
          orderId: evt.orderId,
          orderCode: evt.orderCode,
        });
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
