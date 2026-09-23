import type { CreateUpdateDishDto, DishDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DishService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateDishDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/dish',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/dish/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/dish/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto & { filter?: string; dishCategoryId?: string }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DishDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/dish',
      params: {
        sorting: input.sorting,
        skipCount: input.skipCount,
        maxResultCount: input.maxResultCount,
        filter: input.filter,
        dishCategoryId: input.dishCategoryId,
      },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateDishDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/dish/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}