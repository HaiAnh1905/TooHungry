/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryKpiBarComponent } from './inventory-kpi-bar.component';

describe('InventoryKpiBarComponent', () => {
  let component: InventoryKpiBarComponent;

  beforeEach(() => {
    component = new InventoryKpiBarComponent();
    component.kpiSummary = {
      totalIngredients: 42,
      safeIngredients: 30,
      lowStockIngredients: 12,
      expiredBatchesCount: 3,
      estimatedTotalValue: 15000000,
    };
  });

  it('should initialize with provided KPI summary and default filter', () => {
    expect(component).toBeTruthy();
    expect(component.kpiSummary.totalIngredients).toBe(42);
    expect(component.kpiSummary.safeIngredients).toBe(30);
    expect(component.kpiSummary.lowStockIngredients).toBe(12);
    expect(component.kpiSummary.expiredBatchesCount).toBe(3);
    expect(component.activeFilter).toBe('all');
  });

  it('should emit selectKpi event onSelect', () => {
    const emitSpy = vi.spyOn(component.selectKpi, 'emit');

    component.onSelect('all');
    expect(emitSpy).toHaveBeenCalledWith('all');

    component.onSelect('safe');
    expect(emitSpy).toHaveBeenCalledWith('safe');

    component.onSelect('lowStock');
    expect(emitSpy).toHaveBeenCalledWith('lowStock');

    component.onSelect('expired');
    expect(emitSpy).toHaveBeenCalledWith('expired');
  });
});
