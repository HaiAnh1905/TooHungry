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

  getList = (inputOrIncludeInactive: GetIngredientsInput | boolean = {}, config?: Partial<Rest.Config>) => {
    let params: any = {};
    if (typeof inputOrIncludeInactive === 'boolean') {
      params = { includeInactive: inputOrIncludeInactive, maxResultCount: 1000 };
    } else {
      params = {
        filter: inputOrIncludeInactive.filter,
        storageType: inputOrIncludeInactive.storageType,
        consumptionMethod: inputOrIncludeInactive.consumptionMethod,
        isActive: inputOrIncludeInactive.isActive,
        skipCount: inputOrIncludeInactive.skipCount,
        maxResultCount: inputOrIncludeInactive.maxResultCount,
        sorting: inputOrIncludeInactive.sorting,
      };
    }

    return this.restService.request<any, PagedResultDto<IngredientDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient',
      params,
    },
    { apiName: this.apiName, ...config });
  };

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
