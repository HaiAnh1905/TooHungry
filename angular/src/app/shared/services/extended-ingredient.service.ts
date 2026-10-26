import { Injectable, inject } from '@angular/core';
import { Rest, PagedResultDto } from '@abp/ng.core';
import { Observable } from 'rxjs';
import { IngredientService } from '../../proxy/ingredients/ingredient.service';
import { IngredientDto, GetIngredientsInput } from '../../proxy/ingredients/models';

@Injectable({
  providedIn: 'root',
})
export class ExtendedIngredientService {
  private readonly ingredientService = inject(IngredientService);

  /**
   * Wrapper cho getList hỗ trợ cờ boolean includeInactive hoặc GetIngredientsInput
   */
  getList = (
    inputOrIncludeInactive: GetIngredientsInput | boolean = {},
    config?: Partial<Rest.Config>
  ): Observable<PagedResultDto<IngredientDto>> => {
    if (typeof inputOrIncludeInactive === 'boolean') {
      const input: GetIngredientsInput = {
        maxResultCount: 1000,
        isActive: inputOrIncludeInactive ? undefined : true,
      };
      return this.ingredientService.getList(input, config);
    }

    return this.ingredientService.getList(inputOrIncludeInactive, config);
  };

  get = this.ingredientService.get;
  create = this.ingredientService.create;
  update = this.ingredientService.update;
  delete = this.ingredientService.delete;
  deactivate = this.ingredientService.deactivate;
  reactivate = this.ingredientService.reactivate;
  smartRestore = this.ingredientService.smartRestore;
}
