/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryStateService } from './inventory-state.service';
import { IngredientDto } from '../../proxy/ingredients/models';
import { InventoryBatchDto, StorageType } from '../../proxy/inventories/models';
import { BatchFefoStatus } from '../models/inventory-dashboard.models';

describe('InventoryStateService', () => {
  let service: InventoryStateService;

  beforeEach(() => {
    service = new InventoryStateService();
  });

  it('should be created with initial default signals', () => {
    expect(service).toBeTruthy();
    expect(service.activeTab()).toBe('ingredients');
    expect(service.kpiSummary().totalIngredients).toBe(0);
  });

  describe('mapBatchDtoToViewItem', () => {
    it('should classify batch as Safe when expiry date is > 7 days ahead', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);

      const batchDto: InventoryBatchDto = {
        id: 'b1',
        batchCode: 'LOT-SAFE',
        ingredientId: 'ing-1',
        ingredientName: 'Thịt bò',
        receivedAt: new Date().toISOString(),
        initialQuantity: 10,
        remainingQuantity: 10,
        unitPrice: 200000,
        expiryDate: futureDate.toISOString(),
        isActive: true,
        isCleared: false,
        storageType: StorageType.SHORT_TERM,
      };

      const result = service.mapBatchDtoToViewItem(batchDto);
      expect(result.fefoStatus).toBe(BatchFefoStatus.Safe);
      expect(result.daysRemaining).toBeGreaterThan(7);
      expect(result.isActive).toBe(true);
    });

    it('should classify batch as ExpiringSoon when expiry is within 7 days', () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 3);

      const batchDto: InventoryBatchDto = {
        id: 'b2',
        batchCode: 'LOT-SOON',
        ingredientId: 'ing-1',
        ingredientName: 'Thịt bò',
        receivedAt: new Date().toISOString(),
        initialQuantity: 10,
        remainingQuantity: 5,
        unitPrice: 200000,
        expiryDate: nearDate.toISOString(),
        isActive: true,
        isCleared: false,
        storageType: StorageType.SHORT_TERM,
      };

      const result = service.mapBatchDtoToViewItem(batchDto);
      expect(result.fefoStatus).toBe(BatchFefoStatus.ExpiringSoon);
      expect(result.daysRemaining).toBeLessThanOrEqual(7);
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    it('should classify batch as Expired when expiry date has passed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const batchDto: InventoryBatchDto = {
        id: 'b3',
        batchCode: 'LOT-EXPIRED',
        ingredientId: 'ing-1',
        ingredientName: 'Thịt bò',
        receivedAt: new Date().toISOString(),
        initialQuantity: 10,
        remainingQuantity: 2,
        unitPrice: 200000,
        expiryDate: pastDate.toISOString(),
        isActive: true,
        isCleared: false,
        storageType: StorageType.SHORT_TERM,
      };

      const result = service.mapBatchDtoToViewItem(batchDto);
      expect(result.fefoStatus).toBe(BatchFefoStatus.Expired);
      expect(result.daysRemaining).toBeLessThanOrEqual(0);
    });

    it('should classify batch as Locked when isActive is false (RM-013)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);

      const batchDto: InventoryBatchDto = {
        id: 'b4',
        batchCode: 'LOT-LOCKED',
        ingredientId: 'ing-1',
        ingredientName: 'Thịt bò',
        receivedAt: new Date().toISOString(),
        initialQuantity: 10,
        remainingQuantity: 10,
        unitPrice: 200000,
        expiryDate: futureDate.toISOString(),
        isActive: false,
        isCleared: false,
        storageType: StorageType.SHORT_TERM,
        deactivationReason: 'Kiểm định chất lượng',
      };

      const result = service.mapBatchDtoToViewItem(batchDto);
      expect(result.fefoStatus).toBe(BatchFefoStatus.Locked);
      expect(result.isActive).toBe(false);
      expect(result.deactivationReason).toBe('Kiểm định chất lượng');
    });
  });

  describe('calculateKpiSummary', () => {
    it('should accurately calculate total, safe, low stock ingredients and expired batches count', () => {
      const ingredients: IngredientDto[] = [
        { id: '1', name: 'Gạo', currentStock: 50, minStock: 20 } as any,
        { id: '2', name: 'Đường', currentStock: 5, minStock: 10 } as any,
        { id: '3', name: 'Muối', currentStock: 0, minStock: 5 } as any,
      ];

      const batches = [
        { id: 'b1', fefoStatus: BatchFefoStatus.Safe, remainingQuantity: 10, unitPrice: 10000 } as any,
        { id: 'b2', fefoStatus: BatchFefoStatus.Expired, remainingQuantity: 5, unitPrice: 20000 } as any,
        { id: 'b3', fefoStatus: BatchFefoStatus.Expired, remainingQuantity: 0, unitPrice: 20000 } as any,
      ];

      const kpi = service.calculateKpiSummary(ingredients, batches);
      expect(kpi.totalIngredients).toBe(3);
      expect(kpi.safeIngredients).toBe(1);
      expect(kpi.lowStockIngredients).toBe(2);
      expect(kpi.expiredBatchesCount).toBe(1);
      expect(kpi.estimatedTotalValue).toBe(200000);
    });
  });

  describe('generateReplenishmentSuggestions', () => {
    it('should generate suggestions for ingredients below minStock', () => {
      const ingredients: IngredientDto[] = [
        { id: '1', name: 'Gạo', currentStock: 50, minStock: 20, unitName: 'kg' } as any,
        { id: '2', name: 'Đường', currentStock: 3, minStock: 10, unitName: 'kg' } as any,
      ];

      const suggestions = service.generateReplenishmentSuggestions(ingredients);
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].ingredientId).toBe('2');
      expect(suggestions[0].ingredientName).toBe('Đường');
      expect(suggestions[0].suggestedQuantity).toBeGreaterThan(0);
    });
  });
});
