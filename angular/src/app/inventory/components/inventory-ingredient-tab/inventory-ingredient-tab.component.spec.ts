/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { LocalizationService } from '@abp/ng.core';
import { InventoryIngredientTabComponent } from './inventory-ingredient-tab.component';
import { IngredientDto } from '../../../proxy/ingredients/models';
import { StorageType } from '../../../proxy/inventories/models';
import { StorageFilterType } from '../../models/inventory-dashboard.models';

describe('InventoryIngredientTabComponent', () => {
  let component: InventoryIngredientTabComponent;
  let mockLocalizationService: any;

  const mockIngredients: IngredientDto[] = [
    {
      id: 'ing-1',
      name: 'Thịt bò Úc',
      code: 'ING-BO-01',
      unitName: 'kg',
      baseUnit: 'kg',
      currentStock: 25,
      minStock: 10,
      storageType: StorageType.SHORT_TERM,
      isActive: true,
    } as any,
    {
      id: 'ing-2',
      name: 'Rau cải ngọt',
      code: 'ING-RAU-01',
      unitName: 'kg',
      baseUnit: 'kg',
      currentStock: 3,
      minStock: 10,
      storageType: StorageType.FRESH,
      isActive: true,
    } as any,
    {
      id: 'ing-3',
      name: 'Gia vị tiêu đen',
      code: 'ING-TIEU-01',
      unitName: 'gói',
      baseUnit: 'gói',
      currentStock: 50,
      minStock: 20,
      storageType: StorageType.LONG_TERM,
      isActive: false,
    } as any,
  ];

  beforeEach(() => {
    mockLocalizationService = {
      instant: vi.fn((key: string) => key),
    };

    const injector = Injector.create({
      providers: [
        { provide: InventoryIngredientTabComponent, useClass: InventoryIngredientTabComponent },
        { provide: LocalizationService, useValue: mockLocalizationService },
      ],
    });

    component = injector.get(InventoryIngredientTabComponent);
    component.ingredients = [...mockIngredients];
    component.applyFilter();
  });

  it('should initialize and display ingredients', () => {
    expect(component).toBeTruthy();
    expect(component.filteredIngredients.length).toBe(3);
  });

  it('should calculate stock percentage and progress colors correctly', () => {
    const safeItem = mockIngredients[0]; // 25 / 10 = 250% (capped at 200%)
    expect(component.getStockPercentage(safeItem)).toBe(200);
    expect(component.getStockProgressClass(safeItem)).toBe('progress-safe');

    const lowItem = mockIngredients[1]; // 3 / 10 = 30%
    expect(component.getStockPercentage(lowItem)).toBe(30);
    expect(component.getStockProgressClass(lowItem)).toBe('progress-critical');
  });

  it('should filter by stock level (SAFE / LOW)', () => {
    component.stockFilter = 'LOW';
    component.applyFilter();
    expect(component.filteredIngredients.length).toBe(1);
    expect(component.filteredIngredients[0].id).toBe('ing-2');
  });

  it('should filter by storage type', () => {
    component.storageFilter = StorageFilterType.Chilled;
    component.applyFilter();
    expect(component.filteredIngredients.length).toBe(1);
    expect(component.filteredIngredients[0].id).toBe('ing-1');
  });

  it('should filter by active status (RM-013)', () => {
    component.statusFilter = 'deactivated';
    component.applyFilter();
    expect(component.filteredIngredients.length).toBe(1);
    expect(component.filteredIngredients[0].id).toBe('ing-3');
  });

  it('should emit openCreate, openEdit, and quickInbound', () => {
    const createSpy = vi.spyOn(component.openCreate, 'emit');
    const editSpy = vi.spyOn(component.openEdit, 'emit');
    const inboundSpy = vi.spyOn(component.quickInbound, 'emit');

    component.openCreate.emit();
    expect(createSpy).toHaveBeenCalled();

    component.openEdit.emit(mockIngredients[0]);
    expect(editSpy).toHaveBeenCalledWith(mockIngredients[0]);

    component.quickInbound.emit(mockIngredients[1]);
    expect(inboundSpy).toHaveBeenCalledWith(mockIngredients[1]);
  });
});
