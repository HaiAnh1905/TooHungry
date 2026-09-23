import type { CreateUpdateUnitDto, UnitDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UnitService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateUnitDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, UnitDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/unit',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/unit/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, UnitDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/unit/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<UnitDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/unit',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateUnitDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, UnitDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/unit/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}