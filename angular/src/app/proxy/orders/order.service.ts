import type { CancelOrderInputDto, CreateUpdateOrderDto, OrderDto, StockValidationResultDto, SubmitOrderInputDto, ValidateOrderStockInputDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  completeActiveOrderByTableId = (tableId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      url: `/api/app/order/complete-active-order-by-table-id/${tableId}`,
    },
    { apiName: this.apiName,...config });
  

  create = (input: CreateUpdateOrderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/order',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/order/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/order/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getActiveOrderByTableId = (tableId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/order/active-order-by-table-id/${tableId}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<OrderDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/order',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateOrderDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/order/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });

  validateStock = (input: ValidateOrderStockInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, StockValidationResultDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/order/validate-stock',
      body: input,
    },
    { apiName: this.apiName,...config });

  submitOrder = (input: SubmitOrderInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/order/submit-order',
      body: input,
    },
    { apiName: this.apiName,...config });

  cancelOrder = (id: string, input?: CancelOrderInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/order/${id}/cancel`,
      body: input,
    },
    { apiName: this.apiName,...config });
}