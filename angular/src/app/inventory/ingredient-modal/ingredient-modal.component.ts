import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { Confirmation, ConfirmationService, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { ConsumptionMethod, CreateIngredientDto, IngredientDto, UpdateIngredientDto } from '../../proxy/ingredients/models';
import { StorageType } from '../../proxy/inventories/models';
import { UnitService } from '../../proxy/units/unit.service';
import { UnitDto } from '../../proxy/units/models';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-ingredient-modal',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, FormsModule, ReactiveFormsModule, CustomSelectComponent],
  templateUrl: './ingredient-modal.component.html',
  styleUrl: './ingredient-modal.component.scss',
})
export class IngredientModalComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly ingredientService = inject(IngredientService);
  private readonly unitService = inject(UnitService);
  private readonly toaster = inject(ToasterService);
  private readonly confirmation = inject(ConfirmationService);

  @Input() ingredient?: IngredientDto;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(128)]],
    code: ['', [Validators.maxLength(64)]],
    unitId: ['', [Validators.required]],
    minStock: [0, [Validators.required, Validators.min(0)]],
    storageType: [StorageType.SHORT_TERM, [Validators.required]],
    consumptionMethod: [ConsumptionMethod.RECIPE, [Validators.required]],
    isActive: [true],
  });

  units: UnitDto[] = [];
  isSaving = false;

  get unitOptions(): CustomSelectOption[] {
    return this.units.map((u) => ({
      value: u.id,
      label: u.name,
      desc: u.abbreviation ? `Ký hiệu: ${u.abbreviation}` : undefined,
    }));
  }

  readonly consumptionMethodOptions: CustomSelectOption[] = [
    { value: ConsumptionMethod.RECIPE, label: '::ConsumptionMethod_RECIPE', icon: 'fa-book-open', desc: 'Tự động trừ theo định lượng món ăn' },
    { value: ConsumptionMethod.MANUAL, label: '::ConsumptionMethod_MANUAL', icon: 'fa-hand', desc: 'Kiểm kê hoặc xuất hủy thủ công' },
    { value: ConsumptionMethod.HYBRID, label: '::ConsumptionMethod_HYBRID', icon: 'fa-shuffle', desc: 'Kết hợp cả công thức và thủ công' },
  ];

  StorageTypeEnum = StorageType;
  ConsumptionMethodEnum = ConsumptionMethod;

  ngOnInit(): void {
    this.unitService.getList({ skipCount: 0, maxResultCount: 100 }).subscribe({
      next: (res) => {
        this.units = res.items || [];
        this.syncUnitId();
      },
    });

    this.form.get('code')?.valueChanges.subscribe((val) => {
      if (typeof val === 'string') {
        const upper = val.toUpperCase();
        if (val !== upper) {
          this.form.get('code')?.setValue(upper, { emitEvent: false });
        }
      }
    });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const upper = (input.value || '').toUpperCase();
      if (input.value !== upper) {
        input.value = upper;
      }
      this.form.get('code')?.setValue(upper, { emitModelToViewChange: false });
    }
  }

  private syncUnitId(): void {
    if (this.ingredient && this.units.length > 0) {
      const baseUnit = this.ingredient?.baseUnit?.toLowerCase();
      const matchingUnit = this.units.find(
        (u) =>
          u.id === this.ingredient?.unitId ||
          (baseUnit &&
            ((u.name && u.name.toLowerCase() === baseUnit) ||
              (u.abbreviation && u.abbreviation.toLowerCase() === baseUnit)))
      );
      if (matchingUnit) {
        this.form.patchValue({ unitId: matchingUnit.id });
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      if (this.ingredient) {
        const baseUnit = this.ingredient?.baseUnit?.toLowerCase();
        const matchingUnit = this.units.find(
          (u) =>
            u.id === this.ingredient?.unitId ||
            (baseUnit &&
              ((u.name && u.name.toLowerCase() === baseUnit) ||
                (u.abbreviation && u.abbreviation.toLowerCase() === baseUnit)))
        );
        this.form.patchValue({
          name: this.ingredient.name,
          code: this.ingredient.code || '',
          unitId: matchingUnit?.id || this.ingredient.unitId || '',
          minStock: this.ingredient.minStock,
          storageType: this.ingredient.storageType,
          consumptionMethod: this.ingredient.consumptionMethod,
          isActive: this.ingredient.isActive,
        });
      } else {
        this.form.reset({
          name: '',
          code: '',
          unitId: this.units.length > 0 ? this.units[0].id : '',
          minStock: 0,
          storageType: StorageType.SHORT_TERM,
          consumptionMethod: ConsumptionMethod.RECIPE,
          isActive: true,
        });
      }
    }
  }

  save(): void {
    if (this.form.invalid) return;

    const val = this.form.value;
    const selectedUnit = this.units.find((u) => u.id === val.unitId);
    const baseUnitName = selectedUnit ? (selectedUnit.name || selectedUnit.abbreviation || '') : '';

    if (this.ingredient?.id) {
      // Get the initial unitId that was populated in the form
      const baseUnitMatch = this.ingredient?.baseUnit?.toLowerCase();
      const matchingUnit = this.units.find(
        (u) =>
          u.id === this.ingredient?.unitId ||
          (baseUnitMatch &&
            ((u.name && u.name.toLowerCase() === baseUnitMatch) ||
              (u.abbreviation && u.abbreviation.toLowerCase() === baseUnitMatch)))
      );
      const initialUnitId = matchingUnit?.id || this.ingredient.unitId || '';

      const isUnchanged =
        val.name === this.ingredient.name &&
        (val.code || '') === (this.ingredient.code || '') &&
        val.unitId === initialUnitId &&
        Number(val.minStock) === this.ingredient.minStock &&
        Number(val.storageType) === this.ingredient.storageType &&
        Number(val.consumptionMethod) === this.ingredient.consumptionMethod &&
        val.isActive === this.ingredient.isActive;

      if (isUnchanged) {
        this.toaster.info('Không có thay đổi nào cần lưu');
        this.close();
        return;
      }

      this.isSaving = true;
      const updateDto: UpdateIngredientDto = {
        name: val.name,
        code: val.code || undefined,
        unitId: val.unitId,
        baseUnit: baseUnitName,
        minStock: Number(val.minStock),
        storageType: Number(val.storageType),
        consumptionMethod: Number(val.consumptionMethod),
        isActive: val.isActive,
      };

      this.ingredientService.update(this.ingredient.id, updateDto).subscribe({
        next: () => {
          this.isSaving = false;
          this.toaster.success('Cập nhật nguyên liệu thành công');
          this.saved.emit();
          this.close();
        },
        error: (err) => {
          this.isSaving = false;
          this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra');
        },
      });
    } else {
      const createDto: CreateIngredientDto = {
        name: val.name,
        code: val.code || undefined,
        unitId: val.unitId,
        baseUnit: baseUnitName,
        minStock: Number(val.minStock),
        storageType: Number(val.storageType),
        consumptionMethod: Number(val.consumptionMethod),
      };

      this.isSaving = true;
      this.ingredientService.create(createDto).subscribe({
        next: () => {
          this.isSaving = false;
          this.toaster.success('Thêm nguyên liệu thành công');
          this.saved.emit();
          this.close();
        },
        error: (err) => {
          this.isSaving = false;
          const errCode = err?.error?.code || err?.error?.error?.code;
          const inactiveId = err?.error?.data?.IngredientId || err?.error?.error?.data?.IngredientId || err?.error?.data?.id;

          // Xử lý Smart Restoration nếu nguyên liệu trùng tên bị inactive (T040)
          if (errCode === 'Ingredient:AlreadyExistsInactive' && inactiveId) {
            this.handleSmartRestore(inactiveId, val.name, Number(val.minStock));
          } else {
            this.toaster.error(err?.error?.message || err?.error?.error?.message || err?.message || 'Có lỗi xảy ra');
          }
        },
      });
    }
  }

  private handleSmartRestore(inactiveId: string, ingredientName: string, newMinStock: number): void {
    this.confirmation
      .warn(
        `Nguyên liệu '${ingredientName}' đã tồn tại trong hệ thống nhưng đang bị vô hiệu hóa. Bạn có muốn khôi phục lại không?`,
        'Xác nhận khôi phục nguyên liệu'
      )
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.ingredientService.smartRestore(inactiveId, { newMinStock }).subscribe({
            next: () => {
              this.toaster.success('::SmartRestoreSuccess');
              this.saved.emit();
              this.close();
            },
            error: (restoreErr) => {
              this.toaster.error(restoreErr?.error?.message || 'Không thể khôi phục nguyên liệu');
            },
          });
        } else {
          this.toaster.info('Đã hủy thao tác khôi phục nguyên liệu');
        }
      });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
