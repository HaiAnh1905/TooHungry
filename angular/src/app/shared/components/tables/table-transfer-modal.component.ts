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
import { FormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { TableService } from '../../../proxy/tables/table.service';
import { TableDto } from '../../../proxy/tables/models';
import { TableStatus } from '../../../proxy/tables/table-status.enum';

@Component({
  selector: 'app-table-transfer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './table-transfer-modal.component.html',
  styleUrl: './table-transfer-modal.component.scss',
})
export class TableTransferModalComponent implements OnChanges {
  private readonly tableService = inject(TableService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);

  @Input() visible = false;
  @Input() sourceTable: TableDto | null = null;
  @Input() tables: TableDto[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() transferred = new EventEmitter<{ sourceTable: TableDto; targetTable: TableDto }>();

  selectedTargetTableId: string | null = null;
  selectedAreaFilter: string | null = null;
  searchQuery = '';
  note = '';
  isSubmitting = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetState();
    }
  }

  get availableTargetTables(): TableDto[] {
    return this.tables.filter((t) => {
      if (t.id === this.sourceTable?.id) return false;
      if (t.status !== TableStatus.Available) return false;
      if (this.selectedAreaFilter && t.diningAreaId !== this.selectedAreaFilter) return false;
      if (
        this.searchQuery.trim() &&
        !(t.name || '').toLowerCase().includes(this.searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }

  get availableAreas(): { id: string; name: string }[] {
    const map = new Map<string, string>();
    this.tables.forEach((t) => {
      if (t.status === TableStatus.Available && t.diningAreaId && t.diningAreaName) {
        map.set(t.diningAreaId, t.diningAreaName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  get selectedTargetTable(): TableDto | undefined {
    return this.tables.find((t) => t.id === this.selectedTargetTableId);
  }

  get isCapacityWarning(): boolean {
    if (!this.selectedTargetTable || !this.sourceTable) return false;
    return (this.selectedTargetTable.capacity ?? 0) < (this.sourceTable.capacity ?? 0);
  }

  selectTarget(table: TableDto): void {
    this.selectedTargetTableId = table.id || null;
  }

  resetState(): void {
    this.selectedTargetTableId = null;
    this.selectedAreaFilter = null;
    this.searchQuery = '';
    this.note = '';
    this.isSubmitting = false;
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetState();
  }

  confirmTransfer(): void {
    if (!this.sourceTable?.id || !this.selectedTargetTableId || this.isSubmitting) return;

    const target = this.selectedTargetTable;
    if (!target) return;

    this.isSubmitting = true;
    this.tableService
      .transferTable({
        sourceTableId: this.sourceTable.id,
        targetTableId: this.selectedTargetTableId,
        note: this.note.trim() || undefined,
      })
      .subscribe({
        next: (updatedTarget) => {
          this.isSubmitting = false;
          this.toaster.success(
            this.localizationService.instant(
              '::TransferTableSuccess',
              this.sourceTable?.name || '',
              target.name || ''
            ),
            this.localizationService.instant('::Success')
          );
          this.transferred.emit({
            sourceTable: this.sourceTable!,
            targetTable: updatedTarget,
          });
          this.close();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg =
            err?.error?.error?.message ||
            this.localizationService.instant('::TransferTableFailed');
          this.toaster.error(msg, this.localizationService.instant('::Error'));
        },
      });
  }
}
