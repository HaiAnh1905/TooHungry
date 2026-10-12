# Hợp đồng Giao diện & API (API Contracts): Quản lý Công thức Món ăn (Recipes) (RM-007)

**Tính năng**: `007-rm-007-recipe-inventory-consumption` — Quản lý Công thức Món ăn (RM-007)  
**Ngày cập nhật**: 2026-10-09  

---

## 1. Hợp đồng Tầng Application (`IRecipeAppService`)

```csharp
namespace Acme.TooHungry.Recipes;

public interface IRecipeAppService : IApplicationService
{
    /// <summary>
    /// Lấy chi tiết một công thức theo Id (kèm tính toán Food Cost và trạng thái nguyên liệu).
    /// </summary>
    Task<RecipeDto> GetAsync(Guid id);

    /// <summary>
    /// Lấy danh sách phân trang các công thức với bộ lọc theo DishId, Danh mục món, trạng thái.
    /// </summary>
    Task<PagedResultDto<RecipeDto>> GetListAsync(RecipeFilterDto input);

    /// <summary>
    /// Lấy công thức đang hoạt động của một món ăn cụ thể (Hợp đồng cho phân hệ POS RM-010).
    /// </summary>
    Task<RecipeDto?> GetActiveByDishIdAsync(Guid dishId);

    /// <summary>
    /// Tra cứu toàn bộ lịch sử các phiên bản công thức của một món ăn.
    /// </summary>
    Task<List<RecipeDto>> GetHistoryByDishIdAsync(Guid dishId);

    /// <summary>
    /// Tạo mới công thức cho một món ăn.
    /// </summary>
    Task<RecipeDto> CreateAsync(CreateRecipeDto input);

    /// <summary>
    /// Tạo mới hoặc cập nhật công thức (tự động xử lý theo món ăn).
    /// </summary>
    Task<RecipeDto> CreateOrUpdateAsync(CreateOrUpdateRecipeDto input);

    /// <summary>
    /// Cập nhật định lượng/thành phần công thức (tự động tăng Version).
    /// </summary>
    Task<RecipeDto> UpdateAsync(Guid id, UpdateRecipeDto input);

    /// <summary>
    /// Tạm ngưng công thức kèm theo lý do bắt buộc.
    /// </summary>
    Task<RecipeDto> DeactivateAsync(Guid id, string reason);

    /// <summary>
    /// Kích hoạt lại công thức.
    /// </summary>
    Task<RecipeDto> ReactivateAsync(Guid id);
}
```

---

## 2. Hợp đồng RESTful API Endpoints (`RecipeController`)

- **Base Route**: `/api/app/recipe`
- **Quyền yêu cầu chung**: `TooHungryPermissions.Recipes.Default`

| Phương thức HTTP | Đường dẫn Endpoint | Quyền hạn (Permissions) | Mô tả & Chức năng | Body / Tham số |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/app/recipe/{id}` | `Recipes.Default` | Lấy chi tiết công thức | `id: Guid` |
| `GET` | `/api/app/recipe` | `Recipes.Default` | Lấy danh sách phân trang | Query: `RecipeFilterDto` |
| `GET` | `/api/app/recipe/by-dish/{dishId}` | `Recipes.Default` / Phục vụ POS | Lấy công thức active theo món | `dishId: Guid` |
| `GET` | `/api/app/recipe/history/{dishId}` | `Recipes.Default` | Lấy lịch sử phiên bản công thức | `dishId: Guid` |
| `POST` | `/api/app/recipe` | `Recipes.Create` | Tạo công thức mới | Body: `CreateRecipeDto` |
| `POST` | `/api/app/recipe/create-or-update` | `Recipes.Create` / `Edit` | Tạo hoặc cập nhật công thức | Body: `CreateOrUpdateRecipeDto` |
| `PUT` | `/api/app/recipe/{id}` | `Recipes.Edit` | Chỉnh sửa công thức (tăng version) | `id: Guid`, Body: `UpdateRecipeDto` |
| `POST` | `/api/app/recipe/{id}/deactivate` | `Recipes.Edit` | Tạm ngưng công thức | `id: Guid`, Query: `reason: string` |
| `POST` | `/api/app/recipe/{id}/reactivate` | `Recipes.Edit` | Kích hoạt lại công thức | `id: Guid` |

---

## 3. Mã Lỗi Nghiệp vụ Chuẩn Hóa (Business Error Codes)

Các mã lỗi nghiệp vụ được ném thông qua `BusinessException` / `UserFriendlyException` và đã được bản địa hóa trong cả `vi.json` và `en.json`:

| Mã Lỗi (Error Code) | HTTP Status | Bản dịch Tiếng Việt (`vi.json`) | Bản dịch Tiếng Anh (`en.json`) |
| :--- | :---: | :--- | :--- |
| `Recipe:DishNotFound` | 404 | Món ăn không tồn tại trong hệ thống. | Dish not found in the system. |
| `Recipe:DishAlreadyHasActiveRecipe` | 400 | Món ăn đã có công thức đang hoạt động! Không thể kích hoạt thêm. | The dish already has an active recipe! Cannot activate another one. |
| `RecipeIngredient:QuantityMustBePositive` | 400 | Định lượng nguyên liệu phải lớn hơn 0! | Ingredient quantity must be greater than 0! |
| `RecipeIngredient:ConversionFactorMustBePositive` | 400 | Hệ số quy đổi phải lớn hơn 0! | Conversion factor must be greater than 0! |
| `Recipe:DeactivationReasonRequired` | 400 | Vui lòng nhập lý do tạm ngưng công thức! | Please enter the deactivation reason! |

---

## 4. Định nghĩa Phân quyền ABP (Permissions)

```csharp
public static class TooHungryPermissions
{
    public static class Recipes
    {
        public const string Default = GroupName + ".Recipes";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }
}
```

- **Quản lý (`Manager`) / Quản trị viên (`Admin`) / Bếp trưởng (`Chef`)**: Được cấp đầy đủ quyền `Default`, `Create`, `Edit`.
- **Nhân viên thu ngân / Phục vụ bàn**: Bị từ chối truy cập quyền `Default` (chỉ được gọi ngầm `GetActiveByDishIdAsync` khi POS xử lý trừ kho mà không thấy giá vốn).

---

## 5. Hợp đồng Client Angular (TypeScript Models & Proxies)

### 5.1. Mô hình TypeScript (`angular/src/app/proxy/recipes/models.ts`)
```typescript
import type { FullAuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';

export interface RecipeIngredientDto extends EntityDto<string> {
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  baseUnit: string;
  estimatedPrice: number;
  quantity: number;
  unit: string;
  recipeUnitId?: string;
  conversionFactor: number;
  baseQuantity: number;
  itemEstimatedCost: number;
  isActive: boolean;
  isIngredientActive: boolean;
}

export interface RecipeDto extends FullAuditedEntityDto<string> {
  dishId: string;
  dishName: string;
  dishPrice: number;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  deactivationReason?: string;
  totalEstimatedCost: number;
  foodCostPercentage: number;
  hasDeactivatedIngredients: boolean;
  ingredients: RecipeIngredientDto[];
}

export interface CreateRecipeIngredientDto {
  ingredientId: string;
  quantity: number;
  unit?: string;
  recipeUnitId?: string;
  conversionFactor: number;
}

export interface CreateRecipeDto {
  dishId: string;
  name?: string;
  description?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface UpdateRecipeDto {
  name?: string;
  description?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface CreateOrUpdateRecipeDto {
  dishId: string;
  name?: string;
  description?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface RecipeFilterDto extends PagedAndSortedResultRequestDto {
  dishId?: string;
  dishCategoryId?: string;
  isActive?: boolean;
  filter?: string;
}
```

### 5.2. Service Proxy (`angular/src/app/proxy/recipes/recipe.service.ts`)
```typescript
import { Injectable, inject } from '@angular/core';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import type { RecipeDto, CreateRecipeDto, UpdateRecipeDto, CreateOrUpdateRecipeDto, RecipeFilterDto } from './models';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private readonly restService = inject(RestService);
  apiName = 'Default';

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'GET',
      url: `/api/app/recipe/${id}`,
    }, { apiName: this.apiName, ...config });

  getList = (input: RecipeFilterDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<RecipeDto>>({
      method: 'GET',
      url: '/api/app/recipe',
      params: { dishId: input.dishId, dishCategoryId: input.dishCategoryId, isActive: input.isActive, filter: input.filter, skipCount: input.skipCount, maxResultCount: input.maxResultCount, sorting: input.sorting },
    }, { apiName: this.apiName, ...config });

  getActiveByDishId = (dishId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto | null>({
      method: 'GET',
      url: `/api/app/recipe/by-dish/${dishId}`,
    }, { apiName: this.apiName, ...config });

  getHistoryByDishId = (dishId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto[]>({
      method: 'GET',
      url: `/api/app/recipe/history/${dishId}`,
    }, { apiName: this.apiName, ...config });

  create = (input: CreateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: '/api/app/recipe',
      body: input,
    }, { apiName: this.apiName, ...config });

  createOrUpdate = (input: CreateOrUpdateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: '/api/app/recipe/create-or-update',
      body: input,
    }, { apiName: this.apiName, ...config });

  update = (id: string, input: UpdateRecipeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'PUT',
      url: `/api/app/recipe/${id}`,
      body: input,
    }, { apiName: this.apiName, ...config });

  deactivate = (id: string, reason: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: `/api/app/recipe/${id}/deactivate`,
      params: { reason },
    }, { apiName: this.apiName, ...config });

  reactivate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecipeDto>({
      method: 'POST',
      url: `/api/app/recipe/${id}/reactivate`,
    }, { apiName: this.apiName, ...config });
}
```
