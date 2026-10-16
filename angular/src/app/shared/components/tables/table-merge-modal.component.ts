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
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { TableService } from '../../../proxy/tables/table.service';
import { TableDto } from '../../../proxy/tables/models';
import { TableStatus } from '../../../proxy/tables/table-status.enum';

@Component({
  selector: 'app-table-merge-modal',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule],
  templateUrl: './table-merge-modal.component.html',
  styleUrl: './table-merge-modal.component.scss',
})
export class TableMergeModalComponent implements OnChanges {
  private readonly tableService = inject(TableService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);

  @Input() visible = false;
  @Input() primaryTable: TableDto | null = null;
  @Input() tables: TableDto[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() merged = new EventEmitter<{ primaryTable: TableDto; secondaryTable: TableDto }>();

  selectedSecondaryTableId: string | null = null;
  isSubmitting = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetState();
    }
  }

  get availableSecondaryTables(): TableDto[] {
    return this.tables.filter((t) => {
      if (t.id === this.primaryTable?.id) return false;
      return t.status === TableStatus.Occupied;
    });
  }

  get selectedSecondaryTable(): TableDto | undefined {
    return this.tables.find((t) => t.id === this.selectedSecondaryTableId);
  }

  selectSecondary(table: TableDto): void {
    this.selectedSecondaryTableId = table.id || null;
  }

  resetState(): void {
    this.selectedSecondaryTableId = null;
    this.isSubmitting = false;
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetState();
  }

  confirmMerge(): void {
    if (!this.primaryTable?.id || !this.selectedSecondaryTableId || this.isSubmitting) return;

    const secondary = this.selectedSecondaryTable;
    if (!secondary) return;

    this.isSubmitting = true;
    this.tableService
      .mergeTables({
        primaryTableId: this.primaryTable.id,
        secondaryTableId: this.selectedSecondaryTableId,
      })
      .subscribe({
        next: (updatedPrimary) => {
          this.isSubmitting = false;
          this.toaster.success(
            this.localizationService.instant(
              '::MergeTablesSuccess',
              secondary.name || '',
              this.primaryTable?.name || ''
            ),
            this.localizationService.instant('::Success')
          );
          this.merged.emit({
            primaryTable: updatedPrimary,
            secondaryTable: secondary,
          });
          this.close();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg =
            err?.error?.error?.message ||
            this.localizationService.instant('::MergeTablesFailed');
          this.toaster.error(msg, this.localizationService.instant('::Error'));
        },
      });
  }
}
