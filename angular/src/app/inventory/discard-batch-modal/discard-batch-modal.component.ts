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
  @Input() ingredient?: IngredientDto;
  @Input() visible = false;
  @Input() isSubmitting = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<{ reason: string }>();

  selectedCategory = 'EXPIRED';
  customNotes = '';

  readonly reasonCategories = [
    { value: 'EXPIRED', key: '::DiscardReason:Expired' },
    { value: 'DAMAGED', key: '::DiscardReason:Damaged' },
    { value: 'CONTAMINATED', key: '::DiscardReason:Contaminated' },
    { value: 'OTHER', key: '::DiscardReason:Other' },
  ];

  close(): void {
    if (this.isSubmitting) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (this.isSubmitting || !this.batch) return;

    const matchedCategory = this.reasonCategories.find((c) => c.value === this.selectedCategory);
    const categoryLabel = matchedCategory
      ? this.localizationService.instant(matchedCategory.key)
      : this.selectedCategory;

    const notes = this.customNotes.trim();
    const finalReason = notes ? `[${categoryLabel}] ${notes}` : categoryLabel;

    this.confirmed.emit({ reason: finalReason });
  }

  resetForm(): void {
    this.selectedCategory = 'EXPIRED';
    this.customNotes = '';
  }
}
