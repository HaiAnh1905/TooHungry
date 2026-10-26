import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { BatchFefoStatus, BatchViewItem } from '../../models/inventory-dashboard.models';
import { StorageType } from '../../../proxy/inventories/models';
import { CustomSelectComponent, CustomSelectOption } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-inventory-batch-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, CustomSelectComponent],
  templateUrl: './inventory-batch-tab.component.html',
  styleUrls: ['./inventory-batch-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryBatchTabComponent implements OnChanges {
  private readonly localizationService = inject(LocalizationService);

  @Input({ required: true }) batches: BatchViewItem[] = [];
  @Input() searchQuery: string = '';
  @Input() statusFilter: BatchFefoStatus | 'ALL' = 'ALL';
  @Input() activeFilter: 'all' | 'active' | 'deactivated' = 'all';
  @Input() sortDirection: 'newest' | 'oldest' = 'newest';
  @Input() isLoading: boolean = false;
  @Input() highlightedBatchId: string | null = null;
  @Input() highlightedBatchCode: string | null = null;

  @Output() readonly openCreateBatch = new EventEmitter<void>();
  @Output() readonly lockBatch = new EventEmitter<BatchViewItem>();
  @Output() readonly unlockBatch = new EventEmitter<BatchViewItem>();
  @Output() readonly discardBatch = new EventEmitter<BatchViewItem>();
  @Output() readonly searchChange = new EventEmitter<string>();
  @Output() readonly statusFilterChange = new EventEmitter<BatchFefoStatus | 'ALL'>();
  @Output() readonly activeFilterChange = new EventEmitter<'all' | 'active' | 'deactivated'>();
  @Output() readonly sortDirectionChange = new EventEmitter<'newest' | 'oldest'>();

  readonly BatchFefoStatusEnum = BatchFefoStatus;
  readonly StorageTypeEnum = StorageType;
  protected readonly Math = Math;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  filteredBatches: BatchViewItem[] = [];

  get pageSizeOptions(): CustomSelectOption[] {
    const unit = this.localizationService.instant('::RowsPerPage');
    return [
      { value: 5, label: `5 ${unit}` },
      { value: 10, label: `10 ${unit}` },
      { value: 20, label: `20 ${unit}` },
      { value: 50, label: `50 ${unit}` },
    ];
  }

  readonly fefoStatusOptions: CustomSelectOption[] = [
    { value: 'ALL', label: '::AllBatchStatuses', icon: 'fa-layer-group' },
    { value: BatchFefoStatus.Safe, label: '::BatchSafe', icon: 'fa-shield-halved' },
    { value: BatchFefoStatus.ExpiringSoon, label: '::BatchExpiringSoon', icon: 'fa-clock-rotate-left' },
    { value: BatchFefoStatus.Expired, label: '::BatchExpired', icon: 'fa-triangle-exclamation' },
    { value: BatchFefoStatus.Locked, label: '::StatusSuspended', icon: 'fa-lock' },
  ];

  readonly activeFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllStatuses', icon: 'fa-layer-group' },
    { value: 'active', label: '::ActiveOnly', icon: 'fa-circle-check' },
    { value: 'deactivated', label: '::DeactivatedOnly', icon: 'fa-lock' },
  ];

  readonly sortDirectionOptions: CustomSelectOption[] = [
    { value: 'newest', label: '::SortReceivedNewest', icon: 'fa-arrow-down-wide-short' },
    { value: 'oldest', label: '::SortReceivedOldest', icon: 'fa-arrow-up-wide-short' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['batches'] ||
      changes['searchQuery'] ||
      changes['statusFilter'] ||
      changes['activeFilter'] ||
      changes['sortDirection']
    ) {
      this.applyFilter();
    }
  }

  applyFilter(): void {
    let list = [...this.batches];

    // 1. Search query
    if (this.searchQuery && this.searchQuery.trim()) {
      const term = this.searchQuery.trim().toLowerCase();
      list = list.filter(
        b =>
          (b.batchCode && b.batchCode.toLowerCase().includes(term)) ||
          (b.ingredientName && b.ingredientName.toLowerCase().includes(term))
      );
    }

    // 2. FEFO Status filter
    if (this.statusFilter !== 'ALL') {
      list = list.filter(b => b.fefoStatus === this.statusFilter);
    }

    // 3. Active / Locked filter (RM-013)
    if (this.activeFilter === 'active') {
      list = list.filter(b => b.isActive);
    } else if (this.activeFilter === 'deactivated') {
      list = list.filter(b => !b.isActive);
    }

    // 4. Sort
    list.sort((a, b) => {
      const timeA = a.inboundDate ? new Date(a.inboundDate).getTime() : 0;
      const timeB = b.inboundDate ? new Date(b.inboundDate).getTime() : 0;
      return this.sortDirection === 'newest' ? timeB - timeA : timeA - timeB;
    });

    this.filteredBatches = list;

    // Reset page if out of bounds
    const totalPages = this.totalPages;
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages || 1;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredBatches.length / this.pageSize) || 1;
  }

  get pagedBatches(): BatchViewItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredBatches.slice(start, start + this.pageSize);
  }

  get fromRecord(): number {
    if (this.filteredBatches.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredBatches.length);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchChange.emit(value);
    this.applyFilter();
  }

  onStatusChange(value: any): void {
    this.statusFilter = value;
    this.statusFilterChange.emit(value);
    this.applyFilter();
  }

  onActiveFilterChange(value: any): void {
    this.activeFilter = value;
    this.activeFilterChange.emit(value);
    this.applyFilter();
  }

  onSortChange(value: any): void {
    this.sortDirection = value;
    this.sortDirectionChange.emit(value);
    this.applyFilter();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'ALL';
    this.activeFilter = 'all';
    this.sortDirection = 'newest';
    this.searchChange.emit('');
    this.statusFilterChange.emit('ALL');
    this.activeFilterChange.emit('all');
    this.sortDirectionChange.emit('newest');
    this.applyFilter();
  }

  get hasActiveFilters(): boolean {
    return (
      !!this.searchQuery.trim() ||
      this.statusFilter !== 'ALL' ||
      this.activeFilter !== 'all' ||
      this.sortDirection !== 'newest'
    );
  }

  // Drag-to-scroll (kéo thả trái phải xem thông tin)
  isDragging = false;
  private startX = 0;
  private scrollLeftStart = 0;

  onTableMouseDown(event: MouseEvent, container: HTMLDivElement): void {
    // Không kích hoạt kéo thả khi tương tác trên 2 nút action hoặc các phần tử tương tác khác
    const target = event.target as HTMLElement;
    if (target.closest('.action-buttons-group, .btn-row-action, button, a, input, select')) {
      return;
    }

    if (event.button !== 0) return; // Chỉ áp dụng với chuột trái

    this.isDragging = true;
    this.startX = event.clientX;
    this.scrollLeftStart = container.scrollLeft;
  }

  onTableMouseMove(event: MouseEvent, container: HTMLDivElement): void {
    if (!this.isDragging) return;
    event.preventDefault();
    const deltaX = event.clientX - this.startX;
    container.scrollLeft = this.scrollLeftStart - deltaX;
  }

  onTableMouseUp(): void {
    this.isDragging = false;
  }

  onTableMouseLeave(): void {
    this.isDragging = false;
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
    }
  }
}
