import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule } from '@abp/ng.theme.shared';
import { IngredientDto } from '../../proxy/ingredients/models';
import { InventoryBatchDto } from '../../proxy/inventories/models';

@Component({
  selector: 'app-discard-batch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './discard-batch-modal.component.html',
  styleUrl: './discard-batch-modal.component.scss',
})
export class DiscardBatchModalComponent {
  private readonly localizationService = inject(LocalizationService);

  @Input() batch?: InventoryBatchDto;
  @Input() batches: InventoryBatchDto[] = [];
  @Input() ingredient?: IngredientDto;
  @Input() visible = false;
  @Input() isSubmitting = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<{ reason: string; batches?: InventoryBatchDto[] }>();

  selectedCategory = 'EXPIRED';
  customNotes = '';
  isSubmittedAttempt = false;
  isSafeConfirmModalOpen = false;

  get isBulk(): boolean {
    return (this.batches?.length ?? 0) > 1;
  }

  get effectiveBatch(): InventoryBatchDto | undefined {
    return this.batch || (this.batches?.length === 1 ? this.batches[0] : undefined);
  }

  get selectedCategoryLabel(): string {
    const matchedCategory = this.reasonCategories.find((c) => c.value === this.selectedCategory);
    return matchedCategory ? this.localizationService.instant(matchedCategory.key) : this.selectedCategory;
  }

  get safeBatchesCount(): number {
    if (!this.batches || this.batches.length === 0) {
      return this.effectiveBatch && this.isBatchSafe(this.effectiveBatch) ? 1 : 0;
    }
    return this.batches.filter((b) => this.isBatchSafe(b)).length;
  }

  readonly reasonCategories = [
    { value: 'EXPIRED', key: '::DiscardReason:Expired' },
    { value: 'DAMAGED', key: '::DiscardReason:Damaged' },
    { value: 'CONTAMINATED', key: '::DiscardReason:Contaminated' },
    { value: 'OTHER', key: '::DiscardReason:Other' },
  ];

  readonly defaultNotePresets = [
    {
      labelKey: '::DiscardPresetNote:ExpiredShort',
      valueKey: '::DiscardPresetNote:Expired',
    },
    {
      labelKey: '::DiscardPresetNote:DamagedShort',
      valueKey: '::DiscardPresetNote:Damaged',
    },
    {
      labelKey: '::DiscardPresetNote:SensoryFailedShort',
      valueKey: '::DiscardPresetNote:SensoryFailed',
    },
  ];

  isBatchSafe(batch?: any): boolean {
    if (!batch) return false;
    if (batch.fefoStatus === 'safe' || batch.fefoStatus === 'Safe') {
      return true;
    }
    if (!batch.expiryDate) {
      return false;
    }
    const now = Date.now();
    const exp = new Date(batch.expiryDate).getTime();
    if (isNaN(exp)) return false;

    // Đã quá hạn
    if (exp <= now) {
      return false;
    }

    const storageType = batch.storageType ?? this.ingredient?.storageType;
    if (storageType === 0) {
      // Đối với nguyên liệu tươi sống (FRESH / 0), chưa đến hạn thì luôn là safe
      return true;
    }

    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays > 3;
  }

  applyPresetNote(valueKey: string): void {
    const text = this.localizationService.instant(valueKey);
    this.customNotes = text;
  }

  close(): void {
    if (this.isSubmitting) return;
    this.isSafeConfirmModalOpen = false;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  submit(): void {
    this.isSubmittedAttempt = true;
    if (this.isSubmitting) return;
    if (!this.effectiveBatch && (!this.batches || this.batches.length === 0)) return;

    if (!this.customNotes.trim()) {
      return;
    }

    const targetBatches = this.batches?.length
      ? this.batches
      : (this.effectiveBatch ? [this.effectiveBatch] : []);

    const hasSafeBatch = targetBatches.some((b) => this.isBatchSafe(b));
    if (hasSafeBatch) {
      this.isSafeConfirmModalOpen = true;
      return;
    }

    this.executeSubmit();
  }

  executeSubmit(): void {
    const matchedCategory = this.reasonCategories.find((c) => c.value === this.selectedCategory);
    const categoryLabel = matchedCategory
      ? this.localizationService.instant(matchedCategory.key)
      : this.selectedCategory;

    const notes = this.customNotes.trim();
    const finalReason = notes ? `[${categoryLabel}] ${notes}` : categoryLabel;
    const targetBatches = this.batches?.length
      ? this.batches
      : (this.effectiveBatch ? [this.effectiveBatch] : []);

    this.confirmed.emit({
      reason: finalReason,
      batches: targetBatches,
    });
  }

  confirmSafeDiscard(): void {
    this.isSafeConfirmModalOpen = false;
    this.executeSubmit();
  }

  cancelSafeConfirm(): void {
    this.isSafeConfirmModalOpen = false;
  }

  onSafeConfirmVisibleChange(isOpen: boolean): void {
    if (!isOpen) {
      this.cancelSafeConfirm();
    }
  }

  onMainModalVisibleChange(isOpen: boolean): void {
    if (!isOpen && !this.isSafeConfirmModalOpen) {
      this.close();
    }
  }

  resetForm(): void {
    this.selectedCategory = 'EXPIRED';
    this.customNotes = '';
    this.isSubmittedAttempt = false;
    this.isSafeConfirmModalOpen = false;
  }
}
