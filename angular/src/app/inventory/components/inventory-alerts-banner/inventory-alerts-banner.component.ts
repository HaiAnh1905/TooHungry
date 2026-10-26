import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@abp/ng.core';
import { InventoryAlertDto } from '../../../proxy/inventories/models';

@Component({
  selector: 'app-inventory-alerts-banner',
  standalone: true,
  imports: [CommonModule, CoreModule],
  templateUrl: './inventory-alerts-banner.component.html',
  styleUrls: ['./inventory-alerts-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryAlertsBannerComponent {
  @Input({ required: true }) alerts: InventoryAlertDto[] = [];
  @Input() isExpanded: boolean = false;
  @Input() isDismissed: boolean = false;

  @Output() readonly toggleExpand = new EventEmitter<void>();
  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly selectAlert = new EventEmitter<InventoryAlertDto>();
  @Output() readonly discardAlert = new EventEmitter<InventoryAlertDto>();

  get topAlert(): InventoryAlertDto | null {
    return this.alerts && this.alerts.length > 0 ? this.alerts[0] : null;
  }

  onToggle(): void {
    this.toggleExpand.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  onSelect(alert: InventoryAlertDto): void {
    this.selectAlert.emit(alert);
  }

  onDiscard(event: MouseEvent, alert: InventoryAlertDto): void {
    event.stopPropagation();
    this.discardAlert.emit(alert);
  }
}
