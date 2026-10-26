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
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { IngredientDto, CreateIngredientDto, UpdateIngredientDto, ConsumptionMethod } from '../proxy/ingredients/models';
import { StorageType } from '../proxy/inventories/models';
import { UnitService } from '../proxy/units/unit.service';
import { UnitDto } from '../proxy/units/models';
import { RouterModule } from '@angular/router';
import { SharedTableComponent, ColumnItem } from '../shared/components/table/shared-table/shared-table';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-ingredient',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    CustomSelectComponent,
    SharedTableComponent,
  ],
  templateUrl: './ingredient.component.html',
  styleUrl: './ingredient.component.scss',
})
export class IngredientComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly ingredientService = inject(IngredientService);
  private readonly unitService = inject(UnitService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('nameTpl', { static: true }) nameTpl!: TemplateRef<any>;
  @ViewChild('unitTpl', { static: true }) unitTpl!: TemplateRef<any>;
  @ViewChild('storageTpl', { static: true }) storageTpl!: TemplateRef<any>;
  @ViewChild('consumptionTpl', { static: true }) consumptionTpl!: TemplateRef<any>;
  @ViewChild('minStockTpl', { static: true }) minStockTpl!: TemplateRef<any>;
  @ViewChild('stockTpl', { static: true }) stockTpl!: TemplateRef<any>;
  @ViewChild('priceTpl', { static: true }) priceTpl!: TemplateRef<any>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: ColumnItem[] = [];
  rawIngredients: IngredientDto[] = [];
  filteredIngredients: IngredientDto[] = [];
  displayIngredients: IngredientDto[] = [];
  availableUnits: UnitDto[] = [];
  unitOptions: CustomSelectOption[] = [];

  totalCount = 0;
  pageIndex = 1;
  pageSize = 10;
  loading = false;
  isSaving = false;

  // Filters
  searchTerm = '';
  statusFilter = 'all'; // 'all' | 'active' | 'inactive'
  storageFilter = 'all'; // 'all' | '0' | '1'
  sortBy = 'name asc';

  readonly sortOptions: CustomSelectOption[] = [
    { value: 'name asc', label: '::SortIngredientAsc', icon: 'fa-sort-alpha-down' },
    { value: 'name desc', label: '::SortIngredientDesc', icon: 'fa-sort-alpha-down-alt' },
    { value: 'minStock asc', label: '::SortMinStockAsc', icon: 'fa-arrow-up-1-9' },
    { value: 'minStock desc', label: '::SortMinStockDesc', icon: 'fa-arrow-down-9-1' },
  ];

  readonly statusOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllStatus' },
    { value: 'active', label: '::IngredientStatusActive' },
    { value: 'inactive', label: '::IngredientStatusInactive' },
  ];

  readonly storageOptions: CustomSelectOption[] = [
    { value: 'all', label: '::AllStorage', icon: 'fa-layer-group' },
    { value: '0', label: '::StorageType_FRESH', icon: 'fa-leaf' },
    { value: '1', label: '::StorageType_SHORT_TERM', icon: 'fa-snowflake' },
    { value: '2', label: '::StorageType_LONG_TERM', icon: 'fa-box-archive' },
  ];

  readonly storageSelectOptions: CustomSelectOption[] = [
    { value: 0, label: '::StorageType_FRESH', icon: 'fa-leaf' },
    { value: 1, label: '::StorageType_SHORT_TERM', icon: 'fa-snowflake' },
    { value: 2, label: '::StorageType_LONG_TERM', icon: 'fa-box-archive' },
  ];

  readonly consumptionSelectOptions: CustomSelectOption[] = [
    { value: 1, label: '::ConsumptionMethod_RECIPE', icon: 'fa-book-open' },
    { value: 2, label: '::ConsumptionMethod_MANUAL', icon: 'fa-hand-pointer' },
    { value: 3, label: '::ConsumptionMethod_HYBRID', icon: 'fa-shuffle' },
  ];

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 5, label: '5 ::RowsPerPage' },
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
  ];

  // Main Create / Edit Modal
  isModalOpen = false;
  form!: FormGroup;
  selectedItem: IngredientDto | null = null;
  isEditMode = false;

  // Deactivate Modal
  isDeactivateModalOpen = false;
  deactivateForm!: FormGroup;
  deactivatingItem: IngredientDto | null = null;
  isDeactivating = false;

  // Reactivate / Restore Modal
  isRestoreModalOpen = false;
  restoreForm!: FormGroup;
  restoringItemId: string | null = null;
  restoringItemName = '';
  isRestoring = false;

  get modalTitle(): string {
    return this.isEditMode
      ? this.localizationService.instant('::EditIngredient')
      : this.localizationService.instant('::NewIngredient');
  }

  ngOnInit() {
    this.buildForm();
    this.buildDeactivateForm();
    this.buildRestoreForm();
    this.loadUnits();
    this.loadData();
  }

  ngAfterViewInit() {
    this.initColumns();
    this.cdr.detectChanges();
  }

  ngOnDestroy() {}

  buildForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(128)]],
      unitId: [null, [Validators.required]],
      minStock: [0, [Validators.required, Validators.min(0)]],
      estimatedPrice: [0, [Validators.required, Validators.min(0)]],
      storageType: [StorageType.SHORT_TERM, [Validators.required]],
      consumptionMethod: [ConsumptionMethod.RECIPE, [Validators.required]],
    });
  }

  buildDeactivateForm() {
    this.deactivateForm = this.fb.group({
      reason: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  buildRestoreForm() {
    this.restoreForm = this.fb.group({
      newMinStock: [0, [Validators.min(0)]],
    });
  }

  initColumns() {
    this.columns = [
      {
        name: this.localizationService.instant('::IngredientName'),
        key: 'name',
        sortFn: true,
        customTemplate: this.nameTpl,
        width: '160px',
      },
      {
        name: this.localizationService.instant('::IngredientUnit'),
        key: 'baseUnit',
        sortFn: true,
        customTemplate: this.unitTpl,
        align: 'center',
        width: '85px',
      },
      {
        name: this.localizationService.instant('::StorageType'),
        key: 'storageType',
        sortFn: false,
        customTemplate: this.storageTpl,
        width: '125px',
      },
      {
        name: this.localizationService.instant('::ConsumptionMethod'),
        key: 'consumptionMethod',
        sortFn: false,
        customTemplate: this.consumptionTpl,
        width: '120px',
      },
      {
        name: this.localizationService.instant('::MinStock'),
        key: 'minStock',
        sortFn: true,
        customTemplate: this.minStockTpl,
        align: 'right',
        width: '85px',
      },
      {
        name: this.localizationService.instant('::EstimatedPrice'),
        key: 'estimatedPrice',
        sortFn: true,
        customTemplate: this.priceTpl,
        align: 'right',
        width: '95px',
      },
      {
        name: this.localizationService.instant('::CurrentStock'),
        key: 'currentStock',
        sortFn: true,
        customTemplate: this.stockTpl,
        align: 'right',
        width: '120px',
      },
      {
        name: this.localizationService.instant('::IngredientStatus'),
        key: 'isActive',
        sortFn: true,
        customTemplate: this.statusTpl,
        align: 'center',
        width: '105px',
      },
      {
        name: this.localizationService.instant('::Actions'),
        key: 'actions',
        sortFn: false,
        customTemplate: this.actionsTpl,
        align: 'center',
        width: '95px',
      },
    ];
  }

  loadUnits() {
    this.unitService
      .getList({ skipCount: 0, maxResultCount: 1000, sorting: 'name asc' })
      .subscribe({
        next: res => {
          this.availableUnits = (res.items || []).filter(u => u.isActive !== false);
          this.unitOptions = this.availableUnits.map(u => ({
            value: u.id,
            label: `${u.name} (${u.abbreviation || u.name})`,
            icon: 'fa-scale-balanced',
          }));
          this.cdr.markForCheck();
        },
      });
  }

  loadData() {
    this.loading = true;
    this.ingredientService
      .getList({
        skipCount: 0,
        maxResultCount: 1000,
        sorting: this.sortBy,
      })
      .subscribe({
        next: res => {
          this.rawIngredients = (res.items || []).map(item => ({
            ...item,
            storageType: Number(item.storageType) === 3 ? StorageType.LONG_TERM : item.storageType,
          }));
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
    let result = [...this.rawIngredients];

    // Search
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(
        item =>
          item.name?.toLowerCase().includes(term) ||
          item.baseUnit?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter === 'active') {
      result = result.filter(item => item.isActive !== false);
    } else if (this.statusFilter === 'inactive') {
      result = result.filter(item => item.isActive === false);
    }

    // Storage filter
    if (this.storageFilter !== 'all') {
      const st = parseInt(this.storageFilter, 10);
      result = result.filter(item => (item.storageType as any) === st);
    }

    // Sort
    if (this.sortBy) {
      const [field, direction] = this.sortBy.split(' ');
      result.sort((a: any, b: any) => {
        let valA = a[field] ?? '';
        let valB = b[field] ?? '';
        if (typeof valA === 'string') {
          const comp = valA.localeCompare(valB, 'vi');
          return direction === 'desc' ? -comp : comp;
        }
        return direction === 'desc' ? valB - valA : valA - valB;
      });
    }

    this.filteredIngredients = result;
    this.totalCount = result.length;

    const start = (this.pageIndex - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayIngredients = result.slice(start, end);
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

  onStorageFilterChange(val: any) {
    this.storageFilter = val;
    this.pageIndex = 1;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  onSortChange(val: string) {
    this.sortBy = val;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  changePageSize(val: number) {
    this.pageSize = val;
    this.pageIndex = 1;
    this.applyFilterAndPagination();
    this.cdr.markForCheck();
  }

  createIngredient() {
    this.isEditMode = false;
    this.selectedItem = null;
    this.form.reset({
      name: '',
      unitId: this.availableUnits[0]?.id || null,
      minStock: 0,
      estimatedPrice: 0,
      storageType: StorageType.SHORT_TERM,
      consumptionMethod: ConsumptionMethod.RECIPE,
    });
    this.form.get('unitId')?.enable();
    this.isModalOpen = true;
  }

  get currentUnitSuffix(): string {
    const unitId = this.form?.get('unitId')?.value;
    const found = this.availableUnits.find(u => u.id === unitId);
    if (found) return found.abbreviation || found.name || '';
    if (this.selectedItem?.baseUnit) return this.selectedItem.baseUnit;
    return '';
  }

  editIngredient(row: IngredientDto) {
    this.isEditMode = true;
    this.selectedItem = row;

    // 1. Try to find unit by unitId first
    let foundUnit = row.unitId
      ? this.availableUnits.find(u => u.id?.toLowerCase() === row.unitId?.toLowerCase())
      : null;

    // 2. If not found by ID, match by baseUnit name or abbreviation
    if (!foundUnit && row.baseUnit) {
      foundUnit = this.availableUnits.find(
        u => u.name?.trim().toLowerCase() === row.baseUnit?.trim().toLowerCase() ||
             u.abbreviation?.trim().toLowerCase() === row.baseUnit?.trim().toLowerCase()
      );
    }

    let matchedUnitId: string | null = null;
    if (foundUnit) {
      matchedUnitId = foundUnit.id || null;
    } else if (row.unitId) {
      matchedUnitId = row.unitId;
      const label = row.baseUnit || 'Đơn vị';
      if (!this.unitOptions.some(o => o.value?.toLowerCase?.() === matchedUnitId?.toLowerCase())) {
        this.unitOptions = [
          { value: matchedUnitId, label, icon: 'fa-scale-balanced' },
          ...this.unitOptions,
        ];
      }
    } else if (row.baseUnit) {
      matchedUnitId = `legacy-${row.baseUnit}`;
      if (!this.unitOptions.some(o => o.value === matchedUnitId)) {
        this.unitOptions = [
          { value: matchedUnitId, label: row.baseUnit, icon: 'fa-scale-balanced' },
          ...this.unitOptions,
        ];
      }
    }

    let storageVal = Number(row.storageType);
    if (storageVal === 3 || storageVal > 2) {
      storageVal = StorageType.LONG_TERM;
    } else if (storageVal < 0 || isNaN(storageVal)) {
      storageVal = StorageType.SHORT_TERM;
    }

    this.form.patchValue({
      name: row.name,
      unitId: matchedUnitId,
      minStock: row.minStock,
      estimatedPrice: row.estimatedPrice || 0,
      storageType: storageVal,
      consumptionMethod: row.consumptionMethod,
    });

    if (row.canEditUnit === false) {
      this.form.get('unitId')?.disable();
    } else {
      this.form.get('unitId')?.enable();
    }

    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formVal = this.form.getRawValue();
    const selectedUnit = this.availableUnits.find(u => u.id === formVal.unitId);
    let baseUnitName = '';
    if (this.isEditMode && this.selectedItem?.baseUnit) {
      if (
        this.selectedItem.canEditUnit === false ||
        (selectedUnit &&
          (selectedUnit.name?.trim().toLowerCase() === this.selectedItem.baseUnit.trim().toLowerCase() ||
           selectedUnit.abbreviation?.trim().toLowerCase() === this.selectedItem.baseUnit.trim().toLowerCase()))
      ) {
        baseUnitName = this.selectedItem.baseUnit;
      }
    }
    if (!baseUnitName) {
      baseUnitName = selectedUnit ? (selectedUnit.name || selectedUnit.abbreviation || '') : (this.selectedItem?.baseUnit || '');
    }

    if (this.isEditMode && this.selectedItem) {
      const updateDto: UpdateIngredientDto = {
        name: formVal.name.trim(),
        unitId: formVal.unitId,
        baseUnit: baseUnitName,
        minStock: Number(formVal.minStock),
        estimatedPrice: Number(formVal.estimatedPrice),
        storageType: formVal.storageType,
        consumptionMethod: formVal.consumptionMethod,
      };

      this.ingredientService.update(this.selectedItem.id, updateDto).subscribe({
        next: () => {
          this.toaster.success('::IngredientUpdatedSuccess');
          this.isSaving = false;
          this.isModalOpen = false;
          this.loadData();
        },
        error: err => {
          this.isSaving = false;
          this.handleSaveError(err, formVal.name);
        },
      });
    } else {
      const createDto: CreateIngredientDto = {
        name: formVal.name.trim(),
        unitId: formVal.unitId,
        baseUnit: baseUnitName,
        minStock: Number(formVal.minStock),
        estimatedPrice: Number(formVal.estimatedPrice),
        storageType: formVal.storageType,
        consumptionMethod: formVal.consumptionMethod,
      };

      this.ingredientService.create(createDto).subscribe({
        next: () => {
          this.toaster.success('::IngredientCreatedSuccess');
          this.isSaving = false;
          this.isModalOpen = false;
          this.loadData();
        },
        error: err => {
          this.isSaving = false;
          this.handleSaveError(err, formVal.name);
        },
      });
    }
  }

  private handleSaveError(err: any, enteredName: string) {
    const errorDetails = err?.error?.error;
    const errCode = errorDetails?.code || errorDetails?.message;

    if (errCode === 'Ingredient:AlreadyExistsInactive' || errorDetails?.data?.IngredientId) {
      const inactiveId = errorDetails?.data?.IngredientId;
      this.isModalOpen = false;
      this.openSmartRestoreConfirm(inactiveId, enteredName);
    } else {
      const message = errorDetails?.message || err?.message || 'Có lỗi xảy ra!';
      this.toaster.error(message);
    }
    this.cdr.markForCheck();
  }

  openSmartRestoreConfirm(ingredientId: string, ingredientName: string) {
    this.restoringItemId = ingredientId;
    this.restoringItemName = ingredientName;
    this.restoreForm.reset({ newMinStock: 0 });
    this.isRestoreModalOpen = true;
    this.cdr.markForCheck();
  }

  confirmRestore() {
    if (!this.restoringItemId) return;
    this.isRestoring = true;
    const newMin = Number(this.restoreForm.value.newMinStock || 0);

    this.ingredientService.smartRestore(this.restoringItemId, { newMinStock: newMin }).subscribe({
      next: () => {
        this.toaster.success('::IngredientRestoreSuccess');
        this.isRestoring = false;
        this.isRestoreModalOpen = false;
        this.loadData();
      },
      error: err => {
        this.isRestoring = false;
        this.toaster.error(err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::ActionFailedError'));
        this.cdr.markForCheck();
      },
    });
  }

  closeRestoreModal() {
    this.isRestoreModalOpen = false;
    this.restoringItemId = null;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openDeactivateModal(row: IngredientDto) {
    this.deactivatingItem = row;
    this.deactivateForm.reset({ reason: '' });
    this.isDeactivateModalOpen = true;
  }

  confirmDeactivate() {
    if (this.deactivateForm.invalid || !this.deactivatingItem) {
      this.deactivateForm.markAllAsTouched();
      return;
    }

    this.isDeactivating = true;
    const reason = this.deactivateForm.value.reason.trim();

    this.ingredientService.deactivate(this.deactivatingItem.id, { reason }).subscribe({
      next: () => {
        this.toaster.success('::IngredientDeactivatedSuccess');
        this.isDeactivating = false;
        this.isDeactivateModalOpen = false;
        this.loadData();
      },
      error: err => {
        this.isDeactivating = false;
        this.toaster.error(err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::ActionFailedError'));
        this.cdr.markForCheck();
      },
    });
  }

  closeDeactivateModal() {
    this.isDeactivateModalOpen = false;
    this.deactivatingItem = null;
  }

  openReactivateModal(row: IngredientDto) {
    this.confirmation
      .warn(
        '::ConfirmReactivate',
        '::ConfirmReactivate'
      )
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.ingredientService.reactivate(row.id).subscribe({
            next: () => {
              this.toaster.success('::IngredientReactivatedSuccess');
              this.loadData();
            },
            error: err => {
              this.toaster.error(err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::ActionFailedError'));
            },
          });
        }
      });
  }

  deleteIngredient(row: IngredientDto) {
    this.confirmation
      .warn(
        this.localizationService.instant('::AreYouSureToDeleteIngredient', row.name),
        '::AreYouSure'
      )
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.ingredientService.delete(row.id).subscribe({
            next: () => {
              this.toaster.success('::IngredientDeletedSuccess');
              this.loadData();
            },
            error: err => {
              const msg = err?.error?.error?.message || 'Không thể xóa nguyên liệu!';
              this.toaster.error(msg);
            },
          });
        }
      });
  }
}
