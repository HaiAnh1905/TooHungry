import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable, Subscription } from 'rxjs';
import { EnvironmentService } from '@abp/ng.core';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';

export interface TableStatusChangedEvent {
  tableId: string;
  tableName?: string;
  diningAreaId?: string;
  status: number;
  statusName?: string;
  occupiedTime?: string | null;
  updatedTime?: string;
}

export interface TableOrderUpdatedEvent {
  tableId: string;
  hasActiveOrder: boolean;
  activeOrderId?: string | null;
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

  public tableStatusChanged$: Observable<TableStatusChangedEvent> =
    this.tableStatusChangedSubject.asObservable();
  public tableOrderUpdated$: Observable<TableOrderUpdatedEvent> =
    this.tableOrderUpdatedSubject.asObservable();

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
      });
    });

    this.hubConnection.on('TableOrderUpdated', (data: any) => {
      this.tableOrderUpdatedSubject.next({
        tableId: data.tableId || data.TableId,
        hasActiveOrder: data.hasActiveOrder !== undefined ? data.hasActiveOrder : data.HasActiveOrder,
        activeOrderId: data.activeOrderId || data.ActiveOrderId || null,
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
