/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { of } from 'rxjs';
import { ToasterService } from '@abp/ng.theme.shared';
import { CreateBatchModalComponent } from './create-batch-modal.component';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { StorageType } from '../../proxy/inventories/models';

describe('CreateBatchModalComponent', () => {
  let component: CreateBatchModalComponent;
  let mockIngredientService: any;
  let mockInventoryService: any;
  let mockToaster: any;

  const mockIngredients = [
    { id: 'ing-1', name: 'Paprika', code: 'PAP', currentStock: 49.96, baseUnit: 'kg', storageType: StorageType.SHORT_TERM },
    { id: 'ing-2', name: 'Tiêu đen', code: 'PEPPER', currentStock: 5050, baseUnit: 'g', storageType: StorageType.LONG_TERM },
    { id: 'ing-3', name: 'Chanh', code: 'LEMON', currentStock: 0, baseUnit: 'kg', storageType: StorageType.FRESH },
  ];

  beforeEach(() => {
    mockIngredientService = {
      getList: vi.fn().mockReturnValue(of({ items: mockIngredients, totalCount: 3 })),
    };
    mockInventoryService = {
      createBatch: vi.fn().mockReturnValue(of({ id: 'batch-1', batchCode: 'LOT-123' })),
    };
    mockToaster = {
      success: vi.fn(),
      error: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: CreateBatchModalComponent, useClass: CreateBatchModalComponent },
        { provide: IngredientService, useValue: mockIngredientService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ToasterService, useValue: mockToaster },
      ],
    });

    component = injector.get(CreateBatchModalComponent);
  });

  it('should initialize and load ingredients', () => {
    component.ngOnInit();
    expect(mockIngredientService.getList).toHaveBeenCalled();
    expect(component.ingredients.length).toBe(3);
    expect(component.selectedIngredient?.name).toBe('Paprika');
  });

  it('should filter ingredients based on search keyword', () => {
    component.ingredients = mockIngredients as any;

    component.searchKeyword = 'tiêu';
    expect(component.filteredIngredients.length).toBe(1);
    expect(component.filteredIngredients[0].name).toBe('Tiêu đen');

    component.searchKeyword = 'LEMON';
    expect(component.filteredIngredients.length).toBe(1);
    expect(component.filteredIngredients[0].code).toBe('LEMON');

    component.searchKeyword = 'không có';
    expect(component.filteredIngredients.length).toBe(0);
  });

  it('should toggle dropdown and select ingredient correctly', () => {
    component.ingredients = mockIngredients as any;
    const dummyEvent = { stopPropagation: vi.fn() } as any;

    expect(component.isDropdownOpen).toBe(false);
    component.toggleDropdown(dummyEvent);
    expect(component.isDropdownOpen).toBe(true);
    expect(dummyEvent.stopPropagation).toHaveBeenCalled();

    component.selectIngredient(mockIngredients[1] as any, dummyEvent);
    expect(component.isDropdownOpen).toBe(false);
    expect(component.batchModel.ingredientId).toBe('ing-2');
    expect(component.selectedIngredient?.name).toBe('Tiêu đen');
    expect(component.batchModel.storageType).toBe(StorageType.LONG_TERM);
  });

  it('should set expiry date to today and isFresh to true when selecting fresh ingredient', () => {
    component.ingredients = mockIngredients as any;
    const dummyEvent = { stopPropagation: vi.fn() } as any;
    const todayStr = component.getTodayDateString();

    // Select FRESH ingredient (ing-3: Chanh)
    component.selectIngredient(mockIngredients[2] as any, dummyEvent);
    expect(component.isFresh).toBe(true);
    expect(component.batchModel.expiryDate).toBe(todayStr);

    // Switch back to SHORT_TERM (ing-1: Paprika)
    component.selectIngredient(mockIngredients[0] as any, dummyEvent);
    expect(component.isFresh).toBe(false);
    expect(component.batchModel.expiryDate).toBe(component.getDefaultExpiryDateString());
  });

  it('should default expiry date to today on modal open if first ingredient is fresh', () => {
    component.ingredients = [mockIngredients[2]] as any; // Chanh (FRESH)
    component.onModalOpen();

    expect(component.isFresh).toBe(true);
    expect(component.batchModel.expiryDate).toBe(component.getTodayDateString());
  });

  it('should update expiry date to today when storageType is changed to FRESH', () => {
    component.ingredients = mockIngredients as any;
    component.onModalOpen(); // first is ing-1 (SHORT_TERM)
    expect(component.isFresh).toBe(false);

    component.onStorageTypeChange(StorageType.FRESH);
    expect(component.isFresh).toBe(true);
    expect(component.batchModel.expiryDate).toBe(component.getTodayDateString());

    component.onStorageTypeChange(StorageType.LONG_TERM);
    expect(component.isFresh).toBe(false);
    expect(component.batchModel.expiryDate).toBe(component.getDefaultExpiryDateString());
  });

  it('should submit batch and emit created event', () => {
    const createdSpy = vi.spyOn(component.created, 'emit');
    component.onModalOpen();
    component.batchModel.ingredientId = 'ing-1';
    component.batchModel.batchCode = 'LOT-TEST-001';

    component.submit();
    expect(mockInventoryService.createBatch).toHaveBeenCalled();
    expect(mockToaster.success).toHaveBeenCalled();
    expect(createdSpy).toHaveBeenCalled();
    expect(component.visible).toBe(false);
  });
});
