/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { LocalizationService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ToasterService } from '@abp/ng.theme.shared';
import { TableStatus } from '../../proxy/tables/table-status.enum';
import { TableService } from '../../proxy/tables/table.service';
import { DiningAreaService } from '../../proxy/dining-areas/dining-area.service';
import { TableReservationService } from '../../proxy/reservations/table-reservation.service';
import { CashierStateService } from '../services/cashier-state.service';
import { CashierTablesComponent } from './cashier-tables.component';
import { CashierTableCard } from '../models/cashier.models';

describe('CashierTablesComponent', () => {
  let component: CashierTablesComponent;
  let mockTableService: any;
  let mockDiningAreaService: any;
  let mockReservationService: any;
  let mockToaster: any;
  let mockConfirmation: any;
  let mockLocalization: any;
  let mockCdr: any;
  let mockRouter: any;
  let mockCashierState: any;

  const sampleAvailableTable: CashierTableCard = {
    id: 'tbl-1',
    tableNumber: 'Bàn 01',
    capacity: 4,
    diningAreaId: 'area-1',
    diningAreaName: 'Khu A',
    status: TableStatus.Available,
    temporaryTotalAmount: 0,
  };

  const sampleReservedTable: CashierTableCard = {
    id: 'tbl-2',
    tableNumber: 'Bàn 02',
    capacity: 6,
    diningAreaId: 'area-1',
    diningAreaName: 'Khu A',
    status: TableStatus.Reserved,
    temporaryTotalAmount: 0,
    reservedCustomerName: 'Nguyen Van A',
    reservedCustomerPhone: '0901234567',
    reservedTime: '2026-10-26T19:00:00',
    reservedGuestCount: 4,
    reservedNote: 'Gần cửa sổ',
  };

  const sampleOccupiedTable: CashierTableCard = {
    id: 'tbl-3',
    tableNumber: 'Bàn 03',
    capacity: 2,
    diningAreaId: 'area-2',
    diningAreaName: 'Khu B',
    status: TableStatus.Occupied,
    activeOrderId: 'order-101',
    activeOrderCode: 'ORD-101',
    temporaryTotalAmount: 250000,
  };

  beforeEach(() => {
    mockTableService = {
      changeStatus: vi.fn().mockReturnValue(of({})),
      transferTable: vi.fn().mockReturnValue(of({})),
      mergeTables: vi.fn().mockReturnValue(of({})),
    };
    mockDiningAreaService = {
      getList: vi.fn().mockReturnValue(of({ items: [{ id: 'area-1', name: 'Khu A' }] })),
    };
    mockReservationService = {
      getActiveByTableId: vi.fn().mockReturnValue(of({ id: 'res-1', tableId: 'tbl-2', customerName: 'Nguyen Van A' })),
      checkIn: vi.fn().mockReturnValue(of({})),
      cancel: vi.fn().mockReturnValue(of({})),
    };
    mockToaster = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };
    mockConfirmation = {
      warn: vi.fn().mockReturnValue(of(Confirmation.Status.confirm)),
    };
    mockLocalization = {
      instant: vi.fn().mockImplementation((key: string, ...args: any[]) => key),
    };
    mockCdr = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    };
    mockRouter = {
      navigate: vi.fn(),
    };
    mockCashierState = {
      tables: vi.fn().mockReturnValue([sampleAvailableTable, sampleReservedTable, sampleOccupiedTable]),
      isLoadingTables: vi.fn().mockReturnValue(false),
      loadTables: vi.fn().mockReturnValue(of([])),
      loadShiftSummary: vi.fn().mockReturnValue(of({})),
      billRequestedTableIds: vi.fn().mockReturnValue(new Set()),
    };

    const injector = Injector.create({
      providers: [
        { provide: CashierTablesComponent, useClass: CashierTablesComponent },
        { provide: TableService, useValue: mockTableService },
        { provide: DiningAreaService, useValue: mockDiningAreaService },
        { provide: TableReservationService, useValue: mockReservationService },
        { provide: ToasterService, useValue: mockToaster },
        { provide: ConfirmationService, useValue: mockConfirmation },
        { provide: LocalizationService, useValue: mockLocalization },
        { provide: ChangeDetectorRef, useValue: mockCdr },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: CashierStateService, useValue: mockCashierState },
      ],
    });

    component = injector.get(CashierTablesComponent);
  });

  it('should map CashierTableCard correctly to TableDto via asTableDto', () => {
    const dto = component.asTableDto(sampleReservedTable);
    expect(dto.id).toBe('tbl-2');
    expect(dto.name).toBe('Bàn 02');
    expect(dto.capacity).toBe(6);
    expect(dto.status).toBe(TableStatus.Reserved);
    expect(dto.reservedCustomerName).toBe('Nguyen Van A');
    expect(dto.reservedCustomerPhone).toBe('0901234567');
    expect(dto.reservedTime).toBe('2026-10-26T19:00:00');
    expect(dto.reservedGuestCount).toBe(4);
    expect(dto.reservedNote).toBe('Gần cửa sổ');
  });

  it('should open reservation modal when openReservationModal is called', () => {
    expect(component.isReservationModalOpen).toBe(false);
    expect(component.reservingTable).toBeNull();

    component.openReservationModal(sampleAvailableTable);

    expect(component.isReservationModalOpen).toBe(true);
    expect(component.reservingTable?.id).toBe('tbl-1');
  });

  it('should open reservation detail modal when openReservationDetailModal is called', () => {
    expect(component.isReservationDetailModalOpen).toBe(false);
    expect(component.selectedReservedTable).toBeNull();

    component.openReservationDetailModal(sampleReservedTable);

    expect(component.isReservationDetailModalOpen).toBe(true);
    expect(component.selectedReservedTable?.id).toBe('tbl-2');
  });

  it('should check in reservation via reservation service and reload tables', () => {
    component.checkInReservation(sampleReservedTable);

    expect(mockReservationService.getActiveByTableId).toHaveBeenCalledWith('tbl-2');
    expect(mockReservationService.checkIn).toHaveBeenCalledWith('res-1');
    expect(mockToaster.success).toHaveBeenCalled();
    expect(mockCashierState.loadTables).toHaveBeenCalled();
  });

  it('should cancel reservation after confirmation and reload tables', () => {
    component.cancelReservation(sampleReservedTable);

    expect(mockConfirmation.warn).toHaveBeenCalled();
    expect(mockReservationService.getActiveByTableId).toHaveBeenCalledWith('tbl-2');
    expect(mockReservationService.cancel).toHaveBeenCalledWith('res-1');
    expect(mockToaster.success).toHaveBeenCalled();
    expect(mockCashierState.loadTables).toHaveBeenCalled();
  });

  it('should open table transfer modal when openTransferModal is called', () => {
    expect(component.isTransferModalOpen).toBe(false);
    expect(component.selectedTransferTable).toBeNull();

    component.openTransferModal(sampleOccupiedTable);

    expect(component.isTransferModalOpen).toBe(true);
    expect(component.selectedTransferTable?.id).toBe('tbl-3');
  });

  it('should open table merge modal when openMergeModal is called', () => {
    expect(component.isMergeModalOpen).toBe(false);
    expect(component.selectedPrimaryMergeTable).toBeNull();

    component.openMergeModal(sampleOccupiedTable);

    expect(component.isMergeModalOpen).toBe(true);
    expect(component.selectedPrimaryMergeTable?.id).toBe('tbl-3');
  });

  it('should finish cleaning and change status to Available', () => {
    const cleaningTable: CashierTableCard = {
      ...sampleAvailableTable,
      status: TableStatus.Cleaning,
    };

    component.finishCleaning(cleaningTable);

    expect(mockTableService.changeStatus).toHaveBeenCalledWith('tbl-1', TableStatus.Available);
    expect(mockToaster.success).toHaveBeenCalled();
    expect(mockCashierState.loadTables).toHaveBeenCalled();
  });
});
