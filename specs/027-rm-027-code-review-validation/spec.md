# Đặc tả Tính năng (Feature Specification): Kiểm định & Đối soát Toàn diện Mã nguồn so với Code Review (Code Review Verification & Audit)

**Mã Tính năng (Feature ID)**: `RM-027`

**Nhánh Tính năng (Feature Branch)**: `027-rm-027-code-review-validation`

**Ngày tạo**: 2026-10-26

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-027: *"Kiểm định & Đối soát Toàn diện Mã nguồn so với Code Review (Code Review Verification & Audit) — Thiết lập quy trình kiểm định, đối soát độc lập và nghiệm thu toàn diện mã nguồn thực tế (Backend & Frontend) so với toàn bộ 68 vấn đề được ghi nhận trong `CODE_REVIEW.md`"*.
- Tài liệu gốc: [CODE_REVIEW.md](../../CODE_REVIEW.md) (tổng hợp 68 vấn đề: 34 Backend, 34 Frontend).
- Các gói giải pháp kỹ thuật đã triển khai trong Wave 5:
  - `RM-022`: Ổn định hóa & Vá lỗi Nghiêm trọng Backend (Backend Data Integrity & Concurrency Hardening).
  - `RM-023`: Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement).
  - `RM-024`: Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular (Angular Architecture & Performance Refactoring).
  - `RM-025`: Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (Database Query Optimization & Clean Code).
  - `RM-026`: Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency).
- Tuân thủ Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md) (Domain-Driven Design, ABP Layering, Non-blocking Async, Concurrency Control, Auditing, i18n song ngữ 100% trong `en.json` và `vi.json`).

---

## Tóm tắt & Bối cảnh Nghiệp vụ (Executive Summary & Business Context)

Sau chuỗi thực thi liên tục của Wave 5 nhằm giải quyết triệt để 68 vấn đề kỹ thuật phát hiện từ đợt rà soát mã nguồn toàn diện (`CODE_REVIEW.md`), hệ thống quản lý nhà hàng `Acme.TooHungry` đã trải qua hàng loạt tái cấu trúc cốt lõi: từ logic khấu trừ kho FEFO, bảo mật endpoint, filtered unique index, dọn dẹp N+1 queries, đến xây dựng bộ test tự động xUnit đồ sộ.

Tuy nhiên, trong một hệ thống phân tán phức tạp (ABP Framework .NET + Angular Standalone + EF Core + SignalR), việc các gói kỹ thuật được thực hiện riêng lẻ có thể tiềm ẩn rủi ro:
1. **Bỏ sót tiêu chí (Omission Risk)**: Một số chi tiết nhỏ trong 68 khuyến nghị có thể chưa được khắc phục trọn vẹn hoặc bị hiểu sai lệch trong quá trình lập trình.
2. **Lỗi hồi quy (Regression Risk)**: Việc sửa lỗi ở một module (ví dụ: siết chặt quyền hoặc đổi unique index) có thể vô tình ảnh hưởng đến các luồng nghiệp vụ khác.
3. **Thiếu minh chứng nghiệm thu (Audit Traceability)**: Đội ngũ phát triển và các bên liên quan cần một ma trận đối soát minh bạch (Verification & Traceability Matrix) chứng minh bằng mã nguồn và bài test cụ thể cho từng mục trong số 68 vấn đề của `CODE_REVIEW.md`.

Tính năng `RM-027` đóng vai trò là **Cổng Kiểm Định & Nghiệm Thu Độc Lập (Independent Verification & Audit Gate)** cho toàn bộ Wave 5. Mục tiêu là rà soát thực tế từng dòng code, chạy toàn bộ bộ kiểm thử tự động, lập ma trận đối soát 68/68 mục, và xuất bản Báo cáo Nghiệm thu Kỹ thuật (Technical Sign-off Report) khẳng định hệ thống sẵn sàng vận hành ổn định, bảo mật và đạt chuẩn chất lượng cao nhất.

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Kiểm định & Đối soát 34 Hạng mục Backend (Ưu tiên: P1)

Là một **Kỹ sư Trưởng / Quản trị viên Kỹ thuật**, tôi muốn đối soát chi tiết 34 vấn đề Backend đã ghi nhận trong `CODE_REVIEW.md` với mã nguồn thực tế của tầng Domain, Application, EntityFrameworkCore và HttpApi, để bảo đảm 100% các lỗ hổng sai tiền, trừ kho trùng, race condition, endpoint không bảo mật và N+1 queries đã được giải quyết triệt để.

**Lý do cho mức độ ưu tiên này**: Các lỗi Backend trong `CODE_REVIEW.md` ảnh hưởng trực tiếp đến tính toàn vẹn tài chính (tiền bạc, số lượng tồn kho) và an ninh của nhà hàng. Đây là nền tảng sống còn của hệ thống.

**Kiểm thử Độc lập**: Có thể kiểm thử hoàn toàn bằng cách đối chiếu mã nguồn của các service/entity trọng yếu (`OrderAppService`, `Order`, `InventoryManager`, `MediaController`, `TooHungryDbContext`) kết hợp chạy toàn bộ test suite `dotnet test` bao gồm các test cases của RM-022, RM-023, RM-025 và RM-026.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **🔴 Nghiêm trọng (Mục #1 - #12)**:
   - **Cho trước (Given)** mã nguồn Backend hiện tại, **Khi (When)** kiểm tra phương thức `Order.Complete()`, `OrderAppService.CompleteOrder` và `UpdateAsync`, **Thì (Then)** logic trừ kho chỉ được kích hoạt duy nhất một lần khi trạng thái chuyển từ mở sang `Completed`, chặn hoàn toàn việc sửa đơn đã `Completed`/`Cancelled`, và có bài test tự động idempotency chứng minh kho không bị trừ 2 lần.
   - **Cho trước (Given)** API tạo/sửa đơn hàng, **Khi (When)** client gửi request kèm `UnitPrice` hoặc `TotalAmount`, **Thì (Then)** server hoàn toàn bỏ qua hoặc không cho phép nhận giá từ DTO, mà tự tính toán 100% dựa trên `Dish.Price` trên cơ sở dữ liệu.
   - **Cho trước (Given)** DTO tạo đơn hàng, **Khi (When)** kiểm tra các DataAnnotation, **Thì (Then)** `Quantity` bắt buộc thuộc khoảng `[Range(1, 999)]`, `Items` bắt buộc `[MinLength(1)]`, ngăn chặn hoàn toàn số lượng âm hoặc bằng 0.
   - **Cho trước (Given)** logic tính toán dự báo nguyên liệu `DemandForecast`, **Khi (When)** kiểm tra công thức tính tồn kho khả dụng, **Thì (Then)** lượng tồn kho chỉ tính tổng `RemainingQuantity` của các lô, không bị nhân trùng `ConversionFactor`.
   - **Cho trước (Given)** cơ chế retry concurrency khi trừ kho nhiều lô FEFO, **Khi (When)** xảy ra tranh chấp `ConcurrencyStamp`, **Thì (Then)** vòng retry mở một Unit of Work mới độc lập (`IUnitOfWorkManager.Begin(requiresNew: true)`) hoặc kiểm soát `autoSave` để không trừ trùng lô trước đó.
   - **Cho trước (Given)** endpoint upload ảnh `MediaController.UploadDishImageAsync`, **Khi (When)** người dùng chưa đăng nhập hoặc upload file không phải định dạng ảnh an toàn, **Thì (Then)** hệ thống từ chối bằng HTTP 403 (`TooHungryPermissions.Dishes.Edit`) và chặn file giả mạo qua bộ kiểm tra magic bytes header (`SafeImageFileValidator`).
   - **Cho trước (Given)** các API `DailyMenuAppService`, `RecipeController.by-dish`, `TableOrderController.complete`, **Khi (When)** kiểm tra thuộc tính phân quyền, **Thì (Then)** toàn bộ đều được bảo vệ bằng quyền hạt nhân ABP tương ứng, không còn API mở nặc danh hoặc dùng quyền chung chung.
   - **Cho trước (Given)** DTO cập nhật bàn ăn `UpdateTableDto`, **Khi (When)** kiểm tra các thuộc tính DTO, **Thì (Then)** các trường trạng thái `Status`, `OccupiedTime`, `ReservedTime` đã được loại bỏ để chống mass assignment, trạng thái bàn chỉ thay đổi qua domain methods chuyên biệt.
   - **Cho trước (Given)** các sự kiện Realtime SignalR, **Khi (When)** kiểm tra thời điểm gửi thông báo, **Thì (Then)** thông báo bàn/đơn chỉ được phát đi sau khi giao dịch cơ sở dữ liệu đã commit thành công (`CurrentUnitOfWork.OnCompleted`).
   - **Cho trước (Given)** 2 request `SubmitOrder` đồng thời trên cùng 1 bàn, **Khi (When)** cả 2 cùng cố gắng tạo đơn active, **Thì (Then)** filtered unique index trên `Orders` ngăn chặn trùng lặp, request thứ hai bắt `DbUpdateException` và trả về `BusinessException` rõ ràng thay vì crash 500.

2. **🟡 Trung bình (Mục #13 - #31)**:
   - **Cho trước (Given)** các xử lý ngày giờ trong hệ thống, **Khi (When)** kiểm tra `DateTime.Now` và `DateTime.UtcNow`, **Thì (Then)** 100% các điểm xử lý thời gian nghiệp vụ chuyển sang dùng `Clock.Now` với cấu hình `AbpClockOptions.Kind = Utc`, tránh lệch múi giờ giữa Dashboard và vận hành.
   - **Cho trước (Given)** cấu hình giờ mở cửa nhà hàng, **Khi (When)** kiểm tra định nghĩa tại các dịch vụ Bàn và Đặt bàn, **Thì (Then)** giờ mở cửa được định nghĩa tập trung thống nhất tại `TooHungryConsts` (08:00 - 22:00 hoặc 09:00 - 23:00).
   - **Cho trước (Given)** luồng đặt bàn `TableReservationManager`, **Khi (When)** khách đặt bàn trước nhiều ngày, **Thì (Then)** bàn chỉ chuyển sang trạng thái `Reserved` trước giờ hẹn 60 phút, và `CheckInAsync` có guard clause bảo vệ trạng thái bàn.
   - **Cho trước (Given)** luồng gộp bàn `MergeTablesAsync`, **Khi (When)** các món trùng `DishId` được gộp lại, **Thì (Then)** đơn giá được tính đúng theo giá niêm yết của từng đơn và bảo toàn toàn bộ `Note` riêng biệt của từng món.
   - **Cho trước (Given)** các Unique Indexes trong `TooHungryDbContext`, **Khi (When)** kiểm tra index tên Bàn, tên Đơn vị tính và Recipe active, **Thì (Then)** index có điều kiện lọc soft-delete `.HasFilter("[IsDeleted] = 0")` và đảm bảo mỗi món chỉ có tối đa 1 Recipe active.
   - **Cho trước (Given)** các truy vấn dữ liệu tại `ForecastAppServices`, `RecipeAppService`, `OrderAppService`, **Khi (When)** kiểm tra mã nguồn, **Thì (Then)** triệt tiêu N+1 queries bằng cách gom `dishIds`, chuyển 100% các truy vấn đồng bộ (`.ToList()`) sang async (`ToListAsync()`), loại bỏ lạm dụng `AutoInclude`.
   - **Cho trước (Given)** hàm sinh mã số (`ORD-`, `BATCH-`, `ADJ-`), **Khi (When)** sinh mã liên tiếp trong 1 giây, **Thì (Then)** thuật toán sinh mã có gắn tiền tố ngẫu nhiên/sequence chống xung đột khóa chính.
   - **Cho trước (Given)** lô điều chỉnh kiểm kê kho `ADJ-*`, **Khi (When)** kiểm tra dữ liệu tạo lô, **Thì (Then)** `PurchaseUnit` lấy đúng đơn vị cơ sở thực tế, `UnitCost` lấy từ giá ước tính của nguyên liệu, và hạn sử dụng được tính dựa trên loại bảo quản (`StorageType`).
   - **Cho trước (Given)** xử lý ngoại lệ và đa ngôn ngữ, **Khi (When)** kiểm tra các điểm ném lỗi, **Thì (Then)** không còn hardcode tiếng Việt trong `UserFriendlyException`, chuyển sang `BusinessException` với error code được dịch đầy đủ trong `vi.json` và `en.json`.
   - **Cho trước (Given)** các Aggregate Roots (`Order`, `RestaurantTable`), **Khi (When)** kiểm tra thuộc tính, **Thì (Then)** các setter được đóng kín (`private/protected set`), logic chuyển trạng thái gói gọn trong domain methods (`Occupy()`, `Release()`, `MarkCleaning()`, `Complete()`, `Cancel()`).
   - **Cho trước (Given)** file cấu hình `appsettings.json`, **Khi (When)** rà soát mã nguồn, **Thì (Then)** 100% mật khẩu, khóa mã hóa và passphrase đã được loại bỏ khỏi repo git, `ShowPII = false` và Swagger được tắt ở môi trường Production.

3. **🟢 Nhỏ (Mục #32 - #34)**:
   - **Cho trước (Given)** thư mục gốc của repository, **Khi (When)** kiểm tra sự tồn tại của các file rác, **Thì (Then)** các file `test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt` đã bị xóa hoàn toàn khỏi git tracking.
   - **Cho trước (Given)** cấu trúc file Backend, **Khi (When)** kiểm tra `DishAppServices.cs` và `ForecastAppServices.cs`, **Thì (Then)** mỗi file chỉ chứa 1 class duy nhất (`DishAppService.cs`, `DishCategoryAppService.cs`, `DemandForecastAppService.cs`, `IngredientPlanAppService.cs`).
   - **Cho trước (Given)** kế thừa service, **Khi (When)** kiểm tra `OrderAppService`, **Thì (Then)** service kế thừa chuẩn `TooHungryAppService`, dọn dẹp các permission rác không sử dụng.

---

### User Story 2 - Kiểm định & Đối soát 34 Hạng mục Frontend (Ưu tiên: P1)

Là một **Kỹ sư Trưởng / Quản trị viên Kỹ thuật**, tôi muốn đối soát chi tiết 34 vấn đề Frontend Angular trong `CODE_REVIEW.md` với mã nguồn client thực tế tại thư mục `angular/`, để phát hiện các lỗi phân trang, điều hướng vỡ, rò rỉ bộ nhớ (memory leaks), quyền truy cập giao diện bị hở, và hiệu năng render kém.

**Lý do cho mức độ ưu tiên này**: Trải nghiệm nhân viên phục vụ và thu ngân phụ thuộc hoàn toàn vào ứng dụng Angular. Các lỗi phân trang hỏng, rò rỉ subscription hay giao diện giật lag ảnh hưởng trực tiếp đến tốc độ vận hành bàn ăn tại nhà hàng.

**Kiểm thử Độc lập**: Có thể kiểm thử độc lập thông qua việc rà soát mã nguồn component/service Angular, kiểm tra biên dịch TypeScript strict mode (`npm run build`), kiểm thử unit tests component, và đối chiếu với checklist 34 mục Frontend.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **🔴 Nghiêm trọng (Mục #1 - #9)**:
   - **Cho trước (Given)** màn hình Quản lý Đơn hàng (`order.component.ts`), **Khi (When)** người dùng chuyển trang hoặc tìm kiếm, **Thì (Then)** tham số filter được gửi lên Backend, giữ nguyên `res.totalCount` từ server trả về, đảm bảo xem được đầy đủ các đơn từ trang 2 trở đi.
   - **Cho trước (Given)** cấu hình định tuyến và guards, **Khi (When)** người dùng Cashier hoặc Waiter đăng nhập thành công, **Thì (Then)** không bao giờ điều hướng tới route lỗi không tồn tại `/table/layout` (đã được đổi thành `/tables`), và có wildcard route `**` điều hướng về trang lỗi 404 thân thiện (RM-019).
   - **Cho trước (Given)** subscription `currentUser` trong `app.component.ts`, **Khi (When)** người dùng chuyển tab trình duyệt kích hoạt sự kiện `visibilitychange` nhiều lần, **Thì (Then)** subscription sử dụng toán tử `.pipe(filter(u => !!u?.isAuthenticated), take(1))` ngăn chặn rò rỉ đăng ký bộ nhớ.
   - **Cho trước (Given)** các nút hành động nhạy cảm (Tạo, Sửa, Xóa, Đổi trạng thái) trên tất cả các màn hình, **Khi (When)** người dùng đăng nhập bằng vai trò không có quyền, **Thì (Then)** các nút bấm được ẩn hoàn toàn thông qua chỉ thị `*abpPermission`, không chỉ phụ thuộc vào guard route.
   - **Cho trước (Given)** form tạo/sửa đơn hàng phía client, **Khi (When)** gửi dữ liệu giỏ hàng, **Thì (Then)** payload chỉ chứa `dishId` và `quantity`, tuyệt đối không gửi `unitPrice` hay `totalAmount` lên server.
   - **Cho trước (Given)** thư mục mã nguồn sinh proxy `src/app/proxy/`, **Khi (When)** chạy lệnh `abp generate-proxy`, **Thì (Then)** không có file nào bị ghi đè mất mã nguồn tự viết (toàn bộ custom proxy đã được chuyển ra ngoài thư mục `proxy/`).
   - **Cho trước (Given)** màn hình phân quyền vai trò `roles.ts`, **Khi (When)** cấp quyền cho vai trò, **Thì (Then)** tham số `providerKey` được mã hóa an toàn (`encodeURIComponent`) hoặc sử dụng component chuẩn `<abp-permission-management>`.
   - **Cho trước (Given)** widget đồng hồ/thông tin tại thanh bên `sidebar-widgets.component.ts`, **Khi (When)** component hoạt động, **Thì (Then)** không có interval 1 giây chạy change detection toàn bộ app; các tác vụ nền chạy ngoài Angular Zone (`runOutsideAngular`).
   - **Cho trước (Given)** dịch vụ kết nối Realtime SignalR `TableSignalRService`, **Khi (When)** kết nối tới `TableHub`, **Thì (Then)** kết nối được cấp `accessTokenFactory` hợp lệ, chỉ kết nối khi người dùng đã đăng nhập, và có cơ chế tự động thử lại khi mất kết nối.

2. **🟡 Trung bình (Mục #10 - #24)**:
   - **Cho trước (Given)** quản lý trạng thái component, **Khi (When)** kiểm tra dữ liệu giao diện, **Thì (Then)** thống nhất sử dụng Angular Signals (`computed`, `signal`) hoặc `async` pipe, loại bỏ việc gọi thủ công `cdr.detectChanges()` rải rác sau các lời gọi `subscribe`.
   - **Cho trước (Given)** màn hình danh sách bàn ăn `table.component.ts`, **Khi (When)** số lượng bàn vượt quá 200, **Thì (Then)** cơ chế phân trang được xử lý chuẩn mực qua API server thay vì kéo 200 bản ghi về client tự cắt mảng.
   - **Cho trước (Given)** màn hình gọi món Waiter và kiểm tra tồn kho, **Khi (When)** mở modal chọn món, **Thì (Then)** ứng dụng không kéo 1000 recipes và 1000 nguyên liệu về máy khách, mà gọi API kiểm tra tồn kho tập trung `orderService.validateStock`.
   - **Cho trước (Given)** mã nguồn trùng lặp giữa `table` và `waiter-tables`, **Khi (When)** kiểm tra các hàm hiển thị trạng thái và lắng nghe SignalR, **Thì (Then)** logic dùng chung được tách vào `TableStateService` và component thẻ bàn `<app-table-card>`.
   - **Cho trước (Given)** toàn bộ văn bản, nhãn, tiêu đề và thông báo toast trên giao diện, **Khi (When)** chuyển đổi ngôn ngữ, **Thì (Then)** 100% hiển thị song ngữ chuẩn xác qua `en.json` và `vi.json`, không còn chuỗi tiếng Việt hardcode hay logic `isVi ? 'A' : 'B'`.
   - **Cho trước (Given)** xử lý thông báo lỗi API, **Khi (When)** xảy ra lỗi từ server, **Thì (Then)** truyền cờ `{ skipHandleError: true }` khi component tự hiển thị toast, loại bỏ hoàn toàn hiện tượng hiển thị 2 popup lỗi đè lên nhau.
   - **Cho trước (Given)** các xử lý bất đồng bộ phức tạp (như xác nhận xóa rồi gọi API), **Khi (When)** kiểm tra mã nguồn, **Thì (Then)** loại bỏ cấu trúc subscribe lồng nhau 3 tầng, chuyển sang toán tử RxJS declarative (`switchMap`, `exhaustMap`).
   - **Cho trước (Given)** hiển thị ngày tháng trên giao diện kho và báo cáo, **Khi (When)** kiểm tra chuỗi ngày từ 0h đến 7h sáng, **Thì (Then)** không bị lệch ngày hôm qua do ép kiểu UTC ngây thơ (`toISOString().split('T')[0]`), dùng `formatDate` chuẩn locale.
   - **Cho trước (Given)** kiểm tra quyền truy cập của người dùng trong các Guards và giao diện, **Khi (When)** rà soát mã nguồn, **Thì (Then)** không còn so sánh chuỗi vai trò hardcode (`Manager`, `Administrator`, `admin`), chuyển 100% sang kiểm tra Permission Policy.
   - **Cho trước (Given)** binding tên nguyên liệu/món ăn trong template HTML, **Khi (When)** kiểm tra bảo mật, **Thì (Then)** không dùng `[innerHTML]` không kiểm soát, chuyển sang string interpolation an toàn chống XSS.
   - **Cho trước (Given)** component Quản lý kho `inventory.component`, **Khi (When)** kiểm tra cấu trúc, **Thì (Then)** component khổng lồ (956 dòng TS) được phân tách thành các component con và modal chuyên trách.
   - **Cho trước (Given)** giao diện phân trang trên các bảng danh sách, **Khi (When)** kiểm tra 7 màn hình, **Thì (Then)** loại bỏ boilerplate copy-paste và hack `window.dispatchEvent(new Event('resize'))`, sử dụng footer chuẩn hoặc `<app-pager>` dùng chung.

3. **🟢 Nhỏ (Mục #25 - #34)**:
   - **Cho trước (Given)** cây thư mục frontend, **Khi (When)** kiểm tra các file rác, **Thì (Then)** đã xóa bỏ các component chết (`auth/login/*`, `shared/layout/*`, `shared-modal`, `shared-spinner`, `shared-module.ts`, `e2e/`, `permissions.json` rỗng).
   - **Cho trước (Given)** cấu hình biên dịch TypeScript `tsconfig.json`, **Khi (When)** chạy kiểm tra, **Thì (Then)** cấu hình `strict` được kích hoạt, loại bỏ ép kiểu bừa bãi `any` và `as any`.
   - **Cho trước (Given)** định dạng CSS và SCSS, **Khi (When)** kiểm tra stylesheet, **Thì (Then)** dung lượng SCSS được tối ưu, loại bỏ việc lạm dụng hàng nghìn chỉ thị `!important`, tái sử dụng CSS variables màu sắc Cam & Trắng theo Hiến pháp.
   - **Cho trước (Given)** chuyển đổi ngôn ngữ trong layout phục vụ, **Khi (When)** người dùng đổi ngôn ngữ, **Thì (Then)** giao diện cập nhật ngay qua ABP Localization mà không cần reload cứng trình duyệt, định dạng tiền tệ sử dụng pipe chuẩn `currency:'VND'`.

---

### User Story 3 - Xây dựng Ma trận Truy vết & Đối soát Kỹ thuật 68/68 Items (Ưu tiên: P2)

Là một **Kỹ sư Đảm bảo Chất lượng (QA Lead) hoặc Tech Lead**, tôi muốn có một Ma trận Đối soát Kỹ thuật (Traceability & Verification Matrix) bao phủ toàn bộ 68 vấn đề của `CODE_REVIEW.md`, trong đó liên kết rõ ràng từng vấn đề với file/dòng code đã xử lý, bài test tự động chứng minh và trạng thái kiểm định thực tế.

**Lý do cho mức độ ưu tiên này**: Đảm bảo tính minh bạch, có thể kiểm chứng được (verifiable) và làm căn cứ kỹ thuật chính xác cho việc bàn giao, không dựa trên cảm tính hay lời nói suông.

**Kiểm thử Độc lập**: Có thể kiểm thử bằng cách kiểm tra tài liệu ma trận đối soát được tạo ra, đối chiếu chéo (cross-reference) các đường dẫn file và tên phương thức test xem có tồn tại và đang chạy thực tế hay không.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** danh sách 68 vấn đề từ `CODE_REVIEW.md`, **Khi (When)** tra cứu ma trận đối soát, **Thì (Then)** mỗi vấn đề đều có đầy đủ các thông tin:
   - Mã vấn đề chuẩn hóa (`BE-01` đến `BE-34`, `FE-01` đến `FE-34`).
   - Mức độ rủi ro ban đầu (🔴 Nghiêm trọng, 🟡 Trung bình, 🟢 Nhỏ).
   - Vị trí phát hiện ban đầu (File, Line theo `CODE_REVIEW.md`).
   - Hạng mục Roadmap sở hữu giải pháp (`RM-022`, `RM-023`, `RM-024`, `RM-025`, `RM-026`).
   - Trạng thái kiểm định thực tế: `ĐÃ KHẮC PHỤC (VERIFIED)`, `ĐANG HOÀN THIỆN (IN PROGRESS)`, hoặc `NGOẠI LỆ HỢP LỆ (JUSTIFIED)`.
   - Bằng chứng mã nguồn: Đường dẫn tệp tin và phương thức cụ thể trong codebase hiện tại.
   - Bằng chứng kiểm thử: Tên bài kiểm thử tự động (Unit/Integration Test) hoặc kịch bản kiểm tra giao diện xác thực.
2. **Cho trước (Given)** ma trận đối soát, **Khi (When)** đếm tổng số dòng, **Thì (Then)** ma trận bao phủ đầy đủ chính xác 68/68 mục, không thiếu sót bất kỳ vấn đề nào.

---

### User Story 4 - Đánh giá Tự động hóa & Báo cáo Nghiệm thu Wave 5 (Ưu tiên: P3)

Là một **Product Owner / Project Sponsor**, tôi muốn nhận được một Báo cáo Nghiệm thu Toàn diện (Audit Sign-off Report) tổng kết trạng thái sức khỏe kỹ thuật của hệ thống, chỉ rõ các tiêu chí đã hoàn thành 100%, tỷ lệ test pass, và các rủi ro còn lại (nếu có), để tự tin ra quyết định phê duyệt đóng gói Wave 5 và chuẩn bị cho đợt triển khai sản phẩm.

**Lý do cho mức độ ưu tiên này**: Tạo biên bản nghiệm thu kỹ thuật chính thức, phục vụ công tác quản trị dự án và chuyển giao phần mềm.

**Kiểm thử Độc lập**: Xem xét báo cáo nghiệm thu tổng thể được xuất bản tại tài liệu đặc tả, kiểm chứng tính nhất quán giữa số liệu báo cáo và kết quả chạy test thực tế trên máy chủ.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** kết quả rà soát của User Story 1, 2 và 3, **Khi (When)** tạo báo cáo nghiệm thu, **Thì (Then)** báo cáo tổng kết rõ ràng:
   - Tổng số vấn đề: 68 (34 Backend, 34 Frontend).
   - Số lượng lỗi Nghiêm trọng (🔴) còn tồn đọng: BẮT BUỘC bằng 0.
   - Tỷ lệ vượt qua của bộ kiểm thử tự động: 100% PASS (cả xUnit backend và frontend tests).
   - Đánh giá trạng thái từng gói: RM-022 (xong), RM-023 (xong), RM-025 (xong), RM-026 (hoàn thành), RM-024 (trạng thái chi tiết và các việc còn lại nếu có).
   - Tuyên bố nghiệm thu kỹ thuật (Technical Sign-off Statement) có kết luận rõ ràng về độ sẵn sàng của hệ thống.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **Trường hợp giải pháp thay thế thông minh hơn gợi ý ban đầu**: Một số mục trong `CODE_REVIEW.md` gợi ý sửa tại AppService, nhưng giải pháp thực tế tại RM-022/RM-025 đã chuyển xuống tầng Rich Domain Model (ví dụ: `Order.Complete()` xử lý trừ kho và kiểm tra trạng thái thay vì code ở `OrderAppService.UpdateAsync`). Quy trình kiểm định phải xác nhận giải pháp thay thế này đáp ứng đầy đủ hoặc vượt trội hơn về mặt kiến trúc DDD so với gợi ý ban đầu.
- **Trường hợp tính năng đã bị loại bỏ khỏi nghiệp vụ**: Mục Backend #7 và #8 đề cập đến `DailyMenuAppService`. Tuy nhiên, trong chiến lược Roadmap đã chốt, `DailyMenus` bị loại khỏi luồng POS (gọi món lấy trực tiếp từ `Dishes`). Quy trình kiểm định phải ghi rõ tính năng được bảo vệ quyền hoặc đánh dấu trạng thái ngoại lệ hợp lệ, không gây hiểu lầm là tính năng bị bỏ quên.
- **Trường hợp RM-024 (Frontend) đang ở trạng thái `chưa`**: Nếu tại thời điểm kiểm định, RM-024 chưa được hoàn thiện 100%, ma trận đối soát phải phân định rõ ràng giữa những mục Frontend đã được xử lý sớm ở RM-019/RM-023/RM-025 và những mục còn phụ thuộc vào RM-024, tránh việc đánh dấu sai lệch trạng thái thực tế.
- **Phát hiện lỗi mới phát sinh trong quá trình củng cố hệ thống (Regressions)**: Nếu quá trình chạy test hoặc rà soát phát hiện mã nguồn mới gây xung đột (ví dụ: unique index mới gây lỗi khi cập nhật bản ghi cũ chưa migrate), hệ thống kiểm định phải ghi nhận ngay thành "Nợ phát sinh" hoặc issue kỹ thuật cần xử lý ngay lập tức.

---

## Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống BẮT BUỘC phải cung cấp danh mục kiểm tra chi tiết cho **34/34 vấn đề Backend** từ `CODE_REVIEW.md`, phân tách theo 3 mức độ (12 Nghiêm trọng 🔴, 19 Trung bình 🟡, 3 Nhỏ 🟢), với tiêu chí nghiệm thu kiểm tra được cho từng vấn đề.
- **FR-002**: Hệ thống BẮT BUỘC phải cung cấp danh mục kiểm tra chi tiết cho **34/34 vấn đề Frontend** từ `CODE_REVIEW.md`, phân tách theo 3 mức độ (9 Nghiêm trọng 🔴, 15 Trung bình 🟡, 10 Nhỏ 🟢), đối chiếu với mã nguồn Angular thực tế.
- **FR-003**: Quy trình kiểm định BẮT BUỘC phải xác nhận việc thực thi thành công của toàn bộ bộ kiểm thử tự động xUnit Backend (bao gồm các test suites kiểm tra phân quyền thời gian chạy, tranh chấp tương tranh Concurrency, tính bất biến Idempotency, và các luồng nghiệp vụ thanh toán/chuyển bàn/gộp bàn/kiểm kê kho).
- **FR-004**: Quy trình kiểm định BẮT BUỘC phải thiết lập **Ma trận Đối soát Kỹ thuật (Traceability Matrix)** bao phủ đầy đủ 68 dòng tương ứng 68 vấn đề của `CODE_REVIEW.md`, chỉ rõ mã lỗi, vị trí code thực tế, giải pháp RM tương ứng và bằng chứng kiểm thử.
- **FR-005**: Hệ thống kiểm định BẮT BUỘC phải lập báo cáo cảnh báo nếu phát hiện bất kỳ sự sai lệch (discrepancy) hoặc thiếu sót nào giữa hiện trạng mã nguồn và các cam kết của Wave 5.
- **FR-006**: BẮT BUỘC phải xuất bản tài liệu Báo cáo Nghiệm thu Kỹ thuật (Sign-off Report) tổng kết toàn diện chất lượng mã nguồn Wave 5, đánh giá tính sẵn sàng của hệ thống theo các tiêu chuẩn Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md).

---

### Các Thực thể / Mô hình Dữ liệu Chính (Key Entities)

*(Tính năng thuộc nhóm Kiểm định & Đảm bảo Chất lượng, các thực thể chính là các mô hình dữ liệu kiểm toán và tài liệu nghiệm thu)*

- **CodeReviewItem (Hạng mục Rà soát)**:
  - Đại diện cho một vấn đề được ghi nhận trong `CODE_REVIEW.md`.
  - Thuộc tính chính: `ItemId` (ví dụ: `BE-01`, `FE-09`), `Layer` (Backend / Frontend), `Severity` (Critical / Medium / Minor), `OriginalLocation` (File & Dòng trong báo cáo gốc), `ProblemDescription` (Mô tả lỗi), `RecommendedFix` (Gợi ý khắc phục).
- **VerificationRecord (Bản ghi Xác minh Đối soát)**:
  - Đại diện cho kết quả đối soát thực tế của một `CodeReviewItem`.
  - Thuộc tính chính: `ItemId`, `OwningRoadmapId` (RM-022 -> RM-026), `Status` (`Verified` / `In Progress` / `Justified Exception`), `ActiveCodeReference` (Đường dẫn tệp tin và hàm/lớp hiện tại), `AutomatedTestReference` (Tên bài test xUnit hoặc phương thức test giao diện), `AuditNotes` (Ghi chú kỹ thuật, giải thích phương án).
- **AuditSignoffReport (Báo cáo Nghiệm thu Wave 5)**:
  - Đại diện cho biên bản kết luận nghiệm thu kỹ thuật.
  - Thuộc tính chính: `AuditDate`, `TotalItemsChecked` (68), `CriticalResolvedCount` (bắt buộc 21/21), `MediumResolvedCount`, `MinorResolvedCount`, `AutomatedTestPassRate` (100%), `ResidualRisks` (danh sách nợ kỹ thuật nếu có), `SignoffVerdict` (`Approved` / `Conditional Approval` / `Rejected`).

---

## Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: **100% (68/68)** vấn đề trong `CODE_REVIEW.md` được đưa vào ma trận đối soát, được kiểm tra và có kết luận trạng thái minh bạch cùng bằng chứng mã nguồn cụ thể.
- **SC-002**: **0 lỗi Nghiêm trọng (Critical 🔴)** tồn đọng trong mã nguồn Backend (12/12 lỗi đã được giải quyết dứt điểm: không còn trừ kho 2 lần, không còn client tự đặt giá, không còn race condition ném 500 khi tạo đơn, không còn upload Cloudinary nặc danh).
- **SC-003**: **100% bài kiểm thử tự động Backend (200+ tests)** trong các project `test/Acme.TooHungry.Application.Tests`, `test/Acme.TooHungry.EntityFrameworkCore.Tests` và `test/Acme.TooHungry.Domain.Tests` thực thi thành công đạt kết quả **PASS 100%** trên môi trường máy chủ.
- **SC-004**: Dự án Backend biên dịch thành công (`dotnet build`) với **0 lỗi (0 Errors)**; Dự án Frontend biên dịch thành công (`npm run build`) tuân thủ cấu hình TypeScript `strict` mode.
- **SC-005**: Hoàn thành tài liệu Ma trận Đối soát Kỹ thuật và Báo cáo Nghiệm thu Wave 5 bằng Tiếng Việt chuẩn mực theo Hiến pháp kỹ thuật, sẵn sàng phục vụ công tác bàn giao sản phẩm trong vòng 1 phiên làm việc.

---

## Các Giả định (Assumptions)

- **Môi trường Thực thi**: Hệ thống kiểm định sử dụng môi trường phát triển cục bộ hiện tại (.NET 10 SDK, Node.js v18/v20, SQLite / EF Core Test harness) với cấu hình đã được thiết lập sẵn trong các gói RM trước.
- **Tính Bất biến của Tài liệu Gốc**: Nội dung tài liệu [CODE_REVIEW.md](../../CODE_REVIEW.md) là căn cứ gốc cố định với đúng 68 vấn đề, không thay đổi nội dung trong suốt quá trình đối soát.
- **Quyền Sở hữu của các Gói Roadmap**: RM-027 không viết lại mã nguồn tính năng từ đầu, mà tập trung kiểm tra, đối soát, chạy test, hoàn thiện các thiếu sót nhỏ (nếu phát hiện) và lập hồ sơ nghiệm thu cho các gói RM-022, RM-023, RM-024, RM-025 và RM-026.
- **Ngôn ngữ Báo cáo & Tài liệu**: Toàn bộ ma trận đối soát, báo cáo nghiệm thu và checklist được lập bằng Tiếng Việt theo Điều khoản VIII của Hiến pháp [constitution.md](../../.specify/memory/constitution.md).
