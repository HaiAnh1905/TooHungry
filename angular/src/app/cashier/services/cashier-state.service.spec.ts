import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { RestService } from '@abp/ng.core';
import { of } from 'rxjs';
import { CashierStateService } from './cashier-state.service';
import { TableStatus } from '../../proxy/tables/table-status.enum';

describe('CashierStateService', () => {
  let service: CashierStateService;
  let mockRestService: { request: ReturnType<typeof vi.fn> };
  let injector: Injector;

  beforeEach(() => {
    mockRestService = {
      request: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        CashierStateService,
        { provide: RestService, useValue: mockRestService },
      ],
    });

    service = injector.get(CashierStateService);
  });

  it('should initialize with default empty/zero signals', () => {
    expect(service.totalRevenue()).toBe(0);
    expect(service.activeTableCount()).toBe(0);
    expect(service.pendingOrderCount()).toBe(0);
    expect(service.billRequestedCount()).toBe(0);
    expect(service.tables().length).toBe(0);
    expect(service.orders().length).toBe(0);
  });

  it('should load shift summary and update signals', () => {
    const mockSummary = {
      cashierName: 'Nguyễn Văn Thu Ngân',
      shiftStartTime: '2026-10-26T08:00:00Z',
      totalRevenue: 5500000,
      activeTableCount: 6,
      pendingOrderCount: 2,
      billRequestedCount: 1,
    };
    mockRestService.request.mockReturnValue(of(mockSummary));

    service.loadShiftSummary().subscribe();

    expect(service.totalRevenue()).toBe(5500000);
    expect(service.activeTableCount()).toBe(6);
    expect(service.pendingOrderCount()).toBe(2);
    expect(service.billRequestedCount()).toBe(1);
    expect(service.isLoadingShift()).toBe(false);
  });

  it('should handle table status changed event', () => {
    service.tables.set([
      {
        id: 'tbl-1',
        tableNumber: 'Bàn 01',
        capacity: 4,
        status: TableStatus.Available,
        diningAreaName: 'Khu A',
        isBillRequested: false,
      },
    ]);

    service.handleTableStatusChanged({
      tableId: 'tbl-1',
      status: TableStatus.Occupied,
    });

    expect(service.tables()[0].status).toBe(TableStatus.Occupied);
    expect(service.activeTableCount()).toBe(1);
  });

  it('should handle order placed or updated event', () => {
    service.tables.set([
      {
        id: 'tbl-1',
        tableNumber: 'Bàn 01',
        capacity: 4,
        status: TableStatus.Occupied,
        diningAreaName: 'Khu A',
        isBillRequested: false,
      },
    ]);

    service.handleOrderPlacedOrUpdated({
      orderId: 'ord-123',
      orderCode: 'ORD-001',
      tableId: 'tbl-1',
      tableName: 'Bàn 01',
      itemsCount: 3,
      totalEstimatedAmount: 250000,
      timestamp: new Date().toISOString(),
    });

    const tbl = service.tables()[0];
    expect(tbl.activeOrderId).toBe('ord-123');
    expect(tbl.activeOrderCode).toBe('ORD-001');
    expect(tbl.temporaryTotalAmount).toBe(250000);
    expect(service.pendingOrderCount()).toBe(1);
  });

  it('should handle bill requested event by setting flashing flag and incrementing count', () => {
    service.tables.set([
      {
        id: 'tbl-1',
        tableNumber: 'Bàn 01',
        capacity: 4,
        status: TableStatus.Occupied,
        diningAreaName: 'Khu A',
        isBillRequested: false,
      },
    ]);

    service.handleBillRequested({
      orderId: 'ord-123',
      orderCode: 'ORD-001',
      tableId: 'tbl-1',
      tableName: 'Bàn 01',
      totalAmount: 350000,
      requestedAt: new Date().toISOString(),
    });

    expect(service.billRequestedTableIds().has('tbl-1')).toBe(true);
    expect(service.tables()[0].isBillRequested).toBe(true);
    expect(service.tables()[0].temporaryTotalAmount).toBe(350000);
    expect(service.billRequestedCount()).toBe(1);
  });

  it('should handle payment completed event by updating table to Cleaning and updating revenue', () => {
    service.shiftSummary.set({
      cashierName: 'Thu Ngân',
      shiftStartTime: new Date().toISOString(),
      totalRevenue: 1000000,
      activeTableCount: 2,
      pendingOrderCount: 0,
      billRequestedCount: 1,
    });
    service.billRequestedTableIds.set(new Set(['tbl-1']));
    service.tables.set([
      {
        id: 'tbl-1',
        tableNumber: 'Bàn 01',
        capacity: 4,
        status: TableStatus.Occupied,
        diningAreaName: 'Khu A',
        isBillRequested: true,
        activeOrderId: 'ord-123',
        temporaryTotalAmount: 350000,
      },
    ]);

    service.handlePaymentCompleted({
      orderId: 'ord-123',
      orderCode: 'ORD-001',
      tableId: 'tbl-1',
      tableName: 'Bàn 01',
      paidAmount: 350000,
      paymentMethod: 1,
      completedAt: new Date().toISOString(),
    });

    expect(service.billRequestedTableIds().has('tbl-1')).toBe(false);
    expect(service.tables()[0].status).toBe(TableStatus.Cleaning);
    expect(service.tables()[0].isBillRequested).toBe(false);
    expect(service.tables()[0].temporaryTotalAmount).toBe(0);
    expect(service.totalRevenue()).toBe(1350000);
    expect(service.activeTableCount()).toBe(1);
    expect(service.billRequestedCount()).toBe(0);
  });
});
