# Hợp đồng Giao diện & API (Interface & API Contracts): RM-014 Dự báo Nhu cầu & Kế hoạch Nguyên liệu

**Tính năng**: RM-014 — Dự báo Nhu cầu Món ăn & Kế hoạch Nguyên liệu (Demand Forecasts & Ingredient Requirement Planning)  
**Tài liệu Đặc tả liên quan**: [spec.md](../spec.md) | [data-model.md](../data-model.md)  
**Ngày cập nhật**: 2026-10-15  
**Trạng thái**: Hoàn thiện (Resolved)

---

## 1. Tổng quan Các Điểm cuối REST API (REST Endpoints Overview)

| Phương thức | Tuyến đường (URL) | Mục đích | Quyền yêu cầu (ABP Permission) |
|---|---|---|---|
| `GET` | `/api/app/demand-forecast` | Lấy danh sách phân trang bản dự báo | `TooHungry.Forecasts` |
| `GET` | `/api/app/demand-forecast/{id}` | Lấy chi tiết một bản dự báo kèm danh sách món | `TooHungry.Forecasts` |
| `POST` | `/api/app/demand-forecast` | Tạo mới bản dự báo và tự động sinh Kế hoạch nguyên liệu | `TooHungry.Forecasts.Create` |
| `PUT` | `/api/app/demand-forecast/{id}` | Cập nhật bản dự báo và tính lại Kế hoạch nguyên liệu | `TooHungry.Forecasts.Edit` |
| `DELETE` | `/api/app/demand-forecast/{id}` | Xóa bản dự báo (Cascade xóa Kế hoạch nguyên liệu) | `TooHungry.Forecasts.Delete` |
| `POST` | `/api/app/demand-forecast/generate` | Tính toán số lượng món gợi ý theo thuật toán SMA | `TooHungry.Forecasts.Create` |
| `GET` | `/api/app/demand-forecast/{id}/financial-summary` | Lấy các chỉ số tài chính dự toán của bản dự báo | `TooHungry.Forecasts` |
| `GET` | `/api/app/ingredient-plan/by-forecast/{demandForecastId}` | Lấy chi tiết Kế hoạch nguyên liệu kèm tồn kho và gợi ý mua | `TooHungry.Forecasts` |
| `PUT` | `/api/app/ingredient-plan/{id}/status` | Thay đổi trạng thái duyệt kế hoạch (`Draft` / `Confirmed`) | `TooHungry.Forecasts.Approve` |

---

## 2. Chi tiết Hợp đồng REST API (API Request / Response Specs)

### 2.1. Tự động Tính Dự báo từ Lịch sử (Generate Forecast)
- **Tuyến đường**: `POST /api/app/demand-forecast/generate`
- **Request Body**:
  ```json
  {
    "startDate": "2026-10-16T00:00:00Z",
    "endDate": "2026-10-22T23:59:59Z",
    "historyDays": 7
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "startDate": "2026-10-16T00:00:00Z",
    "endDate": "2026-10-22T23:59:59Z",
    "analysisDays": 7,
    "suggestedItems": [
      {
        "dishId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "dishName": "Phở Bò Tái Nạm",
        "dishImageUrl": "/media/dishes/pho-bo.jpg",
        "dishPrice": 65000.0,
        "forecastQuantity": 210,
        "totalAmount": 13650000.0,
        "hasRecipe": true,
        "note": "Trung bình 30 bát/ngày"
      }
    ],
    "financialSummary": {
      "projectedRevenue": 13650000.0,
      "projectedIngredientCost": 4368000.0,
      "foodCostPercentage": 32.0,
      "projectedPurchaseBudget": 1850000.0
    }
  }
  ```

---

### 2.2. Tạo Mới Bản Dự báo & Kế hoạch Nguyên liệu
- **Tuyến đường**: `POST /api/app/demand-forecast`
- **Request Body**:
  ```json
  {
    "forecastDate": "2026-10-15T10:00:00Z",
    "startDate": "2026-10-16T00:00:00Z",
    "endDate": "2026-10-22T23:59:59Z",
    "note": "Kế hoạch tuần 42",
    "items": [
      {
        "dishId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "forecastQuantity": 210,
        "note": null
      }
    ]
  }
  ```
- **Xử lý Backend**:
  1. Thêm bản ghi `DemandForecast` và `DemandForecastItem`.
  2. Bóc tách định lượng `Recipe` của từng món.
  3. Thêm bản ghi `IngredientPlan` và `IngredientPlanItem` với trạng thái `PlanStatus.Draft`.
- **Response** (`201 Created` / `200 OK`): Trả về `DemandForecastDto` đã tạo kèm Id của `IngredientPlan`.

---

### 2.3. Lấy Kế hoạch Nguyên liệu kèm Đối soát Tồn kho
- **Tuyến đường**: `GET /api/app/ingredient-plan/by-forecast/{demandForecastId}`
- **Response** (`200 OK`):
  ```json
  {
    "id": "7fa85f64-5717-4562-b3fc-2c963f66afb7",
    "demandForecastId": "8fa85f64-5717-4562-b3fc-2c963f66afc8",
    "planDate": "2026-10-15T10:00:00Z",
    "status": 0,
    "note": "Kế hoạch nguyên liệu tuần 42",
    "items": [
      {
        "ingredientPlanId": "7fa85f64-5717-4562-b3fc-2c963f66afb7",
        "ingredientId": "9fa85f64-5717-4562-b3fc-2c963f66afd9",
        "ingredientName": "Thịt Thăn Bò",
        "baseUnit": "kg",
        "requiredQuantity": 31.5,
        "currentStock": 10.0,
        "suggestedPurchaseQuantity": 21.5,
        "estimatedPrice": 250000.0,
        "estimatedCost": 5375000.0,
        "note": null
      },
      {
        "ingredientPlanId": "7fa85f64-5717-4562-b3fc-2c963f66afb7",
        "ingredientId": "1fa85f64-5717-4562-b3fc-2c963f66afe1",
        "ingredientName": "Bánh Phở Tươi",
        "baseUnit": "kg",
        "requiredQuantity": 42.0,
        "currentStock": 50.0,
        "suggestedPurchaseQuantity": 0.0,
        "estimatedPrice": 20000.0,
        "estimatedCost": 0.0,
        "note": "Đã đủ tồn kho"
      }
    ]
  }
  ```

---

### 2.4. Phê duyệt Trạng thái Kế hoạch Nguyên liệu
- **Tuyến đường**: `PUT /api/app/ingredient-plan/{id}/status`
- **Request Body**:
  ```json
  {
    "status": 1
  }
  ```
- **Response** (`200 OK`): Trả về `IngredientPlanDto` cập nhật.

---

## 3. Hợp đồng Interface C# (Application Service Interfaces)

```csharp
namespace Acme.TooHungry.Forecasts;

public interface IDemandForecastAppService : IApplicationService
{
    Task<DemandForecastDto> GetAsync(Guid id);
    Task<PagedResultDto<DemandForecastDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DemandForecastDto> CreateAsync(CreateUpdateDemandForecastDto input);
    Task<DemandForecastDto> UpdateAsync(Guid id, CreateUpdateDemandForecastDto input);
    Task DeleteAsync(Guid id);
    Task<GenerateForecastResultDto> GenerateForecastAsync(GenerateForecastInputDto input);
    Task<ForecastFinancialSummaryDto> GetFinancialSummaryAsync(Guid id);
}

public interface IIngredientPlanAppService : IApplicationService
{
    Task<IngredientPlanDto> GetByForecastIdAsync(Guid demandForecastId);
    Task<IngredientPlanDto> UpdateStatusAsync(Guid id, UpdatePlanStatusDto input);
}
```

---

## 4. Hợp đồng Angular Service Proxies

```typescript
import { RestService } from '@abp/ng.core';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { 
  DemandForecastDto, 
  CreateUpdateDemandForecastDto, 
  GenerateForecastInputDto, 
  GenerateForecastResultDto, 
  ForecastFinancialSummaryDto,
  IngredientPlanDto,
  UpdatePlanStatusDto
} from './models';

@Injectable({ providedIn: 'root' })
export class DemandForecastService {
  apiName = 'Default';

  constructor(private restService: RestService) {}

  getList(input: PagedAndSortedResultRequestDto): Observable<PagedResultDto<DemandForecastDto>> {
    return this.restService.request({
      method: 'GET',
      url: '/api/app/demand-forecast',
      params: input
    }, { apiName: this.apiName });
  }

  get(id: string): Observable<DemandForecastDto> {
    return this.restService.request({
      method: 'GET',
      url: `/api/app/demand-forecast/${id}`
    }, { apiName: this.apiName });
  }

  create(input: CreateUpdateDemandForecastDto): Observable<DemandForecastDto> {
    return this.restService.request({
      method: 'POST',
      url: '/api/app/demand-forecast',
      body: input
    }, { apiName: this.apiName });
  }

  update(id: string, input: CreateUpdateDemandForecastDto): Observable<DemandForecastDto> {
    return this.restService.request({
      method: 'PUT',
      url: `/api/app/demand-forecast/${id}`,
      body: input
    }, { apiName: this.apiName });
  }

  delete(id: string): Observable<void> {
    return this.restService.request({
      method: 'DELETE',
      url: `/api/app/demand-forecast/${id}`
    }, { apiName: this.apiName });
  }

  generate(input: GenerateForecastInputDto): Observable<GenerateForecastResultDto> {
    return this.restService.request({
      method: 'POST',
      url: '/api/app/demand-forecast/generate',
      body: input
    }, { apiName: this.apiName });
  }

  getFinancialSummary(id: string): Observable<ForecastFinancialSummaryDto> {
    return this.restService.request({
      method: 'GET',
      url: `/api/app/demand-forecast/${id}/financial-summary`
    }, { apiName: this.apiName });
  }
}

@Injectable({ providedIn: 'root' })
export class IngredientPlanService {
  apiName = 'Default';

  constructor(private restService: RestService) {}

  getByForecastId(demandForecastId: string): Observable<IngredientPlanDto> {
    return this.restService.request({
      method: 'GET',
      url: `/api/app/ingredient-plan/by-forecast/${demandForecastId}`
    }, { apiName: this.apiName });
  }

  updateStatus(id: string, input: UpdatePlanStatusDto): Observable<IngredientPlanDto> {
    return this.restService.request({
      method: 'PUT',
      url: `/api/app/ingredient-plan/${id}/status`,
      body: input
    }, { apiName: this.apiName });
  }
}
```

---

## 5. Hợp đồng Định dạng In ấn Khổ A4 (CSS Print Contract)

Quy chuẩn CSS Print chuyên biệt cho phiếu in kế hoạch nguyên liệu:
```scss
@media print {
  @page {
    size: A4 portrait;
    margin: 12mm 15mm 15mm 15mm;
  }

  body {
    background: #ffffff !important;
    color: #000000 !important;
    font-size: 11pt;
  }

  /* Ẩn tất cả thành phần giao diện web */
  app-sidebar,
  app-topbar,
  .no-print,
  .btn,
  .nav-tabs,
  .breadcrumb,
  .kpi-cards,
  footer {
    display: none !important;
  }

  /* Bố cục phiếu in A4 */
  .print-only {
    display: block !important;
  }

  .print-header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #000000;
    padding-bottom: 10px;

    .restaurant-name {
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
    }

    .document-title {
      font-size: 15pt;
      font-weight: 700;
      margin-top: 5px;
    }

    .meta-info {
      font-size: 10pt;
      color: #333333;
      margin-top: 4px;
    }
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;

    th, td {
      border: 1px solid #333333;
      padding: 6px 8px;
      font-size: 10pt;
    }

    th {
      background-color: #f2f2f2 !important;
      font-weight: bold;
      text-align: center;
    }
  }

  .print-signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    page-break-inside: avoid;

    .signature-block {
      width: 45%;
      text-align: center;

      .title {
        font-weight: bold;
      }

      .space {
        height: 60px;
      }
    }
  }
}
```
