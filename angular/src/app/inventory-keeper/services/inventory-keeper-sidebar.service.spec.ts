/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryKeeperSidebarService } from './inventory-keeper-sidebar.service';
import { StorageConditionType, BatchStatusFilterType } from '../models/inventory-keeper.models';

describe('InventoryKeeperSidebarService', () => {
  let service: InventoryKeeperSidebarService;

  beforeEach(() => {
    service = new InventoryKeeperSidebarService();
  });

  it('should set and clear template immediately', () => {
    const mockTemplate = { id: 'template-1' } as any;

    service.setTemplate(mockTemplate);
    expect(service.currentTemplate()).toBe(mockTemplate);

    service.clearTemplate();
    expect(service.currentTemplate()).toBeNull();
  });

  it('should toggle and set mobile drawer open state', () => {
    expect(service.isMobileDrawerOpen()).toBe(false);

    service.setMobileDrawerOpen(true);
    expect(service.isMobileDrawerOpen()).toBe(true);

    service.toggleMobileDrawer();
    expect(service.isMobileDrawerOpen()).toBe(false);
  });

  it('should manage batches filter signals and clear search', () => {
    expect(service.batchesSearchTerm()).toBe('');
    expect(service.batchesCondition()).toBe(StorageConditionType.All);
    expect(service.batchesStatus()).toBe(BatchStatusFilterType.All);

    service.setBatchesSearch('LOT-123');
    expect(service.batchesSearchTerm()).toBe('LOT-123');

    service.clearBatchesSearch();
    expect(service.batchesSearchTerm()).toBe('');

    service.setBatchesCondition(StorageConditionType.Chilled);
    expect(service.batchesCondition()).toBe(StorageConditionType.Chilled);

    service.setBatchesStatus(BatchStatusFilterType.ExpiringSoon);
    expect(service.batchesStatus()).toBe(BatchStatusFilterType.ExpiringSoon);
  });

  it('should manage transactions filters and ingredient selection', () => {
    const mockIngredients = [
      { id: 'ing-1', name: 'Thịt bò Úc', code: 'ING-BEEF', currentStock: 10, baseUnit: 'kg' },
      { id: 'ing-2', name: 'Bột mì đa dụng', code: 'ING-FLOUR', currentStock: 50, baseUnit: 'kg' },
    ];

    service.setIngredients(mockIngredients as any);
    expect(service.ingredients().length).toBe(2);

    service.setSelectedIngredientId('ing-1');
    expect(service.selectedIngredient()?.name).toBe('Thịt bò Úc');

    // Filter ingredients
    service.setIngredientSearchText('bột');
    expect(service.filteredIngredients().length).toBe(1);
    expect(service.filteredIngredients()[0].id).toBe('ing-2');

    service.clearIngredientSearch();
    expect(service.filteredIngredients().length).toBe(2);

    // Toggle dropdown
    expect(service.isIngredientDropdownOpen()).toBe(false);
    service.toggleIngredientDropdown();
    expect(service.isIngredientDropdownOpen()).toBe(true);
    service.setIngredientDropdownOpen(false);
    expect(service.isIngredientDropdownOpen()).toBe(false);

    // Transaction search and type filter
    service.setTransactionsSearch('TX-999');
    expect(service.transactionsSearchQuery()).toBe('TX-999');
    service.clearTransactionsSearch();
    expect(service.transactionsSearchQuery()).toBe('');

    service.setTransactionsTypeFilter(2);
    expect(service.transactionsTypeFilter()).toBe(2);
  });

  it('should open and close camera modal', () => {
    expect(service.isCameraModalOpen()).toBe(false);

    service.openCameraModal();
    expect(service.isCameraModalOpen()).toBe(true);

    service.closeCameraModal();
    expect(service.isCameraModalOpen()).toBe(false);
  });
});
