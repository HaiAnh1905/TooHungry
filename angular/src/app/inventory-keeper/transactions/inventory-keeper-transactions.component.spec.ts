/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { of, Subject } from 'rxjs';
import { ToasterService } from '@abp/ng.theme.shared';
import { InventoryKeeperTransactionsComponent } from './inventory-keeper-transactions.component';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { InventoryTransactionType } from '../../proxy/inventories/models';

describe('InventoryKeeperTransactionsComponent', () => {
  let component: InventoryKeeperTransactionsComponent;
  let mockInventoryService: any;
  let mockIngredientService: any;
  let mockToaster: any;
  let mockSidebarService: any;
  let mockAlertStateService: any;

  const mockIngredients = [
    { id: 'ing-1', name: 'Thịt bò Úc', code: 'ING-BEEF', currentStock: 10, baseUnit: 'kg' },
    { id: 'ing-2', name: 'Bột mì đa dụng', code: 'ING-FLOUR', currentStock: 50, baseUnit: 'kg' },
    { id: 'ing-3', name: 'Đường cát trắng', code: 'ING-SUGAR', currentStock: 25, baseUnit: 'kg' },
  ];

  const mockTransactions = [
    {
      id: 'tx-1',
      transactionType: InventoryTransactionType.IN,
      batchCode: 'LOT-2026-BEEF-01',
      quantity: 15,
      reason: 'Nhập hàng từ nhà cung cấp MeatWorld',
      creationTime: '2026-10-18T08:00:00Z',
    },
    {
      id: 'tx-2',
      transactionType: InventoryTransactionType.OUT,
      batchCode: 'LOT-2026-BEEF-01',
      quantity: 5,
      reason: 'Xuất kho cho Bếp trung tâm làm món Bò lúc lắc',
      creationTime: '2026-10-18T10:30:00Z',
    },
    {
      id: 'tx-3',
      transactionType: InventoryTransactionType.ADJUSTMENT_IN,
      batchCode: 'LOT-2026-BEEF-02',
      quantity: 2,
      reason: 'Kiểm kê thực tế thừa do cân sai số',
      creationTime: '2026-10-19T02:00:00Z',
    },
    {
      id: 'tx-4',
      transactionType: InventoryTransactionType.ADJUSTMENT_OUT,
      batchCode: 'LOT-2026-BEEF-01',
      quantity: 1,
      reason: 'Hao hụt rã đông tự nhiên',
      creationTime: '2026-10-19T03:00:00Z',
    },
  ];

  beforeEach(() => {
    mockInventoryService = {
      getTransactions: vi.fn().mockReturnValue(of({ items: mockTransactions, totalCount: mockTransactions.length })),
    };
    mockIngredientService = {
      getList: vi.fn().mockReturnValue(of({ items: mockIngredients, totalCount: 3 })),
    };
    mockToaster = {
      warn: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    mockSidebarService = {
      setTemplate: vi.fn(),
      clearTemplate: vi.fn(),
    };
    mockAlertStateService = {
      refreshAlerts: vi.fn(),
      refreshed$: new Subject(),
    };

    const injector = Injector.create({
      providers: [
        { provide: InventoryKeeperTransactionsComponent, useClass: InventoryKeeperTransactionsComponent },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: IngredientService, useValue: mockIngredientService },
        { provide: ToasterService, useValue: mockToaster },
        { provide: InventoryKeeperSidebarService, useValue: mockSidebarService },
        { provide: InventoryAlertStateService, useValue: mockAlertStateService },
      ],
    });

    component = injector.get(InventoryKeeperTransactionsComponent);
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize and load ingredients and transactions on ngOnInit', () => {
    component.ngOnInit();

    expect(mockSidebarService.setTemplate).toHaveBeenCalled();
    expect(mockIngredientService.getList).toHaveBeenCalled();
    expect(component.ingredients().length).toBe(3);
    expect(component.selectedIngredientId()).toBe('ing-1');
    expect(mockInventoryService.getTransactions).toHaveBeenCalledWith('ing-1');
    expect(component.rawTransactions().length).toBe(4);
    expect(component.filteredTransactions().length).toBe(4);
  });

  describe('Search functionality', () => {
    beforeEach(() => {
      component.ingredients.set(mockIngredients as any);
      component.selectedIngredientId.set('ing-1');
      component.rawTransactions.set(mockTransactions as any);
    });

    it('should filter transactions by batch code (case-insensitive)', () => {
      component.onSearchInput('beef-02');

      const filtered = component.filteredTransactions();
      expect(filtered.length).toBe(1);
      expect(filtered[0].batchCode).toBe('LOT-2026-BEEF-02');
    });

    it('should filter transactions by reason (case-insensitive)', () => {
      component.onSearchInput('Hao hụt');

      const filtered = component.filteredTransactions();
      expect(filtered.length).toBe(1);
      expect(filtered[0].reason).toContain('Hao hụt');
    });

    it('should return empty array if no transactions match search keyword', () => {
      component.onSearchInput('NonExistentKeywordXYZ');

      const filtered = component.filteredTransactions();
      expect(filtered.length).toBe(0);
    });

    it('should clear search keyword when clearSearch is called', () => {
      component.onSearchInput('test-query');
      expect(component.searchQuery()).toBe('test-query');

      component.clearSearch();
      expect(component.searchQuery()).toBe('');
      expect(component.filteredTransactions().length).toBe(4);
    });

    it('should combine type filter and search query correctly', () => {
      // Lọc giao dịch xuất kho (OUT = 2) và tìm từ khóa 'bếp'
      component.setTypeFilter(2);
      component.onSearchInput('bếp');

      const filtered = component.filteredTransactions();
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('tx-2');

      // Tìm từ khóa 'thịt' trong loại OUT -> 0 kết quả
      component.onSearchInput('MeatWorld');
      expect(component.filteredTransactions().length).toBe(0);
    });

    it('should filter audit transactions (type 3 includes ADJUSTMENT_IN and ADJUSTMENT_OUT)', () => {
      component.setTypeFilter(3);

      const filtered = component.filteredTransactions();
      expect(filtered.length).toBe(2);
      expect(filtered.map(t => t.id)).toEqual(['tx-3', 'tx-4']);
    });
  });

  describe('Custom searchable ingredient dropdown in sidebar', () => {
    beforeEach(() => {
      component.ingredients.set(mockIngredients as any);
      component.selectedIngredientId.set('ing-1');
      component.isIngredientDropdownOpen.set(false);
    });

    it('should toggle dropdown open state', () => {
      expect(component.isIngredientDropdownOpen()).toBe(false);

      const event = { stopPropagation: vi.fn() } as any;
      component.toggleIngredientDropdown(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isIngredientDropdownOpen()).toBe(true);

      component.closeIngredientDropdown();
      expect(component.isIngredientDropdownOpen()).toBe(false);
    });

    it('should filter ingredients by name or code when searching', () => {
      component.onIngredientSearchInput('bột');

      const filtered = component.filteredIngredients();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Bột mì đa dụng');
    });

    it('should reset ingredient search when clearIngredientSearch is called', () => {
      component.onIngredientSearchInput('đường');
      expect(component.filteredIngredients().length).toBe(1);

      const event = { stopPropagation: vi.fn() } as any;
      component.clearIngredientSearch(event);
      expect(component.filteredIngredients().length).toBe(3);
      expect(component.ingredientSearchText()).toBe('');
    });

    it('should select ingredient and close dropdown', () => {
      component.isIngredientDropdownOpen.set(true);
      const event = { stopPropagation: vi.fn() } as any;

      component.selectIngredient(mockIngredients[1] as any, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.selectedIngredientId()).toBe('ing-2');
      expect(component.isIngredientDropdownOpen()).toBe(false);
      expect(mockInventoryService.getTransactions).toHaveBeenCalledWith('ing-2');
    });

    it('should close dropdown on document click or Escape key', () => {
      component.isIngredientDropdownOpen.set(true);

      component.onDocumentClick();
      expect(component.isIngredientDropdownOpen()).toBe(false);

      component.isIngredientDropdownOpen.set(true);
      const escEvent = { key: 'Escape', preventDefault: vi.fn() } as any;
      component.handleKeyboardEvent(escEvent);
      expect(component.isIngredientDropdownOpen()).toBe(false);
    });
  });

  describe('Keyboard shortcut Ctrl+K', () => {
    it('should prevent default and focus input when Ctrl+K is pressed', () => {
      const mockInput = {
        focus: vi.fn(),
        select: vi.fn(),
      };
      component.searchInput = { nativeElement: mockInput } as any;

      const event = {
        ctrlKey: true,
        metaKey: false,
        key: 'k',
        preventDefault: vi.fn(),
      } as any;

      component.handleKeyboardEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockInput.focus).toHaveBeenCalled();
      expect(mockInput.select).toHaveBeenCalled();
    });
  });
});
