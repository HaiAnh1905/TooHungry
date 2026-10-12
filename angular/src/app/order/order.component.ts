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
  LocalizationService,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
} from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrderService } from '../proxy/orders/order.service';
import { OrderDto } from '../proxy/orders/models';
import { OrderStatus, orderStatusOptions } from '../proxy/orders/order-status.enum';
import { DishService } from '../proxy/controllers/dish.service';
import { DishDto } from '../proxy/dishes/models';
import { TableService } from '../proxy/tables/table.service';
import { TableDto } from '../proxy/tables/models';
import { RecipeService } from '../proxy/recipes/recipe.service';
import { RecipeDto } from '../proxy/recipes/models';
import { IngredientService } from '../proxy/ingredients/ingredient.service';
import { IngredientDto } from '../proxy/ingredients/models';
import { Router } from '@angular/router';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, NgxDatatableModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './order.component.html',
  styleUrl: './order.component.scss',
  providers: [ListService],
})
export class OrderComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly orderService = inject(OrderService);
  private readonly dishService = inject(DishService);
  private readonly tableService = inject(TableService);
  private readonly recipeService = inject(RecipeService);
  private readonly ingredientService = inject(IngredientService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  data: PagedResultDto<OrderDto> = { items: [], totalCount: 0 };
  dishes: DishDto[] = [];
  tables: TableDto[] = [];
  tableSelectOptions: CustomSelectOption[] = [];
  recipes: RecipeDto[] = [];
  ingredients: IngredientDto[] = [];
  recipeByDishId = new Map<string, RecipeDto>();
  ingredientById = new Map<string, IngredientDto>();

  readonly orderStatuses = orderStatusOptions;
  readonly OrderStatus = OrderStatus;

  readonly orderStatusSelectOptions: CustomSelectOption[] = [
    { value: OrderStatus.Pending, label: '::OrderStatusPending', icon: 'fa-clock' },
    { value: OrderStatus.Processing, label: '::OrderStatusProcessing', icon: 'fa-spinner' },
    { value: OrderStatus.Completed, label: '::OrderStatusCompleted', icon: 'fa-check-circle' },
    { value: OrderStatus.Cancelled, label: '::OrderStatusCancelled', icon: 'fa-times-circle' },
  ];

  searchTerm = '';
  selectedStatus: string = '';
  sortBy = 'orderDate desc';

  readonly statusFilterOptions: CustomSelectOption[] = [
    { value: '', label: '::AllStatuses', icon: 'fa-receipt' },
    { value: OrderStatus.Pending, label: '::OrderStatusPending', icon: 'fa-clock' },
    { value: OrderStatus.Processing, label: '::OrderStatusProcessing', icon: 'fa-spinner' },
    { value: OrderStatus.Completed, label: '::OrderStatusCompleted', icon: 'fa-check-circle' },
    { value: OrderStatus.Cancelled, label: '::OrderStatusCancelled', icon: 'fa-times-circle' },
  ];

  readonly sortOptions: CustomSelectOption[] = [
    { value: 'orderDate desc', label: '::SortDateDesc', icon: 'fa-sort-numeric-down-alt' },
    { value: 'orderDate asc', label: '::SortDateAsc', icon: 'fa-sort-numeric-down' },
    { value: 'totalAmount desc', label: '::SortAmountDesc', icon: 'fa-sort-amount-down-alt' },
    { value: 'totalAmount asc', label: '::SortAmountAsc', icon: 'fa-sort-amount-down' },
  ];

  readonly pageSizeOptions: CustomSelectOption[] = [
    { value: 5, label: '5 ::RowsPerPage' },
    { value: 10, label: '10 ::RowsPerPage' },
    { value: 20, label: '20 ::RowsPerPage' },
  ];

  isModalOpen = false;
  form!: FormGroup;
  selectedItem = {} as OrderDto;

  // POS Menu Selection
  dishSearchTerm = '';
  expandedCategories: Set<string> = new Set<string>();

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

  get orderItemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit() {
    this.list.maxResultCount = 10;
    this.loadRecipesAndIngredients();

    this.dishService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.dishes = res.items || [];
      this.cdr.markForCheck();
    });

    this.tableService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.tables = res.items || [];
      this.tableSelectOptions = this.tables.map(t => ({
        value: t.id,
        label: t.name || '',
        icon: 'fa-chair',
      }));
      this.cdr.markForCheck();
    });

    const streamCreator = (query: PagedAndSortedResultRequestDto) =>
      this.orderService.getList({
        ...query,
        sorting: this.sortBy,
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      let items = res.items || [];

      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const term = this.searchTerm.trim().toLowerCase();
        items = items.filter(
          item =>
            item.orderNumber?.toLowerCase().includes(term) ||
            item.note?.toLowerCase().includes(term)
        );
      }

      if (this.selectedStatus !== '') {
        const statusNum = Number(this.selectedStatus);
        items = items.filter(item => item.status === statusNum);
      }

      this.data = { items, totalCount: items.length };
      this.cdr.markForCheck();
      this.recalculateTable();
    });
  }

  loadRecipesAndIngredients() {
    forkJoin({
      recipesRes: this.recipeService.getList({ maxResultCount: 1000 } as any).pipe(catchError(() => of({ items: [] }))),
      ingredientsRes: this.ingredientService.getList({ maxResultCount: 1000 } as any).pipe(catchError(() => of({ items: [] }))),
    }).subscribe({
      next: ({ recipesRes, ingredientsRes }) => {
        this.recipes = (recipesRes as any)?.items || [];
        this.ingredients = (ingredientsRes as any)?.items || [];

        this.recipeByDishId.clear();
        for (const r of this.recipes) {
          if (r.dishId && r.isActive) {
            this.recipeByDishId.set(r.dishId, r);
          }
        }

        this.ingredientById.clear();
        for (const ing of this.ingredients) {
          if (ing.id) {
            this.ingredientById.set(ing.id, ing);
          }
        }
        this.cdr.markForCheck();
      },
    });
  }

  getDishStockInfo(
    dishId?: string,
    quantity: number = 1
  ): {
    isOutOfStock: boolean;
    isShortage: boolean;
    warningMessage?: string;
    ingredientName?: string;
    unitStr?: string;
    currentStock?: number;
    missingAmount?: number;
  } {
    if (!dishId) return { isOutOfStock: false, isShortage: false };
    const recipe = this.recipeByDishId.get(dishId);
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      return { isOutOfStock: false, isShortage: false };
    }

    for (const item of recipe.ingredients) {
      if (!item.ingredientId) continue;
      const ing = this.ingredientById.get(item.ingredientId);
      if (!ing) continue;

      const currentStock = Number(ing.currentStock || 0);
      const conversion = Number(item.conversionFactor || 1);
      const neededPerDish = Number(item.quantity || 0) * conversion;
      const totalNeeded = neededPerDish * quantity;
      const unitStr = ing.baseUnit || item.warehouseUnitName || item.unit || '';

      if (currentStock <= 0) {
        return {
          isOutOfStock: true,
          isShortage: true,
          ingredientName: ing.name,
          unitStr,
          currentStock: 0,
          missingAmount: totalNeeded,
          warningMessage: this.localizationService.instant(
            '::StockShortageOutOfStock',
            ing.name,
            unitStr
          ),
        };
      }

      if (currentStock < totalNeeded) {
        const missing = Number((totalNeeded - currentStock).toFixed(1));
        return {
          isOutOfStock: false,
          isShortage: true,
          ingredientName: ing.name,
          unitStr,
          currentStock,
          missingAmount: missing,
          warningMessage: this.localizationService.instant(
            '::StockShortageDeficit',
            missing.toString(),
            unitStr,
            ing.name,
            currentStock.toString()
          ),
        };
      }
    }

    return { isOutOfStock: false, isShortage: false };
  }

  initialDishQuantities = new Map<string, number>();
  initialOrderSnapshot = '';

  private getOrderSnapshot(): string {
    if (!this.form) return '';
    const items = (this.orderItemsArray?.controls || [])
      .map(c => ({
        dishId: c.get('dishId')?.value,
        quantity: Number(c.get('quantity')?.value || 0),
        unitPrice: Number(c.get('unitPrice')?.value || 0),
      }))
      .sort((a, b) => (a.dishId || '').localeCompare(b.dishId || ''));

    const note = (this.form.get('note')?.value || '').trim();
    const tableId = this.form.get('tableId')?.value || '';
    const status = this.form.get('status')?.value;
    const orderDate = this.form.get('orderDate')?.value || '';
    return JSON.stringify({ items, note, tableId, status, orderDate });
  }

  get hasOrderChanged(): boolean {
    if (!this.selectedItem?.id) return true;
    return this.getOrderSnapshot() !== this.initialOrderSnapshot;
  }

  isDishOutOfStock(dishId?: string): boolean {
    return this.getDishStockInfo(dishId, 1).isOutOfStock;
  }

  getDishStockWarning(dishId?: string, quantity: number = 1): string | null {
    if (!dishId) return null;
    const initialQty = this.initialDishQuantities.get(dishId) || 0;
    if (initialQty > 0 && quantity <= initialQty) {
      return null;
    }

    const info = this.getDishStockInfo(dishId, quantity);
    return info.warningMessage || null;
  }

  onSearchChange() {
    this.list.page = 0;
    this.list.get();
  }

  onStatusFilterChange(status: any) {
    this.selectedStatus = status !== null && status !== undefined ? String(status) : '';
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

  createOrder() {
    this.loadRecipesAndIngredients();
    this.selectedItem = {
      orderNumber: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      orderDate: new Date().toISOString().substring(0, 10),
      status: OrderStatus.Pending,
      totalAmount: 0,
      items: [],
    } as OrderDto;
    this.buildForm();
    this.dishSearchTerm = '';
    // Mặc định đóng tất cả category dropdown
    this.expandedCategories = new Set<string>();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editOrder(id: string) {
    this.loadRecipesAndIngredients();
    this.orderService.get(id).subscribe(order => {
      this.selectedItem = order;
      this.buildForm();
      this.dishSearchTerm = '';
      this.expandedCategories = new Set<string>();
      this.isModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    const formattedDate = this.selectedItem.orderDate
      ? this.selectedItem.orderDate.substring(0, 10)
      : new Date().toISOString().substring(0, 10);

    const defaultTableId =
      this.selectedItem.tableId || (this.tables.length > 0 ? this.tables[0].id : null);

    this.form = this.fb.group({
      orderNumber: [this.selectedItem.orderNumber || '', Validators.required],
      orderDate: [formattedDate, Validators.required],
      status: [this.selectedItem.status ?? OrderStatus.Pending, Validators.required],
      tableId: [defaultTableId, Validators.required],
      note: [this.selectedItem.note || ''],
      totalAmount: [this.selectedItem.totalAmount || 0],
      items: this.fb.array([]),
    });

    if (this.selectedItem.items && this.selectedItem.items.length > 0) {
      this.selectedItem.items.forEach(item => {
        this.orderItemsArray.push(
          this.fb.group({
            dishId: [item.dishId || '', Validators.required],
            quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
            unitPrice: [item.unitPrice || 0, [Validators.required, Validators.min(0)]],
          })
        );
      });
    }

    if (this.isOrderCompleted) {
      this.form.disable();
    }

    this.calculateTotal();

    this.initialDishQuantities.clear();
    if (this.selectedItem?.id && this.selectedItem.items && this.selectedItem.items.length > 0) {
      this.selectedItem.items.forEach(item => {
        if (item.dishId) {
          this.initialDishQuantities.set(item.dishId, item.quantity || 0);
        }
      });
    }
    this.initialOrderSnapshot = this.selectedItem?.id ? this.getOrderSnapshot() : '';
  }

  get isOrderCompleted(): boolean {
    return this.selectedItem?.status === OrderStatus.Completed;
  }

  goToPayment(orderId?: string) {
    if (orderId) {
      this.isModalOpen = false;
      this.router.navigate(['/payment', orderId]);
    }
  }

  get filteredDishes(): DishDto[] {
    if (!this.dishes) return [];
    if (!this.dishSearchTerm || this.dishSearchTerm.trim() === '') {
      return this.dishes;
    }
    const term = this.dishSearchTerm.trim().toLowerCase();
    return this.dishes.filter(
      d =>
        (d.name && d.name.toLowerCase().includes(term)) ||
        (d.dishCategoryName && d.dishCategoryName.toLowerCase().includes(term))
    );
  }

  get groupedDishes(): { categoryName: string; dishes: DishDto[] }[] {
    const filtered = this.filteredDishes;
    if (!filtered || filtered.length === 0) return [];

    const otherCatName = this.localizationService.instant('::OtherDishes');
    const groupsMap = new Map<string, DishDto[]>();

    for (const dish of filtered) {
      const catName = dish.dishCategoryName?.trim() || otherCatName;
      if (!groupsMap.has(catName)) {
        groupsMap.set(catName, []);
      }
      groupsMap.get(catName)!.push(dish);
    }

    const result: { categoryName: string; dishes: DishDto[] }[] = [];
    groupsMap.forEach((dishes, categoryName) => {
      if (dishes.length > 0) {
        result.push({ categoryName, dishes });
      }
    });

    return result;
  }

  toggleCategory(categoryName: string) {
    if (this.expandedCategories.has(categoryName)) {
      this.expandedCategories.delete(categoryName);
    } else {
      this.expandedCategories.add(categoryName);
    }
  }

  isCategoryExpanded(categoryName: string): boolean {
    if (this.dishSearchTerm && this.dishSearchTerm.trim() !== '') {
      return true;
    }
    return this.expandedCategories.has(categoryName);
  }

  getDishById(id?: string): DishDto | undefined {
    if (!id) return undefined;
    return this.dishes?.find(d => d.id === id);
  }

  getDishName(id?: string): string {
    if (!id) return '';
    return this.getDishById(id)?.name || '';
  }

  getDishPrice(id?: string): number {
    if (!id) return 0;
    return this.getDishById(id)?.price || 0;
  }

  getDishImageUrl(id?: string): string | null {
    if (!id) return null;
    return this.getDishById(id)?.imageUrl || null;
  }

  onImgError(event: Event) {
    const img = event.target as HTMLElement;
    img.style.display = 'none';
  }

  getItemQuantityInOrder(dishId?: string): number {
    if (!dishId || !this.orderItemsArray) return 0;
    const item = this.orderItemsArray.controls.find(c => c.get('dishId')?.value === dishId);
    return item ? Number(item.get('quantity')?.value || 0) : 0;
  }

  private lastWarningMsg = '';
  private lastWarningTime = 0;

  private showStockWarningToast(message?: string, title?: string) {
    if (!message) return;
    const now = Date.now();
    if (this.lastWarningMsg === message && now - this.lastWarningTime < 1500) {
      return;
    }
    this.lastWarningMsg = message;
    this.lastWarningTime = now;
    this.toaster.warn(message, title);
  }

  addDishToOrder(dish: DishDto) {
    if (this.isOrderCompleted || !dish || !dish.id) return;

    const existingIndex = this.orderItemsArray.controls.findIndex(
      c => c.get('dishId')?.value === dish.id
    );

    if (existingIndex >= 0) {
      this.increaseQuantity(existingIndex);
      return;
    }

    const stockInfo = this.getDishStockInfo(dish.id, 1);
    if (stockInfo.isShortage && stockInfo.warningMessage) {
      this.showStockWarningToast(stockInfo.warningMessage, `Cảnh báo: ${dish.name}`);
    }

    this.orderItemsArray.push(
      this.fb.group({
        dishId: [dish.id, Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: [dish.price || 0, [Validators.required, Validators.min(0)]],
      })
    );
    this.calculateTotal();
  }

  increaseQuantity(index: number) {
    if (this.isOrderCompleted) return;
    const row = this.orderItemsArray.at(index);
    const current = Number(row.get('quantity')?.value || 1);
    const dishId = row.get('dishId')?.value;
    const newQty = current + 1;

    const initialQty = this.initialDishQuantities.get(dishId) || 0;
    if (newQty > initialQty) {
      const stockInfo = this.getDishStockInfo(dishId, newQty);
      if (stockInfo.isShortage && stockInfo.warningMessage) {
        this.showStockWarningToast(stockInfo.warningMessage, `Cảnh báo: ${this.getDishName(dishId)}`);
      }
    }

    row.patchValue({ quantity: newQty });
    this.calculateTotal();
  }

  decreaseQuantity(index: number) {
    if (this.isOrderCompleted) return;
    const row = this.orderItemsArray.at(index);
    const current = Number(row.get('quantity')?.value || 1);
    if (current > 1) {
      row.patchValue({ quantity: current - 1 });
      this.calculateTotal();
    } else {
      this.removeOrderItem(index);
    }
  }

  removeOrderItem(index: number) {
    if (this.isOrderCompleted) return;
    this.orderItemsArray.removeAt(index);
    this.calculateTotal();
  }

  clearAllOrderItems() {
    if (this.isOrderCompleted) return;
    this.orderItemsArray.clear();
    this.calculateTotal();
  }

  calculateTotal() {
    let total = 0;
    if (this.orderItemsArray) {
      const items = this.orderItemsArray.controls;
      for (const item of items) {
        const q = item.get('quantity')?.value || 0;
        const p = item.get('unitPrice')?.value || 0;
        total += q * p;
      }
    }
    this.form?.get('totalAmount')?.setValue(total);
    this.cdr.markForCheck();
  }

  getStatusClass(status?: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'status-pending';
      case OrderStatus.Processing:
        return 'status-processing';
      case OrderStatus.Completed:
        return 'status-completed';
      case OrderStatus.Cancelled:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusLabel(status?: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return '::OrderStatusPending';
      case OrderStatus.Processing:
        return '::OrderStatusProcessing';
      case OrderStatus.Completed:
        return '::OrderStatusCompleted';
      case OrderStatus.Cancelled:
        return '::OrderStatusCancelled';
      default:
        return '-';
    }
  }

  save() {
    if (this.isOrderCompleted) {
      this.toaster.warn(this.localizationService.instant('::OrderCompletedLocked'));
      return;
    }

    if (this.form.invalid || this.orderItemsArray.length === 0) {
      this.toaster.warn(this.localizationService.instant('::PleaseSelectAtLeastOneDish'));
      return;
    }

    const formVal = { ...this.form.value };
    if (formVal.orderDate) {
      formVal.orderDate = new Date(formVal.orderDate).toISOString();
    }
    formVal.status = Number(formVal.status);

    const isEdit = !!this.selectedItem.id;

    const shortages: string[] = [];
    for (const item of this.orderItemsArray.controls) {
      const dId = item.get('dishId')?.value;
      const q = Number(item.get('quantity')?.value || 1);
      const initialQty = this.initialDishQuantities.get(dId) || 0;

      if (initialQty > 0 && q <= initialQty) {
        continue;
      }

      const s = this.getDishStockInfo(dId, q);
      if (s.isShortage && s.warningMessage) {
        const line = this.localizationService.instant(
          '::StockShortageDishLine',
          this.getDishName(dId),
          q.toString(),
          s.warningMessage
        );
        shortages.push(line);
      }
    }

    const executeSave = () => {
      const request = isEdit
        ? this.orderService.update(this.selectedItem.id!, formVal)
        : this.orderService.create(formVal);

      request.subscribe({
        next: () => {
          const msgKey = isEdit ? '::OrderUpdatedSuccessfully' : '::OrderCreatedSuccessfully';
          this.toaster.success(this.localizationService.instant(msgKey, formVal.orderNumber));
          if (formVal.status === OrderStatus.Completed) {
            this.toaster.info('Đã tự động tính tiêu hao và khấu trừ nguyên liệu theo FEFO.', 'Tiêu hao kho');
          }
          this.isModalOpen = false;
          this.form.reset();
          this.list.get();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toaster.error(err?.error?.message || 'Có lỗi xảy ra khi lưu đơn hàng!');
        },
      });
    };

    if (shortages.length > 0) {
      const alertList = shortages.join('<br>');
      const alertMsg = this.localizationService.instant('::OrderHasStockShortageAlert', alertList);
      this.confirmation.warn(
        alertMsg,
        this.localizationService.instant('::StockShortageWarningTitle'),
        {
          hideCancelBtn: true,
          yesText: '::Close',
        }
      );
      return;
    }

    executeSave();
  }

  delete(id: string) {
    const orderToDelete = this.data.items?.find(x => x.id === id);
    if (orderToDelete && orderToDelete.status === OrderStatus.Completed) {
      this.toaster.warn('Đơn hàng đã hoàn thành và đã khóa, không thể xóa để bảo toàn dữ liệu kế toán!');
      return;
    }

    this.confirmation
      .warn('::AreYouSureToDelete', '::AreYouSure')
      .subscribe((status: Confirmation.Status) => {
        if (status === Confirmation.Status.confirm) {
          this.orderService.delete(id).subscribe(() => {
            this.list.get();
            this.cdr.markForCheck();
          });
        }
      });
  }
}
