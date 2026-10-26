import {
  Component,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ElementRef,
  HostListener,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { Subscription } from 'rxjs';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { IngredientDto } from '../../proxy/ingredients/models';
import { InventoryTransactionDto, InventoryTransactionType } from '../../proxy/inventories/models';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { StockAdjustmentModalComponent } from '../../inventory/stock-adjustment-modal/stock-adjustment-modal.component';

@Component({
  selector: 'app-inventory-keeper-transactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CoreModule,
    ThemeSharedModule,
    StockAdjustmentModalComponent,
  ],
  templateUrl: './inventory-keeper-transactions.component.html',
  styleUrls: ['./inventory-keeper-transactions.component.scss'],
})
export class InventoryKeeperTransactionsComponent implements OnInit, OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly ingredientService = inject(IngredientService);
  private readonly toaster = inject(ToasterService);
  readonly sidebarService = inject(InventoryKeeperSidebarService);
  readonly alertStateService = inject(InventoryAlertStateService);

  @ViewChild('transactionsSidebarTemplate', { static: true })
  transactionsSidebarTemplate!: TemplateRef<any>;

  @ViewChild('searchInput')
  searchInput?: ElementRef<HTMLInputElement>;

  @ViewChild('ingredientSearchInput')
  ingredientSearchInput?: ElementRef<HTMLInputElement>;

  readonly ingredients = signal<IngredientDto[]>([]);
  readonly selectedIngredientId = signal<string>('');
  readonly rawTransactions = signal<InventoryTransactionDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly selectedTypeFilter = signal<number | null>(null); // null: All, 1: IN, 2: OUT, 3: ADJUSTMENT

  // Từ khóa tìm kiếm giao dịch (Mã lô, Lý do)
  readonly searchQuery = signal<string>('');

  // Từ khóa lọc nhanh danh sách nguyên liệu
  readonly ingredientSearchText = signal<string>('');

  // Trạng thái mở/đóng Custom Dropdown chọn nguyên liệu
  readonly isIngredientDropdownOpen = signal<boolean>(false);

  // Modal Kiểm kê điều chỉnh kho (Stock Adjustment)
  readonly isAdjustmentModalOpen = signal<boolean>(false);

  readonly selectedIngredient = computed(() => {
    const id = this.selectedIngredientId();
    return this.ingredients().find(i => i.id === id) || null;
  });

  readonly filteredIngredients = computed(() => {
    const list = this.ingredients();
    const query = this.ingredientSearchText().trim().toLowerCase();
    if (!query) return list;
    return list.filter(i =>
      (i.name || '').toLowerCase().includes(query) ||
      (i.code || '').toLowerCase().includes(query)
    );
  });

  readonly filteredTransactions = computed(() => {
    let list = this.rawTransactions();
    const sidebarType = this.sidebarService?.transactionsTypeFilter ? this.sidebarService.transactionsTypeFilter() : null;
    const filterType = sidebarType !== null ? sidebarType : this.selectedTypeFilter();
    const sidebarQuery = this.sidebarService?.transactionsSearchQuery ? this.sidebarService.transactionsSearchQuery() : '';
    const query = (sidebarQuery || this.searchQuery()).trim().toLowerCase();

    // 1. Lọc theo loại biến động
    if (filterType !== null) {
      if (filterType === 3) {
        // Nhóm kiểm kê (cả tăng 3 và giảm 4)
        list = list.filter(
          t =>
            t.transactionType === InventoryTransactionType.ADJUSTMENT_IN ||
            t.transactionType === InventoryTransactionType.ADJUSTMENT_OUT ||
            t.type === InventoryTransactionType.ADJUSTMENT_IN ||
            t.type === InventoryTransactionType.ADJUSTMENT_OUT
        );
      } else {
        list = list.filter(t => t.transactionType === filterType || t.type === filterType);
      }
    }

    // 2. Lọc theo từ khóa tìm kiếm (Mã lô hoặc Lý do giao dịch)
    if (query) {
      list = list.filter(t => {
        const batchCode = (t.batchCode || '').toLowerCase();
        const reason = (t.reason || '').toLowerCase();
        return batchCode.includes(query) || reason.includes(query);
      });
    }

    return list;
  });

  // Pagination signals (mặc định 10 items/trang)
  readonly pageSize = signal<number>(10);
  readonly currentPage = signal<number>(1);

  readonly totalTransactions = computed(() => this.filteredTransactions().length);
  readonly totalPages = computed(() => Math.ceil(this.totalTransactions() / this.pageSize()) || 1);

  readonly pagedTransactions = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredTransactions().slice(start, start + size);
  });

  readonly fromRecord = computed(() => {
    if (this.totalTransactions() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly toRecord = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalTransactions());
  });

  readonly pagesList = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) {
      range.push(i);
    }
    return range;
  });

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  firstPage(): void {
    this.goToPage(1);
  }

  lastPage(): void {
    this.goToPage(this.totalPages());
  }

  private refreshSub?: Subscription;
  private sidebarSub?: Subscription;

  ngOnInit(): void {
    this.sidebarService?.clearTemplate?.();
    this.sidebarService?.setTemplate?.(null);
    this.loadIngredients();

    this.refreshSub = this.alertStateService.refreshed$.subscribe(() => {
      if (this.selectedIngredientId()) {
        this.loadTransactions(this.selectedIngredientId());
      }
    });

    this.sidebarSub = this.sidebarService.ingredientSelected$?.subscribe(id => {
      if (id && id !== this.selectedIngredientId()) {
        this.selectedIngredientId.set(id);
        this.loadTransactions(id);
      }
    });
  }

  loadIngredients(): void {
    this.isLoading.set(true);
    this.ingredientService.getList({ maxResultCount: 1000, isActive: true }).subscribe({
      next: res => {
        const items = res.items || [];
        this.ingredients.set(items);
        this.sidebarService?.setIngredients?.(items);
        if (items.length > 0 && !this.selectedIngredientId()) {
          this.selectedIngredientId.set(items[0].id);
          this.sidebarService?.setSelectedIngredientId?.(items[0].id);
          this.loadTransactions(items[0].id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onIngredientChange(id: string): void {
    this.currentPage.set(1);
    this.selectedIngredientId.set(id);
    this.sidebarService?.setSelectedIngredientId?.(id);
    this.loadTransactions(id);
  }

  loadTransactions(ingredientId: string): void {
    if (!ingredientId) {
      this.rawTransactions.set([]);
      return;
    }

    this.isLoading.set(true);
    this.inventoryService.getTransactions(ingredientId, { maxResultCount: 1000, skipCount: 0 }).subscribe({
      next: res => {
        this.rawTransactions.set(res?.items || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.rawTransactions.set([]);
        this.isLoading.set(false);
      },
    });
  }

  setTypeFilter(type: number | null): void {
    this.currentPage.set(1);
    this.selectedTypeFilter.set(type);
    this.sidebarService?.setTransactionsTypeFilter?.(type);
  }

  openAdjustmentModal(): void {
    if (!this.selectedIngredient()) {
      this.toaster.warn('::SelectIngredientFirst', 'Acme.TooHungry');
      return;
    }
    this.isAdjustmentModalOpen.set(true);
  }

  onStockAdjusted(): void {
    this.isAdjustmentModalOpen.set(false);
    this.toaster.success('::StockAdjustmentSuccess', 'Acme.TooHungry');
    this.alertStateService.refreshAlerts();
    if (this.selectedIngredientId()) {
      this.loadTransactions(this.selectedIngredientId());
    }
  }

  getTransactionTypeLabel(t: InventoryTransactionDto): string {
    const type = t.transactionType || t.type;
    switch (type) {
      case InventoryTransactionType.IN:
        return '::TransactionTypeIn';
      case InventoryTransactionType.OUT:
        return '::TransactionTypeOut';
      case InventoryTransactionType.ADJUSTMENT_IN:
        return '::TransactionTypeAdjIn';
      case InventoryTransactionType.ADJUSTMENT_OUT:
        return '::TransactionTypeAdjOut';
      default:
        return '::TransactionTypeOther';
    }
  }

  onSearchInput(value: string): void {
    this.currentPage.set(1);
    this.searchQuery.set(value || '');
    this.sidebarService?.setTransactionsSearch?.(value || '');
  }

  clearSearch(): void {
    this.currentPage.set(1);
    this.searchQuery.set('');
    this.sidebarService?.clearTransactionsSearch?.();
    this.searchInput?.nativeElement?.focus();
  }

  toggleIngredientDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const nextState = !this.isIngredientDropdownOpen();
    this.isIngredientDropdownOpen.set(nextState);
    if (nextState) {
      setTimeout(() => {
        this.ingredientSearchInput?.nativeElement?.focus();
      }, 50);
    }
  }

  closeIngredientDropdown(): void {
    this.isIngredientDropdownOpen.set(false);
  }

  selectIngredient(ing: IngredientDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.onIngredientChange(ing.id);
    this.isIngredientDropdownOpen.set(false);
    this.sidebarService?.setIngredientDropdownOpen?.(false);
    this.ingredientSearchText.set('');
    this.sidebarService?.clearIngredientSearch?.();
  }

  onIngredientSearchInput(value: string): void {
    this.ingredientSearchText.set(value || '');
  }

  clearIngredientSearch(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.ingredientSearchText.set('');
    this.ingredientSearchInput?.nativeElement?.focus();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isIngredientDropdownOpen()) {
      this.closeIngredientDropdown();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isIngredientDropdownOpen()) {
      this.closeIngredientDropdown();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement?.focus();
      this.searchInput?.nativeElement?.select();
    }
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.sidebarSub?.unsubscribe();
  }
}
