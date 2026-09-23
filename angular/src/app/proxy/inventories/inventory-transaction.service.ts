import type { CreateInventoryTransactionDto, InventoryTransactionDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InventoryTransactionService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateInventoryTransactionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryTransactionDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory-transaction',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/inventory-transaction/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryTransactionDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory-transaction/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<InventoryTransactionDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory-transaction',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateInventoryTransactionDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryTransactionDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory-transaction/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}