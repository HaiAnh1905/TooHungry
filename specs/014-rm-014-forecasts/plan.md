# Kế hoạch Triển khai (Implementation Plan): RM-014 Dự báo Nhu cầu & Kế hoạch Nguyên liệu

**Nhánh (Branch)**: `014-rm-014-forecasts` | **Ngày**: 2026-10-15 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/014-rm-014-forecasts/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 14-10-2026 với 3 quyết định kiến trúc then chốt (SMA 7/14/30 ngày làm tròn trần, lưu đồng thời `IngredientPlan` trong DB, hỗ trợ cả xuất Excel và in phiếu A4 chuẩn bị bếp).

---

## 1. Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Dự báo Nhu cầu Món ăn & Kế hoạch Nguyên liệu (Demand Forecasts & Ingredient Requirement Planning) (RM-014)** thuộc phân hệ Vận hành nâng cao (Operations, Wave 4). Tính năng này là cầu nối chiến lược giữa dữ liệu bán hàng thực tế từ POS/Thanh toán (RM-010, RM-016) với công tác quản trị chuỗi cung ứng nguyên vật liệu nhà hàng (RM-005, RM-007, RM-011).

Các mục tiêu kỹ thuật cốt lõi:
1. **Thuật toán Dự báo SMA Thông minh**: Tự động tổng hợp lịch sử các đơn hàng đã thanh toán thành công (`Order.Status = Completed`) trong 7, 14 hoặc 30 ngày qua để tính bình quân lượng tiêu thụ mỗi ngày và quy đổi sang kỳ dự báo tương lai kèm làm tròn trần (`Math.Ceiling`), cho phép Bếp trưởng/Quản lý chủ động điều chỉnh số lượng.
2. **Bóc tách Định lượng Công thức (Recipe Explosion) & Lưu trữ Thực thể Kép**: Tự động bóc tách thành phần nguyên liệu từ công thức món ăn đang kích hoạt (`Recipe.IsActive = true`) và lưu trữ thực thể `IngredientPlan` & `IngredientPlanItem` trong DB gắn với `DemandForecast` theo vòng đời trạng thái (`Draft` -> `Confirmed` -> `Executed`).
3. **Đối soát Tồn kho Khả dụng & Gợi ý Mua hàng**: Tự động so sánh tổng nhu cầu nguyên liệu với tồn kho khả dụng thực tế (`CurrentStock` từ các lô `InventoryBatch` chưa hết hạn) để đưa ra danh sách nguyên liệu cần nhập thêm (`SuggestedPurchaseQuantity = max(0, RequiredQuantity - CurrentStock)`) và ngân sách dự toán mua sắm.
4. **Phân tích Tài chính Dự toán (Financial Summary)**: 4 thẻ KPI đầu trang hiển thị Doanh thu dự kiến, Chi phí nguyên liệu lý thuyết, Tỷ lệ Food Cost % và Ngân sách mua hàng.
5. **Đa dạng Phương thức Tác nghiệp**: Hỗ trợ xuất bảng kê mua hàng ra file Excel (.xlsx / CSV UTF-8 BOM) gửi nhà cung cấp/kế toán và in phiếu chuẩn bị nguyên vật liệu bếp khổ A4 thông qua CSS Print chuyên biệt.
6. **Bộ Nhận diện Cam & Trắng & Song ngữ 100%**: Áp dụng giao diện hiện đại theo Hiến pháp VI và đồng bộ từ điển song ngữ trong `vi.json` / `en.json`.

---

## 2. Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: C# 13, .NET 10.0, ABP Framework 9.x, TypeScript 5.x, Angular 19+
- **Kiến trúc Backend**: DDD (Domain-Driven Design), FullAudited Aggregate Roots, Application Services, Repository Pattern, EF Core Code-First
- **Kiến trúc Frontend**: Angular Standalone Components, Signal State Management, Computed Signals, ABP Theme Shared Module, FontAwesome Free icons, ng-zorro-antd components
- **Mục tiêu Hiệu năng**:
  - Thời gian tổng hợp lịch sử bán hàng và sinh gợi ý SMA cho toàn bộ menu (< 500 món): < 2s
  - Thời gian bóc tách định lượng nguyên liệu cho bản dự báo: < 1s
  - Tải dữ liệu phân trang và chi tiết dự báo: < 300ms
- **Ràng buộc Thương hiệu & I18N**:
  - Tuân thủ bảng màu nhận diện Cam & Trắng đặc trưng (`#EA580C`, `#FFFFFF`, `#FFF3E8`, `#F8FAFC`)
  - 100% chuỗi văn bản giao diện lưu đầy đủ trong `vi.json` và `en.json`

---

## 3. Kiểm tra Hiến pháp (Constitution Check)

*GATE: Đánh giá theo Hiến pháp Acme.TooHungry trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp ABP**:
  - Thực thể cốt lõi `DemandForecast`, `DemandForecastItem`, `IngredientPlan`, `IngredientPlanItem` đặt trong `Acme.TooHungry.Domain/Forecasts`.
  - Enum `PlanStatus` đặt trong `Acme.TooHungry.Domain.Shared/Forecasts`.
  - DTOs và Interfaces đặt trong `Acme.TooHungry.Application.Contracts/Forecasts`.
  - Nghiệp vụ tính toán SMA, bóc tách công thức và đối chiếu tồn kho đóng gói trong `DemandForecastAppService` và `IngredientPlanAppService`.
- [x] **II. UML & Domain Model Alignment**:
  - Nhất quán 100% với sơ đồ Visual Paradigm `RMS-TH.vpp` và tài liệu mô hình `ClassDiagram_Viewer.html` (Module "📈 Dự Báo & Thực Đơn Ngày").
- [x] **III. Test-First & Automated Quality Gates**:
  - Thiết kế các kịch bản kiểm thử tự động toàn diện trong `Acme.TooHungry.Application.Tests` cho thuật toán SMA, bóc tách định lượng và tính toán tồn kho an toàn.
- [x] **IV. Hợp đồng API Nghiêm ngặt & Module Angular**:
  - Định nghĩa chi tiết REST API endpoints, DTOs định kiểu mạnh và Angular proxy services đồng bộ.
- [x] **V. Bảo mật, Kiểm toán (Auditing) & Phân quyền**:
  - Thực thể kế thừa `FullAuditedAggregateRoot<Guid>` và `FullAuditedEntity<Guid>`.
  - Bảo vệ API bằng chính sách phân quyền hạt nhân `TooHungryPermissions.Forecasts.*`.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Áp dụng triệt để bộ nhận diện Cam & Trắng cho bảng `SharedTable`, các thẻ KPI tài chính và tabs chuyển đổi.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% nhãn và thông báo được khai báo song ngữ đồng bộ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - 100% tài liệu (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts`) được biên soạn bằng Tiếng Việt.

---

## 4. Cấu trúc Dự án (Project Structure)

### 4.1. Tài liệu Đặc tả & Thiết kế (specs/)
```text
specs/014-rm-014-forecasts/
├── spec.md                            # Đặc tả nghiệp vụ và biên bản làm rõ (/speckit.clarify)
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật SMA, bóc tách Recipe, Excel & Print A4
├── data-model.md                      # Thiết kế ERD, thực thể DB, DTOs, Enums và State Machine
├── quickstart.md                      # Hướng dẫn kiểm thử 6 kịch bản vận hành và chạy test
├── contracts/
│   └── forecast-api-contracts.md      # Hợp đồng REST API, Proxy Angular và CSS Print A4
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng đặc tả (Đạt 16/16 PASS - 100%)
```

### 4.2. Mã nguồn Backend & Frontend
```text
# Backend .NET
Acme.TooHungry/src/
├── Acme.TooHungry.Domain.Shared/
│   └── Forecasts/
│       └── PlanStatus.cs              # Enum PlanStatus (Draft, Confirmed, Executed, Cancelled)
├── Acme.TooHungry.Domain/
│   └── Forecasts/
│       ├── DemandForecast.cs          # Aggregate Root bản dự báo nhu cầu
│       ├── DemandForecastItem.cs      # Entity chi tiết món dự báo
│       ├── IngredientPlan.cs          # Aggregate Root kế hoạch nguyên liệu
│       └── IngredientPlanItem.cs      # Entity chi tiết nguyên liệu cần dùng
├── Acme.TooHungry.EntityFrameworkCore/
│   └── EntityFrameworkCore/
│       └── TooHungryDbContext.cs      # Khai báo DbSets và OnModelCreating cho Forecasts & IngredientPlans
├── Acme.TooHungry.Application.Contracts/
│   ├── Forecasts/
│   │   ├── ForecastDtos.cs            # Các DTOs: DemandForecastDto, IngredientPlanDto, FinancialSummary...
│   │   └── IForecastAppServices.cs    # IDemandForecastAppService & IIngredientPlanAppService
│   └── Permissions/
│       ├── TooHungryPermissions.cs    # Nhóm quyền TooHungryPermissions.Forecasts.*
│       └── TooHungryPermissionDefinitionProvider.cs # Định nghĩa quyền hiển thị trên UI
├── Acme.TooHungry.Application/
│   └── Forecasts/
│       └── ForecastAppServices.cs     # Triển khai DemandForecastAppService & IngredientPlanAppService
└── Acme.TooHungry.HttpApi/
    └── Controllers/
        └── ForecastController.cs      # Controller phơi bày REST endpoints chuẩn

# Frontend Angular
Acme.TooHungry/angular/src/
├── app/
│   ├── proxy/forecasts/
│   │   ├── models.ts                  # TypeScript interfaces & Enums sinh theo backend
│   │   └── forecast.service.ts        # DemandForecastService & IngredientPlanService
│   ├── forecast/
│   │   ├── forecast.component.ts      # Danh sách bản dự báo phân trang, bộ lọc
│   │   ├── forecast.component.html    # Template bảng SharedTable danh sách dự báo
│   │   ├── forecast.component.scss    # Style danh sách dự báo
│   │   ├── forecast-detail/
│   │   │   ├── forecast-detail.component.ts   # Màn hình chi tiết: Tab Món & Tab Nguyên liệu
│   │   │   ├── forecast-detail.component.html # Template chi tiết, thẻ KPI, in A4
│   │   │   └── forecast-detail.component.scss # Style tabs, badges, @media print A4
│   │   └── forecast-create/
│   │       ├── forecast-create.component.ts   # Modal/Màn hình tạo mới, nút gợi ý SMA
│   │       ├── forecast-create.component.html # Template form chọn ngày & bảng món
│   │       └── forecast-create.component.scss # Style form tạo dự báo
│   ├── app.routes.ts                  # Đăng ký route /forecasts
│   └── route.provider.ts              # Đăng ký menu "Dự báo & Kế hoạch"
└── assets/i18n/
    ├── vi.json                        # Cập nhật từ điển tiếng Việt (TooHungry::Forecasts.*)
    └── en.json                        # Cập nhật từ điển tiếng Anh (TooHungry::Forecasts.*)
```

---

## 5. Kế hoạch Triển khai theo Từng Giai đoạn (Phased Implementation Plan)

### Phase 1: Hoàn thiện Tầng Domain & Entity Framework Core
1. Tạo thực thể `IngredientPlan` và `IngredientPlanItem` trong `src/Acme.TooHungry.Domain/Forecasts/`.
2. Kiểm tra và cập nhật `TooHungryDbContext.cs`:
   - Thêm `DbSet<IngredientPlan> IngredientPlans { get; set; }`
   - Thêm `DbSet<IngredientPlanItem> IngredientPlanItems { get; set; }`
   - Cấu hình quan hệ, khóa ngoại, độ chính xác `decimal(18, 4)` cho `RequiredQuantity` trong `OnModelCreating`.
3. Kiểm tra migration (bảng `AppDemandForecasts` và `AppDemandForecastItems` đã có sẵn trong migration ban đầu, cập nhật cấu hình cho `AppIngredientPlans` và `AppIngredientPlanItems`).

### Phase 2: Hoàn thiện Tầng Application.Contracts & Phân quyền
1. Bổ sung nhóm quyền `TooHungryPermissions.Forecasts` trong `TooHungryPermissions.cs`:
   - `Default`, `Create`, `Edit`, `Delete`, `Approve`.
2. Cập nhật `TooHungryPermissionDefinitionProvider.cs` để quản trị viên có thể cấp quyền qua UI Quản lý quyền hạn.
3. Hoàn thiện các DTO trong `Application.Contracts/Forecasts/`:
   - `DemandForecastDto`, `DemandForecastItemDto`, `CreateUpdateDemandForecastDto`
   - `IngredientPlanDto`, `IngredientPlanItemDto`, `UpdatePlanStatusDto`
   - `GenerateForecastInputDto`, `GenerateForecastResultDto`
   - `ForecastFinancialSummaryDto`
4. Khai báo các phương thức nghiệp vụ trong `IDemandForecastAppService` và `IIngredientPlanAppService`.

### Phase 3: Hoàn thiện Tầng Application Service & HTTP API Controller
1. Triển khai phương thức trong `DemandForecastAppService.cs`:
   - `GenerateForecastAsync(GenerateForecastInputDto input)`: Thuật toán SMA tính trung bình từ các `Order` Completed trong 7/14/30 ngày qua, nhân số ngày kỳ dự báo và làm tròn trần `Ceiling`.
   - `CreateAsync`: Lưu `DemandForecast` đồng thời tự động bóc tách công thức `Recipe` của từng món để tạo `IngredientPlan` & `IngredientPlanItem` với trạng thái `Draft`.
   - `UpdateAsync`: Cập nhật số lượng món và tính toán lại `IngredientPlan` tương ứng.
   - `GetFinancialSummaryAsync`: Tính toán Doanh thu dự kiến, Chi phí nguyên liệu, Food Cost % và Ngân sách mua sắm.
2. Triển khai `IngredientPlanAppService.cs`:
   - `GetByForecastIdAsync`: Lấy kế hoạch nguyên liệu, tổng hợp tồn kho khả dụng `CurrentStock` từ các lô `InventoryBatch` chưa hết hạn, tính `SuggestedPurchaseQuantity` và `EstimatedCost`.
   - `UpdateStatusAsync`: Phê duyệt trạng thái (`Draft` -> `Confirmed` -> `Executed`).
3. Tạo `ForecastController.cs` trong `Acme.TooHungry.HttpApi/Controllers/` phơi bày toàn bộ REST endpoints.
4. Xây dựng Unit & Integration Tests trong `Acme.TooHungry.Application.Tests` đảm bảo 100% tests PASS.

### Phase 4: Frontend Proxies, Định tuyến & Đa ngôn ngữ (i18n)
1. Tạo proxy models và services trong `angular/src/app/proxy/forecasts/`.
2. Khai báo route `/forecasts` trong `angular/src/app/app.routes.ts`.
3. Bổ sung mục menu "Dự báo & Kế hoạch" trong `angular/src/app/route.provider.ts` kèm biểu tượng `fa-chart-line` và bảo vệ bằng quyền `TooHungry.Forecasts`.
4. Cập nhật toàn diện các chuỗi hiển thị song ngữ vào `vi.json` và `en.json`.

### Phase 5: Giao diện Người dùng Angular (Orange & White UI)
1. Xây dựng `ForecastComponent` (`/forecasts`):
   - Danh sách bản dự báo phân trang sử dụng `SharedTable`.
   - Bộ lọc theo khoảng thời gian (`StartDate` - `EndDate`).
   - Nút `[+ Tạo bản dự báo mới]`.
2. Xây dựng `ForecastCreateComponent`:
   - Chọn khoảng thời gian dự báo và kỳ phân tích SMA (7, 14, 30 ngày).
   - Nút `[⚡ Tự động tính từ Lịch sử]` gọi API `generate`.
   - Bảng danh sách món ăn cho phép Bếp trưởng điều chỉnh số lượng thủ công.
   - Tóm tắt tài chính dự toán tức thì (Realtime Financial Summary).
3. Xây dựng `ForecastDetailComponent` (`/forecasts/detail/:id`):
   - 4 Thẻ KPI tài chính đầu trang (Doanh thu, Chi phí, Food Cost %, Ngân sách mua hàng).
   - Tab 1: "Dự báo Món ăn" (bảng chi tiết món ăn, số lượng, giá bán, cảnh báo chưa có Recipe).
   - Tab 2: "Kế hoạch Nguyên liệu & Mua hàng" (bảng chi tiết nguyên liệu, nhu cầu, tồn kho khả dụng, số lượng cần mua, đơn giá và thành tiền).
   - Nút tác vụ: `[✓ Phê duyệt kế hoạch]`, `[📥 Xuất Excel mua hàng]` (tải file CSV UTF-8 BOM), `[🖨️ In phiếu chuẩn bị bếp]` (CSS Print A4).
4. Tối ưu CSS Print:
   - Căn chỉnh layout trang in A4 chuẩn quốc tế, ẩn toàn bộ navigation/sidebar, tối ưu chữ ký xác nhận của Bếp trưởng và Thủ kho.

### Phase 6: Kiểm thử Tích hợp & Nghiệm thu
1. Chạy toàn bộ kiểm thử tự động Backend (`dotnet test`).
2. Kiểm tra biên dịch và build Frontend (`npm run build`).
3. Xác thực toàn diện 6 kịch bản kiểm thử trong `quickstart.md`.

---

## 6. Theo dõi Độ phức tạp (Complexity Tracking)

*Không phát hiện vi phạm nguyên tắc Hiến pháp (Constitution) cần ngoại lệ.* Tất cả các thành phần đều tuân thủ chặt chẽ theo ABP Framework tiêu chuẩn, DDD và quy chuẩn UI/UX của Acme.TooHungry.
