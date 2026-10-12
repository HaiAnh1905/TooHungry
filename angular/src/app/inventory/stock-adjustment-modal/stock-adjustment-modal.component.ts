import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { BatchDeductionItemDto, InventoryBatchDto } from '../../proxy/inventories/models';
import { IngredientDto } from '../../proxy/ingredients/models';

@Component({
  selector: 'app-stock-adjustment-modal',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, FormsModule, ReactiveFormsModule],
  templateUrl: './stock-adjustment-modal.component.html',
  styleUrl: './stock-adjustment-modal.component.scss',
})
export class StockAdjustmentModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly toaster = inject(ToasterService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() ingredient?: IngredientDto;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() adjusted = new EventEmitter<void>();

  form: FormGroup = this.fb.group({
    actualQuantity: [0, [Validators.required, Validators.min(0)]],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
    batchDeductions: this.fb.array([]),
  });

  availableBatches: InventoryBatchDto[] = [];
  isLoadingBatches = false;
  isSubmitting = false;

  get batchDeductionsArray(): FormArray {
    return this.form.get('batchDeductions') as FormArray;
  }

  get systemQuantity(): number {
    return this.ingredient?.currentStock || 0;
  }

  get actualQuantity(): number {
    return Number(this.form.get('actualQuantity')?.value) || 0;
  }

  get difference(): number {
    return Number((this.actualQuantity - this.systemQuantity).toFixed(4));
  }

  get shortageAmount(): number {
    return this.difference < 0 ? Math.abs(this.difference) : 0;
  }

  get totalDeductionFromBatches(): number {
    let sum = 0;
    this.batchDeductionsArray.controls.forEach((c) => {
      sum += Number(c.get('quantity')?.value) || 0;
    });
    return Number(sum.toFixed(4));
  }

  get isDeductionMismatch(): boolean {
    if (this.difference >= 0) return false;
    return Math.abs(this.totalDeductionFromBatches - this.shortageAmount) > 0.0001;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.ingredient) {
      this.resetForm();
      this.loadBatches();
    }
  }

  resetForm(): void {
    this.form.reset({
      actualQuantity: this.ingredient?.currentStock || 0,
      reason: '',
    });
    this.batchDeductionsArray.clear();
  }

  loadBatches(): void {
    if (!this.ingredient) return;
    this.isLoadingBatches = true;
    this.inventoryService.getBatches(this.ingredient.id).subscribe({
      next: (res) => {
        // Chỉ lấy các lô còn hàng
        const items = res?.items || [];
        this.availableBatches = items.filter((b) => b.remainingQuantity > 0 && !b.isCleared);
        this.initBatchDeductionControls();
        this.isLoadingBatches = false;
      },
      error: () => {
        this.availableBatches = [];
        this.isLoadingBatches = false;
      },
    });
  }

  initBatchDeductionControls(): void {
    this.batchDeductionsArray.clear();
    this.availableBatches.forEach((batch) => {
      this.batchDeductionsArray.push(
        this.fb.group({
          batchId: [batch.id],
          batchCode: [batch.batchCode],
          remainingQuantity: [batch.remainingQuantity],
          quantity: [0, [Validators.min(0), Validators.max(batch.remainingQuantity)]],
        })
      );
    });
  }

  onActualQuantityChange(): void {
    if (this.difference < 0) {
      this.autoAllocateFifo();
    } else {
      this.clearDeductions();
    }
  }

  autoAllocateFifo(): void {
    if (this.difference >= 0) return;
    let remainingToDeduct = this.shortageAmount;

    this.batchDeductionsArray.controls.forEach((ctrl) => {
      const batchStock = Number(ctrl.get('remainingQuantity')?.value) || 0;
      const allocate = Math.min(remainingToDeduct, batchStock);
      ctrl.patchValue({ quantity: allocate });
      remainingToDeduct -= allocate;
    });
  }

  setMaxDeduction(index: number): void {
    const targetCtrl = this.batchDeductionsArray.at(index);
    if (!targetCtrl) return;

    const targetStock = Number(targetCtrl.get('remainingQuantity')?.value) || 0;
    // Lô này sẽ nhận tối đa: số tồn của nó hoặc tổng lượng hao hụt
    const targetAlloc = Math.min(targetStock, this.shortageAmount);
    targetCtrl.patchValue({ quantity: targetAlloc });

    // Số hao hụt còn lại cần các lô khác bù đắp
    let remainingNeeded = Math.max(0, this.shortageAmount - targetAlloc);

    this.batchDeductionsArray.controls.forEach((ctrl, i) => {
      if (i === index) return;
      const bStock = Number(ctrl.get('remainingQuantity')?.value) || 0;
      const alloc = Math.min(remainingNeeded, bStock);
      ctrl.patchValue({ quantity: alloc });
      remainingNeeded -= alloc;
    });

    this.cdr.detectChanges();
  }

  clearDeductions(): void {
    this.batchDeductionsArray.controls.forEach((c) => c.patchValue({ quantity: 0 }));
  }

  setQuickReason(reason: string): void {
    this.form.patchValue({ reason });
  }

  submit(): void {
    if (!this.ingredient || this.form.invalid) return;

    if (this.difference < 0 && this.isDeductionMismatch) {
      this.toaster.error(
        `Tổng số lượng trừ ở các lô (${this.totalDeductionFromBatches}) phải bằng số lượng hao hụt (${this.shortageAmount})`
      );
      return;
    }

    const deductions: BatchDeductionItemDto[] = [];
    if (this.difference < 0) {
      this.batchDeductionsArray.controls.forEach((c) => {
        const qty = Number(c.get('quantity')?.value) || 0;
        if (qty > 0) {
          deductions.push({
            batchId: c.get('batchId')?.value,
            quantity: qty,
            deductQuantity: qty,
          });
        }
      });
    }

    this.isSubmitting = true;
    this.inventoryService
      .adjustStock({
        ingredientId: this.ingredient.id,
        actualQuantity: this.actualQuantity,
        reason: this.form.get('reason')?.value,
        batchDeductions: deductions,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toaster.success('::AdjustStockSuccess');
          this.adjusted.emit();
          this.close();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra khi điều chỉnh tồn kho');
        },
      });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
