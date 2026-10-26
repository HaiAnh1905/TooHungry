# Đặc tả Tính năng (Feature Specification): Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (Database Query Optimization & Clean Code)

**Mã Tính năng (Feature ID)**: `RM-025`

**Nhánh Tính năng (Feature Branch)**: `025-rm-025-database-query-optimization-and-clean-code`

**Ngày tạo**: 2026-10-23

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-025: *"Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (Database Query Optimization & Clean Code) — Tối ưu hóa hiệu năng tầng dữ liệu EF Core, xử lý triệt để N+1 query, loại bỏ các tác vụ chặn thread, chuẩn hóa exception/logging và dọn dẹp mã nguồn rác toàn dự án"*.
- Tổng hợp 18 phát hiện kỹ thuật trọng yếu từ tài liệu `CODE_REVIEW.md`:
  - **Backend #17**: `TooHungryDbContext.cs`: Unique index `Name` của `RestaurantTable` và `Unit` cần bảo đảm có bộ lọc soft delete (`.HasFilter("[IsDeleted] = 0")`) để cho phép tạo lại tên đã xóa mà không gặp lỗi 500.
  - **Backend #18**: `TooHungryDbContext.cs:310`: Thiếu Unique Index có điều kiện cho `Recipe` đang hoạt động (`DishId`, `IsActive = 1`, `IsDeleted = 0`), tiềm ẩn rủi ro race condition sinh nhiều công thức active cho một món ăn.
  - **Backend #19**: `Recipes/RecipeManager.cs:101-153`: Phiên bản công thức (`BumpVersion`) chỉ tăng số int trên cùng bản ghi nên không lưu vết lịch sử thật; `_ingredientRepository` được inject nhưng không dùng, không kiểm tra nguyên liệu tồn tại hoặc có active hay không.
  - **Backend #20**: Vấn đề N+1 và tải toàn bộ bảng (Over-fetching):
    + `ForecastAppServices.cs:182, 395-399`: `FindAsync` trong vòng lặp lồng nhau, tải toàn bộ Dishes và Recipes cho mỗi DTO; gọi `ToHashSet()` đồng bộ trên `IQueryable`.
    + `RecipeAppService.cs:92-97, 245-249`: Mỗi recipe thực thi một query, mỗi lần tải lại toàn bộ Units.
    + `OrderAppService.cs:352-355, 405-406`: Tải toàn bộ recipe active của toàn bộ nhà hàng thay vì chỉ lọc theo tập hợp `dishIds` trong đơn hàng.
  - **Backend #21**: Truy vấn đồng bộ chặn thread (.NET thread-pool blocking): `TableAppService.cs:46, 121-124, 615-619`, `InventoryManager.cs:53-55, 118-120`. Cần chuyển 100% sang các phương thức bất đồng bộ `await AsyncExecuter.FirstOrDefaultAsync(...)`, `ToListAsync(...)`.
  - **Backend #22**: Lạm dụng `AutoInclude` kéo theo toàn bộ cây quan hệ xuyên aggregate ở các kiểm tra nhẹ (`AnyAsync`, `FirstOrDefaultAsync`); thiếu composite index `Orders(Status, OrderDate)` và unique index cho `OrderNumber`.
  - **Backend #23**: Thiếu phân trang phía server: `InventoryAppService.GetTransactionsAsync` trả về toàn bộ mảng; `GetAlertsAsync` chạy vòng lặp lồng nhau $O(n \times m)$ trong bộ nhớ.
  - **Backend #24**: Cơ chế sinh mã số nghiệp vụ dễ trùng: `ORD-{yyyyMMddHHmmss}`, `BATCH-`, `ADJ-` bị trùng lặp khi có từ 2 yêu cầu trở lên trong cùng 1 giây.
  - **Backend #27**: Vi phạm quy ước Exception & Localization của ABP: Khoảng 25 vị trí ném `UserFriendlyException("...tiếng Việt...")` hardcode; mã lỗi `TooHungry:Order:AlreadyCompleted`/`AlreadyCancelled` thiếu khóa song ngữ; namespace `RecipeIngredient` chưa được cấu hình `MapCodeNamespace`.
  - **Backend #28**: Mô hình thực thể thiếu đóng gói (Anemic Domain Model): `Order`, `OrderItem`, `RestaurantTable`, `Dish`, `Recipe` để mở các public setter; logic đổi trạng thái nằm rải rác ở AppService; đoạn mã reset 8 trường thông tin bàn bị sao chép lặp lại 8 nơi.
  - **Backend #31**: `DashboardAppService.cs:128-135`: Khối lệnh `catch { }` nuốt lỗi không ghi log; sử dụng kiểu `dynamic` và ép kiểu runtime cho dữ liệu tính toán xu hướng doanh thu.
  - **Backend #32**: Tập tin rác và bí mật ở thư mục gốc cần xóa bỏ triệt để: `test.cs` (chứa mật khẩu admin), `Reflect.cs` (chứa mã debug và đường dẫn tuyệt đối máy cá nhân), `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt`.
  - **Backend #33**: Đặt tên, phân tách trách nhiệm (SRP) và dọn dẹp phân quyền:
    + Tách tệp chứa nhiều class: `DishAppServices.cs` thành 2 file riêng (`DishAppService.cs` và `DishCategoryAppService.cs`); `ForecastAppServices.cs` thành `DemandForecastAppService.cs` và `IngredientPlanAppService.cs`.
    + Loại bỏ `UploadImageInput` không dùng đến; chuẩn hóa `OrderAppService` kế thừa `TooHungryAppService`.
    + Xóa bỏ 7 nhóm Permissions khai báo nhưng không dùng đến (`Receivings`, `Wastes`, `Stocktakings`, `Bills`, `Payments`, `UnitConversions`, `StockAdjustments`).
  - **Frontend #25**: Dọn dẹp dead code trên Angular: Xóa các thư mục/thành phần mồ côi (`auth/login/*`, `shared/layout/*`, `shared-modal`, `shared-spinner`, `shared-module.ts`, `permissions.json` rỗng, thư mục `e2e/`).
  - **Frontend #27**: Loại bỏ `console.error` còn sót lại ở `home.component.ts:208`, `recipe.component.ts:189`.
  - **Frontend #28**: `app.config.ts`: Xóa bỏ `HttpClientModule` (đã deprecated trong Angular 18/19) và `FormsModule` import thừa ở cấp root.
  - **Frontend #29**: Kích hoạt cấu hình `strict: true` trong `tsconfig.json` và xử lý các điểm ép kiểu không an toàn.
  - **Frontend #33**: Loại bỏ can thiệp sửa dữ liệu `storageType` trên giao diện, bảo đảm tính nhất quán dữ liệu từ phía máy chủ.
- Tuân thủ Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md) (Domain-Driven Design, ABP Layering, Non-blocking Async, Strict Strong Typing, i18n song ngữ 100% trong `en.json` và `vi.json`).

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 23-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.specify RM-025` - 6 Trụ cột Kỹ thuật Then chốt)

- **Q1: Giải pháp Tối ưu hóa Truy vấn EF Core & Cấu trúc Chỉ mục (Index Optimization & N+1 Elimination)**:
  - **A1**:
    - **Xóa bỏ N+1 query và gom nhóm (Batching Queries)**:
      + Tại `DemandForecastAppService.cs` và `IngredientPlanAppService.cs`: Nghiêm cấm việc gọi `_dishRepository.GetListAsync()` tải toàn bộ danh mục món hoặc gọi `_ingredientRepository.GetAsync()` trong vòng lặp lồng nhau. Thay vào đó, trích xuất danh sách `distinctDishIds` / `distinctIngredientIds` từ DTO/Plan, thực hiện DUY NHẤT một truy vấn `WHERE Id IN (...)` và chuyển thành `Dictionary<Guid, TEntity>` để tra cứu với độ phức tạp $O(1)$.
      + Tại `RecipeAppService.cs`: Khi lấy danh sách công thức, tải danh mục đơn vị tính `Unit` một lần duy nhất qua `GetListAsync()` đưa vào Dictionary, thay vì lặp lại truy vấn tải toàn bộ bảng Units cho từng công thức.
      + Tại `OrderAppService.cs`: Khi kiểm tra công thức để trừ kho hoặc xác thực (`ValidateStockAsync`), chỉ truy vấn các bản ghi `Recipe` có `DishId` nằm trong danh sách các món của đơn hàng hiện tại (`dishIds.Contains(r.DishId)`), tuyệt đối không tải toàn bộ recipe của nhà hàng.
    - **Chuyển 100% Truy vấn Đồng bộ sang Bất đồng bộ (Async/Await Enforcement)**:
      + Thay thế toàn bộ các lời gọi `.FirstOrDefault(...)`, `.ToList()`, `.First()` trực tiếp trên `IQueryable` bằng `await AsyncExecuter.FirstOrDefaultAsync(...)`, `await AsyncExecuter.ToListAsync(...)` tại `TableAppService.cs` (dòng 50, dòng 128, dòng 612) và `InventoryManager.cs` (dòng 55, dòng 132).
      + Loại bỏ triệt để nguy cơ khóa nghẽn thread (.NET ThreadPool Starvation) dưới tải cao.
    - **Tối ưu hóa Index & Cắt giảm `AutoInclude` quá mức**:
      + Thêm composite index `IX_AppOrders_Status_OrderDate` trên bảng `Orders`:
        ```csharp
        b.HasIndex(x => new { x.Status, x.OrderDate });
        ```
      + Thêm Unique Index cho mã đơn hàng `OrderNumber`:
        ```csharp
        b.HasIndex(x => x.OrderNumber).IsUnique().HasFilter("[IsDeleted] = 0");
        ```
      + Bổ sung Unique Filtered Index cho Recipe đang hoạt động chống race condition:
        ```csharp
        b.HasIndex(x => new { x.DishId, x.IsActive })
         .IsUnique()
         .HasFilter("[DishId] IS NOT NULL AND [IsActive] = 1 AND [IsDeleted] = 0");
        ```
      + **Rà soát và tinh giản `AutoInclude`**: Gỡ bỏ `AutoInclude` ở các mối quan hệ xuyên Aggregate không bắt buộc cho tính toàn vẹn tức thời (ví dụ: `Table -> DiningArea`, `Order -> Table`, `OrderItem -> Dish`). Ở các API cần dữ liệu liên kết, sử dụng `.WithDetailsAsync(...)` hoặc phép chiếu LINQ `.Select(...)` tường minh, giúp các lệnh kiểm tra nhẹ (`AnyAsync`, `CountAsync`, lookup đơn giản) chạy nhanh gấp 5-10 lần mà không kéo theo toàn bộ cây thực thể.

- **Q2: Phân trang Chuẩn mực Phía Máy chủ (Server-side Pagination & Aggregation)**:
  - **A2**:
    - **Phân trang Lịch sử Giao dịch Kho (`GetTransactionsAsync`)**:
      + Nâng cấp phương thức tại `IInventoryAppService` và `InventoryAppService`:
        ```csharp
        Task<PagedResultDto<InventoryTransactionDto>> GetTransactionsAsync(Guid ingredientId, PagedAndSortedResultRequestDto input);
        ```
      + Áp dụng `queryable.PageBy(input.SkipCount, input.MaxResultCount)` trực tiếp từ CSDL, sắp xếp mặc định theo `CreationTime DESC`.
      + Ngăn chặn rủi ro tràn bộ nhớ khi lịch sử giao dịch nguyên liệu tăng lên hàng chục nghìn bản ghi.
    - **Tối ưu Hóa Cảnh báo Kho Hàng (`GetAlertsAsync`)**:
      + Thay vì tải toàn bộ danh sách lô hàng (`InventoryBatches`) và danh mục nguyên liệu (`Ingredients`) vào RAM rồi chạy vòng lặp lồng nhau $O(n \times m)$, thực hiện tính toán tổng tồn kho theo nguyên liệu trực tiếp bằng truy vấn gom nhóm của EF Core (`GroupBy(b => b.IngredientId).Select(...)`).
      + Chỉ kéo về bộ nhớ các bản ghi vi phạm điều kiện cảnh báo (hết hạn, sắp hết hạn trong 3 ngày, hoặc tồn kho < `MinStock`), giảm thời gian phản hồi API từ hàng trăm milliseconds xuống dưới 50ms.

- **Q3: Tái cấu trúc Rich Domain Model & Cơ chế Sinh mã Nghiệp vụ Không Xung đột**:
  - **A3**:
    - **Đóng gói Domain Entities (Rich Domain Model)**:
      + Đóng kín public setters của các trường dữ liệu cốt lõi và trạng thái (`Order`, `OrderItem`, `RestaurantTable`, `Dish`, `Recipe`) thành `protected set;` hoặc `private set;`.
      + Chuẩn hóa các Domain Methods tường minh trên `RestaurantTable`:
        * `table.Occupy(DateTime occupiedTime)`: Chuyển sang `Occupied`, lưu mốc thời gian khách ngồi, xóa thông tin đặt chỗ cũ.
        * `table.Release()`: Chuyển về `Available`, xóa sạch `OccupiedTime` và toàn bộ 5 trường thông tin khách đặt bàn (`Reserved*`). Gom toàn bộ đoạn mã reset trùng lặp 8 lần vào duy nhất phương thức này.
        * `table.MarkCleaning()`: Chuyển trạng thái bàn sang `Cleaning`.
      + Chuẩn hóa các Domain Methods trên `Order`:
        * `order.Complete()` và `order.Cancel()` đã có, bổ sung `order.SetTable(Guid? tableId)` và `order.UpdateTotalAmount(decimal totalAmount)`.
    - **Cơ chế Sinh mã Nghiệp vụ Không Xung đột (Collision-Free Code Generation)**:
      + Xóa bỏ logic tự sinh mã đơn giản dạng `$"ORD-{Clock.Now:yyyyMMddHHmmss}"` và `$"BATCH-{now:yyyyMMddHHmmss}"`.
      + Chuẩn hóa cấu trúc mã số có kèm hậu tố ngẫu nhiên an toàn:
        * Mã đơn hàng: `$"ORD-{Clock.Now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..22].ToUpperInvariant()` (ví dụ: `ORD-20261023134500-A1B2`).
        * Mã lô hàng: `$"BATCH-{Clock.Now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..24].ToUpperInvariant()`.
      + Cam kết 100% không bao giờ xảy ra đụng độ mã định danh (Unique Constraint Violation) dù hàng trăm người dùng cùng tạo đơn hoặc nhập kho trong cùng một giây.
    - **Hoàn thiện Nghiệp vụ Versioning & Kiểm tra Nguyên liệu tại `RecipeManager`**:
      + Khi cập nhật công thức làm thay đổi định lượng hoặc danh sách nguyên liệu (`BumpVersion`): Bản ghi công thức hiện tại được cập nhật số phiên bản (`recipe.BumpVersion()`), đồng thời lưu vết snapshot dữ liệu (các dòng nguyên liệu và tỉ lệ chuyển đổi) bảo đảm phục vụ tra cứu lịch sử định lượng món ăn.
      + Kiểm tra hợp lệ nguyên liệu: Trước khi lưu công thức, sử dụng `_ingredientRepository` để kiểm tra toàn bộ `ingredientId` trong danh sách: bảo đảm 100% nguyên liệu tồn tại trong hệ thống và đang ở trạng thái hoạt động (`IsActive == true`). Nếu có nguyên liệu bị vô hiệu hóa hoặc không tồn tại, lập tức từ chối với lỗi nghiệp vụ chuẩn `BusinessException`.

- **Q4: Chuẩn hóa Toàn diện Exception, Logging & ABP Localization**:
  - **A4**:
    - **Triệt tiêu 100% `UserFriendlyException` Hardcode Tiếng Việt**:
      + Rà soát và thay thế toàn bộ ~25 vị trí ném `UserFriendlyException("chuỗi tiếng Việt...")` thành `BusinessException(TooHungryDomainErrorCodes.XYZ)`.
      + Khai báo các hằng số mã lỗi rõ ràng trong `TooHungryDomainErrorCodes.cs`:
        * Bàn ăn & Khu vực: `Table:NameRequired`, `Table:InvalidCapacity`, `Table:NameAlreadyExists`, `Table:AreaInactive`, `Table:CannotEditOccupied`, `Table:CannotDeleteOccupied`, `Table:CannotDeleteWithOrders`, `Table:Inactive`, `Table:Cleaning`, `Table:AlreadyOccupied`, `Table:PendingPayment`, `Table:SameSourceAndTarget`, `Table:SourceNotOccupied`, `Table:TargetNotEmpty`, `Table:BothMustBeOccupied`.
        * Món ăn & Danh mục: `Dish:NegativePrice`, `Dish:NameAlreadyExists`, `DishCategory:CannotDeleteWithDishes`, `DishCategory:NameAlreadyExists`.
        * Đơn vị tính: `Unit:NameAlreadyExists`, `Unit:CannotDeleteDefault`, `Unit:CannotDeleteInUse`.
        * Dự báo nhu cầu: `Forecast:InvalidDateRange`, `Forecast:NegativeQuantity`.
        * Công thức: `Recipe:IngredientNotActiveOrNotFound`.
      + Cập nhật đồng bộ 100% các cặp khóa - giá trị vào cả 2 tệp `vi.json` và `en.json`.
    - **Cấu hình `MapCodeNamespace`**:
      + Bổ sung cấu hình `options.MapCodeNamespace("RecipeIngredient", typeof(TooHungryResource));` vào `TooHungryDomainSharedModule.cs` để ABP tự động phân giải mã lỗi thuộc namespace này.
    - **Chuẩn hóa Xử lý Lỗi & Logging tại `DashboardAppService`**:
      + Xóa bỏ hoàn toàn khối lệnh `catch { alerts = new List<InventoryAlertDto>(); }`.
      + Thay thế bằng cơ chế ghi log chuẩn:
        ```csharp
        try
        {
            alerts = await _inventoryAppService.GetAlertsAsync() ?? new();
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Không thể lấy danh sách cảnh báo tồn kho cho Dashboard. Sử dụng danh sách rỗng dự phòng.");
            alerts = new();
        }
        ```
      + Thay thế kiểu dữ liệu `dynamic` và ép kiểu runtime tại `CalculateRevenueTrend` bằng C# `record OrderTrendSummary(DateTime OrderDate, decimal TotalAmount)` định kiểu mạnh tuyệt đối.
    - **Chuẩn hóa Kế thừa & Vệ sinh Quyền hạn**:
      + Cho `OrderAppService` kế thừa từ `TooHungryAppService` để thống nhất chuẩn kiến trúc toàn bộ ứng dụng.
      + Loại bỏ 7 nhóm quyền không dùng đến (`Receivings`, `Wastes`, `Stocktakings`, `Bills`, `Payments`, `UnitConversions`, `StockAdjustments`) khỏi `TooHungryPermissions.cs` và `TooHungryPermissionDefinitionProvider.cs`.

- **Q5: Tách Tệp Đơn Trách Nhiệm (Single Responsibility Principle - SRP)**:
  - **A5**:
    - **Tách `DishAppServices.cs`**:
      + Di chuyển `DishCategoryAppService` sang tệp độc lập `Acme.TooHungry.Application/Dishes/DishCategoryAppService.cs`.
      + Giữ `DishAppService` độc lập tại `Acme.TooHungry.Application/Dishes/DishAppService.cs`.
    - **Tách `ForecastAppServices.cs`**:
      + Di chuyển `IngredientPlanAppService` sang tệp độc lập `Acme.TooHungry.Application/Forecasts/IngredientPlanAppService.cs`.
      + Giữ `DemandForecastAppService` độc lập tại `Acme.TooHungry.Application/Forecasts/DemandForecastAppService.cs`.

- **Q6: Vệ sinh Mã nguồn Rác Toàn Diện (Sanitation, Dead Code & Frontend Strict Mode)**:
  - **A6**:
    - **Xóa bỏ các tập tin rác ở thư mục gốc**:
      + Xóa `test.cs` (chứa password admin nguy hiểm), `Reflect.cs` (hardcode path cá nhân), `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt`.
    - **Dọn dẹp Frontend Angular**:
      + Xóa các thư mục và component mồ côi: `angular/src/app/auth/login/*`, `angular/src/app/shared/layout/*`, `angular/src/app/shared/components/modal/`, `angular/src/app/shared/components/spinner/`, `angular/src/app/shared/shared-module.ts`.
      + Xóa tệp rỗng `angular/permissions.json` và thư mục `angular/e2e/`.
      + Xóa bỏ `HttpClientModule` (deprecated) và `FormsModule` khỏi `importProvidersFrom` trong `app.config.ts`.
      + Dọn dẹp các lệnh `console.error` còn sót ở `home.component.ts` và `recipe.component.ts`.
      + Bật cấu hình `"strict": true` trong `angular/tsconfig.json`, bảo đảm ứng dụng Angular biên dịch không có cảnh báo nghiêm trọng.

### Phiên Phỏng vấn Làm rõ Chuyên sâu 23-10-2026 (Interactive Clarification Session `/speckit.clarify RM-025`)

- **Q1: Chiến lược lưu vết lịch sử phiên bản công thức món ăn (Recipe Version History) khi gọi `BumpVersion`**:
  - **A1**: Áp dụng Option A (Clone Snapshot Cũ) — Khi người dùng điều chỉnh nguyên liệu hoặc định lượng món ăn (`BumpVersion`), hệ thống tạo một bản sao (clone) của công thức cũ cùng toàn bộ nguyên liệu liên kết với trạng thái `IsActive = false` làm bản ghi lịch sử lưu vết (Historical Snapshot). Bản ghi công thức chính được cập nhật phiên bản mới (`Version++`) và duy trì `IsActive = true`. Thiết kế này không cần tạo bảng CSDL mới, khớp hoàn hảo với Unique Filtered Index `(DishId, IsActive = 1)`, và bảo đảm 100% khả năng đối soát định lượng trong quá khứ.
- **Q2: Định dạng cấu trúc sinh mã số nghiệp vụ an toàn cho đơn hàng (`OrderNumber`) và lô kho (`BatchCode`)**:
  - **A2**: Áp dụng Option A (Date-Time + Salt ngẫu nhiên 4 ký tự) — Chuẩn hóa định dạng `ORD-{yyyyMMddHHmmss}-{salt4}` (ví dụ: `ORD-20261023135500-A1B2`) và `BATCH-{yyyyMMddHHmmss}-{salt4}`. Giữ nguyên tính trực quan của mốc thời gian để nhân viên dễ nhận diện ca làm việc và ngày tạo, kết hợp hậu tố ngẫu nhiên 4 ký tự hex an toàn giúp triệt tiêu 100% nguy cơ trùng lặp mã số trong cùng một giây dưới mọi mức tải tương tranh mà không phải duy trì cơ chế sequence phức tạp.
- **Q3: Chiến lược cắt giảm `AutoInclude` trong `TooHungryDbContext` bảo toàn nguyên tắc DDD**:
  - **A3**: Áp dụng Option A (Gỡ bỏ AutoInclude xuyên Aggregate) — Gỡ bỏ hoàn toàn `AutoInclude` ở các quan hệ xuyên Aggregate (`Order.Table`, `OrderItem.Dish`, `Dish.DishCategory`, `RestaurantTable.DiningArea`, `DailyMenuItem.Dish`, `InventoryBatch.Ingredient`, `InventoryTransaction.Ingredient`). Chỉ duy trì `AutoInclude` đối với các thực thể con nội bộ trong cùng Aggregate Root (`Order.Items`, `DailyMenu.Items`, `DemandForecast.Items`, `IngredientPlan.Items`, `Recipe.Ingredients`). Ở các Application Service hoặc API cần nạp thực thể liên kết bên ngoài để hiển thị, bắt buộc sử dụng `.WithDetailsAsync(...)` hoặc phép chiếu LINQ `.Select(...)` tường minh.
- **Q4: Chiến lược kích hoạt TypeScript Strict Mode trong `tsconfig.json` của Angular**:
  - **A4**: Áp dụng Option A (Kích hoạt Toàn diện) — Bật cấu hình `"strict": true` toàn diện (bao gồm `strictNullChecks`, `noImplicitAny`, `strictPropertyInitialization`). Chuẩn hóa các interface/DTO định kiểu mạnh cho toàn bộ state và form trên Frontend, xử lý triệt để null-safety bằng Optional Chaining (`?.`) và Nullish Coalescing (`??`), loại bỏ hoàn toàn các điểm ép kiểu nguy hiểm `as any`, bảo đảm quá trình đóng gói production không có bất kỳ lỗi biên dịch nào.




---


## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Tối ưu Hóa Hiệu Năng Truy Vấn & Xử Lý Bất Đồng Bộ Không Chặn (Ưu tiên: P1)

Là **Kỹ sư Hệ thống / Quản trị viên**, tôi muốn các truy vấn CSDL được tối ưu hóa chỉ mục, loại bỏ hoàn toàn các vòng lặp N+1 và các thao tác đồng bộ chặn thread, để hệ thống luôn phản hồi tức thì dưới tải cao, không làm đơ worker thread và không gây quá tải CSDL.

**Lý do cho mức độ ưu tiên này**: Đây là cốt lõi về hiệu năng và độ ổn định của toàn bộ hệ thống bán hàng và quản trị nhà hàng. Loại bỏ N+1 và thread blocking ngăn ngừa triệt để lỗi nghẽn cổ chai (bottleneck) khi có nhiều nhân viên phục vụ và thu ngân cùng lúc thao tác.

**Kiểm thử Độc lập**: Có thể kiểm thử độc lập thông qua việc giám sát log EF Core SQL (xem số lượng câu lệnh SQL sinh ra cho mỗi request giảm từ $O(N)$ xuống $O(1)$) và kiểm tra không có bất kỳ lệnh `.ToList()` / `.FirstOrDefault()` đồng bộ nào chạy trên `IQueryable`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** màn hình Dự báo nhu cầu hoặc Kế hoạch nguyên liệu có 50 món ăn, **Khi** người dùng xem báo cáo tài chính hoặc kế hoạch nguyên liệu (`GetFinancialSummaryAsync`, `GetByForecastIdAsync`), **Thì** hệ thống chỉ thực hiện đúng 1 truy vấn SQL nạp các món/nguyên liệu liên quan theo danh sách ID gom nhóm, không lặp lại truy vấn theo từng món ăn.
2. **Cho trước** chức năng tra cứu bàn ăn hoặc tính toán khấu trừ kho, **Khi** các service `TableAppService` và `InventoryManager` thực thi truy vấn dữ liệu từ CSDL, **Thì** 100% các câu lệnh đều sử dụng toán tử bất đồng bộ (`await AsyncExecuter.FirstOrDefaultAsync`, `await AsyncExecuter.ToListAsync`), không có luồng nào của .NET ThreadPool bị chặn đứng đồng bộ.
3. **Cho trước** thao tác tìm kiếm hoặc lọc đơn hàng theo trạng thái và thời gian, **Khi** truy vấn bảng `Orders`, **Thì** CSDL kích hoạt chỉ mục kết hợp `IX_AppOrders_Status_OrderDate` và trả về kết quả trong thời gian dưới 50ms.
4. **Cho trước** hai yêu cầu kích hoạt công thức món ăn đồng thời, **Khi** xảy ra tranh chấp cập nhật công thức active, **Thì** Unique Filtered Index `IX_AppRecipes_DishId_IsActive` ngăn chặn tuyệt đối việc sinh ra 2 công thức cùng ở trạng thái `IsActive = 1` cho một món ăn.

---

### User Story 2 - Phân Trang Máy Chủ Chuẩn Mực & Tối Ưu Cảnh Báo Kho (Ưu tiên: P1)

Là **Thủ kho / Quản lý Nhà hàng**, tôi muốn lịch sử giao dịch kho và danh sách cảnh báo tồn kho được phân trang và gom nhóm xử lý hiệu quả tại CSDL, để khi số lượng giao dịch kho lên tới hàng nghìn bản ghi, trang giao diện vẫn tải nhẹ nhàng và không bao giờ bị tràn RAM máy chủ.

**Lý do cho mức độ ưu tiên này**: Phân hệ kho hàng tích lũy dữ liệu rất nhanh theo từng lần nhập lô, xuất hủy và xuất theo công thức. Thiếu phân trang server sẽ nhanh chóng làm chậm toàn bộ hệ thống kho.

**Kiểm thử Độc lập**: Gọi API `GetTransactionsAsync` với các tham số phân trang (`SkipCount = 0`, `MaxResultCount = 10`) và xác nhận kết quả trả về đúng kiểu `PagedResultDto` với `TotalCount` tổng thể chính xác và chỉ trả về đúng số lượng bản ghi yêu cầu.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** một nguyên liệu có 2.000 bản ghi lịch sử giao dịch kho, **Khi** Thủ kho mở xem lịch sử giao dịch với `SkipCount = 0` và `MaxResultCount = 20`, **Thì** API trả về đúng 20 bản ghi mới nhất kèm `TotalCount = 2000`, thời gian phản hồi dưới 100ms.
2. **Cho trước** kho hàng có 100 nguyên liệu và 500 lô hàng, **Khi** hệ thống gọi `GetAlertsAsync()`, **Thì** CSDL thực hiện gom nhóm tính toán trực tiếp trên SQL, chỉ trả về các nguyên liệu thực sự vi phạm ngưỡng tồn hoặc cận hạn, không kéo toàn bộ 500 lô vào bộ nhớ ứng dụng.

---

### User Story 3 - Đóng Gói Rich Domain Model & Sinh Mã Nghiệp Vụ An Toàn (Ưu tiên: P2)

Là **Lập trình viên / Kiến trúc sư Hệ thống**, tôi muốn các thực thể domain đóng gói chặt chẽ các trường trạng thái, logic đổi trạng thái bàn ăn tập trung vào phương thức domain duy nhất, và cơ chế sinh mã nghiệp vụ chống trùng lặp, để mã nguồn tuân thủ nguyên tắc DDD, không bị rò rỉ logic ra AppService và không phát sinh lỗi trùng mã đơn/mã lô dưới tương tranh.

**Lý do cho mức độ ưu tiên này**: Xóa bỏ Anemic Domain Model và loại bỏ 8 đoạn code reset trạng thái bàn lặp lại giúp hệ thống dễ bảo trì, ngăn ngừa sai lệch dữ liệu bàn ăn và đơn hàng.

**Kiểm thử Độc lập**: Kiểm tra lớp thực thể `RestaurantTable` và `Order` không cho phép gán trực tiếp thuộc tính trạng thái từ bên ngoài; kiểm tra phương thức `table.Release()` thực hiện đầy đủ việc dọn sạch thông tin bàn; thực hiện tạo 50 đơn hàng đồng thời trong 1 giây để xác minh không trùng mã đơn.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** một bàn ăn đang có khách hoặc đang dọn dẹp, **Khi** gọi phương thức `table.Release()`, **Thì** bàn lập tức chuyển về trạng thái `Available`, `OccupiedTime` chuyển về `null`, và toàn bộ 5 trường đặt bàn (`ReservedCustomerName`, `Phone`, `Time`, `GuestCount`, `Note`) đều được làm sạch hoàn toàn tại một nơi tập trung duy nhất.
2. **Cho trước** 50 yêu cầu tạo đơn hàng hoặc nhập lô kho phát sinh trong cùng một tích tắc thời gian, **Khi** mã đơn hàng và mã lô được sinh ra, **Thì** 100% các mã số đều duy nhất tuyệt đối nhờ chuỗi ngẫu nhiên an toàn kết hợp với mốc thời gian, không phát sinh ngoại lệ trùng lặp khóa chính hoặc khóa duy nhất.
3. **Cho trước** thao tác cập nhật công thức món ăn tại `RecipeManager`, **Khi** danh sách nguyên liệu chứa một nguyên liệu không tồn tại hoặc đã bị vô hiệu hóa (`IsActive = false`), **Thì** hệ thống ném ngoại lệ nghiệp vụ chuẩn `BusinessException` và từ chối cập nhật công thức.

---

### User Story 4 - Chuẩn Hóa Ngoại Lệ Nghiệp Vụ, Đa Ngôn Ngữ & Nhật Ký Dashboard (Ưu tiên: P2)

Là **Người dùng Nhà hàng & Đội ngũ Vận hành**, tôi muốn mọi thông báo lỗi từ hệ thống đều hiển thị chuẩn ngữ cảnh bằng ngôn ngữ của tôi (Tiếng Việt hoặc Tiếng Anh), không bị lỗi tiếng Việt viết cứng trong mã nguồn, và các lỗi hệ thống trên Dashboard được ghi nhận nhật ký chi tiết thay vì bị che giấu âm thầm.

**Lý do cho mức độ ưu tiên này**: Chuẩn hóa Exception và i18n là yêu cầu bất biến của Hiến pháp dự án. Thay thế `UserFriendlyException` hardcode bằng mã lỗi định kiểu giúp ứng dụng chuyên nghiệp và hỗ trợ đa ngôn ngữ hoàn hảo.

**Kiểm thử Độc lập**: Kiểm tra `TooHungryDomainErrorCodes.cs` chứa đầy đủ các hằng số mã lỗi; kiểm tra `vi.json` và `en.json` chứa 100% bản dịch tương ứng; kích hoạt lỗi cảnh báo kho trên Dashboard và kiểm tra log console/file ghi nhận cảnh báo rõ ràng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** người dùng chọn giao diện Tiếng Anh, **Khi** thực hiện một hành vi vi phạm nghiệp vụ bàn ăn (ví dụ thêm bàn vào khu vực bị vô hiệu hóa), **Thì** hệ thống trả về thông báo lỗi bằng Tiếng Anh chuẩn từ `en.json`, không xuất hiện bất kỳ câu chữ tiếng Việt hardcode nào từ phía máy chủ.
2. **Cho trước** dịch vụ lấy cảnh báo tồn kho gặp sự cố tạm thời khi người dùng mở Dashboard, **Khi** `DashboardAppService` bắt ngoại lệ, **Thì** hệ thống ghi nhận thông tin cảnh báo đầy đủ vào `Logger.LogWarning`, đồng thời trả về danh sách rỗng để màn hình Dashboard vẫn hiển thị an toàn các chỉ số doanh thu khác mà không làm sập giao diện.
3. **Cho trước** hàm tính toán xu hướng doanh thu `CalculateRevenueTrend`, **Khi** xử lý danh sách đơn hàng, **Thì** toàn bộ dữ liệu được ép kiểu mạnh qua cấu trúc C# `record`, không sử dụng kiểu dữ liệu lỏng lẻo `dynamic`.

---

### User Story 5 - Đơn Trách Nhiệm Tệp Mã Nguồn & Vệ Sinh Mã Rác (Clean Code & Sanitation) (Ưu tiên: P3)

Là **Kỹ sư Phát triển Mã Nguồn**, tôi muốn dự án được dọn dẹp sạch sẽ toàn bộ các tập tin rác ở thư mục gốc, tách rời các file chứa nhiều class để tuân thủ nguyên tắc Single Responsibility, xóa bỏ các permissions mồ côi và dead code phía Angular, để cấu trúc dự án tinh gọn, bảo mật và dễ mở rộng.

**Lý do cho mức độ ưu tiên này**: Loại bỏ tập tin chứa mật khẩu admin (`test.cs`) và đường dẫn máy cá nhân (`Reflect.cs`) là yêu cầu an ninh bắt buộc; dọn dẹp dead code giúp giảm dung lượng bundle và tăng tốc độ biên dịch.

**Kiểm thử Độc lập**: Kiểm tra thư mục gốc không còn tồn tại các tập tin rác; kiểm tra `DishAppServices.cs` và `ForecastAppServices.cs` đã được tách thành các file riêng biệt với đúng 1 class chính/file; kiểm tra `npm run build` trên Angular thành công trơn tru.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** thư mục gốc của repository, **Khi** kiểm tra danh sách tập tin, **Thì** các file `test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt` đã bị xóa bỏ hoàn toàn khỏi hệ thống kiểm soát phiên bản Git.
2. **Cho trước** thư mục `Application/Dishes` và `Application/Forecasts`, **Khi** kiểm tra cấu trúc mã nguồn, **Thì** mỗi tệp chỉ chứa duy nhất một lớp Application Service tương ứng (`DishAppService.cs`, `DishCategoryAppService.cs`, `DemandForecastAppService.cs`, `IngredientPlanAppService.cs`).
3. **Cho trước** danh sách quyền hệ thống trong `TooHungryPermissions.cs`, **Khi** kiểm tra cây phân quyền, **Thì** 7 nhóm quyền không sử dụng (`Receivings`, `Wastes`, `Stocktakings`, `Bills`, `Payments`, `UnitConversions`, `StockAdjustments`) đã được dọn sạch hoàn toàn.

---

### User Story 6 - Chuẩn Hóa Kiến Trúc Frontend Angular & Chế Độ Kiểu Nghiêm Ngặt (Strict Mode) (Ưu tiên: P3)

Là **Kỹ sư Frontend**, tôi muốn mã nguồn Angular kích hoạt chế độ TypeScript Strict Mode, loại bỏ các module đã lỗi thời (`HttpClientModule`), dọn dẹp các component chết và không còn lệnh `console.error` rải rác, để giao diện vận hành ổn định, hiện đại và đạt chất lượng kiểm thử tĩnh cao nhất.

**Lý do cho mức độ ưu tiên này**: Chế độ Strict Mode bảo vệ mã nguồn khỏi các lỗi `null`/`undefined` tiềm ẩn ở thời gian chạy và nâng cao độ an toàn kiểu dữ liệu cho toàn bộ ứng dụng.

**Kiểm thử Độc lập**: Chạy lệnh `npm run build` trên thư mục `angular/` với cấu hình `"strict": true` trong `tsconfig.json` và xác nhận tiến trình đóng gói bundle hoàn tất thành công mà không có lỗi biên dịch.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** tệp cấu hình `angular/tsconfig.json`, **Khi** cấu hình `"strict": true` được kích hoạt, **Thì** mã nguồn toàn bộ ứng dụng Angular vượt qua khâu kiểm tra kiểu tĩnh mà không phát sinh lỗi ép kiểu `any` nguy hiểm.
2. **Cho trước** tệp khởi tạo ứng dụng `angular/src/app/app.config.ts`, **Khi** kiểm tra danh sách providers, **Thì** `HttpClientModule` (deprecated) và `FormsModule` import thừa ở cấp root đã được dọn dẹp, thay thế bằng cơ chế cấu hình hiện đại chuẩn Angular standalone.
3. **Cho trước** thư mục `angular/src/app`, **Khi** rà soát cấu trúc thư mục, **Thì** các thư mục/thành phần mồ côi (`auth/login`, `shared/layout`, `shared-modal`, `shared-spinner`, `shared-module.ts`, `permissions.json` rỗng, `e2e/`) đã bị xóa bỏ hoàn toàn.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001**: Chuyện gì xảy ra khi hai người dùng cùng cập nhật công thức hoạt động cho một món ăn trong cùng một thời điểm?
  - *Xử lý*: Unique Filtered Index `IX_AppRecipes_DishId_IsActive` trên SQL Server sẽ bắt chặn thao tác thứ hai, EF Core ném `DbUpdateException`. Hệ thống bắt ngoại lệ này và ném ra lỗi nghiệp vụ chuẩn `BusinessException("TooHungry:Recipe:ActiveRecipeAlreadyExists")` thông báo nhẹ nhàng cho người dùng, bảo đảm không bao giờ có 2 công thức active cùng tồn tại cho 1 món.
- **EC-002**: Chuyện gì xảy ra khi dịch vụ kiểm kê hoặc cảnh báo kho gặp dữ liệu nguyên liệu có `RemainingQuantity = 0` hoặc bị xóa mềm?
  - *Xử lý*: Truy vấn gom nhóm lọc chính xác điều kiện `IsActive == true && IsDeleted == false && RemainingQuantity > 0`, bỏ qua các lô đã dùng hết hoặc đã xóa mềm, tránh việc tính toán sai lệch tồn kho.
- **EC-003**: Chuyện gì xảy ra khi tạo lại một Bàn ăn hoặc Đơn vị tính có tên trùng với bản ghi đã bị xóa mềm trước đó?
  - *Xử lý*: Nhờ bộ lọc `.HasFilter("[IsDeleted] = 0")` trên Unique Index, thao tác thêm mới hoàn toàn thành công mà không bị xung đột khóa duy nhất với bản ghi cũ đã xóa mềm.
- **EC-004**: Chuyện gì xảy ra khi một nguyên liệu có hàng trăm nghìn giao dịch kho được yêu cầu tra cứu lịch sử?
  - *Xử lý*: Nhờ cơ chế phân trang phía máy chủ (`PagedAndSortedResultRequestDto`), CSDL chỉ nạp đúng số lượng bản ghi yêu cầu (ví dụ 10 hoặc 20 dòng), hoàn toàn triệt tiêu rủi ro ứng dụng bịOutOfMemory hoặc đóng băng giao diện.
- **EC-005**: Chuyện gì xảy ra khi dịch vụ Dashboard gặp lỗi từ một trong các dịch vụ phụ trợ (ví dụ kết nối mạng tới module kho bị trễ)?
  - *Xử lý*: Khối `try-catch` có ghi log `Logger.LogWarning` sẽ ghi lại chi tiết vết lỗi phục vụ điều tra của lập trình viên, đồng thời trả về giá trị mặc định an toàn cho phần giao diện đó, cho phép Dashboard vẫn nạp thành công các chỉ số doanh thu và biểu đồ còn lại.
- **EC-006**: Chuyện gì xảy ra khi kích hoạt TypeScript `strict: true` làm lộ ra các biến có nguy cơ `null` hoặc `undefined`?
  - *Xử lý*: Bổ sung kiểm tra điều kiện an toàn (Optional Chaining `?.` hoặc Nullish Coalescing `??`) tại các vị trí truy cập dữ liệu, tuyệt đối không dùng ép kiểu cẩu thả `as any` để vượt qua bộ kiểm tra kiểu.

---

## Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI loại bỏ hoàn toàn các truy vấn N+1 tại `ForecastAppServices.cs`, `RecipeAppService.cs` và `OrderAppService.cs` bằng cách gom nhóm danh sách ID và tra cứu qua Map/Dictionary trong bộ nhớ với độ phức tạp $O(1)$.
- **FR-002**: Hệ thống PHẢI chuyển đổi 100% các truy vấn cơ sở dữ liệu đồng bộ (`.ToList()`, `.FirstOrDefault()`, `.First()`) tại `TableAppService.cs` và `InventoryManager.cs` sang các phương thức bất đồng bộ chuẩn ABP (`AsyncExecuter.ToListAsync`, `AsyncExecuter.FirstOrDefaultAsync`).
- **FR-003**: Hệ thống PHẢI thiết lập chỉ mục kết hợp `Orders(Status, OrderDate)` và Unique Index cho `OrderNumber` trong `TooHungryDbContext.cs`.
- **FR-004**: Hệ thống PHẢI thiết lập Unique Filtered Index cho bảng `Recipes` theo cặp `(DishId, IsActive)` với điều kiện `[DishId] IS NOT NULL AND [IsActive] = 1 AND [IsDeleted] = 0`.
- **FR-005**: Hệ thống PHẢI bảo đảm các Unique Index của `RestaurantTable` và `Unit` có bộ lọc `[IsDeleted] = 0` để cho phép tái sử dụng tên sau khi xóa mềm.
- **FR-006**: Hệ thống PHẢI gỡ bỏ hoàn toàn `AutoInclude` ở các quan hệ xuyên Aggregate (`Order.Table`, `OrderItem.Dish`, `Dish.DishCategory`, `RestaurantTable.DiningArea`, `DailyMenuItem.Dish`, `InventoryBatch.Ingredient`, `InventoryTransaction.Ingredient`), chỉ duy trì `AutoInclude` đối với các thực thể con nội bộ trong cùng Aggregate Root (`Order.Items`, `DailyMenu.Items`, `DemandForecast.Items`, `IngredientPlan.Items`, `Recipe.Ingredients`).
- **FR-007**: Hệ thống PHẢI cung cấp API phân trang phía máy chủ cho `GetTransactionsAsync` nhận `PagedAndSortedResultRequestDto` và trả về `PagedResultDto<InventoryTransactionDto>`.
- **FR-008**: Hệ thống PHẢI tối ưu hóa phương thức `GetAlertsAsync` bằng cách gom nhóm dữ liệu tồn kho trực tiếp từ SQL Server thay vì lặp qua toàn bộ dữ liệu trong bộ nhớ RAM.
- **FR-009**: Hệ thống PHẢI đóng gói mô hình thực thể (Rich Domain Model), đóng kín các public setters của `Order`, `OrderItem`, `RestaurantTable`, `Dish`, `Recipe` thành `protected set;` hoặc `private set;`.
- **FR-010**: Hệ thống PHẢI gom toàn bộ logic đặt lại 8 trường trạng thái bàn ăn bị sao chép rải rác vào duy nhất phương thức domain `table.Release()`.
- **FR-011**: Hệ thống PHẢI cung cấp phương thức domain `table.Occupy(DateTime)` và `table.MarkCleaning()` để quản lý trạng thái bàn ăn tập trung.
- **FR-012**: Hệ thống PHẢI thay thế cơ chế sinh mã `ORD-` và `BATCH-` chỉ dùng timestamp bằng định dạng chuẩn `ORD-{yyyyMMddHHmmss}-{salt4}` và `BATCH-{yyyyMMddHHmmss}-{salt4}` có kèm hậu tố ngẫu nhiên 4 ký tự hex an toàn chống va chạm mã số trong cùng một giây.
- **FR-013**: Hệ thống PHẢI hoàn thiện `RecipeManager`: Kiểm tra sự tồn tại và cờ hoạt động `IsActive` của toàn bộ nguyên liệu qua `_ingredientRepository` trước khi cho phép lưu công thức.
- **FR-014**: Hệ thống PHẢI hoàn thiện cơ chế nâng phiên bản `RecipeManager.BumpVersion` bằng cách nhân bản (clone) công thức cũ sang bản ghi có `IsActive = false` làm snapshot lịch sử, đồng thời tăng `Version++` trên bản ghi chính duy trì `IsActive = true` phục vụ đối soát định lượng quá khứ.
- **FR-015**: Hệ thống PHẢI thay thế toàn bộ ~25 vị trí ném `UserFriendlyException` hardcode Tiếng Việt bằng `BusinessException(TooHungryDomainErrorCodes.XYZ)`.
- **FR-016**: Hệ thống PHẢI định nghĩa đầy đủ các hằng số mã lỗi nghiệp vụ trong `TooHungryDomainErrorCodes.cs`.
- **FR-017**: Hệ thống PHẢI bổ sung đầy đủ 100% các bản dịch tương ứng cho mọi mã lỗi vào cả hai tệp `vi.json` và `en.json`.
- **FR-018**: Hệ thống PHẢI đăng ký cấu hình `options.MapCodeNamespace("RecipeIngredient", typeof(TooHungryResource))` trong `TooHungryDomainSharedModule.cs`.
- **FR-019**: Hệ thống PHẢI xóa bỏ khối lệnh nuốt lỗi `catch { }` không ghi log tại `DashboardAppService.cs` và thay bằng việc ghi log cảnh báo chi tiết qua `Logger.LogWarning`.
- **FR-020**: Hệ thống PHẢI loại bỏ kiểu dữ liệu `dynamic` trong hàm tính toán xu hướng doanh thu tại `DashboardAppService.cs`, thay bằng C# `record` định kiểu mạnh.
- **FR-021**: Hệ thống PHẢI chuẩn hóa `OrderAppService` kế thừa từ `TooHungryAppService` thay vì `ApplicationService` trần.
- **FR-022**: Hệ thống PHẢI xóa bỏ 7 nhóm Permissions không dùng đến (`Receivings`, `Wastes`, `Stocktakings`, `Bills`, `Payments`, `UnitConversions`, `StockAdjustments`) khỏi `TooHungryPermissions.cs` và `TooHungryPermissionDefinitionProvider.cs`.
- **FR-023**: Hệ thống PHẢI tách tệp `DishAppServices.cs` thành `DishAppService.cs` và `DishCategoryAppService.cs`.
- **FR-024**: Hệ thống PHẢI tách tệp `ForecastAppServices.cs` thành `DemandForecastAppService.cs` và `IngredientPlanAppService.cs`.
- **FR-025**: Hệ thống PHẢI xóa bỏ toàn bộ các tập tin rác và bí mật ở thư mục gốc: `test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt`.
- **FR-026**: Hệ thống PHẢI xóa bỏ các thành phần và thư mục mồ côi trên Angular: `auth/login/*`, `shared/layout/*`, `shared-modal`, `shared-spinner`, `shared-module.ts`, `permissions.json` rỗng, thư mục `e2e/`.
- **FR-027**: Hệ thống PHẢI dọn dẹp các lệnh `console.error` còn sót lại ở `home.component.ts` và `recipe.component.ts`.
- **FR-028**: Hệ thống PHẢI xóa bỏ `HttpClientModule` (deprecated) và `FormsModule` import thừa ở cấp root khỏi `angular/src/app/app.config.ts`.
- **FR-029**: Hệ thống PHẢI kích hoạt cấu hình `"strict": true` toàn diện trong `angular/tsconfig.json` (bao gồm `strictNullChecks`, `noImplicitAny`), chuẩn hóa interface/DTO và loại bỏ triệt để các ép kiểu `as any` mà không làm phát sinh lỗi biên dịch.
- **FR-030**: Hệ thống PHẢI bảo đảm mọi logic xử lý `storageType` của nguyên liệu được quản trị nhất quán từ máy chủ, không xử lý tùy tiện bằng mã vá lỗi trên giao diện client.

---

### Các Thực thể Chính (Key Entities)

- **Order (Đơn hàng)**:
  - Aggregate Root quản lý thông tin gọi món ăn tại bàn hoặc mang đi.
  - Được đóng gói thuộc tính (`protected set;`), chuyển trạng thái qua `Complete()`, `Cancel()`, `SetTable()`.
  - Có mã số `OrderNumber` duy nhất không va chạm và chỉ mục kết hợp `(Status, OrderDate)`.
- **RestaurantTable (Bàn ăn)**:
  - Aggregate Root quản lý trạng thái bàn ăn và các khung giờ phục vụ/đặt bàn.
  - Được đóng gói thuộc tính, đóng gói logic reset trạng thái bàn vào phương thức `Release()`, đổi trạng thái qua `Occupy()` và `MarkCleaning()`.
- **Recipe (Công thức món ăn)**:
  - Thực thể định lượng nguyên liệu cấu thành món ăn.
  - Có chỉ mục duy nhất có điều kiện bảo đảm mỗi món ăn chỉ có tối đa một công thức ở trạng thái `IsActive = 1`.
  - Quản lý nâng phiên bản và lưu vết định lượng qua `RecipeManager`.
- **InventoryBatch & InventoryTransaction (Lô hàng & Giao dịch Kho)**:
  - Thực thể quản lý chi tiết xuất nhập tồn theo chuẩn FEFO.
  - Cung cấp API phân trang phía máy chủ cho các giao dịch lịch sử và tính toán cảnh báo tồn kho tối ưu trên SQL.

---

## Tiêu chí Thành công (Success Criteria)

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% các vòng lặp N+1 tại `ForecastAppServices.cs`, `RecipeAppService.cs` và `OrderAppService.cs` được loại bỏ hoàn toàn; số lượng truy vấn SQL sinh ra khi xem dự báo hoặc nạp công thức giảm ít nhất 80% đối với các thực đơn lớn.
- **SC-002**: 100% các câu lệnh EF Core đồng bộ chặn thread (`.ToList()`, `.FirstOrDefault()`, `.First()`) tại `TableAppService` và `InventoryManager` được chuyển đổi sang bất đồng bộ (`AsyncExecuter`), không còn bất kỳ cảnh báo chặn luồng nào trong quá trình kiểm thử.
- **SC-003**: 100% các chỉ mục CSDL mới (`Orders(Status, OrderDate)`, Unique `OrderNumber`, Unique Filtered Recipe `(DishId, IsActive)`) được sinh ra qua EF Core Migration hợp lệ và áp dụng thành công vào CSDL.
- **SC-004**: API lịch sử giao dịch kho `GetTransactionsAsync` hỗ trợ phân trang chuẩn mực 100%, thời gian phản hồi cho trang đầu tiên của một nguyên liệu có 2.000 giao dịch đạt dưới 100ms.
- **SC-005**: 100% các vị trí ném `UserFriendlyException` tiếng Việt hardcode (~25 vị trí) được thay thế hoàn toàn bằng `BusinessException` định kiểu mạnh; kiểm tra kiểm thử song ngữ hiển thị chính xác 100% trên cả hai ngôn ngữ Tiếng Việt và Tiếng Anh.
- **SC-006**: 100% các tập tin rác ở thư mục gốc (`test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt`) và các dead code trên Angular được xóa bỏ sạch sẽ, không còn sót lại trong Git working tree.
- **SC-007**: Toàn bộ các tệp chứa nhiều class (`DishAppServices.cs`, `ForecastAppServices.cs`) được phân tách thành các tệp đơn trách nhiệm riêng biệt, 100% bài unit test và integration test hiện có biên dịch thành công.
- **SC-008**: Ứng dụng Angular biên dịch thành công với chế độ TypeScript `"strict": true` trong `tsconfig.json` mà không xuất hiện bất kỳ lỗi biên dịch hay cảnh báo nghiêm trọng nào.

---

## Các Giả định (Assumptions)

- **Giả định về CSDL**: CSDL hiện tại sử dụng Microsoft SQL Server, hỗ trợ đầy đủ các tính năng Filtered Index (`.HasFilter(...)`) cho soft delete (`[IsDeleted] = 0`) và cờ active (`[IsActive] = 1`).
- **Giả định về Môi trường Runtime**: Backend vận hành trên .NET 10 SDK và ABP Framework 9.x; Frontend vận hành trên Angular 18/19 với kiến trúc Standalone Components.
- **Giả định về Tương thích Ngược**: Việc đổi chữ ký phương thức `GetTransactionsAsync` sang dạng phân trang (`PagedAndSortedResultRequestDto`) sẽ được cập nhật đồng bộ ở cả tầng Application.Contracts, HttpApi và các màn hình Frontend gọi đến nó (màn hình Quản lý kho).
- **Giả định về Dọn dẹp Quyền**: Việc xóa bỏ 7 nhóm Permissions không dùng đến không làm ảnh hưởng đến dữ liệu người dùng thực tế vì các chức năng này chưa từng được phân quyền cho bất kỳ Role nào trong sản phẩm.
