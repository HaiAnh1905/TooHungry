import { TemplateRef, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryAlertDto } from '../../proxy/inventories/models';
import { BarcodeScanEvent, InventoryKeeperKpiSummary } from '../models/inventory-keeper.models';

export interface IInventoryKeeperSidebarService {
  setTemplate(template: TemplateRef<any> | null): void;
  getTemplate$(): Observable<TemplateRef<any> | null>;
  clearTemplate(): void;
  setMobileDrawerOpen(isOpen: boolean): void;
  isMobileDrawerOpen$(): Observable<boolean>;
  toggleMobileDrawer(): void;
}

export interface IBarcodeScannerService {
  readonly scanned$: Observable<BarcodeScanEvent>;
  startHidListener(): void;
  stopHidListener(): void;
  emitScanResult(code: string, source: 'HID' | 'CAMERA'): void;
}

export interface IInventoryAlertStateService {
  readonly alerts: Signal<InventoryAlertDto[]>;
  readonly kpiSummary: Signal<InventoryKeeperKpiSummary>;
  readonly isLoading: Signal<boolean>;
  refreshAlerts(): Promise<void>;
}
