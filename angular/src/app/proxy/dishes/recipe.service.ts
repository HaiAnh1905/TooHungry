import type { CreateUpdateRecipeDto, RecipeDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/recipe',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/recipe/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/recipe/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<RecipeDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/recipe',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/recipe/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}