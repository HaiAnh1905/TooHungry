import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule } from '@abp/ng.theme.shared';
import { IngredientDto } from '../../proxy/ingredients/models';
import { InventoryBatchDto } from '../../proxy/inventories/models';
import { ExpirationBadgeComponent } from '../expiration-badge/expiration-badge.component';

@Component({
  selector: 'app-ingredient-batches-modal',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, ExpirationBadgeComponent],
  templateUrl: './ingredient-batches-modal.component.html',
  styleUrl: './ingredient-batches-modal.component.scss',
})
export class IngredientBatchesModalComponent implements OnChanges {
  @Input() ingredient?: IngredientDto;
  @Input() batches: InventoryBatchDto[] = [];
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() discardRequested = new EventEmitter<InventoryBatchDto>();
  @Output() inboundRequested = new EventEmitter<IngredientDto>();

  fefoBatches: InventoryBatchDto[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['batches'] || changes['ingredient']) {
      this.sortBatchesFEFO();
    }
  }

  private sortBatchesFEFO(): void {
    if (!this.ingredient) {
      this.fefoBatches = [];
      return;
    }
    const filtered = this.batches.filter((b) => b.ingredientId === this.ingredient!.id);
    this.fefoBatches = [...filtered].sort((a, b) => {
      // 1. FEFO: Hạn dùng sớm nhất lên trước
      if (a.expiryDate && b.expiryDate) {
        const timeA = new Date(a.expiryDate).getTime();
        const timeB = new Date(b.expiryDate).getTime();
        if (timeA !== timeB) return timeA - timeB;
      } else if (a.expiryDate && !b.expiryDate) {
        return -1;
      } else if (!a.expiryDate && b.expiryDate) {
        return 1;
      }
      // 2. Fallback FIFO: Ngày nhập sớm nhất lên trước
      const recA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const recB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return recA - recB;
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  requestDiscard(batch: InventoryBatchDto): void {
    this.discardRequested.emit(batch);
  }

  requestInbound(): void {
    if (this.ingredient) {
      this.inboundRequested.emit(this.ingredient);
    }
    this.close();
  }
}
