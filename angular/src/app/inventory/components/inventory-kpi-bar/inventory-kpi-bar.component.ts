import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@abp/ng.core';
import { DashboardInventoryKpiSummary } from '../../models/inventory-dashboard.models';

export type KpiFilterType = 'all' | 'safe' | 'lowStock' | 'expired';

@Component({
  selector: 'app-inventory-kpi-bar',
  standalone: true,
  imports: [CommonModule, CoreModule],
  templateUrl: './inventory-kpi-bar.component.html',
  styleUrls: ['./inventory-kpi-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryKpiBarComponent {
  @Input({ required: true }) kpiSummary!: DashboardInventoryKpiSummary;
  @Input() activeFilter: KpiFilterType = 'all';

  @Output() readonly selectKpi = new EventEmitter<KpiFilterType>();

  onSelect(filter: KpiFilterType): void {
    this.selectKpi.emit(filter);
  }
}
