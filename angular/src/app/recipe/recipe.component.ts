import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CoreModule,
  ListService,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Subscription } from 'rxjs';
import { RecipeService } from '../proxy/dishes/recipe.service';
import { RecipeDto } from '../proxy/dishes/models';
import { DishService } from '../proxy/dishes/dish.service';
import { DishDto } from '../proxy/dishes/models';
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { IngredientDto } from '../proxy/ingredients/models';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-recipe',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, NgxDatatableModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './recipe.component.html',
  styleUrl: './recipe.component.scss',
  providers: [ListService],
})
export class RecipeComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly recipeService = inject(RecipeService);
  private readonly dishService = inject(DishService);
  private readonly ingredientService = inject(IngredientService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  data: PagedResultDto<RecipeDto> = { items: [], totalCount: 0 };
  dishes: DishDto[] = [];
  ingredients: IngredientDto[] = [];
  dishOptions: CustomSelectOption[] = [];
  ingredientOptions: CustomSelectOption[] = [];

  searchTerm = '';
  sortBy = 'name asc';

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
  selectedItem = {} as RecipeDto;

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;

  get currentPage(): number {
    return this.list.page + 1;
  }

  get totalPages(): number {
    const total = this.data?.totalCount || 0;
    return Math.ceil(total / (this.list.maxResultCount || 10)) || 1;
  }

  get fromRecord(): number {
    const total = this.data?.totalCount || 0;
    if (total === 0) return 0;
    return this.list.page * this.list.maxResultCount + 1;
  }

  get toRecord(): number {
    const total = this.data?.totalCount || 0;
    return Math.min((this.list.page + 1) * this.list.maxResultCount, total);
  }

  get recipeIngredientsArray(): FormArray {
    return this.form.get('recipeIngredients') as FormArray;
  }

  ngOnInit() {
    this.list.maxResultCount = 10;

    // Load dishes and ingredients for dropdowns
    this.dishService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.dishes = res.items || [];
      this.dishOptions = this.dishes.map(dish => ({
        value: dish.id,
        label: dish.name || '',
        icon: 'fa-utensils',
      }));
      this.cdr.markForCheck();
    });

    this.ingredientService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.ingredients = res.items || [];
      this.ingredientOptions = this.ingredients.map(ing => ({
        value: ing.id,
        label: `${ing.name}${ing.unitName ? ' (' + ing.unitName + ')' : ''}`,
        icon: 'fa-seedling',
        desc: ing.ingredientCategoryName || undefined,
      }));
      this.cdr.markForCheck();
    });

    const streamCreator = (query: PagedAndSortedResultRequestDto) =>
      this.recipeService.getList({
        ...query,
        sorting: this.sortBy,
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const term = this.searchTerm.trim().toLowerCase();
        const filtered = (res.items || []).filter(
          item =>
            item.name?.toLowerCase().includes(term) ||
            item.dishName?.toLowerCase().includes(term) ||
            item.description?.toLowerCase().includes(term)
        );
        this.data = { items: filtered, totalCount: filtered.length };
      } else {
        this.data = res;
      }
      this.cdr.markForCheck();
      this.recalculateTable();
    });
  }

  onSearchChange() {
    this.list.page = 0;
    this.list.get();
  }

  onSortChange(sortBy: string) {
    this.sortBy = sortBy;
    this.list.page = 0;
    this.list.get();
  }

  changePageSize(newSize: number) {
    this.list.page = 0;
    this.list.maxResultCount = Number(newSize);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.list.page = page - 1;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.list.page = this.list.page - 1;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.list.page = this.list.page + 1;
    }
  }

  firstPage() {
    if (this.currentPage !== 1) {
      this.list.page = 0;
    }
  }

  lastPage() {
    if (this.currentPage !== this.totalPages) {
      this.list.page = this.totalPages - 1;
    }
  }

  ngAfterViewInit() {
    if (typeof ResizeObserver !== 'undefined' && this.tableWrapper?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.table?.recalculate();
        this.cdr.markForCheck();
      });
      this.resizeObserver.observe(this.tableWrapper.nativeElement);
    }
    this.recalculateTable();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.listSubscription?.unsubscribe();
  }

  private recalculateTable() {
    requestAnimationFrame(() => {
      this.table?.recalculate();
      window.dispatchEvent(new Event('resize'));
      this.cdr.markForCheck();
    });
    setTimeout(() => {
      this.table?.recalculate();
      window.dispatchEvent(new Event('resize'));
      this.cdr.markForCheck();
    }, 50);
    setTimeout(() => {
      this.table?.recalculate();
      this.cdr.markForCheck();
    }, 200);
  }

  createRecipe() {
    this.selectedItem = {} as RecipeDto;
    this.buildForm();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editRecipe(id: string) {
    this.recipeService.get(id).subscribe(recipe => {
      this.selectedItem = recipe;
      this.buildForm();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    this.form = this.fb.group({
      dishId: [this.selectedItem.dishId || '', Validators.required],
      name: [this.selectedItem.name || '', Validators.required],
      description: [this.selectedItem.description || ''],
      instructions: [this.selectedItem.instructions || ''],
      recipeIngredients: this.fb.array([]),
    });

    if (this.selectedItem.recipeIngredients && this.selectedItem.recipeIngredients.length > 0) {
      this.selectedItem.recipeIngredients.forEach(item => {
        this.recipeIngredientsArray.push(
          this.fb.group({
            ingredientId: [item.ingredientId || '', Validators.required],
            quantity: [item.quantity || 1, [Validators.required, Validators.min(0.01)]],
            note: [item.note || ''],
          })
        );
      });
    }
  }

  addIngredientRow() {
    this.recipeIngredientsArray.push(
      this.fb.group({
        ingredientId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(0.01)]],
        note: [''],
      })
    );
    this.cdr.markForCheck();
  }

  removeIngredientRow(index: number) {
    this.recipeIngredientsArray.removeAt(index);
    this.cdr.markForCheck();
  }

  getIngredientUnit(ingredientId: string | null | undefined): string {
    if (!ingredientId) return '-';
    const ing = this.ingredients.find(i => i.id === ingredientId);
    return ing?.unitName || '-';
  }

  onDishSelected(dishId: string) {
    const currentName = this.form.get('name')?.value;
    if (!currentName || currentName.trim() === '') {
      const dish = this.dishes.find(d => d.id === dishId);
      if (dish) {
        this.form.patchValue({ name: `${dish.name} Recipe` });
      }
    }
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const request = this.selectedItem.id
      ? this.recipeService.update(this.selectedItem.id, this.form.value)
      : this.recipeService.create(this.form.value);

    request.subscribe(() => {
      this.isModalOpen = false;
      this.form.reset();
      this.list.get();
      this.cdr.markForCheck();
    });
  }

  delete(id: string) {
    this.confirmation
      .warn('::AreYouSureToDelete', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.recipeService.delete(id).subscribe(() => {
            this.list.get();
            this.cdr.markForCheck();
          });
        }
      });
  }
}
