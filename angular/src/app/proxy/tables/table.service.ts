import type { CreateUpdateTableDto, GetTablesInput, TableDto } from './models';
import type { TableStatus } from './table-status.enum';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  changeStatus = (id: string, status: TableStatus, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/table/${id}/change-status`,
      params: { status },
    },
    { apiName: this.apiName,...config });
  

  create = (input: CreateUpdateTableDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/table',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/table/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/table/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: GetTablesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<TableDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/table',
      params: { filter: input.filter, status: input.status, diningAreaId: input.diningAreaId, sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  setAreaTablesStatus = (diningAreaId: string, status: TableStatus, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      url: `/api/app/table/set-area-tables-status/${diningAreaId}`,
      params: { status },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateTableDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/table/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}