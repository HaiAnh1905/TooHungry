import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { TableService } from '../../../proxy/tables/table.service';
import { TableDto } from '../../../proxy/tables/models';
import { TableStatus } from '../../../proxy/tables/table-status.enum';

@Component({
  selector: 'app-table-end-meal-modal',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule],
  templateUrl: './table-end-meal-modal.component.html',
  styleUrl: './table-end-meal-modal.component.scss',
})
export class TableEndMealModalComponent implements OnChanges {
  private readonly tableService = inject(TableService);
  private readonly router = inject(Router);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);

  @Input() visible = false;
  @Input() table: TableDto | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() mealEnded = new EventEmitter<{
    table: TableDto;
    action: 'freed' | 'payment';
    orderId?: string;
  }>();

  endingMealTime = new Date();
  isSubmitting = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.endingMealTime = new Date();
      this.isSubmitting = false;
    }
  }

  get hasOrder(): boolean {
    return !!(this.table?.hasActiveOrder || this.table?.activeOrderId);
  }

  get elapsedDurationText(): string {
    if (!this.table?.occupiedTime) return '0m';
    const start = new Date(this.table.occupiedTime).getTime();
    const end = this.endingMealTime.getTime();
    const diffMs = Math.max(0, end - start);
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours}h ${remMins}m`;
    }
    return `${remMins}m`;
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  confirm(): void {
    if (!this.table || this.isSubmitting) return;

    if (this.hasOrder) {
      const orderId = this.table.activeOrderId;
      this.mealEnded.emit({
        table: this.table,
        action: 'payment',
        orderId: orderId || undefined,
      });
      this.close();
      if (orderId) {
        this.router.navigate(['/payment', orderId]);
      }
    } else {
      if (!this.table.id) return;
      this.tableService.changeStatus(this.table.id, TableStatus.Available).subscribe({
        next: (updatedTable) => {
          this.isSubmitting = false;
          this.toaster.success(
            this.localizationService.instant(
              '::TableFreedSuccess',
              this.table?.name || ''
            ),
            this.localizationService.instant('::Success')
          );
          this.mealEnded.emit({
            table: updatedTable,
            action: 'freed',
          });
          this.close();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg =
            err?.error?.error?.message ||
            this.localizationService.instant('::ActionFailed');
          this.toaster.error(msg, this.localizationService.instant('::Error'));
        },
      });
    }
  }
}
