# Nghiên cứu Kỹ thuật (Technical Research): RM-026 Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency)

**Tính năng**: `RM-026` | **Ngày lập**: 2026-10-23 | **Tác giả**: ADAM

---

## 1. Tổng quan & Mục tiêu Nghiên cứu

Nghiên cứu này phục vụ việc thiết kế và lập kế hoạch triển khai bộ kiểm thử tự động toàn diện (Integration & Concurrency Tests) kế thừa `TooHungryApplicationTestBase` và `TooHungryEntityFrameworkCoreTestModule`. Mục tiêu chính là giải quyết dứt điểm phát hiện **Backend #34** trong `CODE_REVIEW.md`, thiết lập hệ thống rào chắn tự động ngăn chặn tái phát các lỗi nghiêm trọng về phân quyền thời gian chạy (Runtime Authorization), tính bất biến thanh toán (Idempotency), tương tranh tạo đơn và trừ kho (Concurrency), cùng các luồng nghiệp vụ nhà hàng phức tạp (Chuyển bàn, Gộp bàn, Hủy đơn, Kiểm kê kho FEFO).

---

## 2. Các Chủ đề Nghiên cứu Chuyên sâu

### Nghiên cứu 1: Giả lập Danh tính & Kích hoạt Interceptor Phân quyền ABP Runtime trong xUnit

- **Bối cảnh & Hạn chế Cũ**:
  - Trước đây, `EndpointAuthorization_Tests.cs` chỉ sử dụng Reflection để đọc `method.GetCustomAttribute<AuthorizeAttribute>()`. Điều này chỉ chứng minh lập trình viên đã viết thuộc tính `[Authorize]` trên mã nguồn, nhưng hoàn toàn KHÔNG chứng minh được rằng khi một HTTP request hoặc service call thực sự xảy ra, ABP Framework có kích hoạt bộ lọc bảo mật và ném `AbpAuthorizationException` hay không.
- **Cơ chế Can thiệp Phân quyền của ABP (ABP Authorization Pipeline)**:
  - Khi một phương thức của Application Service được gọi thông qua DI Container, Castle Windsor / Autofac Dynamic Proxy của ABP sẽ bọc lời gọi trong interceptor `AuthorizationInterceptor`.
  - Interceptor này gọi `IMethodInvocationAuthorizationService.AuthorizeAsync()`, đọc `ClaimsPrincipal` từ `ICurrentPrincipalAccessor` và kiểm tra quyền thông qua `IPermissionChecker`.
  - Nếu `ICurrentUser.IsAuthenticated == false` hoặc người dùng không sở hữu quyền tương ứng trong chính sách bảo mật (Policy), ABP sẽ lập tức ném `AbpAuthorizationException` (tương ứng với mã trạng thái HTTP 401 Unauthorized hoặc HTTP 403 Forbidden).
- **Giải pháp Kỹ thuật Giả lập (Test Harness)**:
  - Sử dụng phương thức `_currentUser.Change(...)` hoặc `_currentPrincipalAccessor.Change(...)` bên trong cấu trúc `using`:
    ```csharp
    using (_currentUser.Change(userId: null, userName: null)) // Unauthenticated
    {
        await Should.ThrowAsync<AbpAuthorizationException>(async () =>
        {
            await _orderAppService.DeleteAsync(orderId);
        });
    }
    ```
  - Đối với kiểm thử ma trận vai trò (Role-based testing):
    + Tạo identity với các Claims cụ thể: `ClaimTypes.NameIdentifier`, `ClaimTypes.Name`, `ClaimTypes.Role` tương ứng với vai trò `Waiter` hoặc `InventoryKeeper`.
    + Bằng cách này, kiểm tra chính xác rằng vai trò `Waiter` có thể tạo đơn hàng (`Orders.Create`) nhưng khi gọi `DeleteAsync` sẽ lập tức bị chặn bằng `AbpAuthorizationException`.
- **Kết luận**: Phương án tiếp cận giả lập ClaimsPrincipal thông qua ABP testing scope vừa kích hoạt 100% pipeline thật của ABP, vừa chạy siêu nhanh trong bộ nhớ RAM (dưới 10ms/test case), không cần khởi động Kestrel Web Server.

---

### Nghiên cứu 2: Cơ chế Kiểm thử Tương tranh (Concurrency) & Đa Luồng trong SQLite In-Memory

- **Thách thức Kỹ thuật**:
  - Trong dự án kiểm thử tích hợp `Acme.TooHungry.EntityFrameworkCore.Tests`, ABP sử dụng `AbpUnitTestSqliteDatabase` chia sẻ cùng một Connection String SQLite in-memory giữa các repository.
  - Tuy nhiên, Entity Framework Core `DbContext` là **non-thread-safe**. Nếu nhiều task song song cùng gọi các phương thức repository trên cùng một `TooHungryDbContext` instance, EF Core sẽ ném lỗi runtime:
    `InvalidOperationException: A second operation was started on this context instance before a previous operation completed.`
- **Giải pháp Cô lập Bằng DI Scopes Độc lập (`IServiceScopeFactory`)**:
  - Để mô phỏng chân thực nhiều yêu cầu từ các máy khách POS hoặc điện thoại của nhân viên phục vụ gửi lên đồng thời, mỗi Task trong bài test tương tranh cần một DI container scope riêng:
    ```csharp
    var scopeFactory = GetRequiredService<IServiceScopeFactory>();
    
    var task1 = Task.Run(async () =>
    {
        using var scope = scopeFactory.CreateScope();
        var orderService = scope.ServiceProvider.GetRequiredService<IOrderAppService>();
        var uowManager = scope.ServiceProvider.GetRequiredService<IUnitOfWorkManager>();
        using var uow = uowManager.Begin(requiresNew: true);
        await orderService.SubmitOrderAsync(input1);
        await uow.CompleteAsync();
    });
    ```
  - Vì cả 2 scope đều trỏ chung vào cùng một CSDL SQLite in-memory, các lệnh SQL INSERT/UPDATE sẽ cạnh tranh trực tiếp trên cùng một bảng dữ liệu.
- **Kiểm chứng 2 Kịch bản Tương tranh Trọng yếu**:
  1. **Race condition khi tạo đơn (`SubmitOrder` đồng thời trên cùng 1 bàn)**:
     - Nhờ bộ lọc Unique Index `IX_AppOrders_TableId_Active` hoặc logic kiểm tra trạng thái bàn tại `TableAppService`, đúng 1 luồng thành công và luồng thứ hai bắt được `BusinessException` (được bọc từ `DbUpdateException`), bảo đảm chỉ 1 đơn active tồn tại và không ném mã lỗi 500.
  2. **Tương tranh trừ kho nhiều lô FEFO (FEFO Concurrency Retry)**:
     - Khi nhiều đơn hàng cùng khấu trừ một lô nguyên liệu, xung đột `ConcurrencyStamp` kích hoạt cơ chế retry trong Unit of Work mới (`requiresNew: true` - đã được khắc phục tại RM-022), bảo đảm các giao dịch trừ kho không bị lỗi vòng lặp và số lượng tồn kho cuối cùng trừ chính xác tuyệt đối.

---

### Nghiên cứu 3: Mô hình Khẳng định Tính Bất biến (Idempotency Assertions)

- **Nguyên nhân Gốc rễ của Bug Backend #1**:
  - Tại `OrderAppService.cs`, phương thức `UpdateAsync` trước đây thực thi `ProcessOrderInventoryConsumptionAsync` mỗi khi `input.Status == OrderStatus.Completed` mà không kiểm tra trạng thái cũ (`oldStatus`). Dẫn đến việc khi client gửi lại request (do double-click nút Thanh toán hoặc mạng bị timeout tự động retry), đơn hàng đã hoàn tất tiếp tục bị trừ kho lần thứ 2, làm sai lệch nghiêm trọng số liệu tồn kho thực tế.
- **Cơ chế Bảo vệ Kép (Two-Layer Defense Guard)**:
  - **Lớp 1 (Domain State Guard)**: Phương thức `order.Complete()` kiểm tra: nếu `Status == OrderStatus.Completed` thì ném `BusinessException("TooHungry:Order:AlreadyCompleted")`.
  - **Lớp 2 (AppService Status Guard)**: Trong `OrderAppService.UpdateAsync` và `CompletePaymentAsync`:
    ```csharp
    if (oldStatus == OrderStatus.Completed)
    {
        throw new BusinessException("TooHungry:Order:AlreadyCompleted");
    }
    ```
- **Ma trận Khẳng định Kiểm thử (Test Assertions)**:
  - Lần gọi 1: Đơn hàng chuyển sang `Completed`, tồn kho giảm đúng $X$ đơn vị, sinh $N$ bản ghi `InventoryTransaction`.
  - Lần gọi 2 (Idempotency Call):
    + `Should.ThrowAsync<BusinessException>` với mã lỗi `"TooHungry:Order:AlreadyCompleted"`.
    + Truy vấn lại `InventoryBatch.RemainingQuantity` từ CSDL: số lượng tồn kho bằng chính xác số lượng sau lần gọi 1 ($S_2 == S_1$).
    + Truy vấn lại bảng `InventoryTransactions`: tổng số bản ghi giao dịch kho gắn với đơn hàng này bằng chính xác số lượng sau lần gọi 1 ($Count_2 == Count_1$).
- **Kết luận**: Khẳng định tuyệt đối việc trừ kho lặp lại không thể xảy ra dưới bất kỳ hình thức nào.

---

### Nghiên cứu 4: Chiến lược Kiểm thử Hồi quy Toàn diện cho Bàn ăn & Đơn hàng

- **Chuyển bàn (`TransferTableAsync`)**:
  - Bàn nguồn đang `Occupied`, có đơn hàng active và `OccupiedTime = T_0`. Bàn đích đang `Available`.
  - Kết quả kiểm thử:
    + Bàn đích chuyển thành `Occupied`, kế thừa đúng `OccupiedTime = T_0`, active order được gán sang bàn đích.
    + Bàn nguồn chuyển sang `Cleaning` (nếu đã có đơn ăn uống) hoặc `Available` (nếu bàn chưa gọi món).
    + Ghi chú của đơn hàng được cập nhật thêm nguồn gốc chuyển bàn: `"[Chuyển từ Bàn X]: <note>"`.
    + Kiểm thử các ca biên: Chuyển cùng 1 bàn (`TableSameSourceAndTarget`), Bàn nguồn không có khách (`TableSourceNotOccupied`), Bàn đích đang có khách (`TableTargetNotEmpty`).
- **Gộp bàn (`MergeTablesAsync` - Khắc phục Backend #16)**:
  - Vấn đề cũ: Khi gộp bàn, các món trùng nhau bị cộng dồn theo giá của đơn chính làm sai tiền nếu giá khác nhau, và mất ghi chú `Note` của bàn phụ.
  - Kết quả kiểm thử:
    + Đơn chính: Các món trùng nhau được cộng dồn số lượng, đơn giá được nạp lại từ bảng `Dishes` trong CSDL (`Dish.Price`), ghi chú được ghép nối: `"{primary.Note} | [Gộp từ {secondary.Name}: {secondary.Note}]"`.
    + Tổng tiền đơn chính được tính toán lại chính xác: `RecalculateTotalAmount()`.
    + Đơn phụ chuyển sang trạng thái `Cancelled` với ghi chú: `"[Đã gộp vào {primary.Name} (#{primaryOrder.OrderNumber})]"`.
    + Bàn phụ giải phóng chuyển sang `Cleaning`.
- **Hủy đơn hoạt động (`CancelActiveOrderAsync`)**:
  - Đơn chuyển sang `Cancelled`, bàn ăn chuyển về `Available`, kho hàng không bị trừ.

---

### Nghiên cứu 5: Chiến lược Kiểm thử Cân đối Kiểm kê Kho & Thuật toán Xuất kho FEFO

- **Kiểm kê cân đối kho (`StockAdjustment` - Khắc phục Backend #25)**:
  - Vấn đề cũ: Lô điều chỉnh tăng có `PurchaseUnit = "BaseUnit"` (chuỗi literal), `UnitCost = 0` (làm sai giá vốn), hạn sử dụng luôn gán +1 năm kể cả với đồ tươi.
  - Kết quả kiểm thử:
    + Điều chỉnh tăng: Sinh lô kiểm kê mới với `PurchaseUnit = baseUnit`, `UnitCost = estimatedPrice` (giá ước tính từ nguyên liệu), hạn sử dụng hợp lý theo `StorageType` (đồ tươi `Room` 3-7 ngày, đồ đông lạnh `Frozen` 90-180 ngày).
    + Điều chỉnh giảm: Khấu trừ FEFO từ các lô hiện có, không cho phép trừ âm số lượng.
- **Thuật toán xuất kho FEFO (First Expired First Out)**:
  - Tạo 3 lô hàng với ngày hết hạn tăng dần: Lô 1 (hạn 3 ngày, còn 2 đơn vị), Lô 2 (hạn 7 ngày, còn 5 đơn vị), Lô 3 (hạn 30 ngày, còn 10 đơn vị).
  - Khấu trừ 4 đơn vị:
    + Lô 1 bị trừ sạch (còn 0 đơn vị).
    + Lô 2 bị trừ 2 đơn vị (còn 3 đơn vị).
    + Lô 3 giữ nguyên 10 đơn vị.
    + Sinh đúng 2 dòng giao dịch kho `InventoryTransaction`.
  - Lô đã hết hạn (`ExpirationDate < Clock.Now`) bị tự động bỏ qua khi xuất món.

---

## 3. Kiến trúc Các Lớp Kiểm thử & Phân bổ Dự án

Toàn bộ các test classes tuân thủ cấu trúc ABP chuẩn:
1. **Lớp kiểm thử cơ sở & logic trừu tượng**: Đặt tại dự án `test/Acme.TooHungry.Application.Tests/`, kế thừa `TooHungryApplicationTestBase<TStartupModule>`.
2. **Lớp thực thi cụ thể trên SQLite In-Memory**: Đặt tại dự án `test/Acme.TooHungry.EntityFrameworkCore.Tests/EntityFrameworkCore/Applications/`, kế thừa lớp trừu tượng tương ứng với tham số `<TooHungryEntityFrameworkCoreTestModule>` và gắn thuộc tính `[Collection(TooHungryTestConsts.CollectionDefinitionName)]`.

```text
test/Acme.TooHungry.Application.Tests/
├── Security/
│   ├── EndpointAuthorization_Runtime_Tests.cs        # Test ném AbpAuthorizationException khi thiếu quyền
│   └── RoleBasedAuthorization_Tests.cs                # Test ma trận vai trò Waiter, InventoryKeeper, Admin
├── Orders/
│   ├── OrderAppService_Idempotency_Tests.cs           # Test chống trừ kho lặp lại khi gọi Completed
│   └── OrderAppService_SubmitOrder_Concurrency_Tests.cs # Test race condition tạo đơn trên cùng bàn ăn
├── Inventories/
│   ├── InventoryManager_Fefo_Concurrency_Tests.cs     # Test retry concurrency khi trừ kho đa luồng
│   ├── InventoryAppService_StockAdjustment_Tests.cs   # Test cân đối kiểm kê kho đúng giá vốn & hạn dùng
│   └── InventoryManager_Fefo_Consumption_Tests.cs     # Test xuất kho FEFO đa lô theo hạn sử dụng
└── Tables/
    ├── TableAppService_TransferTable_Tests.cs         # Test luồng chuyển bàn và các ca từ chối
    ├── TableAppService_MergeTables_Advanced_Tests.cs  # Test luồng gộp bàn bảo toàn note và đơn giá
    └── TableAppService_CancelOrder_Tests.cs           # Test hủy đơn và giải phóng bàn ăn

test/Acme.TooHungry.EntityFrameworkCore.Tests/EntityFrameworkCore/Applications/
├── EfCoreEndpointAuthorizationRuntimeTests.cs
├── EfCoreRoleBasedAuthorizationTests.cs
├── EfCoreOrderIdempotencyTests.cs
├── EfCoreOrderSubmitOrderConcurrencyTests.cs
├── EfCoreInventoryFefoConcurrencyTests.cs
├── EfCoreInventoryStockAdjustmentTests.cs
├── EfCoreInventoryFefoConsumptionTests.cs
├── EfCoreTableTransferTableTests.cs
├── EfCoreTableMergeTablesAdvancedTests.cs
└── EfCoreTableCancelOrderTests.cs
```

---

## 4. Đánh giá Rủi ro & Giải pháp Khắc phục

| Rủi ro Kỹ thuật | Mức độ | Biện pháp Khắc phục Đã Nghiên cứu |
|---|---|---|
| **Flaky Concurrency Tests** (test đa luồng chạy chập chờn trên các máy cấu hình yếu) | Trung bình | Sử dụng `IServiceScopeFactory.CreateScope()` cô lập DbContext cho từng task; sử dụng `Task.WhenAll` kết hợp `CancellationTokenSource` có timeout 10 giây; assert theo trạng thái CSDL cuối cùng thay vì dựa vào thứ tự thread |
| **Deadlock trong SQLite In-Memory** khi nhiều task cùng ghi dữ liệu | Thấp | Cấu hình `BusyTimeout = 5000ms` trên SQLite connection; các tác vụ concurrency mở transaction ngắn và hoàn tất ngay |
| **Xung đột State giữa các Test Cases** | Thấp | Mỗi test case tự sinh Guid ngẫu nhiên cho tên món ăn, tên bàn, mã đơn (`Guid.NewGuid():N`), dữ liệu luôn độc lập tuyệt đối |
| **Hiệu năng chạy toàn bộ Test Suite** bị kéo dài | Thấp | Sử dụng SQLite in-memory siêu tốc; 100% test case chạy bất đồng bộ; mục tiêu toàn bộ test suite chạy dưới 30 giây |

---

## 5. Kết luận Nghiên cứu

Nghiên cứu khẳng định giải pháp kiểm thử runtime authorization thông qua fake claims scope và kiểm thử tương tranh thông qua DI Scope độc lập hoàn toàn khả thi, đáp ứng 100% các tiêu chí khắt khe của Hiến pháp kỹ thuật `constitution.md`. Bộ kiểm thử này sẽ là lá chắn tự động vững chắc bảo vệ toàn bộ thành quả củng cố kiến trúc từ RM-022 đến RM-025.
