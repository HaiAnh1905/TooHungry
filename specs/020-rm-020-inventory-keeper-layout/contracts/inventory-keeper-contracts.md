# Hợp đồng Giao tiếp & Kỹ thuật (Technical Contracts): RM-020 Phân hệ & Bố cục Thủ kho

**Tính năng**: `RM-020 — Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)`  
**Nhánh**: `020-rm-020-inventory-keeper-layout` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Hợp đồng Định tuyến (Angular Router Contract)

Được cấu hình trong `app.routes.ts`:

```typescript
import { authGuard, eLayoutType } from '@abp/ng.core';
import { smartPermissionGuard } from './shared/guards/smart-permission.guard';
import { inventoryKeeperAuthGuard } from './inventory-keeper/guards/inventory-keeper-auth.guard';
import { Routes } from '@angular/router';

export const INVENTORY_KEEPER_ROUTES: Routes = [
  {
    path: 'inventory-keeper',
    loadComponent: () =>
      import('./inventory-keeper/layout/inventory-keeper-layout.component').then(
        c => c.InventoryKeeperLayoutComponent
      ),
    canActivate: [authGuard, inventoryKeeperAuthGuard],
    data: { layout: eLayoutType.empty },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./inventory-keeper/dashboard/inventory-keeper-dashboard.component').then(
            c => c.InventoryKeeperDashboardComponent
          ),
        canActivate: [smartPermissionGuard],
        data: { requiredPolicy: 'TooHungry.Inventories', layout: eLayoutType.empty },
      },
      {
        path: 'batches',
        loadComponent: () =>
          import('./inventory-keeper/batches/inventory-keeper-batches.component').then(
            c => c.InventoryKeeperBatchesComponent
          ),
        canActivate: [smartPermissionGuard],
        data: { requiredPolicy: 'TooHungry.Inventories', layout: eLayoutType.empty },
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./inventory-keeper/transactions/inventory-keeper-transactions.component').then(
            c => c.InventoryKeeperTransactionsComponent
          ),
        canActivate: [smartPermissionGuard],
        data: { requiredPolicy: 'TooHungry.Inventories', layout: eLayoutType.empty },
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: 'keeper',
    redirectTo: 'inventory-keeper',
    pathMatch: 'full',
  },
];
```

---

## 2. Hợp đồng Bộ Gác cổng Phân quyền (`inventoryKeeperAuthGuard`)

```typescript
import { CanActivateFn } from '@angular/router';

/**
 * Gác cổng bảo vệ toàn bộ cụm tuyến đường /inventory-keeper/*
 * - Kiểm tra xác thực (authGuard)
 * - Kiểm tra vai trò: Phải có ít nhất 1 trong các vai trò ['InventoryStaff', 'Manager', 'Administrator', 'admin']
 * - Kiểm tra quyền: Phải sở hữu quyền 'TooHungry.Inventories'
 * - Nếu không hợp lệ: Chuyển hướng sang '/error/403' Bento Card RM-019
 */
export const inventoryKeeperAuthGuard: CanActivateFn = (route, state) => {
  // Logic kiểm tra và chuyển hướng
};
```

---

## 3. Hợp đồng Dịch vụ Quản lý Sidebar (`IInventoryKeeperSidebarService`)

```typescript
import { TemplateRef } from '@angular/core';
import { Observable } from 'rxjs';

export interface IInventoryKeeperSidebarService {
  /**
   * Đăng ký template nội dung Sidebar từ màn hình con
   */
  setTemplate(template: TemplateRef<any> | null): void;

  /**
   * Lấy luồng Observable của template đang hiển thị
   */
  getTemplate$(): Observable<TemplateRef<any> | null>;

  /**
   * Thu hồi template khi rời khỏi màn hình con
   */
  clearTemplate(): void;

  /**
   * Điều khiển đóng/mở Drawer trên màn hình di động/tablet
   */
  setMobileDrawerOpen(isOpen: boolean): void;
  isMobileDrawerOpen$(): Observable<boolean>;
}
```

---

## 4. Hợp đồng Dịch vụ Quét Mã vạch (`IBarcodeScannerService`)

```typescript
import { Observable } from 'rxjs';
import { BarcodeScanEvent } from '../models/inventory-keeper.models';

export interface IBarcodeScannerService {
  /**
   * Luồng sự kiện phát ra mỗi khi có mã vạch được quét thành công từ súng quét HID hoặc Camera
   */
  readonly scanned$: Observable<BarcodeScanEvent>;

  /**
   * Kích hoạt chế độ lắng nghe bàn phím toàn cục (HID Barcode Scanner)
   */
  startHidListener(): void;

  /**
   * Hủy lắng nghe bàn phím toàn cục
   */
  stopHidListener(): void;

  /**
   * Gửi kết quả quét từ Camera modal vào luồng xử lý
   */
  emitScanResult(code: string, source: 'HID' | 'CAMERA'): void;
}
```

---

## 5. Hợp đồng Dịch vụ Cảnh báo Kho (`IInventoryAlertStateService`)

```typescript
import { Signal } from '@angular/core';
import { InventoryAlertDto } from '@proxy/inventories';
import { InventoryKeeperKpiSummary } from '../models/inventory-keeper.models';

export interface IInventoryAlertStateService {
  /**
   * Signal chứa danh sách các cảnh báo kho
   */
  readonly alerts: Signal<InventoryAlertDto[]>;

  /**
   * Signal tính toán tổng hợp chỉ số KPI Topbar
   */
  readonly kpiSummary: Signal<InventoryKeeperKpiSummary>;

  /**
   * Signal trạng thái đang tải
   */
  readonly isLoading: Signal<boolean>;

  /**
   * Tải lại toàn bộ cảnh báo kho từ backend
   */
  refreshAlerts(): Promise<void>;
}
```

---

## 6. Hợp đồng API Backend Tái sử dụng (Reused API Endpoints)

Phân hệ Thủ kho tái sử dụng 100% các REST endpoints sẵn có của ABP Framework:

| HTTP Method | Endpoint | DTO Yêu cầu | DTO Phản hồi | Mục đích |
|---|---|---|---|---|
| `GET` | `/api/app/inventory/batches` | `GetInventoryBatchesInput` | `PagedResultDto<InventoryBatchDto>` | Tải danh sách lô hàng phân trang, lọc theo trạng thái |
| `POST` | `/api/app/inventory/batch` | `CreateInventoryBatchDto` | `InventoryBatchDto` | Nhập lô hàng mới vào kho |
| `POST` | `/api/app/inventory/batch/{id}/deactivate` | `DeactivateBatchDto` | `InventoryBatchDto` | Khóa tạm ngưng lô hàng (RM-013) |
| `POST` | `/api/app/inventory/batch/{id}/reactivate` | `Guid` | `InventoryBatchDto` | Kích hoạt mở khóa lại lô hàng (RM-013) |
| `POST` | `/api/app/inventory/discard` | `DiscardBatchDto` | `InventoryBatchDto` | Xuất hủy lô hàng quá hạn / hư hỏng |
| `POST` | `/api/app/inventory/adjust` | `StockAdjustmentDto` | `void` | Kiểm kê điều chỉnh cân đối tồn kho (RM-011) |
| `GET` | `/api/app/inventory/alerts` | (None) | `List<InventoryAlertDto>` | Lấy danh sách cảnh báo tồn an toàn & hạn dùng |
| `GET` | `/api/app/inventory/transactions` | `Guid ingredientId` | `List<InventoryTransactionDto>` | Lấy nhật ký biến động giao dịch kho |
