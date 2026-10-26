import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@abp/ng.core';
import { ReplenishmentSuggestionItem } from '../../models/inventory-dashboard.models';

@Component({
  selector: 'app-replenishment-insights-widget',
  standalone: true,
  imports: [CommonModule, CoreModule],
  templateUrl: './replenishment-insights-widget.component.html',
  styleUrls: ['./replenishment-insights-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplenishmentInsightsWidgetComponent {
  @Input({ required: true }) suggestions: ReplenishmentSuggestionItem[] = [];
  @Input() isLoading: boolean = false;

  @Output() readonly quickInbound = new EventEmitter<ReplenishmentSuggestionItem>();

  onQuickInbound(item: ReplenishmentSuggestionItem): void {
    this.quickInbound.emit(item);
  }
}
