import { Injectable, inject } from '@angular/core';
import { RestService } from '@abp/ng.core';
import { Observable } from 'rxjs';
import { DashboardSummaryDto, GetDashboardInput } from './models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private restService = inject(RestService);
  private apiName = 'Default';

  getSummary(input: GetDashboardInput = {}): Observable<DashboardSummaryDto> {
    return this.restService.request<any, DashboardSummaryDto>(
      {
        method: 'GET',
        url: '/api/app/dashboard/summary',
        params: {
          period: input.period,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      },
      { apiName: this.apiName }
    );
  }
}
