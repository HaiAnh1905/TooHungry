import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { Confirmation, ConfirmationService, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { ConsumptionMethod, IngredientDto } from '../proxy/ingredients/models';
import { InventoryService } from '../proxy/inventories/inventory.service';
import {
  CreateInventoryBatchDto,
  InventoryAlertDto,
  InventoryBatchDto,
  InventoryTransactionDto,
  InventoryTransactionType,
  StorageType,
} from '../proxy/inventories/models';
import { ExpirationBadgeComponent } from './expiration-badge/expiration-badge.component';
import { StockAdjustmentModalComponent } from './stock-adjustment-modal/stock-adjustment-modal.component';
import { IngredientModalComponent } from './ingredient-modal/ingredient-modal.component';
import { IngredientBatchesModalComponent } from './ingredient-batches-modal/ingredient-batches-modal.component';
import { DiscardBatchModalComponent } from './discard-batch-modal/discard-batch-modal.component';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

export interface InventoryKpiSummary {
  totalIngredients: number;
  safeIngredients: number;
  lowStockIngredients: number;
  expiredBatchesCount: number;
}

export interface InventoryAlertsBannerState {
  alerts: InventoryAlertDto[];
  topAlert: InventoryAlertDto | null;
  isExpanded: boolean;
  isDismissed: boolean;
  isLoading: boolean;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    FormsModule,
    ReactiveFormsModule,
    ExpirationBadgeComponent,
    StockAdjustmentModalComponent,
    IngredientModalComponent,
    IngredientBatchesModalComponent,
    DiscardBatchModalComponent,
    CustomSelectComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit {
  private readonly ingredientService = inject(IngredientService);
  private readonly inventoryService = inject(InventoryService);
  private readonly localizationService = inject(LocalizationService);
  private readonly toaster = inject(ToasterService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  highlightedIngredientId: string | null = null;
  highlightedBatchId: string | null = null;
  highlightedBatchCode: string | null = null;

  activeTab: 'ingredients' | 'batches' | 'transactions' = 'ingredients';

  // KPI Summary
  kpiSummary: InventoryKpiSummary = {
    totalIngredients: 0,
    safeIngredients: 0,
    lowStockIngredients: 0,
    expiredBatchesCount: 0,
  };

  // Alerts Banner
  alertsBanner: InventoryAlertsBannerState = {
    alerts: [],
    topAlert: null,
    isExpanded: false,
    isDismissed: false,
    isLoading: false,
  };

  // Data
  ingredients: IngredientDto[] = [];
  filteredIngredients: IngredientDto[] = [];
  batches: InventoryBatchDto[] = [];
  filteredBatches: InventoryBatchDto[] = [];

  // Tab 3: Transactions
  selectedTransactionIngredientId: string | null = null;
  transactions: InventoryTransactionDto[] = [];
  isLoadingTransactions = false;

  get pageSizeOptions(): CustomSelectOption[] {
    const unit = this.localizationService.instant('::RowsPerPage');
    return [
      { value: 5, label: `5 ${unit}` },
      { value: 10, label: `10 ${unit}` },
      { value: 20, label: `20 ${unit}` },
      { value: 50, label: `50 ${unit}` },
    ];
  }

  get ingredientSelectOptions(): CustomSelectOption[] {
    return this.ingredients.map((ing) => ({
      value: ing.id,
      label: `${ing.name} (${ing.unitName || ing.baseUnit || 'đơn vị'})`,
      desc: ing.code ? `Mã: ${ing.code}` : undefined,
      icon: 'fa-box',
    }));
  }

  readonly storageTypeFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllStorage', icon: 'fa-layer-group' },
    { value: '0', label: '::StorageType_FRESH', icon: 'fa-leaf' },
    { value: '1', label: '::StorageType_SHORT_TERM', icon: 'fa-snowflake' },
    { value: '2', label: '::StorageType_LONG_TERM', icon: 'fa-box-archive' },
  ];

  readonly ingredientStatusFilterOptions: CustomSelectOption[] = [
    { value: 'active', label: '::ActiveOnly', icon: 'fa-circle-check' },
    { value: 'deactivated', label: '::DeactivatedOnly', icon: 'fa-pause-circle' },
    { value: 'all', label: '::AllStatuses', icon: 'fa-layer-group' },
  ];

  readonly batchActiveStatusOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllStatuses', icon: 'fa-layer-group' },
    { value: 'active', label: '::ActiveOnly', icon: 'fa-circle-check' },
    { value: 'deactivated', label: '::DeactivatedOnly', icon: 'fa-lock' },
  ];

  readonly batchReasonOptions: CustomSelectOption[] = [
    { value: 'QUALITY_INSPECTION', label: '::BatchDeactivationReason:QUALITY_INSPECTION' },
    { value: 'SUSPECTED_SPOILAGE', label: '::BatchDeactivationReason:SUSPECTED_SPOILAGE' },
    { value: 'PACKAGING_DEFECT', label: '::BatchDeactivationReason:PACKAGING_DEFECT' },
    { value: 'OTHER', label: '::BatchDeactivationReason:OTHER' },
  ];

  readonly batchStatusFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllBatchStatuses', icon: 'fa-list-check' },
    { value: 'safe', label: '::BatchSafe', icon: 'fa-shield-halved' },
    { value: 'expiring_soon', label: '::BatchExpiringSoon', icon: 'fa-clock-rotate-left' },
    { value: 'expired', label: '::BatchExpired', icon: 'fa-triangle-exclamation' },
    { value: 'empty', label: '::BatchDepleted', icon: 'fa-box-open' },
  ];

  readonly sortDirectionOptions: CustomSelectOption[] = [
    { value: 'newest', label: '::SortReceivedNewest', icon: 'fa-arrow-down-wide-short' },
    { value: 'oldest', label: '::SortReceivedOldest', icon: 'fa-arrow-up-wide-short' },
  ];

  // Pagination - Ingredients tab
  ingredientPage = 1;
  ingredientPageSize = 10;

  get totalIngredientPages(): number {
    return Math.ceil(this.filteredIngredients.length / this.ingredientPageSize) || 1;
  }

  get pagedIngredients(): IngredientDto[] {
    const start = (this.ingredientPage - 1) * this.ingredientPageSize;
    return this.filteredIngredients.slice(start, start + this.ingredientPageSize);
  }

  get fromIngredientRecord(): number {
    if (this.filteredIngredients.length === 0) return 0;
    return (this.ingredientPage - 1) * this.ingredientPageSize + 1;
  }

  get toIngredientRecord(): number {
    return Math.min(this.ingredientPage * this.ingredientPageSize, this.filteredIngredients.length);
  }

  // Pagination - Batches tab
  batchPage = 1;
  batchPageSize = 10;

  get totalBatchPages(): number {
    return Math.ceil(this.filteredBatches.length / this.batchPageSize) || 1;
  }

  get pagedBatches(): InventoryBatchDto[] {
    const start = (this.batchPage - 1) * this.batchPageSize;
    return this.filteredBatches.slice(start, start + this.batchPageSize);
  }

  get fromBatchRecord(): number {
    if (this.filteredBatches.length === 0) return 0;
    return (this.batchPage - 1) * this.batchPageSize + 1;
  }

  get toBatchRecord(): number {
    return Math.min(this.batchPage * this.batchPageSize, this.filteredBatches.length);
  }

  searchTerm = '';
  selectedStorageType: string = 'all'; // 'all' | '0' | '1' | '2'
  selectedIngredientStatus: 'all' | 'active' | 'deactivated' = 'active'; // Tab 1 RM-013 status filter
  selectedBatchActiveStatus: 'all' | 'active' | 'deactivated' = 'all'; // Tab 2 RM-013 batch status filter
  selectedBatchStatus: string = 'all'; // 'all' | 'safe' | 'expiring_soon' | 'expired' | 'empty'
  sortDirection: 'newest' | 'oldest' = 'newest';
  isLoading = false;

  // Modals state for RM-013
  isDeactivateIngredientModalOpen = false;
  ingredientToDeactivate: IngredientDto | null = null;
  deactivateIngredientReason = '';
  isSubmittingIngredientDeactivation = false;

  isDeactivateBatchModalOpen = false;
  batchToDeactivate: InventoryBatchDto | null = null;
  batchDeactivationReasonCode = 'QUALITY_INSPECTION';
  batchDeactivationNote = '';
  isSubmittingBatchDeactivation = false;

  // Storage Type & Consumption Enums
  StorageTypeEnum = StorageType;
  ConsumptionMethodEnum = ConsumptionMethod;
  TransactionTypeEnum = InventoryTransactionType;

  // Modals state
  isIngredientModalOpen = false;
  selectedIngredient?: IngredientDto;

  isAdjustmentModalOpen = false;
  selectedIngredientForAdjustment?: IngredientDto;

  // Ingredient Batches Modal
  isIngredientBatchesModalOpen = false;
  selectedIngredientForBatches?: IngredientDto;

  // Discard Modal
  isDiscardModalOpen = false;
  selectedBatchForDiscard?: InventoryBatchDto;
  selectedIngredientForDiscard?: IngredientDto;
  isSubmittingDiscard = false;

  // New Batch Modal
  isNewBatchModalOpen = false;
  newBatchData: CreateInventoryBatchDto = {
    ingredientId: '',
    batchCode: '',
    initialQuantity: 1,
    unitPrice: 0,
    storageType: StorageType.SHORT_TERM,
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const hasAnyParams = Object.keys(params).length > 0;
      if (!hasAnyParams) {
        return;
      }

      if (params['tab']) {
        this.activeTab = params['tab'] as any;
      }
      if (params['search']) {
        this.searchTerm = params['search'];
      }
      if (params['ingredientId']) {
        this.highlightedIngredientId = params['ingredientId'];
      }
      if (params['batchId']) {
        this.highlightedBatchId = params['batchId'];
      }
      if (params['batchCode']) {
        this.highlightedBatchCode = params['batchCode'];
      }
      if (this.ingredients.length > 0 || this.batches.length > 0) {
        this.onFilterChange();
      }

      // Xóa query parameters trên thanh địa chỉ URL sau khi đã nhận xong
      // để khi người dùng F5 / reload trang không bị kẹt từ khóa tìm kiếm
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    });

    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.ingredientService.getList(true).subscribe({
      next: (res) => {
        this.ingredients = res?.items || [];
        if (!this.searchTerm && this.highlightedIngredientId) {
          const ing = this.ingredients.find((i) => i.id === this.highlightedIngredientId);
          if (ing) {
            this.searchTerm = ing.name;
          }
          this.highlightedIngredientId = null;
        }
        this.applyIngredientFilter();
        this.calculateKpiSummary();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });

    this.inventoryService.getBatches().subscribe({
      next: (res) => {
        this.batches = res?.items || [];
        if (this.activeTab === 'batches' && !this.searchTerm && this.highlightedBatchCode) {
          this.searchTerm = this.highlightedBatchCode;
          this.highlightedBatchCode = null;
        }
        this.applyBatchFilter();
        this.calculateKpiSummary();
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });

    this.loadAlerts();
  }

  navigateToAlertItem(alert: InventoryAlertDto): void {
    const isBatchAlert =
      alert.alertType === 'EXPIRED' ||
      alert.alertType === 'EXPIRING_SOON' ||
      !!alert.batchCode;
    this.activeTab = isBatchAlert ? 'batches' : 'ingredients';
    this.searchTerm = alert.ingredientName || alert.batchCode || '';
    this.highlightedIngredientId = alert.ingredientId || null;
    this.highlightedBatchId = alert.batchId || null;
    this.highlightedBatchCode = alert.batchCode || null;
    this.onFilterChange();
    this.cdr.markForCheck();
  }

  loadAlerts(): void {
    this.alertsBanner.isLoading = true;
    this.inventoryService.getAlerts().subscribe({
      next: (res) => {
        const alerts = res || [];
        this.alertsBanner.alerts = alerts;
        // Prioritize expired / urgent alerts
        const dangerAlert = alerts.find(
          (a) => a.alertType === 'EXPIRED' || (a.alertType as string) === 'EXPIRED_FRESH'
        );
        this.alertsBanner.topAlert = dangerAlert || (alerts.length > 0 ? alerts[0] : null);
        this.alertsBanner.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.alertsBanner.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  calculateKpiSummary(): void {
    const totalIngredients = this.ingredients.length;
    const safeIngredients = this.ingredients.filter(
      (i) => i.isActive && i.currentStock >= i.minStock && i.currentStock > 0
    ).length;
    const lowStockIngredients = this.ingredients.filter(
      (i) => i.isActive && (i.currentStock < i.minStock || i.currentStock <= 0)
    ).length;

    const now = new Date().getTime();
    const expiredBatchesCount = this.batches.filter((b) => {
      if (b.remainingQuantity <= 0 || !b.expiryDate) return false;
      const exp = new Date(b.expiryDate).getTime();
      return exp <= now;
    }).length;

    this.kpiSummary = {
      totalIngredients,
      safeIngredients,
      lowStockIngredients,
      expiredBatchesCount,
    };
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() ||
      this.selectedStorageType !== 'all' ||
      this.selectedIngredientStatus !== 'active' ||
      this.selectedBatchActiveStatus !== 'all' ||
      this.selectedBatchStatus !== 'all' ||
      this.sortDirection !== 'newest';
  }

  onFilterChange(): void {
    if (this.activeTab === 'ingredients') {
      this.applyIngredientFilter();
    } else if (this.activeTab === 'batches') {
      this.applyBatchFilter();
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.highlightedIngredientId = null;
    this.highlightedBatchId = null;
    this.highlightedBatchCode = null;
    this.onFilterChange();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.highlightedIngredientId = null;
    this.highlightedBatchId = null;
    this.highlightedBatchCode = null;
    this.selectedStorageType = 'all';
    this.selectedIngredientStatus = 'active';
    this.selectedBatchActiveStatus = 'all';
    this.selectedBatchStatus = 'all';
    this.sortDirection = 'newest';
    this.onFilterChange();
  }

  setTab(tab: 'ingredients' | 'batches' | 'transactions'): void {
    this.activeTab = tab;
    this.ingredientPage = 1;
    this.batchPage = 1;
    if (tab === 'batches') {
      this.selectedStorageType = 'all';
    } else if (tab === 'ingredients') {
      this.selectedBatchStatus = 'all';
    } else if (tab === 'transactions') {
      if (!this.selectedTransactionIngredientId && this.ingredients.length > 0) {
        this.selectedTransactionIngredientId = this.ingredients[0].id;
        this.loadTransactions(this.ingredients[0].id);
      }
    }
    this.onFilterChange();
  }

  applyIngredientFilter(): void {
    let list = [...this.ingredients];

    // 1. Tìm kiếm theo tên hoặc mã nguyên liệu
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter((i) => i.name.toLowerCase().includes(term) || (i.code && i.code.toLowerCase().includes(term)));
    }

    // 2. Lọc theo trạng thái hoạt động (RM-013 US1 / US2)
    if (this.selectedIngredientStatus === 'active') {
      list = list.filter((i) => i.isActive !== false);
    } else if (this.selectedIngredientStatus === 'deactivated') {
      list = list.filter((i) => i.isActive === false);
    }

    // 3. Lọc theo trạng thái vòng đời bảo quản
    if (this.selectedStorageType !== 'all') {
      const st = Number(this.selectedStorageType);
      list = list.filter((i) => i.storageType === st);
    }

    // 4. Sắp xếp theo ngày nhập mới nhất hoặc ngược lại
    list.sort((a, b) => {
      const timeA = this.getIngredientReceivedTime(a);
      const timeB = this.getIngredientReceivedTime(b);
      return this.sortDirection === 'newest' ? timeB - timeA : timeA - timeB;
    });

    this.filteredIngredients = list;
    this.ingredientPage = 1;
  }

  private getIngredientReceivedTime(ingredient: IngredientDto): number {
    const ingBatches = this.batches.filter((b) => b.ingredientId === ingredient.id && b.receivedAt);
    if (ingBatches.length > 0) {
      const times = ingBatches.map((b) => new Date(b.receivedAt).getTime());
      return this.sortDirection === 'newest' ? Math.max(...times) : Math.min(...times);
    }
    if ((ingredient as any).creationTime) {
      return new Date((ingredient as any).creationTime).getTime();
    }
    return 0;
  }

  applyBatchFilter(): void {
    let list = [...this.batches];

    // 1. Tìm kiếm theo mã lô hoặc tên nguyên liệu
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.batchCode.toLowerCase().includes(term) ||
          (b.ingredientName && b.ingredientName.toLowerCase().includes(term))
      );
    }

    // 2. Lọc theo vòng đời bảo quản
    if (this.selectedStorageType !== 'all') {
      const st = Number(this.selectedStorageType);
      list = list.filter((b) => b.storageType === st);
    }

    // 2.3 Lọc theo trạng thái khả dụng / tạm khóa (RM-013 US3)
    if (this.selectedBatchActiveStatus === 'active') {
      list = list.filter((b) => b.isActive !== false);
    } else if (this.selectedBatchActiveStatus === 'deactivated') {
      list = list.filter((b) => b.isActive === false);
    }

    // 2.5 Lọc theo tình trạng lô hàng
    if (this.selectedBatchStatus !== 'all') {
      const now = new Date().getTime();
      list = list.filter((b) => {
        if (this.selectedBatchStatus === 'empty') {
          return b.remainingQuantity === 0;
        }
        if (b.remainingQuantity === 0) return false;

        if (!b.expiryDate) {
          return this.selectedBatchStatus === 'safe';
        }

        const exp = new Date(b.expiryDate).getTime();
        const isExpired = exp <= now;
        const isFresh = b.storageType === 0;
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

        if (this.selectedBatchStatus === 'expired') {
          return isExpired;
        }
        if (this.selectedBatchStatus === 'expiring_soon') {
          return !isFresh && !isExpired && diffDays <= 3;
        }
        if (this.selectedBatchStatus === 'safe') {
          return !isExpired && (isFresh || diffDays > 3);
        }
        return true;
      });
    }

    // 3. Sắp xếp theo ngày nhập mới nhất hoặc ngược lại
    list.sort((a, b) => {
      const timeA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const timeB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return this.sortDirection === 'newest' ? timeB - timeA : timeA - timeB;
    });

    this.filteredBatches = list;
    this.batchPage = 1;
  }

  // Ingredient pagination methods
  changeIngredientPageSize(size: number): void {
    this.ingredientPageSize = Number(size);
    this.ingredientPage = 1;
  }

  goToIngredientPage(page: number): void {
    if (page >= 1 && page <= this.totalIngredientPages) {
      this.ingredientPage = page;
    }
  }

  prevIngredientPage(): void {
    if (this.ingredientPage > 1) {
      this.ingredientPage--;
    }
  }

  nextIngredientPage(): void {
    if (this.ingredientPage < this.totalIngredientPages) {
      this.ingredientPage++;
    }
  }

  firstIngredientPage(): void {
    this.ingredientPage = 1;
  }

  lastIngredientPage(): void {
    this.ingredientPage = this.totalIngredientPages;
  }

  // Batch pagination methods
  changeBatchPageSize(size: number): void {
    this.batchPageSize = Number(size);
    this.batchPage = 1;
  }

  goToBatchPage(page: number): void {
    if (page >= 1 && page <= this.totalBatchPages) {
      this.batchPage = page;
    }
  }

  prevBatchPage(): void {
    if (this.batchPage > 1) {
      this.batchPage--;
    }
  }

  nextBatchPage(): void {
    if (this.batchPage < this.totalBatchPages) {
      this.batchPage++;
    }
  }

  firstBatchPage(): void {
    this.batchPage = 1;
  }

  lastBatchPage(): void {
    this.batchPage = this.totalBatchPages;
  }

  openCreateIngredient(): void {
    this.selectedIngredient = undefined;
    this.isIngredientModalOpen = true;
  }

  openEditIngredient(item: IngredientDto): void {
    this.selectedIngredient = item;
    this.isIngredientModalOpen = true;
  }

  openAdjustment(item: IngredientDto): void {
    this.selectedIngredientForAdjustment = item;
    this.isAdjustmentModalOpen = true;
  }

  // Ingredient Batches Modal
  openIngredientBatches(item: IngredientDto): void {
    this.selectedIngredientForBatches = item;
    this.isIngredientBatchesModalOpen = true;
  }

  openInboundForIngredient(item: IngredientDto): void {
    this.openNewBatchModal();
    this.newBatchData.ingredientId = item.id;
    this.onBatchIngredientChange(item.id);
  }

  // Discard Modal
  openDiscardModal(batch: InventoryBatchDto): void {
    this.selectedBatchForDiscard = batch;
    this.selectedIngredientForDiscard = this.ingredients.find((x) => x.id === batch.ingredientId);
    this.isDiscardModalOpen = true;
  }

  openDiscardFromAlert(alert: InventoryAlertDto | null): void {
    if (!alert) return;
    let targetBatch = alert.batchId ? this.batches.find((b) => b.id === alert.batchId) : undefined;
    if (!targetBatch && alert.batchCode) {
      targetBatch = this.batches.find((b) => b.batchCode === alert.batchCode);
    }
    if (!targetBatch && alert.ingredientId) {
      targetBatch = this.batches.find(
        (b) => b.ingredientId === alert.ingredientId && b.remainingQuantity > 0
      );
    }
    if (targetBatch) {
      this.openDiscardModal(targetBatch);
    } else {
      this.toaster.warn('Không tìm thấy thông tin lô hàng tương ứng để xuất hủy.');
    }
  }

  handleDiscardConfirmed(event: { reason: string }): void {
    if (!this.selectedBatchForDiscard) return;
    this.isSubmittingDiscard = true;
    this.inventoryService.discardBatch(this.selectedBatchForDiscard.id, { reason: event.reason }).subscribe({
      next: () => {
        this.isSubmittingDiscard = false;
        this.isDiscardModalOpen = false;
        this.toaster.success('::BatchDiscardedSuccess');
        this.loadData();
      },
      error: (err) => {
        this.isSubmittingDiscard = false;
        this.toaster.error(err?.error?.message || 'Có lỗi xảy ra khi xuất hủy lô hàng');
      },
    });
  }

  // Transactions (Tab 3)
  loadTransactions(ingredientId: string): void {
    if (!ingredientId) {
      this.transactions = [];
      return;
    }
    this.isLoadingTransactions = true;
    this.inventoryService.getTransactions(ingredientId).subscribe({
      next: (res) => {
        this.transactions = res || [];
        this.isLoadingTransactions = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.transactions = [];
        this.isLoadingTransactions = false;
        this.cdr.markForCheck();
      },
    });
  }

  onTransactionIngredientChange(ingredientId: string): void {
    this.selectedTransactionIngredientId = ingredientId;
    this.loadTransactions(ingredientId);
  }

  navigateToTransactions(ingredient: IngredientDto): void {
    this.setTab('transactions');
    this.selectedTransactionIngredientId = ingredient.id;
    this.loadTransactions(ingredient.id);
  }

  isSavingBatch = false;

  get isFreshIngredient(): boolean {
    const selected = this.ingredients.find((x) => x.id === this.newBatchData.ingredientId);
    return selected?.storageType === StorageType.FRESH;
  }

  onBatchIngredientChange(ingredientId: string): void {
    const selected = this.ingredients.find((x) => x.id === ingredientId);
    if (selected?.storageType === StorageType.FRESH) {
      this.newBatchData.expiryDate = new Date().toISOString().split('T')[0];
    }
  }

  openNewBatchModal(): void {
    const defaultIngredientId = this.ingredients.length > 0 ? this.ingredients[0].id : '';
    const selected = this.ingredients.find((x) => x.id === defaultIngredientId);
    const isFresh = selected?.storageType === StorageType.FRESH;

    this.newBatchData = {
      ingredientId: defaultIngredientId,
      batchCode: 'BATCH-' + Date.now().toString().slice(-6),
      initialQuantity: 10,
      unitPrice: 10000,
      storageType: StorageType.SHORT_TERM,
      expiryDate: isFresh ? new Date().toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    this.isNewBatchModalOpen = true;
    this.cdr.detectChanges();
  }

  closeNewBatchModal(): void {
    this.isNewBatchModalOpen = false;
    this.cdr.detectChanges();
  }

  saveNewBatch(): void {
    if (this.isSavingBatch) return;

    if (!this.newBatchData.ingredientId || !this.newBatchData.batchCode) {
      this.toaster.warn('Vui lòng điền đầy đủ thông tin lô hàng');
      return;
    }

    const selectedIng = this.ingredients.find((x) => x.id === this.newBatchData.ingredientId);
    const unit = selectedIng?.baseUnit || selectedIng?.unitName || 'đơn vị';
    const quantity = Number(this.newBatchData.initialQuantity || 1);
    const price = Number(this.newBatchData.unitPrice || 0);

    const payload: CreateInventoryBatchDto = {
      ingredientId: this.newBatchData.ingredientId,
      batchCode: this.newBatchData.batchCode.trim(),
      purchaseQuantity: quantity,
      initialQuantity: quantity,
      purchaseUnit: unit,
      conversionFactor: 1.0,
      unitCost: price,
      unitPrice: price,
      expiryDate: this.newBatchData.expiryDate,
      storageType: selectedIng?.storageType ?? StorageType.SHORT_TERM,
    };

    if (this.newBatchData.expiryDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (this.newBatchData.expiryDate < todayStr) {
        this.toaster.error('::InventoryBatch:ExpiryDateMustBeInFuture');
        return;
      }
    }

    this.isSavingBatch = true;
    this.cdr.detectChanges();

    this.inventoryService.createBatch(payload).subscribe({
      next: () => {
        this.isSavingBatch = false;
        this.isNewBatchModalOpen = false;
        this.highlightedIngredientId = null;
        this.highlightedBatchId = null;
        this.highlightedBatchCode = null;
        this.searchTerm = '';
        this.cdr.detectChanges();
        this.toaster.success('Nhập lô hàng mới thành công');
        this.loadData();
      },
      error: (err) => {
        this.isSavingBatch = false;
        this.cdr.detectChanges();
        const errCode = err?.error?.error?.code || err?.error?.code;
        const errMsg = err?.error?.error?.message || err?.error?.message;
        const localizedMsg = errCode ? this.localizationService.instant('::' + errCode) : null;
        const finalMsg = (localizedMsg && !localizedMsg.startsWith('::')) ? localizedMsg : (errMsg || 'Có lỗi xảy ra khi tạo lô hàng');
        this.toaster.error(finalMsg);
      },
    });
  }

  discardExpiredBatch(batch: InventoryBatchDto): void {
    this.openDiscardModal(batch);
  }

  getStorageTypeLabel(type: StorageType): string {
    switch (type) {
      case StorageType.FRESH:
        return 'Tươi sống (FRESH)';
      case StorageType.SHORT_TERM:
        return 'Ngắn hạn (SHORT_TERM)';
      case StorageType.LONG_TERM:
        return 'Dài hạn (LONG_TERM)';
      default:
        return 'Không xác định';
    }
  }

  // --- RM-013: Deactivate & Reactivate Ingredient Handlers ---
  openDeactivateIngredientModal(item: IngredientDto): void {
    this.ingredientToDeactivate = item;
    this.deactivateIngredientReason = '';
    this.isDeactivateIngredientModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDeactivateIngredientModal(): void {
    this.isDeactivateIngredientModalOpen = false;
    this.ingredientToDeactivate = null;
    this.deactivateIngredientReason = '';
    this.cdr.detectChanges();
  }

  submitDeactivateIngredient(): void {
    if (!this.ingredientToDeactivate || !this.deactivateIngredientReason.trim() || this.isSubmittingIngredientDeactivation) {
      return;
    }
    this.isSubmittingIngredientDeactivation = true;
    this.ingredientService.deactivate(this.ingredientToDeactivate.id, { reason: this.deactivateIngredientReason.trim() }).subscribe({
      next: () => {
        this.isSubmittingIngredientDeactivation = false;
        this.closeDeactivateIngredientModal();
        this.toaster.success('::DeactivateIngredientSuccess');
        this.loadData();
      },
      error: (err) => {
        this.isSubmittingIngredientDeactivation = false;
        this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra');
        this.cdr.detectChanges();
      }
    });
  }

  confirmReactivateIngredient(item: IngredientDto): void {
    this.confirmation.warn('::ReactivateIngredientConfirmMessage', '::ReactivateIngredientTitle', {
      messageLocalizationParams: [item.name]
    }).subscribe((status: Confirmation.Status) => {
      if (status === Confirmation.Status.confirm) {
        this.ingredientService.reactivate(item.id).subscribe({
          next: () => {
            this.toaster.success('::ReactivateIngredientSuccess');
            this.loadData();
          },
          error: (err) => {
            this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra');
          }
        });
      }
    });
  }

  // --- RM-013: Deactivate & Reactivate Batch Handlers ---
  openDeactivateBatchModal(batch: InventoryBatchDto): void {
    this.batchToDeactivate = batch;
    this.batchDeactivationReasonCode = 'QUALITY_INSPECTION';
    this.batchDeactivationNote = '';
    this.isDeactivateBatchModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDeactivateBatchModal(): void {
    this.isDeactivateBatchModalOpen = false;
    this.batchToDeactivate = null;
    this.batchDeactivationNote = '';
    this.cdr.detectChanges();
  }

  submitDeactivateBatch(): void {
    if (!this.batchToDeactivate || this.isSubmittingBatchDeactivation) return;

    const reasonLabel = this.localizationService.instant('::BatchDeactivationReason:' + this.batchDeactivationReasonCode);
    const finalReason = this.batchDeactivationNote.trim()
      ? `${reasonLabel}: ${this.batchDeactivationNote.trim()}`
      : reasonLabel;

    this.isSubmittingBatchDeactivation = true;
    this.inventoryService.deactivateBatch(this.batchToDeactivate.id, {
      reasonCode: this.batchDeactivationReasonCode,
      reason: finalReason
    }).subscribe({
      next: () => {
        this.isSubmittingBatchDeactivation = false;
        this.closeDeactivateBatchModal();
        this.toaster.success('::DeactivateBatchSuccess');
        this.loadData();
      },
      error: (err) => {
        this.isSubmittingBatchDeactivation = false;
        this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra');
        this.cdr.detectChanges();
      }
    });
  }

  confirmReactivateBatch(batch: InventoryBatchDto): void {
    this.confirmation.warn('::ReactivateBatchConfirmMessage', '::ReactivateBatchTitle', {
      messageLocalizationParams: [batch.batchCode]
    }).subscribe((status: Confirmation.Status) => {
      if (status === Confirmation.Status.confirm) {
        this.inventoryService.reactivateBatch(batch.id).subscribe({
          next: () => {
            this.toaster.success('::ReactivateBatchSuccess');
            this.loadData();
          },
          error: (err) => {
            this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra');
          }
        });
      }
    });
  }
}
