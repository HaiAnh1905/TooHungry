import type { CreateTableReservationDto, GetTableReservationsInput, TableReservationDto, UpdateTableReservationDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TableReservationService {
  private restService = inject(RestService);
  apiName = 'Default';

  create = (input: CreateTableReservationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableReservationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/app/table-reservations',
        body: input,
      },
      { apiName: this.apiName, ...config }
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableReservationDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/table-reservations/${id}`,
      },
      { apiName: this.apiName, ...config }
    );

  getActiveByTableId = (tableId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableReservationDto | null>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/table-reservations/by-table/${tableId}`,
      },
      { apiName: this.apiName, ...config }
    );

  update = (id: string, input: UpdateTableReservationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableReservationDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/app/table-reservations/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config }
    );

  checkIn = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableReservationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/table-reservations/${id}/check-in`,
      },
      { apiName: this.apiName, ...config }
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableReservationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/app/table-reservations/${id}/cancel`,
      },
      { apiName: this.apiName, ...config }
    );

  getList = (input: GetTableReservationsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<TableReservationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/app/table-reservations',
        params: {
          filter: input.filter,
          tableId: input.tableId,
          status: input.status,
          fromDate: input.fromDate,
          toDate: input.toDate,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config }
    );
}
