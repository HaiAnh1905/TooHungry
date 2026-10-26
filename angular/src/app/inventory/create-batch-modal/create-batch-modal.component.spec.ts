/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { of } from 'rxjs';
import { ToasterService } from '@abp/ng.theme.shared';
import { CreateInventoryBatchModalComponent } from './create-batch-modal.component';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { StorageType } from '../../proxy/inventories/models';

describe('CreateInventoryBatchModalComponent', () => {
  let component: CreateInventoryBatchModalComponent;
  let mockIngredientService: any;
  let mockInventoryService: any;
  let mockToaster: any;

  const mockIngredients: any[] = [
    { id: 'ing-1', name: 'Thịt bò', baseUnit: 'kg', unitName: 'kg', storageType: StorageType.SHORT_TERM },
    { id: 'ing-2', name: 'Rau tươi', baseUnit: 'kg', unitName: 'kg', storageType: StorageType.FRESH },
  ];

  beforeEach(() => {
    mockIngredientService = {
      getList: vi.fn().mockReturnValue(of({ items: mockIngredients, totalCount: 2 })),
    };
    mockInventoryService = {
      createBatch: vi.fn().mockReturnValue(of({ id: 'batch-new', batchCode: 'LOT-TEST' })),
    };
    mockToaster = {
      success: vi.fn(),
      error: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: CreateInventoryBatchModalComponent, useClass: CreateInventoryBatchModalComponent },
        { provide: IngredientService, useValue: mockIngredientService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ToasterService, useValue: mockToaster },
      ],
    });

    component = injector.get(CreateInventoryBatchModalComponent);
  });

  it('should create and load ingredients', () => {
    expect(component).toBeTruthy();
    component.loadIngredients();
    expect(mockIngredientService.getList).toHaveBeenCalled();
    expect(component.ingredients.length).toBe(2);
  });

  it('should auto-generate batch code and calculate estimated total', () => {
    component.ingredients = [...mockIngredients] as any;
    component.visible = true;
    component.initForm();

    expect(component.batchModel.batchCode).toContain('LOT-');
    component.batchModel.initialQuantity = 5;
    component.batchModel.unitPrice = 100000;
    expect(component.estimatedTotal).toBe(500000);
  });

  it('should call createBatch on submit with valid model', () => {
    component.ingredients = [...mockIngredients] as any;
    component.visible = true;
    component.initForm();
    component.batchModel.ingredientId = 'ing-1';
    component.batchModel.batchCode = 'LOT-001';
    component.batchModel.initialQuantity = 10;
    component.batchModel.unitPrice = 50000;

    component.submit();

    expect(mockInventoryService.createBatch).toHaveBeenCalled();
  });
});
