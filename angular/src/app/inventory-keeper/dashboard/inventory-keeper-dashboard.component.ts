import {
  Component,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { LocalizationService } from '@abp/ng.core';
import { Subscription, forkJoin } from 'rxjs';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { InventoryBatchDto } from '../../proxy/inventories/models';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import { BarcodeScannerService } from '../services/barcode-scanner.service';
import { BarcodeCameraModalComponent } from '../barcode-modal/barcode-camera-modal.component';
import { CreateBatchModalComponent } from '../modals/create-batch-modal.component';
import { DiscardBatchModalComponent } from '../../inventory/discard-batch-modal/discard-batch-modal.component';
import { ExpirationBadgeComponent } from '../../inventory/expiration-badge/expiration-badge.component';

@Component({
  selector: 'app-inventory-keeper-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CoreModule,
    ThemeSharedModule,
    BarcodeCameraModalComponent,
    CreateBatchModalComponent,
    DiscardBatchModalComponent,
    ExpirationBadgeComponent,
  ],
  templateUrl: './inventory-keeper-dashboard.component.html',
  styleUrls: ['./inventory-keeper-dashboard.component.scss'],
})
export class InventoryKeeperDashboardComponent implements OnInit, OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  readonly sidebarService = inject(InventoryKeeperSidebarService);
  readonly alertStateService = inject(InventoryAlertStateService);
  readonly barcodeService = inject(BarcodeScannerService);
  private readonly router = inject(Router);

  @ViewChild('dashboardSidebarTemplate', { static: true })
  dashboardSidebarTemplate!: TemplateRef<any>;

  readonly fefoBatches = signal<InventoryBatchDto[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Selection state
  readonly selectedBatchIds = signal<Set<string>>(new Set<string>());
  readonly selectedBatches = computed(() => {
    const ids = this.selectedBatchIds();
    return this.fefoBatches().filter(b => ids.has(b.id));
  });
  readonly isAllFefoSelected = computed(() => {
    const batches = this.fefoBatches();
    return batches.length > 0 && batches.every(b => this.selectedBatchIds().has(b.id));
  });
  readonly isFefoIndeterminate = computed(() => {
    const batches = this.fefoBatches();
    const count = batches.filter(b => this.selectedBatchIds().has(b.id)).length;
    return count > 0 && count < batches.length;
  });

  // Modals state
  readonly isCreateBatchModalOpen = signal<boolean>(false);
  readonly isCameraModalOpen = signal<boolean>(false);
  readonly isDiscardModalOpen = signal<boolean>(false);
  readonly batchToDiscard = signal<InventoryBatchDto | null>(null);
  readonly batchesToDiscard = signal<InventoryBatchDto[]>([]);
  readonly isSubmittingDiscard = signal<boolean>(false);

  private alertSub?: Subscription;

  ngOnInit(): void {
    // 1. Dùng sidebar tải trước của layout
    this.sidebarService.clearTemplate();

    // 2. Tải danh sách các lô ưu tiên FEFO
    this.loadFefoBatches();

    // 3. Lắng nghe tín hiệu làm mới
    this.alertSub = this.alertStateService.refreshed$.subscribe(() => {
      this.loadFefoBatches();
    });
  }

  loadFefoBatches(): void {
    this.isLoading.set(true);
    this.inventoryService
      .getBatches({
        maxResultCount: 1000,
        onlyAvailable: true,
        isActive: true,
      })
      .subscribe({
        next: res => {
          const items = res.items || [];
          // Lọc các lô còn hạn hoặc cận date, sắp xếp theo expiryDate tăng dần (FEFO)
          const sorted = items
            .filter(b => !!b.expiryDate && !b.isCleared)
            .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

          this.fefoBatches.set(sorted.slice(0, 10)); // Lấy top 10 lô cần xuất trước
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  isBatchSelected(id: string): boolean {
    return this.selectedBatchIds().has(id);
  }

  toggleBatchSelection(batch: InventoryBatchDto): void {
    const set = new Set(this.selectedBatchIds());
    if (set.has(batch.id)) {
      set.delete(batch.id);
    } else {
      set.add(batch.id);
    }
    this.selectedBatchIds.set(set);
  }

  toggleSelectAllFefo(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const set = new Set(this.selectedBatchIds());
    if (checked) {
      this.fefoBatches().forEach(b => set.add(b.id));
    } else {
      this.fefoBatches().forEach(b => set.delete(b.id));
    }
    this.selectedBatchIds.set(set);
  }

  clearSelection(): void {
    this.selectedBatchIds.set(new Set<string>());
  }

  openBulkDiscardModal(): void {
    const batches = this.selectedBatches();
    if (batches.length === 0) return;
    this.batchToDiscard.set(null);
    this.batchesToDiscard.set(batches);
    this.isDiscardModalOpen.set(true);
  }

  openDiscardModal(batch: InventoryBatchDto): void {
    this.batchToDiscard.set(batch);
    this.batchesToDiscard.set([batch]);
    this.isDiscardModalOpen.set(true);
  }

  onDiscardConfirmed(event: { reason: string }): void {
    const batches = this.batchesToDiscard();
    if (!batches || batches.length === 0) return;

    this.isSubmittingDiscard.set(true);

    if (batches.length > 1) {
      // Xử lý xuất hủy hàng loạt qua endpoint chuyên dụng (nguyên tử, chống race condition)
      this.inventoryService
        .bulkDiscardBatches({
          batchIds: batches.map(b => b.id),
          reason: event.reason,
        })
        .subscribe({
          next: () => {
            this.isSubmittingDiscard.set(false);
            this.isDiscardModalOpen.set(false);
            this.batchToDiscard.set(null);
            this.batchesToDiscard.set([]);
            this.clearSelection();
            this.toaster.success(
              this.localizationService.instant('::BulkDiscardSuccess', batches.length + ''),
              'Acme.TooHungry'
            );
            this.alertStateService.refreshAlerts();
            this.loadFefoBatches();
          },
          error: (err) => {
            this.isSubmittingDiscard.set(false);
            const errorMsg = err?.error?.error?.message || err?.message || '::DiscardBatchError';
            this.toaster.error(errorMsg, 'Acme.TooHungry');
            this.alertStateService.refreshAlerts();
            this.loadFefoBatches();
          },
        });
    } else {
      // Xử lý xuất hủy đơn lẻ 1 lô
      const singleBatch = batches[0];
      this.inventoryService
        .discardBatch(singleBatch.id, { reason: event.reason })
        .subscribe({
          next: () => {
            this.isSubmittingDiscard.set(false);
            this.isDiscardModalOpen.set(false);
            this.batchToDiscard.set(null);
            this.batchesToDiscard.set([]);
            const set = new Set(this.selectedBatchIds());
            set.delete(singleBatch.id);
            this.selectedBatchIds.set(set);
            this.toaster.success('::DiscardBatchSuccess', 'Acme.TooHungry');
            this.alertStateService.refreshAlerts();
            this.loadFefoBatches();
          },
          error: (err) => {
            this.isSubmittingDiscard.set(false);
            const errorMsg = err?.error?.error?.message || err?.message || '::DiscardBatchError';
            this.toaster.error(errorMsg, 'Acme.TooHungry');
          },
        });
    }
  }

  onBatchCreated(): void {
    this.alertStateService.refreshAlerts();
    this.loadFefoBatches();
  }

  onScanned(code: string): void {
    // Khi quét mã vạch trên Dashboard, điều hướng sang tab Batches để tìm kiếm
    this.router.navigate(['/inventory-keeper/batches'], {
      queryParams: { search: code },
    });
  }

  goToBatchesWithFilter(filterType: string): void {
    this.router.navigate(['/inventory-keeper/batches'], {
      queryParams: { status: filterType },
    });
  }

  ngOnDestroy(): void {
    this.alertSub?.unsubscribe();
  }
}
