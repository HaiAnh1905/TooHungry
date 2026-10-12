import { Injectable, inject } from '@angular/core';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import type { RecipeDto, CreateRecipeDto, UpdateRecipeDto, CreateOrUpdateRecipeDto, RecipeFilterDto } from './models';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private readonly restService = inject(RestService);
  apiName = 'Default';

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'GET',
      url: `/api/app/recipe/${id}`,
    }, { apiName: this.apiName, ...config });

  getList = (input: Partial<RecipeFilterDto> = {}, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<RecipeDto>>({
      method: 'GET',
      url: '/api/app/recipe',
      params: {
        dishId: input.dishId,
        dishCategoryId: input.dishCategoryId,
        isActive: input.isActive,
        filter: input.filter,
        skipCount: input.skipCount,
        maxResultCount: input.maxResultCount,
        sorting: input.sorting,
      },
    }, { apiName: this.apiName, ...config });

  getActiveByDishId = (dishId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto | null>({
      method: 'GET',
      url: `/api/app/recipe/by-dish/${dishId}`,
    }, { apiName: this.apiName, ...config });

  getByDishId = this.getActiveByDishId;

  getHistoryByDishId = (dishId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto[]>({
      method: 'GET',
      url: `/api/app/recipe/history/${dishId}`,
    }, { apiName: this.apiName, ...config });

  create = (input: CreateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: '/api/app/recipe',
      body: input,
    }, { apiName: this.apiName, ...config });

  createOrUpdate = (input: CreateOrUpdateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: '/api/app/recipe/create-or-update',
      body: input,
    }, { apiName: this.apiName, ...config });

  update = (id: string, input: UpdateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'PUT',
      url: `/api/app/recipe/${id}`,
      body: input,
    }, { apiName: this.apiName, ...config });

  deactivate = (id: string, reason: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: `/api/app/recipe/${id}/deactivate`,
      params: { reason },
    }, { apiName: this.apiName, ...config });

  reactivate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: `/api/app/recipe/${id}/reactivate`,
    }, { apiName: this.apiName, ...config });
}
