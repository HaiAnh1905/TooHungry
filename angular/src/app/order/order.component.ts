import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  ElementRef,
  signal,
  computed,
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
import { of, Subscription, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { OrderService } from '../proxy/orders/order.service';
import { OrderDto } from '../proxy/orders/models';
import { OrderStatus, orderStatusOptions } from '../proxy/orders/order-status.enum';
import { DishService } from '../proxy/controllers/dish.service';
import { DishDto } from '../proxy/dishes/models';
import { TableService } from '../proxy/tables/table.service';
import { TableDto } from '../proxy/tables/models';
import { Router } from '@angular/router';
import { CustomSelectComponent, CustomSelectOption } from '../shared/components/custom-select/custom-select.component';
import { PagerComponent } from '../shared/components/pager/pager.component';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, CoreModule, ThemeSharedModule, NgxDatatableModule, ReactiveFormsModule, FormsModule, CustomSelectComponent, PagerComponent],
  templateUrl: './order.component.html',
  styleUrl: './order.component.scss',
  providers: [ListService],
})
export class OrderComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly list = inject(ListService);
  private readonly orderService = inject(OrderService);
  private readonly dishService = inject(DishService);
  private readonly tableService = inject(TableService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toaster = inject(ToasterService);
  private readonly localizationService = inject(LocalizationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('table') table?: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper?: ElementRef;

  data: PagedResultDto<OrderDto> = { items: [], totalCount: 0 };
  readonly dishes = signal<DishDto[]>([]);
  tables: TableDto[] = [];
  tableSelectOptions: CustomSelectOption[] = [];

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
  readonly dishSearchTermSignal = signal<string>('');
  expandedCategories: Set<string> = new Set<string>();

  // Real-time server stock warnings
  readonly stockWarnings = signal<Map<string, string>>(new Map());
  private readonly validateCartStockSubject = new Subject<void>();
  private cartStockSubscription?: Subscription;

  private resizeObserver?: ResizeObserver;
  private listSubscription?: Subscription;

  readonly filteredDishes = computed(() => {
    const list = this.dishes();
    const term = this.dishSearchTermSignal().trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      d =>
        (d.name && d.name.toLowerCase().includes(term)) ||
        (d.dishCategoryName && d.dishCategoryName.toLowerCase().includes(term))
    );
  });

  readonly groupedDishes = computed(() => {
    const filtered = this.filteredDishes();
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
  });

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

    this.cartStockSubscription = this.validateCartStockSubject
      .pipe(
        debounceTime(300),
        switchMap(() => {
          const items = (this.orderItemsArray?.controls || [])
            .map(c => ({
              dishId: c.get('dishId')?.value,
              quantity: Number(c.get('quantity')?.value || 1),
            }))
            .filter(x => !!x.dishId);
          if (items.length === 0) {
            return of({ isValid: true, shortages: [] });
          }
          return this.orderService.validateStock({ items }, { skipHandleError: true }).pipe(
            catchError(() => of({ isValid: true, shortages: [] }))
          );
        })
      )
      .subscribe((res: any) => {
        const warningMap = new Map<string, string>();
        if (res && !res.isValid && res.shortages) {
          for (const s of res.shortages) {
            if (s.dishId && s.warningMessage) {
              warningMap.set(s.dishId, s.warningMessage);
            }
          }
        }
        this.stockWarnings.set(warningMap);
        this.cdr.markForCheck();
      });

    this.dishService.getList({ maxResultCount: 200, skipCount: 0 }).subscribe(res => {
      this.dishes.set(res.items || []);
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
        filter: this.searchTerm?.trim() || undefined,
        status: this.selectedStatus !== '' ? (Number(this.selectedStatus) as OrderStatus) : undefined,
      });

    this.listSubscription = this.list.hookToQuery(streamCreator).subscribe(res => {
      this.data = res;
      this.cdr.markForCheck();
      this.recalculateTable();
    });
  }

  private triggerStockCheck() {
    this.validateCartStockSubject.next();
  }

  private getLocalDateString(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  initialDishQuantities = new Map<string, number>();
  initialOrderSnapshot = '';

  private getOrderSnapshot(): string {
    if (!this.form) return '';
    const items = (this.orderItemsArray?.controls || [])
      .map(c => ({
        dishId: c.get('dishId')?.value,
        quantity: Number(c.get('quantity')?.value || 0),
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
    if (!dishId) return false;
    return !!this.stockWarnings().get(dishId);
  }

  getDishStockWarning(dishId?: string, quantity: number = 1): string | null {
    if (!dishId) return null;
    const initialQty = this.initialDishQuantities.get(dishId) || 0;
    if (initialQty > 0 && quantity <= initialQty) {
      return null;
    }
    return this.stockWarnings().get(dishId) || null;
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
    this.cartStockSubscription?.unsubscribe();
  }

  private recalculateTable() {
    this.table?.recalculate();
    this.cdr.markForCheck();
  }

  createOrder() {
    this.stockWarnings.set(new Map());
    this.selectedItem = {
      orderNumber: '',
      orderDate: this.getLocalDateString(),
      status: OrderStatus.Pending,
      totalAmount: 0,
      items: [],
    } as OrderDto;
    this.buildForm();
    this.dishSearchTerm = '';
    this.dishSearchTermSignal.set('');
    this.expandedCategories = new Set<string>();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  editOrder(id: string) {
    this.stockWarnings.set(new Map());
    this.orderService.get(id).subscribe(order => {
      this.selectedItem = order;
      this.buildForm();
      this.dishSearchTerm = '';
      this.dishSearchTermSignal.set('');
      this.expandedCategories = new Set<string>();
      this.isModalOpen = true;
      this.triggerStockCheck();
      this.cdr.markForCheck();
    });
  }

  buildForm() {
    const formattedDate = this.selectedItem.orderDate
      ? this.selectedItem.orderDate.substring(0, 10)
      : this.getLocalDateString();

    const defaultTableId =
      this.selectedItem.tableId || (this.tables.length > 0 ? this.tables[0].id : null);

    this.form = this.fb.group({
      orderNumber: [this.selectedItem.orderNumber || ''],
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
            unitPrice: [item.unitPrice || 0],
          })
        );
      });
    }

    if (this.isOrderLocked) {
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

  get isOrderCancelled(): boolean {
    return this.selectedItem?.status === OrderStatus.Cancelled;
  }

  get isOrderLocked(): boolean {
    return this.isOrderCompleted || this.isOrderCancelled;
  }

  goToPayment(orderId?: string) {
    if (orderId) {
      this.isModalOpen = false;
      this.router.navigate(['/payment', orderId]);
    }
  }

  onDishSearchInput(term: string) {
    this.dishSearchTerm = term;
    this.dishSearchTermSignal.set(term);
  }

  toggleCategory(categoryName: string) {
    if (this.expandedCategories.has(categoryName)) {
      this.expandedCategories.delete(categoryName);
    } else {
      this.expandedCategories.add(categoryName);
    }
  }

  isCategoryExpanded(categoryName: string): boolean {
    if (this.dishSearchTermSignal().trim() !== '') {
      return true;
    }
    return this.expandedCategories.has(categoryName);
  }

  getDishById(id?: string): DishDto | undefined {
    if (!id) return undefined;
    return this.dishes().find(d => d.id === id);
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

  addDishToOrder(dish: DishDto) {
    if (this.isOrderLocked || !dish || !dish.id) return;

    const existingIndex = this.orderItemsArray.controls.findIndex(
      c => c.get('dishId')?.value === dish.id
    );

    if (existingIndex >= 0) {
      this.increaseQuantity(existingIndex);
      return;
    }

    this.orderItemsArray.push(
      this.fb.group({
        dishId: [dish.id, Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: [dish.price || 0],
      })
    );
    this.calculateTotal();
    this.triggerStockCheck();
  }

  increaseQuantity(index: number) {
    if (this.isOrderLocked) return;
    const row = this.orderItemsArray.at(index);
    const current = Number(row.get('quantity')?.value || 1);
    row.patchValue({ quantity: current + 1 });
    this.calculateTotal();
    this.triggerStockCheck();
  }

  decreaseQuantity(index: number) {
    if (this.isOrderLocked) return;
    const row = this.orderItemsArray.at(index);
    const current = Number(row.get('quantity')?.value || 1);
    if (current > 1) {
      row.patchValue({ quantity: current - 1 });
      this.calculateTotal();
    } else {
      this.removeOrderItem(index);
    }
    this.triggerStockCheck();
  }

  removeOrderItem(index: number) {
    if (this.isOrderLocked) return;
    this.orderItemsArray.removeAt(index);
    this.calculateTotal();
    this.triggerStockCheck();
  }

  clearAllOrderItems() {
    if (this.isOrderLocked) return;
    this.orderItemsArray.clear();
    this.calculateTotal();
    this.triggerStockCheck();
  }

  calculateTotal() {
    let total = 0;
    if (this.orderItemsArray) {
      const items = this.orderItemsArray.controls;
      for (const item of items) {
        const q = Number(item.get('quantity')?.value || 0);
        const p = Number(item.get('unitPrice')?.value || 0);
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

  isStatusLocked(status?: OrderStatus): boolean {
    return status === OrderStatus.Completed || status === OrderStatus.Cancelled;
  }

  save() {
    if (this.isOrderLocked) {
      this.toaster.warn(
        this.localizationService.instant(
          this.isOrderCancelled ? '::OrderCancelledLocked' : '::OrderCompletedLocked'
        )
      );
      return;
    }

    if (this.form.invalid || this.orderItemsArray.length === 0) {
      this.toaster.warn(this.localizationService.instant('::PleaseSelectAtLeastOneDish'));
      return;
    }

    const formVal = { ...this.form.value };
    if (formVal.orderDate) {
      const parts = formVal.orderDate.split('-').map(Number);
      if (parts.length === 3) {
        formVal.orderDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).toISOString();
      }
    }
    formVal.status = Number(formVal.status);

    const isEdit = !!this.selectedItem.id;

    // Check stock trước khi lưu
    const itemsToCheck = (this.orderItemsArray.controls || [])
      .map(c => ({
        dishId: c.get('dishId')?.value,
        quantity: Number(c.get('quantity')?.value || 1),
      }))
      .filter(x => {
        const initialQty = this.initialDishQuantities.get(x.dishId) || 0;
        return initialQty === 0 || x.quantity > initialQty;
      });

    const proceedSave = () => {
      const request = isEdit
        ? this.orderService.update(this.selectedItem.id!, formVal, { skipHandleError: true })
        : this.orderService.create(formVal, { skipHandleError: true });

      request.subscribe({
        next: (savedOrder) => {
          const msgKey = isEdit ? '::OrderUpdatedSuccessfully' : '::OrderCreatedSuccessfully';
          this.toaster.success(this.localizationService.instant(msgKey, savedOrder.orderNumber || formVal.orderNumber));
          if (formVal.status === OrderStatus.Completed) {
            this.toaster.info(
              this.localizationService.instant('::StockDeductionFefoSuccess'),
              this.localizationService.instant('::StockDeductionTitle')
            );
          }
          this.isModalOpen = false;
          this.form.reset();
          this.list.get();
          this.cdr.markForCheck();
        },
        error: (err) => {
          const errMsg = err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::OrderSaveErrorDefault');
          this.toaster.error(errMsg);
        },
      });
    };

    if (itemsToCheck.length > 0) {
      this.orderService.validateStock({ items: itemsToCheck }, { skipHandleError: true }).subscribe({
        next: stockRes => {
          if (!stockRes.isValid && stockRes.shortages && stockRes.shortages.length > 0) {
            const shortages = stockRes.shortages.map(s => {
              const dishName = s.dishName || this.getDishName(s.dishId);
              return this.localizationService.instant('::StockShortageDishLine', dishName, s.requestedQuantity?.toString() || '1', s.warningMessage || '');
            });
            const alertMsg = this.localizationService.instant('::OrderHasStockShortageAlert', shortages.join('\n'));
            this.confirmation.warn(
              alertMsg,
              this.localizationService.instant('::StockShortageWarningTitle'),
              { hideCancelBtn: true, yesText: '::Close' }
            );
            return;
          }
          proceedSave();
        },
        error: () => proceedSave(),
      });
    } else {
      proceedSave();
    }
  }

  delete(id: string) {
    const orderToDelete = this.data.items?.find(x => x.id === id);
    if (orderToDelete && orderToDelete.status === OrderStatus.Completed) {
      this.toaster.warn(this.localizationService.instant('::OrderCompletedLockedWarning'));
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
