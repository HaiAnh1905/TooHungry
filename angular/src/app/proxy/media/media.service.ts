import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface UploadImageResultDto {
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private restService = inject(RestService);
  apiName = 'Default';

  uploadDishImage = (file: File, config?: Partial<Rest.Config>): Observable<UploadImageResultDto> => {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.restService.request<any, UploadImageResultDto>(
      {
        method: 'POST',
        url: '/api/app/media/upload-dish-image',
        body: formData,
      },
      { apiName: this.apiName, ...config }
    );
  };
}
