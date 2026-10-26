import { Injectable, inject, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { InventoryService } from '../../proxy/inventories/inventory.service';
import { InventoryAlertDto, InventoryBatchDto } from '../../proxy/inventories/models';
import { InventoryKeeperKpiSummary } from '../models/inventory-keeper.models';
import { IInventoryAlertStateService } from '../contracts/inventory-keeper.contracts';

@Injectable({
  providedIn: 'root',
})
export class InventoryAlertStateService implements IInventoryAlertStateService {
  private readonly inventoryService = inject(InventoryService);

  // Signals quản lý trạng thái
  readonly alerts = signal<InventoryAlertDto[]>([]);
  readonly batches = signal<InventoryBatchDto[]>([]);
  readonly kpiSummary = signal<InventoryKeeperKpiSummary>({
    expiringSoonCount: 0,
    lowStockCount: 0,
    expiredCount: 0,
    totalActiveBatchesCount: 0,
    lastUpdated: new Date(),
  });
  readonly isLoading = signal<boolean>(false);

  // Subject phát tín hiệu làm mới dữ liệu cho toàn phân hệ
  readonly refreshed$ = new Subject<void>();

  private lastRefreshTime = 0;
  private readonly DEBOUNCE_MS = 1000;
  private inFlightPromise: Promise<void> | null = null;

  /**
   * Tải lại toàn bộ cảnh báo kho và số liệu KPI
   */
  async refreshAlerts(): Promise<void> {
    const now = Date.now();
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }
    if (now - this.lastRefreshTime < this.DEBOUNCE_MS) {
      return;
    }

    this.lastRefreshTime = now;
    this.inFlightPromise = this.executeFetch();
    try {
      await this.inFlightPromise;
    } finally {
      this.inFlightPromise = null;
    }
  }

  private async executeFetch(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Gọi đồng thời lấy alerts và danh sách batches
      const [alertsRes, batchesRes] = await Promise.all([
        firstValueFrom(this.inventoryService.getAlerts()).catch(() => [] as InventoryAlertDto[]),
        firstValueFrom(
          this.inventoryService.getBatches({ maxResultCount: 1000, onlyAvailable: true })
        ).catch(() => ({ items: [] as InventoryBatchDto[], totalCount: 0 })),
      ]);

      const alertsList = alertsRes || [];
      const batchItems = batchesRes?.items || [];

      this.alerts.set(alertsList);
      this.batches.set(batchItems);

      // Phân tích các chỉ số KPI
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let expiringSoon = 0;
      let expired = 0;
      let activeBatches = 0;

      for (const b of batchItems) {
        if (!b.isCleared && b.isActive !== false) {
          activeBatches++;
        }

        if (b.expiryDate && !b.isCleared) {
          const exp = new Date(b.expiryDate);
          exp.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            expired++;
          } else if (diffDays <= 7) {
            expiringSoon++;
          }
        }
      }

      // Đếm số cảnh báo thiếu tồn từ danh sách alerts
      const lowStockAlerts = alertsList.filter(
        a =>
          a.alertType?.toUpperCase().includes('LOW') ||
          a.alertType?.toUpperCase().includes('OUT') ||
          a.type?.toUpperCase().includes('LOW') ||
          a.type?.toUpperCase().includes('OUT')
      );
      const lowStockCount = lowStockAlerts.length;

      // Nếu backend có alerts chi tiết về hạn dùng, đối chiếu để không bỏ sót
      const alertExpiredCount = alertsList.filter(
        a =>
          a.alertType?.toUpperCase().includes('EXPIRED') ||
          a.type?.toUpperCase().includes('EXPIRED')
      ).length;
      const finalExpired = Math.max(expired, alertExpiredCount);

      const alertExpiringSoonCount = alertsList.filter(
        a =>
          a.alertType?.toUpperCase().includes('NEAR') ||
          a.alertType?.toUpperCase().includes('EXPIRING') ||
          a.type?.toUpperCase().includes('NEAR') ||
          a.type?.toUpperCase().includes('EXPIRING')
      ).length;
      const finalExpiringSoon = Math.max(expiringSoon, alertExpiringSoonCount);

      this.kpiSummary.set({
        expiringSoonCount: finalExpiringSoon,
        lowStockCount: lowStockCount,
        expiredCount: finalExpired,
        totalActiveBatchesCount: activeBatches,
        lastUpdated: new Date(),
      });

      this.refreshed$.next();
    } catch {
      // Ignore or handle silently
    } finally {
      this.isLoading.set(false);
    }
  }
}
