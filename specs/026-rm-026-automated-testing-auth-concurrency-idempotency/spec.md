# Đặc tả Tính năng (Feature Specification): Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency)

**Mã Tính năng (Feature ID)**: `RM-026`

**Nhánh Tính năng (Feature Branch)**: `026-rm-026-automated-testing-auth-concurrency-idempotency`

**Ngày tạo**: 2026-10-23

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-026: *"Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency) — Thiết lập bộ kiểm thử tự động toàn diện (Integration & Concurrency Tests) bảo đảm hệ thống vận hành tin cậy, không bị tái phát các lỗi nghiệp vụ nghiêm trọng"*.
- Tổng hợp phát hiện trọng yếu từ `CODE_REVIEW.md`:
  - **Backend #34 (Thiếu Test Tự Động Toàn Diện)**:
    + Hoàn toàn thiếu test phân quyền thời gian chạy (`AbpAuthorizationException`). Các API quan trọng chưa có test xác thực người dùng thiếu quyền bị chặn 403.
    + Thiếu test tương tranh (Concurrency) và tính bất biến (Idempotency). Do thiếu test này nên lỗi nghiêm trọng Backend #1 (trừ kho 2 lần khi cập nhật đơn Completed) và Backend #12 (race condition tạo 2 đơn trên cùng 1 bàn gây crash 500) đã bị lọt lưới.
    + Chưa có bộ test tích hợp cho các luồng nghiệp vụ phức tạp: `CompletePaymentAsync`, `TransferTableAsync`, `MergeTablesAsync`, `MediaController` upload ảnh, `DailyMenuAppService`.
  - **Backend #1**: Nguy cơ trừ kho nhiều lần khi gọi hoàn tất đơn hàng hoặc cập nhật trạng thái đơn hàng.
  - **Backend #5**: Concurrency retry khi trừ kho nhiều lô FEFO đồng thời gặp xung đột ConcurrencyStamp.
  - **Backend #12**: Race condition khi nhiều người dùng cùng gọi `SubmitOrder` trên cùng một bàn ăn.
  - **Backend #16**: Gộp bàn `MergeTablesAsync` làm mất ghi chú riêng của món và sai đơn giá niêm yết nếu không kiểm tra cẩn thận.
  - **Backend #25**: Kiểm kê cân đối kho `StockAdjustment` sinh lô điều chỉnh sai giá vốn, sai đơn vị tính hoặc hạn sử dụng phi thực tế.
- Tuân thủ Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md) (Domain-Driven Design, ABP Layering, Non-blocking Async, Concurrency Control, Auditing, i18n song ngữ 100% trong `en.json` và `vi.json`).

---

## Tóm tắt & Bối cảnh Nghiệp vụ (Executive Summary & Business Context)

Sau khi hoàn tất các đợt củng cố backend (RM-022), bảo mật phân quyền (RM-023), tái cấu trúc frontend (RM-024) và tối ưu hóa truy vấn EF Core (RM-025), hệ thống `Acme.TooHungry` đã đạt được độ ổn định và kiến trúc chuẩn mực. Tuy nhiên, nếu thiếu một bộ kiểm thử tự động (Automated Test Suite) bao phủ các khía cạnh tương tranh, phân quyền và bất biến dữ liệu, bất kỳ thay đổi nào trong tương lai cũng có thể làm tái phát các lỗi nghiêm trọng gây thất thoát tài chính và dữ liệu kho (như trừ kho 2 lần, xung đột bàn ăn, lọt quyền truy cập dữ liệu nhạy cảm).

Tính năng `RM-026` thiết lập bộ test tự động toàn diện tích hợp sâu vào quy trình CI/CD và xUnit Test Runner, tập trung vào 3 trụ cột kỹ thuật then chốt:
1. **Kiểm thử Phân quyền Thời gian chạy (Runtime Authorization Tests)**: Xác thực 100% các API nhạy cảm từ chối dứt khoát bằng `AbpAuthorizationException` (HTTP 403) khi người dùng chưa đăng nhập hoặc thiếu quyền hạn đặc thù.
2. **Kiểm thử Tranh chấp & Tính Bất biến (Concurrency & Idempotency Tests)**: Giả lập môi trường đa luồng mô phỏng nhiều thiết bị POS/phục vụ gửi yêu cầu cùng lúc (double-click, mạng lag, submit đồng thời), khẳng định hệ thống luôn xử lý idempotent (kho chỉ trừ 1 lần duy nhất, chỉ 1 đơn active tồn tại trên 1 bàn, không bao giờ phát sinh HTTP 500).
3. **Kiểm thử Luồng Nghiệp vụ Trọng yếu (Critical Business Flow Regression Tests)**: Bao phủ toàn bộ các kịch bản vận hành thực tế tại nhà hàng: Thanh toán đơn hàng, Chuyển bàn, Gộp bàn (bảo toàn ghi chú và giá niêm yết), Hủy đơn, Kiểm kê kho (tính đúng giá vốn & hạn dùng theo StorageType) và Thuật toán khấu trừ kho FEFO.

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 23-10-2026 (Phiên Thiết kế Nền tảng `/speckit.specify RM-026` - 4 Trụ Cột Kỹ Thuật)

- **Q1: Cơ chế giả lập định danh người dùng và kiểm thử phân quyền ABP (Runtime Authorization Testing Harness)**:
  - **A1**: 
    - **Vấn đề**: Trước đây, `EndpointAuthorization_Tests.cs` chỉ kiểm tra các thuộc tính metadata qua Reflection (`method.GetCustomAttribute<AuthorizeAttribute>()`). Kiểm tra này chỉ chứng minh code có gắn attribute, nhưng KHÔNG chứng minh được ABP Interceptor thực sự kích hoạt và ném ngoại lệ khi có request thực tế.
    - **Giải pháp**: Xây dựng test suite tích hợp kế thừa `TooHungryApplicationTestBase`.
      + Giả lập ngữ cảnh người dùng chưa đăng nhập bằng cách xóa claims hoặc không gán ClaimsPrincipal (`ICurrentUser.IsAuthenticated == false`).
      + Giả lập người dùng đăng nhập nhưng thiếu quyền thông qua `_currentUser.Change(userId, userName, roles...)` kết hợp với `IPermissionGrantRepository` hoặc fake scope.
      + Xác nhận phương thức ném chính xác `AbpAuthorizationException` khi gọi vào các API:
        * `MediaController.UploadDishImageAsync`: thiếu quyền `TooHungryPermissions.Dishes.Edit`.
        * `DailyMenuAppService`: Unauthenticated hoặc user thường không có quyền `Dishes.Default`.
        * `RecipeController.GetActiveByDishIdAsync` (`by-dish`): thiếu quyền `TooHungryPermissions.Recipes.Default`.
        * `TableOrderController.CompleteActiveOrderByTableIdAsync` (`complete`): thiếu quyền `TooHungryPermissions.Orders.Edit`.
        * `OrderAppService.DeleteAsync`: thiếu quyền `TooHungryPermissions.Orders.Delete`.
        * `DishCategoryAppService.DeleteAsync`: thiếu quyền `TooHungryPermissions.DishCategories.Delete`.
      + Kiểm thử ma trận đa vai trò (Role-based Authorization Matrix):
        * Role `Waiter`: có quyền tạo đơn (`Orders.Create`), đổi trạng thái bàn (`Tables.UpdateStatus`), nhưng bị chặn khi xóa đơn (`Orders.Delete`), sửa nguyên liệu (`Ingredients.Edit`), xóa danh mục (`DishCategories.Delete`).
        * Role `InventoryKeeper`: có quyền tạo lô kho (`Inventory.CreateBatch`), kiểm kê kho (`Inventory.StockAdjustment`), nhưng bị chặn khi hoàn tất thanh toán (`Orders.Edit`), sửa sơ đồ bàn (`Tables.Edit`).
        * Role `Admin`: thực thi thành công toàn bộ các chức năng.

- **Q2: Chiến lược kiểm thử tranh chấp (Concurrency & Multithreading Testing) trong môi trường SQLite In-Memory**:
  - **A2**:
    - **Vấn đề**: Trong ABP test suite, SQLite In-Memory chia sẻ cùng một Connection String. Khi chạy các tác vụ đồng thời (`Task.WhenAll`), nếu dùng chung một `IServiceScope` hoặc cùng một `TooHungryDbContext` instance, EF Core sẽ ném `InvalidOperationException: A second operation was started on this context instance before a previous operation completed`.
    - **Giải pháp**:
      + Sử dụng `IServiceScopeFactory.CreateScope()` để tạo các DI container scope độc lập cho từng luồng/task chạy song song.
      + Mỗi luồng tự resolve `IOrderAppService`, `ITableAppService` hoặc `IInventoryManager` và mở Unit of Work riêng biệt.
      + Chạy đồng thời qua `Task.WhenAll(task1, task2, ...)` để giả lập các request cạnh tranh trực tiếp trên cùng một bản ghi CSDL.
      + Assertions:
        * Với race condition tạo đơn trên cùng bàn: Đúng 1 task thành công (`SubmitOrder`), task còn lại bắt được `BusinessException` (hoặc `DbUpdateException` đã được bọc an toàn), kiểm tra CSDL chỉ có DUY NHẤT 1 đơn active trên bàn đó.
        * Với trừ kho FEFO đồng thời: Nhiều đơn hàng trừ cùng một lô kho có số lượng giới hạn, cơ chế retry concurrency hoạt động trơn tru, không có lô nào bị âm, tổng số lượng trừ khớp chính xác 100% với định lượng món bán ra.

- **Q3: Ma trận kiểm thử tính bất biến (Idempotency Testing) cho luồng hoàn tất đơn và thanh toán**:
  - **A3**:
    - **Vấn đề**: Bug Backend #1 phát sinh do `UpdateAsync` và `ProcessOrderInventoryConsumptionAsync` bị gọi lặp lại khi đơn hàng đã ở trạng thái `Completed`, dẫn đến kho bị trừ lần 2 và giao dịch kho bị nhân đôi.
    - **Giải pháp**: Xây dựng test suite chuyên biệt `OrderAppService_Idempotency_Tests`:
      + Chuẩn bị: Tạo 1 đơn hàng gồm 2 món ăn có liên kết Recipe tiêu hao nguyên liệu A (500g) và nguyên liệu B (200g). Trong kho có sẵn lô hàng đủ số lượng.
      + Lần gọi 1: Gọi `CompletePaymentAsync` hoặc `UpdateAsync(Status = Completed)`. Kiểm tra: Trạng thái đơn chuyển sang `Completed`, nguyên liệu A bị trừ đúng 500g, nguyên liệu B bị trừ đúng 200g, sinh đúng 2 bản ghi `InventoryTransaction` loại `DishConsumption`.
      + Lần gọi 2 (Idempotency Check): Gọi lại `CompletePaymentAsync` hoặc `UpdateAsync(Status = Completed)` với cùng đơn hàng đó (mô phỏng click đúp hoặc network retry).
      + Kết quả kiểm thử:
        * Hệ thống ném ngoại lệ nghiệp vụ chuẩn `BusinessException("TooHungry:Order:AlreadyCompleted")` hoặc trả về kết quả an toàn mà không thực thi trừ kho tiếp.
        * Số lượng tồn kho còn lại của nguyên liệu A và B sau lần gọi 2 KHÔNG THAY ĐỔI so với sau lần gọi 1.
        * Số lượng bản ghi `InventoryTransaction` trong CSDL vẫn giữ nguyên, không sinh thêm bất kỳ bản ghi khấu trừ nào.

- **Q4: Kịch bản kiểm thử luồng nghiệp vụ phức hợp (Complex Flow Regression Test Scenarios)**:
  - **A4**:
    - **Chuyển bàn (`TransferTableAsync`)**:
      + Kiểm thử thành công: Chuyển từ Bàn A (Occupied, có đơn #ORD-1, `OccupiedTime = 12:00`) sang Bàn B (Available). Assert: Bàn B thành `Occupied`, giữ đúng `OccupiedTime = 12:00`, đơn #ORD-1 trỏ sang Bàn B. Bàn A chuyển sang `Cleaning` (nếu đã có đơn) hoặc `Available` (nếu chưa có đơn).
      + Kiểm thử từ chối (Validation & Error Codes): Chuyển cùng 1 bàn (`TableSameSourceAndTarget`), bàn nguồn không có khách (`TableSourceNotOccupied`), bàn đích đang có khách hoặc đang dọn dẹp (`TableTargetNotEmpty`).
    - **Gộp bàn (`MergeTablesAsync`)**:
      + Chuẩn bị: Bàn chính có món M1 (SL: 2, giá 50k, note: "Không hành"). Bàn phụ có món M1 (SL: 1, giá 50k, note: "Nhiều ớt") và món M2 (SL: 1, giá 30k, note: "Ít đường").
      + Thực hiện gộp bàn phụ vào bàn chính:
        * Món M1 trên bàn chính có số lượng = 3, đơn giá = 50k, ghi chú = "Không hành | [Gộp từ Bàn phụ: Nhiều ớt]".
        * Món M2 được thêm vào bàn chính với số lượng = 1, đơn giá = 30k, ghi chú = "[Gộp từ Bàn phụ: Ít đường]".
        * Tổng tiền đơn chính = 180.000đ (tính lại chuẩn xác).
        * Đơn phụ chuyển sang trạng thái `Cancelled` với ghi chú rõ ràng `[Đã gộp vào Bàn chính (#ORD-CHINH)]`.
        * Bàn phụ giải phóng về trạng thái `Cleaning`.
    - **Kiểm kê cân đối kho (`StockAdjustment`)**:
      + Tồn kho hệ thống là 10 đơn vị.
      + Điều chỉnh tăng (+5): Tồn thực tế 15 -> sinh lô kiểm kê mới với `PurchaseUnit = baseUnit`, `UnitCost = estimatedPrice` (không để = 0), hạn dùng hợp lý theo `StorageType` (+30 ngày hoặc +180 ngày).
      + Điều chỉnh giảm (-3): Tồn thực tế 7 -> tự động khấu trừ 3 đơn vị từ lô có hạn dùng gần nhất (FEFO), không cho phép trừ âm.
    - **Khấu trừ kho FEFO đa lô**:
      + Lô 1 (Hạn dùng 2026-10-25, còn 3 đơn vị), Lô 2 (Hạn dùng 2026-11-01, còn 10 đơn vị).

### Phiên Phỏng vấn Làm rõ Chuyên sâu 23-10-2026 (Interactive Clarification Session `/speckit.clarify RM-026`)

- **Q1: Cơ chế kỹ thuật giả lập danh tính người dùng và kiểm thử phân quyền thời gian chạy (Runtime Authorization) trong xUnit**:
  - **A1**: Áp dụng Option A (Sử dụng `_currentUser.Change(...)` & Fake Scope) — Tận dụng cơ chế chuyển đổi ngữ cảnh người dùng thời gian chạy của ABP (`_currentUser.Change(userId, userName, roles...)`) kết hợp với Fake ClaimsPrincipal Scope. Cách tiếp cận này kích hoạt đầy đủ chuỗi xử lý chặn quyền (Authorization Interceptor) thật sự của ABP Framework, bảo đảm kiểm tra được ngoại lệ `AbpAuthorizationException` ném ra khi thiếu quyền mà không cần khởi động HTTP server đầy đủ hay mock dịch vụ lỏng lẻo.
- **Q2: Hành vi phản hồi chuẩn mực khi một yêu cầu hoàn tất đơn hàng/thanh toán bị gọi lặp lại (Idempotency Guard)**:
  - **A2**: Áp dụng Option A (Ném `BusinessException("TooHungry:Order:AlreadyCompleted")`) — Khi một yêu cầu hoàn tất đơn hàng (`CompletePaymentAsync` hoặc `UpdateAsync(Status = Completed)`) bị gọi lặp lại, hệ thống từ chối dứt khoát bằng `BusinessException("TooHungry:Order:AlreadyCompleted")` đã được cấu hình localization song ngữ. Thiết kế này bảo đảm tính nguyên tử và bất biến tuyệt đối của kho hàng: kho chỉ bị trừ DUY NHẤT 1 lần, các lần gọi tiếp theo bị chặn đứng ngay từ tầng Domain/AppService, không bao giờ chạy lại `ProcessOrderInventoryConsumptionAsync` và không sinh thêm bản ghi `InventoryTransaction` rác.
- **Q3: Cơ chế cô lập và mô phỏng tương tranh (Concurrency & Race Condition) trong xUnit với SQLite In-Memory**:
  - **A3**: Áp dụng Option A (Tạo DI Scope độc lập qua `IServiceScopeFactory`) — Trong các bài test tương tranh (như `SubmitOrder` đồng thời trên cùng một bàn hoặc trừ kho FEFO đa luồng), sử dụng `IServiceScopeFactory.CreateScope()` để sinh ra DI Scope, DbContext và Unit of Work riêng biệt cho từng Task song song. Cách tiếp cận này mô phỏng chân thực và chính xác hành vi của nhiều worker thread/request độc lập từ các client khác nhau, kích hoạt kiểm tra đúng cơ chế lock/concurrency stamp và bộ lọc Unique Index của CSDL mà không gây lỗi đụng độ nội bộ `InvalidOperationException` của DbContext instance.
- **Q4: Quy chuẩn kiểm thử và kỳ vọng kết quả cho luồng Gộp bàn (`MergeTablesAsync`)**:
  - **A4**: Áp dụng Option A (Cộng dồn số lượng + Đồng bộ giá niêm yết CSDL + Ghép Note bàn phụ) — Khi gộp bàn, các món trùng nhau được cộng dồn `Quantity`, đơn giá được cập nhật theo giá niêm yết từ bảng `Dishes` trong CSDL (`Dish.Price`), ghi chú chế biến được nối liền theo mẫu `"{primary.Note} | [Gộp từ {secondary.Name}: {secondary.Note}]"`. Đơn hàng của bàn phụ được hủy an toàn (`Status = Cancelled`) kèm ghi chú đối soát `"[Đã gộp vào {primary.Name} (#{primaryOrder.OrderNumber})]"` và bàn phụ giải phóng về trạng thái `Cleaning`. Bộ test khẳng định 100% không bị mất ghi chú và không bị sai lệch đơn giá như phát hiện Backend #16.

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Tự Động Hóa Kiểm Thử Phân Quyền Thời Gian Chạy (Ưu tiên: P1)

Là **Kỹ sư Bảo mật / Quản trị viên Hệ thống**, tôi muốn có bộ kiểm thử tự động kiểm tra việc thực thi phân quyền (Runtime Authorization Enforcement) cho toàn bộ các API nhạy cảm của hệ thống, để bảo đảm người dùng chưa xác thực hoặc người dùng thiếu quyền hạn luôn bị chặn đứng bằng `AbpAuthorizationException`, không thể truy cập trái phép dữ liệu.

**Lý do cho mức độ ưu tiên này**: Bảo mật là chốt chặn quan trọng nhất của hệ thống. Kiểm thử tự động giúp phát hiện ngay lập tức bất kỳ API nào vô tình bị gỡ bỏ attribute hoặc phân quyền lỏng lẻo trong tương lai.

**Kiểm thử Độc lập**: Có thể chạy độc lập qua lệnh `dotnet test --filter FullyQualifiedName~Security` và bảo đảm 100% các ca kiểm thử phân quyền đều vượt qua thành công.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** người dùng chưa đăng nhập (Unauthenticated), **Khi** gọi bất kỳ API nào trong danh sách bảo vệ (`MediaController.UploadDishImageAsync`, `DailyMenuAppService.CreateAsync`, `RecipeController.GetActiveByDishIdAsync`, `TableOrderController.CompleteActiveOrderByTableIdAsync`, `OrderAppService.DeleteAsync`, `DishCategoryAppService.DeleteAsync`), **Thì** hệ thống ném ngoại lệ `AbpAuthorizationException` (HTTP 401/403).
2. **Cho trước** nhân viên phục vụ (Role `Waiter`), **Khi** nhân viên này cố gắng gọi `OrderAppService.DeleteAsync` hoặc `DishCategoryAppService.DeleteAsync`, **Thì** hệ thống ném `AbpAuthorizationException` và ngăn chặn thao tác xóa dữ liệu.
3. **Cho trước** thủ kho (Role `InventoryKeeper`), **Khi** thủ kho cố gắng gọi `CompletePaymentAsync` hoặc thay đổi cấu hình bàn ăn `TableAppService.CreateAsync`, **Thì** hệ thống từ chối bằng `AbpAuthorizationException`.
4. **Cho trước** quản trị viên (Role `Admin`), **Khi** thực hiện các thao tác quản trị trên, **Thì** hệ thống cho phép thực thi trơn tru mà không gặp bất kỳ rào cản phân quyền nào.

---

### User Story 2 - Kiểm Thử Bất Biến & Khử Trừ Kho Lặp Lại (Idempotency Testing) (Ưu tiên: P1)

Là **Chủ Nhà hàng & Kế toán Trưởng**, tôi muốn chức năng hoàn tất đơn hàng và thanh toán có tính bất biến (Idempotent), để khi nhân viên thu ngân click đúp nút thanh toán hoặc do mạng chập chờn gửi 2 request liên tiếp, kho hàng chỉ bị trừ đúng một lần duy nhất và số liệu doanh thu không bị sai lệch.

**Lý do cho mức độ ưu tiên này**: Đây là nguyên nhân trực tiếp gây ra lỗi nghiêm trọng Backend #1 từ `CODE_REVIEW.md`. Cần có test tự động khẳng định lỗi này được triệt tiêu vĩnh viễn.

**Kiểm thử Độc lập**: Gọi liên tiếp 2 lần phương thức `CompletePaymentAsync` hoặc `UpdateAsync(Status = Completed)` trên cùng một đơn hàng trong cùng một test case, sau đó kiểm tra số lượng tồn kho và số lượng giao dịch kho trong CSDL.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** một đơn hàng đang ở trạng thái `Completed` đã trừ kho thành công, **Khi** bất kỳ ai gọi lại `CompletePaymentAsync` hoặc `UpdateAsync(Status = Completed)` cho đơn hàng đó, **Thì** hệ thống ném ngoại lệ nghiệp vụ `BusinessException("TooHungry:Order:AlreadyCompleted")` hoặc trả về đơn hàng hiện tại mà không thực hiện bất kỳ hành động trừ kho nào.
2. **Cho trước** kiểm tra số dư tồn kho của các nguyên liệu liên quan trong đơn hàng, **Khi** so sánh số dư trước và sau lần gọi thứ 2, **Thì** số lượng tồn kho `RemainingQuantity` của các lô hàng hoàn toàn không đổi.
3. **Cho trước** bảng lịch sử giao dịch kho `InventoryTransactions`, **Khi** đếm số lượng giao dịch gắn với đơn hàng này, **Thì** số lượng bản ghi sau lần gọi thứ 2 bằng đúng số lượng bản ghi sau lần gọi thứ nhất.

---

### User Story 3 - Kiểm Thử Tranh Chấp Tạo Đơn & Trừ Kho FEFO Đồng Thời (Ưu tiên: P1)

Là **Kỹ sư Hệ thống**, tôi muốn kiểm thử tự động tình huống nhiều nhân viên phục vụ cùng tạo đơn trên một bàn hoặc nhiều đơn hàng cùng khấu trừ một lô nguyên liệu trong cùng một tích tắc thời gian, để bảo đảm hệ thống xử lý tranh chấp an toàn, không sinh 2 đơn active trên 1 bàn và không làm sập máy chủ bằng lỗi 500.

**Lý do cho mức độ ưu tiên này**: Race condition tại giờ cao điểm của nhà hàng rất dễ dẫn đến lỗi dữ liệu không nhất quán (Backend #5 và Backend #12). Test đa luồng là cách duy nhất chứng minh độ bền bỉ của hệ thống.

**Kiểm thử Độc lập**: Sử dụng `Task.WhenAll` kích hoạt đồng thời 2-5 tác vụ cạnh tranh trên các DI Scope độc lập và kiểm tra tính toàn vẹn của dữ liệu sau khi tất cả các tác vụ kết thúc.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** một bàn ăn đang trống, **Khi** 2 nhân viên gửi yêu cầu `SubmitOrder` đồng thời trên cùng bàn đó, **Thì** duy nhất 1 đơn hàng được tạo thành công và gắn vào bàn, yêu cầu thứ hai bị từ chối bằng `BusinessException` chuẩn, không bao giờ phát sinh ngoại lệ không bắt `DbUpdateException` (HTTP 500).
2. **Cho trước** một nguyên liệu có tổng tồn kho 10 đơn vị trong 1 lô hàng, **Khi** 5 đơn hàng cùng được hoàn tất đồng thời, mỗi đơn cần 2 đơn vị, **Thì** cả 5 đơn hàng đều hoàn tất thành công nhờ cơ chế retry concurrency, và tồn kho cuối cùng của lô hàng bằng đúng 0, không có giá trị âm.
3. **Cho trước** tình huống nhiều đơn hàng cần tiêu hao vượt quá tồn kho hiện tại dưới tải song song, **Khi** lô hàng hết sạch, **Thì** đơn hàng vượt quá tồn kho bị từ chối với lỗi thiếu nguyên liệu, các đơn hàng trước đó không bị ảnh hưởng.

---

### User Story 4 - Kiểm Thử Hồi Quy Các Luồng Vận Hành Trọng Yếu (Ưu tiên: P2)

Là **Đội ngũ Phát triển & Vận hành**, tôi muốn có bộ kiểm thử tự động cho toàn bộ các luồng nghiệp vụ nhà hàng phức tạp: Chuyển bàn, Gộp bàn, Hủy đơn và Kiểm kê kho, để bảo đảm các tính năng này vận hành chính xác 100% theo đúng các quy tắc nghiệp vụ đã thống nhất.

**Lý do cho mức độ ưu tiên này**: Các thao tác Chuyển bàn và Gộp bàn liên quan trực tiếp đến nhiều thực thể (`RestaurantTable`, `Order`, `OrderItem`) và sự kiện realtime. Tự động hóa kiểm thử hồi quy giúp bảo đảm không bị phá vỡ logic khi nâng cấp hệ thống.

**Kiểm thử Độc lập**: Chạy các test fixture trong namespace `Acme.TooHungry.Tables` và `Acme.TooHungry.Inventories` kiểm tra từng luồng nghiệp vụ độc lập.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** Bàn A có đơn hàng và khách ngồi từ 10:00, **Khi** thực hiện `TransferTableAsync` sang Bàn B trống, **Thì** Bàn B trở thành `Occupied` với `OccupiedTime = 10:00` và nắm giữ đơn hàng; Bàn A chuyển sang `Cleaning`.
2. **Cho trước** Bàn A và Bàn B cùng có đơn hàng chứa các món ăn có ghi chú riêng biệt, **Khi** thực hiện `MergeTablesAsync` gộp Bàn B vào Bàn A, **Thì** các món ăn trùng nhau được cộng dồn số lượng nhưng giữ nguyên đơn giá niêm yết chuẩn CSDL và ghép nối đầy đủ ghi chú của cả 2 bàn; đơn Bàn B chuyển sang `Cancelled` với ghi chú rõ ràng; Bàn B chuyển sang `Cleaning`.
3. **Cho trước** một đơn hàng đang mở tại bàn, **Khi** người dùng hủy đơn qua `UpdateAsync(Status = Cancelled)`, **Thì** đơn hàng chuyển sang `Cancelled`, bàn ăn được giải phóng về trạng thái `Available`, và kho hàng không bị trừ.
4. **Cho trước** thủ kho thực hiện cân đối kiểm kê `StockAdjustment`, **Khi** điều chỉnh tăng số lượng, **Thì** lô điều chỉnh được sinh ra với đơn giá bằng giá ước tính của nguyên liệu (`UnitCost = EstimatedPrice`), đơn vị cơ sở chuẩn xác, và hạn sử dụng hợp lý theo `StorageType`.

---

### User Story 5 - Kiểm Thử Khấu Trừ Kho Theo Hạn Sử Dụng (FEFO Test Suite) (Ưu tiên: P2)

Là **Thủ kho Nhà hàng**, tôi muốn hệ thống có bài kiểm thử tự động chứng minh quy tắc xuất kho FEFO (First Expired First Out) luôn khấu trừ chính xác lô có hạn sử dụng gần nhất trước, để bảo đảm chất lượng an toàn thực phẩm và giảm thiểu lãng phí nguyên liệu hết hạn.

**Lý do cho mức độ ưu tiên này**: Quản lý hạn sử dụng là nghiệp vụ cốt lõi của nhà hàng ăn uống. Test tự động khẳng định thuật toán FEFO luôn hoạt động chính xác trong mọi trường hợp nhiều lô hàng.

**Kiểm thử Độc lập**: Chuẩn bị nhiều lô hàng với các hạn sử dụng khác nhau và kích hoạt khấu trừ kho, sau đó assert số lượng còn lại của từng lô.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước** Nguyên liệu X có Lô 1 (hạn dùng 3 ngày tới, còn 2kg), Lô 2 (hạn dùng 10 ngày tới, còn 5kg) và Lô 3 (hạn dùng 30 ngày tới, còn 10kg), **Khi** đơn hàng tiêu hao 4kg nguyên liệu X, **Thì** Lô 1 bị trừ hết 2kg (còn 0kg), Lô 2 bị trừ 2kg (còn 3kg), và Lô 3 được giữ nguyên 10kg.
2. **Cho trước** một lô hàng đã hết hạn (`ExpirationDate < Clock.Now`), **Khi** đơn hàng tiêu thụ nguyên liệu, **Thì** hệ thống bỏ qua lô đã hết hạn và chỉ trừ từ các lô còn hạn sử dụng hợp lệ.

---

### Các Trường hợp Ngoại lệ & Tình huống Biên (Edge Cases)

- **EC-001**: Chuyện gì xảy ra khi 10 luồng cùng lúc gọi `CompletePaymentAsync` cho 1 đơn hàng duy nhất?
  - *Xử lý*: Đúng 1 luồng đầu tiên hoàn tất thanh toán và trừ kho; 9 luồng còn lại bị từ chối bằng `BusinessException("TooHungry:Order:AlreadyCompleted")` hoặc hoàn thành an toàn không làm trừ kho lặp lại.
- **EC-002**: Chuyện gì xảy ra khi chuyển bàn từ Bàn A sang Bàn B, nhưng ngay lúc đó có người khác vừa chiếm Bàn B?
  - *Xử lý*: Hệ thống kiểm tra trạng thái Bàn B trước khi gán. Nếu Bàn B không còn ở trạng thái `Available`, ném ngay `BusinessException(TooHungryDomainErrorCodes.TableTargetNotEmpty)` và giữ nguyên Bàn A.
- **EC-003**: Chuyện gì xảy ra khi gộp 2 bàn mà cả 2 bàn đều có món ăn nhưng đơn giá trên DTO truyền vào bị chỉnh sửa?
  - *Xử lý*: Hệ thống tải lại đơn giá chuẩn niêm yết từ bảng `Dishes` trong CSDL để tính toán, tuyệt đối không tin tưởng đơn giá từ client, ngăn ngừa thất thoát doanh thu (khắc phục Backend #2 và Backend #16).
- **EC-004**: Chuyện gì xảy ra khi kiểm kê cân đối kho cho nguyên liệu lưu kho đông lạnh (`StorageType.Frozen`) so với đồ tươi (`StorageType.Room`)?
  - *Xử lý*: Lô điều chỉnh tăng tự động gán hạn sử dụng hợp lý: đồ tươi tối đa 3-7 ngày, đồ đông lạnh 90-180 ngày, không bao giờ tự động gán cứng +1 năm cho tất cả mọi loại nguyên liệu.
- **EC-005**: Chuyện gì xảy ra khi kiểm thử phân quyền trên môi trường In-Memory không có Controller context HTTP thực tế?
  - *Xử lý*: Tận dụng ABP Application Service Interception và cơ chế Fake `ICurrentUser` / `ClaimsPrincipal` để kiểm thử hành vi ném `AbpAuthorizationException` trực tiếp qua DI container mà không cần khởi động HTTP server nặng nề.

---

## Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI có test suite kiểm thử phân quyền thời gian chạy (`Authorization_Runtime_Tests`) kế thừa `TooHungryApplicationTestBase`.
- **FR-002**: Hệ thống PHẢI có bài test xác thực `MediaController.UploadDishImageAsync` ném `AbpAuthorizationException` khi thiếu quyền `TooHungryPermissions.Dishes.Edit`.
- **FR-003**: Hệ thống PHẢI có bài test xác thực `DailyMenuAppService` ném `AbpAuthorizationException` khi người dùng chưa đăng nhập hoặc thiếu quyền `TooHungryPermissions.Dishes.Default`.
- **FR-004**: Hệ thống PHẢI có bài test xác thực `RecipeController.GetActiveByDishIdAsync` (`by-dish`) ném `AbpAuthorizationException` khi thiếu quyền `TooHungryPermissions.Recipes.Default`.
- **FR-005**: Hệ thống PHẢI có bài test xác thực `TableOrderController.CompleteActiveOrderByTableIdAsync` (`complete`) ném `AbpAuthorizationException` khi thiếu quyền `TooHungryPermissions.Orders.Edit`.
- **FR-006**: Hệ thống PHẢI có bài test xác thực `OrderAppService.DeleteAsync` ném `AbpAuthorizationException` khi thiếu quyền `TooHungryPermissions.Orders.Delete`.
- **FR-007**: Hệ thống PHẢI có bài test xác thực `DishCategoryAppService.DeleteAsync` ném `AbpAuthorizationException` khi thiếu quyền `TooHungryPermissions.DishCategories.Delete`.
- **FR-008**: Hệ thống PHẢI có bài test kiểm tra ma trận phân quyền đa vai trò (Role `Waiter` và Role `InventoryKeeper` bị từ chối khi thực hiện các tác vụ vượt quyền).
- **FR-009**: Hệ thống PHẢI có test suite kiểm thử tính bất biến (`OrderAppService_Idempotency_Tests`) chứng minh việc gọi `CompletePaymentAsync` nhiều lần KHÔNG BAO GIỜ trừ kho 2 lần.
- **FR-010**: Hệ thống PHẢI có bài test chứng minh việc gọi `UpdateAsync(Status = Completed)` nhiều lần không làm tăng số lượng bản ghi `InventoryTransaction`.
- **FR-011**: Hệ thống PHẢI có test suite kiểm thử tranh chấp tạo đơn (`OrderAppService_SubmitOrder_Concurrency_Tests`) chạy đa luồng đồng thời trên cùng 1 bàn ăn.
- **FR-012**: Hệ thống PHẢI xác nhận bài test tạo đơn đồng thời chỉ sinh DUY NHẤT 1 đơn active trên bàn và yêu cầu thứ hai bị từ chối bằng `BusinessException`, không ném lỗi 500.
- **FR-013**: Hệ thống PHẢI có test suite kiểm thử retry concurrency (`Inventory_Fefo_Concurrency_Tests`) khi nhiều đơn hàng cùng khấu trừ một lô nguyên liệu có số lượng giới hạn.
- **FR-014**: Hệ thống PHẢI có bài test tích hợp đầy đủ cho luồng thanh toán `CompletePaymentAsync`, kiểm tra chuyển trạng thái đơn, trạng thái bàn sang `Cleaning`, ghi nhận ghi chú thanh toán và trừ kho FEFO.
- **FR-015**: Hệ thống PHẢI có bài test tích hợp đầy đủ cho luồng chuyển bàn `TransferTableAsync` (kế thừa đúng `OccupiedTime`, chuyển active order, đổi trạng thái bàn nguồn sang `Cleaning`).
- **FR-016**: Hệ thống PHẢI có các bài test kiểm tra điều kiện từ chối chuyển bàn (`TableSameSourceAndTarget`, `TableSourceNotOccupied`, `TableTargetNotEmpty`).
- **FR-017**: Hệ thống PHẢI có bài test tích hợp đầy đủ cho luồng gộp bàn `MergeTablesAsync`, xác nhận cộng dồn số lượng, bảo toàn đơn giá niêm yết CSDL và bảo toàn ghi chú riêng của từng món ăn.
- **FR-018**: Hệ thống PHẢI có bài test xác nhận đơn hàng của bàn phụ trong luồng gộp bàn chuyển sang trạng thái `Cancelled` với ghi chú đối soát rõ ràng và bàn phụ chuyển về `Cleaning`.
- **FR-019**: Hệ thống PHẢI có bài test tích hợp cho luồng hủy đơn hàng `CancelActiveOrderAsync`, xác nhận giải phóng bàn ăn về `Available` và không trừ kho.
- **FR-020**: Hệ thống PHẢI có bài test tích hợp cho nghiệp vụ kiểm kê cân đối kho `StockAdjustment` (điều chỉnh tăng sinh lô có giá vốn và hạn dùng chuẩn theo `StorageType`, điều chỉnh giảm khấu trừ FEFO).
- **FR-021**: Hệ thống PHẢI có bài test kiểm tra thuật toán xuất kho FEFO nhiều lô hàng, ưu tiên khấu trừ triệt để lô có hạn dùng gần nhất trước khi chuyển sang lô tiếp theo.
- **FR-022**: Hệ thống PHẢI đồng bộ toàn bộ các lớp test cụ thể vào dự án `Acme.TooHungry.EntityFrameworkCore.Tests` để chạy kiểm thử hoàn chỉnh trên SQLite In-Memory.

---

### Yêu cầu Phi Chức năng & Chất lượng Kiểm Thử (Non-Functional Requirements)

- **NFR-001 (Tính Độc lập của Kiểm thử - Test Isolation)**: Mỗi test case PHẢI chạy độc lập, tự khởi tạo dữ liệu mẫu sạch sẽ và không phụ thuộc vào thứ tự thực thi của các test khác trong test suite.
- **NFR-002 (Tốc độ Thực thi - Execution Performance)**: Toàn bộ bộ kiểm thử mới PHẢI hoàn tất trong thời gian dưới 60 giây khi chạy bằng lệnh `dotnet test`.
- **NFR-003 (Độ Ổn định Tuyệt đối - Zero Flakiness)**: Các bài test đa luồng và tương tranh (Concurrency Tests) PHẢI ổn định 100%, không được phát sinh lỗi chập chờn (flaky tests) do race condition ngẫu nhiên giữa các lần chạy liên tiếp.
- **NFR-004 (Tuân thủ Kiến trúc ABP)**: Các lớp kiểm thử trừu tượng đặt tại `Acme.TooHungry.Application.Tests`, các lớp triển khai cụ thể đặt tại `Acme.TooHungry.EntityFrameworkCore.Tests` kế thừa `TooHungryEntityFrameworkCoreTestModule`.
- **NFR-005 (Ngôn ngữ & Tài liệu)**: Toàn bộ tên phương thức kiểm thử, chú thích và thông điệp kiểm tra PHẢI tuân thủ quy ước xUnit tiếng Anh rõ ràng (ví dụ: `Should_Throw_AbpAuthorizationException_When_User_Lacks_Permission`), tài liệu đặc tả viết bằng Tiếng Việt chuẩn mực.

---

## Tiêu chí Thành công (Success Criteria)

- **SC-001**: Toàn bộ 100% các API chỉ định trong yêu cầu (`MediaController`, `DailyMenuAppService`, `RecipeController.by-dish`, `TableOrderController.complete`, `OrderAppService.Delete`, `DishCategoryAppService.Delete`) đều có test case tự động xác thực việc ném `AbpAuthorizationException` khi thiếu quyền.
- **SC-002**: Bài test kiểm thử tính bất biến (Idempotency) xác nhận 100% kho hàng không bao giờ bị trừ 2 lần dù request thanh toán bị gọi lặp lại nhiều lần.
- **SC-003**: Bài test tranh chấp tạo đơn đồng thời trên cùng 1 bàn ăn chứng minh hệ thống xử lý an toàn, chỉ giữ 1 đơn active duy nhất và không bao giờ ném lỗi HTTP 500.
- **SC-004**: Bộ test hồi quy cho Chuyển bàn, Gộp bàn, Hủy đơn và Kiểm kê kho đạt tỷ lệ pass 100% và bảo toàn toàn vẹn dữ liệu (ghi chú món ăn, đơn giá, trạng thái bàn, hạn dùng lô).
- **SC-005**: Bộ test thuật toán FEFO chứng minh hệ thống luôn khấu trừ chính xác theo thứ tự hạn sử dụng gần nhất.
- **SC-006**: Lệnh `dotnet test` trên toàn bộ solution thực thi thành công mỹ mãn với kết quả: **0 Failed, 0 Skipped, 100% Passed**.

---

## Ma trận Các Lớp Kiểm Thử (Test Suite Matrix)

| STT | Tên Lớp Kiểm Thử (Test Class) | Dự án (Project) | Phạm vi Nghiệp vụ (Scope) | Trọng tâm Kiểm thử (Focus) |
|---|---|---|---|---|
| 1 | `EndpointAuthorization_Runtime_Tests<T>` | `Application.Tests/Security` | Phân quyền ABP Runtime | Ném `AbpAuthorizationException` khi Unauthenticated hoặc thiếu Permission |
| 2 | `RoleBasedAuthorization_Tests<T>` | `Application.Tests/Security` | Ma trận quyền vai trò | Waiter & InventoryKeeper bị từ chối khi thực hiện hành vi vượt quyền |
| 3 | `OrderAppService_Idempotency_Tests<T>` | `Application.Tests/Orders` | Bất biến thanh toán & trừ kho | Chống trừ kho 2 lần khi gọi `CompletePaymentAsync` / `UpdateAsync` lặp lại |
| 4 | `OrderAppService_SubmitOrder_Concurrency_Tests<T>` | `Application.Tests/Orders` | Tương tranh tạo đơn | Chống race condition khi 2 waiter cùng submit đơn trên 1 bàn |
| 5 | `InventoryManager_Fefo_Concurrency_Tests<T>` | `Application.Tests/Inventories` | Tương tranh trừ kho FEFO | Retry concurrency an toàn khi nhiều đơn cùng trừ 1 lô hàng |
| 6 | `TableAppService_TransferTable_Tests<T>` | `Application.Tests/Tables` | Chuyển bàn ăn | Chuyển đơn, kế thừa `OccupiedTime`, dọn dẹp bàn nguồn |
| 7 | `TableAppService_MergeTables_Advanced_Tests<T>` | `Application.Tests/Tables` | Gộp bàn ăn nâng cao | Ghép món, bảo toàn giá niêm yết CSDL và ghi chú riêng từng món |
| 8 | `TableAppService_CancelOrder_Tests<T>` | `Application.Tests/Tables` | Hủy đơn hàng hoạt động | Giải phóng bàn về Available, không trừ kho |
| 9 | `InventoryAppService_StockAdjustment_Tests<T>` | `Application.Tests/Inventories` | Kiểm kê cân đối kho | Sinh lô điều chỉnh đúng giá vốn & hạn dùng theo StorageType |
| 10 | `InventoryManager_Fefo_Consumption_Tests<T>` | `Application.Tests/Inventories` | Thuật toán FEFO đa lô | Khấu trừ ưu tiên lô có hạn dùng gần nhất trước |
| 11 | `EfCore*Tests` | `EntityFrameworkCore.Tests` | Thực thi tích hợp | Kế thừa các lớp trên chạy với SQLite In-Memory database |
