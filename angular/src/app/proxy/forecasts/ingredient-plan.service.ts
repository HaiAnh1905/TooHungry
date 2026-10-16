import type { IngredientPlanDto, UpdatePlanStatusDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IngredientPlanService {
  private restService = inject(RestService);
  apiName = 'Default';

  getByForecastId = (demandForecastId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientPlanDto | null>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/app/ingredient-plan/by-forecast/${demandForecastId}`,
      },
      { apiName: this.apiName, ...config }
    );

  updateStatus = (id: string, input: UpdatePlanStatusDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IngredientPlanDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/app/ingredient-plan/${id}/status`,
        body: input,
      },
      { apiName: this.apiName, ...config }
    );
}