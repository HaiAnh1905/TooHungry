# Hợp đồng Giao tiếp & Dịch vụ (Interface & Service Contracts): RM-022 Ổn định hóa & Vá lỗi Nghiêm trọng Backend

**Mã Tính năng (Feature ID)**: `RM-022`  
**Nhánh (Branch)**: `022-rm-022-backend-hardening`  
**Ngày thực hiện**: 2026-10-22  
**Đặc tả tham chiếu**: [spec.md](spec.md) | **Thiết kế Dữ liệu**: [data-model.md](data-model.md)

---

## 1. Hợp đồng Dịch vụ Đơn hàng (`IOrderAppService`)

```csharp
namespace Acme.TooHungry.Orders;

public interface IOrderAppService : IApplicationService
{
    Task<PagedResultDto<OrderDto>> GetListAsync(GetOrdersInput input);

    Task<OrderDto> GetAsync(Guid id);

    /// <summary>
    /// Tạo đơn hàng mới. Giá bán và tổng tiền được tính 100% tại server.
    /// </summary>
    Task<OrderDto> CreateAsync(CreateUpdateOrderDto input);

    /// <summary>
    /// Cập nhật đơn hàng. Chặn cập nhật nếu đơn đã Completed hoặc Cancelled.
    /// </summary>
    Task<OrderDto> UpdateAsync(Guid id, CreateUpdateOrderDto input);

    /// <summary>
    /// Waiter gửi gọi món tại bàn ăn. Bắt lỗi Filtered Index để tránh lỗi 500 khi có tranh chấp.
    /// </summary>
    Task<OrderDto> SubmitOrderAsync(SubmitOrderInputDto input);

    /// <summary>
    /// Hủy đơn hàng đang hoạt động.
    /// </summary>
    Task<OrderDto> CancelAsync(Guid id, CancelOrderInputDto input);

    /// <summary>
    /// Kiểm tra tồn kho khả dụng cho các món dự kiến gọi.
    /// </summary>
    Task<OrderStockValidationResultDto> ValidateStockAsync(ValidateOrderStockInputDto input);
}
```

---

## 2. Hợp đồng Dịch vụ Bàn ăn (`ITableAppService`)

```csharp
namespace Acme.TooHungry.Tables;

public interface ITableAppService : IApplicationService
{
    Task<PagedResultDto<TableDto>> GetListAsync(GetTablesInput input);

    Task<TableDto> GetAsync(Guid id);

    /// <summary>
    /// Cập nhật thông tin cơ bản của bàn (Tên, Sức chứa, Khu vực, Vị trí).
    /// Tuyệt đối không cho phép ghi đè Status hoặc OccupiedTime qua DTO này.
    /// </summary>
    Task<TableDto> UpdateAsync(Guid id, CreateUpdateTableDto input);

    /// <summary>
    /// Thay đổi trạng thái bàn ăn có kiểm soát nghiệp vụ.
    /// </summary>
    Task<TableDto> ChangeStatusAsync(Guid id, ChangeTableStatusDto input);

    /// <summary>
    /// Gộp bàn ăn an toàn: Gom món trùng DishId, tính lại giá niêm yết và ghép nối chuỗi ghi chú.
    /// </summary>
    Task<TableDto> MergeTablesAsync(MergeTablesInputDto input);

    /// <summary>
    /// Chuyển bàn ăn: Di chuyển phiên ăn và đơn hàng sang bàn đích.
    /// </summary>
    Task<TableDto> TransferTableAsync(TransferTableInputDto input);
}
```

---

## 3. Hợp đồng Dịch vụ Đặt bàn (`ITableReservationAppService` & `TableReservationManager`)

```csharp
namespace Acme.TooHungry.Reservations;

public interface ITableReservationAppService : IApplicationService
{
    Task<TableReservationDto> CreateAsync(CreateTableReservationDto input);

    Task<TableReservationDto> UpdateAsync(Guid id, UpdateTableReservationDto input);

    Task<TableReservationDto> CancelAsync(Guid id);

    /// <summary>
    /// Tiếp nhận khách đặt bàn. Chặn nếu bàn đang Occupied bởi khách cũ.
    /// </summary>
    Task<TableReservationDto> CheckInAsync(Guid id);
}

public class TableReservationManager : DomainService
{
    /// <summary>
    /// Thẩm định thời gian đặt bàn: Phải nằm trong khung giờ TooHungryConsts (08:00 - 22:00)
    /// và không được vượt quá 7 ngày trước.
    /// </summary>
    public virtual void ValidateReservationTime(DateTime reservationTime, DateTime now);

    /// <summary>
    /// Kiểm tra sức chứa bàn ăn.
    /// </summary>
    public virtual void ValidateGuestCount(int guestCount, int tableCapacity);
}
```

---

## 4. Hợp đồng Quản lý Tồn kho & FEFO (`InventoryManager`)

```csharp
namespace Acme.TooHungry.Inventories;

public class InventoryManager : DomainService
{
    /// <summary>
    /// Khấu trừ kho theo nguyên tắc FEFO. Không autoSave rải rác từng lô trong vòng lặp.
    /// </summary>
    public async Task<DeductionResult> DeductFefoAsync(
        Guid ingredientId,
        decimal requiredQuantity,
        string? referenceId = null);

    /// <summary>
    /// Điều chỉnh tồn kho khi kiểm kê. Tạo lô ADJ-* với đơn vị mua thật, giá vốn thật và hạn dùng hợp lý.
    /// </summary>
    public async Task AdjustStockAsync(
        Guid ingredientId,
        decimal actualQuantity,
        string reason);
}
```

---

## 5. Hợp đồng Dự báo Nhu cầu (`IIngredientPlanAppService`)

```csharp
namespace Acme.TooHungry.Forecasts;

public interface IIngredientPlanAppService : IApplicationService
{
    Task<IngredientPlanDto?> GetByForecastIdAsync(Guid demandForecastId);

    /// <summary>
    /// Cập nhật trạng thái kế hoạch nguyên liệu (Draft -> Confirmed -> Executed).
    /// Áp dụng máy trạng thái nghiêm ngặt, chặn chuyển từ Executed ngược về Draft.
    /// </summary>
    Task<IngredientPlanDto> UpdateStatusAsync(Guid id, UpdatePlanStatusDto input);
}
```

---

## 6. Hợp đồng Thông báo Thời gian Thực (`ITableRealtimeNotifier`)

```csharp
namespace Acme.TooHungry.Tables;

public interface ITableRealtimeNotifier
{
    /// <summary>
    /// Phát thông báo thay đổi trạng thái bàn ăn qua SignalR.
    /// BẮT BUỘC chỉ phát sau khi CurrentUnitOfWork.OnCompleted().
    /// </summary>
    Task NotifyTableStatusChangedAsync(
        Guid tableId,
        TableStatus status,
        string tableName,
        Guid? diningAreaId = null,
        DateTime? occupiedTime = null);

    /// <summary>
    /// Phát thông báo cập nhật đơn hàng active trên bàn qua SignalR.
    /// BẮT BUỘC chỉ phát sau khi CurrentUnitOfWork.OnCompleted().
    /// </summary>
    Task NotifyTableOrderUpdatedAsync(
        Guid tableId,
        bool hasActiveOrder,
        Guid? activeOrderId);
}
```
