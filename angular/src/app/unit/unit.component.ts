import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { forkJoin } from 'rxjs';
import { UnitService } from '../proxy/units/unit.service';
import { UnitDto, CreateUpdateUnitDto } from '../proxy/units/models';
import { SharedTableComponent, ColumnItem } from '../shared/components/table/shared-table/shared-table';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-unit',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    ReactiveFormsModule,
    FormsModule,
    CustomSelectComponent,
    SharedTableComponent,
  ],
  templateUrl: './unit.component.html',
  styleUrl: './unit.component.scss',
})
export class UnitComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly unitService = inject(UnitService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('nameTpl', { static: true }) nameTpl!: TemplateRef<any>;
  @ViewChild('abbreviationTpl', { static: true }) abbreviationTpl!: TemplateRef<any>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: ColumnItem[] = [];
  rawUnits: UnitDto[] = [];
  filteredUnits: UnitDto[] = [];
  displayUnits: UnitDto[] = [];

  totalCount = 0;
  pageIndex = 1;
  pageSize = 10;
  loading = false;
  isSaving = false;
  isBulkProcessing = false;

  // Filter & Search states
  searchTerm = '';
  sortBy = 'name asc';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  readonly statusFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllStatus', icon: 'fa-layer-group' },
    { value: 'active', label: '::UnitStatusActiveOnly', icon: 'fa-check-circle' },
    { value: 'inactive', label: '::UnitStatusInactiveOnly', icon: 'fa-ban' },
  ];

  readonly sortOptions: CustomSelectOption[] = [
    { value: 'name asc', label: '::SortNameAsc', icon: 'fa-sort-alpha-down' },
    { value: 'name desc', label: '::SortNameDesc', icon: 'fa-sort-alpha-down-alt' },
  ];

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 5, label: '5 ::RowsPerPage' },
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
  ];

  isModalOpen = false;
  form!: FormGroup;
  selectedItem = {} as UnitDto;
  isEditMode = false;

  get modalTitle(): string {
    return this.isEditMode
      ? this.localizationService.instant('::EditUnit')
      : this.localizationService.instant('::NewUnit');
  }

  ngOnInit() {
    this.buildForm();
    this.loadData();
  }

  ngAfterViewInit() {
    this.initColumns();
    this.cdr.detectChanges();
  }

  ngOnDestroy() {}

  initColumns() {
    this.columns = [
      {
        name: this.localizationService.instant('::UnitName'),
        key: 'name',
        sortFn: true,
        customTemplate: this.nameTpl,
      },
      {
        name: this.localizationService.instant('::Abbreviation'),
        key: 'abbreviation',
        sortFn: true,
        customTemplate: this.abbreviationTpl,
        width: '220px',
      },
      {
        name: this.localizationService.instant('::UnitStatus'),
        key: 'isActive',
        sortFn: true,
        customTemplate: this.statusTpl,
        align: 'center',
        width: '160px',
      },
      {
        name: this.localizationService.instant('::Actions'),
        key: 'actions',
        sortFn: false,
        customTemplate: this.actionsTpl,
        align: 'center',
        width: '120px',
      },
    ];
  }

  loadData() {
    this.loading = true;
    this.unitService
      .getList({
        skipCount: 0,
        maxResultCount: 1000,
        sorting: this.sortBy,
      })
      .subscribe({
        next: res => {
          this.rawUnits = res.items || [];
          this.applyFilterAndPagination();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  applyFilterAndPagination() {
    let result = [...this.rawUnits];

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(
        item =>
          item.name?.toLowerCase().includes(term) ||
          item.abbreviation?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter === 'active') {
      result = result.filter(item => item.isActive !== false);
    } else if (this.statusFilter === 'inactive') {
      result = result.filter(item => item.isActive === false);
    }

    // Sort
    if (this.sortBy) {
      const [field, direction] = this.sortBy.split(' ');
      result.sort((a: any, b: any) => {
        const valA = (a[field] ?? '').toString().toLowerCase();
        const valB = (b[field] ?? '').toString().toLowerCase();
        const compare = valA.localeCompare(valB, 'vi');
        return direction === 'desc' ? -compare : compare;
      });
    }

    this.filteredUnits = result;
    this.totalCount = result.length;

    const start = (this.pageIndex - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayUnits = result.slice(start, end);
  }

  onQueryParamsChange(params: any): void {
    if (params) {
      if (params.pageIndex) this.pageIndex = params.pageIndex;
      if (params.pageSize) this.pageSize = params.pageSize;
      if (params.sort) {
        const currentSort = params.sort.find((item: any) => item.value !== null);
        if (currentSort) {
          this.sortBy = `${currentSort.key} ${currentSort.value === 'ascend' ? 'asc' : 'desc'}`;
        }
      }
    }
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  onSearchChange() {
    this.pageIndex = 1;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  onStatusFilterChange(val: any) {
    this.statusFilter = val;
    this.pageIndex = 1;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  onSortChange(sortBy: string) {
    this.sortBy = sortBy;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  changePageSize(newSize: number) {
    this.pageSize = Number(newSize);
    this.pageIndex = 1;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  buildForm() {
    this.form = this.fb.group({
      name: [this.selectedItem?.name || '', [Validators.required, Validators.maxLength(64)]],
      abbreviation: [this.selectedItem?.abbreviation || '', [Validators.maxLength(16)]],
      isActive: [this.selectedItem?.isActive !== false],
    });
  }

  createUnit() {
    this.selectedItem = {} as UnitDto;
    this.isEditMode = false;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editUnit(unit: UnitDto) {
    this.selectedItem = { ...unit };
    this.isEditMode = true;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  closeModal() {
    this.isModalOpen = false;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formVal = this.form.value;
    const payload: CreateUpdateUnitDto = {
      name: formVal.name?.trim(),
      abbreviation: formVal.abbreviation?.trim() || formVal.name?.trim(),
      isActive: formVal.isActive,
    };

    const request$ = this.isEditMode && this.selectedItem.id
      ? this.unitService.update(this.selectedItem.id, payload)
      : this.unitService.create(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.toaster.success(
          this.isEditMode ? '::UnitUpdatedSuccess' : '::UnitCreatedSuccess'
        );
        this.loadData();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        const errorMsg = err?.error?.message || err?.message;
        if (errorMsg) {
          this.toaster.error(errorMsg);
        }
        this.cdr.markForCheck();
      },
    });
  }

  deleteUnit(unit: UnitDto) {
    const id = unit?.id;
    if (!id) return;

    this.confirmation
      .warn('::UnitConfirmDelete', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.unitService.delete(id).subscribe({
            next: () => {
              this.toaster.success('::UnitDeletedSuccess');
              this.loadData();
              this.cdr.markForCheck();
            },
            error: (err: any) => {
              const errorMsg = err?.error?.message || err?.message;
              if (errorMsg) {
                this.toaster.error(errorMsg);
              }
              this.cdr.markForCheck();
            },
          });
        }
      });
  }

  toggleUnitStatus(unit: UnitDto) {
    if (!unit?.id) return;
    const newStatus = !(unit.isActive !== false);

    this.unitService
      .update(unit.id, {
        name: unit.name || '',
        abbreviation: unit.abbreviation || unit.name || '',
        isActive: newStatus,
      })
      .subscribe({
        next: () => {
          unit.isActive = newStatus;
          this.toaster.success(
            newStatus ? '::UnitActivatedSuccess' : '::UnitDeactivatedSuccess'
          );
          this.applyFilterAndPagination();
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || err?.message || 'Không thể cập nhật trạng thái!';
          this.toaster.error(errorMsg);
          this.cdr.markForCheck();
        },
      });
  }

  toggleAllStatus(targetStatus: boolean) {
    const confirmKey = targetStatus
      ? '::ConfirmActivateAllUnits'
      : '::ConfirmDeactivateAllUnits';
    const titleKey = targetStatus
      ? '::ActivateAll'
      : '::DeactivateAll';

    this.confirmation
      .warn(confirmKey, titleKey)
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.isBulkProcessing = true;
          const unitsToUpdate = this.rawUnits.filter(u => !!u.id && (u.isActive !== false) !== targetStatus);

          if (unitsToUpdate.length === 0) {
            this.isBulkProcessing = false;
            this.toaster.info('::AllUnitsAlreadyInStatus');
            this.cdr.markForCheck();
            return;
          }

          const requests$ = unitsToUpdate.map(u =>
            this.unitService.update(u.id!, {
              name: u.name || '',
              abbreviation: u.abbreviation || u.name || '',
              isActive: targetStatus,
            })
          );

          forkJoin(requests$).subscribe({
            next: () => {
              this.isBulkProcessing = false;
              this.toaster.success(
                targetStatus
                  ? '::AllUnitsActivatedSuccess'
                  : '::AllUnitsDeactivatedSuccess'
              );
              this.loadData();
              this.cdr.markForCheck();
            },
            error: (err: any) => {
              this.isBulkProcessing = false;
              const errorMsg = err?.error?.message || err?.message || 'Có lỗi xảy ra!';
              this.toaster.error(errorMsg);
              this.loadData();
              this.cdr.markForCheck();
            },
          });
        }
      });
  }
}

