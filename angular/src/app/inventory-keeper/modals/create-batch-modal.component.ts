import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { IngredientDto } from '../../proxy/ingredients/models';
import { CreateInventoryBatchDto, InventoryBatchDto, StorageType } from '../../proxy/inventories/models';

@Component({
  selector: 'app-create-batch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './create-batch-modal.component.html',
  styleUrls: ['./create-batch-modal.component.scss'],
})
export class CreateBatchModalComponent implements OnInit {
  private readonly ingredientService = inject(IngredientService);
  private readonly inventoryService = inject(InventoryService);
  private readonly toaster = inject(ToasterService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<InventoryBatchDto>();

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownContainer') dropdownContainerRef?: ElementRef<HTMLElement>;

  ingredients: IngredientDto[] = [];
  isLoadingIngredients = false;
  isSubmitting = false;

  isDropdownOpen = false;
  searchKeyword = '';

  batchModel: CreateInventoryBatchDto = {
    ingredientId: '',
    batchCode: '',
    initialQuantity: 10,
    unitPrice: 0,
    expiryDate: '',
    storageType: StorageType.SHORT_TERM,
  };

  selectedIngredient: IngredientDto | null = null;

  readonly storageTypes = [
    { value: StorageType.FRESH, label: '::StorageFresh' },
    { value: StorageType.SHORT_TERM, label: '::StorageShortTerm' },
    { value: StorageType.LONG_TERM, label: '::StorageLongTerm' },
  ];

  get filteredIngredients(): IngredientDto[] {
    if (!this.searchKeyword.trim()) {
      return this.ingredients;
    }
    const term = this.searchKeyword.trim().toLowerCase();
    return this.ingredients.filter(
      i =>
        (i.name && i.name.toLowerCase().includes(term)) ||
        (i.code && i.code.toLowerCase().includes(term))
    );
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isDropdownOpen && this.dropdownContainerRef?.nativeElement) {
      if (!this.dropdownContainerRef.nativeElement.contains(event.target as Node)) {
        this.isDropdownOpen = false;
      }
    }
  }

  ngOnInit(): void {
    this.loadIngredients();
  }

  loadIngredients(): void {
    this.isLoadingIngredients = true;
    this.ingredientService.getList({ maxResultCount: 1000, isActive: true }).subscribe({
      next: res => {
        this.ingredients = res.items || [];
        this.isLoadingIngredients = false;
        if (this.ingredients.length > 0 && !this.batchModel.ingredientId) {
          this.selectIngredient(this.ingredients[0]);
        }
      },
      error: () => {
        this.isLoadingIngredients = false;
      },
    });
  }

  get isFresh(): boolean {
    return (
      this.selectedIngredient?.storageType === StorageType.FRESH ||
      this.batchModel.storageType === StorageType.FRESH
    );
  }

  getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDefaultExpiryDateString(): string {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getStorageTypeLabel(type?: StorageType): string {
    switch (type) {
      case StorageType.FRESH:
        return '::StorageFresh';
      case StorageType.SHORT_TERM:
        return '::StorageShortTerm';
      case StorageType.LONG_TERM:
        return '::StorageLongTerm';
      default:
        return '';
    }
  }

  onModalOpen(): void {
    const todayStr = this.getTodayDateString();
    const dateStr = todayStr.replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);

    const firstIng = this.ingredients.length > 0 ? this.ingredients[0] : null;
    const isFresh = firstIng?.storageType === StorageType.FRESH;

    this.selectedIngredient = firstIng;
    this.batchModel = {
      ingredientId: firstIng ? firstIng.id : '',
      batchCode: `LOT-${dateStr}-${randSuffix}`,
      initialQuantity: 10,
      unitPrice: 20000,
      expiryDate: isFresh ? todayStr : this.getDefaultExpiryDateString(),
      storageType: firstIng?.storageType !== undefined ? firstIng.storageType : StorageType.SHORT_TERM,
    };

    this.isDropdownOpen = false;
    this.searchKeyword = '';
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isSubmitting) return;
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
      }, 100);
    }
  }

  selectIngredient(ing: IngredientDto, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.batchModel.ingredientId = ing.id;
    this.selectedIngredient = ing;
    if (ing.storageType !== undefined) {
      this.batchModel.storageType = ing.storageType;
    }

    if (this.isFresh) {
      this.batchModel.expiryDate = this.getTodayDateString();
    } else if (!this.batchModel.expiryDate || this.batchModel.expiryDate === this.getTodayDateString()) {
      this.batchModel.expiryDate = this.getDefaultExpiryDateString();
    }

    this.isDropdownOpen = false;
    this.searchKeyword = '';
  }

  onStorageTypeChange(newType: StorageType): void {
    this.batchModel.storageType = newType;
    if (this.isFresh) {
      this.batchModel.expiryDate = this.getTodayDateString();
    } else if (this.batchModel.expiryDate === this.getTodayDateString()) {
      this.batchModel.expiryDate = this.getDefaultExpiryDateString();
    }
  }

  clearSearch(event: MouseEvent): void {
    event.stopPropagation();
    this.searchKeyword = '';
    this.searchInputRef?.nativeElement?.focus();
  }

  submit(): void {
    if (!this.batchModel.ingredientId || !this.batchModel.batchCode?.trim() || this.isSubmitting) {
      return;
    }

    if (this.isFresh) {
      this.batchModel.expiryDate = this.getTodayDateString();
    } else if (this.batchModel.expiryDate && this.batchModel.expiryDate < this.getTodayDateString()) {
      this.toaster.error('::InventoryBatch:ExpiryDateMustBeInFuture', 'Acme.TooHungry');
      return;
    }

    this.isSubmitting = true;
    this.inventoryService.createBatch(this.batchModel).subscribe({
      next: res => {
        this.isSubmitting = false;
        this.toaster.success('::QuickInboundBatchSuccess', 'Acme.TooHungry');
        this.created.emit(res);
        this.close();
      },
      error: () => {
        this.isSubmitting = false;
      },
    });
  }

  close(): void {
    if (this.isSubmitting) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
