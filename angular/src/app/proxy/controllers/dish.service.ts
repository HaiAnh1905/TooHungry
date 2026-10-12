import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { BulkActionResultDto, BulkToggleActiveDishDto, CreateUpdateDishDto, DeleteDishDto, DishDto, GetDishesInput } from '../dishes/models';

@Injectable({
  providedIn: 'root',
})
export class DishService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  bulkToggleActive = (input: BulkToggleActiveDishDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BulkActionResultDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/dish/bulk-toggle-active',
      body: input,
    },
    { apiName: this.apiName,...config });
  

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
  

  deleteWithReason = (id: string, input: DeleteDishDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/dish/${id}/with-reason`,
      body: input,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/dish/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: GetDishesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DishDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/dish',
      params: { filter: input.filter, dishCategoryId: input.dishCategoryId, isActive: input.isActive, sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  getMenuForPos = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<DishDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/dish/menu-for-pos',
    },
    { apiName: this.apiName,...config });
  

  toggleActive = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DishDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: `/api/app/dish/${id}/toggle-active`,
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