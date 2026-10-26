# Danh sách Công việc (Tasks): RM-027 Kiểm định & Đối soát Toàn diện Mã nguồn so với Code Review (Code Review Verification & Audit)

**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md) | **Nghiên cứu**: [research.md](research.md) | **Mô hình Dữ liệu**: [data-model.md](data-model.md) | **Hợp đồng Ma trận**: [verification-matrix-contract.md](contracts/verification-matrix-contract.md) | **Hợp đồng Báo cáo**: [audit-report-contract.md](contracts/audit-report-contract.md) | **Hướng dẫn Khởi chạy**: [quickstart.md](quickstart.md) | **Ma trận Đối soát**: [traceability-matrix.md](traceability-matrix.md) | **Báo cáo Nghiệm thu**: [audit-signoff-report.md](audit-signoff-report.md)

---

## Bảng Tổng quan Tiến độ (Overview)

| Phase | Mục tiêu | Số Tác vụ | Trạng thái |
|---|---|:---:|:---:|
| **Phase 1** | Thiết lập Môi trường & Kiểm tra Biên dịch Sạch (Setup) | 3 | Hoàn thành |
| **Phase 2** | Nền tảng Đối soát & Thu thập Bằng chứng Tự động (Foundational Evidence) | 2 | Hoàn thành |
| **Phase 3** | User Story 1 (P1): Kiểm định & Đối soát 34 Hạng mục Backend 🎯 MVP Core | 3 | Hoàn thành |
| **Phase 4** | User Story 2 (P1): Kiểm định & Đối soát 34 Hạng mục Frontend 🎯 MVP Core | 3 | Hoàn thành |
| **Phase 5** | User Story 3 (P2): Xây dựng Ma trận Truy vết & Đối soát Kỹ thuật 68/68 Items | 3 | Hoàn thành |
| **Phase 6** | User Story 4 (P3): Đánh giá Tự động hóa & Báo cáo Nghiệm thu Wave 5 | 3 | Hoàn thành |
| **Phase 7** | Trau chuốt (Polish) & Cập nhật Roadmap Dự án | 2 | Hoàn thành |
| **Tổng cộng** | | **19** | **19 / 19 (100%)** |

---

## Phase 1: Thiết lập Môi trường & Kiểm tra Biên dịch Sạch (Setup)

**Mục đích**: Xác thực môi trường phát triển, bảo đảm toàn bộ mã nguồn Backend và Frontend biên dịch sạch, không có lỗi cú pháp hoặc vi phạm kiểu dữ liệu trước khi tiến hành đối soát.

- [x] T001 [P] Thực thi biên dịch toàn bộ solution Backend .NET ở chế độ Release (`dotnet build Acme.TooHungry.slnx -c Release`), bảo đảm 0 lỗi biên dịch (0 Errors)
- [x] T002 [P] Thực thi kiểm tra biên dịch Frontend Angular ở chế độ Production (`npm run build -- --configuration production`) trong thư mục `angular/`, xác nhận tuân thủ TypeScript strict mode
- [x] T003 [P] Xác minh tính sạch sẽ của thư mục gốc Git repository (khẳng định các file rác `test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt` không còn tồn tại)

---

## Phase 2: Nền tảng Đối soát & Thu thập Bằng chứng Tự động (Foundational Evidence)

**Mục đích**: Chạy toàn bộ bộ kiểm thử tự động Backend hiện có để thu thập các minh chứng kiểm thử xanh (Green tests) làm căn cứ đối soát cho từng tiêu chí.

- [x] T004 Thực thi toàn bộ bộ kiểm thử tự động xUnit Backend qua lệnh `dotnet test` cho cả 3 project `test/Acme.TooHungry.Application.Tests`, `test/Acme.TooHungry.EntityFrameworkCore.Tests` và `test/Acme.TooHungry.Domain.Tests`, ghi nhận tổng số tests và tỷ lệ PASS (205 / 205 Tests PASS - 100%)
- [x] T005 [P] Khởi tạo tệp Ma trận Truy vết & Đối soát Kỹ thuật tại `specs/027-rm-027-code-review-validation/traceability-matrix.md` tuân thủ đúng lược đồ 8 cột định nghĩa trong [verification-matrix-contract.md](contracts/verification-matrix-contract.md)

---

## Phase 3: User Story 1 - Kiểm định & Đối soát 34 Hạng mục Backend (Ưu tiên: P1) 🎯 MVP Core

**Mục tiêu**: Rà soát, đối chiếu và xác thực 34 vấn đề Backend đã ghi nhận trong `CODE_REVIEW.md` với mã nguồn hiện tại của các project `Domain`, `Application`, `EntityFrameworkCore`, `HttpApi` và bộ test cases tương ứng.

**Kiểm thử Độc lập**: Chạy các bài test trọng điểm `dotnet test --filter "FullyQualifiedName~Idempotency|FullyQualifiedName~Pricing|FullyQualifiedName~Concurrency|FullyQualifiedName~Security"`, bảo đảm 100% các lỗi logic và bảo mật Backend đã được bịt kín.

### Triển khai cho User Story 1

- [x] T006 [US1] Đối soát và xác thực 12 lỗi Nghiêm trọng Backend (🔴 BE #1 - #12):
  * **BE-01**: Chống trừ kho 2 lần tại `Order.Complete()` và `OrderAppService.cs` (`OrderAppService_Idempotency_Tests`)
  * **BE-02**: Server tự tính giá dựa trên `Dish.Price`, loại bỏ `UnitPrice`/`TotalAmount` khỏi input DTO (`OrderAppService_Pricing_Tests`)
  * **BE-03**: Bổ sung validation DataAnnotation `[Range(1, 999)] Quantity`, `[MinLength(1)] Items` (`OrderAppService_Hardening_Tests`)
  * **BE-04**: Sửa công thức tồn kho dự báo không nhân đôi `ConversionFactor` (`ForecastAppService_Hardening_Tests`)
  * **BE-05**: Khắc phục retry concurrency trừ kho thừa bằng UoW độc lập (`InventoryManager_Fefo_Concurrency_Tests`)
  * **BE-06**: Bảo vệ endpoint upload Cloudinary bằng `[Authorize(Dishes.Edit)]` và bộ lọc an toàn `SafeImageFileValidator` (`EndpointAuthorization_Runtime_Tests`)
  * **BE-07**: Bảo vệ endpoint `DailyMenuAppService` bằng `[Authorize]` (`EndpointAuthorization_Runtime_Tests`)
  * **BE-08**: Gắn permission hạt nhân cho `RecipeController.by-dish` (`Recipes.Default`) và `TableOrderController.complete` (`Orders.Edit`)
  * **BE-09**: Gắn permission chi tiết cho `OrderAppService` (`Orders.Delete`) và `DishCategoryAppService` (`DishCategories.Delete`)
  * **BE-10**: Loại bỏ mass assignment trạng thái bàn khỏi `UpdateTableDto`, chuyển qua domain method `table.Occupy()` (`TableAppService_Status_Tests`)
  * **BE-11**: Bảo đảm thông báo Realtime SignalR chỉ phát sau khi commit giao dịch CSDL qua `CurrentUnitOfWork.OnCompleted`
  * **BE-12**: Áp dụng Filtered Unique Index trên `Orders(TableId, Status)` bắt `DbUpdateException` chống race condition tạo đơn trùng bàn (`OrderAppService_RaceCondition_Tests`)

- [x] T007 [US1] Đối soát và xác thực 19 lỗi Trung bình Backend (🟡 BE #13 - #31):
  * **BE-13**: Đồng bộ múi giờ qua `Clock.Now` và cấu hình `AbpClockOptions.Kind = Utc`
  * **BE-14**: Định nghĩa tập trung giờ mở cửa tại `TooHungryConsts`
  * **BE-15**: Chuẩn hóa luồng đặt bàn: chỉ lock bàn trước 60 phút và guard clause bảo vệ check-in
  * **BE-16**: Gộp bàn `MergeTablesAsync` bảo toàn Note riêng từng món và đơn giá niêm yết CSDL (`TableAppService_MergeTables_Advanced_Tests`)
  * **BE-17**: Thêm bộ lọc Soft-Delete `.HasFilter("[IsDeleted] = 0")` cho Unique Index Table và Unit trong `TooHungryDbContext`
  * **BE-18**: Thêm Unique Index cho Recipe active (`DishId`, `IsActive = 1`)
  * **BE-19**: Hoàn thiện `RecipeManager`: kiểm tra nguyên liệu tồn tại và lưu vết lịch sử phiên bản thật
  * **BE-20**: Triệt tiêu N+1 queries tại `ForecastAppServices`, `RecipeAppService`, `OrderAppService`
  * **BE-21**: Chuyển 100% các truy vấn đồng bộ chặn thread sang `ToListAsync()`, `FirstOrDefaultAsync()`
  * **BE-22**: Loại bỏ lạm dụng `AutoInclude` và tối ưu query kiểm tra nhẹ
  * **BE-23**: Bổ sung phân trang cho lịch sử giao dịch và cảnh báo kho trong `InventoryAppService`
  * **BE-24**: Thuật toán sinh mã an toàn (`ORD-`, `BATCH-`, `ADJ-`) chống xung đột khóa chính trong cùng 1 giây
  * **BE-25**: Dữ liệu lô kiểm kê `ADJ-*` chuẩn xác: đúng `BaseUnit`, giá vốn nguyên liệu và hạn dùng theo StorageType (`InventoryAppService_StockAdjustment_Tests`)
  * **BE-26**: Cài đặt State Machine một chiều cho dự báo nhu cầu `DemandForecast`
  * **BE-27**: Chuẩn hóa xử lý lỗi qua `BusinessException` và dịch đầy đủ mã lỗi trong `vi.json` / `en.json`
  * **BE-28**: Khắc phục Entity Anemic: đóng kín public setters của `Order`, `Table`, chuyển sang Rich Domain methods
  * **BE-29**: Bổ sung thuộc tính `[UnitOfWork]` cho `ReservationAutoCancelBackgroundWorker`
  * **BE-30**: Dọn sạch 100% hardcoded secrets khỏi `appsettings.json`, tắt Swagger UI và ShowPII ở Production
  * **BE-31**: Bắt và ghi log lỗi đầy đủ tại `DashboardAppService`, thay anonymous/dynamic bằng `record`

- [x] T008 [US1] Đối soát và xác thực 3 lỗi Nhỏ Backend (🟢 BE #32 - #34):
  * **BE-32**: Xác nhận dọn sạch các file rác ở thư mục gốc (`test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt`)
  * **BE-33**: Tách các file chứa nhiều class (`DishAppService.cs`, `DishCategoryAppService.cs`, `DemandForecastAppService.cs`, `IngredientPlanAppService.cs`), chuẩn hóa `OrderAppService` kế thừa `TooHungryAppService`, dọn permissions thừa
  * **BE-34**: Đảm bảo độ bao phủ của bộ kiểm thử tự động toàn diện cho phân quyền, tương tranh và bất biến (RM-026)

**Trạm kiểm tra (Checkpoint)**: 34/34 mục Backend được kiểm chứng, 0 lỗi Nghiêm trọng tồn đọng, test suite xUnit Backend PASS 100%.

---

## Phase 4: User Story 2 - Kiểm định & Đối soát 34 Hạng mục Frontend (Ưu tiên: P1) 🎯 MVP Core

**Mục tiêu**: Rà soát, đối chiếu và xác thực 34 vấn đề Frontend đã ghi nhận trong `CODE_REVIEW.md` với mã nguồn Angular thực tế tại thư mục `angular/src/app/`.

**Kiểm thử Độc lập**: Kiểm tra biên dịch TypeScript strict mode, rà soát template HTML trên 8 màn hình, kiểm tra guard điều hướng và kết nối SignalR an toàn.

### Triển khai cho User Story 2

- [x] T009 [US2] Đối soát và xác thực 9 lỗi Nghiêm trọng Frontend (🔴 FE #1 - #9):
  * **FE-01**: Sửa lỗi phân trang đơn hàng tại `order.component.ts`: giữ nguyên `res.totalCount` từ server trả về
  * **FE-02**: Khắc phục triệt để route crash `/table/layout` thành `/tables` tại `app.component`, `dashboard.guard`, `waiter-auth.guard` và bổ sung route fallback `**` (RM-019)
  * **FE-03**: Khử rò rỉ bộ nhớ subscription `currentUser` trong `app.component.ts` với `.pipe(filter(u => !!u?.isAuthenticated), take(1))`
  * **FE-04**: Gắn chỉ thị `*abpPermission` lên toàn bộ các nút hành động nhạy cảm trên mọi màn hình (Món ăn, Danh mục, Đơn hàng, Bàn ăn, Kho, Công thức, Vai trò, Người dùng)
  * **FE-05**: Bỏ gửi `unitPrice`/`totalAmount` từ form tạo đơn client lên server
  * **FE-06**: Chuyển toàn bộ mã nguồn tự viết ra ngoài thư mục `proxy/` chống bị ghi đè khi chạy `abp generate-proxy`
  * **FE-07**: Mã hóa an toàn `providerKey` (`encodeURIComponent`) hoặc dùng component chuẩn `<abp-permission-management>` tại `roles.ts`
  * **FE-08**: Tối ưu `sidebar-widgets.component.ts`: chuyển tác vụ đồng hồ ra ngoài NgZone (`runOutsideAngular`), loại bỏ interval 1s
  * **FE-09**: Bảo vệ kết nối SignalR Hub: cấu hình `accessTokenFactory`, chỉ kết nối khi đã đăng nhập và tự động thử lại khi mất kết nối

- [x] T010 [US2] Đối soát và xác thực 15 lỗi Trung bình Frontend (🟡 FE #10 - #24):
  * **FE-10**: Thống nhất mô hình trạng thái bằng Angular Signals (`computed`, `signal`) thay vì gọi thủ công `cdr.detectChanges()` rải rác
  * **FE-11**: Sửa phân trang danh sách bàn ăn `table.component.ts` sang phân trang chuẩn server-side
  * **FE-12**: Chấm dứt tình trạng kéo 1000 items về client để tự lọc, chuyển sang gọi API server `orderService.validateStock`
  * **FE-13**: Tách và tái sử dụng `TableStateService` và component thẻ bàn `<app-table-card>` dùng chung giữa Table và Waiter
  * **FE-14**: Chuyển 100% chuỗi hardcode và toast notification sang từ điển ngôn ngữ `vi.json` và `en.json`
  * **FE-15**: Truyền tham số `{ skipHandleError: true }` khi component tự bắt lỗi để tránh hiện popup lỗi 2 lần
  * **FE-16**: Khử cấu trúc subscribe lồng nhau 3 tầng bằng toán tử RxJS declarative (`switchMap`, `exhaustMap`)
  * **FE-17**: Sửa lỗi lệch ngày UTC bằng `formatDate(date, 'yyyy-MM-dd', locale)`
  * **FE-18**: Loại bỏ logic client tự sinh mã đơn ngẫu nhiên tại `order.ts`
  * **FE-19**: Loại bỏ kiểm tra quyền theo tên vai trò hardcode (`Manager`, `Administrator`, `admin`), chuyển sang kiểm tra Permission Policy
  * **FE-20**: Loại bỏ `[innerHTML]` hiển thị tên nguyên liệu/món ăn, thay bằng string interpolation an toàn chống XSS
  * **FE-21**: Module hóa component Quản lý kho khổng lồ `inventory.component` thành các component con và modal chuyên trách
  * **FE-22**: Xây dựng component phân trang dùng chung `<app-pager>` loại bỏ boilerplate copy ở 7 màn hình
  * **FE-23**: Tối ưu hiệu năng template getter sinh mảng mới và thuật toán sort O(n^2)
  * **FE-24**: Chuẩn hóa tương tác an toàn với ABP Toaster service, không dùng `as any` trên private properties

- [x] T011 [US2] Đối soát và xác thực 10 lỗi Nhỏ Frontend (🟢 FE #25 - #34):
  * **FE-25**: Dọn dẹp dead code (xóa bỏ component/thư mục/file rác không dùng)
  * **FE-26**: Thống nhất bộ thư viện UI, loại bỏ trộn lẫn ng-zorro thừa
  * **FE-27**: Xóa sạch `console.error` còn sót trong production code
  * **FE-28**: Xóa bỏ `HttpClientModule` deprecated khỏi `app.config.ts`
  * **FE-29**: Kích hoạt `strict` và `strictTemplates` trong `tsconfig.json`
  * **FE-30**: Gom định nghĩa giờ mở cửa thống nhất tại một file cấu hình
  * **FE-31**: Bảo mật cấu hình `environment.prod.ts`
  * **FE-32**: Tối ưu hóa SCSS: giảm dung lượng `table.component.scss`, loại bỏ việc lạm dụng hàng nghìn chỉ thị `!important`
  * **FE-33**: Không sửa dữ liệu `storageType` trực tiếp trên UI
  * **FE-34**: Chuẩn hóa cơ chế đổi ngôn ngữ không reload trang và dùng pipe `currency:'VND'`

**Trạm kiểm tra (Checkpoint)**: 34/34 mục Frontend được rà soát chi tiết, xác thực 100% tuân thủ các chuẩn kỹ thuật.

---

## Phase 5: User Story 3 - Xây dựng Ma trận Truy vết & Đối soát Kỹ thuật 68/68 Items (Ưu tiên: P2)

**Mục tiêu**: Hoàn thiện tệp bảng Ma trận Truy vết & Đối soát Kỹ thuật 68 dòng chi tiết tại `specs/027-rm-027-code-review-validation/traceability-matrix.md`.

- [x] T012 [US3] Điền dữ liệu đối soát chi tiết cho 34 dòng Backend (`BE-01` đến `BE-34`) kèm đường dẫn file thực tế, tên bài test chứng minh và trạng thái nghiệm thu trong `traceability-matrix.md`
- [x] T013 [US3] Điền dữ liệu đối soát chi tiết cho 34 dòng Frontend (`FE-01` đến `FE-34`) kèm đường dẫn component thực tế và trạng thái nghiệm thu trong `traceability-matrix.md`
- [x] T014 [US3] Kiểm tra đối chiếu chéo (cross-reference) bảo đảm ma trận bao phủ đầy đủ chính xác 68/68 dòng, không có mục nào bị trùng lặp hoặc bỏ sót

---

## Phase 6: User Story 4 - Đánh giá Tự động hóa & Báo cáo Nghiệm thu Wave 5 (Ưu tiên: P3)

**Mục tiêu**: Tổng hợp toàn bộ dữ liệu đối soát, tỷ lệ test pass và phát hành Báo cáo Nghiệm thu Kỹ thuật chính thức cho Wave 5.

- [x] T015 [US4] Biên soạn tài liệu Báo cáo Nghiệm thu Kỹ thuật chính thức tại `specs/027-rm-027-code-review-validation/audit-signoff-report.md` tuân thủ hợp đồng mẫu [audit-report-contract.md](contracts/audit-report-contract.md)
- [x] T016 [US4] Đánh giá và lập danh mục phân loại rủi ro cho các nợ kỹ thuật tồn đọng (nếu có)
- [x] T017 [US4] Đưa ra kết luận nghiệm thu Wave 5 (Sign-off Verdict: Approved / Conditional Approval) khẳng định hệ thống đạt chuẩn vận hành theo Hiến pháp kỹ thuật

---

## Phase 7: Trau chuốt (Polish) & Cập nhật Roadmap Dự án

**Mục đích**: Hoàn thiện các tài liệu quản trị dự án và xác nhận sự đồng bộ toàn diện.

- [x] T018 Cập nhật trạng thái và kết quả nghiệm thu của RM-027 trong tài liệu `docs/roadmap.md`
- [x] T019 Xác nhận 100% hồ sơ tài liệu của RM-027 tuân thủ Điều khoản VIII Hiến pháp dự án (ngôn ngữ Tiếng Việt chuẩn mực)

---

## Phụ thuộc (Dependencies) & Thứ tự Thực thi

```text
Phase 1 (Setup) ──► Phase 2 (Evidence) ──► Phase 3 (US1 Backend 34) ──► Phase 5 (US3 Matrix) ──► Phase 6 (US4 Sign-off) ──► Phase 7 (Polish)
                                       └──► Phase 4 (US2 Frontend 34) ─┘
```

- **Phase 1 & Phase 2**: Điều kiện tiên quyết, chặn tất cả các phases sau.
- **Phase 3 (Backend) & Phase 4 (Frontend)**: Đã hoàn thành đối soát chi tiết trên toàn bộ codebase.
- **Phase 5 (Ma trận Đối soát)**: Hoàn thiện và lưu trữ tại [traceability-matrix.md](traceability-matrix.md).
- **Phase 6 (Báo cáo Nghiệm thu)**: Hoàn thiện và xuất bản tại [audit-signoff-report.md](audit-signoff-report.md).
- **Phase 7 (Polish & Roadmap)**: Đã cập nhật trạng thái `hoàn thành` trong `docs/roadmap.md`.
