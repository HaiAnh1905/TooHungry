import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { ReservationStatus } from './reservation-status.enum';

export interface CreateTableReservationDto {
  tableId: string;
  customerName: string;
  customerPhone: string;
  reservationTime: string;
  guestCount: number;
  note?: string | null;
}

export interface UpdateTableReservationDto {
  customerName: string;
  customerPhone: string;
  reservationTime: string;
  guestCount: number;
  note?: string | null;
}

export interface TableReservationDto extends FullAuditedEntityDto<string> {
  tableId: string;
  tableName?: string | null;
  customerName: string;
  customerPhone: string;
  reservationTime: string;
  guestCount: number;
  note?: string | null;
  status: ReservationStatus;
}

export interface GetTableReservationsInput extends PagedAndSortedResultRequestDto {
  filter?: string | null;
  tableId?: string | null;
  status?: ReservationStatus | null;
  fromDate?: string | null;
  toDate?: string | null;
}
