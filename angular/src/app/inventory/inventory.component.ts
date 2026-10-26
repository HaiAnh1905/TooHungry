import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { Confirmation, ConfirmationService, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { forkJoin, of, timeout, catchError, finalize } from 'rxjs';
import { ExtendedIngredientService } from '../shared/services/extended-ingredient.service';
import { IngredientDto } from '../proxy/ingredients/models';
import { InventoryService } from '../proxy/inventories/inventory.service';
import {
  InventoryAlertDto,
  InventoryBatchDto,
  InventoryTransactionDto,
  InventoryTransactionType,
  StorageType,
} from '../proxy/inventories/models';
import {
  BatchFefoStatus,
  BatchViewItem,
  DashboardInventoryKpiSummary,
  InventoryTabType,
  ReplenishmentSuggestionItem,
  StorageFilterType,
} from './models/inventory-dashboard.models';
import { InventoryStateService } from './services/inventory-state.service';
import { InventoryKpiBarComponent, KpiFilterType } from './components/inventory-kpi-bar/inventory-kpi-bar.component';
import { InventoryAlertsBannerComponent } from './components/inventory-alerts-banner/inventory-alerts-banner.component';
import { InventoryIngredientTabComponent } from './components/inventory-ingredient-tab/inventory-ingredient-tab.component';
import { InventoryBatchTabComponent } from './components/inventory-batch-tab/inventory-batch-tab.component';
import { InventoryTransactionTabComponent } from './components/inventory-transaction-tab/inventory-transaction-tab.component';
import { ReplenishmentInsightsWidgetComponent } from './components/replenishment-insights-widget/replenishment-insights-widget.component';
import { CreateInventoryBatchModalComponent } from './create-batch-modal/create-batch-modal.component';
import { DiscardBatchModalComponent } from './discard-batch-modal/discard-batch-modal.component';
import { StockAdjustmentModalComponent } from './stock-adjustment-modal/stock-adjustment-modal.component';
import { IngredientBatchesModalComponent } from './ingredient-batches-modal/ingredient-batches-modal.component';
import { IngredientModalComponent } from './ingredient-modal/ingredient-modal.component';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    FormsModule,
    InventoryKpiBarComponent,
    InventoryAlertsBannerComponent,
    InventoryIngredientTabComponent,
    InventoryBatchTabComponent,
    InventoryTransactionTabComponent,
    ReplenishmentInsightsWidgetComponent,
    CreateInventoryBatchModalComponent,
    DiscardBatchModalComponent,
    StockAdjustmentModalComponent,
    IngredientBatchesModalComponent,
    IngredientModalComponent,
    CustomSelectComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class InventoryComponent implements OnInit {
  private readonly ingredientService = inject(ExtendedIngredientService);
  private readonly inventoryService = inject(InventoryService);
  private readonly stateService = inject(InventoryStateService);
  private readonly localizationService = inject(LocalizationService);
  private readonly toaster = inject(ToasterService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab: InventoryTabType = 'ingredients';
  kpiFilter: KpiFilterType = 'all';

  // Filters state
  ingredientStockFilter: 'ALL' | 'SAFE' | 'LOW' = 'ALL';
  ingredientStatusFilter: 'all' | 'active' | 'deactivated' = 'all';
  ingredientSearchQuery = '';
  ingredientStorageFilter: StorageFilterType = StorageFilterType.All;

  batchStatusFilter: BatchFefoStatus | 'ALL' = 'ALL';
  batchActiveFilter: 'all' | 'active' | 'deactivated' = 'all';
  batchSearchQuery = '';
  batchSortDirection: 'newest' | 'oldest' = 'newest';

  highlightedIngredientId: string | null = null;
  highlightedBatchId: string | null = null;
  highlightedBatchCode: string | null = null;

  isAlertsExpanded = false;
  isAlertsDismissed = false;
  isLoading = false;

  // Data
  ingredients: IngredientDto[] = [];
  batches: BatchViewItem[] = [];
  rawBatches: InventoryBatchDto[] = [];
  alerts: InventoryAlertDto[] = [];
  kpiSummary: DashboardInventoryKpiSummary = { totalIngredients: 0, safeIngredients: 0, lowStockIngredients: 0, expiredBatchesCount: 0 };
  replenishmentSuggestions: ReplenishmentSuggestionItem[] = [];

  // Transactions Tab
  selectedTransactionIngredientId: string | null = null;
  transactions: InventoryTransactionDto[] = [];
  transactionTypeFilter: InventoryTransactionType | 'ALL' = 'ALL';
  isLoadingTransactions = false;

  // Modals state
  isCreateBatchModalOpen = false;
  preselectedIngredientIdForBatch?: string;
  preselectedQuantityForBatch?: number;
  preselectedPriceForBatch?: number;

  isIngredientModalOpen = false;
  selectedIngredient?: IngredientDto;

  isAdjustmentModalOpen = false;
  selectedIngredientForAdjustment?: IngredientDto;

  isIngredientBatchesModalOpen = false;
  selectedIngredientForBatches?: IngredientDto;

  isDiscardModalOpen = false;
  selectedBatchForDiscard?: InventoryBatchDto;
  selectedIngredientForDiscard?: IngredientDto;
  isSubmittingDiscard = false;

  // RM-013 Deactivation
  isDeactivateIngredientModalOpen = false;
  ingredientToDeactivate: IngredientDto | null = null;
  deactivateIngredientReason = '';
  isSubmittingIngredientDeactivation = false;

  isDeactivateBatchModalOpen = false;
  batchToDeactivate: InventoryBatchDto | null = null;
  batchDeactivationReasonCode = 'QUALITY_INSPECTION';
  batchDeactivationNote = '';
  isSubmittingBatchDeactivation = false;

  readonly batchReasonOptions: CustomSelectOption[] = [
    { value: 'QUALITY_INSPECTION', label: '::BatchDeactivationReason:QUALITY_INSPECTION' },
    { value: 'SUSPECTED_SPOILAGE', label: '::BatchDeactivationReason:SUSPECTED_SPOILAGE' },
    { value: 'PACKAGING_DEFECT', label: '::BatchDeactivationReason:PACKAGING_DEFECT' },
    { value: 'OTHER', label: '::BatchDeactivationReason:OTHER' },
  ];

  // Lookup Maps for O(1) lookups
  ingredientMap = new Map<string, IngredientDto>();
  batchMap = new Map<string, InventoryBatchDto>();
  latestPriceByIngredientId = new Map<string, number>();

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab') as InventoryTabType;
      if (tab === 'ingredients' || tab === 'batches' || tab === 'transactions') this.activeTab = tab;
      // Nếu URL còn sót param search cũ, dọn sạch ngay khỏi thanh địa chỉ trình duyệt
      if (params.has('search')) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { search: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
      this.ingredientSearchQuery = '';
      this.batchSearchQuery = '';
      const ingId = params.get('ingredientId');
      if (ingId) {
        this.highlightedIngredientId = ingId;
        if (this.activeTab === 'transactions') {
          this.selectedTransactionIngredientId = ingId;
          this.loadTransactions(ingId);
        }
      }
      if (params.get('batchId')) this.highlightedBatchId = params.get('batchId');
      if (params.get('batchCode')) this.highlightedBatchCode = params.get('batchCode');
    });

    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const ingredients$ = this.ingredientService.getList(true).pipe(
      timeout(10000),
      catchError(err => {
        console.error('Lỗi hoặc timeout khi tải danh sách nguyên liệu:', err);
        return of({ totalCount: 0, items: [] });
      })
    );

    const batches$ = this.inventoryService.getBatches({ maxResultCount: 1000 }).pipe(
      timeout(10000),
      catchError(err => {
        console.error('Lỗi hoặc timeout khi tải danh sách lô hàng:', err);
        return of({ totalCount: 0, items: [] });
      })
    );

    const alerts$ = this.inventoryService.getAlerts().pipe(
      timeout(10000),
      catchError(err => {
        console.error('Lỗi hoặc timeout khi tải cảnh báo kho:', err);
        return of([]);
      })
    );

    forkJoin({
      ingredientsRes: ingredients$,
      batchesRes: batches$,
      alertsRes: alerts$,
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ ingredientsRes, batchesRes, alertsRes }) => {
          try {
            this.ingredients = ingredientsRes?.items || [];
            this.rawBatches = batchesRes?.items || [];
            this.alerts = alertsRes || [];

            this.ingredientMap = new Map<string, IngredientDto>(
              this.ingredients.filter(i => !!i?.id).map(i => [i.id, i])
            );
            this.batchMap = new Map<string, InventoryBatchDto>(
              this.rawBatches.filter(b => !!b?.id).map(b => [b.id, b])
            );
            this.latestPriceByIngredientId.clear();
            for (const b of this.rawBatches) {
              if (b?.ingredientId && b.unitPrice > 0 && !this.latestPriceByIngredientId.has(b.ingredientId)) {
                this.latestPriceByIngredientId.set(b.ingredientId, b.unitPrice);
              }
            }

            this.batches = this.rawBatches
              .filter(b => !!b)
              .map(b => this.stateService.mapBatchDtoToViewItem(b, this.ingredientMap));
            this.kpiSummary = this.stateService.calculateKpiSummary(this.ingredients, this.batches);
            this.replenishmentSuggestions = this.stateService.generateReplenishmentSuggestions(this.ingredients);

            if (!this.selectedTransactionIngredientId && this.ingredients.length > 0) {
              this.selectedTransactionIngredientId = this.ingredients[0].id;
              this.loadTransactions(this.ingredients[0].id);
            }
          } catch (err) {
            console.error('Lỗi khi tính toán dữ liệu kho:', err);
          } finally {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        },
        error: err => {
          console.error('Lỗi không xác định khi tải dữ liệu kho:', err);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onTabChange(tab: InventoryTabType): void {
    this.activeTab = tab;
    this.ingredientSearchQuery = '';
    this.batchSearchQuery = '';
    this.highlightedIngredientId = null;
    this.highlightedBatchId = null;
    this.highlightedBatchCode = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
    });
    this.cdr.markForCheck();
  }

  onIngredientSearchChange(value: string): void {
    this.ingredientSearchQuery = value;
  }

  onBatchSearchChange(value: string): void {
    this.batchSearchQuery = value;
  }

  onKpiSelect(filter: KpiFilterType): void {
    this.kpiFilter = filter;
    if (filter === 'all') {
      this.onTabChange('ingredients');
      this.ingredientStockFilter = 'ALL';
      this.ingredientStatusFilter = 'all';
    } else if (filter === 'safe') {
      this.onTabChange('ingredients');
      this.ingredientStockFilter = 'SAFE';
    } else if (filter === 'lowStock') {
      this.onTabChange('ingredients');
      this.ingredientStockFilter = 'LOW';
    } else if (filter === 'expired') {
      this.onTabChange('batches');
      this.batchStatusFilter = BatchFefoStatus.Expired;
    }
  }

  onAlertSelect(alert: InventoryAlertDto): void {
    if (alert.batchCode || alert.batchId) {
      this.onTabChange('batches');
      this.highlightedBatchId = alert.batchId || null;
      this.highlightedBatchCode = alert.batchCode || null;
      if (alert.batchCode) this.batchSearchQuery = alert.batchCode;
    } else if (alert.ingredientId) {
      this.onTabChange('ingredients');
      this.highlightedIngredientId = alert.ingredientId;
    }
  }

  onAlertDiscard(alert: InventoryAlertDto): void {
    const matched = alert.batchId ? this.batchMap.get(alert.batchId) : undefined;
    if (matched) this.openDiscardModal(matched);
    else if (alert.batchId) {
      this.openDiscardModal({
        id: alert.batchId,
        batchCode: alert.batchCode || '',
        ingredientId: alert.ingredientId || '',
        ingredientName: alert.ingredientName || '',
        receivedAt: new Date().toISOString(),
        remainingQuantity: alert.remainingQuantity || 1,
        initialQuantity: alert.remainingQuantity || 1,
        unitPrice: 0,
        storageType: StorageType.SHORT_TERM,
        isCleared: false,
      });
    }
  }

  openKeeperPortal(): void {
    this.router.navigate(['/inventory-keeper/dashboard']);
  }

  openQuickInbound(ingredient?: IngredientDto, suggestedQty?: number, price?: number): void {
    this.preselectedIngredientIdForBatch = ingredient?.id;
    let qty = suggestedQty;
    if (!qty && ingredient) {
      const shortage = (ingredient.minStock || 0) - (ingredient.currentStock || 0);
      qty = shortage > 0 ? shortage : 10;
    }
    this.preselectedQuantityForBatch = qty || 10;
    const defaultPrice = ingredient?.id ? this.latestPriceByIngredientId.get(ingredient.id) : 0;
    this.preselectedPriceForBatch = price || defaultPrice || 0;
    this.isCreateBatchModalOpen = true;
  }

  onReplenishmentQuickInbound(item: ReplenishmentSuggestionItem): void {
    const ing = this.ingredientMap.get(item.ingredientId);
    const defaultPrice = this.latestPriceByIngredientId.get(item.ingredientId) || 0;
    const price = item.estimatedUnitPrice || defaultPrice || 0;
    this.openQuickInbound(ing, item.suggestedQuantity, price);
  }

  openCreateIngredient(): void { this.selectedIngredient = undefined; this.isIngredientModalOpen = true; }
  openEditIngredient(ingredient: IngredientDto): void { this.selectedIngredient = ingredient; this.isIngredientModalOpen = true; }
  openIngredientBatches(ingredient: IngredientDto): void { this.selectedIngredientForBatches = ingredient; this.isIngredientBatchesModalOpen = true; }
  openStockAdjustment(ingredient?: IngredientDto): void {
    this.selectedIngredientForAdjustment = ingredient || (this.selectedTransactionIngredientId ? this.ingredientMap.get(this.selectedTransactionIngredientId) : undefined);
    this.isAdjustmentModalOpen = true;
  }

  openDiscardModal(batch: InventoryBatchDto | BatchViewItem): void {
    const raw = (batch.id ? this.batchMap.get(batch.id) : undefined) || (batch as InventoryBatchDto);
    this.selectedBatchForDiscard = raw;
    this.selectedIngredientForDiscard = raw.ingredientId ? this.ingredientMap.get(raw.ingredientId) : undefined;
    this.isDiscardModalOpen = true;
  }

  onBatchDiscardConfirmed(event: { reason: string }): void {
    if (!this.selectedBatchForDiscard) return;
    this.isSubmittingDiscard = true;
    this.inventoryService.discardBatch(this.selectedBatchForDiscard.id, { reason: event.reason }).subscribe({
      next: () => {
        this.isSubmittingDiscard = false;
        this.isDiscardModalOpen = false;
        this.toaster.success('::DiscardBatchSuccess');
        this.loadData();
      },
      error: () => { this.isSubmittingDiscard = false; },
    });
  }

  openLockBatchModal(batch: BatchViewItem): void {
    const raw = batch.id ? this.batchMap.get(batch.id) : undefined;
    if (!raw) return;
    this.batchToDeactivate = raw;
    this.batchDeactivationReasonCode = 'QUALITY_INSPECTION';
    this.batchDeactivationNote = '';
    this.isDeactivateBatchModalOpen = true;
  }

  submitDeactivateBatch(): void {
    if (!this.batchToDeactivate || this.isSubmittingBatchDeactivation) return;
    const reasonLabel = this.localizationService.instant('::BatchDeactivationReason:' + this.batchDeactivationReasonCode);
    const reason = this.batchDeactivationNote.trim() ? `${reasonLabel}: ${this.batchDeactivationNote.trim()}` : reasonLabel;

    this.isSubmittingBatchDeactivation = true;
    this.inventoryService.deactivateBatch(this.batchToDeactivate.id, { reasonCode: this.batchDeactivationReasonCode, reason }).subscribe({
      next: () => {
        this.isSubmittingBatchDeactivation = false;
        this.isDeactivateBatchModalOpen = false;
        this.toaster.success('::DeactivateBatchSuccess');
        this.loadData();
      },
      error: () => { this.isSubmittingBatchDeactivation = false; },
    });
  }

  unlockBatch(batch: BatchViewItem): void {
    this.confirmation.warn('::ReactivateBatchConfirmMessage', '::ReactivateBatchTitle', {
      messageLocalizationParams: [batch.batchCode],
    }).subscribe((status: Confirmation.Status) => {
      if (status === Confirmation.Status.confirm) {
        this.inventoryService.reactivateBatch(batch.id).subscribe({
          next: () => { this.toaster.success('::ReactivateBatchSuccess'); this.loadData(); },
          error: () => { this.toaster.error('::GeneralError'); },
        });
      }
    });
  }

  openDeactivateIngredientModal(item: IngredientDto): void {
    this.ingredientToDeactivate = item;
    this.deactivateIngredientReason = '';
    this.isDeactivateIngredientModalOpen = true;
  }

  submitDeactivateIngredient(): void {
    if (!this.ingredientToDeactivate || !this.deactivateIngredientReason.trim() || this.isSubmittingIngredientDeactivation) return;
    this.isSubmittingIngredientDeactivation = true;
    this.ingredientService.deactivate(this.ingredientToDeactivate.id, { reason: this.deactivateIngredientReason.trim() }).subscribe({
      next: () => {
        this.isSubmittingIngredientDeactivation = false;
        this.isDeactivateIngredientModalOpen = false;
        this.toaster.success('::DeactivateIngredientSuccess');
        this.loadData();
      },
      error: () => { this.isSubmittingIngredientDeactivation = false; },
    });
  }

  confirmReactivateIngredient(item: IngredientDto): void {
    this.confirmation.warn('::ReactivateIngredientConfirmMessage', '::ReactivateIngredientTitle', {
      messageLocalizationParams: [item.name],
    }).subscribe((status: Confirmation.Status) => {
      if (status === Confirmation.Status.confirm) {
        this.ingredientService.reactivate(item.id).subscribe({
          next: () => { this.toaster.success('::ReactivateIngredientSuccess'); this.loadData(); },
          error: () => { this.toaster.error('::GeneralError'); },
        });
      }
    });
  }

  loadTransactions(ingredientId: string): void {
    if (!ingredientId) {
      this.transactions = [];
      this.isLoadingTransactions = false;
      this.cdr.markForCheck();
      return;
    }

    this.isLoadingTransactions = true;
    this.cdr.markForCheck();

    this.inventoryService
      .getTransactions(ingredientId, { maxResultCount: 1000, skipCount: 0 })
      .pipe(
        timeout(10000),
        catchError(err => {
          console.error('Lỗi hoặc timeout khi tải lịch sử biến động kho:', err);
          return of({ totalCount: 0, items: [] });
        }),
        finalize(() => {
          this.isLoadingTransactions = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: res => {
          this.transactions = res?.items || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.transactions = [];
          this.cdr.markForCheck();
        },
      });
  }

  onTransactionIngredientChange(id: string): void {
    this.selectedTransactionIngredientId = id;
    if (id) this.loadTransactions(id);
    else this.transactions = [];
  }
}
