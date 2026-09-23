import type { CreateUpdateDemandForecastDto, DemandForecastDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DemandForecastService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateDemandForecastDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DemandForecastDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/demand-forecast',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/demand-forecast/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DemandForecastDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/demand-forecast/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DemandForecastDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/demand-forecast',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateDemandForecastDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DemandForecastDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/demand-forecast/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}