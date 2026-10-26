import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { IngredientDto } from '../../proxy/ingredients/models';
import {
  CreateInventoryBatchDto,
  InventoryBatchDto,
  StorageType,
} from '../../proxy/inventories/models';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-create-inventory-batch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule, CustomSelectComponent],
  templateUrl: './create-batch-modal.component.html',
  styleUrls: ['./create-batch-modal.component.scss'],
})
export class CreateInventoryBatchModalComponent implements OnInit, OnChanges {
  private readonly ingredientService = inject(IngredientService);
  private readonly inventoryService = inject(InventoryService);
  private readonly toaster = inject(ToasterService);

  @Input() visible = false;
  @Input() ingredients: IngredientDto[] = [];
  @Input() recentBatches: InventoryBatchDto[] = [];
  @Input() preselectedIngredientId?: string;
  @Input() preselectedQuantity?: number;
  @Input() preselectedPrice?: number;

  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly batchCreated = new EventEmitter<InventoryBatchDto>();

  isLoadingIngredients = false;
  isSubmitting = false;

  batchModel: CreateInventoryBatchDto = {
    ingredientId: '',
    batchCode: '',
    initialQuantity: 10,
    unitPrice: 0,
    expiryDate: '',
    storageType: StorageType.SHORT_TERM,
  };

  selectedIngredient: IngredientDto | null = null;

  readonly storageTypeOptions: CustomSelectOption[] = [
    { value: StorageType.FRESH, label: '::StorageType_FRESH', icon: 'fa-leaf' },
    { value: StorageType.SHORT_TERM, label: '::StorageType_SHORT_TERM', icon: 'fa-snowflake' },
    { value: StorageType.LONG_TERM, label: '::StorageType_LONG_TERM', icon: 'fa-box-archive' },
  ];

  get ingredientSelectOptions(): CustomSelectOption[] {
    return this.ingredients.map(ing => ({
      value: ing.id,
      label: `${ing.name} (${ing.unitName || ing.baseUnit || 'đơn vị'})`,
      desc: ing.code ? `Mã: ${ing.code}` : undefined,
      icon: 'fa-box',
    }));
  }

  get isFresh(): boolean {
    return (
      this.selectedIngredient?.storageType === StorageType.FRESH ||
      this.batchModel.storageType === StorageType.FRESH
    );
  }

  get estimatedTotal(): number {
    const qty = Number(this.batchModel.initialQuantity || 0);
    const price = Number(this.batchModel.unitPrice || 0);
    return qty * price;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.visible) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.submit();
    }
  }

  ngOnInit(): void {
    this.loadIngredients();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.visible && (changes['visible'] || changes['preselectedIngredientId'] || changes['preselectedQuantity'] || changes['preselectedPrice'] || changes['ingredients'])) {
      this.initForm();
    }
  }

  loadIngredients(): void {
    if (this.ingredients && this.ingredients.length > 0) {
      if (this.visible) {
        this.initForm();
      }
      return;
    }
    this.isLoadingIngredients = true;
    this.ingredientService.getList({ maxResultCount: 1000, isActive: true }).subscribe({
      next: res => {
        if (!this.ingredients || this.ingredients.length === 0) {
          this.ingredients = res.items || [];
        }
        this.isLoadingIngredients = false;
        if (this.visible) {
          this.initForm();
        }
      },
      error: () => {
        this.isLoadingIngredients = false;
      },
    });
  }

  getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDefaultExpiryDateString(storageType: StorageType = StorageType.SHORT_TERM): string {
    const d = new Date();
    if (storageType === StorageType.FRESH) {
      return this.getTodayDateString();
    } else if (storageType === StorageType.LONG_TERM) {
      d.setDate(d.getDate() + 180);
    } else {
      d.setDate(d.getDate() + 14);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  initForm(): void {
    const todayStr = this.getTodayDateString();
    const dateStr = todayStr.replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);

    let targetIng: IngredientDto | null = null;
    if (this.preselectedIngredientId) {
      targetIng = this.ingredients.find(i => i.id === this.preselectedIngredientId) || null;
    }
    if (!targetIng && this.ingredients.length > 0) {
      targetIng = this.ingredients[0];
    }

    const storageType = targetIng?.storageType !== undefined ? targetIng.storageType : StorageType.SHORT_TERM;

    // Lấy giá gợi ý hoặc đơn giá của lô hàng gần nhất nếu có
    let unitPrice = Number(this.preselectedPrice || 0);
    if (!unitPrice && targetIng?.id && this.recentBatches?.length > 0) {
      const lastBatch = this.recentBatches.find(b => b.ingredientId === targetIng?.id && b.unitPrice > 0);
      if (lastBatch) {
        unitPrice = lastBatch.unitPrice;
      }
    }

    this.selectedIngredient = targetIng;
    this.batchModel = {
      ingredientId: targetIng ? targetIng.id : '',
      batchCode: `LOT-${dateStr}-${randSuffix}`,
      initialQuantity: this.preselectedQuantity || 10,
      unitPrice: unitPrice,
      expiryDate: this.getDefaultExpiryDateString(storageType),
      storageType: storageType,
    };
  }

  onIngredientChange(id: any): void {
    this.batchModel.ingredientId = id;
    const ing = this.ingredients.find(i => i.id === id) || null;
    this.selectedIngredient = ing;
    if (ing && ing.storageType !== undefined) {
      this.batchModel.storageType = ing.storageType;
    }

    if (this.isFresh) {
      this.batchModel.expiryDate = this.getTodayDateString();
    } else if (!this.batchModel.expiryDate || this.batchModel.expiryDate === this.getTodayDateString()) {
      this.batchModel.expiryDate = this.getDefaultExpiryDateString();
    }
  }

  onStorageTypeChange(newType: any): void {
    this.batchModel.storageType = newType;
    if (this.isFresh) {
      this.batchModel.expiryDate = this.getTodayDateString();
    } else if (this.batchModel.expiryDate === this.getTodayDateString()) {
      this.batchModel.expiryDate = this.getDefaultExpiryDateString();
    }
  }

  submit(): void {
    if (!this.batchModel.ingredientId || !this.batchModel.batchCode?.trim() || this.isSubmitting) {
      return;
    }

    if (Number(this.batchModel.initialQuantity) <= 0) {
      this.toaster.error('::InventoryBatch:QuantityMustBePositive', 'Acme.TooHungry');
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
        this.batchCreated.emit(res);
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
