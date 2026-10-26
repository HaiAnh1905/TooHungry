# Hợp đồng Kiểm thử (Testing Contracts & Harness Specifications): RM-026

**Tính năng**: `RM-026 Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến`  
**Ngày lập**: 2026-10-23 | **Tác giả**: ADAM

---

## 1. Hợp đồng Bộ trợ giúp Giả lập Ngữ cảnh Người dùng (User Scope Test Helper Contracts)

Để chuẩn hóa việc kiểm thử phân quyền thời gian chạy (Runtime Authorization) trên toàn bộ test suite mà không lặp lại mã nguồn giả lập claims, hợp đồng `IUserScopeTestHelper` và lớp tiện ích mở rộng được thiết lập:

```csharp
namespace Acme.TooHungry.Security;

public interface IUserScopeTestHelper
{
    /// <summary>
    /// Giả lập ngữ cảnh người dùng vô danh (chưa đăng nhập / Unauthenticated)
    /// </summary>
    IDisposable ChangeToAnonymous();

    /// <summary>
    /// Giả lập ngữ cảnh người dùng có vai trò Phục vụ bàn (Waiter)
    /// </summary>
    IDisposable ChangeToWaiter(Guid? userId = null);

    /// <summary>
    /// Giả lập ngữ cảnh người dùng có vai trò Thủ kho (InventoryKeeper)
    /// </summary>
    IDisposable ChangeToInventoryKeeper(Guid? userId = null);

    /// <summary>
    /// Giả lập ngữ cảnh người dùng có vai trò Quản trị viên (Admin)
    /// </summary>
    IDisposable ChangeToAdmin(Guid? userId = null);

    /// <summary>
    /// Giả lập ngữ cảnh người dùng với danh sách vai trò và claims tùy biến
    /// </summary>
    IDisposable ChangeUser(Guid? userId, string? userName, string[]? roles = null, (string Type, string Value)[]? additionalClaims = null);
}
```

### Triển khai Helper Pattern kế thừa ABP Test Base:

```csharp
public abstract class TooHungryApplicationTestBase<TStartupModule> : TooHungryTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    protected ICurrentUser CurrentUser => GetRequiredService<ICurrentUser>();
    protected ICurrentPrincipalAccessor CurrentPrincipalAccessor => GetRequiredService<ICurrentPrincipalAccessor>();

    protected IDisposable ChangeUserContext(Guid? userId, string? userName, params string[] roles)
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(AbpClaimTypes.UserId, userId.Value.ToString()));
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
        }
        if (!string.IsNullOrWhiteSpace(userName))
        {
            claims.Add(new Claim(AbpClaimTypes.UserName, userName));
            claims.Add(new Claim(ClaimTypes.Name, userName));
        }
        foreach (var role in roles)
        {
            claims.Add(new Claim(AbpClaimTypes.Role, role));
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var identity = new ClaimsIdentity(claims, userId.HasValue ? "TestAuth" : null);
        var principal = new ClaimsPrincipal(identity);

        return CurrentPrincipalAccessor.Change(principal);
    }
}
```

---

## 2. Hợp đồng Kiểm thử Tương tranh (Concurrency Test Scope Contracts)

Để thực thi an toàn các tác vụ cạnh tranh trong SQLite In-Memory mà không làm lỗi `TooHungryDbContext` instance, hợp đồng điều phối tương tranh cung cấp phương thức bao bọc:

```csharp
namespace Acme.TooHungry.Testing;

public interface IConcurrencyTestRunner
{
    /// <summary>
    /// Chạy song song N tác vụ độc lập trên các DI Scope riêng biệt
    /// </summary>
    Task RunConcurrentScopesAsync(int workerCount, Func<IServiceProvider, int, Task> action);

    /// <summary>
    /// Chạy song song 2 tác vụ cạnh tranh trên cùng một tài nguyên và trả về kết quả hoặc lỗi của từng luồng
    /// </summary>
    Task<(T1? Result1, Exception? Error1, T2? Result2, Exception? Error2)> ExecuteRaceConditionAsync<T1, T2>(
        Func<IServiceProvider, Task<T1>> action1,
        Func<IServiceProvider, Task<T2>> action2);
}
```

---

## 3. Danh mục Chi tiết Phương thức Kiểm thử (Test Methods Contract Matrix)

### 3.1. Phân hệ Bảo mật & Phân quyền (Security & Authorization)

#### Lớp: `EndpointAuthorization_Runtime_Tests<TStartupModule>`
- `UploadDishImageAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_DishesEdit_Permission()`
- `DailyMenuAppService_Should_Throw_AbpAuthorizationException_When_User_Is_Unauthenticated()`
- `RecipeController_GetActiveByDishIdAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_RecipesDefault()`
- `TableOrderController_CompleteActiveOrderByTableIdAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_OrdersEdit()`
- `OrderAppService_DeleteAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_OrdersDelete()`
- `DishCategoryAppService_DeleteAsync_Should_Throw_AbpAuthorizationException_When_User_Lacks_DishCategoriesDelete()`

#### Lớp: `RoleBasedAuthorization_Tests<TStartupModule>`
- `Waiter_Should_Be_Able_To_Create_Order_And_Update_Table_Status()`
- `Waiter_Should_Be_Denied_When_Attempting_To_Delete_Order()`
- `Waiter_Should_Be_Denied_When_Attempting_To_Modify_Ingredients()`
- `InventoryKeeper_Should_Be_Able_To_Create_Batch_And_Adjust_Stock()`
- `InventoryKeeper_Should_Be_Denied_When_Attempting_To_Complete_Payment()`
- `Admin_Should_Have_Full_Access_To_All_Endpoints()`

---

### 3.2. Phân hệ Bất biến & Tương tranh Đơn hàng (Orders & Concurrency)

#### Lớp: `OrderAppService_Idempotency_Tests<TStartupModule>`
- `CompletePaymentAsync_Should_Be_Idempotent_And_Reject_Duplicate_Calls_With_BusinessException()`
  * *Hành vi*: Lần 1 thành công trừ kho. Lần 2 ném `BusinessException("TooHungry:Order:AlreadyCompleted")`.
  * *Khẳng định*: Tồn kho nguyên liệu sau lần 2 bằng chính xác sau lần 1. Số lượng giao dịch `DishConsumption` không đổi.
- `UpdateAsync_With_Completed_Status_Should_Not_Consume_Inventory_Twice()`
  * *Hành vi*: Đơn hàng đã `Completed`, gọi `UpdateAsync` với `Status = Completed` ném `BusinessException`. Kho không bị trừ lần 2.
- `CompleteActiveOrderByTableIdAsync_Should_Be_Idempotent_Under_Rapid_Repeated_Calls()`
  * *Hành vi*: Gọi liên tiếp trên cùng bàn ăn, chỉ thực hiện khấu trừ kho DUY NHẤT 1 lần.

#### Lớp: `OrderAppService_SubmitOrder_Concurrency_Tests<TStartupModule>`
- `SubmitOrder_Concurrent_Requests_On_Same_Table_Should_Allow_Only_One_Active_Order()`
  * *Hành vi*: 2 Task cùng gửi `SubmitOrderAsync` trên cùng một bàn ăn đồng thời.
  * *Khẳng định*: Đúng 1 task thành công, task thứ hai bắt được ngoại lệ nghiệp vụ (`BusinessException`), CSDL chỉ có duy nhất 1 bản ghi `Order` active trên bàn, không có lỗi unhandled 500.

---

### 3.3. Phân hệ Tương tranh & Thuật toán Kho (Inventories & FEFO)

#### Lớp: `InventoryManager_Fefo_Concurrency_Tests<TStartupModule>`
- `DeductFefoAsync_Concurrent_Orders_Consuming_Same_Batch_Should_Not_Overdraw_And_Handle_Concurrency_Retry()`
  * *Hành vi*: 4 đơn hàng cùng tiêu hao 2 đơn vị nguyên liệu từ một lô kho có tồn kho 10 đơn vị.
  * *Khẳng định*: Toàn bộ 4 đơn đều thành công, tồn kho còn lại đúng $10 - (4 \times 2) = 2$ đơn vị.
- `DeductFefoAsync_Should_Throw_BusinessException_When_Stock_Depleted_Under_Concurrency()`
  * *Hành vi*: Nhiều đơn cùng cạnh tranh vượt quá tổng số tồn kho. Các đơn sau bị từ chối sạch sẽ với lỗi thiếu nguyên liệu, không gây âm kho.

#### Lớp: `InventoryAppService_StockAdjustment_Tests<TStartupModule>`
- `StockAdjustment_Positive_Should_Create_Batch_With_EstimatedPrice_And_StorageType_Expiration()`
  * *Hành vi*: Điều chỉnh tăng (+5) -> Lô mới sinh ra có `UnitCost = estimatedPrice` (không bằng 0), `PurchaseUnit = baseUnit`, hạn dùng hợp lý.
- `StockAdjustment_Negative_Should_Deduct_Fefo_Accurately()`
  * *Hành vi*: Điều chỉnh giảm (-3) -> Khấu trừ FEFO từ lô có hạn dùng gần nhất, giao dịch ghi nhận số lượng âm.

#### Lớp: `InventoryManager_Fefo_Consumption_Tests<TStartupModule>`
- `DeductFefoAsync_Should_Exhaust_Earliest_Expiring_Batch_Before_Moving_To_Next_Batch()`
  * *Hành vi*: Lô 1 (hạn 3 ngày, 2kg), Lô 2 (hạn 7 ngày, 5kg). Trừ 4kg -> Lô 1 còn 0kg, Lô 2 còn 3kg.
- `DeductFefoAsync_Should_Ignore_Already_Expired_Batches()`
  * *Hành vi*: Lô đã quá hạn sử dụng bị bỏ qua, không dùng để nấu món cho khách.

---

### 3.4. Phân hệ Nghiệp vụ Bàn ăn Phức hợp (Tables & State Recovery)

#### Lớp: `TableAppService_TransferTable_Tests<TStartupModule>`
- `TransferTableAsync_Should_Transfer_Active_Order_Preserve_OccupiedTime_And_Mark_Source_Cleaning()`
- `TransferTableAsync_Should_Reject_When_Source_And_Target_Are_Same()`
- `TransferTableAsync_Should_Reject_When_Source_Table_Not_Occupied()`
- `TransferTableAsync_Should_Reject_When_Target_Table_Is_Not_Available()`

#### Lớp: `TableAppService_MergeTables_Advanced_Tests<TStartupModule>`
- `MergeTablesAsync_Should_Combine_Items_Sync_DB_Price_And_Preserve_Both_Table_Notes()`
  * *Khẳng định*: Món trùng lặp được cộng dồn `Quantity`, đơn giá niêm yết CSDL (`Dish.Price`), ghi chú được nối `"{primary.Note} | [Gộp từ {secondary.Name}: {secondary.Note}]"`.
- `MergeTablesAsync_Should_Cancel_Secondary_Order_And_Mark_Secondary_Table_Cleaning()`

#### Lớp: `TableAppService_CancelOrder_Tests<TStartupModule>`
- `CancelActiveOrderAsync_Should_Cancel_Order_Release_Table_To_Available_And_Not_Consume_Stock()`
- `CancelActiveOrderAsync_Should_Reject_When_Order_Already_Completed()`

---

## 4. Hợp đồng Kiểm thử EF Core SQLite In-Memory (Concrete EF Core Contracts)

Mỗi lớp kiểm thử trừu tượng trên sẽ có một lớp con cụ thể tương ứng trong dự án `Acme.TooHungry.EntityFrameworkCore.Tests`:

```csharp
namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreEndpointAuthorizationRuntimeTests : EndpointAuthorization_Runtime_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreRoleBasedAuthorizationTests : RoleBasedAuthorization_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderIdempotencyTests : OrderAppService_Idempotency_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderSubmitOrderConcurrencyTests : OrderAppService_SubmitOrder_Concurrency_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryFefoConcurrencyTests : InventoryManager_Fefo_Concurrency_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryStockAdjustmentTests : InventoryAppService_StockAdjustment_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryFefoConsumptionTests : InventoryManager_Fefo_Consumption_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableTransferTableTests : TableAppService_TransferTable_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableMergeTablesAdvancedTests : TableAppService_MergeTables_Advanced_Tests<TooHungryEntityFrameworkCoreTestModule> { }

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableCancelOrderTests : TableAppService_CancelOrder_Tests<TooHungryEntityFrameworkCoreTestModule> { }
```
