# Hợp đồng Giao diện & Dịch vụ (Interface & Service Contracts): RM-025 Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code

**Mã Tính năng**: `RM-025`  
**Ngày lập**: 2026-10-23  
**Tác giả**: ADAM (Antigravity AI Assistant)  
**Tài liệu Đầu vào**: [spec.md](../spec.md), [data-model.md](../data-model.md)

---

## 1. Hợp đồng Application Services (Tầng Application.Contracts)

### 1.1. `IInventoryAppService`
Định nghĩa phương thức phân trang lịch sử giao dịch:
```csharp
namespace Acme.TooHungry.Inventories;

public interface IInventoryAppService : IApplicationService
{
    // ... các phương thức quản lý tồn kho, nhập lô, xuất hủy, điều chỉnh ...

    /// <summary>
    /// Lấy danh sách lịch sử giao dịch kho của một nguyên liệu có phân trang và sắp xếp phía máy chủ
    /// </summary>
    Task<PagedResultDto<InventoryTransactionDto>> GetTransactionsAsync(
        Guid ingredientId,
        PagedAndSortedResultRequestDto input);

    /// <summary>
    /// Lấy danh sách các cảnh báo kho hàng (hết hạn, sắp hết hạn, dưới mức tồn tối thiểu) với truy vấn tối ưu hóa
    /// </summary>
    Task<List<InventoryAlertDto>> GetAlertsAsync();
}
```

### 1.2. `IDishAppService` & `IDishCategoryAppService` (Tách Đơn Trách Nhiệm)
Tách rõ ràng thành hai giao diện và hai tệp Application Service độc lập:
```csharp
namespace Acme.TooHungry.Dishes;

public interface IDishAppService : IApplicationService
{
    Task<DishDto> GetAsync(Guid id);
    Task<PagedResultDto<DishDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DishDto> CreateAsync(CreateUpdateDishDto input);
    Task<DishDto> UpdateAsync(Guid id, CreateUpdateDishDto input);
    Task DeleteAsync(Guid id);
    Task<ListResultDto<DishDto>> GetListByCategoryAsync(Guid? categoryId);
}

public interface IDishCategoryAppService : IApplicationService
{
    Task<DishCategoryDto> GetAsync(Guid id);
    Task<PagedResultDto<DishCategoryDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DishCategoryDto> CreateAsync(CreateUpdateDishCategoryDto input);
    Task<DishCategoryDto> UpdateAsync(Guid id, CreateUpdateDishCategoryDto input);
    Task DeleteAsync(Guid id);
}
```

### 1.3. `IDemandForecastAppService` & `IIngredientPlanAppService` (Tách Đơn Trách Nhiệm)
Tách thành hai giao diện độc lập cho Dự báo và Kế hoạch nguyên liệu:
```csharp
namespace Acme.TooHungry.Forecasts;

public interface IDemandForecastAppService : IApplicationService
{
    Task<DemandForecastDto> GetAsync(Guid id);
    Task<PagedResultDto<DemandForecastDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<DemandForecastDto> CreateAsync(CreateUpdateDemandForecastDto input);
    Task<DemandForecastDto> UpdateAsync(Guid id, CreateUpdateDemandForecastDto input);
    Task DeleteAsync(Guid id);
    Task<ForecastFinancialSummaryDto> GetFinancialSummaryAsync(Guid id);
}

public interface IIngredientPlanAppService : IApplicationService
{
    Task<IngredientPlanDto?> GetByForecastIdAsync(Guid demandForecastId);
    Task<IngredientPlanDto> UpdateStatusAsync(Guid id, UpdatePlanStatusDto input);
}
```

---

## 2. Hợp đồng Domain Services & Managers (Tầng Domain)

### 2.1. `RecipeManager`
```csharp
namespace Acme.TooHungry.Recipes;

public class RecipeManager : DomainService
{
    /// <summary>
    /// Tạo mới công thức món ăn (kiểm tra nguyên liệu tồn tại và đang active)
    /// </summary>
    public virtual async Task<Recipe> CreateAsync(
        Guid dishId,
        string name,
        string? description,
        List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor, Guid? recipeUnitId)> ingredients);

    /// <summary>
    /// Cập nhật công thức món ăn:
    /// - Kiểm tra 100% nguyên liệu tồn tại và IsActive == true
    /// - Clone công thức cũ thành bản ghi snapshot lịch sử (IsActive = false)
    /// - Tăng Version++ trên bản ghi chính (IsActive = true)
    /// </summary>
    public virtual async Task<Recipe> UpdateAsync(
        Guid id,
        string name,
        string? description,
        List<(Guid ingredientId, decimal quantity, string unit, decimal conversionFactor, Guid? recipeUnitId)> ingredients);
}
```

### 2.2. `InventoryManager` (Chuyển Đổi Hoàn Toàn Sang Non-Blocking Async)
```csharp
namespace Acme.TooHungry.Inventories;

public class InventoryManager : DomainService
{
    /// <summary>
    /// Khấu trừ kho theo phương pháp FEFO (First-Expired, First-Out)
    /// 100% bất đồng bộ, không dùng autoSave trong vòng lặp, commit nguyên khối
    /// </summary>
    public virtual async Task<DeductionResult> DeductFefoAsync(
        Guid ingredientId,
        decimal requiredQuantity,
        string referenceId);

    /// <summary>
    /// Điều chỉnh tồn kho khi kiểm kê (Stock Adjustment)
    /// 100% bất đồng bộ qua AsyncExecuter
    /// </summary>
    public virtual async Task AdjustStockAsync(
        Guid ingredientId,
        decimal actualQuantity,
        string reason,
        List<(Guid batchId, decimal quantity)>? batchDeductions = null);
}
```

---

## 3. Danh mục Quyền được Dọn dẹp (Pruned Permissions Contract)

Các nhóm permission sau chính thức bị **XÓA BỎ HOÀN TOÀN** khỏi `TooHungryPermissions.cs` và `TooHungryPermissionDefinitionProvider.cs`:
1. `TooHungryPermissions.Receivings.*`
2. `TooHungryPermissions.Wastes.*`
3. `TooHungryPermissions.Stocktakings.*`
4. `TooHungryPermissions.Bills.*`
5. `TooHungryPermissions.Payments.*`
6. `TooHungryPermissions.UnitConversions.*`
7. `TooHungryPermissions.StockAdjustments.*`

*Ghi chú*: Nghiệp vụ kiểm kê kho đã được tích hợp tập trung vào `TooHungryPermissions.Inventories.Adjust`, các nghiệp vụ khác đã chuyển sang các module chuyên biệt (Orders, Invoices, Payment).
