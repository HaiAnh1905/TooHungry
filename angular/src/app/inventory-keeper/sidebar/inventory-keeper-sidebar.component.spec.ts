/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryKeeperSidebarComponent } from './inventory-keeper-sidebar.component';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { StorageConditionType, BatchStatusFilterType } from '../models/inventory-keeper.models';

describe('InventoryKeeperSidebarComponent', () => {
  let component: InventoryKeeperSidebarComponent;
  let sidebarService: InventoryKeeperSidebarService;
  let mockAlertStateService: any;
  let mockRouter: any;

  beforeEach(() => {
    sidebarService = new InventoryKeeperSidebarService();
    mockAlertStateService = {
      kpiSummary: vi.fn().mockReturnValue({
        expiringSoonCount: 3,
        lowStockCount: 2,
        expiredCount: 1,
        lastUpdated: new Date(),
      }),
    };
    mockRouter = {
      navigate: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: InventoryKeeperSidebarComponent, useClass: InventoryKeeperSidebarComponent },
        { provide: InventoryKeeperSidebarService, useValue: sidebarService },
        { provide: InventoryAlertStateService, useValue: mockAlertStateService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    component = injector.get(InventoryKeeperSidebarComponent);
  });

  it('should default to dashboard activeTab', () => {
    expect(component.activeTab).toBe('dashboard');
  });

  it('should open camera modal via sidebar service', () => {
    expect(sidebarService.isCameraModalOpen()).toBe(false);
    component.openCameraModal();
    expect(sidebarService.isCameraModalOpen()).toBe(true);
  });

  it('should navigate to batches with filter when clicking shortcut in dashboard', () => {
    component.goToBatchesWithFilter('ExpiringSoon');
    expect(sidebarService.batchesStatus()).toBe(BatchStatusFilterType.ExpiringSoon);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory-keeper/batches'], {
      queryParams: { status: 'ExpiringSoon' },
    });
    expect(sidebarService.isMobileDrawerOpen()).toBe(false);

    component.goToBatchesWithFilter('All');
    expect(sidebarService.batchesStatus()).toBe(BatchStatusFilterType.All);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory-keeper/batches'], {
      queryParams: {},
    });
  });

  it('should redirect to batches on dashboard search input if non-empty', () => {
    component.onDashboardSearchInput('batch-123');
    expect(sidebarService.batchesSearchTerm()).toBe('batch-123');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory-keeper/batches'], {
      queryParams: { search: 'batch-123' },
    });
  });

  it('should update batches filters and search', () => {
    component.onBatchesSearchInput('test-batch');
    expect(sidebarService.batchesSearchTerm()).toBe('test-batch');

    component.clearBatchesSearch();
    expect(sidebarService.batchesSearchTerm()).toBe('');

    component.setCondition(StorageConditionType.Chilled);
    expect(sidebarService.batchesCondition()).toBe(StorageConditionType.Chilled);

    component.setStatus(BatchStatusFilterType.Expired);
    expect(sidebarService.batchesStatus()).toBe(BatchStatusFilterType.Expired);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory-keeper/batches'], {
      queryParams: { status: BatchStatusFilterType.Expired },
      queryParamsHandling: 'merge',
    });
  });

  it('should update transactions filters and ingredient selection', () => {
    const mockIng = { id: 'ing-1', name: 'Bò Úc', code: 'BEEF', currentStock: 10, baseUnit: 'kg' } as any;

    component.onTransactionsSearchInput('TX-1');
    expect(sidebarService.transactionsSearchQuery()).toBe('TX-1');

    component.clearTransactionsSearch();
    expect(sidebarService.transactionsSearchQuery()).toBe('');

    component.setTypeFilter(1);
    expect(sidebarService.transactionsTypeFilter()).toBe(1);

    const event = { stopPropagation: vi.fn() } as any;
    component.selectIngredient(mockIng, event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(sidebarService.selectedIngredientId()).toBe('ing-1');
    expect(sidebarService.isIngredientDropdownOpen()).toBe(false);
  });
});
