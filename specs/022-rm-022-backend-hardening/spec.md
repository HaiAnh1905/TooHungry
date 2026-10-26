# Đặc tả Tính năng (Feature Specification): Ổn định hóa & Vá lỗi Nghiêm trọng Backend (Backend Data Integrity & Concurrency Hardening)

**Mã Tính năng (Feature ID)**: `RM-022`

**Nhánh Tính năng (Feature Branch)**: `022-rm-022-backend-hardening`

**Ngày tạo**: 2026-10-22

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**: 
- Yêu cầu từ Roadmap RM-022: *"Ổn định hóa & Vá lỗi Nghiêm trọng Backend (Backend Data Integrity & Concurrency Hardening) — Xử lý toàn diện các lỗi nghiệp vụ nghiêm trọng về tính toán tiền, xuất trừ kho, race condition và concurrency phát hiện từ CODE_REVIEW.md"*
- Tổng hợp các phát hiện trọng yếu từ `CODE_REVIEW.md`:
  - Backend #1: Trừ kho 2 lần khi trạng thái đơn hàng là Completed tại `OrderAppService.UpdateAsync`.
  - Backend #2: Client tự đặt giá (`UnitPrice`, `TotalAmount` chấp nhận từ DTO).
  - Backend #3: DTO thiếu validation để lọt số lượng âm hoặc 0 (`OrderDtos.cs`).
  - Backend #4: Tồn kho bị nhân `ConversionFactor` 2 lần tại `ForecastAppServices.cs`.
  - Backend #5: Retry Concurrency trừ kho thừa và lỗi ConcurrencyStamp (`OrderAppService.cs`, `InventoryAppService.cs`, `InventoryManager.cs`).
  - Backend #10: Mass assignment tại `TableDtos.cs` ghi đè trạng thái bàn.
  - Backend #11: Gửi SignalR trước khi commit Unit of Work.
  - Backend #12: Race condition khi tạo đơn do thiếu filtered index và xử lý lỗi 500.
  - Backend #13: Lẫn lộn múi giờ `DateTime.Now` và `DateTime.UtcNow`.
  - Backend #14: Khung giờ mở cửa định nghĩa lệch nhau giữa các service.
  - Backend #15: Logic đặt bàn chuyển RESERVED ngay khi tạo booking cách xa 7 ngày; `CheckInAsync` không kiểm tra trạng thái bàn trước khi ghi đè.
  - Backend #16: `MergeTablesAsync` cộng dồn sai giá món trùng và làm mất ghi chú (Note).
  - Backend #25: Lô điều chỉnh tăng có dữ liệu sai (`PurchaseUnit = "BaseUnit"`, `UnitCost = 0`, hạn dùng +1 năm), không chặn số lượng âm.
  - Backend #26: `ForecastAppServices.cs` thiếu máy trạng thái (Executed quay về Draft), crash `ToDictionary` khi input trùng món.
  - Backend #29: `ReservationAutoCancelBackgroundWorker.cs` thiếu `[UnitOfWork]`.
- Tuân thủ Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md) (DDD, ABP Layering, Unit of Work, Auditing, i18n song ngữ).

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 22-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.specify RM-022` - 10 Quyết định Kỹ thuật Then chốt)

- **Q1: Cơ chế đóng băng và chuyển trạng thái đơn hàng (`Order.Complete()`, `Order.Cancel()`) chống trừ kho 2 lần**:
  - **A1**: 
    - **Chỉ khấu trừ kho một lần duy nhất** khi đơn hàng chuyển từ trạng thái chưa hoàn tất sang `Completed` (`oldStatus != OrderStatus.Completed && newStatus == OrderStatus.Completed`).
    - **Đóng băng bất biến**: Khi đơn hàng đã ở trạng thái `Completed` hoặc `Cancelled`, mọi thao tác chỉnh sửa nội dung món hoặc thay đổi trạng thái qua `UpdateAsync` hay `SubmitOrder` đều bị từ chối thẳng thừng với `BusinessException("TooHungry:Order:AlreadyCompleted")` hoặc `BusinessException("TooHungry:Order:AlreadyCancelled")`.
    - **Đưa logic vào Domain Aggregate Root**: Chuyển toàn bộ logic đổi trạng thái và xác thực bất biến vào hai phương thức của thực thể `Order`: `order.Complete()` và `order.Cancel()`. Tầng `OrderAppService` chỉ đóng vai trò điều phối (orchestration), không trực tiếp gán trường dữ liệu trạng thái thô.

- **Q2: Cơ chế chống trừ kho thừa khi gặp xung đột tương tranh (Concurrency Retry Hardening)**:
  - **A2**:
    - **Loại bỏ `autoSave: true` rải rác**: Trong `InventoryManager.DeductFefoAsync`, xóa bỏ hoàn toàn `autoSave: true` tại từng vòng lặp cập nhật lô (`batch`) và bản ghi nhật ký (`transaction`). Toàn bộ thay đổi được lưu trong Entity Framework ChangeTracker và chỉ commit nguyên khối ở cuối thao tác.
    - **Vòng lặp Retry Concurrency độc lập**: Trong `OrderAppService` và `InventoryAppService`, mỗi lần thử lại (retry) khi gặp `AbpDbConcurrencyException` BẮT BUỘC phải thực thi bên trong một Unit of Work mới độc lập (`IUnitOfWorkManager.Begin(requiresNew: true)`). Điều này đảm bảo ChangeTracker được xóa sạch, tải lại phiên bản thực thể mới nhất từ CSDL cùng `ConcurrencyStamp` hợp lệ, ngăn chặn tuyệt đối việc trừ kho lặp lại ở các lô đã xử lý trước đó.

- **Q3: Triệt tiêu hoàn toàn lỗ hổng Client tự đặt giá bán & Thắt chặt DTO Validation**:
  - **A3**:
    - **Server-side Price Calculation**: Loại bỏ hoàn toàn hai thuộc tính `UnitPrice` và `TotalAmount` khỏi các DTO đầu vào từ phía client (`CreateUpdateOrderDto`, `SubmitOrderInputDto`, `CreateUpdateOrderItemDto`, `SubmitOrderItemDto`). Server tự động truy vấn giá bán chính thức `Dish.Price` từ CSDL, gán `OrderItem.UnitPrice = dish.Price`, tính `OrderItem.TotalPrice = dish.Price * quantity` và tổng hợp `Order.TotalAmount = Sum(TotalPrice)`.
    - **Thắt chặt Validation DTO**: Áp dụng Data Annotations nghiêm ngặt tại `OrderDtos.cs`:
      + `[Range(1, 999, ErrorMessage = "...")]` cho số lượng món (`Quantity`).
      + `[MinLength(1, ErrorMessage = "...")]` cho danh sách món ăn (`Items`).
      + `[StringLength(512, ErrorMessage = "...")]` cho ghi chú món và đơn hàng (`Note`).
      + Chặn đứng 100% rủi ro số lượng âm hoặc bằng 0 gây âm tiền hoặc âm kho.

- **Q4: Thiết kế Filtered Unique Index cho `Order` và chống Race Condition khi tạo đơn**:
  - **A4**:
    - Cập nhật cấu hình Entity Framework Core trong `TooHungryDbContext.cs`:
      ```csharp
      b.HasIndex(x => x.TableId)
       .IsUnique()
       .HasFilter("[TableId] IS NOT NULL AND [Status] NOT IN (2, 3) AND [IsDeleted] = 0");
      ```
      (Trong đó 2 = `Completed`, 3 = `Cancelled`). Bộ lọc này bao quát mọi trạng thái đơn hàng đang hoạt động (cả `Pending = 0` và `Processing = 1`), đảm bảo tại một thời điểm mỗi bàn ăn chỉ có DUY NHẤT một đơn hàng active.
    - Xử lý xung đột tương tranh mượt mà: Bắt `DbUpdateException` khi vi phạm Unique Index này và ném ra ngoại lệ nghiệp vụ chuẩn `BusinessException("TooHungry:Order:TableAlreadyHasActiveOrder")`, loại bỏ hoàn toàn mã lỗi 500 ném ra cho phía người dùng.
    - Cơ chế phục hồi trải nghiệm phía Frontend: Client bắt mã lỗi này, hiển thị thông báo nhẹ dạng Toast thông báo *"Bàn này vừa được đồng nghiệp tạo đơn! Đang đồng bộ..."*, tự động nạp lại Active Order hiện tại của bàn và giữ nguyên các món trong giỏ hàng tạm để nhân viên tiếp tục bổ sung vào đơn chung mà không bị mất dữ liệu gọi món.

- **Q5: Khắc phục Mass Assignment tại `TableDtos.cs` và Đóng gói Trạng thái Bàn ăn**:
  - **A5**:
    - **Loại bỏ các trường trạng thái nội bộ khỏi `CreateUpdateTableDto`**: Xóa `Status`, `OccupiedTime`, `ReservedCustomerName`, `ReservedCustomerPhone`, `ReservedTime`, `ReservedGuestCount`, `ReservedNote` khỏi DTO cập nhật bàn thông thường. Ngăn chặn triệt để hành vi lợi dụng API cập nhật bàn để ghi đè trạng thái và phá vỡ quy tắc "bàn đang có khách".
    - **Đóng gói Domain Aggregate Root `RestaurantTable`**: Xây dựng các phương thức nghiệp vụ nội bộ `table.Occupy(...)`, `table.Release()`, `table.MarkCleaning()`, `table.Reserve(...)`, thay thế cho việc gán thủ công và lặp lại đoạn mã reset 8 trường dữ liệu rải rác khắp 8 vị trí trong codebase.

- **Q6: Đảm bảo Tính Nguyên tử và Đồng bộ của Thông báo Realtime SignalR**:
  - **A6**:
    - Toàn bộ các thông báo SignalR cập nhật trạng thái bàn và đơn hàng (`NotifyTableStatusChangedAsync`, `NotifyTableOrderUpdatedAsync`) BẮT BUỘC chỉ được phát đi SAU KHI Unit of Work hiện tại đã commit CSDL thành công:
      ```csharp
      CurrentUnitOfWork?.OnCompleted(async () => {
          await _realtimeNotifier.NotifyTableStatusChangedAsync(...);
      });
      ```
    - Nếu transaction gặp lỗi hoặc bị rollback, thông báo SignalR sẽ không bao giờ được gửi, đảm bảo giao diện của các nhân viên Waiter/Cashier không bao giờ bị lệch trạng thái ảo.

- **Q7: Chuẩn hóa Nghiệp vụ Gộp bàn (`MergeTablesAsync`)**: Khi ghép món từ bàn phụ sang bàn chính, nếu món trùng `DishId` nhưng khác ghi chú chế biến (`Note`), hệ thống nên tổ chức các dòng món như thế nào?
  - **A7**: **Luôn gom về 1 dòng `OrderItem` duy nhất cho mỗi `DishId`, cộng dồn số lượng và ghép nối chuỗi ghi chú**:
    + Nếu cả hai bàn cùng gọi một món (`DishId`), hệ thống cộng dồn số lượng: `primaryItem.Quantity += secondaryItem.Quantity`.
    + Đơn giá `UnitPrice` được lấy theo giá niêm yết hiện hành `Dish.Price` từ server, tính lại `TotalPrice = UnitPrice * Quantity`.
    + Ghi chú chế biến được tự động ghép nối dạng: `"{primaryItem.Note} | [Gộp từ {secondaryTable.Name}: {secondaryItem.Note}]"` (nếu một trong hai không có ghi chú thì giữ ghi chú của bàn còn lại). Đảm bảo đầu bếp đọc được đầy đủ yêu cầu khẩu vị của cả hai lượt khách.

- **Q8: Chuẩn hóa Vòng đời Đặt bàn (`TableReservationManager`), Khung giờ Mở cửa và Múi giờ**:
  - **A8**:
    - **Khắc phục chiếm giữ bàn sớm**: Bàn chỉ tự động chuyển sang trạng thái `Reserved` trước giờ hẹn đặt bàn **60 phút** (hoặc khi nhân viên phục vụ chủ động đón khách). Khi tạo đơn đặt bàn trước nhiều ngày (ví dụ 3 - 7 ngày), bàn vẫn duy trì trạng thái `Available` phục vụ khách vãng lai bình thường cho tới khung giờ quy định.
    - **Kiểm tra trạng thái khi Check-In (`CheckInAsync`)**: Trước khi chuyển bàn sang `Occupied` cho khách đặt bàn đến nhận, hệ thống PHẢI kiểm tra nếu bàn đang `Occupied` (chưa thanh toán xong phiên ăn trước), hệ thống ném `BusinessException("TooHungry:Table:TableCurrentlyOccupied")` để nhân viên sắp xếp bàn khác hoặc hoàn tất phiên trước, không ghi đè làm mất đơn của khách đang ngồi.
    - **Thống nhất khung giờ mở cửa tập trung**: Khai báo hằng số tập trung duy nhất tại tầng Domain (`TooHungryConsts.BusinessOpeningHour = 8`, `TooHungryConsts.BusinessClosingHour = 22`), thống nhất 100% logic xác thực giữa `TableAppService` và `TableReservationManager`.
    - **Đảm bảo tính nguyên tử cho Background Worker**: Bổ sung attribute `[UnitOfWork]` cho phương thức `ProcessOverdueReservationsAsync` của `ReservationAutoCancelBackgroundWorker` để bảo đảm các thao tác cập nhật hủy bàn quá hạn được thực thi trong một transaction nguyên tử.
    - **Chuẩn hóa múi giờ toàn hệ thống**: Cấu hình `AbpClockOptions.Kind = DateTimeKind.Utc` tại module khởi tạo; thay thế toàn bộ `DateTime.Now` và `DateTime.UtcNow` rải rác bằng `Clock.Now`.

- **Q9: Sửa Công thức Tính Tồn kho & Ràng buộc Máy trạng thái Dự báo (`ForecastAppServices.cs`)**:
  - **A9**:
    - **Sửa công thức tồn kho**: Xóa bỏ phép nhân `* b.ConversionFactor` tại dòng 366 và 556 trong `ForecastAppServices.cs`. Vì `RemainingQuantity` của từng lô đã được quy đổi sẵn về `BaseUnit` ngay từ khi nhập lô (`CreateBatchAsync`), tồn kho thực tế khả dụng chỉ bằng `Sum(b => b.RemainingQuantity)`.
    - **Cài đặt State Machine cho Kế hoạch mua hàng**: Nghiêm cấm mọi hành vi chuyển trạng thái từ `Executed` ngược về `Draft` hoặc `Confirmed`. Trạng thái chuyển đổi chỉ được phép theo thứ tự một chiều: `Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Executed`.
    - **Xử lý chống crash trùng món**: Gom nhóm các mục trùng lặp theo `DishId` (`GroupBy(x => x.DishId).ToDictionary(g => g.Key, g => g.Sum(x => x.ForecastQuantity))`) trước khi gọi `ToDictionary`, triệt tiêu hoàn toàn lỗi crash 500 `ArgumentException`.

- **Q10: Chuẩn hóa Lô Hàng Điều chỉnh Tăng trong Kiểm kê Kho (`InventoryManager.cs`)**:
  - **A10**:
    - Khi phát hiện tồn kho thực tế thừa hơn sổ sách trong phiên kiểm kê:
      + Đơn vị mua (`PurchaseUnit`) phải lấy đúng đơn vị đo lường chuẩn của `Ingredient` thay vì gán chuỗi literal `"BaseUnit"`.
      + Giá vốn `UnitCost` phải lấy theo `Ingredient.EstimatedPrice` hoặc giá vốn trung bình của các lô gần nhất, không được gán bằng `0` hoặc `1.0m`.
      + Hạn sử dụng của lô điều chỉnh tăng (`ExpiryDate`) được tự động lấy bằng hạn sử dụng xa nhất của các lô hàng còn hạn hiện có của nguyên liệu đó trong kho; trường hợp nguyên liệu chưa từng có lô nào hoặc các lô đều đã hết hạn, hệ thống đặt mặc định thời hạn an toàn 30 ngày (`Clock.Now.AddDays(30)`), tuyệt đối không tự tiện cộng 1 năm (`now.AddYears(1)`).
      + Mã lô sinh tự động sử dụng định dạng chống va chạm nano-time kèm số ngẫu nhiên: `ADJ-{now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..4]}`.
      + Kiểm tra chặn đứng mọi số lượng âm trong danh sách khấu trừ lô (`batchDeductions`).

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Trong hệ thống vận hành nhà hàng **Acme.TooHungry**, tính toàn vẹn dữ liệu (Data Integrity) và độ tin cậy trong môi trường xử lý đồng thời (Concurrency Hardening) là xương sống quyết định sự sống còn của doanh nghiệp. Sau khi hệ thống vận hành qua 4 Wave đầu tiên, đợt kiểm tra mã nguồn toàn diện (`CODE_REVIEW.md`) đã phát hiện 15 vấn đề nghiêm trọng thuộc tầng Backend có khả năng:
1. **Làm sai lệch sổ sách tài chính**: Doanh thu bị tính sai do client có thể gửi đơn giá tùy ý (`UnitPrice`), hoặc sai giá khi gộp bàn.
2. **Gây thất thoát và sai lệch kho vật lý**: Đơn hàng bị trừ kho 2 lần khi cập nhật trạng thái; vòng lặp retry concurrency trừ lặp lại các lô hàng đã khấu trừ; công thức tính tồn kho trong module dự báo bị thổi phồng gấp đôi do nhân thừa hệ số quy đổi đơn vị (`ConversionFactor`).
3. **Phá vỡ tính toàn vẹn phiên ăn và bàn ăn**: Khách hàng hoặc nhân viên gửi nhiều yêu cầu tạo đơn đồng thời gây va chạm 500; mass assignment cho phép ghi đè trạng thái bàn; bàn bị khóa `Reserved` cả tuần trước giờ hẹn; gộp bàn làm mất ghi chú món; SignalR phát thông báo trước khi commit CSDL.
4. **Lệch múi giờ và dữ liệu kiểm kê**: Dùng lẫn lộn `DateTime.Now` và `DateTime.UtcNow` làm lệch 7 tiếng so với giờ địa phương Việt Nam; lô điều chỉnh kho kiểm kê sinh dữ liệu sai (giá vốn = 0, hạn dùng 1 năm).

**RM-022** đóng vai trò là gói nâng cấp nền tảng **Harden Backend** trọng yếu của Wave 5, bịt kín toàn bộ các lỗ hổng trên, đưa logic chuyển trạng thái vào đúng chuẩn Domain-Driven Design (DDD) của ABP Framework, xây dựng các rào chắn kiểm thử bất biến và bảo vệ tuyệt đối tính chính xác của dữ liệu nhà hàng.

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 — Toàn vẹn Khấu trừ Kho & Ngăn chặn Trừ kho Trùng lặp (Priority: P1)

Là một **Quản lý Nhà hàng / Kế toán Kho**, tôi muốn hệ thống chỉ khấu trừ kho nguyên liệu duy nhất 1 lần khi đơn hàng chuyển sang trạng thái Hoàn thành (`Completed`), và đóng băng hoàn toàn không cho phép sửa đổi các đơn hàng đã Hoàn tất hoặc đã Hủy, nhằm đảm bảo số lượng tồn kho trên phần mềm luôn khớp 100% với kho thực tế.

**Lý do ưu tiên**: Trừ kho trùng lặp làm sai lệch nghiêm trọng báo cáo tài chính kho, khiến hệ thống báo hết nguyên liệu ảo và đình trệ quy trình gọi món tại bếp.

**Kiểm thử Độc lập**:
- Tạo một đơn hàng có chứa 2 món ăn có liên kết công thức Recipe tiêu hao nguyên liệu.
- Hoàn tất đơn hàng chuyển sang `Completed`: Kiểm tra kho nguyên liệu bị trừ đúng định mức.
- Gửi yêu cầu cập nhật lại đơn hàng đã `Completed` đó (qua API hoặc giao diện): Hệ thống từ chối và ném lỗi `TooHungry:Order:AlreadyCompleted`. Số dư kho nguyên liệu giữ nguyên, không bị trừ thêm lần nào.
- Thử chuyển một đơn hàng đã `Cancelled` sang `Completed`: Hệ thống từ chối với lỗi `TooHungry:Order:AlreadyCancelled`.
- Giả lập xung đột concurrency khi 2 thread cùng trừ kho: Hệ thống retry với Unit of Work độc lập và chỉ trừ đúng định mức của từng lô.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** một đơn hàng đang ở trạng thái `Processing` có các món ăn liên kết Recipe, **Khi (When)** nhân viên hoàn tất đơn hàng (`order.Complete()`), **Thì (Then)** hệ thống khấu trừ nguyên liệu theo thuật toán FEFO đúng 1 lần, ghi nhận đầy đủ nhật ký giao dịch `InventoryTransactionType.OUT`, và cập nhật trạng thái đơn thành `Completed`.
2. **Cho trước (Given)** một đơn hàng đã ở trạng thái `Completed`, **Khi (When)** có bất kỳ yêu cầu `UpdateAsync` nào gửi đến đơn hàng này, **Thì (Then)** hệ thống lập tức ném ngoại lệ `BusinessException("TooHungry:Order:AlreadyCompleted")`, chặn mọi thay đổi và không thực hiện thêm bất kỳ thao tác trừ kho nào.
3. **Cho trước (Given)** một đơn hàng đã ở trạng thái `Cancelled`, **Khi (When)** có yêu cầu chuyển sang `Completed`, **Thì (Then)** hệ thống lập tức ném ngoại lệ `BusinessException("TooHungry:Order:AlreadyCancelled")`.
4. **Cho trước (Given)** quá trình trừ kho gặp `AbpDbConcurrencyException` do tranh chấp lô hàng, **Khi (When)** hệ thống kích hoạt cơ chế retry (tối đa 3 lần), **Thì (Then)** mỗi lần retry chạy trong một Unit of Work mới độc lập (`requiresNew: true`), không lưu lại trạng thái trừ dở dang của lần trước và không gây trừ thừa số lượng.

---

### User Story 2 — Kiểm soát Chặt chẽ Đơn giá & DTO Validation Phía Server (Priority: P1)

Là một **Chủ Nhà hàng / Nhân viên Thu ngân**, tôi muốn đơn giá món ăn và tổng tiền hóa đơn phải do máy chủ tự động tính toán dựa trên bảng giá niêm yết trong hệ thống (`Dish.Price`), đồng thời hệ thống phải từ chối ngay lập tức các đơn hàng có số lượng âm hoặc bằng 0, nhằm ngăn chặn hoàn toàn việc can thiệp giá bán và gian lận doanh thu.

**Lý do ưu tiên**: Nếu client có thể tự đặt `UnitPrice = 0` hoặc số lượng âm, nhà hàng sẽ bị thất thoát tài sản lớn và dữ liệu kế toán bị hỏng.

**Kiểm thử Độc lập**:
- Gửi một request tạo đơn hàng (`POST /api/app/order`) với payload chứa `UnitPrice: 0` hoặc `TotalAmount: 1000`.
- Kiểm tra dữ liệu lưu trong CSDL: Đơn giá `UnitPrice` của từng món được ghi đè bằng `Dish.Price` chuẩn của món đó; tổng tiền `TotalAmount` bằng tổng tiền các món nhân với số lượng.
- Gửi request tạo/sửa đơn với `Quantity = -2` hoặc `Quantity = 0`: Hệ thống trả mã lỗi 400 Validation Error và nêu rõ ràng thông báo lỗi.
- Gửi request tạo đơn với danh sách `Items` rỗng: Hệ thống trả mã lỗi 400.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên phục vụ tạo đơn hàng cho bàn ăn, **Khi (When)** client gửi dữ liệu các món gọi (chỉ gồm `DishId`, `Quantity`, `Note`), **Thì (Then)** hệ thống lấy giá bán trực tiếp từ `Dish.Price` tương ứng trong CSDL, gán vào `OrderItem.UnitPrice`, tính `TotalPrice = UnitPrice * Quantity` và tính tổng `Order.TotalAmount` độc lập hoàn toàn với client.
2. **Cho trước (Given)** một kẻ gian hoặc client lỗi gửi kèm trường `UnitPrice` hoặc `TotalAmount` sai lệch trong request, **Khi (When)** server tiếp nhận, **Thì (Then)** server hoàn toàn bỏ qua các trường này và tính toán lại 100% theo giá niêm yết hiện hành.
3. **Cho trước (Given)** dữ liệu đầu vào chứa dòng món có `Quantity <= 0` hoặc `Quantity > 999`, **Khi (When)** kiểm tra tính hợp lệ DTO, **Thì (Then)** hệ thống chặn ngay tại cổng validate với thông báo lỗi rõ ràng song ngữ (`vi.json`, `en.json`).

---

### User Story 3 — Chống Race Condition Bàn ăn, Khắc phục Mass Assignment & Gộp bàn An toàn (Priority: P1)

Là một **Nhân viên Phục vụ (Waiter) / Thu ngân (Cashier)**, khi tôi và đồng nghiệp cùng thao tác tạo đơn, chuyển bàn hoặc gộp bàn trên cùng một bàn ăn tại giờ cao điểm, tôi muốn hệ thống đảm bảo mỗi bàn chỉ có duy nhất một đơn hàng đang phục vụ, không bị lỗi sập máy chủ (500), không làm mất ghi chú món của khách và không bị gửi thông báo trạng thái ảo khi có sự cố.

**Lý do ưu tiên**: Xung đột dữ liệu bàn ăn và đơn hàng tại giờ cao điểm gây tắc nghẽn quầy thu ngân, sai lệch đơn gọi món của khách và phát sinh lỗi hệ thống.

**Kiểm thử Độc lập**:
- Gửi 2 request tạo đơn đồng thời cho cùng Bàn 01 (`SubmitOrder`). Request 1 thành công; Request 2 nhận được mã lỗi nghiệp vụ dễ hiểu `TooHungry:Order:TableAlreadyHasActiveOrder` thay vì lỗi máy chủ 500.
- Gọi API cập nhật thông tin bàn (`PUT /api/app/table/{id}`): Gửi kèm `Status: Available` cho bàn đang `Occupied`. Trạng thái bàn giữ nguyên `Occupied` vì trường trạng thái đã bị loại khỏi DTO.
- Thao tác gộp bàn 02 vào bàn 01: Món Bò xào ở bàn 01 có ghi chú "Ít cay", ở bàn 02 có ghi chú "Không hành". Sau khi gộp, đơn bàn 01 bảo toàn cả hai yêu cầu chế biến này.
- Ngắt kết nối CSDL hoặc giả lập rollback transaction sau khi đổi trạng thái bàn: Đảm bảo SignalR không phát ra thông báo trạng thái bàn đổi sang máy khác.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** Bàn 05 đang có một đơn hàng ở trạng thái `Pending` hoặc `Processing`, **Khi (When)** có request tạo đơn mới cho Bàn 05, **Thì (Then)** hệ thống bắt lỗi vi phạm Unique Constraint và ném `BusinessException("TooHungry:Order:TableAlreadyHasActiveOrder")`. Giao diện Frontend bắt mã lỗi này, hiển thị Toast thông báo nhẹ *"Bàn này vừa được đồng nghiệp tạo đơn! Đang đồng bộ..."*, tự động nạp lại Active Order hiện tại của bàn và giữ nguyên giỏ hàng tạm để nhân viên bổ sung vào đơn chung.
2. **Cho trước (Given)** người dùng cập nhật thông tin vị trí hoặc số ghế của bàn qua `UpdateTableDto`, **Khi (When)** gửi dữ liệu lên server, **Thì (Then)** trạng thái hoạt động của bàn (`Status`, `OccupiedTime`) không bị ảnh hưởng và chỉ có thể thay đổi thông qua quy trình nghiệp vụ chuyên biệt (`ChangeStatusAsync`).
3. **Cho trước (Given)** hai bàn ăn cần gộp có chung một món nhưng khác ghi chú hoặc giá khác nhau, **Khi (When)** thu ngân thực hiện `MergeTablesAsync`, **Thì (Then)** hệ thống gom về 1 dòng `OrderItem` duy nhất cho mỗi món, cộng dồn số lượng, tính lại `TotalPrice = Dish.Price * Quantity` và tự động ghép nối chuỗi ghi chú dạng `"{primaryItem.Note} | [Gộp từ {secondaryTable.Name}: {secondaryItem.Note}]"`, không làm mất yêu cầu chế biến của khách hàng bàn phụ.
4. **Cho trước (Given)** thao tác thay đổi trạng thái bàn hoặc đơn hàng đang diễn ra trong Unit of Work, **Khi (When)** transaction commit thành công, **Thì (Then)** SignalR mới phát thông báo realtime (`CurrentUnitOfWork.OnCompleted`). Nếu transaction bị hủy (rollback), tuyệt đối không có thông báo nào được phát đi.

---

### User Story 4 — Tính toán Tồn kho Chính xác & Ràng buộc Máy trạng thái Kế hoạch Dự báo (Priority: P1)

Là một **Quản lý Nhà hàng**, khi tôi xem dự báo nhu cầu nguyên liệu và duyệt kế hoạch mua sắm (RM-014), tôi muốn số lượng tồn kho khả dụng hiển thị chính xác theo đơn vị cơ sở chuẩn mà không bị nhân sai hệ số quy đổi, đồng thời kế hoạch mua hàng một khi đã Thực thi (`Executed`) thì không thể quay ngược về Bản nháp (`Draft`), nhằm đảm bảo kế hoạch cung ứng nguyên liệu luôn chuẩn xác.

**Lý do ưu tiên**: Tồn kho bị nhân đôi làm quản lý tưởng nhầm kho còn nhiều, dẫn đến không mua nguyên liệu và bếp bị đứt gãy nguồn cung. Kế hoạch mua hàng quay về Draft tùy tiện làm sai lệch lịch sử phê duyệt mua sắm.

**Kiểm thử Độc lập**:
- Nguyên liệu "Thịt bò" có 2 lô hàng, mỗi lô còn 5 kg (BaseUnit: kg, ConversionFactor: 1.0). Tồn kho hiển thị trong kế hoạch dự báo phải là đúng 10 kg, không phải 20 kg.
- Nhập một danh sách dự báo chứa 2 dòng cùng món "Phở bò" (do hai ca phục vụ khác nhau): Hệ thống tổng hợp tự động số lượng dự báo mà không bị văng lỗi 500 do trùng khóa từ điển.
- Kế hoạch nguyên liệu đang ở trạng thái `Executed`: Gửi request chuyển về `Draft`. Hệ thống từ chối và thông báo trạng thái không hợp lệ.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** các lô hàng trong kho đã lưu `RemainingQuantity` theo `BaseUnit`, **Khi (When)** hệ thống tính toán tồn kho cho Kế hoạch nguyên liệu trong `ForecastAppServices.cs`, **Thì (Then)** hệ thống tính tổng trực tiếp `Sum(b => b.RemainingQuantity)` mà không nhân thêm `ConversionFactor`.
2. **Cho trước (Given)** danh sách món ăn trong dự báo nhu cầu có nhiều dòng trùng món ăn, **Khi (When)** hệ thống bóc tách định lượng nguyên liệu, **Thì (Then)** hệ thống gom nhóm theo `DishId` và tính tổng số lượng trước khi chuyển đổi, loại bỏ hoàn toàn lỗi crash `ArgumentException`.
3. **Cho trước (Given)** Kế hoạch nguyên liệu đã chuyển sang trạng thái `Executed`, **Khi (When)** có yêu cầu thay đổi trạng thái về `Draft` hoặc `Confirmed`, **Thì (Then)** hệ thống ném ngoại lệ nghiệp vụ `BusinessException("TooHungry:Forecast:InvalidStatusTransition")`.

---

### User Story 5 — Chuẩn hóa Vòng đời Đặt bàn, Khung giờ Mở cửa & Múi giờ Hệ thống (Priority: P2)

Là một **Nhân viên Tiếp tân (Hostess) / Quản lý**, tôi muốn đơn đặt bàn trước nhiều ngày không làm khóa bàn ăn ngay lập tức, khung giờ nhận đặt bàn được thống nhất xuyên suốt mọi phân hệ, và hệ thống tự động hủy bàn đặt quá hạn một cách an toàn, nhằm tối ưu hóa công suất phục vụ bàn của nhà hàng.

**Lý do ưu tiên**: Khóa bàn trước 7 ngày làm mất hàng chục lượt phục vụ khách vãng lai, gây lãng phí công suất nhà hàng. Lệch múi giờ làm báo cáo ca hôm nay hiển thị sai lệch 7 tiếng.

**Kiểm thử Độc lập**:
- Tạo một đơn đặt bàn cho ngày mai hoặc 5 ngày sau: Kiểm tra bàn ăn vẫn ở trạng thái `Available` để phục vụ khách trong ngày hôm nay.
- Bàn chỉ chuyển sang `Reserved` trong vòng 60 phút trước giờ hẹn đón khách.
- Khách đến nhận bàn (`CheckInAsync`): Nếu bàn đó hiện đang có khách ngồi (`Occupied`), hệ thống cảnh báo và từ chối check-in đè.
- Thử đặt bàn lúc 08:30 sáng và lúc 22:30 tối: Cả hai service `TableAppService` và `TableReservationManager` đều áp dụng cùng một luật mở cửa (08:00 - 22:00).
- Chạy Background Worker quét hủy bàn quá hạn 60 phút: Trạng thái đơn chuyển `AutoCancelled`, giải phóng bàn về `Available` trong cùng một transaction nguyên tử `[UnitOfWork]`.
- Kiểm tra toàn bộ thời gian lưu trữ trong hệ thống: Thống nhất sử dụng chuẩn `Clock.Now` (UTC).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** một khách hàng đặt bàn trước thời điểm hiện tại hơn 60 phút, **Khi (When)** đơn đặt bàn được tạo thành công, **Thì (Then)** đơn đặt bàn ở trạng thái `Confirmed` nhưng bàn ăn vẫn duy trì trạng thái `Available` phục vụ khách bình thường.
2. **Cho trước (Given)** thời điểm hiện tại bước vào khung giờ trước giờ hẹn 60 phút, **Khi (When)** hệ thống kiểm tra hoặc nhân viên mở màn hình bàn, **Thì (Then)** bàn được đồng bộ hiển thị sang `Reserved`.
3. **Cho trước (Given)** khách đến nhận bàn nhưng bàn đó đang ở trạng thái `Occupied`, **Khi (When)** tiếp tân bấm Check-In, **Thì (Then)** hệ thống chặn lại và ném thông báo lỗi `BusinessException("TooHungry:Table:TableCurrentlyOccupied")`.
4. **Cho trước (Given)** đơn đặt bàn quá hạn giờ hẹn 60 phút mà khách không đến, **Khi (When)** `ReservationAutoCancelBackgroundWorker` chạy quét, **Thì (Then)** việc cập nhật trạng thái đơn thành `AutoCancelled` và giải phóng bàn về `Available` được thực thi nguyên tử trong một `[UnitOfWork]`.

---

### User Story 6 — Chuẩn hóa Lô Điều chỉnh Kiểm kê Kho & Tính Toàn vẹn Dữ liệu (Priority: P2)

Là một **Thủ kho / Kế toán**, khi tôi tiến hành kiểm kê định kỳ và phát hiện số lượng thực tế nhiều hơn sổ sách, tôi muốn lô hàng điều chỉnh tăng được tạo ra với đúng đơn vị mua chuẩn của nguyên liệu, đúng giá vốn hợp lý và hạn dùng thực tế, đồng thời hệ thống chặn tuyệt đối các giá trị trừ kho âm, nhằm bảo đảm sổ sách kế toán kho hoàn toàn minh bạch và chuẩn mực.

**Lý do ưu tiên**: Lô điều chỉnh có giá vốn bằng 0 và hạn dùng 1 năm làm méo mó giá thành sản phẩm và vi phạm quy chuẩn an toàn thực phẩm đối với nguyên liệu tươi sống.

**Kiểm thử Độc lập**:
- Thực hiện kiểm kê tăng 5 kg nguyên liệu "Thịt bò Úc": Kiểm tra lô hàng `ADJ-*` sinh ra có `PurchaseUnit = "kg"` (không phải chữ `"BaseUnit"`), `UnitCost` lấy theo giá ước tính của nguyên liệu (hoặc giá vốn trung bình), và hạn sử dụng không bị cộng lố 1 năm đối với đồ tươi.
- Mã lô điều chỉnh được sinh kèm hậu tố ngẫu nhiên độc nhất, không bị trùng khóa khi có 2 người kiểm kê cùng 1 giây.
- Thử gửi danh sách trừ kho có số lượng âm: Hệ thống ném ngoại lệ và từ chối xử lý.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** phiên kiểm kê kho phát hiện chênh lệch thừa, **Khi (When)** hệ thống tạo lô hàng điều chỉnh tăng (`adjustmentBatch`), **Thì (Then)** hệ thống gán `PurchaseUnit` từ thông tin nguyên liệu, `UnitCost` từ `Ingredient.EstimatedPrice`, và thời hạn sử dụng được tính dựa trên đặc tính bảo quản an toàn của nguyên liệu.
2. **Cho trước (Given)** nhiều giao dịch kiểm kê diễn ra đồng thời trong cùng một giây, **Khi (When)** tạo mã lô điều chỉnh `ADJ-*`, **Thì (Then)** mã lô được sinh kèm định danh ngẫu nhiên chống trùng lặp, bảo đảm tính duy nhất tuyệt đối.
3. **Cho trước (Given)** thao tác khấu trừ kho, **Khi (When)** tham số số lượng đầu vào `<= 0`, **Thì (Then)** hệ thống từ chối thực thi và ném ngoại lệ hợp lệ.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Client cố tình gửi `UnitPrice` hoặc `TotalAmount` sai lệch trong request**: Server hoàn toàn phớt lờ các thuộc tính này và tự động truy vấn giá chuẩn từ `Dish.Price` để tính toán lại 100%.
- **EC-002: Hai nhân viên cùng tạo đơn hoặc gửi món cho cùng một bàn đồng thời**: Database Filtered Unique Index ngăn chặn bản ghi thứ hai; server bắt `DbUpdateException` và ném `BusinessException("TooHungry:Order:TableAlreadyHasActiveOrder")` với thông điệp rõ ràng cho nhân viên.
- **EC-003: Đơn hàng đã ở trạng thái `Completed` hoặc `Cancelled` nhận request cập nhật từ client**: Server từ chối ngay lập tức và ném `BusinessException("TooHungry:Order:AlreadyCompleted")` hoặc `AlreadyCancelled`, ngăn chặn trừ kho lần 2.
- **EC-004: Gộp hai bàn mà bàn phụ có món trùng tên nhưng ghi chú (`Note`) khác nhau hoặc giá khác nhau**: Hệ thống tính lại giá chuẩn và ghép nối toàn bộ ghi chú của cả hai bàn dạng `"[Ghi chú bàn chính] | [Gộp từ Bàn phụ: Ghi chú bàn phụ]"`, không làm mất yêu cầu của thực khách.
- **EC-005: Khấu trừ kho gặp xung đột tương tranh (Concurrency) tại giờ cao điểm**: Vòng lặp retry bắt đầu với Unit of Work mới độc lập (`requiresNew: true`), nạp lại phiên bản thực thể mới nhất và trừ đúng số lượng còn thiếu, không trừ thừa các lô đã xử lý.
- **EC-006: Khách đặt bàn trước 5 ngày nhưng đến sớm hoặc hủy**: Bàn chưa bị khóa `Reserved` từ trước nên không bị gián đoạn hoạt động đón khách; khi tiếp tân bấm Check-In, hệ thống kiểm tra bàn có đang `Occupied` hay không trước khi tiếp nhận.
- **EC-007: Điều chỉnh kiểm kê với số lượng âm vượt quá tồn kho**: Server chặn đứng việc nhập số lượng tồn thực tế âm, chặn các giá trị khấu trừ âm trong các giao dịch kho.
- **EC-008: Giao dịch CSDL bị rollback sau khi đã phát lệnh đổi trạng thái bàn**: Nhờ cơ chế `CurrentUnitOfWork.OnCompleted`, thông báo SignalR chỉ được gửi sau khi commit thành công, không bao giờ phát sinh thông báo ảo cho các máy client.

---

## 4. Yêu cầu Hệ thống (System Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI đảm bảo chỉ thực hiện khấu trừ kho nguyên liệu theo FEFO khi đơn hàng chuyển từ trạng thái chưa hoàn tất sang `Completed` (`oldStatus != Completed && newStatus == Completed`).
- **FR-002**: Hệ thống PHẢI đóng băng hoàn toàn các đơn hàng đã `Completed` hoặc `Cancelled`, chặn mọi thao tác cập nhật món hoặc đổi trạng thái qua `UpdateAsync` và ném `BusinessException` tương ứng.
- **FR-003**: Hệ thống PHẢI đưa logic chuyển trạng thái đơn hàng vào các phương thức Aggregate Root của Domain: `Order.Complete()` và `Order.Cancel()`.
- **FR-004**: Hệ thống PHẢI loại bỏ `autoSave: true` rải rác từng lô trong `InventoryManager.DeductFefoAsync`, chỉ commit nguyên khối khi hoàn tất toàn bộ tiến trình.
- **FR-005**: Hệ thống PHẢI thực thi các vòng lặp retry concurrency trong `OrderAppService` và `InventoryAppService` bên trong một Unit of Work mới độc lập (`IUnitOfWorkManager.Begin(requiresNew: true)`).
- **FR-006**: Hệ thống PHẢI tự động tính toán `UnitPrice`, `TotalPrice` và `TotalAmount` phía máy chủ dựa trên `Dish.Price` trong CSDL, loại bỏ hoàn toàn `UnitPrice` và `TotalAmount` khỏi các DTO đầu vào của client.
- **FR-007**: Hệ thống PHẢI áp dụng validation Data Annotations cho các DTO đơn hàng (`OrderDtos.cs`): `[Range(1, 999)] Quantity`, `[MinLength(1)] Items`, `[StringLength(512)] Note`.
- **FR-008**: Hệ thống PHẢI cấu hình Filtered Unique Index trong EF Core cho `Orders` bao quát mọi trạng thái đơn active (`[TableId] IS NOT NULL AND [Status] NOT IN (2, 3) AND [IsDeleted] = 0`), đồng thời bắt `DbUpdateException` để ném `BusinessException` chuẩn mực.
- **FR-009**: Hệ thống PHẢI loại bỏ các trường trạng thái nội bộ (`Status`, `OccupiedTime`, `Reserved*`) khỏi `CreateUpdateTableDto`, chỉ cho phép thay đổi trạng thái qua domain methods/services chuyên biệt.
- **FR-010**: Hệ thống PHẢI đóng gói các phương thức thao tác trạng thái bàn ăn vào Aggregate Root `RestaurantTable`: `Occupy()`, `Release()`, `MarkCleaning()`, `Reserve()`.
- **FR-011**: Hệ thống PHẢI đăng ký các lệnh phát thông báo SignalR thông qua `CurrentUnitOfWork.OnCompleted(...)`, chỉ phát thông báo sau khi transaction commit thành công.
- **FR-012**: Hệ thống PHẢI bảo toàn nguyên vẹn ghi chú chế biến (`Note`) và tính đúng giá niêm yết khi thực hiện gộp bàn ăn (`MergeTablesAsync`).
- **FR-013**: Hệ thống PHẢI đảm bảo đơn đặt bàn trước chỉ chuyển bàn sang `Reserved` trong vòng 60 phút trước giờ hẹn đón khách; `CheckInAsync` phải kiểm tra trạng thái bàn hiện tại trước khi tiếp nhận.
- **FR-014**: Hệ thống PHẢI thống nhất khung giờ nhận đặt bàn và mở cửa giữa `TableAppService` và `TableReservationManager` thông qua hằng số tập trung tại tầng Domain.
- **FR-015**: Hệ thống PHẢI gắn attribute `[UnitOfWork]` cho phương thức xử lý hủy bàn tự động của `ReservationAutoCancelBackgroundWorker`.
- **FR-016**: Hệ thống PHẢI cấu hình `AbpClockOptions.Kind = DateTimeKind.Utc` và chuẩn hóa toàn bộ các điểm gọi thời gian sang `Clock.Now`.
- **FR-017**: Hệ thống PHẢI sửa lỗi nhân đôi `ConversionFactor` trong `ForecastAppServices.cs`, cài đặt State Machine một chiều (`Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Executed`) và gom nhóm theo `DishId` chống lỗi trùng món.
- **FR-018**: Hệ thống PHẢI chuẩn hóa dữ liệu lô điều chỉnh kiểm kê kho tăng (`PurchaseUnit` chuẩn, `UnitCost` chuẩn, hạn dùng hợp lý, mã lô duy nhất) và chặn số lượng âm trong khấu trừ kho.

### Yêu cầu Phi chức năng (Non-Functional Requirements)

- **NFR-001 (Tính Toàn vẹn & Nguyên tử - ACID)**: Mọi thao tác cập nhật trạng thái liên kết giữa Bàn ăn, Đơn hàng, Lô hàng và Giao dịch kho phải được bọc trong Unit of Work nguyên tử, cam kết không bao giờ để lại trạng thái dở dang khi xảy ra lỗi.
- **NFR-002 (Hiệu năng & Khả năng chịu tải đồng thời)**: Giảm thiểu tắc nghẽn database lock bằng cách loại bỏ `autoSave` rải rác; các truy vấn kiểm tra tồn tại và đọc dữ liệu không giữ khóa không cần thiết.
- **NFR-003 (Bảo mật & Phòng thủ Chiều sâu)**: Triệt tiêu hoàn toàn nguy cơ tấn công thao túng giá (Price Tampering) và ghi đè trạng thái (Mass Assignment) bằng cách kiểm soát chặt chẽ hợp đồng API DTOs.
- **NFR-004 (Chuẩn mực Exception & Thân thiện Người dùng)**: 100% các ngoại lệ nghiệp vụ phải kế thừa `BusinessException` của ABP kèm mã lỗi định danh, không để rò rỉ mã lỗi kỹ thuật 500 ra client.
- **NFR-005 (Quốc tế hóa i18n)**: 100% các mã lỗi và thông điệp nghiệp vụ mới phát sinh phải được khai báo đầy đủ song ngữ trong cả `vi.json` và `en.json`.
- **NFR-006 (Kiểm thử Hóa & Bất biến)**: Cung cấp đầy đủ các bài kiểm thử tự động (Unit Tests & Integration Tests) xác minh tính bất biến (Idempotency) của việc trừ kho và hành vi tương tranh (Concurrency).

---

## 5. Các Thực thể Chính (Key Entities)

- **`Order` (Aggregate Root)**: Đại diện cho đơn hàng của bàn ăn. Quản lý trạng thái (`Status`), tổng tiền (`TotalAmount`), số đơn (`OrderNumber`), ngày giờ (`OrderDate`), và danh sách món gọi (`Items`). Đóng gói các phương thức nghiệp vụ: `Complete()`, `Cancel()`, `AddItem()`.
- **`OrderItem` (Entity)**: Đại diện cho từng dòng món ăn trong đơn. Chứa `DishId`, `Quantity`, `UnitPrice`, `TotalPrice`, và `Note`.
- **`RestaurantTable` (Aggregate Root)**: Đại diện cho bàn ăn trong nhà hàng. Quản lý tên bàn, sức chứa, khu vực, trạng thái (`Status`), thời gian ngồi (`OccupiedTime`) và thông tin đặt bàn. Đóng gói các phương thức nghiệp vụ: `Occupy()`, `Release()`, `MarkCleaning()`, `Reserve()`.
- **`TableReservation` (Aggregate Root)**: Đại diện cho phiếu đặt bàn trước của khách hàng. Quản lý thông tin khách, số lượng khách, thời gian hẹn (`ReservationTime`), trạng thái (`Status`).
- **`InventoryBatch` (Aggregate Root)**: Đại diện cho từng lô nguyên liệu nhập kho. Quản lý mã lô, nguyên liệu, số lượng ban đầu, số lượng còn lại (`RemainingQuantity`), đơn giá vốn (`UnitCost`), ngày nhập và hạn sử dụng.
- **`InventoryTransaction` (Aggregate Root)**: Đại diện cho nhật ký biến động kho bất biến (`IN`, `OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DISCARD`).
- **`DemandForecast` & `IngredientPlan` (Aggregate Roots)**: Đại diện cho dự báo nhu cầu món ăn và kế hoạch cung ứng nguyên liệu. Quản lý máy trạng thái kế hoạch (`Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Executed`).

---

## 6. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

- **SC-001 (Không trừ kho trùng lặp)**: 100% các đơn hàng đã ở trạng thái `Completed` khi nhận thao tác cập nhật đều bị từ chối an toàn; tỷ lệ trừ kho trùng lặp giảm về đúng 0%.
- **SC-002 (Bảo vệ giá bán 100%)**: 100% đơn hàng tạo mới hoặc cập nhật đều lấy đơn giá trực tiếp từ máy chủ; mọi hành vi can thiệp giá từ client đều bị vô hiệu hóa hoàn toàn.
- **SC-003 (Chống Race Condition bàn ăn)**: 0% lỗi 500 phát sinh khi có từ 2 yêu cầu tạo đơn đồng thời cho cùng một bàn ăn; hệ thống phản hồi lỗi nghiệp vụ thân thiện `TooHungry:Order:TableAlreadyHasActiveOrder` trong vòng dưới 100ms.
- **SC-004 (Độ chính xác tồn kho dự báo)**: Dữ liệu tồn kho hiển thị trong Kế hoạch nguyên liệu (RM-014) khớp chính xác 100% với tổng tồn kho thực tế của các lô hàng khả dụng trong CSDL.
- **SC-005 (Bảo toàn ghi chú khi gộp bàn)**: 100% các ghi chú chế biến món ăn được bảo toàn nguyên vẹn sau khi thực hiện thao tác gộp bàn ăn (`MergeTablesAsync`).
- **SC-006 (Không phát thông báo SignalR ảo)**: 100% thông báo Realtime SignalR chỉ được phát sau khi giao dịch cơ sở dữ liệu đã commit thành công; 0% thông báo sai lệch khi transaction rollback.
- **SC-007 (Chuẩn hóa múi giờ và i18n)**: 100% thời gian hệ thống được đồng bộ theo chuẩn UTC qua `Clock.Now`; 100% mã lỗi nghiệp vụ mới có bản dịch đầy đủ trong `vi.json` và `en.json`.

---

## 7. Các Giả định (Assumptions)

- Hệ thống cơ sở dữ liệu SQL Server hỗ trợ đầy đủ cú pháp Filtered Unique Index của Entity Framework Core.
- Khách hàng và nhân viên sử dụng hệ thống tuân theo quy trình vận hành nhà hàng chuẩn: Mỗi bàn đang phục vụ chỉ gắn liền với 1 đơn hàng hoạt động tại một thời điểm.
- Thời gian lưu trữ UTC trên máy chủ được tự động chuyển đổi sang múi giờ địa phương của nhà hàng (`+07:00` Việt Nam) khi hiển thị trên giao diện người dùng.
- Mọi điều chỉnh kho kiểm kê đều được thực hiện bởi nhân viên có thẩm quyền quản lý kho (`Manager` hoặc `InventoryKeeper`).

---

## 8. Phụ thuộc & Truy vết (Dependencies & Traceability)

- **Phụ thuộc**: 
  - `RM-008`: Quản lý Bàn ăn & Khu vực (`DiningAreas & Tables`).
  - `RM-009`: Quản lý Đặt bàn (`TableReservation`).
  - `RM-010`: Quản lý Đơn hàng & POS (`POS Ordering & Billing`).
  - `RM-011`: Quản lý Tồn kho & Giao dịch (`Inventory Transactions & FEFO`).
  - `RM-014`: Dự báo nhu cầu nguyên liệu (`Forecasts & Replenishment`).
- **Cơ sở truy vết**:
  - `CODE_REVIEW.md` (Backend #1, #2, #3, #4, #5, #10, #11, #12, #13, #14, #15, #16, #25, #26, #29).
- **Hạ lưu (Downstream)**:
  - `RM-023`: Bảo mật & Chuẩn hóa Phân quyền Hệ thống.
  - `RM-024`: Tái cấu trúc hiệu năng Angular & Tách component kho.
  - `RM-025`: Tối ưu hóa truy vấn EF Core, đánh index, dọn dẹp mã nguồn.
  - `RM-026`: Bộ kiểm thử tự động phân quyền, concurrency & idempotency.
