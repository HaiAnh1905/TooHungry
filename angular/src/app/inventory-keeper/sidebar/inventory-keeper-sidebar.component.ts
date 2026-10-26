import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoreModule } from '@abp/ng.core';
import { ThemeSharedModule } from '@abp/ng.theme.shared';
import { InventoryKeeperSidebarService } from '../services/inventory-keeper-sidebar.service';
import { InventoryAlertStateService } from '../services/inventory-alert-state.service';
import {
  StorageConditionType,
  BatchStatusFilterType,
  InventoryKeeperUserInfo,
} from '../models/inventory-keeper.models';
import { IngredientDto } from '../../proxy/ingredients/models';

@Component({
  selector: 'app-inventory-keeper-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, CoreModule, ThemeSharedModule],
  templateUrl: './inventory-keeper-sidebar.component.html',
})
export class InventoryKeeperSidebarComponent {
  readonly sidebarService = inject(InventoryKeeperSidebarService);
  readonly alertStateService = inject(InventoryAlertStateService);
  readonly router = inject(Router);

  @Input() activeTab: string = 'dashboard';
  @Input() userInfo?: InventoryKeeperUserInfo;

  @ViewChild('dashboardSearchInput') dashboardSearchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('batchesSearchInput') batchesSearchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('transactionsSearchInput') transactionsSearchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('ingredientSearchInput') ingredientSearchInputRef?: ElementRef<HTMLInputElement>;

  readonly StorageConditionType = StorageConditionType;
  readonly BatchStatusFilterType = BatchStatusFilterType;

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.sidebarService.setMobileDrawerOpen(true);
      setTimeout(() => {
        if (this.activeTab === 'dashboard') {
          this.dashboardSearchInputRef?.nativeElement?.focus();
          this.dashboardSearchInputRef?.nativeElement?.select();
        } else if (this.activeTab === 'batches') {
          this.batchesSearchInputRef?.nativeElement?.focus();
          this.batchesSearchInputRef?.nativeElement?.select();
        } else if (this.activeTab === 'transactions') {
          this.transactionsSearchInputRef?.nativeElement?.focus();
          this.transactionsSearchInputRef?.nativeElement?.select();
        }
      }, 100);
    }
  }

  // Dashboard actions
  openCameraModal(): void {
    this.sidebarService.openCameraModal();
  }

  onDashboardSearchInput(val: string): void {
    this.sidebarService.setBatchesSearch(val);
    if (val.trim()) {
      this.router.navigate(['/inventory-keeper/batches'], {
        queryParams: { search: val.trim() },
      });
    }
  }

  goToBatchesWithFilter(filterType: string): void {
    const status = filterType === 'All' ? BatchStatusFilterType.All : (filterType as BatchStatusFilterType);
    this.sidebarService.setBatchesStatus(status);
    this.router.navigate(['/inventory-keeper/batches'], {
      queryParams: filterType === 'All' ? {} : { status: filterType },
    });
    this.sidebarService.setMobileDrawerOpen(false);
  }

  // Batches actions
  onBatchesSearchInput(val: string): void {
    this.sidebarService.setBatchesSearch(val);
  }

  clearBatchesSearch(): void {
    this.sidebarService.clearBatchesSearch();
  }

  setCondition(cond: StorageConditionType): void {
    this.sidebarService.setBatchesCondition(cond);
  }

  setStatus(status: BatchStatusFilterType): void {
    this.sidebarService.setBatchesStatus(status);
    this.router.navigate(['/inventory-keeper/batches'], {
      queryParams: { status: status === BatchStatusFilterType.All ? null : status },
      queryParamsHandling: 'merge',
    });
  }

  // Transactions actions
  onTransactionsSearchInput(val: string): void {
    this.sidebarService.setTransactionsSearch(val);
  }

  clearTransactionsSearch(): void {
    this.sidebarService.clearTransactionsSearch();
  }

  toggleIngredientDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.sidebarService.toggleIngredientDropdown();
    if (this.sidebarService.isIngredientDropdownOpen()) {
      setTimeout(() => {
        this.ingredientSearchInputRef?.nativeElement?.focus();
      }, 100);
    }
  }

  selectIngredient(ingredient: IngredientDto, event: MouseEvent): void {
    event.stopPropagation();
    this.sidebarService.setSelectedIngredientId(ingredient.id);
    this.sidebarService.setIngredientDropdownOpen(false);
    this.sidebarService.clearIngredientSearch();
  }

  onIngredientSearchInput(text: string): void {
    this.sidebarService.setIngredientSearchText(text);
  }

  clearIngredientSearch(event: MouseEvent): void {
    event.stopPropagation();
    this.sidebarService.clearIngredientSearch();
    this.ingredientSearchInputRef?.nativeElement?.focus();
  }

  setTypeFilter(type: number | null): void {
    this.sidebarService.setTransactionsTypeFilter(type);
  }
}
