import type { UploadImageInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { IActionResult } from '../microsoft/asp-net-core/mvc/models';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private restService = inject(RestService);
  apiName = 'Default';
  

  uploadDishImage = (input: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IActionResult>({
      method: 'POST',
      url: '/api/app/media/upload-dish-image',
      body: input,
    },
    { apiName: this.apiName,...config });
}