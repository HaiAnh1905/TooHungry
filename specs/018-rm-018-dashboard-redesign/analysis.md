# Báo cáo Phân tích Kiểm chéo (Cross-Artifact Analysis): RM-018 Làm mới trang Dashboard

**Tính năng**: `RM-018 — Làm mới trang Dashboard (Dashboard Redesign)`  
**Ngày thực hiện**: 2026-10-16  
**Trạng thái**: Đạt Phê duyệt 100% (Passed - Ready for Implementation)  
**Tài liệu đối chiếu**:
- Đặc tả Nghiệp vụ: [spec.md](spec.md)
- Kế hoạch Triển khai: [plan.md](plan.md)
- Danh sách Công việc: [tasks.md](tasks.md)
- Báo cáo Nghiên cứu Kỹ thuật: [research.md](research.md)
- Thiết kế Mô hình Dữ liệu: [data-model.md](data-model.md)
- Hợp đồng Kiến trúc & API: [dashboard-contracts.md](contracts/dashboard-contracts.md)
- Hướng dẫn Kiểm thử: [quickstart.md](quickstart.md)

---

## 1. Mục tiêu Phân tích

Tiến hành kiểm chéo toàn diện tính nhất quán, tính khả thi và độ bao phủ giữa:
1. **Yêu cầu Nghiệp vụ (`spec.md`)** với **Giải pháp Kỹ thuật (`plan.md`, `research.md`)**.
2. **Kế hoạch Triển khai (`plan.md`)** với **Danh sách Công việc Cụ thể (`tasks.md`)**.
3. **Các Quyết định Vận hành Thống nhất (`/speckit.clarify`)** với **Hợp đồng API & Thiết kế Giao diện**.
4. **Hiện trạng Mã nguồn thực tế** với **Các can thiệp kỹ thuật dự kiến thực thi**.

---

## 2. Ma trận Ánh xạ & Độ Phủ (Traceability Matrix)

### 2.1 Ánh xạ User Stories ↔ Yêu cầu Chức năng ↔ Tiêu chí Thành công ↔ Tasks Triển khai

| User Story | Yêu cầu Chức năng (FR) | Tiêu chí Thành công (SC) | Tasks Triển khai (`tasks.md`) | Đánh giá Khớp nối |
|---|---|---|---|---|
| **US1**: Khối Thẻ Chỉ Số KPI Vận Hành Thời Gian Thực (P1) | FR-001, FR-002, FR-003, FR-012, FR-013 | SC-001, SC-002, SC-007, SC-008 | `T001`, `T002`, `T003`, `T005`, `T006`, `T011`, `T012`, `T013`, `T015`, `T016` | **Khớp 100%**: Xây dựng 4 thẻ KPI Bento Card (Doanh thu VND từ đơn `Completed`, Đơn hàng phân tách hoàn tất/đang phục vụ, Tỷ lệ lấp đầy bàn, Cảnh báo kho) kèm tỷ lệ tăng trưởng `%` so với kỳ trước. |
| **US2**: Biểu Đồ Doanh Thu & Nhịp Độ Đơn Hàng Theo Khung Giờ (P1) | FR-001, FR-002, FR-006, NFR-001, NFR-003 | SC-001, SC-004, SC-008 | `T001`, `T002`, `T004`, `T005`, `T006`, `T008`, `T011`, `T012`, `T013`, `T014`, `T015`, `T016` | **Khớp 100%**: Sử dụng thư viện Chart.js Dual-axis (Bar Doanh thu VND màu cam `#EA580C` + Line Đơn hàng màu xanh dương), hỗ trợ xem 14 khung giờ khi xem trong ngày và xem chuỗi ngày khi chọn 7 ngày hoặc tùy chỉnh. |
| **US3**: Danh Sách Top Món Ăn Bán Chạy Nhất (Best Sellers) (P1) | FR-001, FR-002, FR-005, NFR-001 | SC-001, SC-005, SC-008 | `T002`, `T005`, `T009`, `T011`, `T012`, `T013`, `T015`, `T016` | **Khớp 100%**: Backend group `OrderItem` theo `DishId` lấy Top 5 món bán chạy nhất; giao diện hiển thị ảnh món, danh mục, số lượng bán, tổng doanh thu và huy hiệu xếp hạng #1 (cúp vàng), #2, #3 nổi bật. |
| **US4**: Sơ Đồ Bàn Ăn Thu Nhỏ Trực Tiếp (Live Table Status Summary) (P1) | FR-001, FR-002, FR-004, FR-011 | SC-001, SC-003, SC-006, SC-008 | `T002`, `T005`, `T007`, `T011`, `T012`, `T013`, `T015`, `T016`, `T017` | **Khớp 100%**: Truy vấn trạng thái 5 nhóm bàn, tính `OccupancyRate = (Occupied / Total) * 100`, hiển thị thanh tiến độ ngang phân khúc đa sắc (`table-occupancy-progress-bar`), đồng bộ tự động qua SignalR `TableHub`. |
| **US5**: Đơn Hàng Gần Đây & Widget Cảnh Báo Kho Thông Minh (P2) | FR-001, FR-002, FR-007, FR-008 | SC-001, SC-008 | `T002`, `T005`, `T010`, `T011`, `T013`, `T015`, `T016` | **Khớp 100%**: Bảng 5 đơn hàng mới nhất với badge trạng thái màu sắc; widget cảnh báo kho nguyên liệu chạm ngưỡng an toàn / lô cận hạn sử dụng (FEFO) kèm liên kết sâu sang `/inventory`. |
| **US6**: Khối Lối Tắt Vận Hành Nhanh (Quick Actions) (P2) | FR-001, FR-009, NFR-006 | SC-008 | `T015`, `T016` | **Khớp 100%**: 5 nút tắt 1 chạm điều hướng nhanh sang Sơ đồ bàn, Thực đơn món ăn, Kiểm kê kho hàng, Kế hoạch mua dự báo, và Gọi món POS; kích thước vùng chạm cảm ứng $\ge 44 \times 44\text{px}$. |
| **US7**: Trạm Vào Ca Nội Bộ Cho Nhân Viên Chưa Đăng Nhập (Terminal Mode) (P2) | FR-010, FR-012 | SC-007, SC-008 | `T015`, `T016`, `T018` | **Khớp 100%**: Giữ nguyên và trau chuốt giao diện trạm vào ca khi chưa đăng nhập (Đồng hồ số thời gian thực `HH:mm:ss`, ngày làm việc, trạng thái mở/đóng cửa 09:00 - 23:00 và nút đăng nhập lớn). |
| **Quốc tế hóa & Kiểm thử Toàn diện** | FR-012, FR-013, NFR-001..006 | SC-001..008 | `T017`, `T018`, `T019`, `T020` | **Khớp 100%**: Cập nhật 100% từ điển `vi.json` và `en.json`, bảo vệ phân quyền `dashboardGuard`, chạy kiểm thử tự động `dotnet test`, xác thực 6 kịch bản E2E theo quickstart.md. |

**Độ phủ Yêu cầu (Coverage Ratio)**:
- **Yêu cầu Chức năng**: **13/13 FR (100%)**
- **Yêu cầu Phi chức năng**: **6/6 NFR (100%)**
- **Tiêu chí Thành công**: **8/8 SC (100%)**
- **Nhiệm vụ Triển khai**: **20/20 Tasks (100%)**  
$\rightarrow$ **Kết quả**: Không có bất kỳ khoảng trống yêu cầu nào (Zero Gaps) và không có tác vụ triển khai mồ côi (Zero Orphaned Tasks).

---

## 3. Kiểm tra Tính Nhất quán với 4 Quyết định Kiến trúc & Vận hành (`/speckit.clarify`)

1. **Quyết định 1: Thư viện Biểu đồ Frontend (`Chart.js Dual-axis`)**:
   - `spec.md`: Làm rõ A1, FR-006, US2 kịch bản chấp nhận.
   - `research.md`: Mục 1 Tích hợp Chart.js thuần trong Angular Standalone Component, cấu hình Dual-axis (`yRevenue` và `yOrders`).
   - `plan.md`: Giai đoạn 2 cài đặt `chart.js`, Giai đoạn 3 tích hợp `renderChart`.
   - `tasks.md`: `T004` (Cài đặt npm package), `T014` (Logic vẽ biểu đồ Chart.js và cleanup trong `ngOnDestroy`), `T015` (Canvas HTML).
   - *Đánh giá*: **Khớp 100%**. Bar Chart Doanh thu (Cam `#EA580C`) kết hợp Line Chart Đơn hàng (Xanh dương `#2563EB`), tooltip đầy đủ thông số.

2. **Quyết định 2: Khoảng thời gian Mặc định ('7 ngày gần đây' & Date Range Picker)**:
   - `spec.md`: Làm rõ A2, FR-002, FR-003, DTOs `GetDashboardInput`, `DashboardPeriod`.
   - `research.md`: Mục 2 Xác định ranh giới ngày và tính toán tỷ lệ tăng trưởng so với kỳ trước.
   - `data-model.md`: Enum `DashboardPeriod` (`Today`, `Yesterday`, `Last7Days`, `Custom`) và class `GetDashboardInput`.
   - `contracts`: Query parameters `period`, `startDate`, `endDate` cho endpoint `/api/app/dashboard/summary`.
   - `tasks.md`: `T001` (Input DTO), `T006` (Xử lý ranh giới ngày Backend), `T013` (Logic chuyển đổi period Frontend), `T015` (Thanh công cụ lọc thời gian).
   - *Đánh giá*: **Khớp 100%**. Mặc định 7 ngày, hỗ trợ chuyển nhanh Hôm nay, Hôm qua, và Tùy chỉnh ngày.

3. **Quyết định 3: Cơ chế Cập nhật Realtime (SignalR kết hợp Nút Refresh thủ công)**:
   - `spec.md`: Làm rõ A3, FR-011, US4, US7.
   - `research.md`: Mục 3 Mô hình kết hợp SignalR + Debounce Refresh 500ms.
   - `contracts`: Sự kiện `tableStatusChanged` từ `TableHub` và `orderCompleted` từ `OrderHub`.
   - `tasks.md`: `T013` (Nút làm mới thủ công), `T017` (Lắng nghe SignalR và debounce reload).
   - *Đánh giá*: **Khớp 100%**. Vừa cập nhật tức thì qua websocket khi có bàn/đơn thay đổi, vừa cung cấp nút làm mới chủ động.

4. **Quyết định 4: Phân quyền & Vai trò truy cập (`dashboardGuard`)**:
   - `spec.md`: Làm rõ A4, FR-013, NFR-004.
   - `plan.md`: Mục Tóm tắt (4) và Kiểm tra Hiến pháp (V).
   - `tasks.md`: `T011` (`[Authorize(TooHungryPermissions.Dashboard.Default)]`), `T015` (Trạm vào ca nội bộ khi chưa đăng nhập).
   - `quickstart.md`: Kịch bản 1 (Chưa đăng nhập) và Kịch bản 6 (Kiểm tra chuyển hướng vai trò Waiter/InventoryStaff/Cashier).
   - *Đánh giá*: **Khớp 100%**. Giữ nguyên logic an toàn của `dashboardGuard`, chỉ Manager/Admin vào được Dashboard.

---

## 4. Khảo sát Hiện trạng Mã nguồn & Đánh giá Tác động (Codebase Gap Analysis)

### 4.1 Tầng Backend (`Acme.TooHungry`)
1. **`Application.Contracts`**:
   - *Hiện trạng*: Đã có quyền `TooHungryPermissions.Dashboard.Default`, nhưng chưa có thư mục `Dashboard/` và chưa có DTOs `DashboardSummaryDto`, `GetDashboardInput`.
   - *Giải pháp*: Tạo mới thư mục `src/Acme.TooHungry.Application.Contracts/Dashboard/` chứa `DashboardDtos.cs` và `IDashboardAppService.cs`. Không ảnh hưởng đến các contracts hiện có.
2. **`Application`**:
   - *Hiện trạng*: Chưa có `DashboardAppService`.
   - *Giải pháp*: Tạo mới `src/Acme.TooHungry.Application/Dashboard/DashboardAppService.cs`. Inject các repositories: `IRepository<Order, Guid>`, `IRepository<OrderItem, Guid>`, `IRepository<RestaurantTable, Guid>`, `IRepository<Dish, Guid>`, `IRepository<DishCategory, Guid>` và `IInventoryAppService`. Sử dụng EF Core `AsNoTracking()` hoàn toàn.
3. **`HttpApi`**:
   - *Hiện trạng*: Chưa có `DashboardController`.
   - *Giải pháp*: Tạo mới `src/Acme.TooHungry.HttpApi/Controllers/DashboardController.cs` kế thừa `TooHungryController`, gán policy phân quyền `TooHungryPermissions.Dashboard.Default`.

### 4.2 Tầng Frontend (`Acme.TooHungry/angular`)
1. **Dependencies (`package.json`)**:
   - *Hiện trạng*: Chưa có thư viện `chart.js`.
   - *Giải pháp*: Chạy lệnh `npm install chart.js` tại thư mục `angular/`. Thư viện thuần gọn nhẹ, không gây xung đột version với Angular 19/22.
2. **Proxy Services (`proxy/dashboard/`)**:
   - *Hiện trạng*: Chưa có proxy dashboard.
   - *Giải pháp*: Tạo `angular/src/app/proxy/dashboard/models.ts` và `dashboard.service.ts` gọi endpoint `/api/app/dashboard/summary`.
3. **Component Dashboard (`home/`)**:
   - *Hiện trạng*:
     - `home.component.ts`: Đang gọi 5 API rời rạc qua `forkJoin`, tính `totalRevenue` sai lệch do chỉ cộng 5 đơn trả về của phân trang.
     - `home.component.html`: 4 thẻ đơn điệu, bảng món mới chiếm 8 cột, chưa có biểu đồ, chưa có sơ đồ bàn, chưa có Bento Grid.
     - `home.component.scss`: CSS cũ đơn giản, chưa chuẩn Bento Grid nhận diện Cam & Trắng.
   - *Giải pháp*:
     - Tái cấu trúc `home.component.ts`: Gọi 1 API `dashboardService.getSummary()`, dùng Angular Signals, tích hợp Chart.js dual-axis và lắng nghe SignalR.
     - Tái thiết kế `home.component.html`: Bento Grid 4 tầng sang trọng, giữ nguyên Trạm Vào Ca Nội Bộ khi chưa đăng nhập.
     - Viết lại `home.component.scss`: Chuẩn hóa màu Cam `#EA580C`, bo góc `rounded-2xl`, responsive mượt mà.
4. **Đa ngôn ngữ (`assets/i18n/vi.json` & `en.json`)**:
   - *Hiện trạng*: Đã có một số khóa chung, thiếu các khóa chi tiết về KPI, nhãn biểu đồ, thời gian, phím tắt.
   - *Giải pháp*: Bổ sung 100% các khóa theo [data-model.md](data-model.md).

---

## 5. Đánh giá Rủi ro Kỹ thuật & Biện pháp Kiểm soát (Risks & Mitigations)

| Rủi ro Kỹ thuật | Mức độ | Khả năng | Biện pháp Kiểm soát & Xử lý |
|---|---|---|---|
| **Truy vấn tổng hợp chậm khi dữ liệu đơn hàng lớn** (hàng chục nghìn đơn hàng). | Cao | Thấp | Sử dụng `AsNoTracking()` 100%, áp dụng lọc theo `OrderDate` và `Status == Completed` trước khi gom nhóm, sử dụng index có sẵn trên `OrderDate` và `Status`. |
| **Rò rỉ bộ nhớ (Memory Leak) do Chart.js** khi chuyển trang liên tục. | Trung bình | Thấp | Lưu trữ instance `this.chart` và bắt buộc gọi `this.chart.destroy()` trong hook `ngOnDestroy()` của Angular component. |
| **Lỗi chia cho 0 (`DivideByZeroException` hoặc `NaN%`)** khi cơ sở dữ liệu mới khởi tạo chưa có bàn hoặc đơn hàng nào. | Trung bình | Thấp | Đặt điều kiện kiểm tra an toàn: nếu `TotalTables == 0` thì `OccupancyRate = 0`; nếu `PreviousRevenue == 0` thì trả về `0%` hoặc `100%` an toàn. |
| **Vỡ bố cục Bento Grid trên màn hình máy POS/Tablet cảm ứng**. | Trung bình | Thấp | Thiết lập CSS Grid co giãn thông minh: 4 cột trên Desktop $\ge 1200\text{px}$, 2 cột trên Tablet $768\text{px} - 1199\text{px}$, 1 cột trên Mobile. Touch target $\ge 44 \times 44\text{px}$. |
| **Lặp vòng lặp vô hạn nạp dữ liệu từ SignalR** khi có nhiều sự kiện phát liên tiếp. | Trung bình | Thấp | Áp dụng cơ chế Debounce 500ms bằng RxJS (`Subject` + `debounceTime(500)`) trước khi gọi API `getSummary()`. |

---

## 6. Kết luận & Độ Sẵn sàng Triển khai (Readiness Assessment)

Hồ sơ kỹ thuật của **RM-018 (Làm mới trang Dashboard)** đã vượt qua toàn diện mọi tiêu chuẩn kiểm định của Spec-Kit:
- **Tính Nhất quán (Consistency)**: **100%** khớp nối hoàn hảo giữa `spec.md`, `plan.md`, `research.md`, `contracts`, `data-model.md`, và `tasks.md`.
- **Tính Khả thi (Feasibility)**: Kế hoạch phân rã 20 nhiệm vụ rành mạch, giải pháp kỹ thuật tinh gọn, không gây breaking changes cho các module đang chạy.
- **Độ sẵn sàng (Readiness)**: **PASS 100%**. Toàn bộ hệ thống sẵn sàng tuyệt đối để bước sang giai đoạn thực thi mã nguồn (`/speckit.implement RM-018`).
