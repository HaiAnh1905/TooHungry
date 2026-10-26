import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { IngredientDto } from '../../../proxy/ingredients/models';
import { InventoryTransactionDto, InventoryTransactionType } from '../../../proxy/inventories/models';
import { CustomSelectComponent, CustomSelectOption } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-inventory-transaction-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, CustomSelectComponent],
  templateUrl: './inventory-transaction-tab.component.html',
  styleUrls: ['./inventory-transaction-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryTransactionTabComponent implements OnChanges {
  private readonly localizationService = inject(LocalizationService);

  @Input({ required: true }) transactions: InventoryTransactionDto[] = [];
  @Input({ required: true }) ingredients: IngredientDto[] = [];
  @Input() selectedIngredientId: string | null = null;
  @Input() selectedTypeFilter: InventoryTransactionType | 'ALL' = 'ALL';
  @Input() isLoading: boolean = false;

  @Output() readonly openStockAdjustment = new EventEmitter<void>();
  @Output() readonly filterChange = new EventEmitter<InventoryTransactionType | 'ALL'>();
  @Output() readonly ingredientChange = new EventEmitter<string>();

  readonly TransactionTypeEnum = InventoryTransactionType;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  filteredTransactions: InventoryTransactionDto[] = [];

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
    return this.ingredients.map(ing => ({
      value: ing.id,
      label: `${ing.name} (${ing.unitName || ing.baseUnit || 'đơn vị'})`,
      desc: ing.code ? `Mã: ${ing.code}` : undefined,
      icon: 'fa-box',
    }));
  }

  readonly transactionTypeOptions: CustomSelectOption[] = [
    { value: 'ALL', label: '::AllTransactionTypes', icon: 'fa-layer-group' },
    { value: InventoryTransactionType.IN, label: '::TransactionType:In', icon: 'fa-arrow-down' },
    { value: InventoryTransactionType.OUT, label: '::TransactionType:Out', icon: 'fa-arrow-up' },
    { value: InventoryTransactionType.ADJUSTMENT_IN, label: '::TransactionType:AdjIn', icon: 'fa-plus' },
    { value: InventoryTransactionType.ADJUSTMENT_OUT, label: '::TransactionType:AdjOut', icon: 'fa-minus' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] || changes['selectedTypeFilter'] || changes['selectedIngredientId']) {
      this.applyFilter();
    }
  }

  applyFilter(): void {
    let list = [...this.transactions];

    if (this.selectedTypeFilter !== 'ALL') {
      list = list.filter(tx => (tx.transactionType ?? tx.type) === this.selectedTypeFilter);
    }

    this.filteredTransactions = list;

    const totalPages = this.totalPages;
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages || 1;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
  }

  get pagedTransactions(): InventoryTransactionDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(start, start + this.pageSize);
  }

  get fromRecord(): number {
    if (this.filteredTransactions.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredTransactions.length);
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

  onIngredientSelect(id: any): void {
    this.selectedIngredientId = id;
    this.ingredientChange.emit(id);
  }

  onTypeFilterSelect(type: any): void {
    this.selectedTypeFilter = type;
    this.filterChange.emit(type);
    this.applyFilter();
  }

  isDiscardTransaction(tx: InventoryTransactionDto): boolean {
    const reason = tx.reason || '';
    return (
      reason.includes('hủy') ||
      reason.includes('Hủy') ||
      reason.includes('Discard') ||
      reason.includes('discard')
    );
  }
}
