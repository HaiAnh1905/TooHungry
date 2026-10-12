import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoreModule, PermissionService } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { RecipeService } from '../../proxy/recipes/recipe.service';
import { RecipeDto, RecipeIngredientDto } from '../../proxy/recipes/models';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { IngredientDto } from '../../proxy/ingredients/models';
import { UnitService } from '../../proxy/units/unit.service';
import { UnitDto } from '../../proxy/units/models';
import { CustomSelectComponent, CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-recipe-modal',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, FormsModule, ReactiveFormsModule, CustomSelectComponent],
  templateUrl: './recipe-modal.component.html',
  styleUrl: './recipe-modal.component.scss',
})
export class RecipeModalComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly recipeService = inject(RecipeService);
  private readonly ingredientService = inject(IngredientService);
  private readonly unitService = inject(UnitService);
  private readonly permissionService = inject(PermissionService);
  private readonly toaster = inject(ToasterService);

  @Input() dishId?: string;
  @Input() dishName?: string;
  @Input() dishPrice?: number;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() recipeSaved = new EventEmitter<void>();

  form: FormGroup = this.fb.group({
    ingredients: this.fb.array([]),
  });

  currentRecipe?: RecipeDto | null;
  recipeHistory: RecipeDto[] = [];
  availableIngredients: IngredientDto[] = [];
  availableUnits: UnitDto[] = [];
  isLoading = false;
  isSaving = false;

  get ingredientsArray(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  get currentRecipeVersionStr(): string {
    return this.currentRecipe ? String(this.currentRecipe.version) : '';
  }

  get effectiveDishPrice(): number {
    return this.dishPrice || this.currentRecipe?.dishPrice || 0;
  }

  get totalEstimatedCost(): number {
    let total = 0;
    for (let i = 0; i < this.ingredientsArray.length; i++) {
      const row = this.ingredientsArray.at(i);
      const ingId = row.get('ingredientId')?.value;
      const ing = this.availableIngredients.find((x) => x.id === ingId);
      if (ing) {
        const qty = Number(row.get('quantity')?.value) || 0;
        const conv = Number(row.get('conversionFactor')?.value) || 0;
        const baseQty = qty * conv;
        const price = ing.estimatedPrice || 0;
        total += baseQty * price;
      }
    }
    return Math.round(total);
  }

  get foodCostPercentage(): number {
    const price = this.effectiveDishPrice;
    if (price <= 0) return 0;
    return Number(((this.totalEstimatedCost / price) * 100).toFixed(1));
  }

  get hasDeactivatedIngredients(): boolean {
    for (let i = 0; i < this.ingredientsArray.length; i++) {
      const ingId = this.ingredientsArray.at(i).get('ingredientId')?.value;
      const ing = this.availableIngredients.find((x) => x.id === ingId);
      if (ing && ing.isActive === false) return true;
    }
    return false;
  }

  get ingredientOptions(): CustomSelectOption[] {
    return this.availableIngredients.map((ing) => ({
      value: ing.id,
      label: `${ing.name} (${ing.unitName || ing.baseUnit || 'đơn vị'})`,
      desc: ing.code ? `Mã: ${ing.code}` : undefined,
      icon: 'fa-box',
    }));
  }

  get unitOptions(): CustomSelectOption[] {
    return this.availableUnits.map((u) => ({
      value: u.id,
      label: u.name,
      icon: 'fa-scale-balanced',
    }));
  }

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.dishId) {
      this.loadDependencies();
      this.loadRecipe();
    }
  }

  loadDependencies(): void {
    const hasIngredientsPerm = this.permissionService.getGrantedPolicy('TooHungry.Ingredients');
    if (hasIngredientsPerm) {
      this.ingredientService.getList(false).subscribe({
        next: (res) => {
          this.availableIngredients = res?.items || [];
        },
      });
    }

    const hasUnitsPerm = this.permissionService.getGrantedPolicy('TooHungry.Units');
    if (hasUnitsPerm) {
      this.unitService.getList({ skipCount: 0, maxResultCount: 100 }).subscribe({
        next: (res) => {
          this.availableUnits = res.items || [];
        },
      });
    }
  }

  loadRecipe(): void {
    if (!this.dishId) return;
    this.isLoading = true;
    this.ingredientsArray.clear();

    this.recipeService.getByDishId(this.dishId).subscribe({
      next: (recipe) => {
        this.currentRecipe = recipe;
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
          recipe.ingredients.forEach((item) => {
            this.addIngredientRow(item);
          });
        } else {
          this.addIngredientRow();
        }
        this.isLoading = false;
      },
      error: () => {
        this.currentRecipe = undefined;
        this.addIngredientRow();
        this.isLoading = false;
      },
    });

    this.recipeService.getHistoryByDishId(this.dishId).subscribe({
      next: (history) => {
        this.recipeHistory = Array.isArray(history) ? history : (history as any)?.items || [];
      },
      error: () => {
        this.recipeHistory = [];
      },
    });
  }

  createIngredientFormGroup(item?: any): FormGroup {
    let unitId = item?.recipeUnitId || '';
    if (!unitId && item?.unit && this.availableUnits.length > 0) {
      const found = this.availableUnits.find(
        (u) => u.name?.toLowerCase() === item.unit.toLowerCase() || u.abbreviation?.toLowerCase() === item.unit.toLowerCase()
      );
      if (found) {
        unitId = found.id;
      }
    }

    return this.fb.group({
      ingredientId: [item?.ingredientId || '', [Validators.required]],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(0.0001)]],
      recipeUnitId: [unitId, [Validators.required]],
      conversionFactor: [item?.conversionFactor || 1, [Validators.required, Validators.min(0.000001)]],
    });
  }

  addIngredientRow(item?: RecipeIngredientDto): void {
    this.ingredientsArray.push(this.createIngredientFormGroup(item));
  }

  removeIngredientRow(index: number): void {
    this.ingredientsArray.removeAt(index);
    if (this.ingredientsArray.length === 0) {
      this.addIngredientRow();
    }
  }

  onIngredientSelected(index: number): void {
    const row = this.ingredientsArray.at(index);
    const selectedId = row.get('ingredientId')?.value;
    const ing = this.availableIngredients.find((x) => x.id === selectedId);
    if (ing) {
      // Auto set default recipe unit to ingredient's unit if empty
      if (!row.get('recipeUnitId')?.value) {
        let defaultUnitId = ing.unitId;
        const rawUnit = ing.unitName || ing.baseUnit;
        if (!defaultUnitId && rawUnit && this.availableUnits.length > 0) {
          const uName = rawUnit.toLowerCase();
          const matched = this.availableUnits.find(
            (u) => u.name?.toLowerCase() === uName || u.abbreviation?.toLowerCase() === uName
          );
          if (matched) {
            defaultUnitId = matched.id;
          }
        }
        if (defaultUnitId) {
          row.patchValue({ recipeUnitId: defaultUnitId, conversionFactor: 1 });
        }
      }
    }
  }

  getWarehouseUnitName(ingredientId: string): string {
    const ing = this.availableIngredients.find((x) => x.id === ingredientId);
    return ing?.unitName || '';
  }

  calculateWarehouseDeduction(index: number): number {
    const row = this.ingredientsArray.at(index);
    const qty = Number(row.get('quantity')?.value) || 0;
    const conv = Number(row.get('conversionFactor')?.value) || 0;
    return Number((qty * conv).toFixed(4));
  }

  save(): void {
    if (!this.dishId || this.form.invalid) return;

    this.isSaving = true;
    const rawItems = this.ingredientsArray.value;
    const items = rawItems.map((x: any) => {
      const unitObj = this.availableUnits.find((u) => u.id === x.recipeUnitId);
      const unitName = unitObj?.name || '';
      return {
        ingredientId: x.ingredientId,
        quantity: Number(x.quantity),
        recipeUnitId: x.recipeUnitId,
        unit: unitName,
        conversionFactor: Number(x.conversionFactor),
      };
    });

    this.recipeService
      .createOrUpdate({
        dishId: this.dishId,
        name: this.dishName ? `Công thức ${this.dishName}` : 'Công thức món ăn',
        ingredients: items,
      })
      .subscribe({
        next: (res) => {
          this.isSaving = false;
          this.toaster.success('::RecipeSavedSuccess');
          this.recipeSaved.emit();
          this.close();
        },
        error: (err) => {
          this.isSaving = false;
          this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra khi lưu công thức');
        },
      });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
