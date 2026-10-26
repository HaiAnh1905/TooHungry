import { RestService, Rest, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  CreateIngredientDto,
  DeactivateInput,
  GetIngredientsInput,
  IngredientDto,
  SmartRestoreDto,
  UpdateIngredientDto,
} from './models';

@Injectable({
  providedIn: 'root',
})
export class IngredientService {
  private restService = inject(RestService);
  apiName = 'Default';

  create = (input: CreateIngredientDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient',
      body: input,
    },
    { apiName: this.apiName, ...config });

  update = (id: string, input: UpdateIngredientDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient/${id}`,
      body: input,
    },
    { apiName: this.apiName, ...config });

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient/${id}`,
    },
    { apiName: this.apiName, ...config });

  getList = (input: GetIngredientsInput = {}, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<IngredientDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient',
      params: {
        filter: input.filter,
        storageType: input.storageType,
        consumptionMethod: input.consumptionMethod,
        isActive: input.isActive,
        skipCount: input.skipCount,
        maxResultCount: input.maxResultCount,
        sorting: input.sorting,
      },
    },
    { apiName: this.apiName, ...config });

  deactivate = (id: string, input: DeactivateInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient/${id}/deactivate`,
      body: input,
    },
    { apiName: this.apiName, ...config });

  reactivate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient/${id}/reactivate`,
    },
    { apiName: this.apiName, ...config });

  smartRestore = (id: string, input: SmartRestoreDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient/${id}/smart-restore`,
      body: input,
    },
    { apiName: this.apiName, ...config });

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/ingredient/${id}`,
    },
    { apiName: this.apiName, ...config });
}
