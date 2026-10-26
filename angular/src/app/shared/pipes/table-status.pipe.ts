import { Pipe, PipeTransform } from '@angular/core';
import { TableStatus } from '../../proxy/tables/table-status.enum';

export type TableStatusInfoType = 'label' | 'badgeClass' | 'cardClass' | 'icon';

export interface TableStatusMeta {
  label: string;
  badgeClass: string;
  cardClass: string;
  icon: string;
}

export const TABLE_STATUS_META_MAP: Record<number, TableStatusMeta> = {
  [TableStatus.Available]: {
    label: '::TableStatusAvailable',
    badgeClass: 'badge-available',
    cardClass: 'table-available status-available',
    icon: 'fa-circle-check',
  },
  [TableStatus.Occupied]: {
    label: '::TableStatusOccupied',
    badgeClass: 'badge-occupied',
    cardClass: 'table-occupied status-occupied',
    icon: 'fa-utensils',
  },
  [TableStatus.Reserved]: {
    label: '::TableStatusReserved',
    badgeClass: 'badge-reserved',
    cardClass: 'table-reserved status-reserved',
    icon: 'fa-calendar-check',
  },
  [TableStatus.Cleaning]: {
    label: '::TableStatusCleaning',
    badgeClass: 'badge-cleaning',
    cardClass: 'table-cleaning status-cleaning',
    icon: 'fa-broom',
  },
  [TableStatus.Disabled]: {
    label: '::TableStatusDisabled',
    badgeClass: 'badge-disabled',
    cardClass: 'table-disabled status-disabled',
    icon: 'fa-ban',
  },
};

@Pipe({
  name: 'tableStatus',
  standalone: true,
})
export class TableStatusPipe implements PipeTransform {
  transform(status: TableStatus | number | null | undefined, type: TableStatusInfoType = 'label'): string {
    const s = Number(status ?? TableStatus.Available);
    const meta = TABLE_STATUS_META_MAP[s] || TABLE_STATUS_META_MAP[TableStatus.Available];
    return meta[type] || meta.label;
  }
}
