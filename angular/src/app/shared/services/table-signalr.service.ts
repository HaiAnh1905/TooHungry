import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { EnvironmentService } from '@abp/ng.core';

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
  private hubConnection?: signalR.HubConnection;
  private tableStatusChangedSubject = new Subject<TableStatusChangedEvent>();
  private tableOrderUpdatedSubject = new Subject<TableOrderUpdatedEvent>();

  public tableStatusChanged$: Observable<TableStatusChangedEvent> =
    this.tableStatusChangedSubject.asObservable();
  public tableOrderUpdated$: Observable<TableOrderUpdatedEvent> =
    this.tableOrderUpdatedSubject.asObservable();

  constructor() {
    this.initConnection();
  }

  private initConnection() {
    const apiUrl = this.environmentService.getApiUrl('Default') || 'https://localhost:44353';
    const hubUrl = `${apiUrl.replace(/\/$/, '')}/signalr-hubs/table`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
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

    this.startConnection();
  }

  private async startConnection() {
    try {
      if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
        await this.hubConnection.start();
      }
    } catch {
      // Hub connection will retry or keep quiet
    }
  }

  public stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
