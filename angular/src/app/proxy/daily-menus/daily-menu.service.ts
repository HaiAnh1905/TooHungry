import type { CreateUpdateDailyMenuDto, DailyMenuDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DailyMenuService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  create = (input: CreateUpdateDailyMenuDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DailyMenuDto>({
      method: 'POST',
      headers: { Accept: 'application/json' },
      url: '/api/app/daily-menu',
      body: input,
    },
    { apiName: this.apiName,...config });
  

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>({
      method: 'DELETE',
      url: `/api/app/daily-menu/${id}`,
    },
    { apiName: this.apiName,...config });
  

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DailyMenuDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: `/api/app/daily-menu/${id}`,
    },
    { apiName: this.apiName,...config });
  

  getByDate = (date: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DailyMenuDto>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/daily-menu/by-date',
      params: { date },
    },
    { apiName: this.apiName,...config });
  

  getList = (input: PagedAndSortedResultRequestDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DailyMenuDto>>({
      method: 'GET',
      headers: { Accept: 'application/json' },
      url: '/api/app/daily-menu',
      params: { sorting: input.sorting, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
    },
    { apiName: this.apiName,...config });
  

  update = (id: string, input: CreateUpdateDailyMenuDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DailyMenuDto>({
      method: 'PUT',
      headers: { Accept: 'application/json' },
      url: `/api/app/daily-menu/${id}`,
      body: input,
    },
    { apiName: this.apiName,...config });
}