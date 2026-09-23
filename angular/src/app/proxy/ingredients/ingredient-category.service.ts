import type { CreateUpdateIngredientCategoryDto, IngredientCategoryDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IngredientCategoryService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateIngredientCategoryDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientCategoryDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient-category',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/ingredient-category/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientCategoryDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient-category/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<IngredientCategoryDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/ingredient-category',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateIngredientCategoryDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientCategoryDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/ingredient-category/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}