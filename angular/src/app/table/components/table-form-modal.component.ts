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
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { TableService } from '../../proxy/tables/table.service';
import { TableDto, CreateUpdateTableDto } from '../../proxy/tables/models';
import { TableStatus } from '../../proxy/tables/table-status.enum';
import { DiningAreaDto } from '../../proxy/dining-areas/models';

@Component({
  selector: 'app-table-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './table-form-modal.component.html',
  styleUrl: './table-form-modal.component.scss',
})
export class TableFormModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly tableService = inject(TableService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);

  @Input() visible = false;
  @Input() selectedTable: TableDto | null = null;
  @Input() diningAreas: DiningAreaDto[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<TableDto>();
  @Output() openCreateArea = new EventEmitter<void>();

  form: FormGroup = this.buildForm();
  isSaving = false;
  isAreaDropdownOpen = false;
  isStatusDropdownOpen = false;
  areaDropdownSearch = '';

  readonly statusOptionsList = [
    { value: TableStatus.Available, key: '::TableStatusAvailable', descKey: '::StatusAvailableDesc', icon: 'fa-check-circle' },
    { value: TableStatus.Occupied, key: '::TableStatusOccupied', descKey: '::StatusOccupiedDesc', icon: 'fa-utensils' },
    { value: TableStatus.Reserved, key: '::TableStatusReserved', descKey: '::StatusReservedDesc', icon: 'fa-calendar-check' },
    { value: TableStatus.Cleaning, key: '::TableStatusCleaning', descKey: '::StatusCleaningDesc', icon: 'fa-broom' },
    { value: TableStatus.Disabled, key: '::TableStatusDisabled', descKey: '::StatusDisabledDesc', icon: 'fa-ban' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initFormData();
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      capacity: [4, [Validators.required, Validators.min(1)]],
      status: [TableStatus.Available, [Validators.required]],
      diningAreaId: [null],
    });
  }

  private initFormData(): void {
    if (this.selectedTable) {
      this.form.patchValue({
        name: this.selectedTable.name,
        capacity: this.selectedTable.capacity,
        status: this.selectedTable.status,
        diningAreaId: this.selectedTable.diningAreaId || null,
      });
    } else {
      this.form.reset({
        name: '',
        capacity: 4,
        status: TableStatus.Available,
        diningAreaId: null,
      });
    }
    this.isAreaDropdownOpen = false;
    this.isStatusDropdownOpen = false;
    this.areaDropdownSearch = '';
    this.isSaving = false;
  }

  get isEdit(): boolean {
    return !!this.selectedTable?.id;
  }

  getSelectedAreaName(): string | null {
    const areaId = this.form.get('diningAreaId')?.value;
    if (!areaId) return null;
    const found = this.diningAreas.find((a) => a.id === areaId);
    return found?.name || null;
  }

  getFilteredDiningAreas(): DiningAreaDto[] {
    const q = this.areaDropdownSearch.trim().toLowerCase();
    if (!q) return this.diningAreas;
    return this.diningAreas.filter((a) => (a.name || '').toLowerCase().includes(q));
  }

  toggleAreaDropdown(event: Event): void {
    event.stopPropagation();
    this.isAreaDropdownOpen = !this.isAreaDropdownOpen;
    this.isStatusDropdownOpen = false;
  }

  selectDiningArea(areaId?: string | null): void {
    this.form.get('diningAreaId')?.setValue(areaId ?? null);
    this.isAreaDropdownOpen = false;
  }

  clearSelectedArea(event: Event): void {
    event.stopPropagation();
    this.form.get('diningAreaId')?.setValue(null);
  }

  toggleStatusDropdown(event: Event): void {
    event.stopPropagation();
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    this.isAreaDropdownOpen = false;
  }

  selectTableStatus(status: TableStatus): void {
    this.form.get('status')?.setValue(status);
    this.isStatusDropdownOpen = false;
  }

  getSelectedStatusLabel(status: TableStatus): string {
    const opt = this.statusOptionsList.find((s) => s.value === status);
    return opt ? this.localizationService.instant(opt.key) : '';
  }

  getSelectedStatusIcon(status: TableStatus): string {
    const opt = this.statusOptionsList.find((s) => s.value === status);
    return opt ? opt.icon : 'fa-circle';
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  save(): void {
    if (this.form.invalid || this.isSaving) return;

    this.isSaving = true;
    const input: CreateUpdateTableDto = {
      name: this.form.get('name')?.value?.trim(),
      capacity: Number(this.form.get('capacity')?.value),
      status: this.form.get('status')?.value,
      diningAreaId: this.form.get('diningAreaId')?.value || undefined,
    };

    const action$ = this.isEdit
      ? this.tableService.update(this.selectedTable!.id!, input)
      : this.tableService.create(input);

    action$.subscribe({
      next: (result) => {
        this.isSaving = false;
        const msg = this.isEdit
          ? this.localizationService.instant('::TableUpdatedSuccess', result.name || '')
          : this.localizationService.instant('::TableCreatedSuccess', result.name || '');
        this.toaster.success(msg, this.localizationService.instant('::Success'));
        this.saved.emit(result);
        this.close();
      },
      error: (err) => {
        this.isSaving = false;
        const msg =
          err?.error?.error?.message ||
          err?.error?.message ||
          this.localizationService.instant('::SaveFailed');
        this.toaster.error(msg, this.localizationService.instant('::Error'));
      },
    });
  }
}
