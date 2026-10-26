# Kế hoạch Triển khai (Implementation Plan): RM-025 Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (Database Query Optimization & Clean Code)

**Nhánh (Branch)**: `025-rm-025-database-query-optimization-and-clean-code` | **Ngày**: 2026-10-23 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/025-rm-025-database-query-optimization-and-clean-code/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 23-10-2026 với 4 quyết định tương tác chốt hạ & 6 trụ cột kỹ thuật then chốt:
1. **Triệt tiêu N+1 Query & Over-fetching**: Gom nhóm truy vấn theo `dishIds`/`recipeIds`/`unitIds` qua Map $O(1)$ thay vì gọi `FindAsync` trong vòng lặp lồng nhau hoặc tải toàn bộ bảng tại `ForecastAppServices.cs`, `RecipeAppService.cs`, `OrderAppService.cs`.
2. **Chuyển đổi 100% Truy vấn Đồng bộ sang Bất đồng bộ**: Thay thế hoàn toàn `.ToList()`, `.FirstOrDefault()`, `.First()` trên `IQueryable` bằng `await AsyncExecuter.ToListAsync(...)` và `await AsyncExecuter.FirstOrDefaultAsync(...)` tại `TableAppService.cs` và `InventoryManager.cs`.
3. **Chỉ mục CSDL & Cắt giảm `AutoInclude` quá mức**: Bổ sung composite index `Orders(Status, OrderDate)`, unique index `OrderNumber`, và unique filtered index cho Recipe active `(DishId, IsActive = 1)`. Gỡ bỏ `AutoInclude` ở tất cả các quan hệ xuyên Aggregate, chỉ giữ lại cho các thực thể con nội bộ trong cùng Aggregate Root.
4. **Phân trang Phía Máy chủ cho Lịch sử Kho**: Nâng cấp `GetTransactionsAsync` nhận `PagedAndSortedResultRequestDto` trả về `PagedResultDto<InventoryTransactionDto>`; tối ưu hóa cảnh báo kho `GetAlertsAsync` tính toán trực tiếp trên SQL.
5. **Đóng gói Rich Domain Model & Sinh Mã An toàn Kèm Salt**: Đóng kín public setters của `Order`, `OrderItem`, `RestaurantTable`, `Dish`, `Recipe`; gom 8 đoạn code reset trạng thái bàn lặp lại vào duy nhất `table.Release()`; chuẩn hóa định dạng `ORD-{yyyyMMddHHmmss}-{salt4}` và `BATCH-{yyyyMMddHHmmss}-{salt4}` chống trùng mã trong cùng 1 giây.
6. **Recipe Version History bằng Cơ chế Clone Snapshot**: Khi cập nhật công thức làm đổi định lượng, clone bản ghi cũ thành `IsActive = false` làm snapshot lịch sử, tăng `Version++` trên bản ghi chính duy trì `IsActive = true`; kiểm tra 100% nguyên liệu tồn tại và `IsActive == true`.
7. **Chuẩn hóa Exception, Logging Dashboard & ABP Conventions**: Triệt tiêu toàn bộ ~25 vị trí ném `UserFriendlyException` tiếng Việt hardcode, chuyển sang `BusinessException(TooHungryDomainErrorCodes.XYZ)` kết hợp khóa đa ngôn ngữ trong `vi.json` và `en.json`; cấu hình `MapCodeNamespace` cho `RecipeIngredient`; xóa khối `catch { }` rỗng tại `DashboardAppService.cs`, ghi log cảnh báo và dùng C# `record OrderTrendSummary`.
8. **Đơn Trách Nhiệm Tệp (SRP) & Dọn Dẹp Mã Rác**: Tách `DishAppServices.cs` và `ForecastAppServices.cs` thành các tệp độc lập; xóa bỏ các tập tin rác ở thư mục gốc (`test.cs`, `Reflect.cs`...); dọn dead code phía Angular, loại bỏ `HttpClientModule` thừa và kích hoạt TypeScript Strict Mode toàn diện trong `tsconfig.json`.

---

## Tóm tắt (Summary)

Kế hoạch triển khai gói giải pháp **Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (RM-025)** xử lý trọn vẹn 18 phát hiện kỹ thuật còn lại từ `CODE_REVIEW.md`. Gói nâng cấp này tập trung tối ưu hóa tầng truy cập dữ liệu EF Core, loại bỏ hoàn toàn các điểm nghẽn cổ chai (N+1 query, blocking synchronous thread pool starvation, lạm dụng AutoInclude), hoàn thiện mô hình Rich Domain Model theo chuẩn Domain-Driven Design (DDD) của ABP Framework, chuẩn hóa quy chuẩn ngoại lệ/đa ngôn ngữ 100% song ngữ, đồng thời thanh lọc mã nguồn rác toàn diện trên cả Backend và Frontend Angular.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng Backend**: C# 13, .NET 10.0 SDK, ABP Framework 9.x
- **Truy cập Cơ sở Dữ liệu**: Entity Framework Core 9.x, Microsoft SQL Server với Code-First Migrations
- **Nền tảng Frontend**: Angular 18/19 Standalone Components, TypeScript (kích hoạt Strict Mode toàn diện), SCSS
- **Kiểm thử Tự động**: xUnit, Shouldly, NSubstitute, Volo.Abp.TestBase
- **Mục tiêu Hiệu suất**:
  - Giảm ít nhất 80% số lượng câu lệnh SQL sinh ra trong các use case Dự báo, Công thức và Đơn hàng.
  - 100% thao tác I/O CSDL là non-blocking async, giải phóng ThreadPool ngay lập tức.
  - Thời gian phản hồi API lịch sử kho `GetTransactionsAsync` < 100ms với 2.000 bản ghi.
  - Cắt giảm 70% dung lượng RAM bị chiếm dụng do over-fetching nhờ tinh giản `AutoInclude`.
- **Ràng buộc Toàn vẹn & I18N**:
  - Không còn bất kỳ chuỗi tiếng Việt hardcode nào trong các lớp C# Domain/Application/HttpApi.
  - 100% mã lỗi nghiệp vụ mới được đồng bộ song ngữ hoàn hảo trong cả `vi.json` và `en.json`.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Cấu trúc phân lớp ABP**:
  - Các thực thể `Order`, `RestaurantTable`, `Recipe` được đóng gói kín public setters, logic chuyển trạng thái và invariant được đưa vào các Domain Methods (`table.Release()`, `table.Occupy()`, `table.MarkCleaning()`, `order.Complete()`, `order.Cancel()`).
  - Tách các tệp service đơn trách nhiệm (SRP), bảo đảm tầng Application Service chỉ điều phối nghiệp vụ.
- [x] **II. UML & Sự đồng nhất của Domain Model**:
  - Khớp hoàn toàn với mô hình nghiệp vụ nhà hàng trong `RMS-TH.vpp`.
- [x] **III. Test-First & Cổng chất lượng tự động**:
  - Lập kế hoạch kiểm thử tự động cho cơ chế Clone Snapshot của Recipe, phân trang kho, và các mã lỗi nghiệp vụ chuẩn.
- [x] **IV. Hợp đồng API nghiêm ngặt & Tích hợp Module Angular**:
  - Toàn bộ DTOs và endpoints được định kiểu mạnh; `GetTransactionsAsync` tuân thủ chuẩn `PagedAndSortedResultRequestDto`; Angular client bật TypeScript `strict: true` bảo vệ type safety tuyệt đối.
- [x] **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy mặc định**:
  - Xóa bỏ tệp `test.cs` chứa mật khẩu admin và `Reflect.cs` chứa path cá nhân; dọn 7 nhóm permission mồ côi; các thực thể duy trì đầy đủ auditing qua `FullAuditedAggregateRoot<Guid>`.
- [x] **VI. Sự nhất quán của UI/UX & Hệ thống thiết kế (Cam & Trắng)**:
  - Phân trang kho tích hợp mượt mà với `<app-pager>` theo chuẩn thiết kế Cam & Trắng của dự án.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - Triệt tiêu 100% `UserFriendlyException` hardcode; bổ sung đầy đủ các mã lỗi mới vào cả `vi.json` và `en.json` đồng bộ 100%.
- [x] **VIII. Ngôn ngữ Tài liệu (Documentation Language)**:
  - Toàn bộ hồ sơ tài liệu được lập bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Thiết kế (`specs/025-rm-025-database-query-optimization-and-clean-code/`)
```text
specs/025-rm-025-database-query-optimization-and-clean-code/
├── spec.md                                     # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                                     # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                                 # Kết quả nghiên cứu 8 giải pháp kỹ thuật Phase 0
├── data-model.md                               # Thiết kế Rich Domain Models, Indexes, DTOs, i18n
├── quickstart.md                               # Hướng dẫn xác thực 7 kịch bản kiểm thử trọng yếu
├── contracts/
│   └── database-optimization-contracts.md     # Hợp đồng ApplicationService, DomainService & Quyền hạn
└── checklists/
    └── requirements.md                         # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Backend Cần Sửa đổi & Tái cấu trúc
```text
src/Acme.TooHungry.Domain/
├── Orders/Order.cs                             # Đóng public setters, bổ sung domain methods SetTable(), RecalculateTotal()
├── Tables/RestaurantTable.cs                   # Đóng public setters, gom reset trạng thái vào Release(), Occupy(), MarkCleaning()
├── Recipes/
│   ├── Recipe.cs                               # Đóng public setters, quản lý IsActive và Version
│   └── RecipeManager.cs                        # Clone Snapshot khi BumpVersion, kiểm tra nguyên liệu tồn tại/active
├── Inventories/InventoryManager.cs             # Chuyển đổi 100% sang AsyncExecuter.ToListAsync
└── TooHungryDomainErrorCodes.cs                # Khai báo tập trung các hằng số mã lỗi nghiệp vụ

src/Acme.TooHungry.Domain.Shared/
├── TooHungryDomainSharedModule.cs              # Cấu hình MapCodeNamespace("RecipeIngredient")
└── Localization/TooHungry/
    ├── vi.json                                 # Bổ sung 100% bản dịch Tiếng Việt cho các mã lỗi mới
    └── en.json                                 # Bổ sung 100% bản dịch Tiếng Anh cho các mã lỗi mới

src/Acme.TooHungry.Application.Contracts/
├── Inventories/IInventoryAppService.cs         # Thêm phân trang PagedAndSortedResultRequestDto cho GetTransactionsAsync
├── Forecasts/
│   ├── IDemandForecastAppService.cs            # Tách riêng giao diện Dự báo
│   └── IIngredientPlanAppService.cs            # Tách riêng giao diện Kế hoạch
├── Dishes/
│   ├── IDishAppService.cs                      # Tách riêng giao diện Món ăn
│   └── IDishCategoryAppService.cs              # Tách riêng giao diện Danh mục
└── Permissions/
    ├── TooHungryPermissions.cs                 # Xóa bỏ 7 nhóm permissions mồ côi
    └── TooHungryPermissionDefinitionProvider.cs # Dọn dẹp định nghĩa quyền tương ứng

src/Acme.TooHungry.Application/
├── Orders/OrderAppService.cs                   # Kế thừa TooHungryAppService, sinh mã ORD an toàn kèm salt, tối ưu query recipe
├── Tables/TableAppService.cs                   # Chuyển đổi toàn bộ sang AsyncExecuter, thay thế UserFriendlyException
├── Inventories/InventoryAppService.cs          # Phân trang GetTransactionsAsync, tối ưu GetAlertsAsync, sinh mã BATCH kèm salt
├── Forecasts/
│   ├── DemandForecastAppService.cs             # Tách tệp độc lập, loại bỏ N+1 query tải cả bảng
│   └── IngredientPlanAppService.cs             # Tách tệp độc lập, tối ưu tra cứu nguyên liệu
├── Dishes/
│   ├── DishAppService.cs                       # Tách tệp độc lập, chuẩn hóa BusinessException
│   └── DishCategoryAppService.cs               # Tách tệp độc lập, chuẩn hóa BusinessException
├── Recipes/RecipeAppService.cs                 # Nạp Units 1 lần qua Map Dictionary, loại bỏ N+1
└── Dashboard/DashboardAppService.cs            # Thay catch rỗng bằng Logger.LogWarning, thay dynamic bằng record OrderTrendSummary

src/Acme.TooHungry.EntityFrameworkCore/
├── EntityFrameworkCore/TooHungryDbContext.cs   # Thêm indexes Orders, OrderNumber, Recipe active; gỡ bỏ AutoInclude xuyên Aggregate
└── Migrations/                                 # Sinh EF Core Migration Add_RM025_Indexes_And_Optimizations
```

### Thư mục Gốc & Mã nguồn Frontend Cần Vệ sinh
```text
Thư mục gốc (Dọn dẹp tệp rác):
├── XÓA: test.cs                                # Chứa mật khẩu admin
├── XÓA: Reflect.cs                             # Hardcode đường dẫn cá nhân
├── XÓA: fix.js                                 # Script sửa code một lần
├── XÓA: translate.js                           # Script dịch code một lần
├── XÓA: perf-test.ps1                          # Script kiểm thử lỗi 401
└── XÓA: Logs/logs.txt                          # Tệp log cục bộ

angular/src/app/ (Dọn dẹp dead code & Strict Mode):
├── XÓA: auth/login/*                           # Thư mục login thừa
├── XÓA: shared/layout/*                        # Layout cũ không sử dụng
├── XÓA: shared/components/modal/               # Modal cũ không dùng
├── XÓA: shared/components/spinner/             # Spinner cũ không dùng
├── XÓA: shared/shared-module.ts                # Module cũ không dùng
├── XÓA: permissions.json                       # File rỗng 0 byte
├── XÓA: e2e/                                   # Thư mục e2e cũ
├── SỬA: app.config.ts                          # Xóa HttpClientModule và FormsModule thừa
├── SỬA: home.component.ts & recipe.component.ts # Xóa console.error còn sót
└── SỬA: tsconfig.json                          # Bật "strict": true toàn diện
```

---

## Theo dõi Độ phức tạp (Complexity Tracking)

*Không phát hiện vi phạm nguyên tắc Hiến pháp (Constitution) cần ngoại lệ.* Tất cả các thành phần đều tuân thủ chặt chẽ theo ABP Framework tiêu chuẩn, Domain-Driven Design (DDD), Non-blocking Async, Strict Strong Typing và quy chuẩn chất lượng của Acme.TooHungry.
