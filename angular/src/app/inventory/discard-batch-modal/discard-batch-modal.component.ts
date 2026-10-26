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

  get isBulk(): boolean {
    return (this.batches?.length ?? 0) > 1;
  }

  get effectiveBatch(): InventoryBatchDto | undefined {
    return this.batch || (this.batches?.length === 1 ? this.batches[0] : undefined);
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

  applyPresetNote(valueKey: string): void {
    const text = this.localizationService.instant(valueKey);
    this.customNotes = text;
  }

  close(): void {
    if (this.isSubmitting) return;
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

    const matchedCategory = this.reasonCategories.find((c) => c.value === this.selectedCategory);
    const categoryLabel = matchedCategory
      ? this.localizationService.instant(matchedCategory.key)
      : this.selectedCategory;

    const notes = this.customNotes.trim();
    const finalReason = notes ? `[${categoryLabel}] ${notes}` : categoryLabel;

    this.confirmed.emit({
      reason: finalReason,
      batches: this.batches?.length ? this.batches : (this.effectiveBatch ? [this.effectiveBatch] : [])
    });
  }

  resetForm(): void {
    this.selectedCategory = 'EXPIRED';
    this.customNotes = '';
    this.isSubmittedAttempt = false;
  }
}
