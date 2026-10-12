import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CoreModule, LocalizationService } from '@abp/ng.core';
import { ConfirmationService, Confirmation, ThemeSharedModule, ToasterService } from '@abp/ng.theme.shared';
import { Subscription } from 'rxjs';
import { TableService } from '../../proxy/tables/table.service';
import { TableDto } from '../../proxy/tables/models';
import { TableStatus } from '../../proxy/tables/table-status.enum';
import { DishService } from '../../proxy/controllers/dish.service';
import { DishDto } from '../../proxy/dishes/models';
import { DishCategoryService } from '../../proxy/dishes/dish-category.service';
import { DishCategoryDto } from '../../proxy/dishes/models';
import { OrderService } from '../../proxy/orders/order.service';
import {
  OrderDto,
  SubmitOrderItemDto,
  StockShortageItemDto,
} from '../../proxy/orders/models';
import { WaiterSidebarService } from '../services/waiter-sidebar.service';

export interface CartItem {
  dishId: string;
  dishName: string;
  dishPhotoUrl?: string | null;
  unitPrice: number;
  quantity: number;
  note?: string;
}

@Component({
  selector: 'app-waiter-order',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CoreModule,
    ThemeSharedModule,
  ],
  templateUrl: './waiter-order.component.html',
  styleUrl: './waiter-order.component.scss',
})
export class WaiterOrderComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly sidebarService = inject(WaiterSidebarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tableService = inject(TableService);
  private readonly dishService = inject(DishService);
  private readonly dishCategoryService = inject(DishCategoryService);
  private readonly orderService = inject(OrderService);
  private readonly toaster = inject(ToasterService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly localizationService = inject(LocalizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('orderSidebarFilter') orderSidebarFilter!: TemplateRef<any>;

  readonly TableStatus = TableStatus;

  // Route & Table State
  tableId: string = '';
  readonly currentTable = signal<TableDto | null>(null);
  readonly isLoadingTable = signal<boolean>(true);

  // Menu & Category State
  readonly dishes = signal<DishDto[]>([]);
  readonly categories = signal<DishCategoryDto[]>([]);
  readonly isLoadingMenu = signal<boolean>(true);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly searchQuery = signal<string>('');

  // Cart & Order State
  readonly cartItems = signal<CartItem[]>([]);
  activeOrderId: string | null = null;
  orderNote: string = '';
  initialCartSnapshot: string = '[]';
  isSubmitting = false;

  // Drawer & Modal States
  isDrawerOpen = false;
  selectedDishForModal: DishDto | null = null;
  modalItemNote: string = '';

  // Cancel Order Modal State
  isCancelModalOpen = false;
  cancelReason: string = '';

  // Unsaved Changes Confirm Modal
  isUnsavedChangesModalOpen = false;

  private routeSub?: Subscription;

  // Filtered Dishes by Category & Search
  readonly filteredDishes = computed(() => {
    let list = this.dishes();
    const catId = this.selectedCategoryId();
    if (catId) {
      list = list.filter(d => d.dishCategoryId === catId);
    }
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(d => d.name && d.name.toLowerCase().includes(query));
    }
    return list;
  });

  // Cart Computed Totals
  readonly totalCartItemsCount = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly totalCartAmount = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  );

  // Unsaved changes check
  readonly hasUnsavedChanges = computed(() => {
    const current = JSON.stringify(
      this.cartItems().map(x => ({
        id: x.dishId,
        q: x.quantity,
        n: x.note || '',
      }))
    );
    return current !== this.initialCartSnapshot;
  });

  ngOnInit() {
    this.routeSub = this.route.params.subscribe(params => {
      this.tableId = params['tableId'];
      if (this.tableId) {
        this.loadTableData();
        this.loadMenuData();
        this.loadActiveOrder();
      }
    });
  }

  ngAfterViewInit() {
    if (this.orderSidebarFilter) {
      this.sidebarService.registerTemplate(
        this.orderSidebarFilter,
        '::TableInfo',
        this.selectedCategoryId() ? 1 : 0
      );
    }
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    this.sidebarService.clearTemplate();
  }

  // --- DATA LOADING ---

  loadTableData() {
    this.isLoadingTable.set(true);
    this.tableService.get(this.tableId).subscribe({
      next: table => {
        this.currentTable.set(table);
        this.isLoadingTable.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingTable.set(false);
        this.toaster.error(this.localizationService.instant('::TooHungry:Order:TableNotFound'));
        this.router.navigate(['/waiter/tables']);
      },
    });
  }

  loadMenuData() {
    this.isLoadingMenu.set(true);

    // 1. Tải danh mục
    this.dishCategoryService.getList({ maxResultCount: 100, skipCount: 0 }).subscribe({
      next: res => {
        this.categories.set(res.items || []);
        this.cdr.markForCheck();
      },
    });

    // 2. Tải thực đơn món ăn POS
    this.dishService.getMenuForPos().subscribe({
      next: res => {
        this.dishes.set(res.items || []);
        this.isLoadingMenu.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingMenu.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadActiveOrder() {
    this.orderService.getActiveOrderByTableId(this.tableId).subscribe({
      next: activeOrder => {
        if (activeOrder && activeOrder.id) {
          this.activeOrderId = activeOrder.id;
          this.orderNote = activeOrder.note || '';

          if (activeOrder.items && activeOrder.items.length > 0) {
            const items: CartItem[] = activeOrder.items.map(item => ({
              dishId: item.dishId!,
              dishName: item.dishName || 'Món ăn',
              dishPhotoUrl: item.dishPhotoUrl,
              unitPrice: item.unitPrice || 0,
              quantity: item.quantity || 1,
              note: item.note || '',
            }));
            this.cartItems.set(items);
            this.takeSnapshot();
          } else {
            this.cartItems.set([]);
            this.takeSnapshot();
          }
        } else {
          this.activeOrderId = null;
          this.cartItems.set([]);
          this.takeSnapshot();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.activeOrderId = null;
        this.cartItems.set([]);
        this.takeSnapshot();
      },
    });
  }

  private takeSnapshot() {
    this.initialCartSnapshot = JSON.stringify(
      this.cartItems().map(x => ({
        id: x.dishId,
        q: x.quantity,
        n: x.note || '',
      }))
    );
  }

  // --- CATEGORY & SEARCH ---

  selectCategory(categoryId: string | null) {
    this.selectedCategoryId.set(categoryId);
    this.sidebarService.setActiveFilterCount(categoryId ? 1 : 0);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  // --- CART MANAGEMENT ---

  // Thêm nhanh vào giỏ bằng nút [+] trên thẻ món
  quickAddToCart(dish: DishDto, event: MouseEvent) {
    event.stopPropagation();
    this.addDishToCart(dish, 1, '');
  }

  // Mở Food Detail Modal xem chi tiết món
  openFoodModal(dish: DishDto) {
    this.selectedDishForModal = dish;
    this.modalItemNote = '';
    this.cdr.markForCheck();
  }

  closeFoodModal() {
    this.selectedDishForModal = null;
    this.modalItemNote = '';
    this.cdr.markForCheck();
  }

  confirmAddFromModal() {
    if (!this.selectedDishForModal) return;
    this.addDishToCart(this.selectedDishForModal, 1, this.modalItemNote.trim());
    this.closeFoodModal();
  }

  private addDishToCart(dish: DishDto, quantity: number, note: string) {
    const currentList = [...this.cartItems()];
    const existingIndex = currentList.findIndex(x => x.dishId === dish.id);

    if (existingIndex > -1) {
      // Món đã có trong giỏ -> Kiểm tra kho trước khi tăng
      const targetQty = currentList[existingIndex].quantity + quantity;
      this.verifyStockForChange(dish.id!, targetQty, () => {
        currentList[existingIndex] = {
          ...currentList[existingIndex],
          quantity: targetQty,
          note: note ? note : currentList[existingIndex].note,
        };
        this.cartItems.set(currentList);
        this.toaster.success(
          this.localizationService.instant('::QuickAdd') + ': ' + (dish.name || '')
        );
        this.cdr.markForCheck();
      });
    } else {
      // Món mới -> Kiểm tra kho cho 1 phần
      this.verifyStockForChange(dish.id!, quantity, () => {
        currentList.push({
          dishId: dish.id!,
          dishName: dish.name || 'Món ăn',
          dishPhotoUrl: dish.imageUrl,
          unitPrice: dish.price || 0,
          quantity: quantity,
          note: note,
        });
        this.cartItems.set(currentList);
        this.toaster.success(
          this.localizationService.instant('::QuickAdd') + ': ' + (dish.name || '')
        );
        this.cdr.markForCheck();
      });
    }
  }

  // Tăng số lượng món trong Order Drawer
  increaseQuantity(item: CartItem) {
    const targetQty = item.quantity + 1;
    this.verifyStockForChange(item.dishId, targetQty, () => {
      this.cartItems.update(list =>
        list.map(x => (x.dishId === item.dishId ? { ...x, quantity: targetQty } : x))
      );
      this.cdr.markForCheck();
    });
  }

  // Giảm số lượng món
  decreaseQuantity(item: CartItem) {
    if (item.quantity > 1) {
      this.cartItems.update(list =>
        list.map(x => (x.dishId === item.dishId ? { ...x, quantity: x.quantity - 1 } : x))
      );
    } else {
      this.removeItem(item);
    }
    this.cdr.markForCheck();
  }

  // Xóa món khỏi giỏ
  removeItem(item: CartItem) {
    this.cartItems.update(list => list.filter(x => x.dishId !== item.dishId));
    this.cdr.markForCheck();
  }

  // Cập nhật ghi chú trực tiếp trong Order Drawer
  updateItemNote(item: CartItem, event: Event) {
    const input = event.target as HTMLInputElement;
    const noteVal = input.value;
    this.cartItems.update(list =>
      list.map(x => (x.dishId === item.dishId ? { ...x, note: noteVal } : x))
    );
  }

  // --- INSTANT STOCK VALIDATION ---

  private verifyStockForChange(dishId: string, newQuantity: number, onSuccess: () => void) {
    // Tạo danh sách mô phỏng giỏ hàng sau khi thay đổi
    const itemsPayload: SubmitOrderItemDto[] = this.cartItems()
      .map(x => ({
        dishId: x.dishId,
        quantity: x.dishId === dishId ? newQuantity : x.quantity,
        unitPrice: x.unitPrice,
        note: x.note,
      }));

    if (!itemsPayload.some(x => x.dishId === dishId)) {
      itemsPayload.push({
        dishId: dishId,
        quantity: newQuantity,
        unitPrice: 0,
      });
    }

    this.orderService.validateStock({ items: itemsPayload }, { skipHandleError: true }).subscribe({
      next: result => {
        if (result.isValid) {
          onSuccess();
        } else {
          this.displayStockShortageAlert(result.shortages);
        }
      },
      error: err => {
        // Trong trường hợp lỗi mạng hoặc server, cảnh báo lỗi
        this.toaster.error(err.error?.error?.message || err.message || 'Lỗi kiểm tra kho!');
      },
    });
  }

  private displayStockShortageAlert(shortages: StockShortageItemDto[]) {
    if (!shortages || shortages.length === 0) return;
    const first = shortages[0];
    const message = this.localizationService.instant(
      '::StockShortageWarning',
      first.dishName || ''
    ) + ` (${first.ingredientName}: cần ${first.requiredQuantity} ${first.unitName}, còn ${first.availableQuantity} ${first.unitName})`;
    this.toaster.warn(message);
  }

  // --- DRAWER TOGGLE ---

  openDrawer() {
    this.isDrawerOpen = true;
    this.cdr.markForCheck();
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.cdr.markForCheck();
  }

  // --- SUBMIT ORDER (CREATE OR UPDATE) ---

  submitOrder() {
    if (this.cartItems().length === 0) {
      this.toaster.warn(this.localizationService.instant('::EmptyCartWarning'));
      return;
    }

    this.isSubmitting = true;
    const payload = {
      orderId: this.activeOrderId,
      tableId: this.tableId,
      note: this.orderNote,
      items: this.cartItems().map(x => ({
        dishId: x.dishId,
        quantity: x.quantity,
        unitPrice: x.unitPrice,
        note: x.note,
      })),
    };

    this.orderService.submitOrder(payload, { skipHandleError: true }).subscribe({
      next: order => {
        const isExistingOrder = !!this.activeOrderId;
        this.isSubmitting = false;
        this.activeOrderId = order.id || null;
        this.takeSnapshot();
        const successMsg = isExistingOrder
          ? this.localizationService.instant('::UpdateOrderSuccess')
          : this.localizationService.instant('::SubmitOrderSuccess');
        this.toaster.success(successMsg);
        this.closeDrawer();
        this.router.navigate(['/waiter/tables']);
      },
      error: err => {
        this.isSubmitting = false;
        const msg = err.error?.error?.message || err.message || 'Lỗi gửi đơn!';
        this.toaster.error(msg);
        this.cdr.markForCheck();
      },
    });
  }

  // --- CANCEL ORDER ---

  openCancelModal() {
    this.cancelReason = '';
    this.isCancelModalOpen = true;
    this.cdr.markForCheck();
  }

  closeCancelModal() {
    this.isCancelModalOpen = false;
    this.cancelReason = '';
    this.cdr.markForCheck();
  }

  confirmCancelOrder() {
    if (!this.activeOrderId) return;
    this.orderService
      .cancelOrder(this.activeOrderId, { reason: this.cancelReason.trim() }, { skipHandleError: true })
      .subscribe({
        next: () => {
          this.closeCancelModal();
          this.closeDrawer();
          this.toaster.success(this.localizationService.instant('::CancelOrderSuccess'));
          this.router.navigate(['/waiter/tables']);
        },
        error: err => {
          this.toaster.error(err.error?.error?.message || err.message || 'Lỗi hủy đơn!');
        },
      });
  }

  // --- NAVIGATION & UNSAVED CHANGES ---

  goBack() {
    if (this.hasUnsavedChanges()) {
      this.isUnsavedChangesModalOpen = true;
      this.cdr.markForCheck();
    } else {
      this.router.navigate(['/waiter/tables']);
    }
  }

  confirmLeaveWithoutSaving() {
    this.isUnsavedChangesModalOpen = false;
    this.router.navigate(['/waiter/tables']);
  }

  closeUnsavedChangesModal() {
    this.isUnsavedChangesModalOpen = false;
    this.cdr.markForCheck();
  }
}
