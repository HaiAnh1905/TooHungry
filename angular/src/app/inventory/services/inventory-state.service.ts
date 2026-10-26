import { Injectable, computed, signal } from '@angular/core';
import { IngredientDto } from '../../proxy/ingredients/models';
import { InventoryAlertDto, InventoryBatchDto, StorageType } from '../../proxy/inventories/models';
import {
  BatchFefoStatus,
  BatchViewItem,
  DashboardInventoryKpiSummary,
  InventoryTabType,
  ReplenishmentSuggestionItem,
  StorageFilterType,
} from '../models/inventory-dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class InventoryStateService {
  // Signals State
  readonly activeTab = signal<InventoryTabType>('ingredients');
  readonly searchQuery = signal<string>('');
  readonly selectedStorage = signal<StorageFilterType>(StorageFilterType.All);
  readonly isLoading = signal<boolean>(false);

  readonly ingredients = signal<IngredientDto[]>([]);
  readonly batches = signal<BatchViewItem[]>([]);
  readonly alerts = signal<InventoryAlertDto[]>([]);
  readonly replenishmentSuggestions = signal<ReplenishmentSuggestionItem[]>([]);

  readonly kpiSummary = signal<DashboardInventoryKpiSummary>({
    totalIngredients: 0,
    safeIngredients: 0,
    lowStockIngredients: 0,
    expiredBatchesCount: 0,
    estimatedTotalValue: 0,
  });

  // Computed Signals
  readonly hasExpiringAlerts = computed(() => this.kpiSummary().expiredBatchesCount > 0);
  readonly hasLowStockAlerts = computed(() => this.kpiSummary().lowStockIngredients > 0);
  readonly totalAlertsCount = computed(() => this.alerts().length);

  /**
   * Chuyển đổi InventoryBatchDto sang BatchViewItem với trạng thái FEFO tính toán thời gian thực
   */
  mapBatchDtoToViewItem(batch: InventoryBatchDto, ingredientMap?: Map<string, IngredientDto>): BatchViewItem {
    if (!batch) {
      return {
        id: '',
        batchCode: '',
        ingredientId: '',
        ingredientName: '',
        unitName: '',
        inboundDate: '',
        expirationDate: '',
        initialQuantity: 0,
        remainingQuantity: 0,
        unitPrice: 0,
        fefoStatus: BatchFefoStatus.Safe,
        daysRemaining: 999,
        elapsedPercentage: 0,
        isActive: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysRemaining = 999;
    let elapsedPercentage = 0;
    let fefoStatus: BatchFefoStatus = BatchFefoStatus.Safe;

    if (batch.expiryDate) {
      const expDate = new Date(batch.expiryDate);
      if (!isNaN(expDate.getTime())) {
        expDate.setHours(0, 0, 0, 0);
        const diffMs = expDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (batch.receivedAt) {
          const recvDate = new Date(batch.receivedAt);
          if (!isNaN(recvDate.getTime())) {
            recvDate.setHours(0, 0, 0, 0);
            const totalDurationMs = expDate.getTime() - recvDate.getTime();
            const elapsedMs = today.getTime() - recvDate.getTime();
            if (totalDurationMs > 0) {
              elapsedPercentage = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));
            }
          }
        }
      }
    }

    if (batch.isActive === false) {
      fefoStatus = BatchFefoStatus.Locked;
    } else if (daysRemaining <= 0) {
      fefoStatus = BatchFefoStatus.Expired;
    } else if (daysRemaining <= 7) {
      fefoStatus = BatchFefoStatus.ExpiringSoon;
    } else {
      fefoStatus = BatchFefoStatus.Safe;
    }

    const matchedIngredient = batch.ingredientId ? ingredientMap?.get(batch.ingredientId) : undefined;
    const unitName = batch.purchaseUnit || matchedIngredient?.baseUnit || matchedIngredient?.unitName || '';

    return {
      id: batch.id || '',
      batchCode: batch.batchCode || '',
      ingredientId: batch.ingredientId || '',
      ingredientName: batch.ingredientName || matchedIngredient?.name || '',
      unitName,
      inboundDate: batch.receivedAt || '',
      expirationDate: batch.expiryDate || '',
      initialQuantity: batch.initialQuantity || 0,
      remainingQuantity: batch.remainingQuantity || 0,
      unitPrice: batch.unitPrice || 0,
      fefoStatus,
      daysRemaining,
      elapsedPercentage,
      isActive: batch.isActive !== false,
      deactivationReason: batch.deactivationReason,
      storageType: batch.storageType,
    };
  }

  /**
   * Tính toán lại 4 chỉ số KPI Bento
   */
  calculateKpiSummary(ingredients: IngredientDto[], batches: BatchViewItem[]): DashboardInventoryKpiSummary {
    const totalIngredients = ingredients.length;
    let safeIngredients = 0;
    let lowStockIngredients = 0;

    for (const ing of ingredients) {
      const current = ing.currentStock || 0;
      const min = ing.minStock || 0;
      if (current >= min) {
        safeIngredients++;
      } else {
        lowStockIngredients++;
      }
    }

    const expiredBatchesCount = batches.filter(
      b => b.fefoStatus === BatchFefoStatus.Expired && b.remainingQuantity > 0
    ).length;

    const estimatedTotalValue = batches.reduce(
      (sum, b) => sum + (b.remainingQuantity || 0) * (b.unitPrice || 0),
      0
    );

    return {
      totalIngredients,
      safeIngredients,
      lowStockIngredients,
      expiredBatchesCount,
      estimatedTotalValue,
    };
  }

  /**
   * Đề xuất bổ sung kho dựa trên độ lệch giữa tồn khả dụng và định mức tối thiểu
   */
  generateReplenishmentSuggestions(ingredients: IngredientDto[]): ReplenishmentSuggestionItem[] {
    const lowStockItems = ingredients.filter(i => {
      const current = i.currentStock || 0;
      const min = i.minStock || 0;
      return current < min && i.isActive !== false;
    });

    return lowStockItems
      .map(i => {
        const current = i.currentStock || 0;
        const min = i.minStock || 0;
        // Số lượng gợi ý: bù đắp để đạt gấp đôi mức tối thiểu an toàn, tối thiểu là 5
        const target = min > 0 ? min * 2 : 10;
        const suggested = Math.max(5, Math.ceil(target - current));
        return {
          ingredientId: i.id,
          ingredientName: i.name,
          unitName: i.unitName || i.baseUnit || '',
          currentStock: current,
          forecastDemand: target,
          suggestedQuantity: suggested,
          estimatedUnitPrice: 0,
          storageType: i.storageType,
        };
      })
      .slice(0, 5);
  }
}
