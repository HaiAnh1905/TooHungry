# Danh sách Công việc Triển khai (Tasks): RM-018 Làm mới trang Dashboard (Dashboard Redesign)

**Tính năng**: `RM-018 — Làm mới trang Dashboard (Dashboard Redesign)`  
**Nhánh (Branch)**: `018-rm-018-dashboard-redesign` | **Ngày**: 2026-10-16  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md) | **Hợp đồng (Contracts)**: [contracts/dashboard-contracts.md](contracts/dashboard-contracts.md)

---

## Phase 1: Nền tảng Hợp đồng Backend & Angular Proxies (Setup & Contracts)

**Mục tiêu**: Định nghĩa toàn bộ DTOs, enum bộ lọc thời gian, giao diện `IDashboardAppService`, cài đặt dependency `chart.js` và tạo Angular Proxies.

- [x] T001 [P] Khởi tạo enum `DashboardPeriod` (`Today`, `Yesterday`, `Last7Days`, `Custom`) và class `GetDashboardInput` (`Period`, `StartDate`, `EndDate`) trong `src/Acme.TooHungry.Application.Contracts/Dashboard/DashboardDtos.cs`
- [x] T002 [P] Khai báo các DTOs tổng hợp trong `src/Acme.TooHungry.Application.Contracts/Dashboard/DashboardDtos.cs`:
  - `DashboardSummaryDto` (`CurrentPeriod`, `FromDate`, `ToDate`, `Kpi`, `Tables`, `RevenueTrend`, `TopSellingDishes`, `RecentOrders`, `Alerts`)
  - `DashboardKpiDto` (`TotalRevenue`, `TotalOrdersCount`, `CompletedOrdersCount`, `PendingOrdersCount`, `TotalDishesCount`, `TotalCategoriesCount`, `RevenueGrowthPercentage`, `OrderGrowthPercentage`)
  - `LiveTableSummaryDto` (`TotalTables`, `OccupiedTables`, `AvailableTables`, `ReservedTables`, `CleaningTables`, `DisabledTables`, `OccupancyRate`)
  - `RevenueTrendPointDto` (`TimeLabel`, `Timestamp`, `Revenue`, `OrderCount`)
  - `TopDishDto` (`DishId`, `DishName`, `CategoryName`, `ImageUrl`, `Price`, `TotalQuantitySold`, `TotalRevenue`)
  - `RecentOrderDto` (`OrderId`, `OrderNumber`, `TableName`, `OrderDate`, `TotalAmount`, `Status`)
- [x] T003 [P] Khai báo giao diện dịch vụ `Task<DashboardSummaryDto> GetSummaryAsync(GetDashboardInput input)` trong `src/Acme.TooHungry.Application.Contracts/Dashboard/IDashboardAppService.cs`
- [x] T004 [P] Cài đặt thư viện `chart.js` trong thư mục `angular/`:
  ```powershell
  cd angular; npm install chart.js --legacy-peer-deps
  ```
- [x] T005 [P] Khởi tạo các Angular Proxy Interfaces và Service trong `angular/src/app/proxy/dashboard/`:
  - `models.ts`: Khai báo `DashboardPeriod`, `GetDashboardInput`, `DashboardSummaryDto`, `DashboardKpiDto`, `LiveTableSummaryDto`, `RevenueTrendPointDto`, `TopDishDto`, `RecentOrderDto`
  - `dashboard.service.ts`: Khai báo `DashboardService` gọi endpoint `/api/app/dashboard/summary` qua `RestService`

**Trạm kiểm tra (Checkpoint)**: Toàn bộ hợp đồng dữ liệu backend và proxy client cho Dashboard đã sẵn sàng, `chart.js` đã được cài đặt vào `package.json`.

---

## Phase 2: Triển khai Backend Application Service & Controller (Priority: P1) 🎯 Core Backend

**Mục tiêu**: Xây dựng nghiệp vụ tính toán tổng hợp tập trung tại Backend với hiệu năng cao, tối ưu bằng LINQ AsyncExecuter, loại bỏ dứt điểm lỗi tính sai doanh thu.  
**Kiểm thử Độc lập**: Gọi API `GET /api/app/dashboard/summary?period=Last7Days` $\rightarrow$ Trả về kết quả đầy đủ KPI, Tables, Trend, Top 5 món, Recent orders và Alerts trong thời gian < 200ms.

- [x] T006 [US1, US2] Triển khai phương thức `GetSummaryAsync` cơ bản trong `src/Acme.TooHungry.Application/Dashboard/DashboardAppService.cs`:
  - Xác định ranh giới thời gian `FromDate` và `ToDate` dựa trên `input.Period` (Today: 00:00 -> 23:59 hôm nay; Yesterday: 00:00 -> 23:59 hôm qua; Last7Days: 7 ngày trước -> nay; Custom: theo `StartDate` & `EndDate`)
  - Truy vấn `Order` với `Status == OrderStatus.Completed` trong kỳ: Tính `TotalRevenue`, `CompletedOrdersCount`
  - Truy vấn `Order` đang phục vụ: Tính `PendingOrdersCount` (`Status == Pending || Status == Processing`)
  - Tổng số đơn: `TotalOrdersCount = CompletedOrdersCount + PendingOrdersCount`
  - Đếm tổng số món ăn và danh mục đang kích hoạt (`TotalDishesCount`, `TotalCategoriesCount`)
  - Tính toán kỳ đối sánh trước đó để tính tỷ lệ tăng trưởng `%` (`RevenueGrowthPercentage`, `OrderGrowthPercentage`)
- [x] T007 [US4] Triển khai tính toán thống kê Bàn ăn (`LiveTableSummaryDto`) trong `DashboardAppService.cs`:
  - Truy vấn `IRepository<RestaurantTable>`: Đếm số lượng bàn theo 5 trạng thái (`Available`, `Occupied`, `Reserved`, `Cleaning`, `Disabled`)
  - Tính tổng số bàn: `TotalTables`
  - Tính tỷ lệ lấp đầy bàn: `OccupancyRate = (OccupiedTables / TotalTables) * 100` (làm tròn 1 chữ số thập phân, trả về 0 nếu `TotalTables == 0`)
- [x] T008 [US2] Triển khai tính toán chuỗi dữ liệu Biểu đồ (`RevenueTrendPointDto`) trong `DashboardAppService.cs`:
  - Nếu khoảng thời gian là 1 ngày (Today / Yesterday): Gom nhóm các đơn hàng hoàn tất theo 14 khung giờ mở cửa (09:00 đến 23:00), map nhãn `HourLabel` ("09:00", "10:00"...)
  - Nếu khoảng thời gian là nhiều ngày (Last7Days / Custom): Gom nhóm đơn hàng hoàn tất theo ngày (`OrderDate.Date`), map nhãn `dd/MM`
  - Trả về danh sách điểm biểu đồ gồm `TimeLabel`, `Timestamp`, `Revenue` và `OrderCount`
- [x] T009 [US3] Triển khai tính toán Top 5 Món Ăn Bán Chạy Nhất (`TopSellingDishes`) trong `DashboardAppService.cs`:
  - Join `OrderItem` với `Order` (`Status == Completed` và `OrderDate` trong kỳ)
  - Group theo `DishId`, tính tổng số lượng bán `TotalQuantitySold` và doanh thu `TotalRevenue`
  - Sắp xếp giảm dần theo số lượng bán (`OrderByDescending(x => x.TotalQuantitySold)`), lấy top 5 (`Take(5)`)
  - Map thông tin món ăn: `DishName`, `CategoryName`, `ImageUrl`, `Price`
- [x] T010 [US5] Triển khai lấy Đơn Hàng Gần Đây (`RecentOrders`) và Cảnh Báo Kho (`Alerts`) trong `DashboardAppService.cs`:
  - Lấy 5 đơn hàng mới nhất phát sinh (`OrderByDescending(x => x.OrderDate).Take(5)`), map kèm tên bàn `TableName`
  - Tích hợp gọi `_inventoryAppService.GetAlertsAsync()` lấy danh sách cảnh báo tồn kho và cận hạn sử dụng
- [x] T011 [US1-US5] Tạo Controller HTTP `DashboardController` trong `src/Acme.TooHungry.HttpApi/Controllers/DashboardController.cs`:
  - Đặt route `[Route("api/app/dashboard")]` và gán phân quyền `[Authorize(TooHungryPermissions.Dashboard.Default)]`
  - Expose action `[HttpGet("summary")] Task<DashboardSummaryDto> GetSummaryAsync([FromQuery] GetDashboardInput input)`
- [x] T012 [P] Xây dựng bộ Unit Tests tự động `DashboardAppService_Tests.cs` trong `test/Acme.TooHungry.Application.Tests/Dashboard/`:
  - Test tính đúng Doanh thu và Đơn hàng theo bộ lọc thời gian
  - Test tính Tỷ lệ lấp đầy bàn ăn (khi có bàn bận và khi danh sách bàn rỗng)
  - Test lấy Top 5 món bán chạy nhất xếp theo số lượng bán
  - Test sinh chuỗi biểu đồ doanh thu theo giờ và ngày

**Trạm kiểm tra (Checkpoint)**: Backend API `DashboardController` hoạt động hoàn hảo, 100% tests PASS (4/4 test cases), dữ liệu tổng hợp chính xác tuyệt đối.

---

## Phase 3: Tái thiết kế Giao diện Bento Grid & Tích hợp Chart.js (Priority: P1) 🎯 Frontend Redesign

**Mục tiêu**: Xây dựng giao diện Bento Grid 4 tầng sang trọng, tích hợp biểu đồ Chart.js Dual-axis, sơ đồ bàn thu nhỏ trực tiếp, danh sách top món và phím tắt vận hành.  
**Kiểm thử Độc lập**: Truy cập `/` hiển thị đầy đủ 4 tầng Bento Grid; đổi bộ lọc thời gian $\rightarrow$ biểu đồ và KPI cập nhật mượt mà; rê chuột vào biểu đồ hiện tooltip kép; bấm các phím tắt điều hướng chính xác.

- [x] T013 [US1, US2, US4] Tái cấu trúc logic trong `angular/src/app/home/home.component.ts`:
  - Loại bỏ hoàn toàn 5 lời gọi `forkJoin` rời rạc cũ
  - Khởi tạo các reactive signals: `summary = signal<DashboardSummaryDto | null>(null)`, `isLoading = signal<boolean>(true)`, `selectedPeriod = signal<DashboardPeriod>(DashboardPeriod.Last7Days)`
  - Xây dựng computed signal `tablePercent` tính toán tỷ lệ % độ rộng cho từng nhóm bàn trên thanh phân bổ
  - Triển khai hàm `loadDashboardData(period?: DashboardPeriod)` gọi `dashboardService.getSummary(...)`
  - Triển khai hàm chuyển đổi bộ lọc thời gian `setPeriod(period: DashboardPeriod)` và bộ chọn ngày tùy chỉnh
- [x] T014 [US2] Tích hợp vẽ Biểu đồ Chart.js Dual-Axis trong `home.component.ts`:
  - Khai báo `@ViewChild('revenueChartCanvas') chartCanvasRef!: ElementRef<HTMLCanvasElement>`
  - Đăng ký các module Chart.js cần thiết (`registerables`)
  - Viết hàm `renderChart(trendPoints: RevenueTrendPointDto[])`:
    + Trục Y1 (trái): Bar Chart Doanh thu VND (Màu cam `#EA580C`, bo góc `borderRadius: 6`)
    + Trục Y2 (phải): Line Chart Đơn hàng (Màu xanh dương `#2563EB`, đường cong `tension: 0.35`)
    + Tooltip hiển thị đầy đủ định dạng tiền tệ và số đơn
  - Hook `ngOnDestroy()` gọi `this.chart?.destroy()` an toàn
- [x] T015 [US1-US7] Tái thiết kế toàn diện template `angular/src/app/home/home.component.html` theo cấu trúc Bento Grid 4 tầng:
  - **Header Card**: Tiêu đề "Bảng điều khiển trung tâm", nút `[Làm mới]` (kèm spinner `isLoading()`), thanh công cụ chuyển đổi thời gian (`[Hôm nay]`, `[Hôm qua]`, `[7 ngày gần nhất]`, `[Tùy chỉnh]`)
  - **Tầng 1 (4 Thẻ KPI Bento)**:
    + Thẻ 1: Tổng Doanh Thu (Icon `fa-coins`, số tiền VND, tỷ lệ tăng trưởng `%` so với kỳ trước)
    + Thẻ 2: Tổng Đơn Hàng (Icon `fa-receipt`, phân tách đơn hoàn tất và đang phục vụ)
    + Thẻ 3: Tỷ Lệ Lấp Đầy Bàn (Icon `fa-chair`, % lấp đầy, số bàn đang phục vụ / tổng số bàn)
    + Thẻ 4: Cảnh Báo Tồn Kho (Icon `fa-triangle-exclamation`, số lượng cảnh báo hoặc badge an toàn)
  - **Tầng 2 (Biểu đồ & Sơ đồ bàn thu nhỏ - 65% : 35%)**:
    + Cột trái: Khối Biểu đồ Chart.js Canvas trực quan
    + Cột phải: Khối Sơ đồ bàn ăn trực tiếp với thanh phân bổ tiến độ đa sắc (`table-occupancy-progress-bar`) và các pill đếm 5 trạng thái bàn, nút `[Xem sơ đồ đầy đủ]`
  - **Tầng 3 (Top Món & Đơn gần đây - 50% : 50%)**:
    + Cột trái: Top 5 món ăn bán chạy nhất kèm huy hiệu xếp hạng #1 (cúp vàng), #2, #3, số lượng bán và doanh thu
    + Cột phải: Bảng 5 đơn hàng mới nhất với badge trạng thái màu sắc (`Pending`, `Processing`, `Completed`, `Cancelled`)
  - **Tầng 4 (Cảnh báo kho & Phím tắt nhanh)**:
    + Cột trái: Widget cảnh báo kho chi tiết (FEFO cận date, hết hàng) kèm link sâu sang `/inventory`
    + Cột phải: 5 nút tắt vận hành 1 chạm (`[Sơ đồ bàn]`, `[Thực đơn]`, `[Kiểm kê kho]`, `[Kế hoạch mua]`, `[Gọi món POS]`)
  - **Trạm Vào Ca Nội Bộ (Terminal Mode)**: Duy trì và trau chuốt giao diện khi người dùng chưa đăng nhập (Đồng hồ số thời gian thực `HH:mm:ss`, ngày làm việc, giờ mở cửa 09:00 - 23:00 và nút đăng nhập lớn)
- [x] T016 [US1] Hoàn thiện styling CSS/SCSS chuẩn nhận diện Cam & Trắng trong `angular/src/app/home/home.component.scss`:
  - Token màu Cam nhận diện `#EA580C`, nền Clean Slate `#F8FAFC`, bề mặt thẻ trắng `#FFFFFF`
  - Bo góc `rounded-2xl`, hiệu ứng đổ bóng đa tầng mềm mại
  - Responsive Grid: 4 cột trên Desktop lớn, 2 cột trên Tablet POS, 1 cột trên Mobile

**Trạm kiểm tra (Checkpoint)**: Giao diện Bento Grid hoàn tất, hiển thị sắc nét, biểu đồ Chart.js vẽ mượt mà, sơ đồ bàn thu nhỏ trực quan.

---

## Phase 4: Đồng bộ Thời gian thực SignalR & Quốc tế hóa Song ngữ (Priority: P1) 🎯 Polish & Realtime

**Mục tiêu**: Tích hợp lắng nghe SignalR thời gian thực, đồng bộ 100% từ điển song ngữ trong `vi.json` và `en.json`, bảo vệ phân quyền và xác thực toàn diện.

- [x] T017 [US7] Tích hợp sự kiện SignalR thời gian thực trong `home.component.ts`:
  - Lắng nghe `TableHub` sự kiện `tableStatusChanged`: Tự động kích hoạt làm mới cập nhật số liệu bàn
  - Lắng nghe sự kiện đơn hàng `tableOrderUpdated`: Gọi debounce `loadDashboardData()` sau 500ms để cập nhật doanh thu và biểu đồ
- [x] T018 [P] Bổ sung và đồng bộ đầy đủ các khóa từ điển đa ngôn ngữ:
  - Cập nhật `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json` & `en.json`
  - Cập nhật `angular/src/assets/i18n/vi.json` & `en.json`
  - Đảm bảo 100% text trên giao diện hiển thị chuẩn xác cả Tiếng Việt và Tiếng Anh
- [x] T019 [P] Kiểm tra biên dịch hệ thống:
  - Chạy `dotnet test` đảm bảo 100% tests Backend PASS (4/4 passed)
  - Chạy `npm run build` đảm bảo 0 lỗi TypeScript và bundle
- [x] T020 [P] Xác thực toàn diện 6 kịch bản kiểm thử theo [quickstart.md](quickstart.md), cập nhật trạng thái `xong` trong [docs/roadmap.md](../../docs/roadmap.md)

**Trạm kiểm tra (Checkpoint)**: Toàn bộ tính năng RM-018 hoàn tất 100%, đáp ứng đầy đủ tiêu chí thành công (SC-001 đến SC-008).
