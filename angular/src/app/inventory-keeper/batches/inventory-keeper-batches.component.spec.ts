/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ToasterService } from '@abp/ng.theme.shared';
import { InventoryKeeperBatchesComponent } from './inventory-keeper-batches.component';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { BarcodeScannerService } from '../services/barcode-scanner.service';
import { StorageType } from '../../proxy/inventories/models';

describe('InventoryKeeperBatchesComponent', () => {
  let component: InventoryKeeperBatchesComponent;
  let mockInventoryService: any;
  let mockSidebarService: any;
  let mockAlertStateService: any;
  let mockBarcodeService: any;
  let mockToaster: any;

  const mockBatches = Array.from({ length: 25 }, (_, i) => ({
    id: `batch-${i + 1}`,
    batchCode: `BATCH-CODE-${i + 1}`,
    ingredientName: `Ingredient ${i + 1}`,
    storageType: StorageType.SHORT_TERM,
    remainingQuantity: 10,
    unitPrice: 50000,
    isActive: true,
    expiryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
  }));

  beforeEach(() => {
    mockInventoryService = {
      getBatches: vi.fn().mockReturnValue(of({ items: mockBatches, totalCount: 25 })),
      discardBatch: vi.fn().mockReturnValue(of({})),
      reactivateBatch: vi.fn().mockReturnValue(of({})),
    };

    mockSidebarService = new InventoryKeeperSidebarService();

    mockAlertStateService = {
      refreshed$: of(void 0),
      refreshAlerts: vi.fn(),
    };

    mockBarcodeService = {
      scanned$: new Subject(),
    };

    mockToaster = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: InventoryKeeperBatchesComponent, useClass: InventoryKeeperBatchesComponent },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: InventoryKeeperSidebarService, useValue: mockSidebarService },
        { provide: InventoryAlertStateService, useValue: mockAlertStateService },
        { provide: BarcodeScannerService, useValue: mockBarcodeService },
        { provide: ToasterService, useValue: mockToaster },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    });

    component = injector.get(InventoryKeeperBatchesComponent);
  });

  it('should initialize and load batches with 10 items per page pagination', () => {
    component.ngOnInit();
    expect(mockInventoryService.getBatches).toHaveBeenCalled();
    expect(component.allBatches().length).toBe(25);
    expect(component.pageSize()).toBe(10);
    expect(component.totalBatches()).toBe(25);
    expect(component.totalPages()).toBe(3);
    expect(component.currentPage()).toBe(1);
    expect(component.pagedBatches().length).toBe(10);
    expect(component.fromRecord()).toBe(1);
    expect(component.toRecord()).toBe(10);
  });

  it('should navigate between pages correctly', () => {
    component.allBatches.set(mockBatches as any);

    component.nextPage();
    expect(component.currentPage()).toBe(2);
    expect(component.pagedBatches().length).toBe(10);
    expect(component.fromRecord()).toBe(11);
    expect(component.toRecord()).toBe(20);

    component.lastPage();
    expect(component.currentPage()).toBe(3);
    expect(component.pagedBatches().length).toBe(5);
    expect(component.fromRecord()).toBe(21);
    expect(component.toRecord()).toBe(25);

    component.prevPage();
    expect(component.currentPage()).toBe(2);

    component.firstPage();
    expect(component.currentPage()).toBe(1);
  });

  it('should reset to page 1 on search or filter', () => {
    component.allBatches.set(mockBatches as any);
    component.goToPage(3);
    expect(component.currentPage()).toBe(3);

    component.onSearchInput('BATCH-CODE-1');
    expect(component.currentPage()).toBe(1);

    component.goToPage(2);
    component.clearSearch();
    expect(component.currentPage()).toBe(1);
  });
});
