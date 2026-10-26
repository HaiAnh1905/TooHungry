import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@abp/ng.core';
import { TableDto } from '../../../../proxy/tables/models';
import { TableStatus } from '../../../../proxy/tables/table-status.enum';
import { TableStatusPipe } from '../../../pipes/table-status.pipe';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule, CoreModule, TableStatusPipe],
  templateUrl: './table-card.component.html',
  styleUrl: './table-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCardComponent {
  @Input({ required: true }) table!: TableDto;
  @Input() isWaiterMode: boolean = false;
  @Input() currentTimestamp: number = Date.now();

  @Output() seatGuests = new EventEmitter<TableDto>();
  @Output() checkIn = new EventEmitter<TableDto>();
  @Output() cancelReservation = new EventEmitter<TableDto>();
  @Output() openReservation = new EventEmitter<TableDto>();
  @Output() openReservationDetails = new EventEmitter<TableDto>();
  @Output() goToOrder = new EventEmitter<TableDto>();
  @Output() completeMeal = new EventEmitter<TableDto>();
  @Output() openTransfer = new EventEmitter<TableDto>();
  @Output() openMerge = new EventEmitter<TableDto>();
  @Output() finishCleaning = new EventEmitter<TableDto>();
  @Output() disableTable = new EventEmitter<TableDto>();
  @Output() enableTable = new EventEmitter<TableDto>();
  @Output() editTable = new EventEmitter<TableDto>();
  @Output() deleteTable = new EventEmitter<TableDto>();

  readonly TableStatus = TableStatus;

  getMealDuration(occupiedTime?: string | null): string {
    if (!occupiedTime) return '';
    const start = new Date(occupiedTime).getTime();
    if (isNaN(start)) return '';
    const diffMs = Math.max(0, this.currentTimestamp - start);
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  }

  getMealDurationWarningClass(occupiedTime?: string | null): string {
    if (!occupiedTime) return 'duration-normal bg-light text-secondary';
    const start = new Date(occupiedTime).getTime();
    if (isNaN(start)) return 'duration-normal bg-light text-secondary';
    const diffMinutes = Math.floor(Math.max(0, this.currentTimestamp - start) / 60000);
    if (diffMinutes >= 120) return 'duration-critical bg-danger text-white';
    if (diffMinutes >= 90) return 'duration-warning bg-warning text-dark';
    return 'duration-normal bg-light text-secondary';
  }
}
