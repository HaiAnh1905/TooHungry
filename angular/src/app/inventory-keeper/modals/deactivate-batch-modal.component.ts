import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { InventoryBatchDto } from '../../proxy/inventories/models';

@Component({
  selector: 'app-deactivate-batch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './deactivate-batch-modal.component.html',
  styleUrls: ['./deactivate-batch-modal.component.scss'],
})
export class DeactivateBatchModalComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly toaster = inject(ToasterService);

  @Input() batch: InventoryBatchDto | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() deactivated = new EventEmitter<InventoryBatchDto>();

  reason = '';
  isSubmitting = false;

  onModalOpen(): void {
    this.reason = '';
    this.isSubmitting = false;
  }

  submit(): void {
    if (!this.batch || !this.reason.trim() || this.isSubmitting) return;

    this.isSubmitting = true;
    this.inventoryService
      .deactivateBatch(this.batch.id, {
        reason: this.reason.trim(),
      })
      .subscribe({
        next: updatedBatch => {
          this.isSubmitting = false;
          this.toaster.success('::DeactivateBatchSuccess', 'Acme.TooHungry');
          this.deactivated.emit(updatedBatch);
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
