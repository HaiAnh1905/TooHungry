import type {
  CreateUpdateDemandForecastDto,
  DemandForecastDto,
  DemandForecastFilterDto,
  GenerateForecastInputDto,
  GenerateForecastResultDto,
  ForecastFinancialSummaryDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DemandForecastService {
  private restService = inject(RestService);
  apiName = 'Default';

  generateForecast = (input: GenerateForecastInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, GenerateForecastResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/app/demand-forecast/generate',
        body: input,
      },
      { apiName: this.apiName, ...config }
    );

  create = (input: CreateUpdateDemandForecastDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DemandForecastDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/app/demand-forecast',
        body: input,
      },
      { apiName: this.apiName, ...config }
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/app/demand-forecast/${id}`,
      },
      { apiName: this.apiName, ...config }
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DemandForecastDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/demand-forecast/${id}`,
      },
      { apiName: this.apiName, ...config }
    );

  getList = (input: DemandForecastFilterDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DemandForecastDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/app/demand-forecast',
        params: {
          startDate: input.startDate,
          endDate: input.endDate,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config }
    );

  update = (id: string, input: CreateUpdateDemandForecastDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DemandForecastDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/app/demand-forecast/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config }
    );

  getFinancialSummary = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ForecastFinancialSummaryDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/demand-forecast/${id}/financial-summary`,
      },
      { apiName: this.apiName, ...config }
    );
}