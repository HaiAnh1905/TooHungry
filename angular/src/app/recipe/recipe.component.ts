import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DishService } from '../proxy/controllers/dish.service';
import { DishCategoryService } from '../proxy/dishes/dish-category.service';
import { DishDto, DishCategoryDto } from '../proxy/dishes/models';
import { RecipeService } from '../proxy/recipes/recipe.service';
import { RecipeDto } from '../proxy/recipes/models';
import { RecipeModalComponent } from './recipe-modal/recipe-modal.component';
import {
  CustomSelectComponent,
  CustomSelectOption,
} from '../shared/components/custom-select/custom-select.component';
import { PagerComponent } from '../shared/components/pager/pager.component';

interface DishRecipeViewModel extends DishDto {
  recipe?: RecipeDto;
  isLoadingRecipe?: boolean;
}

@Component({
  selector: 'app-recipe',
  standalone: true,
  imports: [
    CommonModule,
    CoreModule,
    ThemeSharedModule,
    FormsModule,
    RecipeModalComponent,
    CustomSelectComponent,
    PagerComponent,
  ],
  templateUrl: './recipe.component.html',
  styleUrl: './recipe.component.scss',
})
export class RecipeComponent implements OnInit {
  private readonly dishService = inject(DishService);
  private readonly dishCategoryService = inject(DishCategoryService);
  private readonly recipeService = inject(RecipeService);
  private readonly toaster = inject(ToasterService);
  private readonly cdr = inject(ChangeDetectorRef);

  dishes: DishRecipeViewModel[] = [];
  filteredDishes: DishRecipeViewModel[] = [];
  categoriesList: DishCategoryDto[] = [];
  selectedCategoryId = '';
  searchTerm = '';
  filterStatus: 'all' | 'has_recipe' | 'no_recipe' = 'all';
  isLoading = false;

  get categoryOptions(): CustomSelectOption[] {
    const defaultOpt: CustomSelectOption = {
      value: '',
      label: '::AllCategories',
      icon: 'fa-layer-group',
    };
    const catOpts: CustomSelectOption[] = this.categoriesList.map(c => ({
      value: c.id || '',
      label: c.name || '',
      icon: 'fa-tag',
    }));
    return [defaultOpt, ...catOpts];
  }

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 5, label: '5 ::RowsPerPage' },
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
    { value: 50, label: '50 ::RowsPerPage' },
  ];

  currentPage = 1;
  pageSize = 10;

  get baseCategoryDishes(): DishRecipeViewModel[] {
    let list = this.dishes;
    if (this.selectedCategoryId) {
      list = list.filter(d => d.dishCategoryId === this.selectedCategoryId);
    }
    return list;
  }

  get totalCount(): number {
    return this.baseCategoryDishes.length;
  }

  get hasRecipeCount(): number {
    return this.baseCategoryDishes.filter(d => !!d.recipe && d.recipe.isActive).length;
  }

  get noRecipeCount(): number {
    return this.baseCategoryDishes.filter(d => !d.recipe || !d.recipe.isActive).length;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDishes.length / this.pageSize) || 1;
  }

  get pagedDishes(): DishRecipeViewModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDishes.slice(start, start + this.pageSize);
  }

  get fromRecord(): number {
    if (this.filteredDishes.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredDishes.length);
  }

  changePageSize(size: number): void {
    this.pageSize = Number(size);
    this.currentPage = 1;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  firstPage(): void {
    this.currentPage = 1;
  }

  lastPage(): void {
    this.currentPage = this.totalPages;
  }

  // Modal
  isModalOpen = false;
  selectedDish?: DishRecipeViewModel;

  ngOnInit(): void {
    this.loadDishes();
  }

  loadDishes(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      dishesRes: this.dishService.getList({
        filter: '',
        skipCount: 0,
        maxResultCount: 1000,
      }),
      recipesRes: this.recipeService
        .getList({
          maxResultCount: 1000,
        })
        .pipe(catchError(() => of({ totalCount: 0, items: [] as RecipeDto[] }))),
      categoriesRes: this.dishCategoryService
        .getList({
          maxResultCount: 100,
          skipCount: 0,
        })
        .pipe(catchError(() => of({ totalCount: 0, items: [] as DishCategoryDto[] }))),
    }).subscribe({
      next: ({ dishesRes, recipesRes, categoriesRes }) => {
        this.categoriesList = categoriesRes?.items || [];
        const recipeMap = new Map<string, RecipeDto>();
        (recipesRes?.items || []).forEach(r => {
          if (r.dishId) {
            const existing = recipeMap.get(r.dishId);
            if (!existing || (!existing.isActive && r.isActive)) {
              recipeMap.set(r.dishId, r);
            }
          }
        });

        this.dishes = (dishesRes?.items || []).map(d => ({
          ...d,
          recipe: d.id ? recipeMap.get(d.id) : undefined,
          isLoadingRecipe: false,
        }));

        this.applyFilter();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.dishes = [];
        this.filteredDishes = [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter(): void {
    let list = this.dishes;

    if (this.selectedCategoryId) {
      list = list.filter(d => d.dishCategoryId === this.selectedCategoryId);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter(d => d.name && d.name.toLowerCase().includes(term));
    }

    if (this.filterStatus === 'has_recipe') {
      list = list.filter(d => !!d.recipe && d.recipe.isActive);
    } else if (this.filterStatus === 'no_recipe') {
      list = list.filter(d => !d.recipe || !d.recipe.isActive);
    }

    this.filteredDishes = list;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId = categoryId || '';
    this.applyFilter();
  }

  openRecipeModal(dish: DishRecipeViewModel): void {
    this.selectedDish = dish;
    this.isModalOpen = true;
  }

  onRecipeSaved(): void {
    this.loadDishes();
  }

  // Quản lý Tạm ngưng và Kích hoạt lại
  isDeactivateModalOpen = false;
  deactivatingDish?: DishRecipeViewModel;
  deactivationReason = '';
  isDeactivating = false;

  openDeactivateModal(dish: DishRecipeViewModel): void {
    this.deactivatingDish = dish;
    this.deactivationReason = '';
    this.isDeactivateModalOpen = true;
  }

  confirmDeactivate(): void {
    if (!this.deactivatingDish?.recipe?.id || !this.deactivationReason.trim()) {
      this.toaster.error('::DeactivationReasonRequired');
      return;
    }

    this.isDeactivating = true;
    this.recipeService.deactivate(this.deactivatingDish.recipe.id, this.deactivationReason.trim()).subscribe({
      next: () => {
        this.isDeactivating = false;
        this.isDeactivateModalOpen = false;
        this.toaster.success('::RecipeDeactivatedSuccess');
        this.loadDishes();
      },
      error: (err) => {
        this.isDeactivating = false;
        this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra');
      },
    });
  }

  reactivateRecipe(dish: DishRecipeViewModel): void {
    if (!dish.recipe?.id) return;

    this.recipeService.reactivate(dish.recipe.id).subscribe({
      next: () => {
        this.toaster.success('::RecipeReactivatedSuccess');
        this.loadDishes();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || err?.message || 'Có lỗi xảy ra khi kích hoạt lại');
      },
    });
  }
}
