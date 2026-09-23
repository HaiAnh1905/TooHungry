import type { CreateUpdateDishCategoryDto, DishCategoryDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DishCategoryService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateDishCategoryDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishCategoryDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/dish-category',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/dish-category/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishCategoryDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/dish-category/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DishCategoryDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/dish-category',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateDishCategoryDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishCategoryDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/dish-category/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}