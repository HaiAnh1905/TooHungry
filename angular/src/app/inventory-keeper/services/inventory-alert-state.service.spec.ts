import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { of } from 'rxjs';
import { InventoryAlertStateService } from './inventory-alert-state.service';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { InventoryAlertDto, InventoryBatchDto } from '../../proxy/inventories/models';

describe('InventoryAlertStateService', () => {
  let service: InventoryAlertStateService;
  let mockInventoryService: {
    getAlerts: ReturnType<typeof vi.fn>;
    getBatches: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockInventoryService = {
      getAlerts: vi.fn(),
      getBatches: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: InventoryAlertStateService, useClass: InventoryAlertStateService },
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    });

    service = injector.get(InventoryAlertStateService);
  });

  it('should calculate KPI summary correctly when alerts and batches are fetched', async () => {
    const today = new Date();
    const expiredDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const expiringSoonDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const safeDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const mockBatches: InventoryBatchDto[] = [
      {
        id: '1',
        ingredientId: 'ing-1',
        batchCode: 'B-EXPIRED',
        receivedAt: new Date().toISOString(),
        expiryDate: expiredDate,
        initialQuantity: 10,
        remainingQuantity: 10,
        storageType: 1,
        isCleared: false,
        isActive: true,
        unitPrice: 10000,
      },
      {
        id: '2',
        ingredientId: 'ing-2',
        batchCode: 'B-EXPIRING-SOON',
        receivedAt: new Date().toISOString(),
        expiryDate: expiringSoonDate,
        initialQuantity: 15,
        remainingQuantity: 15,
        storageType: 1,
        isCleared: false,
        isActive: true,
        unitPrice: 20000,
      },
      {
        id: '3',
        ingredientId: 'ing-3',
        batchCode: 'B-SAFE',
        receivedAt: new Date().toISOString(),
        expiryDate: safeDate,
        initialQuantity: 50,
        remainingQuantity: 50,
        storageType: 2,
        isCleared: false,
        isActive: true,
        unitPrice: 5000,
      },
    ];

    const mockAlerts: InventoryAlertDto[] = [
      {
        ingredientId: 'ing-1',
        alertType: 'LOW_STOCK',
        message: 'Ingredient low stock',
      },
    ];

    mockInventoryService.getAlerts.mockReturnValue(of(mockAlerts));
    mockInventoryService.getBatches.mockReturnValue(of({ items: mockBatches, totalCount: 3 }));

    await service.refreshAlerts();

    const kpi = service.kpiSummary();
    expect(kpi.expiredCount).toBe(1);
    expect(kpi.expiringSoonCount).toBe(1);
    expect(kpi.lowStockCount).toBe(1);
    expect(kpi.totalActiveBatchesCount).toBe(3);
  });
});
