import type { CreateUpdateInventoryBatchDto, InventoryBatchDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class InventoryBatchService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateInventoryBatchDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryBatchDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory-batch',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/inventory-batch/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryBatchDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory-batch/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<InventoryBatchDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory-batch',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateInventoryBatchDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryBatchDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory-batch/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}