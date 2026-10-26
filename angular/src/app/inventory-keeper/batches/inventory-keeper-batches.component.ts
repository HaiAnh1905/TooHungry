import {
  Component,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { Subscription, debounceTime, distinctUntilChanged, Subject, forkJoin } from 'rxjs';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { InventoryBatchDto, StorageType } from '../../proxy/inventories/models';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { BarcodeScannerService } from '../services/barcode-scanner.service';
import {
  BatchStatusFilterType,
  StorageConditionType,
} from '../models/inventory-keeper.models';
import { BarcodeCameraModalComponent } from '../barcode-modal/barcode-camera-modal.component';
import { CreateBatchModalComponent } from '../modals/create-batch-modal.component';
import { DeactivateBatchModalComponent } from '../modals/deactivate-batch-modal.component';
import { DiscardBatchModalComponent } from '../../inventory/discard-batch-modal/discard-batch-modal.component';
import { ExpirationBadgeComponent } from '../../inventory/expiration-badge/expiration-badge.component';

@Component({
  selector: 'app-inventory-keeper-batches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
    BarcodeCameraModalComponent,
    CreateBatchModalComponent,
    DeactivateBatchModalComponent,
    DiscardBatchModalComponent,
    ExpirationBadgeComponent,
  ],
  templateUrl: './inventory-keeper-batches.component.html',
  styleUrls: ['./inventory-keeper-batches.component.scss'],
})
export class InventoryKeeperBatchesComponent implements OnInit, OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly route = inject(ActivatedRoute);
  readonly sidebarService = inject(InventoryKeeperSidebarService);
  readonly alertStateService = inject(InventoryAlertStateService);
  readonly barcodeService = inject(BarcodeScannerService);

  @ViewChild('batchesSidebarTemplate', { static: true })
  batchesSidebarTemplate!: TemplateRef<any>;

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly allBatches = signal<InventoryBatchDto[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Filters State
  readonly searchTerm = signal<string>('');
  readonly selectedCondition = signal<StorageConditionType>(StorageConditionType.All);
  readonly selectedStatus = signal<BatchStatusFilterType>(BatchStatusFilterType.All);

  readonly StorageConditionType = StorageConditionType;
  readonly BatchStatusFilterType = BatchStatusFilterType;

  // Search Debounce Subject
  private readonly searchSubject = new Subject<string>();

  // Modals
  readonly isCreateBatchModalOpen = signal<boolean>(false);
  readonly isCameraModalOpen = signal<boolean>(false);
  readonly isDeactivateModalOpen = signal<boolean>(false);
  readonly isDiscardModalOpen = signal<boolean>(false);
  readonly batchToAct = signal<InventoryBatchDto | null>(null);
  readonly batchesToAct = signal<InventoryBatchDto[]>([]);
  readonly isSubmittingAction = signal<boolean>(false);

  // Bulk Selection State
  readonly selectedBatchIds = signal<Set<string>>(new Set<string>());

  readonly selectedBatches = computed(() => {
    const ids = this.selectedBatchIds();
    return this.allBatches().filter(b => ids.has(b.id));
  });

  readonly isAllPageSelected = computed(() => {
    const paged = this.pagedBatches();
    if (paged.length === 0) return false;
    const ids = this.selectedBatchIds();
    return paged.every(b => ids.has(b.id));
  });

  readonly isPageIndeterminate = computed(() => {
    const paged = this.pagedBatches();
    const ids = this.selectedBatchIds();
    const count = paged.filter(b => ids.has(b.id)).length;
    return count > 0 && count < paged.length;
  });

  private querySub?: Subscription;
  private scanSub?: Subscription;
  private searchSub?: Subscription;
  private alertRefreshSub?: Subscription;

  // Computed filtered list
  readonly filteredBatches = computed(() => {
    const list = this.allBatches();
    const sidebarQuery = this.sidebarService?.batchesSearchTerm ? this.sidebarService.batchesSearchTerm() : '';
    const query = (sidebarQuery || this.searchTerm()).trim().toLowerCase();
    const sidebarCond = this.sidebarService?.batchesCondition ? this.sidebarService.batchesCondition() : StorageConditionType.All;
    const condition = sidebarCond !== StorageConditionType.All ? sidebarCond : this.selectedCondition();
    const sidebarStatus = this.sidebarService?.batchesStatus ? this.sidebarService.batchesStatus() : BatchStatusFilterType.All;
    const status = sidebarStatus !== BatchStatusFilterType.All ? sidebarStatus : this.selectedStatus();

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return list.filter(batch => {
      // 1. Text Search (batchCode, ingredientName, etc.)
      if (query) {
        const code = (batch.batchCode || '').toLowerCase();
        const ingName = (batch.ingredientName || '').toLowerCase();
        if (!code.includes(query) && !ingName.includes(query)) {
          return false;
        }
      }

      // 2. Storage Condition
      if (condition !== StorageConditionType.All) {
        if (condition === StorageConditionType.Chilled && batch.storageType !== StorageType.FRESH) {
          return false;
        }
        if (condition === StorageConditionType.Frozen && batch.storageType !== StorageType.SHORT_TERM) {
          return false;
        }
        if (condition === StorageConditionType.Dry && batch.storageType !== StorageType.LONG_TERM) {
          return false;
        }
      }

      // 3. Batch Status
      if (status !== BatchStatusFilterType.All) {
        const isDeactivated = batch.isActive === false;

        if (status === BatchStatusFilterType.Deactivated) {
          return isDeactivated;
        }

        // Với các status khác, nếu bị khóa thì bỏ qua
        if (isDeactivated) return false;

        let diffDays = 999;
        if (batch.expiryDate) {
          const exp = new Date(batch.expiryDate);
          exp.setHours(0, 0, 0, 0);
          diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (status === BatchStatusFilterType.Expired) {
          return diffDays <= 0;
        }
        if (status === BatchStatusFilterType.ExpiringSoon) {
          return diffDays > 0 && diffDays <= 7;
        }
        if (status === BatchStatusFilterType.InUse) {
          return diffDays > 7;
        }
      }

      return true;
    });
  });

  // Pagination signals (mặc định 10 items/trang theo yêu cầu)
  readonly pageSize = signal<number>(10);
  readonly currentPage = signal<number>(1);

  readonly totalBatches = computed(() => this.filteredBatches().length);
  readonly totalPages = computed(() => Math.ceil(this.totalBatches() / this.pageSize()) || 1);

  readonly pagedBatches = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredBatches().slice(start, start + size);
  });

  readonly fromRecord = computed(() => {
    if (this.totalBatches() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly toRecord = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalBatches());
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



  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.sidebarService.setMobileDrawerOpen(true);
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
        this.searchInputRef?.nativeElement?.select();
      }, 100);
    }
  }

  ngOnInit(): void {
    this.sidebarService.clearTemplate();

    this.searchSub = this.searchSubject
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(val => {
        this.searchTerm.set(val);
        this.sidebarService?.setBatchesSearch?.(val);
      });

    // Theo dõi Query Params từ URL (vd: ?status=ExpiringSoon hoặc ?search=...)
    this.querySub = this.route.queryParams.subscribe(params => {
      if (params['status']) {
        const s = params['status'] as BatchStatusFilterType;
        if (Object.values(BatchStatusFilterType).includes(s)) {
          this.selectedStatus.set(s);
          this.sidebarService?.setBatchesStatus?.(s);
        }
      }
      if (params['search']) {
        this.searchTerm.set(params['search']);
        this.sidebarService?.setBatchesSearch?.(params['search']);
      }
    });

    // Lắng nghe súng quét barcode HID & Camera
    this.scanSub = this.barcodeService.scanned$.subscribe(event => {
      this.onBarcodeScanned(event.code);
    });

    this.loadBatches();

    this.alertRefreshSub = this.alertStateService.refreshed$.subscribe(() => {
      this.loadBatches();
    });
  }

  loadBatches(): void {
    this.isLoading.set(true);
    this.inventoryService
      .getBatches({
        maxResultCount: 1000,
      })
      .subscribe({
        next: res => {
          this.allBatches.set(res.items || []);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onSearchInput(value: string): void {
    this.currentPage.set(1);
    this.searchSubject.next(value);
    this.sidebarService?.setBatchesSearch?.(value);
  }

  clearSearch(): void {
    this.currentPage.set(1);
    this.searchTerm.set('');
    this.sidebarService?.clearBatchesSearch?.();
  }

  setCondition(cond: StorageConditionType): void {
    this.currentPage.set(1);
    this.selectedCondition.set(cond);
    this.sidebarService?.setBatchesCondition?.(cond);
  }

  setStatus(st: BatchStatusFilterType): void {
    this.currentPage.set(1);
    this.selectedStatus.set(st);
    this.sidebarService?.setBatchesStatus?.(st);
  }

  onBarcodeScanned(code: string): void {
    this.currentPage.set(1);
    this.searchTerm.set(code);
    this.sidebarService?.setBatchesSearch?.(code);
    // Smooth scroll tới dòng lô tìm được
    setTimeout(() => {
      const el = document.getElementById(`batch-row-${code}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-pulse');
        setTimeout(() => el.classList.remove('highlight-pulse'), 2500);
      } else {
        this.toaster.info('::BarcodeNotFound', 'Acme.TooHungry');
      }
    }, 200);
  }

  isBatchSelected(id: string): boolean {
    return this.selectedBatchIds().has(id);
  }

  toggleBatchSelection(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedBatchIds.update(set => {
      const next = new Set(set);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  toggleSelectAllPage(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const paged = this.pagedBatches();
    this.selectedBatchIds.update(set => {
      const next = new Set(set);
      paged.forEach(b => {
        if (checked) {
          next.add(b.id);
        } else {
          next.delete(b.id);
        }
      });
      return next;
    });
  }

  clearSelection(): void {
    this.selectedBatchIds.set(new Set<string>());
  }

  openDiscard(batch: InventoryBatchDto): void {
    this.batchToAct.set(batch);
    this.batchesToAct.set([batch]);
    this.isDiscardModalOpen.set(true);
  }

  openBulkDiscardModal(): void {
    const selected = this.selectedBatches();
    if (selected.length === 0) return;
    this.batchesToAct.set(selected);
    this.batchToAct.set(selected[0]);
    this.isDiscardModalOpen.set(true);
  }

  onDiscardConfirmed(event: { reason: string }): void {
    const batches = this.batchesToAct();
    if (!batches || batches.length === 0) {
      const single = this.batchToAct();
      if (!single) return;
      this.batchesToAct.set([single]);
    }

    const targets = this.batchesToAct();
    this.isSubmittingAction.set(true);

    if (targets.length > 1) {
      this.inventoryService
        .bulkDiscardBatches({
          batchIds: targets.map(b => b.id),
          reason: event.reason,
        })
        .subscribe({
          next: () => {
            this.isSubmittingAction.set(false);
            this.isDiscardModalOpen.set(false);
            const count = targets.length;
            this.clearSelection();
            this.batchesToAct.set([]);
            this.batchToAct.set(null);
            const successMsg = this.localizationService.instant(
              '::BulkDiscardSuccess',
              count.toString()
            );
            this.toaster.success(successMsg, 'Acme.TooHungry');
            this.alertStateService.refreshAlerts();
            this.loadBatches();
          },
          error: err => {
            this.isSubmittingAction.set(false);
            const errorMsg =
              err?.error?.error?.message || err?.message || '::DiscardBatchError';
            this.toaster.error(errorMsg, 'Acme.TooHungry');
            this.alertStateService.refreshAlerts();
            this.loadBatches();
          },
        });
    } else {
      const batch = targets[0];
      this.inventoryService.discardBatch(batch.id, { reason: event.reason }).subscribe({
        next: () => {
          this.isSubmittingAction.set(false);
          this.isDiscardModalOpen.set(false);
          this.selectedBatchIds.update(set => {
            const next = new Set(set);
            next.delete(batch.id);
            return next;
          });
          this.batchesToAct.set([]);
          this.batchToAct.set(null);
          this.toaster.success('::DiscardBatchSuccess', 'Acme.TooHungry');
          this.alertStateService.refreshAlerts();
          this.loadBatches();
        },
        error: err => {
          this.isSubmittingAction.set(false);
          const errorMsg =
            err?.error?.error?.message || err?.message || '::DiscardBatchError';
          this.toaster.error(errorMsg, 'Acme.TooHungry');
        },
      });
    }
  }

  openDeactivate(batch: InventoryBatchDto): void {
    this.batchToAct.set(batch);
    this.isDeactivateModalOpen.set(true);
  }

  onDeactivated(): void {
    this.alertStateService.refreshAlerts();
    this.loadBatches();
  }

  reactivate(batch: InventoryBatchDto): void {
    this.isSubmittingAction.set(true);
    this.inventoryService.reactivateBatch(batch.id).subscribe({
      next: () => {
        this.isSubmittingAction.set(false);
        this.toaster.success('::ReactivateBatchSuccess', 'Acme.TooHungry');
        this.alertStateService.refreshAlerts();
        this.loadBatches();
      },
      error: () => {
        this.isSubmittingAction.set(false);
      },
    });
  }

  onBatchCreated(): void {
    this.alertStateService.refreshAlerts();
    this.loadBatches();
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    this.scanSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    this.alertRefreshSub?.unsubscribe();
  }
}
