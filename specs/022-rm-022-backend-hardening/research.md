# Nghiên cứu Kiến trúc & Giải pháp Kỹ thuật (Architecture & Technical Research): RM-022 Ổn định hóa & Vá lỗi Nghiêm trọng Backend

**Mã Tính năng (Feature ID)**: `RM-022`  
**Nhánh (Branch)**: `022-rm-022-backend-hardening`  
**Ngày thực hiện**: 2026-10-22  
**Tài liệu Đặc tả tham chiếu**: [spec.md](spec.md)

---

## 1. Mục tiêu Nghiên cứu

Giải quyết triệt để 15 vấn đề nghiêm trọng phát hiện từ `CODE_REVIEW.md` (Backend #1, #2, #3, #4, #5, #10, #11, #12, #13, #14, #15, #16, #25, #26, #29), thiết lập các chốt chặn bất biến (Invariants) theo đúng nguyên lý Domain-Driven Design (DDD), Unit of Work (UoW) và quy chuẩn ABP Framework.

---

## 2. Các Chủ đề Nghiên cứu & Quyết định Kỹ thuật

### Nghiên cứu 1: Đóng băng Đơn hàng & Chống Trừ kho Trùng lặp (Backend #1)

- **Vấn đề**: `OrderAppService.UpdateAsync` hiện đang gọi `ProcessOrderInventoryConsumptionAsync` mỗi khi `input.Status == OrderStatus.Completed` mà không kiểm tra trạng thái cũ (`order.Status`). Hậu quả: Khi khách hàng thanh toán xong, nhân viên gọi API sửa đơn (hoặc hệ thống trigger cập nhật) thì kho nguyên liệu bị trừ tiếp lần thứ 2. Hơn nữa, đơn đã hủy (`Cancelled`) cũng có thể bị chuyển sang `Completed`.
- **Giải pháp nghiên cứu**:
  1. *Nguyên lý DDD*: Thực thể `Order` không được anemic (chỉ chứa getters/setters). Đưa logic chuyển trạng thái vào các Domain methods:
     ```csharp
     public void Complete()
     {
         if (Status == OrderStatus.Completed)
         {
             throw new BusinessException("TooHungry:Order:AlreadyCompleted");
         }
         if (Status == OrderStatus.Cancelled)
         {
             throw new BusinessException("TooHungry:Order:CannotCompleteCancelledOrder");
         }
         Status = OrderStatus.Completed;
     }

     public void Cancel()
     {
         if (Status == OrderStatus.Completed)
         {
             throw new BusinessException("TooHungry:Order:CannotCancelCompletedOrder");
         }
         Status = OrderStatus.Cancelled;
     }
     ```
  2. *Chốt chặn trừ kho tại Application Service*: Chỉ gọi `ProcessOrderInventoryConsumptionAsync(order)` khi `oldStatus != OrderStatus.Completed && order.Status == OrderStatus.Completed`.
  3. *Đóng băng đơn hàng*: Trong `UpdateAsync`, nếu `order.Status == OrderStatus.Completed || order.Status == OrderStatus.Cancelled`, lập tức ném `BusinessException`, không cho phép thêm, sửa, xóa bất kỳ `OrderItem` nào.
- **Quyết định chốt**: Triển khai `Order.Complete()` và `Order.Cancel()` trên Domain Entity, chặn cập nhật đơn đã hoàn tất/hủy tại AppService.

---

### Nghiên cứu 2: Triệt tiêu Lỗ hổng Client Tự Đặt Giá & Validation DTO (Backend #2, #3)

- **Vấn đề**:
  - `CreateUpdateOrderItemDto` và `SubmitOrderItemDto` chứa `UnitPrice` và `TotalAmount`. Nếu client gửi `UnitPrice = 0` hoặc số âm, server vẫn ghi nhận.
  - Các DTO không có Data Annotation validation, chấp nhận `Quantity <= 0` dẫn đến tổng tiền âm và lượng trừ kho âm.
- **Giải pháp nghiên cứu**:
  1. *Loại bỏ hoàn toàn thuộc tính giá khỏi DTO đầu vào*: Xóa `UnitPrice` và `TotalPrice` khỏi `CreateUpdateOrderItemDto` và `SubmitOrderItemDto`. Client chỉ truyền `DishId`, `Quantity`, và `Note`.
  2. *Server-Side Calculation*:
     - Truy vấn danh sách `Dish` từ CSDL theo `DishId`.
     - Lấy giá chuẩn từ `Dish.Price`.
     - Gán `orderItem.UnitPrice = dish.Price`, `orderItem.TotalPrice = dish.Price * orderItem.Quantity`.
     - Tính tổng tiền đơn hàng: `order.TotalAmount = order.Items.Sum(x => x.TotalPrice)`.
  3. *Validation Annotations*:
     - `[Range(1, 999)]` cho `Quantity`.
     - `[MinLength(1)]` cho mảng `Items`.
     - `[StringLength(512)]` cho `Note`.
- **Quyết định chốt**: Loại bỏ thuộc tính giá khỏi Input DTOs, ép buộc tính giá 100% tại backend và validate chặt chẽ `Quantity >= 1`.

---

### Nghiên cứu 3: Khắc phục Concurrency Retry Trừ Kho Thừa & autoSave Rải rác (Backend #5)

- **Vấn đề**:
  - `InventoryManager.DeductFefoAsync` hiện gọi `_batchRepository.UpdateAsync(batch, autoSave: true)` và `_transactionRepository.InsertAsync(tx, autoSave: true)` ngay trong vòng lặp trừ từng lô.
  - Khi có tranh chấp tương tranh (`AbpDbConcurrencyException`), vòng lặp retry trong `OrderAppService` hoặc `InventoryAppService` chạy lại trong cùng một `UnitOfWork`/`DbContext`. Lô thứ 1 đã trừ và lưu ở lần chạy trước, lần retry sẽ trừ tiếp lô thứ 1 hoặc văng lỗi ConcurrencyStamp cũ.
- **Giải pháp nghiên cứu**:
  1. *Loại bỏ `autoSave: true` trong vòng lặp*: Bỏ `autoSave: true` tại dòng 81 và 93 của `InventoryManager.cs`. Để Entity Framework ChangeTracker theo dõi và chỉ commit nguyên khối khi Unit of Work kết thúc thành công.
  2. *Vòng lặp Retry Concurrency với Unit of Work Mới Độc lập*:
     ```csharp
     int retryCount = 0;
     while (true)
     {
         try
         {
             using var uow = _unitOfWorkManager.Begin(requiresNew: true, isTransactional: true);
             // Tải lại dữ liệu tươi mới từ CSDL
             // Thực hiện khấu trừ kho
             await uow.CompleteAsync();
             break;
         }
         catch (AbpDbConcurrencyException) when (retryCount < 3)
         {
             retryCount++;
             await Task.Delay(50 * retryCount);
         }
     }
     ```
     Với `requiresNew: true`, mỗi lần retry là một DbContext hoàn toàn mới, ConcurrencyStamp được nạp mới nhất và không có trạng thái bẩn lưu dở dang.
- **Quyết định chốt**: Xóa `autoSave` trong vòng lặp `DeductFefoAsync` và bọc retry loop trong `_unitOfWorkManager.Begin(requiresNew: true)`.

---

### Nghiên cứu 4: Filtered Unique Index cho Active Order & Chống Race Condition (Backend #12)

- **Vấn đề**:
  - `TooHungryDbContext.cs` cấu hình index: `.HasFilter("[TableId] IS NOT NULL AND [Status] = 0 AND [IsDeleted] = 0")`. Index này chỉ lọc `Status = 0` (`Pending`). Khi đơn hàng chuyển sang `Processing` (1), một đơn hàng khác tạo cho cùng bàn sẽ không bị chặn ở database.
  - Khi có 2 request `SubmitOrder` đồng thời, CSDL ném lỗi vi phạm Unique Constraint dẫn đến HTTP 500 Unhandled Exception.
- **Giải pháp nghiên cứu**:
  1. *Cập nhật Filtered Unique Index*:
     ```csharp
     b.HasIndex(x => x.TableId)
      .IsUnique()
      .HasFilter("[TableId] IS NOT NULL AND [Status] NOT IN (2, 3) AND [IsDeleted] = 0");
     ```
     (2 = `Completed`, 3 = `Cancelled`). Bất kỳ đơn nào ở trạng thái `Pending` hoặc `Processing` đều được bảo vệ là duy nhất trên mỗi bàn.
  2. *Bắt Exception và chuyển dịch mượt mà*:
     Trong `OrderAppService.SubmitOrderAsync`, bắt `DbUpdateException`:
     ```csharp
     try
     {
         // insert order
     }
     catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
     {
         throw new BusinessException("TooHungry:Order:TableAlreadyHasActiveOrder")
             .WithData("TableId", input.TableId);
     }
     ```
  3. *Trải nghiệm Frontend*: Bắt mã lỗi `TooHungry:Order:TableAlreadyHasActiveOrder`, hiển thị Toast thông báo và tự động tải lại Active Order hiện tại để nhân viên tiếp tục gọi món.
- **Quyết định chốt**: Đổi filter index sang `[Status] NOT IN (2, 3)`, bắt `DbUpdateException` ném `BusinessException`.

---

### Nghiên cứu 5: Khắc phục Mass Assignment tại `TableDtos.cs` & Đóng gói Trạng thái Bàn (Backend #10, #28)

- **Vấn đề**:
  - `CreateUpdateTableDto` chứa các trường nội bộ: `Status`, `OccupiedTime`, `ReservedCustomerName`, `ReservedCustomerPhone`, `ReservedTime`, `ReservedGuestCount`, `ReservedNote`.
  - Trong `TableAppService.UpdateAsync`, lệnh `ObjectMapper.Map(input, table)` ghi đè tất cả các trường trên, cho phép client vượt mặt các quy tắc kiểm tra trạng thái bàn.
  - Đoạn code reset 8 trường đặt bàn bị sao chép rải rác 8 nơi trong hệ thống.
- **Giải pháp nghiên cứu**:
  1. *Loại bỏ các trường trạng thái khỏi DTO*:
     `CreateUpdateTableDto` chỉ còn: `Name`, `Capacity`, `DiningAreaId`, `Location`.
  2. *Đóng gói trạng thái trên Aggregate Root `RestaurantTable`*:
     ```csharp
     public void Occupy(DateTime now)
     {
         Status = TableStatus.Occupied;
         OccupiedTime = now;
         ClearReservationInfo();
     }

     public void Release()
     {
         Status = TableStatus.Available;
         OccupiedTime = null;
         ClearReservationInfo();
     }

     public void MarkCleaning()
     {
         Status = TableStatus.Cleaning;
         OccupiedTime = null;
         ClearReservationInfo();
     }

     public void Reserve(string name, string phone, DateTime time, int guestCount, string? note)
     {
         Status = TableStatus.Reserved;
         ReservedCustomerName = name;
         ReservedCustomerPhone = phone;
         ReservedTime = time;
         ReservedGuestCount = guestCount;
         ReservedNote = note;
     }

     private void ClearReservationInfo()
     {
         ReservedCustomerName = null;
         ReservedCustomerPhone = null;
         ReservedTime = null;
         ReservedGuestCount = null;
         ReservedNote = null;
     }
     ```
- **Quyết định chốt**: Bỏ các trường trạng thái khỏi `CreateUpdateTableDto`, triển khai các phương thức Domain trên `RestaurantTable`.

---

### Nghiên cứu 6: Phát Thông báo Realtime SignalR sau Commit Unit of Work (Backend #11)

- **Vấn đề**: `OrderAppService` và `TableAppService` gọi `_realtimeNotifier.NotifyTableStatusChangedAsync(...)` trước khi Unit of Work commit CSDL. Nếu commit thất bại hoặc bị rollback, client đã nhận thông báo thay đổi trạng thái sai.
- **Giải pháp nghiên cứu**:
  Sử dụng callback `CurrentUnitOfWork.OnCompleted(...)`:
  ```csharp
  CurrentUnitOfWork?.OnCompleted(async () =>
  {
      await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
  });
  ```
- **Quyết định chốt**: Bọc toàn bộ các lệnh gửi thông báo SignalR trong `CurrentUnitOfWork.OnCompleted`.

---

### Nghiên cứu 7: Sửa Thuật toán Gộp bàn (`MergeTablesAsync`) (Backend #16)

- **Vấn đề**:
  - Khi gộp bàn, nếu bàn chính và bàn phụ có món trùng `DishId`, hệ thống lấy `existingItem.UnitPrice` tính lại, có thể gây sai tiền nếu đơn giá khác nhau.
  - Ghi chú món ăn `item.Note` từ bàn phụ bị bỏ qua hoàn toàn.
- **Giải pháp nghiên cứu**:
  Theo quyết định đã chốt tại phiên clarify (Session 2026-10-22):
  1. Gom về 1 dòng `OrderItem` duy nhất cho mỗi `DishId`, cộng dồn số lượng.
  2. Lấy đơn giá chuẩn từ `Dish.Price` để tính toán lại `TotalPrice = UnitPrice * Quantity`.
  3. Ghép nối ghi chú chế biến: `"{primaryItem.Note} | [Gộp từ {secondaryTable.Name}: {secondaryItem.Note}]"`.
- **Quyết định chốt**: Thực hiện gom dòng món theo `DishId`, tính lại giá theo giá niêm yết và ghép nối chuỗi ghi chú chế biến.

---

### Nghiên cứu 8: Vòng đời Đặt bàn, Khung giờ Mở cửa & Chuẩn hóa Múi giờ UTC (Backend #13, #14, #15, #29)

- **Vấn đề**:
  - Bàn chuyển sang `RESERVED` ngay khi tạo booking cách 7 ngày làm khóa bàn cả tuần.
  - `CheckInAsync` ghi đè trạng thái bàn mà không kiểm tra bàn có đang `OCCUPIED` không.
  - Giờ mở cửa lệch nhau: `TableAppService` (08:00 - 22:00) vs `TableReservationManager` (09:00 - 22:59).
  - Lẫn lộn `DateTime.Now` và `DateTime.UtcNow`.
  - `ReservationAutoCancelBackgroundWorker` thiếu `[UnitOfWork]`.
- **Giải pháp nghiên cứu**:
  1. *Khóa bàn trước 60 phút*: Bàn chỉ chuyển `RESERVED` trước giờ hẹn 60 phút. Khi tạo booking xa, đơn ở `Confirmed` nhưng bàn vẫn `Available`.
  2. *Kiểm tra Check-in*:
     ```csharp
     if (table.Status == TableStatus.Occupied)
     {
         throw new BusinessException("TooHungry:Table:TableCurrentlyOccupied");
     }
     ```
  3. *Hằng số giờ mở cửa*:
     Định nghĩa tại `TooHungryConsts`:
     ```csharp
     public const int BusinessOpeningHour = 8;
     public const int BusinessClosingHour = 22;
     ```
  4. *Chuẩn hóa Múi giờ*:
     Cấu hình trong Module: `Configure<AbpClockOptions>(options => options.Kind = DateTimeKind.Utc);`. Toàn bộ mã nguồn sử dụng `Clock.Now`.
  5. *Background Worker Atomic*:
     Gắn attribute `[UnitOfWork]` lên `ProcessOverdueReservationsAsync`.
- **Quyết định chốt**: Khóa bàn trước 60 phút, kiểm tra khi check-in, dùng hằng số `TooHungryConsts`, cấu hình UTC Clock và gắn `[UnitOfWork]`.

---

### Nghiên cứu 9: Sửa Công thức Tồn kho & State Machine Dự báo Nhu cầu (Backend #4, #26)

- **Vấn đề**:
  - `ForecastAppServices.cs` (dòng 366, 556) nhân `b.RemainingQuantity * b.ConversionFactor`. Tuy nhiên, `CreateBatchAsync` đã lưu `RemainingQuantity` theo `BaseUnit`, dẫn đến tồn kho bị nhân đôi.
  - `UpdateStatusAsync` cho phép chuyển từ `Executed` ngược về `Draft`.
  - Dòng 433 gọi `ToDictionary(x => x.DishId)` crash khi forecast input có nhiều dòng cùng món.
- **Giải pháp nghiên cứu**:
  1. Sửa công thức: `currentStockMap = batches.GroupBy(b => b.IngredientId).ToDictionary(g => g.Key, g => g.Sum(b => b.RemainingQuantity));`.
  2. Bổ sung State Machine:
     ```csharp
     if (plan.Status == PlanStatus.Executed && input.Status != PlanStatus.Executed)
     {
         throw new BusinessException("TooHungry:Forecast:CannotRevertExecutedPlan");
     }
     ```
  3. Chống crash trùng món:
     ```csharp
     var dishIdsWithQuantity = forecast.Items
         .Where(x => x.ForecastQuantity > 0)
         .GroupBy(x => x.DishId)
         .ToDictionary(g => g.Key, g => g.Sum(x => x.ForecastQuantity));
     ```
- **Quyết định chốt**: Bỏ nhân `ConversionFactor`, thêm ràng buộc trạng thái kế hoạch và gom nhóm theo `DishId`.

---

### Nghiên cứu 10: Chuẩn hóa Lô Điều chỉnh Tăng trong Kiểm kê Kho (Backend #25)

- **Vấn đề**:
  - Khi kiểm kê thừa hàng, `InventoryManager.cs` gán literal `"BaseUnit"`, `UnitCost = 0` (hoặc `1.0m`), hạn dùng `now.AddYears(1)`.
  - Chưa chặn số lượng âm trong khấu trừ kho.
- **Giải pháp nghiên cứu**:
  1. Khi tạo `adjustmentBatch`:
     - `PurchaseUnit = ingredient.BaseUnit`.
     - `UnitCost = ingredient.EstimatedPrice`.
     - `ExpiryDate`: Lấy theo hạn sử dụng xa nhất của các lô còn hạn của nguyên liệu đó; nếu chưa có lô nào thì mặc định `Clock.Now.AddDays(30)`.
     - Mã lô: `$"ADJ-{now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..24]`.
  2. Chặn số lượng âm: Kiểm tra `if (quantity <= 0) throw new BusinessException("TooHungry:Inventory:InvalidQuantity");`.
- **Quyết định chốt**: Áp dụng quy tắc tạo lô điều chỉnh chuẩn và chặn số lượng âm.
