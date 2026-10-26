import { RestService, Rest, PagedResultDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  CreateInventoryBatchDto,
  DeactivateBatchDto,
  DiscardBatchInputDto,
  GetInventoryBatchesInput,
  InventoryAlertDto,
  InventoryBatchDto,
  InventoryTransactionDto,
  StockAdjustmentRequestDto,
} from './models';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private restService = inject(RestService);
  apiName = 'Default';

  createBatch = (input: CreateInventoryBatchDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryBatchDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory/batches',
      body: input,
    },
    { apiName: this.apiName, ...config });

  getBatches = (inputOrIngredientId?: string | GetInventoryBatchesInput, config?: Partial<Rest.Config>) => {
    let params: any = {};
    if (typeof inputOrIngredientId === 'string') {
      params = { ingredientId: inputOrIngredientId };
    } else if (inputOrIngredientId) {
      params = { ...inputOrIngredientId };
    }
    return this.restService.request<any, PagedResultDto<InventoryBatchDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory/batches',
      params,
    },
    { apiName: this.apiName, ...config });
  };

  getTransactions = (ingredientId: string, input?: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<InventoryTransactionDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory/transactions/${ingredientId}`,
      params: {
        skipCount: input?.skipCount,
        maxResultCount: input?.maxResultCount,
        sorting: input?.sorting,
      },
    },
    { apiName: this.apiName, ...config });

  discardBatch = (id: string, input: DiscardBatchInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory/batches/${id}/discard`,
      body: input,
    },
    { apiName: this.apiName, ...config });

  bulkDiscardBatches = (input: { batchIds: string[]; reason: string }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory/batches/bulk-discard',
      body: input,
    },
    { apiName: this.apiName, ...config });

  deactivateBatch = (id: string, input: DeactivateBatchDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryBatchDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory/batches/${id}/deactivate`,
      body: input,
    },
    { apiName: this.apiName, ...config });

  reactivateBatch = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryBatchDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/inventory/batches/${id}/reactivate`,
    },
    { apiName: this.apiName, ...config });

  adjustStock = (input: StockAdjustmentRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory/stock-adjustment',
      body: input,
    },
    { apiName: this.apiName, ...config });

  getAlerts = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, InventoryAlertDto[]>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/inventory/alerts',
    },
    { apiName: this.apiName, ...config });
}
