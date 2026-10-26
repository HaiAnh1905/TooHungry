import { Injectable, TemplateRef, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { IInventoryKeeperSidebarService } from '../contracts/inventory-keeper.contracts';
import { StorageConditionType, BatchStatusFilterType } from '../models/inventory-keeper.models';
import { IngredientDto } from '../../proxy/ingredients/models';

@Injectable({
  providedIn: 'root',
})
export class InventoryKeeperSidebarService implements IInventoryKeeperSidebarService {
  private readonly templateSubject = new BehaviorSubject<TemplateRef<any> | null>(null);
  private readonly drawerOpenSubject = new BehaviorSubject<boolean>(false);

  // Signals hỗ trợ lập trình phản ứng hiện đại
  readonly currentTemplate = signal<TemplateRef<any> | null>(null);
  readonly isMobileDrawerOpen = signal<boolean>(false);

  // Modal camera quét mã vạch
  readonly isCameraModalOpen = signal<boolean>(false);

  // Trạng thái bộ lọc danh mục Lô hàng (Batches)
  readonly batchesSearchTerm = signal<string>('');
  readonly batchesCondition = signal<StorageConditionType>(StorageConditionType.All);
  readonly batchesStatus = signal<BatchStatusFilterType>(BatchStatusFilterType.All);

  // Trạng thái bộ lọc nhật ký giao dịch & kiểm kê (Transactions)
  readonly transactionsSearchQuery = signal<string>('');
  readonly transactionsTypeFilter = signal<number | null>(null); // null: Tất cả, 1: Nhập, 2: Xuất, 3: Kiểm kê
  readonly ingredients = signal<IngredientDto[]>([]);
  readonly selectedIngredientId = signal<string>('');
  readonly ingredientSelected$ = new Subject<string>();
  readonly isIngredientDropdownOpen = signal<boolean>(false);
  readonly ingredientSearchText = signal<string>('');

  readonly selectedIngredient = computed(() => {
    const id = this.selectedIngredientId();
    return this.ingredients().find(i => i.id === id) || null;
  });

  readonly filteredIngredients = computed(() => {
    const list = this.ingredients();
    const q = this.ingredientSearchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.code || '').toLowerCase().includes(q)
    );
  });

  /**
   * Đăng ký template nội dung Sidebar từ màn hình con (fallback / tùy biến)
   */
  setTemplate(template: TemplateRef<any> | null): void {
    this.templateSubject.next(template);
    this.currentTemplate.set(template);
  }

  /**
   * Lấy luồng Observable của template đang hiển thị
   */
  getTemplate$(): Observable<TemplateRef<any> | null> {
    return this.templateSubject.asObservable();
  }

  /**
   * Thu hồi template khi rời khỏi màn hình cổng Thủ kho
   */
  clearTemplate(): void {
    this.templateSubject.next(null);
    this.currentTemplate.set(null);
    this.setMobileDrawerOpen(false);
  }

  /**
   * Điều khiển đóng/mở Drawer trên màn hình di động/tablet
   */
  setMobileDrawerOpen(isOpen: boolean): void {
    this.drawerOpenSubject.next(isOpen);
    this.isMobileDrawerOpen.set(isOpen);
  }

  /**
   * Lấy luồng Observable trạng thái mở/đóng drawer
   */
  isMobileDrawerOpen$(): Observable<boolean> {
    return this.drawerOpenSubject.asObservable();
  }

  /**
   * Bật/tắt trạng thái drawer
   */
  toggleMobileDrawer(): void {
    const nextState = !this.drawerOpenSubject.value;
    this.setMobileDrawerOpen(nextState);
  }

  // Phương thức điều khiển modal camera quét barcode
  openCameraModal(): void {
    this.isCameraModalOpen.set(true);
  }

  closeCameraModal(): void {
    this.isCameraModalOpen.set(false);
  }

  // Phương thức điều khiển bộ lọc Batches
  setBatchesSearch(term: string): void {
    this.batchesSearchTerm.set(term);
  }

  clearBatchesSearch(): void {
    this.batchesSearchTerm.set('');
  }

  setBatchesCondition(cond: StorageConditionType): void {
    this.batchesCondition.set(cond);
  }

  setBatchesStatus(status: BatchStatusFilterType): void {
    this.batchesStatus.set(status);
  }

  // Phương thức điều khiển bộ lọc Transactions
  setTransactionsSearch(query: string): void {
    this.transactionsSearchQuery.set(query);
  }

  clearTransactionsSearch(): void {
    this.transactionsSearchQuery.set('');
  }

  setTransactionsTypeFilter(type: number | null): void {
    this.transactionsTypeFilter.set(type);
  }

  setIngredients(items: IngredientDto[]): void {
    this.ingredients.set(items);
  }

  setSelectedIngredientId(id: string): void {
    this.selectedIngredientId.set(id);
    this.ingredientSelected$.next(id);
  }

  toggleIngredientDropdown(): void {
    this.isIngredientDropdownOpen.update(v => !v);
  }

  setIngredientDropdownOpen(isOpen: boolean): void {
    this.isIngredientDropdownOpen.set(isOpen);
  }

  setIngredientSearchText(text: string): void {
    this.ingredientSearchText.set(text);
  }

  clearIngredientSearch(): void {
    this.ingredientSearchText.set('');
  }
}
