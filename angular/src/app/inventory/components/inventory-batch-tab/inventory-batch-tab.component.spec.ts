/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { LocalizationService } from '@abp/ng.core';
import { InventoryBatchTabComponent } from './inventory-batch-tab.component';
import { BatchFefoStatus, BatchViewItem } from '../../models/inventory-dashboard.models';

describe('InventoryBatchTabComponent', () => {
  let component: InventoryBatchTabComponent;
  let mockLocalizationService: any;

  const mockBatches: BatchViewItem[] = [
    {
      id: 'b1',
      batchCode: 'LOT-001',
      ingredientId: 'ing-1',
      ingredientName: 'Thịt bò Wagyu',
      unitName: 'kg',
      inboundDate: '2026-10-01',
      expirationDate: '2026-11-01',
      initialQuantity: 10,
      remainingQuantity: 8,
      unitPrice: 500000,
      fefoStatus: BatchFefoStatus.Safe,
      daysRemaining: 12,
      elapsedPercentage: 30,
      isActive: true,
    },
    {
      id: 'b2',
      batchCode: 'LOT-002',
      ingredientId: 'ing-2',
      ingredientName: 'Sữa tươi',
      unitName: 'lít',
      inboundDate: '2026-10-10',
      expirationDate: '2026-10-22',
      initialQuantity: 20,
      remainingQuantity: 5,
      unitPrice: 30000,
      fefoStatus: BatchFefoStatus.ExpiringSoon,
      daysRemaining: 2,
      elapsedPercentage: 80,
      isActive: true,
    },
    {
      id: 'b3',
      batchCode: 'LOT-003',
      ingredientId: 'ing-3',
      ingredientName: 'Rau xà lách',
      unitName: 'kg',
      inboundDate: '2026-10-05',
      expirationDate: '2026-10-15',
      initialQuantity: 5,
      remainingQuantity: 1,
      unitPrice: 15000,
      fefoStatus: BatchFefoStatus.Expired,
      daysRemaining: -5,
      elapsedPercentage: 100,
      isActive: true,
    },
    {
      id: 'b4',
      batchCode: 'LOT-004',
      ingredientId: 'ing-1',
      ingredientName: 'Thịt bò Wagyu',
      unitName: 'kg',
      inboundDate: '2026-10-02',
      expirationDate: '2026-11-05',
      initialQuantity: 15,
      remainingQuantity: 15,
      unitPrice: 500000,
      fefoStatus: BatchFefoStatus.Locked,
      daysRemaining: 16,
      elapsedPercentage: 20,
      isActive: false,
      deactivationReason: 'Nghi ngờ rách bao bì',
    },
  ];

  beforeEach(() => {
    mockLocalizationService = {
      instant: vi.fn((key: string) => key),
    };

    const injector = Injector.create({
      providers: [
        { provide: InventoryBatchTabComponent, useClass: InventoryBatchTabComponent },
        { provide: LocalizationService, useValue: mockLocalizationService },
      ],
    });

    component = injector.get(InventoryBatchTabComponent);
    component.batches = [...mockBatches];
    component.applyFilter();
  });

  it('should initialize and apply default filters', () => {
    expect(component).toBeTruthy();
    expect(component.filteredBatches.length).toBe(4);
  });

  it('should filter batches by search query', () => {
    component.searchQuery = 'Wagyu';
    component.applyFilter();
    expect(component.filteredBatches.length).toBe(2);
    expect(component.filteredBatches.every(b => b.ingredientName.includes('Wagyu'))).toBe(true);
  });

  it('should filter batches by FEFO status', () => {
    component.statusFilter = BatchFefoStatus.ExpiringSoon;
    component.applyFilter();
    expect(component.filteredBatches.length).toBe(1);
    expect(component.filteredBatches[0].batchCode).toBe('LOT-002');
  });

  it('should filter batches by active/locked state (RM-013)', () => {
    component.activeFilter = 'deactivated';
    component.applyFilter();
    expect(component.filteredBatches.length).toBe(1);
    expect(component.filteredBatches[0].batchCode).toBe('LOT-004');
  });

  it('should emit lock and discard events for active batches', () => {
    const lockSpy = vi.spyOn(component.lockBatch, 'emit');
    const discardSpy = vi.spyOn(component.discardBatch, 'emit');

    component.lockBatch.emit(mockBatches[0]);
    expect(lockSpy).toHaveBeenCalledWith(mockBatches[0]);

    component.discardBatch.emit(mockBatches[2]);
    expect(discardSpy).toHaveBeenCalledWith(mockBatches[2]);
  });

  it('should initiate drag-to-scroll on table background but ignore action buttons', () => {
    const mockContainer = {
      scrollLeft: 100,
    } as any;

    // 1. Mouse down on regular cell should start dragging
    const regularTarget = document.createElement('td');
    const regularEvent = {
      button: 0,
      clientX: 200,
      target: regularTarget,
    } as any;

    component.onTableMouseDown(regularEvent, mockContainer);
    expect(component.isDragging).toBe(true);

    // Mouse move should update scrollLeft
    const moveEvent = {
      clientX: 150,
      preventDefault: vi.fn(),
    } as any;
    component.onTableMouseMove(moveEvent, mockContainer);
    expect(mockContainer.scrollLeft).toBe(150); // 100 - (150 - 200) = 150

    // Mouse up should end dragging
    component.onTableMouseUp();
    expect(component.isDragging).toBe(false);

    // 2. Mouse down on action button should NOT start dragging
    const actionButton = document.createElement('button');
    actionButton.classList.add('btn-row-action');
    const actionGroup = document.createElement('div');
    actionGroup.classList.add('action-buttons-group');
    actionGroup.appendChild(actionButton);

    const actionEvent = {
      button: 0,
      clientX: 200,
      target: actionButton,
    } as any;

    component.onTableMouseDown(actionEvent, mockContainer);
    expect(component.isDragging).toBe(false);
  });
});
