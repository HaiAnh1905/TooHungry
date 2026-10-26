# Kế hoạch Triển khai (Implementation Plan): RM-026 Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency)

**Nhánh (Branch)**: `026-rm-026-automated-testing-auth-concurrency-idempotency` | **Ngày**: 2026-10-23 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/026-rm-026-automated-testing-auth-concurrency-idempotency/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 23-10-2026 với 4 quyết định kỹ thuật chốt hạ:
1. **Giả lập Phân quyền Thời gian chạy (Runtime Authorization Harness)**: Sử dụng `_currentUser.Change(...)` kết hợp với fake `ClaimsPrincipal` scope để kích hoạt ABP Authorization Interceptor thật sự, kiểm tra ngoại lệ `AbpAuthorizationException` (HTTP 401/403) trên toàn bộ các API quan trọng và ma trận quyền vai trò (Waiter, InventoryKeeper).
2. **Khẳng định Tính Bất biến (Idempotency Assertions)**: Khẳng định việc gọi `CompletePaymentAsync` hoặc `UpdateAsync(Completed)` lặp lại bị từ chối bằng `BusinessException("TooHungry:Order:AlreadyCompleted")` và kho hàng tuyệt đối không bị trừ lần 2 (triệt tiêu dứt điểm Backend #1).
3. **Mô phỏng Tương tranh Đa luồng An toàn trong SQLite In-Memory**: Sử dụng `IServiceScopeFactory.CreateScope()` để sinh DbContext và Unit of Work độc lập cho từng Task chạy song song trong `Task.WhenAll`, mô phỏng chính xác các client cạnh tranh thực tế mà không gây lỗi thread-safe nội bộ của EF Core.
4. **Quy chuẩn Kiểm thử Gộp bàn (`MergeTablesAsync`)**: Khẳng định các món trùng nhau được cộng dồn `Quantity`, đơn giá cập nhật theo giá niêm yết CSDL (`Dish.Price`), ghép nối ghi chú chế biến và hủy đơn phụ với ghi chú đối soát rõ ràng (khắc phục triệt để Backend #16).

---

## Tóm tắt (Summary)

Kế hoạch triển khai gói giải pháp **Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (RM-026)** xây dựng hệ thống kiểm thử tự động toàn diện bao phủ toàn bộ các góc khuất và rủi ro vận hành nghiêm trọng đã được chỉ ra trong `CODE_REVIEW.md` (đặc biệt là phát hiện Backend #34). Bộ kiểm thử này được tổ chức theo chuẩn kiến trúc 2 tầng của ABP Framework: các lớp kiểm thử logic trừu tượng đặt tại `Acme.TooHungry.Application.Tests` và các lớp thực thi tích hợp cụ thể đặt tại `Acme.TooHungry.EntityFrameworkCore.Tests` chạy trên SQLite In-Memory siêu tốc.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ & Nền tảng**: C# 13, .NET 10.0 SDK, ABP Framework 9.x
- **Framework Kiểm thử**: xUnit, Shouldly (Fluent Assertions), NSubstitute
- **Cơ sở Dữ liệu Kiểm thử**: SQLite In-Memory (`Volo.Abp.EntityFrameworkCore.Sqlite`) thông qua `AbpUnitTestSqliteDatabase`
- **Mục tiêu Hiệu năng**:
  - Thời gian chạy toàn bộ test suites mới < 30 giây.
  - Zero Flakiness (độ ổn định 100% qua hàng trăm lần chạy liên tiếp).
  - Không để rò rỉ trạng thái giữa các test cases (mỗi test tự sinh dữ liệu độc lập).
- **Ràng buộc Kiến trúc**:
  - Tuân thủ nghiêm ngặt mô hình kiểm thử phân tầng của ABP: Lớp cha trừu tượng parameterized theo `<TStartupModule>` trong Application.Tests, lớp con kế thừa cụ thể trong EntityFrameworkCore.Tests.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Đánh giá theo Hiến pháp [constitution.md](../../.specify/memory/constitution.md) - Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Cấu trúc Phân lớp ABP**:
  - Các bài test kiểm tra trực tiếp các invariant của Rich Domain Model (`order.Complete()`, `table.Release()`, `table.Occupy()`).
  - Kiểm thử phân quyền tận dụng đúng cơ chế ABP Interceptor và Permission System.
- [x] **II. UML & Sự Đồng nhất của Domain Model**:
  - Toàn bộ các trạng thái đơn hàng (`Processing`, `Completed`, `Cancelled`) và bàn ăn (`Available`, `Occupied`, `Cleaning`) khớp 100% với tài liệu thiết kế hệ thống trong `RMS-TH.vpp`.
- [x] **III. Test-First & Cổng Chất lượng Tự động**:
  - Ticket RM-026 chính là hiện thực hóa cao nhất của nguyên tắc Test-First, hoàn thiện cổng kiểm định chất lượng tự động chặn mọi hồi quy cho toàn bộ các ticket trước đó.
- [x] **IV. Hợp đồng API Nghiêm ngặt**:
  - Kiểm thử xác thực các input DTOs, hợp đồng phân trang và mã lỗi nghiệp vụ chuẩn `BusinessException`.
- [x] **V. Bảo mật & Phân quyền Mặc định (Security by Default)**:
  - Bao phủ 100% các endpoint được bảo vệ, xác nhận người dùng thiếu quyền hạn bị chặn đứng bằng `AbpAuthorizationException`.
- [x] **VI. Sự Nhất quán của UI/UX & Quốc tế hóa (I18N)**:
  - Khẳng định các thông điệp lỗi nghiệp vụ được phân giải từ từ điển song ngữ `vi.json` và `en.json`.
- [x] **VII. Ngôn ngữ Tài liệu (Documentation Language)**:
  - Toàn bộ hồ sơ kế hoạch và tài liệu thiết kế được trình bày bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Thiết kế & Đặc tả (`specs/026-rm-026-automated-testing-auth-concurrency-idempotency/`)
```text
specs/026-rm-026-automated-testing-auth-concurrency-idempotency/
├── spec.md                                     # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                                     # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                                 # Nghiên cứu 5 giải pháp kỹ thuật Phase 0 (hoàn thành)
├── data-model.md                               # Ma trận trạng thái, Persona, Concurrency Paths Phase 1
├── quickstart.md                               # Hướng dẫn chạy và lọc test CLI Phase 1
├── contracts/
│   └── testing-contracts.md                    # Hợp đồng Test Harness, Helpers và Test Methods Phase 1
└── checklists/
    └── requirements.md                         # Bảng kiểm định chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Kiểm thử Cần Xây dựng & Bổ sung

```text
test/Acme.TooHungry.Application.Tests/
├── Security/
│   ├── EndpointAuthorization_Runtime_Tests.cs        # [MỚI] Test ném AbpAuthorizationException khi thiếu quyền
│   └── RoleBasedAuthorization_Tests.cs                # [MỚI] Test ma trận quyền vai trò Waiter, InventoryKeeper
├── Orders/
│   ├── OrderAppService_Idempotency_Tests.cs           # [MỚI] Test chống trừ kho 2 lần khi gọi Completed lặp lại
│   └── OrderAppService_SubmitOrder_Concurrency_Tests.cs # [MỚI] Test race condition khi 2 waiter cùng submit đơn
├── Inventories/
│   ├── InventoryManager_Fefo_Concurrency_Tests.cs     # [MỚI] Test retry concurrency khi trừ kho đa luồng
│   ├── InventoryAppService_StockAdjustment_Tests.cs   # [MỚI] Test kiểm kê kho tính đúng giá vốn & hạn dùng
│   └── InventoryManager_Fefo_Consumption_Tests.cs     # [MỚI] Test thuật toán FEFO đa lô theo hạn sử dụng
└── Tables/
    ├── TableAppService_TransferTable_Tests.cs         # [MỚI] Test luồng chuyển bàn và các ca từ chối
    ├── TableAppService_MergeTables_Advanced_Tests.cs  # [MỚI] Test luồng gộp bàn bảo toàn note và đơn giá
    └── TableAppService_CancelOrder_Tests.cs           # [MỚI] Test hủy đơn và giải phóng bàn ăn

test/Acme.TooHungry.EntityFrameworkCore.Tests/EntityFrameworkCore/Applications/
├── EfCoreEndpointAuthorizationRuntimeTests.cs         # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreRoleBasedAuthorizationTests.cs               # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreOrderIdempotencyTests.cs                     # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreOrderSubmitOrderConcurrencyTests.cs          # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreInventoryFefoConcurrencyTests.cs             # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreInventoryStockAdjustmentTests.cs             # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreInventoryFefoConsumptionTests.cs             # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreTableTransferTableTests.cs                   # [MỚI] Runner tích hợp SQLite In-Memory
├── EfCoreTableMergeTablesAdvancedTests.cs             # [MỚI] Runner tích hợp SQLite In-Memory
└── EfCoreTableCancelOrderTests.cs                     # [MỚI] Runner tích hợp SQLite In-Memory
```

---

## Các Giai đoạn Thực thi Chi tiết (Implementation Phases)

### Giai đoạn 1: Thiết lập Nền tảng Test Harness & Helper Tiện ích (Phase 1)
- Xây dựng phương thức tiện ích `ChangeUserContext(userId, userName, roles)` trong lớp cơ sở `TooHungryApplicationTestBase`.
- Chuẩn hóa bộ khởi tạo dữ liệu mẫu (Test Fixture Builders) cho Món ăn, Công thức, Lô kho và Bàn ăn.

### Giai đoạn 2: Triển khai Bộ Kiểm thử Phân quyền Thời gian chạy (Phase 2 - Security Tests)
- Xây dựng `EndpointAuthorization_Runtime_Tests`:
  + Kiểm thử từ chối `AbpAuthorizationException` cho 6 API chỉ định: `MediaController.UploadDishImageAsync`, `DailyMenuAppService`, `RecipeController.by-dish`, `TableOrderController.complete`, `OrderAppService.Delete`, `DishCategoryAppService.Delete`.
- Xây dựng `RoleBasedAuthorization_Tests`:
  + Kiểm thử ma trận phân quyền vai trò: `Waiter` tạo đơn được nhưng không được xóa đơn/sửa nguyên liệu; `InventoryKeeper` quản lý kho được nhưng không được thanh toán đơn; `Admin` có toàn quyền.

### Giai đoạn 3: Triển khai Bộ Kiểm thử Bất biến & Tương tranh Đơn hàng (Phase 3 - Orders Tests)
- Xây dựng `OrderAppService_Idempotency_Tests`:
  + Gọi `CompletePaymentAsync` / `UpdateAsync(Completed)` lần 1 thành công.
  + Gọi lần 2: Bắt ngoại lệ `BusinessException("TooHungry:Order:AlreadyCompleted")`, assert số dư tồn kho không đổi, số bản ghi `InventoryTransaction` không tăng.
- Xây dựng `OrderAppService_SubmitOrder_Concurrency_Tests`:
  + Chạy đa luồng song song trên 2 DI Scope độc lập gọi `SubmitOrderAsync` trên cùng một bàn.
  + Assert chỉ 1 đơn active tồn tại, đơn thứ 2 bắt ngoại lệ nghiệp vụ chuẩn, không có lỗi 500.

### Giai đoạn 4: Triển khai Bộ Kiểm thử Tương tranh Kho & Thuật toán FEFO (Phase 4 - Inventory Tests)
- Xây dựng `InventoryManager_Fefo_Concurrency_Tests`:
  + 4 đơn hàng cùng tiêu hao nguyên liệu từ 1 lô kho, assert cơ chế retry concurrency hoàn tất trơn tru, tồn kho cuối cùng trừ chính xác, không âm kho.
- Xây dựng `InventoryAppService_StockAdjustment_Tests`:
  + Điều chỉnh tăng sinh lô có giá vốn bằng `estimatedPrice` và hạn sử dụng theo `StorageType`.
  + Điều chỉnh giảm khấu trừ FEFO an toàn.
- Xây dựng `InventoryManager_Fefo_Consumption_Tests`:
  + Khấu trừ đa lô, ưu tiên lô có hạn dùng gần nhất trước, bỏ qua lô hết hạn.

### Giai đoạn 5: Triển khai Bộ Kiểm thử Luồng Nghiệp vụ Bàn ăn Phức hợp (Phase 5 - Table Tests)
- Xây dựng `TableAppService_TransferTable_Tests`:
  + Chuyển bàn thành công kế thừa `OccupiedTime`, chuyển active order, chuyển bàn nguồn về `Cleaning`.
  + Kiểm tra từ chối khi trùng bàn, bàn nguồn trống, bàn đích bận.
- Xây dựng `TableAppService_MergeTables_Advanced_Tests`:
  + Gộp bàn cộng dồn số lượng món trùng, cập nhật đơn giá theo bảng `Dishes` CSDL, ghép nối đầy đủ ghi chú chế biến cả 2 bàn, hủy đơn phụ có note lưu vết và giải phóng bàn phụ về `Cleaning`.
- Xây dựng `TableAppService_CancelOrder_Tests`:
  + Hủy đơn đang mở, giải phóng bàn về `Available`, không trừ kho.

### Giai đoạn 6: Tích hợp Lớp Thực thi EF Core & Kiểm định Toàn diện (Phase 6 - Verification)
- Tạo 10 lớp test runner cụ thể trong `Acme.TooHungry.EntityFrameworkCore.Tests`.
- Chạy toàn bộ test suite bằng lệnh `dotnet test` và xác nhận kết quả: **100% Passed, 0 Failed, 0 Skipped**.
