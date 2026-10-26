import { Injectable, computed, inject, signal } from '@angular/core';
import { TableDto } from '../../proxy/tables/models';
import { TableStatus } from '../../proxy/tables/table-status.enum';
import { TableSignalrService, TableStatusChangedEvent, TableOrderUpdatedEvent } from './table-signalr.service';
import { Subscription } from 'rxjs';

export interface TableStatusSummary {
  totalCount: number;
  availableCount: number;
  occupiedCount: number;
  reservedCount: number;
  cleaningCount: number;
  inactiveCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class TableStateService {
  private readonly signalrService = inject(TableSignalrService);

  readonly allTables = signal<TableDto[]>([]);
  readonly selectedAreaId = signal<string | null>(null);
  readonly selectedStatus = signal<TableStatus | null>(null);
  readonly searchTerm = signal<string>('');
  readonly currentTime = signal<number>(Date.now());

  private signalrStatusSub?: Subscription;
  private signalrOrderSub?: Subscription;

  readonly statusCounts = computed<TableStatusSummary>(() => {
    const tables = this.allTables();
    let available = 0;
    let occupied = 0;
    let reserved = 0;
    let cleaning = 0;
    let inactive = 0;

    for (const t of tables) {
      switch (t.status) {
        case TableStatus.Available:
          available++;
          break;
        case TableStatus.Occupied:
          occupied++;
          break;
        case TableStatus.Reserved:
          reserved++;
          break;
        case TableStatus.Cleaning:
          cleaning++;
          break;
        case TableStatus.Disabled:
          inactive++;
          break;
      }
    }

    return {
      totalCount: tables.length,
      availableCount: available,
      occupiedCount: occupied,
      reservedCount: reserved,
      cleaningCount: cleaning,
      inactiveCount: inactive,
    };
  });

  readonly filteredTables = computed<TableDto[]>(() => {
    let result = this.allTables();
    const areaId = this.selectedAreaId();
    const status = this.selectedStatus();
    const term = this.searchTerm().trim().toLowerCase();

    if (areaId) {
      result = result.filter(t => t.diningAreaId === areaId);
    }

    if (status !== null && status !== undefined) {
      result = result.filter(t => t.status === status);
    }

    if (term) {
      result = result.filter(
        t =>
          (t.name && t.name.toLowerCase().includes(term)) ||
          (t.location && t.location.toLowerCase().includes(term)) ||
          (t.diningAreaName && t.diningAreaName.toLowerCase().includes(term)) ||
          (t.reservedCustomerName && t.reservedCustomerName.toLowerCase().includes(term)) ||
          (t.reservedCustomerPhone && t.reservedCustomerPhone.includes(term))
      );
    }

    return result;
  });

  constructor() {
    this.signalrStatusSub = this.signalrService.tableStatusChanged$.subscribe(event => {
      this.handleRealtimeStatusChange(event);
    });

    this.signalrOrderSub = this.signalrService.tableOrderUpdated$.subscribe(event => {
      this.handleRealtimeOrderUpdate(event);
    });
  }

  setTables(tables: TableDto[]): void {
    this.allTables.set(tables || []);
  }

  updateTable(updatedTable: TableDto): void {
    const list = this.allTables();
    const index = list.findIndex(t => t.id === updatedTable.id);
    if (index !== -1) {
      const copy = [...list];
      copy[index] = { ...copy[index], ...updatedTable };
      this.allTables.set(copy);
    } else {
      this.allTables.set([...list, updatedTable]);
    }
  }

  removeTable(id: string): void {
    this.allTables.set(this.allTables().filter(t => t.id !== id));
  }

  filterByArea(areaId: string | null): void {
    this.selectedAreaId.set(areaId);
  }

  filterByStatus(status: TableStatus | null): void {
    this.selectedStatus.set(status);
  }

  search(keyword: string): void {
    this.searchTerm.set(keyword);
  }

  updateCurrentTime(): void {
    this.currentTime.set(Date.now());
  }

  private handleRealtimeStatusChange(event: TableStatusChangedEvent): void {
    if (!event?.tableId) return;
    const list = this.allTables();
    const table = list.find(t => t.id === event.tableId);
    if (table) {
      const updated: TableDto = {
        ...table,
        status: event.status as TableStatus,
        occupiedTime: event.occupiedTime !== undefined ? event.occupiedTime : table.occupiedTime,
      };
      this.updateTable(updated);
    }
  }

  private handleRealtimeOrderUpdate(event: TableOrderUpdatedEvent): void {
    if (!event?.tableId) return;
    const list = this.allTables();
    const table = list.find(t => t.id === event.tableId);
    if (table) {
      const updated: TableDto = {
        ...table,
        hasActiveOrder: event.hasActiveOrder,
        activeOrderId: event.activeOrderId !== undefined ? event.activeOrderId : table.activeOrderId,
      };
      this.updateTable(updated);
    }
  }
}
