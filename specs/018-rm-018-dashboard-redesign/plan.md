# Kế hoạch Triển khai (Implementation Plan): RM-018 Làm mới trang Dashboard (Dashboard Redesign)

**Nhánh (Branch)**: `018-rm-018-dashboard-redesign` | **Ngày**: 2026-10-16 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/018-rm-018-dashboard-redesign/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 16-10-2026 với 4 quyết định trọng yếu:
1. Thư viện biểu đồ **Chart.js Dual-axis** (Cột Doanh thu VND + Đường Số lượng đơn hàng).
2. Mặc định thống kê **7 ngày gần đây** và cung cấp bộ chọn khoảng ngày tùy chỉnh (`Date Range Picker`).
3. Cập nhật dữ liệu thời gian thực kết hợp **SignalR Realtime** (`TableHub` & `OrderHub`) + nút `[Làm mới]` thủ công.
4. Phân quyền và bảo vệ vai trò (`dashboardGuard`): chỉ **Manager** và **Administrator** truy cập đầy đủ; khi chưa đăng nhập hiển thị **Trạm Vào Ca Nội Bộ (Terminal Mode)**.

---

## Tóm tắt (Summary)

Tái thiết kế toàn diện trang Bảng điều khiển trung tâm (`/`) thuộc Wave 4 của lộ trình Acme.TooHungry. Chuyển đổi từ mô hình cũ gọi phân tán 5 API rời rạc và tính sai doanh thu sang một **Trung tâm Chỉ huy Vận hành (Operational Command Center)** với giao diện Bento Grid 4 tầng sang trọng, chuẩn nhận diện Cam & Trắng (`#EA580C`), dữ liệu tổng hợp tập trung từ Backend và cập nhật thời gian thực qua SignalR.

### Các mục tiêu kiến trúc & kỹ thuật cốt lõi:
1. **Kiến trúc Dữ liệu Tổng hợp Tập trung (Single Aggregation Endpoint)**:
   - Xây dựng `DashboardAppService` (thực thi `IDashboardAppService`) cung cấp endpoint duy nhất: `GET /api/app/dashboard/summary?period=Last7Days`.
   - Sử dụng các câu truy vấn LINQ / EF Core `AsNoTracking()` tối ưu, tổng hợp trực tiếp trên Database Server, đảm bảo thời gian phản hồi dưới 200ms.
   - Sửa dứt điểm lỗi tính sai doanh thu của phiên bản cũ.
2. **Cấu trúc Giao diện Bento Grid 4 Tầng Chuẩn Nhận Diện Cam & Trắng (`#EA580C`)**:
   - **Tầng 1**: 4 Thẻ KPI vận hành (Doanh thu, Đơn hàng, Tỷ lệ lấp đầy bàn, Cảnh báo kho) kèm tỷ lệ tăng trưởng so với kỳ trước.
   - **Tầng 2**: Biểu đồ Chart.js Dual-axis (65%) kết hợp Sơ đồ Bàn ăn Thu nhỏ Trực tiếp (35%) với thanh phân bổ tiến độ đa phân khúc.
   - **Tầng 3**: Top 5 Món ăn Bán chạy nhất (Best Sellers) xếp hạng #1-#5 (50%) kết hợp 5 Đơn hàng Gần đây (50%).
   - **Tầng 4**: Widget Cảnh báo Kho Hàng Cận Date (FEFO) / Thiếu hụt & Khối Lối tắt Tác vụ Nhanh (Quick Actions).
3. **Thanh Công Cụ Lọc Thời Gian Linh Hoạt**:
   - Chuyển đổi nhanh 1 chạm: `[Hôm nay]`, `[Hôm qua]`, `[7 ngày gần nhất]` và bộ chọn khoảng ngày `[Date Range Picker]`.
4. **Tích hợp Đồng bộ Thời gian thực qua SignalR**:
   - Lắng nghe sự kiện `tableStatusChanged` từ `TableHub` để cập nhật tức thì trạng thái bàn và tỷ lệ lấp đầy bàn.
   - Lắng nghe sự kiện hoàn tất thanh toán từ `OrderHub` để tự động cộng dồn doanh thu và đơn hàng mà không cần F5.
5. **Bảo toàn & Nâng tầm Trạm Vào Ca Nội Bộ (Terminal Mode)**:
   - Khi chưa đăng nhập: Hiển thị đồng hồ số thời gian thực (`HH:mm:ss`), ngày làm việc, trạng thái nhà hàng mở/đóng cửa (09:00 - 23:00) và nút đăng nhập hệ thống lớn.
6. **Quốc tế hóa Song ngữ Toàn diện (i18n)**:
   - 100% nhãn tiêu đề, chú thích, thông điệp, tooltip có bản dịch đầy đủ trong `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: C# 12, .NET 9, ABP Framework 9.x, TypeScript 5.x, Angular 19+
- **Kiến trúc Backend**: Domain-Driven Design (DDD), EF Core 9, Application Services, LINQ Aggregations, SignalR Hubs (`TableHub`, `OrderHub`)
- **Kiến trúc Frontend**: Angular Standalone Components, Signal Reactive State (`signal`, `computed`), Chart.js 4.x, ABP Core Module, FontAwesome Free icons
- **Ràng buộc Hiệu năng**:
  - API `GetSummaryAsync` phản hồi < 200ms
  - Giảm số lượng HTTP request lúc nạp trang từ 5 xuống 1, giảm 70% payload dữ liệu
  - Độ trễ phát sóng SignalR cập nhật số liệu < 1s
  - Kích thước vùng chạm cảm ứng tối thiểu 44 × 44px
- **Ràng buộc Thương hiệu & I18N**:
  - Tuân thủ bảng màu thương hiệu Cam & Trắng (`#EA580C`, Clean Slate `#F8FAFC`, Thẻ trắng `#FFFFFF`, `#64748B`)
  - 100% chuỗi văn bản giao diện lưu đầy đủ trong `vi.json` và `en.json`

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - Định nghĩa rõ DTOs trong `Acme.TooHungry.Application.Contracts/Dashboard/`, triển khai Application Service trong `Acme.TooHungry.Application/Dashboard/`, expose HTTP API trong `Acme.TooHungry.HttpApi/Controllers/DashboardController.cs`.
- [x] **II. UML & Domain Model Alignment**:
  - Khớp với các thực thể Aggregate Roots `Order`, `RestaurantTable`, `Dish`, `InventoryBatch` trong `RMS-TH.vpp` và luồng nghiệp vụ tại `docs/roadmap.md`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Xây dựng unit tests tự động cho `DashboardAppService` (tính toán doanh thu, số đơn, tỷ lệ bàn, top món bán chạy, lọc theo ngày).
- [x] **IV. Hợp đồng API & Tích hợp Module**:
  - Hợp đồng REST API rõ ràng cho `GET /api/app/dashboard/summary`, tích hợp mượt mà với RM-006, RM-008, RM-010, RM-011, RM-016.
- [x] **V. Bảo mật & Phân quyền**:
  - Áp dụng policy `TooHungryPermissions.Dashboard.Default` và `dashboardGuard`, chỉ cho phép Manager/Admin truy cập.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Cấu trúc Bento Grid sang trọng, bo góc `rounded-2xl`, thanh tiến độ phân bổ bàn đa phân khúc, thẻ tương tác phản hồi mượt mà.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% nhãn, tiêu đề, tooltip, thông báo có bản dịch song ngữ trong `en.json` và `vi.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ kỹ thuật (spec, plan, research, data-model, contracts, quickstart) được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (specs/)
```text
specs/018-rm-018-dashboard-redesign/
├── spec.md                            # Đặc tả nghiệp vụ và biên bản làm rõ (/speckit.clarify)
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật Chart.js, Query LINQ EF Core, SignalR
├── data-model.md                      # Thiết kế DTOs, State Signals, và từ điển i18n song ngữ
├── quickstart.md                      # Hướng dẫn kiểm thử 6 kịch bản vận hành Dashboard
├── contracts/
│   └── dashboard-contracts.md         # Hợp đồng REST API, Angular Proxy Service, SignalR Events
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Cập nhật & Triển khai
```text
# Backend .NET
Acme.TooHungry/src/
├── Acme.TooHungry.Application.Contracts/
│   └── Dashboard/
│       ├── DashboardDtos.cs           # GetDashboardInput, DashboardSummaryDto, Kpi, Tables, Trend, TopDish
│       └── IDashboardAppService.cs    # Giao diện dịch vụ Task<DashboardSummaryDto> GetSummaryAsync(...)
├── Acme.TooHungry.Application/
│   └── Dashboard/
│       └── DashboardAppService.cs     # Triển khai truy vấn tổng hợp LINQ tối ưu AsNoTracking
├── Acme.TooHungry.HttpApi/
│   └── Controllers/
│       └── DashboardController.cs     # Controller expose endpoint GET /api/app/dashboard/summary
└── Acme.TooHungry.Domain.Shared/
    └── Localization/TooHungry/
        ├── vi.json                    # Cập nhật từ điển Dashboard Tiếng Việt
        └── en.json                    # Cập nhật từ điển Dashboard Tiếng Anh

# Backend Tests
Acme.TooHungry/test/
└── Acme.TooHungry.Application.Tests/
    └── Dashboard/
        └── DashboardAppService_Tests.cs # Kiểm thử tính toán KPI, tỷ lệ bàn, lọc thời gian

# Frontend Angular
Acme.TooHungry/angular/src/
├── package.json                       # Cài đặt dependency 'chart.js'
├── app/
│   ├── proxy/dashboard/
│   │   ├── models.ts                  # DTO interfaces TypeScript sinh từ Backend contracts
│   │   └── dashboard.service.ts       # Service gọi API GET /api/app/dashboard/summary
│   └── home/
│       ├── home.component.ts          # Chuyển đổi sang gọi 1 API, quản lý Signal state, SignalR listeners
│       ├── home.component.html        # Bento Grid 4 tầng, Chart.js canvas, Table progress bar, Quick actions
│       └── home.component.scss        # Styling Cam & Trắng, Bento Cards, glassmorphism, responsive
└── assets/i18n/
    ├── vi.json                        # Khóa bản dịch Tiếng Việt giao diện Angular
    └── en.json                        # Khóa bản dịch Tiếng Anh giao diện Angular
```

---

## Lộ trình Triển khai Chi tiết (Phased Execution Timeline)

### Giai đoạn 1: Backend DTOs, Application Service & Tests (P1)
1. **Application Contracts**:
   - Tạo thư mục `src/Acme.TooHungry.Application.Contracts/Dashboard/`.
   - Định nghĩa `GetDashboardInput`, `DashboardPeriod` enum (`Today`, `Yesterday`, `Last7Days`, `Custom`).
   - Định nghĩa `DashboardSummaryDto`, `DashboardKpiDto`, `LiveTableSummaryDto`, `RevenueTrendPointDto`, `TopDishDto`, `RecentOrderDto`.
   - Định nghĩa giao diện `IDashboardAppService`.
2. **Application Service Implementation**:
   - Tạo `src/Acme.TooHungry.Application/Dashboard/DashboardAppService.cs`.
   - Triển khai logic tính toán:
     - Ranh giới ngày (`FromDate`, `ToDate`) dựa trên `Period` hoặc `Custom`.
     - `TodayRevenue` & `TotalRevenue`: Query `Order` với `Status == Completed` trong khoảng thời gian.
     - `TodayOrdersCount`: Phân tách `Completed` và `Pending`/`Processing`.
     - Tính tỷ lệ tăng trưởng so với kỳ trước (`RevenueGrowthPercentage`, `OrderGrowthPercentage`).
     - `LiveTableSummary`: Đếm số bàn theo 5 trạng thái từ `IRepository<RestaurantTable>`, tính `OccupancyRate`.
     - `RevenueTrend`: Gom nhóm doanh thu & đơn hàng theo giờ (nếu xem trong ngày) hoặc theo ngày (nếu xem 7 ngày).
     - `TopSellingDishes`: Join `OrderItem` với `Dish` và `DishCategory`, tính tổng số lượng bán và doanh thu, lấy top 5.
     - `RecentOrders`: Lấy 5 đơn gần nhất kèm thông tin bàn.
     - `Alerts`: Tái sử dụng `IInventoryAppService.GetAlertsAsync()`.
3. **HTTP Controller**:
   - Tạo `src/Acme.TooHungry.HttpApi/Controllers/DashboardController.cs` phân quyền `TooHungryPermissions.Dashboard.Default`.
4. **Backend Automated Tests**:
   - Tạo `DashboardAppService_Tests.cs` kiểm tra toàn bộ luồng tính toán số liệu và kiểm tra kết quả trả về.

### Giai đoạn 2: Cập nhật Angular Proxy & Dependency Chart.js (P1)
1. Cài đặt thư viện `chart.js` trong thư mục `angular/`:
   ```bash
   npm install chart.js
   ```
2. Tạo Angular Proxy Service trong `angular/src/app/proxy/dashboard/`:
   - `models.ts`: Khai báo các interface và enum.
   - `dashboard.service.ts`: Gọi `RestService.request` tới `/api/app/dashboard/summary`.

### Giai đoạn 3: Tái thiết kế Giao diện HomeComponent (Bento Grid & Chart.js) (P1)
1. **Tái cấu trúc `home.component.ts`**:
   - Thay thế cơ chế gọi 5 API `forkJoin` cũ bằng 1 lời gọi duy nhất `dashboardService.getSummary(this.currentInput)`.
   - Sử dụng Angular Signals để quản lý trạng thái (`summary = signal<DashboardSummaryDto | null>(null)`).
   - Tích hợp vòng đời khởi tạo và hủy đối tượng `Chart` (Chart.js instance) an toàn.
   - Kết nối SignalR `TableHub` (sự kiện `tableStatusChanged`) và `OrderHub` (sự kiện cập nhật đơn) để kích hoạt cập nhật số liệu thời gian thực.
2. **Tái thiết kế `home.component.html` (Bento Grid 4 tầng)**:
   - *Header Card*: Tiêu đề chào mừng, nút làm mới (spin loading), thanh công cụ chọn khoảng thời gian (`[Hôm nay]`, `[Hôm qua]`, `[7 ngày gần nhất]`).
   - *Tầng 1 (KPI Cards)*: 4 thẻ Bento với icon nổi bật, số liệu phân tách rõ ràng và tỷ lệ tăng trưởng.
   - *Tầng 2 (Biểu đồ & Sơ đồ bàn)*:
     - Cột trái (65%): Khối biểu đồ Chart.js Dual-axis (cột Doanh thu + đường Đơn hàng).
     - Cột phải (35%): Khối sơ đồ bàn ăn thu nhỏ với thanh phân bổ tiến độ đa sắc và pill đếm số bàn theo 5 trạng thái.
   - *Tầng 3 (Top Món & Đơn gần đây)*:
     - Cột trái (50%): Top 5 món bán chạy nhất kèm huy hiệu vàng/bạc/đồng #1, #2, #3.
     - Cột phải (50%): Bảng 5 đơn hàng gần đây với badge trạng thái màu sắc trực quan.
   - *Tầng 4 (Cảnh báo kho & Phím tắt)*:
     - Cột trái: Cảnh báo tồn kho FEFO cận hạn dùng và nguyên liệu thiếu hụt.
     - Cột phải: 5 nút tắt 1 chạm điều hướng nhanh sang các màn hình nghiệp vụ.
   - *Giữ nguyên & Tối ưu Trạm Vào Ca Nội Bộ (Terminal Mode)*: Khi chưa đăng nhập hiển thị đồng hồ số thời gian thực, trạng thái mở cửa 09:00 - 23:00 và nút đăng nhập.
3. **Styling `home.component.scss`**:
   - Sử dụng CSS tokens chuẩn Cam & Trắng (`#EA580C`, `#FFF7ED`, `#F8FAFC`).
   - Hiệu ứng đổ bóng nhiều tầng (`box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05)`).
   - Responsive linh hoạt: Grid 4 cột trên Desktop, 2 cột trên Tablet POS, 1 cột trên Mobile.

### Giai đoạn 4: Quốc tế hóa (i18n) & Kiểm thử Hoàn thiện (P1)
1. Đồng bộ 100% các chuỗi văn bản mới vào 4 tệp localization:
   - `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json`
   - `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json`
   - `angular/src/assets/i18n/vi.json`
   - `angular/src/assets/i18n/en.json`
2. Chạy toàn bộ kiểm thử tự động Backend (`dotnet test`) và kiểm tra Frontend (`ng lint` / `ng build`).
3. Xác minh hoạt động tương thích trên các thiết bị và độ phân giải màn hình khác nhau.
