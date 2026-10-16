# Đặc tả Tính năng (Feature Specification): Làm mới trang Dashboard (Dashboard Redesign)

**Mã Tính năng (Feature ID)**: `RM-018`

**Nhánh Tính năng (Feature Branch)**: `018-rm-018-dashboard-redesign`

**Ngày lập**: 2026-10-16

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu nghiệp vụ từ Roadmap RM-018: *"Tái thiết kế toàn diện giao diện và nâng cấp trải nghiệm Dashboard trung tâm (`/`), tối ưu cho quản lý nhà hàng và nhân viên vận hành."*
- Tích hợp và kế thừa dữ liệu từ các phân hệ:
  - RM-002 (Shared UI & Design System Cam & Trắng `#EA580C`)
  - RM-006 (Quản lý Món ăn & Danh mục thực đơn)
  - RM-008 / RM-017 (Sơ đồ mặt bằng & Trạng thái bàn ăn thời gian thực)
  - RM-010 / RM-016 (Đơn hàng POS & Doanh thu thanh toán)
  - RM-011 / RM-013 (Tồn kho nguyên liệu & Cảnh báo hạn dùng / thiếu hụt lô hàng)
  - RM-014 (Dự báo nhu cầu & Kế hoạch nguyên liệu)
  - RM-015 (Điều hướng & Phân quyền truy cập `dashboardGuard`)
- Cơ chế thời gian thực: Tích hợp thông báo SignalR Hub (`TableHub` và `OrderHub`) để cập nhật số liệu trực tiếp.

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 16-10-2026 (Phiên làm rõ Yêu cầu `/speckit.clarify` - 4 Quyết định Trọng yếu)
- **Q1: Giải pháp Thư viện Biểu đồ Frontend (Chart Library)**: Giải pháp nào được chọn để vẽ Biểu đồ Doanh thu & Đơn hàng theo Giờ?
  - **A1**: **Sử dụng Chart.js (kết hợp biểu đồ cột Doanh thu và đường biểu diễn Đơn hàng, hiệu ứng hover tooltip trực quan)**:
    - Tích hợp `chart.js` gọn gàng, hỗ trợ dual-axis (trục trái biểu diễn Doanh thu tiền tệ VND dạng Bar cột, trục phải biểu diễn Số lượng đơn hàng dạng Line đường uốn cong).
    - Hỗ trợ tooltip responsive chi tiết khi hover vào từng mốc giờ, animation mượt mà và tự động co giãn theo layout Bento Grid.
- **Q2: Khoảng thời gian thống kê mặc định (Time Horizon & Scope)**: Khoảng thời gian thống kê mặc định trên Dashboard nên thiết lập như thế nào?
  - **A2**: **Mặc định xem '7 ngày gần đây' và hỗ trợ chọn khoảng ngày tùy chỉnh (Date Range Picker)**:
    - Khi truy cập Dashboard, hệ thống mặc định nạp số liệu thống kê của 7 ngày gần nhất (Last 7 Days) để quản lý có cái nhìn tổng quan về xu hướng doanh số và vận hành.
    - Cung cấp thanh công cụ lọc thời gian nhanh linh hoạt: `[Hôm nay]`, `[Hôm qua]`, `[7 ngày gần nhất]`, và hộp thoại chọn khoảng ngày tùy chỉnh `[Date Range Picker]` (từ ngày - đến ngày).
    - API Backend `GetSummaryAsync(GetDashboardInput input)` tiếp nhận `StartDate`, `EndDate` hoặc `Period` linh hoạt để tổng hợp số liệu chính xác theo khoảng thời gian được chọn.
- **Q3: Cơ chế cập nhật dữ liệu Thời gian thực (Realtime Update Strategy)**: Cơ chế tự động cập nhật số liệu thời gian thực trên Dashboard nên áp dụng chiến lược nào?
  - **A3**: **Kết hợp SignalR Realtime (lắng nghe TableHub & sự kiện thanh toán hoàn tất) + Nút [Làm mới] thủ công**:
    - Lắng nghe sự kiện `tableStatusChanged` từ `TableHub` để cập nhật tức thì widget Sơ đồ Bàn ăn và Tỷ lệ lấp đầy bàn ăn.
    - Lắng nghe sự kiện thanh toán thành công đơn hàng từ `OrderHub` (hoặc `TableHub`) để tự động cộng dồn doanh thu, số đơn hàng và biểu đồ mà không cần tải lại trang.
    - Duy trì nút bấm `[Làm mới]` (kèm hiệu ứng spinner xoay) trên thanh điều khiển để người dùng có thể chủ động nạp lại dữ liệu bất cứ lúc nào.
- **Q4: Chính sách Phân quyền và Vai trò truy cập (Role & Access Guard)**: Chính sách phân quyền truy cập Dashboard trung tâm (`/`) áp dụng cho những vai trò nào?
  - **A4**: **Chỉ Quản lý (Manager, Administrator, admin) được xem đầy đủ Dashboard**:
    - Bảo vệ nghiêm ngặt bằng policy `TooHungryPermissions.Dashboard.Default` và `dashboardGuard`.
    - Các vai trò tác nghiệp khác được tự động điều hướng vào đúng không gian làm việc chuyên môn:
      + `Waiter` (Nhân viên phục vụ bàn) -> Chuyển hướng sang `/waiter/tables`.
      + `InventoryStaff` (Thủ kho) -> Chuyển hướng sang `/inventory`.
      + `Cashier` (Thu ngân) -> Chuyển hướng sang `/table/layout` hoặc `/tables`.
    - Người dùng chưa đăng nhập: Hiển thị giao diện "Trạm Vào Ca Nội Bộ" với đồng hồ số thời gian thực và giờ mở cửa (09:00 - 23:00).

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Trang **Bảng điều khiển trung tâm (Dashboard - URL gốc `/`)** là "trái tim thông tin" của hệ thống quản lý nhà hàng Acme.TooHungry. Đây là màn hình đầu tiên mà Chủ nhà hàng (Owner) và Quản lý ca (Store Manager) nhìn thấy mỗi khi bắt đầu ngày làm việc hoặc giám sát tình hình kinh doanh trong giờ mở cửa (09:00 - 23:00).

### Vấn đề tồn đọng của Dashboard hiện tại:
1. **Dữ liệu phân tán & tính toán thiếu chính xác**:
   - `HomeComponent` hiện tại gọi rời rạc 5 API khác nhau (`forkJoin` tới Dishes, Categories, Orders, Units, Alerts) gây lãng phí băng thông và tải chậm.
   - Thống kê doanh thu đang được tính bằng cách cộng thủ công 5 đơn hàng trả về từ phân trang (`maxResultCount: 5`), dẫn đến số liệu doanh thu sai lệch hoàn toàn so với thực tế kinh doanh trong ngày.
   - Các thẻ chỉ số hiển thị "Đơn vị tính" (Units) — một thông số Master Data tĩnh, không mang giá trị cho việc điều hành kinh doanh trực tiếp của nhà hàng.
2. **Thiếu vắng các chỉ số vận hành cốt lõi**:
   - Chưa có chỉ số Doanh thu hôm nay (Today's Revenue), Tổng đơn hôm nay (Today's Orders), Số lượng đơn hoàn tất so với đơn đang phục vụ.
   - Chưa có thông tin Tỷ lệ lấp đầy bàn ăn (Table Occupancy Rate), không nắm được nhà hàng đang kín bàn hay còn nhiều chỗ trống.
   - Chưa có danh sách Top món ăn bán chạy nhất (Best Sellers) và Biểu đồ doanh thu theo khung giờ trong ngày (Hourly Revenue Trend).
3. **Thẩm mỹ giao diện & trải nghiệm chưa tương xứng**:
   - Bố cục còn thô sơ, chưa ứng dụng phong cách Bento Grid hiện đại theo nhận diện thương hiệu Cam & Trắng (`#EA580C`).
   - Chưa có cơ chế tự động cập nhật số liệu theo thời gian thực (Realtime Update) khi phát sinh đơn hàng mới hoặc bàn đổi trạng thái, buộc người dùng phải bấm nút [Làm mới] thủ công.

### Mục tiêu của RM-018:
RM-018 tái thiết kế toàn diện Dashboard thành một **Trung tâm Chỉ huy Trực quan (Operational Command Center)** với giao diện Bento Grid sang trọng, chỉ số thống kê chuẩn xác được tính toán tập trung từ Backend, biểu đồ trực quan, sơ đồ bàn thu nhỏ trực tiếp, và cập nhật tự động thời gian thực.

### Sơ đồ Vị trí Trung tâm Chỉ huy của Dashboard trong Toàn hệ thống:
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ACME.TOOHUNGRY — TRUNG TÂM CHỈ HUY DASHBOARD                    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
         [CHƯA ĐĂNG NHẬP / TERMINAL]                    [ĐÃ ĐĂNG NHẬP / QUẢN TRỊ]
      ┌─────────────────────────────┐               ┌─────────────────────────────┐
      │  Trạm Vào Ca Nội Bộ Nhà Hàng│               │  Bento Grid Dashboard (/)   │
      │  - Đồng hồ số thời gian thực│               │  - Quản lý / Chủ nhà hàng   │
      │  - Giờ mở cửa (09:00-23:00) │               └──────────────┬──────────────┘
      │  - Nút [Đăng nhập vào ca]   │                              │
      └─────────────────────────────┘                              │
                                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CẤU TRÚC BENTO GRID 4 TẦNG                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 1: KHỐI KPI CHỈ SỐ VẬN HÀNH THỜI GIAN THỰC (4 THẺ STAT CARDS)                     │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│ │ Doanh thu Hôm nay│ │ Đơn hàng Hôm nay │ │ Tỷ lệ Lấp đầy Bàn│ │ Cảnh báo Tồn kho │   │
│ │ (VND + tăng/giảm)│ │ (Hoàn tất/Phục vụ│ │ (% Bàn Occupied) │ │ (Hết hàng/Quá hạn│   │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 2: BIỂU ĐỒ TRỰC QUAN & THỐNG KÊ SƠ ĐỒ BÀN ĂN (2 CỘT 65% : 35%)                    │
│ ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────┐  │
│ │ Biểu đồ Doanh thu & Đơn hàng theo Giờ (Chart)│ │ Sơ đồ Bàn Thu nhỏ Trực tiếp (Live│  │
│ │ - Trục hoành: Khung giờ 09:00 -> 23:00       │ │   Table Occupancy Distribution)  │  │
│ │ - Doanh thu theo từng giờ & Đơn hoàn thành   │ │ - Trống / Có khách / Đặt / Dọn   │  │
│ └──────────────────────────────────────────────┘ └──────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 3: TOP MÓN BÁN CHẠY & ĐƠN HÀNG GẦN ĐÂY (2 CỘT 50% : 50%)                          │
│ ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────┐  │
│ │ Top 5 Món Ăn Bán Chạy Nhất (Best Sellers)    │ │ Đơn Hàng Gần Đây (Recent Orders) │  │
│ │ - Ảnh món, Tên món, Số lượng bán, Doanh thu  │ │ - Mã đơn, Bàn, Giờ, Tổng tiền,   │  │
│ │ - Huy hiệu xếp hạng #1, #2, #3 nổi bật       │ │   Trạng thái đơn (Badge màu)     │  │
│ └──────────────────────────────────────────────┘ └──────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 4: WIDGET CẢNH BÁO KHO NGUYÊN LIỆU & PHÍM TẮT NHANH (QUICK ACTIONS)               │
│ ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────┐  │
│ │ Cảnh báo Kho Hàng & Lô Sắp Quá Hạn           │ │ Lối Tắt Thao Tác Nhanh           │  │
│ │ - Nguyên liệu thiếu hụt / Chạm mức tồn an toàn│ │ - [Thực đơn] [Sơ đồ bàn]        │  │
│ │ - Lô hàng cận date (FEFO cảnh báo sớm)       │ │ - [Kiểm kê kho] [Dự báo mua hàng]│  │
│ └──────────────────────────────────────────────┘ └──────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Khối Thẻ Chỉ Số KPI Vận Hành Hôm Nay (Priority: P1)

Là một Chủ nhà hàng hoặc Quản lý ca trực, khi tôi truy cập Dashboard vào bất kỳ thời điểm nào trong ngày, tôi muốn nhìn thấy ngay 4 chỉ số kinh doanh cốt lõi của **ngày hôm nay** (Doanh thu hôm nay, Số lượng đơn hàng hôm nay, Tỷ lệ lấp đầy bàn ăn hiện tại, và Số lượng cảnh báo tồn kho), để tôi nắm bắt tức thì nhịp độ kinh doanh của nhà hàng mà không cần phải mở từng báo cáo riêng lẻ.

**Lý do cho mức độ ưu tiên này**: Quản lý cần nắm được số liệu kinh doanh ngay trong 3 giây đầu tiên mở màn hình để đưa ra các quyết định vận hành kịp thời (bổ sung nhân sự, thúc đẩy bán hàng, chuẩn bị nguyên liệu).

**Kiểm thử Độc lập**:
- Đăng nhập tài khoản Quản lý (`admin` hoặc `Manager`). Mở `/`.
- Kiểm tra 4 thẻ KPI hiển thị đầy đủ:
  1. **Doanh thu hôm nay (Today's Revenue)**: Tổng tiền của tất cả các đơn hàng có trạng thái `Completed` trong ngày hiện tại. Hiển thị dạng tiền tệ VND định dạng đẹp mắt (ví dụ: `15.450.000 VND`).
  2. **Đơn hàng hôm nay (Today's Orders)**: Tổng số đơn phát sinh trong ngày, kèm pill phân tách số đơn `Đã hoàn tất` và `Đang phục vụ`.
  3. **Tỷ lệ lấp đầy bàn (Table Occupancy)**: Tỷ lệ phần trăm giữa số bàn `Occupied` trên tổng số bàn hoạt động (ví dụ: `75% - 15/20 bàn`).
  4. **Cảnh báo tồn kho (Inventory Alerts)**: Số lượng nguyên liệu hết hàng hoặc lô hàng cận hạn sử dụng.
- Khi có đơn hàng mới thanh toán thành công tại RM-016: Thẻ Doanh thu hôm nay tự động tăng thêm số tiền tương ứng mà không cần F5.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** Quản lý truy cập Dashboard, **Khi (When)** dữ liệu tổng hợp nạp thành công, **Thì (Then)** hệ thống hiển thị 4 thẻ KPI chuẩn Bento Card với màu sắc nhận diện sắc nét:
   - Thẻ Doanh thu: Icon `fa-coins` màu cam ấm, giá trị VND định dạng dấu chấm phân cách hàng nghìn, có nhãn "Doanh thu hôm nay".
   - Thẻ Đơn hàng: Icon `fa-receipt` màu xanh dương, hiển thị tổng số đơn kèm nhãn phân biệt số đơn hoàn tất (`Completed`) và đơn đang phục vụ (`Pending`/`Processing`).
   - Thẻ Bàn ăn: Icon `fa-chair` màu tím hồng, hiển thị tỷ lệ lấp đầy bàn tính theo công thức `(Số bàn Occupied / Tổng số bàn hoạt động) * 100%`.
   - Thẻ Cảnh báo kho: Icon `fa-triangle-exclamation` màu đỏ/cam, hiển thị số nguyên liệu thiếu hụt hoặc lô hàng quá hạn.
2. **Cho trước (Given)** nhà hàng chưa có đơn hàng nào trong ngày (mới mở cửa lúc 09:00), **Khi (When)** mở Dashboard, **Thì (Then)** Doanh thu hiển thị `0 VND`, Đơn hàng hiển thị `0`, Tỷ lệ bàn phản ánh đúng số bàn đang ngồi thực tế, không bị lỗi `NaN` hay `null`.
3. **Cho trước (Given)** Quản lý bấm vào bất kỳ thẻ KPI nào, **Khi (When)** click vào thẻ, **Thì (Then)** hệ thống điều hướng thông minh sang trang quản trị chi tiết tương ứng (Thẻ Doanh thu/Đơn hàng -> `/orders`, Thẻ Bàn -> `/tables`, Thẻ Cảnh báo kho -> `/inventory`).

---

### User Story 2 - Biểu Đồ Doanh Thu & Nhịp Độ Đơn Hàng Theo Khung Giờ (Priority: P1)

Là một Quản lý ca trực, tôi muốn quan sát biểu đồ doanh thu và lượng đơn hàng biến thiên theo từng khung giờ trong ngày (từ 09:00 đến 23:00), để tôi biết khung giờ nào là giờ cao điểm (Peak Hours) của nhà hàng, từ đó điều phối nhân viên phục vụ và bếp một cách hiệu quả nhất.

**Lý do cho mức độ ưu tiên này**: Trực quan hóa dữ liệu theo thời gian giúp quản lý phát hiện mẫu hành vi tiêu dùng của khách (giờ ăn trưa 11:30 - 13:00, giờ ăn tối 18:30 - 20:30) để chuẩn bị năng lực phục vụ.

**Kiểm thử Độc lập**:
- Xem biểu đồ trên Dashboard. Trục ngang biểu diễn các khung giờ từ `09:00` đến `23:00`.
- Cột/đường biểu đồ thể hiện doanh thu thu được theo từng mốc giờ.
- Rê chuột (hover) vào cột 12:00: Tooltip hiển thị chi tiết doanh thu và số lượng đơn hàng hoàn thành trong khung giờ `12:00 - 12:59`.
- Hiển thị mượt mà trên cả máy tính và màn hình tablet POS.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** dữ liệu bán hàng trong ngày, **Khi (When)** khối biểu đồ hiển thị, **Thì (Then)** biểu đồ trực quan hóa doanh thu theo 14 khung giờ hoạt động (09:00 đến 23:00) với phong cách thiết kế hiện đại, đường cong mềm mại màu cam chủ đạo `#EA580C`.
2. **Cho trước (Given)** một khung giờ chưa có đơn hàng nào, **Khi (When)** hiển thị biểu đồ, **Thì (Then)** điểm mốc giờ đó có giá trị 0 và đường biểu đồ nối liền mạch không bị đứt gãy.
3. **Cho trước (Given)** người dùng chuyển đổi bộ lọc thời gian (Hôm nay / 7 ngày gần nhất), **Khi (When)** chọn tab, **Thì (Then)** biểu đồ cập nhật dữ liệu tương ứng trong dưới 300 mili-giây với hiệu ứng chuyển động mượt mà.

---

### User Story 3 - Danh Sách Top Món Ăn Bán Chạy Nhất (Best Sellers) (Priority: P1)

Là một Bếp trưởng hoặc Quản lý thực đơn, tôi muốn xem danh sách Top 5 món ăn bán chạy nhất trong ngày (kèm số lượng đã bán và doanh thu đóng góp), để tôi chủ động chuẩn bị nguyên liệu sơ chế cho các món "hot" và đánh giá hiệu quả của thực đơn.

**Lý do cho mức độ ưu tiên này**: Thực đơn là cốt lõi của nhà hàng; theo dõi món bán chạy giúp tránh tình trạng hết món đột xuất giữa giờ cao điểm và giảm thiểu lãng phí nguyên liệu không cần thiết.

**Kiểm thử Độc lập**:
- Xem khối "Top Món Bán Chạy" trên Dashboard.
- Danh sách hiển thị top 5 món có số lượng order cao nhất trong ngày, xếp hạng theo thứ tự từ #1 đến #5.
- Mỗi món hiển thị: Huy hiệu thứ hạng (#1 vàng vương miện, #2 bạc, #3 đồng), Ảnh món bo góc, Tên món, Danh mục món, Số lượng phần đã bán, và Tổng doanh thu mang lại.
- Bấm vào tên món hoặc nút `[Xem thực đơn]` điều hướng trực tiếp sang trang Quản lý Món ăn `/dishes`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** các đơn hàng đã thanh toán trong ngày, **Khi (When)** khối Top Món hiển thị, **Thì (Then)** danh sách tổng hợp số lượng từng món ăn từ các `OrderItem` thành công, sắp xếp giảm dần theo số lượng bán.
2. **Cho trước (Given)** 3 vị trí đầu bảng (#1, #2, #3), **Khi (When)** hiển thị huy hiệu, **Thì (Then)** áp dụng badge xếp hạng nổi bật:
   - Hạng 1: Badge vàng kim loại kèm icon cúp `fa-trophy` hoặc `fa-crown`.
   - Hạng 2: Badge bạc ánh kim.
   - Hạng 3: Badge đồng ánh ấm.
3. **Cho trước (Given)** ngày mới chưa có món nào được đặt, **Khi (When)** hiển thị danh sách, **Thì (Then)** hiển thị trạng thái trống (Empty State) tinh tế: icon đĩa ăn mờ, thông điệp "Chưa có dữ liệu món bán trong ngày hôm nay" kèm nút điều hướng đến trang gọi món hoặc thực đơn.

---

### User Story 4 - Sơ Đồ Bàn Ăn Thu Nhỏ Trực Tiếp (Live Table Status Summary) (Priority: P1)

Là một Quản lý ca hoặc Điều phối viên sảnh, tôi muốn quan sát một widget trực quan tóm tắt toàn bộ tình trạng bàn ăn của nhà hàng theo thời gian thực (Bao nhiêu bàn Trống, Đang có khách, Đã đặt trước, Đang dọn dẹp, Tạm ngưng) kèm thanh tiến độ phân bổ trực quan, để tôi biết ngay năng lực đón khách hiện tại của nhà hàng.

**Lý do cho mức độ ưu tiên này**: Điều phối bàn là trọng tâm vận hành tại sảnh; nắm được tình trạng bàn giúp quản lý quyết định ngay có nhận thêm đoàn khách vãng lai hay phải hẹn giờ chờ.

**Kiểm thử Độc lập**:
- Quan sát widget Sơ đồ Bàn ăn Thu nhỏ trên Dashboard.
- Hiển thị thanh phân bổ trực quan (Stacked Progress Bar) thể hiện tỷ lệ giữa 5 trạng thái bàn:
  - Xanh lá: Bàn trống (`Available`)
  - Đỏ ấm: Đang có khách (`Occupied`)
  - Vàng hổ phách: Đã đặt trước (`Reserved`)
  - Xanh lơ: Đang dọn dẹp (`Cleaning`)
  - Xám: Tạm ngưng (`Disabled`)
- Khi một bàn trên sảnh được Waiter đón khách hoặc dọn dẹp xong: Widget trên Dashboard tự động cập nhật số lượng và thanh tỷ lệ tức thì qua SignalR mà không cần tải lại trang.
- Nút `[Xem sơ đồ đầy đủ]` điều hướng trực tiếp sang `/tables` (RM-017).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** danh sách bàn ăn hiện tại của nhà hàng, **Khi (When)** widget hiển thị, **Thì (Then)** tổng hợp số lượng bàn theo từng trạng thái và biểu diễn bằng:
   - Các pill đếm số lượng có màu sắc chuẩn nhận diện đồng bộ với RM-008 và RM-017.
   - Thanh tiến độ ngang phân khúc đa màu (Multi-segment progress bar) phản ánh trực quan thị phần phần trăm của từng trạng thái.
2. **Cho trước (Given)** người dùng bấm nút `[Xem sơ đồ mặt bằng]` hoặc click vào từng nhóm trạng thái, **Khi (When)** thao tác diễn ra, **Thì (Then)** chuyển hướng sang trang `/tables` kèm bộ lọc trạng thái tương ứng.

---

### User Story 5 - Đơn Hàng Gần Đây & Widget Cảnh Báo Kho Thông Minh (Priority: P2)

Là một Quản lý ca, tôi muốn xem nhanh 5 đơn hàng mới nhất phát sinh tại nhà hàng (Mã đơn, Bàn phục vụ, Thời gian gọi, Tổng tiền, Trạng thái đơn) và danh mục các cảnh báo kho nguyên liệu khẩn cấp, để tôi theo dõi tiến độ phục vụ và kịp thời xử lý các sự cố thiếu nguyên liệu.

**Lý do cho mức độ ưu tiên này**: Giúp quản lý phát hiện nhanh các đơn hàng bất thường (đơn chờ thanh toán quá lâu, đơn hủy) và kiểm soát rủi ro đứt gãy nguyên liệu bếp.

**Kiểm thử Độc lập**:
- Xem bảng "Đơn hàng gần đây" trên Dashboard: Hiển thị 5 đơn hàng mới nhất, có badge trạng thái màu sắc chuẩn (`Pending` vàng, `Processing` xanh dương, `Completed` xanh lá, `Cancelled` đỏ).
- Bấm vào một đơn hàng: Mở modal xem nhanh chi tiết món hoặc điều hướng đến trang chi tiết.
- Xem danh sách cảnh báo kho: Hiển thị nguyên liệu chạm ngưỡng tồn kho an toàn (`SHORTAGE`), hết hàng (`OUT_OF_STOCK`), hoặc lô hàng cận date (`EXPIRING_SOON`).
- Bấm vào cảnh báo: Điều hướng thẳng sang tab tương ứng trên màn hình Quản lý Kho `/inventory` (RM-011 / RM-013).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** các đơn hàng vừa được tạo hoặc cập nhật tại quầy POS, **Khi (When)** bảng Đơn hàng gần đây hiển thị, **Thì (Then)** danh sách liệt kê 5 đơn hàng mới nhất xếp theo `OrderDate` giảm dần, thông tin rõ ràng và có định dạng tiền tệ chuẩn xác.
2. **Cho trước (Given)** có nguyên liệu chạm ngưỡng tồn an toàn hoặc hết hàng trong kho, **Khi (When)** widget Cảnh báo kho hiển thị, **Thì (Then)** các thẻ cảnh báo hiển thị với viền đỏ/vàng nổi bật, thông báo rõ tên nguyên liệu, số lượng tồn thực tế, mã lô hàng và nút thao tác `[Kiểm kê xử lý]`.
3. **Cho trước (Given)** kho không có cảnh báo nào, **Khi (When)** hiển thị widget, **Thì (Then)** xuất hiện thông điệp tích cực màu xanh lá: "Kho hàng an toàn, không có nguyên liệu thiếu hụt hoặc quá hạn".

---

### User Story 6 - Khối Lối Tắt Vận Hành Nhanh (Quick Actions) (Priority: P2)

Là một Quản lý ca hoặc Thu ngân, khi tôi đang ở Dashboard, tôi muốn có các nút lối tắt điều hướng nhanh (Quick Actions) đến các tác vụ thường xuyên nhất (Gọi món POS, Xem sơ đồ bàn, Thêm món ăn mới, Kiểm kê kho, Xem dự báo nguyên liệu), để tôi không phải tìm kiếm trong thanh điều hướng menu.

**Lý do cho mức độ ưu tiên này**: Giảm bớt số lần nhấp chuột, tăng tốc độ thao tác của quản lý trong giờ cao điểm bận rộn.

**Kiểm thử Độc lập**:
- Kiểm tra khối Phím tắt nhanh trên Dashboard gồm các nút bấm lớn chuẩn chạm cảm ứng:
  1. `[Sơ đồ bàn & Đón khách]`: Điều hướng đến `/tables` hoặc `/waiter/tables`.
  2. `[Thực đơn món ăn]`: Điều hướng đến `/dishes`.
  3. `[Quản lý kho & Nhập hàng]`: Điều hướng đến `/inventory`.
  4. `[Kế hoạch dự báo]`: Điều hướng đến `/forecasts`.
  5. `[Báo cáo doanh thu]`: Điều hướng đến `/orders`.
- Các nút bấm có icon trực quan, tiêu đề rõ ràng, hiệu ứng hover nhẹ nhàng và vùng chạm tối thiểu 44 × 44 pixel.

---

### User Story 7 - Trạm Vào Ca Nội Bộ Cho Nhân Viên Chưa Đăng Nhập (Terminal Mode) (Priority: P2)

Là một Nhân viên nhà hàng (Phục vụ, Thu ngân, Phụ bếp) khi bước đến máy tính bảng hoặc trạm làm việc chung tại sảnh trước khi vào ca, tôi muốn nhìn thấy màn hình "Trạm Vận Hành Nội Bộ" hiển thị đồng hồ số thời gian thực chuẩn xác từng giây, ngày làm việc, trạng thái đóng/mở cửa của nhà hàng (09:00 - 23:00) và nút lớn để đăng nhập vào tài khoản cá nhân của mình.

**Lý do cho mức độ ưu tiên này**: Đảm bảo trải nghiệm chuyên nghiệp, an toàn thông tin khi chưa đăng nhập, đồng thời cung cấp đồng hồ chuẩn cho nhân viên theo dõi giờ ca trực.

**Kiểm thử Độc lập**:
- Truy cập URL gốc `/` khi chưa đăng nhập (`authService.isAuthenticated = false`).
- Kiểm tra giao diện hiển thị Trạm Vào Ca Nội Bộ (Terminal Card) ở giữa màn hình:
  - Logo thương hiệu TooHungry Restaurant sang trọng.
  - Badge trạng thái nhà hàng: `[Đang mở cửa]` màu xanh lá nếu giờ hiện tại nằm trong khung `09:00 - 22:59`, hoặc `[Đã đóng cửa]` màu đỏ nếu ngoài khung giờ trên.
  - Đồng hồ số thời gian thực hiển thị `HH:mm:ss` nhảy giây liên tục và thứ ngày tháng Tiếng Việt/Tiếng Anh.
  - Nút bấm `[ĐĂNG NHẬP VÀO HỆ THỐNG]` lớn, nổi bật màu cam, bấm vào điều hướng mượt mà đến trang đăng nhập Auth của ABP.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Nhà hàng mới mở cửa trong ngày chưa có đơn hàng nào**:
  - Doanh thu hôm nay hiển thị `0 VND`, Đơn hàng hôm nay hiển thị `0`, Biểu đồ doanh thu theo giờ hiển thị đường thẳng ở mốc 0, Top món bán chạy hiển thị trạng thái trống (Empty State) với thông điệp khích lệ thân thiện. Hệ thống tuyệt đối không phát sinh lỗi chia cho 0 (`DivideByZeroException` hoặc `NaN%`).
- **EC-002: Tỷ lệ lấp đầy bàn khi nhà hàng chưa tạo bàn nào hoặc toàn bộ bàn bị vô hiệu hóa**:
  - Nếu `TotalActiveTables == 0`, tỷ lệ lấp đầy bàn hiển thị `0%`, không phát sinh lỗi tính toán.
- **EC-003: Kho hàng hoàn toàn sạch sẽ, không có cảnh báo nào**:
  - Widget Cảnh báo kho hiển thị thẻ trạng thái an toàn màu xanh lá (Success Badge), thông báo "Kho nguyên liệu ổn định".
- **EC-004: Xung đột dữ liệu thời gian thực khi đơn hàng vừa thanh toán tại RM-016**:
  - SignalR phát sự kiện thanh toán thành công, client Dashboard tự động cộng dồn doanh thu và đơn hàng hôm nay, cập nhật lại biểu đồ và danh sách đơn gần đây trong dưới 1 giây mà không giật màn hình.
- **EC-005: Nhân viên vai trò Waiter hoặc InventoryStaff cố tình truy cập `/`**:
  - `dashboardGuard` tự động phát hiện vai trò và điều hướng tức thì: Waiter chuyển sang `/waiter/tables`, InventoryStaff chuyển sang `/inventory`, Cashier chuyển sang `/tables`. Chỉ Manager và Admin mới có quyền xem Dashboard trung tâm.
- **EC-006: Mất kết nối mạng / Reconnect SignalR**:
  - Khi WebSocket bị ngắt, Dashboard duy trì số liệu đã nạp gần nhất, không hiển thị màn hình trắng. Khi mạng khôi phục, hệ thống tự động gọi hàm đồng bộ dữ liệu tổng hợp mới nhất từ máy chủ.

---

## 4. Yêu cầu Hệ thống (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI tái thiết kế giao diện Dashboard `/` theo cấu trúc **Bento Grid hiện đại**, tuân thủ nghiêm ngặt nhận diện thương hiệu Cam & Trắng đặc trưng của Acme.TooHungry (`#EA580C`, nền xám nhạt Clean Slate `#F8FAFC`, thẻ trắng `#FFFFFF`, viền bo mềm `rounded-2xl`, shadow nhẹ tinh tế).
- **FR-002**: Backend PHẢI xây dựng một Application Service chuyên trách `DashboardAppService` (thực thi giao diện `IDashboardAppService`) cung cấp endpoint tổng hợp duy nhất:
  - `GET /api/app/dashboard/summary`: Tiếp nhận tham số `GetDashboardInput` (`Period`, `StartDate`, `EndDate`), mặc định là 7 ngày gần nhất (`Period = DashboardPeriod.Last7Days`), trả về toàn bộ số liệu thống kê tổng hợp (`DashboardSummaryDto`) bao gồm KPI, biểu đồ xu hướng, top món bán chạy, tóm tắt bàn ăn, đơn hàng gần đây và cảnh báo kho.
- **FR-003**: Dữ liệu KPI (`DashboardKpiDto`) PHẢI được tính toán chính xác trên máy chủ theo khoảng thời gian đã chọn:
  - `TotalRevenue`: Tổng tiền của tất cả các đơn hàng có `Status == OrderStatus.Completed` trong kỳ thống kê.
  - `TotalOrdersCount`: Tổng số đơn hàng phát sinh trong kỳ.
  - `CompletedOrdersCount`: Số đơn đã hoàn tất thanh toán trong kỳ.
  - `PendingOrdersCount`: Số đơn đang mở hoặc đang phục vụ trong kỳ.
  - `TotalDishesCount`: Tổng số món ăn đang hoạt động trong thực đơn.
  - `RevenueGrowthPercentage`: Tỷ lệ tăng trưởng doanh thu so với cùng kỳ trước đó (làm tròn 1 chữ số thập phân, ví dụ: `+12.5%` hoặc `-3.2%`).
  - `OrderGrowthPercentage`: Tỷ lệ tăng trưởng số lượng đơn hàng so với kỳ trước.
- **FR-004**: Thống kê Bàn ăn (`LiveTableSummary`) PHẢI phản ánh chính xác trạng thái mặt bằng thời gian thực:
  - `TotalTables`: Tổng số bàn ăn đang kích hoạt trong hệ thống.
  - `OccupiedTables`: Số bàn đang có khách ngồi (`Status == TableStatus.Occupied`).
  - `AvailableTables`: Số bàn trống sẵn sàng đón khách (`Status == TableStatus.Available`).
  - `ReservedTables`: Số bàn đã đặt trước (`Status == TableStatus.Reserved`).
  - `CleaningTables`: Số bàn đang dọn dẹp (`Status == TableStatus.Cleaning`).
  - `DisabledTables`: Số bàn tạm ngưng / bảo trì (`Status == TableStatus.Disabled`).
  - `OccupancyRate`: Tỷ lệ phần trăm lấp đầy bàn ăn, tính bằng công thức `(OccupiedTables / TotalTables) * 100` (làm tròn 1 chữ số thập phân).
- **FR-005**: Khối Top Món Bán Chạy (`TopSellingDishes`) PHẢI tổng hợp top 5 món ăn có số lượng bán nhiều nhất trong kỳ thống kê, cung cấp: `DishId`, `DishName`, `CategoryName`, `ImageUrl`, `Price`, `TotalQuantitySold`, `TotalRevenue`.
- **FR-006**: Khối Biểu Đồ Doanh Thu & Đơn Hàng (`RevenueTrendChart`) PHẢI sử dụng thư viện **Chart.js** với cấu trúc 2 trục tung (Dual-axis Chart):
  - Trục tung trái (Y-axis 1): Biểu diễn Doanh thu tiền tệ VND dưới dạng Biểu đồ cột (Bar Chart) màu cam nhận diện (`#EA580C`).
  - Trục tung phải (Y-axis 2): Biểu diễn Số lượng đơn hàng dưới dạng Biểu đồ đường (Line Chart) màu xanh dương uốn cong mềm mại.
  - Khi xem theo ngày ("Hôm nay" / "Hôm qua"): Trục hoành hiển thị 14 khung giờ (09:00 đến 23:00).
  - Khi xem theo khoảng ngày ("7 ngày gần đây" / "Tùy chỉnh"): Trục hoành hiển thị chuỗi các ngày trong khoảng thời gian (`dd/MM`).
  - Cung cấp thanh công cụ chuyển đổi nhanh: `[Hôm nay]`, `[Hôm qua]`, `[7 ngày gần nhất]` và bộ chọn khoảng ngày tùy chỉnh `[Date Range Picker]`.
- **FR-007**: Danh Sách Đơn Hàng Gần Đây (`RecentOrders`) PHẢI trả về tối đa 5 đơn hàng mới nhất, gồm: `OrderId`, `OrderNumber`, `TableName`, `OrderDate`, `TotalAmount`, `Status`.
- **FR-008**: Tích hợp danh sách Cảnh Báo Kho (`InventoryAlerts`) từ `IInventoryAppService.GetAlertsAsync()`, hỗ trợ lọc nhanh và liên kết sâu sang màn hình kiểm kê kho `/inventory`.
- **FR-009**: Cung cấp khối Phím Tắt Thao Tác Nhanh (Quick Actions) hỗ trợ điều hướng 1 chạm đến các phân hệ: Gọi món POS, Sơ đồ bàn, Quản lý món ăn, Kiểm kê kho hàng, Kế hoạch dự báo nguyên liệu.
- **FR-010**: Duy trì và tối ưu giao diện Trạm Vào Ca Nội Bộ (Terminal Mode) khi người dùng chưa đăng nhập, hiển thị đồng hồ số thời gian thực, trạng thái mở/đóng cửa nhà hàng (09:00 - 23:00) và nút đăng nhập hệ thống.
- **FR-011**: Tích hợp lắng nghe sự kiện thời gian thực qua SignalR (`TableHub` và `OrderHub`):
  - Khi có sự kiện đổi trạng thái bàn -> Cập nhật tức thì widget Bàn ăn và tỷ lệ lấp đầy bàn.
  - Khi có sự kiện thanh toán thành công đơn hàng -> Tự động cập nhật KPI Doanh thu hôm nay, số đơn hàng và biểu đồ theo giờ.
- **FR-012**: Toàn bộ 100% nhãn tiêu đề, chú thích, trạng thái, tooltip và thông điệp hiển thị trên Dashboard PHẢI được quốc tế hóa song ngữ đầy đủ trong `vi.json` và `en.json`.
- **FR-013**: Bảo vệ trang Dashboard bằng phân quyền ABP `TooHungryPermissions.Dashboard.Default` và `dashboardGuard`, chỉ cho phép tài khoản Quản lý (`Manager`, `Administrator`, `admin`) truy cập.

---

### Yêu cầu Phi chức năng & Hiệu năng (Non-Functional Requirements)

- **NFR-001 (Thời gian Phản hồi API)**: API tổng hợp `GET /api/app/dashboard/summary` phải phản hồi trong thời gian dưới **200 mili-giây**, sử dụng các câu truy vấn tối ưu LINQ / EF Core `AsNoTracking()` và nhóm dữ liệu trực tiếp tại Database.
- **NFR-002 (Tối ưu Băng thông & Hiệu năng Tải trang)**: Thay thế hoàn toàn cơ chế gọi 5 API phân tán bằng 1 API duy nhất, giảm số lượng HTTP request lúc nạp trang từ 5 xuống 1, giảm 70% kích thước dữ liệu truyền tải.
- **NFR-003 (Độ mượt mà Giao diện)**: Biểu đồ Chart.js và hiệu ứng chuyển đổi trạng thái hiển thị mượt mà 60 FPS, không gây đơ lag trình duyệt.
- **NFR-004 (Độ trễ Cập nhật Realtime)**: Dữ liệu thống kê trên Dashboard cập nhật sau sự kiện SignalR trong thời gian dưới 1 giây.
- **NFR-005 (Khả năng Tương thích Đa thiết bị)**: Giao diện Bento Grid tự động co giãn thông minh:
  - Màn hình lớn ($\ge$ 1200px): Lưới 4 cột cân đối.
  - Tablet ngang / POS (992px - 1199px): Lưới 2-3 cột linh hoạt.
  - Tablet dọc / Mobile (< 992px): Xếp chồng 1 cột mượt mà, cuộn tự nhiên.
- **NFR-006 (Vùng chạm Cảm ứng)**: Mọi nút bấm, thẻ tương tác và liên kết trên giao diện phải có vùng chạm tối thiểu 44 × 44 pixel, tối ưu cho thao tác chạm trên màn hình cảm ứng POS/Tablet.

---

## 5. Các Thực thể, Hợp đồng & Giao diện Chính (Key Contracts & Interfaces)

### Mô hình Tham số Đầu vào Lọc Dashboard (`GetDashboardInput`)
```csharp
using System;

namespace Acme.TooHungry.Dashboard;

public enum DashboardPeriod
{
    Today = 0,
    Yesterday = 1,
    Last7Days = 2,
    Custom = 3
}

public class GetDashboardInput
{
    public DashboardPeriod Period { get; set; } = DashboardPeriod.Last7Days;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
```

### Mô hình DTOs Tổng hợp Dashboard (`DashboardSummaryDto`)
```csharp
using System;
using System.Collections.Generic;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Orders;

namespace Acme.TooHungry.Dashboard;

public class DashboardSummaryDto
{
    public DashboardPeriod CurrentPeriod { get; set; } = DashboardPeriod.Last7Days;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public DashboardKpiDto Kpi { get; set; } = new();
    public LiveTableSummaryDto Tables { get; set; } = new();
    public List<RevenueTrendPointDto> RevenueTrend { get; set; } = new();
    public List<TopDishDto> TopSellingDishes { get; set; } = new();
    public List<RecentOrderDto> RecentOrders { get; set; } = new();
    public List<InventoryAlertDto> Alerts { get; set; } = new();
}

public class DashboardKpiDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalOrdersCount { get; set; }
    public int CompletedOrdersCount { get; set; }
    public int PendingOrdersCount { get; set; }
    public int TotalDishesCount { get; set; }
    public int TotalCategoriesCount { get; set; }
    public decimal RevenueGrowthPercentage { get; set; }
    public decimal OrderGrowthPercentage { get; set; }
}

public class LiveTableSummaryDto
{
    public int TotalTables { get; set; }
    public int OccupiedTables { get; set; }
    public int AvailableTables { get; set; }
    public int ReservedTables { get; set; }
    public int CleaningTables { get; set; }
    public int DisabledTables { get; set; }
    public double OccupancyRate { get; set; }
}

public class RevenueTrendPointDto
{
    public string TimeLabel { get; set; } = string.Empty; // "09:00", "10:00" hoặc "10/10", "11/10"
    public DateTime Timestamp { get; set; }
    public decimal Revenue { get; set; }
    public int OrderCount { get; set; }
}

public class TopDishDto
{
    public Guid DishId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Price { get; set; }
    public int TotalQuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class RecentOrderDto
{
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? TableName { get; set; }
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; }
}
```

### Hợp đồng Dịch vụ Ứng dụng Backend (`IDashboardAppService`)
```csharp
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Dashboard;

public interface IDashboardAppService : IApplicationService
{
    Task<DashboardSummaryDto> GetSummaryAsync(GetDashboardInput input);
}
```

### Controller HTTP API (`DashboardController`)
```csharp
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Acme.TooHungry.Controllers;
using Acme.TooHungry.Permissions;

namespace Acme.TooHungry.Dashboard;

[Authorize(TooHungryPermissions.Dashboard.Default)]
[Route("api/app/dashboard")]
public class DashboardController : TooHungryController, IDashboardAppService
{
    private readonly IDashboardAppService _dashboardAppService;

    public DashboardController(IDashboardAppService dashboardAppService)
    {
        _dashboardAppService = dashboardAppService;
    }

    [HttpGet("summary")]
    public Task<DashboardSummaryDto> GetSummaryAsync([FromQuery] GetDashboardInput input)
    {
        return _dashboardAppService.GetSummaryAsync(input);
    }
}
```

---

## 6. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% dữ liệu thống kê trên Dashboard được nạp qua một API tổng hợp duy nhất `GET /api/app/dashboard/summary`, loại bỏ hoàn toàn việc gọi phân tán 5 API từ client.
- **SC-002**: Chỉ số Doanh thu hôm nay (`TodayRevenue`) phản ánh chính xác 100% tổng doanh thu của tất cả đơn hàng `Completed` trong ngày hiện tại, khắc phục triệt để lỗi chỉ tính trên 5 đơn của phiên bản cũ.
- **SC-003**: Tỷ lệ lấp đầy bàn ăn (`Table Occupancy Rate`) hiển thị chuẩn xác theo thời gian thực và đồng bộ với dữ liệu sơ đồ bàn của RM-008 và RM-017.
- **SC-004**: Biểu đồ doanh thu theo giờ hiển thị đầy đủ 14 khung giờ mở cửa (09:00 - 23:00) với độ trễ phản hồi API dưới 200ms.
- **SC-005**: Danh sách Top 5 món bán chạy nhất phản ánh đúng số lượng tiêu thụ thực tế từ các đơn hàng hoàn tất trong ngày.
- **SC-006**: Số liệu thống kê KPI và trạng thái bàn tự động cập nhật qua SignalR trong vòng dưới 1 giây khi có đơn hàng mới hoặc bàn đổi trạng thái.
- **SC-007**: 100% các chuỗi văn bản, tiêu đề, nhãn trạng thái và thông điệp hiển thị song ngữ đầy đủ trong `vi.json` và `en.json`.
- **SC-008**: Giao diện Bento Grid đạt điểm thẩm mỹ cao, chuẩn nhận diện Cam & Trắng (`#EA580C`), tương thích 100% trên cả Desktop và Tablet POS.

---

## 7. Các Giả định & Ràng buộc (Assumptions & Constraints)

### Giả định (Assumptions):
- Giờ hoạt động chuẩn của nhà hàng là từ **09:00 đến 23:00** hàng ngày; các đơn hàng phát sinh trong khoảng thời gian này là trọng tâm phân tích của biểu đồ theo giờ.
- Các đơn hàng được tính vào doanh thu hôm nay phải có trạng thái là `OrderStatus.Completed` (đã thanh toán thành công).
- Cơ sở dữ liệu sử dụng múi giờ chuẩn của nhà hàng để xác định ranh giới ngày hôm nay (`DateTime.Today`).

### Ràng buộc (Constraints):
- Tuân thủ bảng màu nhận diện thương hiệu chuẩn của Acme.TooHungry: Màu cam chủ đạo `#EA580C`, nền `#F8FAFC`, bề mặt thẻ `#FFFFFF`, bo góc mềm `rounded-2xl`.
- Không sử dụng thư viện biểu đồ quá nặng gây phình to bundle; ưu tiên giải pháp CSS SVG Chart tinh gọn hoặc Angular lightweight chart.
- Toàn bộ chuỗi hiển thị bắt buộc phải có bản dịch đầy đủ trong cả `vi.json` và `en.json`.
- Kích thước vùng bấm chạm trên màn hình cảm ứng tối thiểu đạt 44 × 44 pixel.
