import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { OrderDto } from '../orders/models';

@Injectable({
  providedIn: 'root',
})
export class TableOrderService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  completeActiveOrderByTableId = (tableId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      url: `/api/app/table-orders/complete/${tableId}`,
    },
    { apiName: this.apiName,...config });
  

  getActiveOrderByTableId = (tableId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OrderDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/table-orders/active/${tableId}`,
    },
    { apiName: this.apiName,...config });
}