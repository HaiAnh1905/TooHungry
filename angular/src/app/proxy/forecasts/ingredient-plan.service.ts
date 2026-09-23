import type { CreateUpdateIngredientPlanDto, IngredientPlanDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IngredientPlanService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateIngredientPlanDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientPlanDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient-plan',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/ingredient-plan/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientPlanDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient-plan/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<IngredientPlanDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient-plan',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateIngredientPlanDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientPlanDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient-plan/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}