import type { CreateUpdateDiningAreaDto, DiningAreaDto, GetDiningAreasInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DiningAreaService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  activate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      url: `/api/app/dining-area/${id}/activate`,
    },
    { apiName: this.apiName,...config });
  

  create = (input: CreateUpdateDiningAreaDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DiningAreaDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/dining-area',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  deactivate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'POST',
      url: `/api/app/dining-area/${id}/deactivate`,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/dining-area/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DiningAreaDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/dining-area/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: GetDiningAreasInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DiningAreaDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/dining-area',
      params: { filter: input.filter, isActive: input.isActive, sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  getLookup = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<DiningAreaDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/dining-area/lookup',
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateDiningAreaDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DiningAreaDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/dining-area/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}