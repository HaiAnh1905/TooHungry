import type { CreateUpdateIngredientDto, IngredientDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IngredientService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateIngredientDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/ingredient/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<IngredientDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateIngredientDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}