import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable, Subscription } from 'rxjs';
import { EnvironmentService } from '@abp/ng.core';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import {
  OrderPlacedOrUpdatedDto,
  BillRequestedDto,
  PaymentCompletedDto,
} from '../../cashier/models/cashier.models';

export interface TableStatusChangedEvent {
  tableId: string;
  tableName?: string;
  diningAreaId?: string;
  status: number;
  statusName?: string;
  occupiedTime?: string | null;
  updatedTime?: string;
  actionType?: string;
  performedByRole?: string;
  performedByName?: string;
  performedByUserId?: string;
  reservedCustomerName?: string;
  reservedCustomerPhone?: string;
  reservedTime?: string;
  reservedGuestCount?: number;
  reservedNote?: string;
  sourceTableName?: string;
  targetTableName?: string;
}

export interface TableOrderUpdatedEvent {
  tableId: string;
  hasActiveOrder: boolean;
  activeOrderId?: string | null;
}

export interface SecurityAlertEvent {
  clientIp: string;
  failedCount: number;
  timestamp: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TableSignalrService {
  private environmentService = inject(EnvironmentService);
  private oAuthService = inject(OAuthService);

  private hubConnection?: signalR.HubConnection;
  private authSubscription?: Subscription;
  private tableStatusChangedSubject = new Subject<TableStatusChangedEvent>();
  private tableOrderUpdatedSubject = new Subject<TableOrderUpdatedEvent>();
  private orderPlacedOrUpdatedSubject = new Subject<OrderPlacedOrUpdatedDto>();
  private billRequestedSubject = new Subject<BillRequestedDto>();
  private paymentCompletedSubject = new Subject<PaymentCompletedDto>();
  private securityAlertSubject = new Subject<SecurityAlertEvent>();

  public tableStatusChanged$: Observable<TableStatusChangedEvent> =
    this.tableStatusChangedSubject.asObservable();
  public tableOrderUpdated$: Observable<TableOrderUpdatedEvent> =
    this.tableOrderUpdatedSubject.asObservable();
  public orderPlacedOrUpdated$: Observable<OrderPlacedOrUpdatedDto> =
    this.orderPlacedOrUpdatedSubject.asObservable();
  public billRequested$: Observable<BillRequestedDto> =
    this.billRequestedSubject.asObservable();
  public paymentCompleted$: Observable<PaymentCompletedDto> =
    this.paymentCompletedSubject.asObservable();
  public securityAlert$: Observable<SecurityAlertEvent> =
    this.securityAlertSubject.asObservable();

  constructor() {
    this.initAuthLifecycle();
  }

  private initAuthLifecycle(): void {
    // 1. Nếu đã có token hợp lệ khi khởi tạo service, khởi động kết nối
    if (this.oAuthService.hasValidAccessToken()) {
      this.initConnection();
    }

    // 2. Lắng nghe các sự kiện OAuth để tự động kết nối hoặc ngắt kết nối
    this.authSubscription = this.oAuthService.events.subscribe((event: OAuthEvent) => {
      if (event.type === 'token_received') {
        if (this.oAuthService.hasValidAccessToken()) {
          if (!this.hubConnection || this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
            this.initConnection();
          }
        }
      } else if (event.type === 'logout' || event.type === 'session_terminated') {
        this.stopConnection();
      }
    });
  }

  public initConnection(): void {
    if (!this.oAuthService.hasValidAccessToken()) {
      return;
    }

    const apiUrl = this.environmentService.getApiUrl('Default') || 'https://localhost:44353';
    const hubUrl = `${apiUrl.replace(/\/$/, '')}/signalr-hubs/table`;

    if (this.hubConnection) {
      this.stopConnection();
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.oAuthService.getAccessToken() || '',
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('TableStatusChanged', (data: any) => {
      this.tableStatusChangedSubject.next({
        tableId: data.tableId || data.TableId,
        tableName: data.tableName || data.TableName,
        diningAreaId: data.diningAreaId || data.DiningAreaId,
        status: data.status !== undefined ? data.status : data.Status,
        statusName: data.statusName || data.StatusName,
        occupiedTime: data.occupiedTime !== undefined ? data.occupiedTime : data.OccupiedTime,
        updatedTime: data.updatedTime || data.UpdatedTime,
        actionType: data.actionType || data.ActionType,
        performedByRole: data.performedByRole || data.PerformedByRole,
        performedByName: data.performedByName || data.PerformedByName,
        performedByUserId: data.performedByUserId || data.PerformedByUserId,
        sourceTableName: data.sourceTableName || data.SourceTableName,
        targetTableName: data.targetTableName || data.TargetTableName,
      });
    });

    this.hubConnection.on('TableOrderUpdated', (data: any) => {
      this.tableOrderUpdatedSubject.next({
        tableId: data.tableId || data.TableId,
        hasActiveOrder: data.hasActiveOrder !== undefined ? data.hasActiveOrder : data.HasActiveOrder,
        activeOrderId: data.activeOrderId || data.ActiveOrderId || null,
      });
    });

    this.hubConnection.on('OrderPlacedOrUpdated', (data: any) => {
      this.orderPlacedOrUpdatedSubject.next({
        orderId: data.orderId || data.OrderId,
        orderCode: data.orderCode || data.OrderCode,
        tableId: data.tableId || data.TableId,
        tableNumber: data.tableNumber || data.TableNumber,
        totalItemCount: data.totalItemCount !== undefined ? data.totalItemCount : data.TotalItemCount,
        totalEstimatedAmount: data.totalEstimatedAmount !== undefined ? data.totalEstimatedAmount : data.TotalEstimatedAmount,
        action: data.action || data.Action || 'Placed',
        waiterName: data.waiterName || data.WaiterName,
        timestamp: data.timestamp || data.Timestamp || new Date().toISOString(),
      });
    });

    this.hubConnection.on('BillRequested', (data: any) => {
      this.billRequestedSubject.next({
        tableId: data.tableId || data.TableId,
        tableNumber: data.tableNumber || data.TableNumber,
        orderId: data.orderId || data.OrderId,
        orderCode: data.orderCode || data.OrderCode,
        totalAmount: data.totalAmount !== undefined ? data.totalAmount : data.TotalAmount,
        waiterName: data.waiterName || data.WaiterName,
        requestedTime: data.requestedTime || data.RequestedTime || new Date().toISOString(),
      });
    });

    this.hubConnection.on('PaymentCompleted', (data: any) => {
      this.paymentCompletedSubject.next({
        orderId: data.orderId || data.OrderId,
        orderCode: data.orderCode || data.OrderCode,
        tableId: data.tableId || data.TableId,
        tableNumber: data.tableNumber || data.TableNumber,
        paidAmount: data.paidAmount !== undefined ? data.paidAmount : data.PaidAmount,
        paymentMethod: data.paymentMethod || data.PaymentMethod || 'CASH',
        cashierName: data.cashierName || data.CashierName || '',
        completedTime: data.completedTime || data.CompletedTime || new Date().toISOString(),
      });
    });

    this.hubConnection.on('SecurityAlertTriggered', (data: any) => {
      this.securityAlertSubject.next({
        clientIp: data.clientIp || data.ClientIp,
        failedCount: data.failedCount !== undefined ? data.failedCount : data.FailedCount,
        timestamp: data.timestamp || data.Timestamp || new Date().toISOString(),
        message: data.message || data.Message,
      });
    });

    this.hubConnection.onclose(async (error) => {
      if (error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
        try {
          await this.oAuthService.refreshToken();
          if (this.oAuthService.hasValidAccessToken()) {
            await this.startConnection();
          }
        } catch {
          // Token refresh failure handled by oauth lifecycle
        }
      }
    });

    this.startConnection();
  }

  public async startConnection(): Promise<void> {
    if (!this.oAuthService.hasValidAccessToken()) {
      return;
    }

    try {
      if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
        await this.hubConnection.start();
      }
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.message?.includes('401')) {
        try {
          await this.oAuthService.refreshToken();
          if (this.oAuthService.hasValidAccessToken() && this.hubConnection?.state === signalR.HubConnectionState.Disconnected) {
            await this.hubConnection.start();
          }
        } catch {
          // Keep quiet
        }
      }
    }
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      try {
        this.hubConnection.stop();
      } catch {
        // Ignore stop error
      }
      this.hubConnection = undefined;
    }
  }

  public getHubConnection(): signalR.HubConnection | undefined {
    return this.hubConnection;
  }
}

export { TableSignalrService as TableSignalRService };
