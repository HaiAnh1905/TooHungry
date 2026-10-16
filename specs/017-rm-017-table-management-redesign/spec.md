# Đặc tả Tính năng (Feature Specification): Làm lại trang Quản lý Bàn (Table Management Redesign)

**Mã Tính năng (Feature ID)**: `RM-017`

**Nhánh Tính năng (Feature Branch)**: `017-rm-017-table-management-redesign`

**Ngày lập**: 2026-10-16

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu nghiệp vụ từ Roadmap RM-017: "Tái thiết kế toàn diện giao diện và tối ưu trải nghiệm người dùng (UI/UX Redesign) cho phân hệ Quản lý Bàn ăn (`/tables` và `/waiter/tables`)."
- Kế thừa và nâng cấp nền tảng từ RM-008 (Quản lý Khu vực & Bàn ăn), RM-009 (Đặt bàn trước), RM-010 (POS Gọi món), RM-015 (Điều hướng & Bố cục Waiter), và RM-016 (Thanh toán đơn hàng).
- Thực thể Domain: `RestaurantTable`, `DiningArea` trong `src/Acme.TooHungry.Domain/Tables` và `DiningAreas`.
- Cơ chế thời gian thực: Tích hợp trường `OccupiedTime` (Migration `20261016024610_Add_OccupiedTime_To_RestaurantTable`) và SignalR Realtime Hub (`TableHub`).

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 16-10-2026 (Phiên làm rõ Yêu cầu `/speckit.clarify` - 5 Quyết định Vận hành Trọng yếu)
- **Q1: Cơ chế xử lý Đơn hàng khi Gộp bàn (Merge Tables)**: Khi thực hiện gộp bàn (Bàn B gộp vào Bàn A), cơ chế xử lý các đơn hàng (Orders) đang mở nên hoạt động như thế nào?
  - **A1**: **Gộp toàn bộ món ăn từ Order B sang Order A, sau đó đóng Order B và cập nhật tổng tiền Order A để thanh toán 1 hóa đơn duy nhất**:
    - Chuyển toàn bộ các dòng `OrderItem` từ đơn hàng của bàn phụ (Bàn B) sang đơn hàng của bàn chính (Bàn A).
    - Tính toán lại tổng tiền của Order A (`TotalAmount = sum(Quantity * UnitPrice)`).
    - Đơn hàng B được đóng lại với ghi chú hệ thống: *"Đã gộp vào đơn hàng {OrderNumber_A} của {TableName_A}"*.
    - Bàn phụ (Bàn B) được giải phóng và chuyển sang trạng thái `CLEANING` (hoặc `AVAILABLE`), giúp nhà hàng chỉ cần xuất và thanh toán đúng 1 hóa đơn duy nhất tại RM-016.
- **Q2: Trạng thái của Bàn nguồn sau khi Chuyển bàn (Source Table Status after Transfer)**: Sau khi chuyển khách từ Bàn A sang Bàn B thành công, Bàn nguồn A nên chuyển sang trạng thái nào?
  - **A2**: **Phân nhánh thông minh dựa trên việc bàn đã có gọi món hay chưa**:
    - *Trường hợp 1 (Đã dùng món / Có Order)*: Bàn nguồn A tự động chuyển sang trạng thái `CLEANING` (Đang dọn dẹp), reset `OccupiedTime = null`, để nhân viên phục vụ kiểm tra và vệ sinh bàn trước khi đón lượt khách mới.
    - *Trường hợp 2 (Khách vừa ngồi chưa gọi món / Không có Order)*: Bàn nguồn A tự động chuyển thẳng về `AVAILABLE` (Còn trống), reset `OccupiedTime = null`, sẵn sàng đón tiếp khách mới ngay lập tức mà không cần qua khâu dọn dẹp.
- **Q3: Cơ chế & Phân cấp Cảnh báo Thời lượng Dùng bữa trên Thẻ Bàn**: Hệ thống cảnh báo thời lượng dùng bữa trên thẻ bàn nên áp dụng cơ chế và cấp độ cảnh báo nào?
  - **A3**: **Áp dụng 2 cấp độ cảnh báo trực quan đa tầng (Two-tier Visual Alert System)**:
    - *Mức bình thường (< 60 phút)*: Huy hiệu `badge-meal-normal` (nền xám/vàng kem trung tính, chữ tối dễ đọc).
    - *Mức 1 (Cảnh báo Chăm sóc: $\ge$ 60 phút đến < 90 phút)*: Huy hiệu tự động đổi sang màu vàng ấm `badge-meal-warning` (nền vàng nhạt `#FEF3C7`, chữ vàng đậm `#D97706`, icon `fa-clock`) nhằm nhắc nhở nhân viên phục vụ châm thêm nước, hỏi thăm mức độ hài lòng hoặc gợi ý món tráng miệng.
    - *Mức 2 (Cảnh báo Giờ cao điểm / Bàn ngồi lâu: $\ge$ 90 phút)*: Huy hiệu tự động đổi sang màu cam đỏ đậm `badge-meal-long` (nền đỏ nhạt `#FEE2E2`, chữ đỏ đậm `#DC2626`, icon đồng hồ cát `fa-hourglass-half` có hiệu ứng nhấp nháy nhẹ pulse) cảnh báo nhân viên và quản lý về tốc độ quay vòng bàn.
- **Q4: Phân quyền & Vị trí Nút Thao tác Chuyển bàn & Gộp bàn trên UI**: Phân quyền và vị trí đặt các nút thao tác Chuyển bàn & Gộp bàn trên giao diện nên bố trí như thế nào?
  - **A4**: **Hiển thị trực tiếp nút `[Chuyển bàn]` và `[Gộp bàn]` trên menu ngữ cảnh của Thẻ Bàn OCCUPIED ở cả 2 màn hình `/waiter/tables` và `/tables`**:
    - Cả Nhân viên phục vụ (`Waiter`) và Quản lý (`Manager`/`Admin`) đều được trao quyền thực hiện chuyển bàn và gộp bàn trực tiếp ngay tại sảnh phục vụ.
    - Bố trí nút bấm trực quan: Khi bàn ở trạng thái `OCCUPIED`, thẻ bàn cung cấp nút thao tác nhanh hoặc menu dropdown tiện lợi, cho phép 1 chạm mở ngay `TableTransferModal` hoặc `TableMergeModal` mà không cần đi qua nhiều bước trung gian.
- **Q5: Tái Cấu trúc Kiến trúc Component (Component Refactoring & Modularization)**: Hiện tại `TableComponent` (`/tables`) bị phình to (2263 dòng HTML, 1914 dòng TypeScript) do nhồi nhét tất cả modal (Order Modal, Reservation Modal, Area Modal, Disable Modal) vào một file duy nhất. Cần tái cấu trúc kiến trúc mã nguồn như thế nào?
  - **A5**: **Bóc tách các Sub-component và Modal dùng chung độc lập (Shared Modals)**:
    - Loại bỏ Order Modal bị nhân bản trong `/tables`: Mọi hành động gọi món đều điều hướng trực tiếp sang màn hình POS chuyên trách `/waiter/order/:tableId` hoặc mở POS Drawer chuẩn.
    - Tách biệt các modal chức năng thành các component con độc lập có thể tái sử dụng giữa `/tables` và `/waiter/tables`:
      + `TableFormModalComponent`: Thêm / Chỉnh sửa bàn ăn (Admin).
      + `DiningAreaModalComponent`: Thêm / Chỉnh sửa khu vực (Admin).
      + `TableTransferModalComponent`: Hộp thoại Chuyển bàn / Đổi chỗ ngồi (dùng chung cho cả Waiter và Admin).
      + `TableEndMealModalComponent`: Hộp thoại Kết thúc bữa ăn kèm Timeline (dùng chung cho cả Waiter và Admin).
    - Giữ `TableComponent` và `WaiterTablesComponent` tinh gọn, tập trung 100% vào Reactive State Management (Signals), SignalR Subscription, và rendering giao diện mượt mà.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Phân hệ **Quản lý Bàn ăn (Table Management)** là trung tâm điều phối không gian và nhịp độ phục vụ của nhà hàng Acme.TooHungry. Toàn bộ hành trình ẩm thực của thực khách tại chỗ — từ lúc bước vào cửa, nhận chỗ ngồi, gọi món, dùng bữa, đến khi tính tiền và dọn bàn — đều xoay quanh thực thể **Bàn ăn (Restaurant Table)**.

Phiên bản ban đầu (RM-008) đã thiết lập nền tảng CRUD cơ bản và cập nhật trạng thái bàn. Tuy nhiên, qua quá trình vận hành thực tế cùng các tính năng phát triển sau (RM-009 Đặt bàn, RM-010 POS Gọi món, RM-015 Waiter Layout, RM-016 Thanh toán), phân hệ Quản lý Bàn bộc lộ các điểm nghẽn trải nghiệm:
1. Giao diện `/tables` bị phân mảnh, mã nguồn nguyên khối (monolithic) cồng kềnh, tải chậm và thiếu tính đồng bộ thẩm mỹ với nhận diện Cam & Trắng hiện đại của hệ thống.
2. Nhân viên phục vụ khó kiểm soát thời gian khách dùng bữa, không biết bàn nào ngồi quá lâu để phục vụ thêm nước/tráng miệng hoặc chuẩn bị thanh toán.
3. Thiếu tính năng nghiệp vụ cốt lõi: **Chuyển bàn** (khách muốn đổi từ bàn trong nhà ra sân vườn, hoặc ghép bàn rộng hơn) khiến nhân viên phải thao tác thủ công phức tạp.
4. Hộp thoại kết thúc bữa ăn chưa trực quan, dễ gây nhầm lẫn giữa việc hủy bàn trống và chuyển sang hóa đơn thanh toán.

**RM-017 (Làm lại trang Quản lý Bàn)** giải quyết triệt để các tồn đọng trên, mang lại một trải nghiệm quản trị mặt bằng và vận hành bàn ăn đẳng cấp, mượt mà và chuẩn mực.

### Sơ đồ Vị trí Điều phối Trung tâm của Phân hệ Quản lý Bàn:
```text
                  ┌──────────────────────────────────────────────────┐
                  │          KHÁCH ĐẾN NHÀ HÀNG ACME.TOOHUNGRY       │
                  └─────────────────────────┬────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          [Khách vãng lai đến sảnh]                     [Khách đã Đặt bàn trước]
                     │                                             │ (RM-009)
                     ▼                                             ▼
          ┌─────────────────────┐                       ┌─────────────────────┐
          │   BÀN AVAILABLE     │                       │    BÀN RESERVED     │
          │ (Xanh lá - Còn trống)│                       │ (Vàng hổ phách - Hẹn)│
          └──────────┬──────────┘                       └──────────┬──────────┘
                     │                                             │
                     ├─► [Đón khách] ──────────────────────────────┤
                     │   (Ghi nhận OccupiedTime = DateTime.Now)    │
                     │                                             ▼
                     ▼                                  [Bấm Nhận bàn Check-in]
          ┌───────────────────────────────────────────────────────────────────┐
          │                         BÀN OCCUPIED                              │
          │                   (Đỏ ấm - Đang có khách)                         │
          │  - Đồng hồ đếm thời lượng dùng bữa theo thời gian thực (Signal)   │
          │  - Cảnh báo viền đỏ + pulse khi thời gian ngồi >= 90 phút         │
          └───────────────────────────────┬───────────────────────────────────┘
                                          │
                  ┌───────────────────────┼────────────────────────┐
                  ▼                       ▼                        ▼
          [Nghiệp vụ POS]         [Nghiệp vụ Đổi chỗ]      [Khách kết thúc bữa]
          Gọi món tại bàn         CHUYỂN BÀN SANG BÀN MỚI    Bấm [Kết thúc bữa ăn]
          (/waiter/order/:id)     (TransferTableModal)             │
                  │               - Giữ nguyên Order & Time        ▼
                  │               - Giải phóng bàn cũ     ┌───────────────────┐
                  ▼                                       │ EndMealModal      │
          [Có Order mở]                                   │ Timeline trực quan│
                  │                                       └─────────┬─────────┘
                  │                                                 │
                  │                               ┌─────────────────┴─────────────────┐
                  │                               ▼                                   ▼
                  │                     [Không có món ăn]                   [Có Order cần tính tiền]
                  │                     Xác nhận trả bàn trống              Bấm [Thanh toán hóa đơn]
                  │                     (Chuyển AVAILABLE)                  (Chuyển sang RM-016)
                  │                                                                   │
                  │                                                                   ▼
                  │                                                         [Thanh toán xong tại RM-016]
                  │                                                                   │
                  └───────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │     BÀN CLEANING      │
                                      │ (Lam sáng - Dọn dẹp)  │
                                      └───────────┬───────────┘
                                                  │
                                                  ▼ (Bấm [Dọn dẹp xong])
                                      ┌───────────────────────┐
                                      │     BÀN AVAILABLE     │
                                      │  (Sẵn sàng đón khách) │
                                      └───────────────────────┘
```

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Thẻ Bàn Hiện Đại & Đồng Bộ Thời Gian Dùng Bữa Real-Time (Priority: P1)

Là một Nhân viên phục vụ (Waiter) hoặc Quản lý ca, khi tôi quan sát sơ đồ bàn ăn trên `/waiter/tables` hoặc `/tables`, tôi muốn thẻ bàn hiển thị trực quan trạng thái, sức chứa và thời lượng khách đã ngồi dùng bữa (đếm giờ chính xác từ mốc `OccupiedTime`), đồng thời làm nổi bật các bàn ngồi lâu trên 90 phút, để tôi có thể chủ động phục vụ khách chu đáo và tối ưu tốc độ quay vòng bàn.

**Lý do cho mức độ ưu tiên này**: Tốc độ luân chuyển bàn (Table Turnover Rate) và sự chăm sóc kịp thời tại bàn là yếu tố sống còn đối với doanh thu và sự hài lòng của thực khách nhà hàng.

**Kiểm thử Độc lập**:
- Đón khách vào một bàn trống lúc 11:30. Kiểm tra thẻ bàn chuyển sang đỏ ấm `[Đang có khách]`.
- Thẻ hiển thị dòng: `Ngồi lúc: 11:30` và huy hiệu `0 phút`.
- Cố tình mock thời gian hoặc kiểm tra bàn đã ngồi 95 phút: Kiểm tra huy hiệu thời gian chuyển sang màu cam đỏ đậm `badge-meal-long`, có icon đồng hồ cát và hiệu ứng viền nổi bật.
- Cập nhật thời gian thực không yêu cầu tải lại trang (mỗi 30 giây tự tăng số phút).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở màn hình sơ đồ bàn, **Khi (When)** một bàn ở trạng thái `OCCUPIED` có `occupiedTime` hợp lệ, **Thì (Then)** thẻ bàn hiển thị thông tin thời gian gồm:
   - Dòng giờ nhận bàn: icon `fa-clock`, nhãn `Ngồi lúc:` kèm giờ định dạng `HH:mm`.
   - Huy hiệu thời lượng dùng bữa (Elapsed Seated Time Pill): định dạng `{X} phút` nếu dưới 60 phút, hoặc `{H} giờ {M} phút` nếu trên 60 phút.
2. **Cho trước (Given)** bàn ăn có thời gian dùng bữa dưới 60 phút, **Khi (When)** hiển thị thẻ bàn, **Thì (Then)** huy hiệu thời gian mang phong cách `badge-meal-normal` (nền xám/vàng kem trung tính, chữ màu tối dễ đọc).
3. **Cho trước (Given)** bàn ăn có thời gian dùng bữa từ 60 đến dưới 90 phút (Mức cảnh báo 1), **Khi (When)** hệ thống cập nhật timer chu kỳ, **Thì (Then)** huy hiệu tự động chuyển sang `badge-meal-warning` (màu nền vàng nhạt `#FEF3C7`, chữ vàng đậm `#D97706`, icon `fa-clock`) nhắc nhở nhân viên quan sát tiếp nước và phục vụ khách.
4. **Cho trước (Given)** bàn ăn có thời gian dùng bữa $\ge$ 90 phút (Mức cảnh báo 2 - Bàn ngồi lâu), **Khi (When)** hệ thống cập nhật timer chu kỳ, **Thì (Then)** huy hiệu tự động chuyển sang `badge-meal-long` (màu nền đỏ ấm `#FEE2E2`, chữ đỏ đậm `#DC2626`, icon `fa-hourglass-half` có hiệu ứng nhấp nháy nhẹ pulse, tooltip giải thích "Khách đã dùng bữa trên 90 phút").
5. **Cho trước (Given)** một bàn ăn đang ở trạng thái `AVAILABLE`, **Khi (When)** nhân viên bấm nút `[Đón khách]`, **Thì (Then)** hệ thống cập nhật `Status = Occupied`, gán `OccupiedTime = DateTime.Now`, lập tức khởi động bộ đếm giờ và phát tín hiệu SignalR đến mọi máy khách khác.

---

### User Story 2 - Hộp thoại Kết Thúc Bữa Ăn & Timeline Tiến Trình Trực Quan (Priority: P1)

Là một Nhân viên phục vụ, khi khách tại bàn chuẩn bị ra về và tôi bấm nút `[Kết thúc bữa ăn]`, tôi muốn xuất hiện một hộp thoại sang trọng hiển thị Timeline tiến trình dùng bữa (`Giờ nhận bàn → Thời lượng phục vụ → Giờ kết thúc`), đồng thời phân định rõ ràng giữa bàn có hóa đơn cần thanh toán và bàn trống không dùng món, để tôi không bao giờ bị nhầm lẫn giữa việc hủy bàn và thu tiền của khách.

**Lý do cho mức độ ưu tiên này**: Tránh hoàn toàn lỗi thất thoát doanh thu (nhân viên bấm nhầm trả bàn trống trong khi khách chưa thanh toán hóa đơn món ăn).

**Kiểm thử Độc lập**:
- Thử nghiệm với bàn `OCCUPIED` không có món ăn (`hasActiveOrder = false`): Bấm `[Kết thúc bữa ăn]`, kiểm tra modal cảnh báo màu vàng, timeline hiển thị đủ 3 mốc, bấm `[Xác nhận trả bàn trống]` -> Bàn về `AVAILABLE`.
- Thử nghiệm với bàn `OCCUPIED` có Order mở (`hasActiveOrder = true`): Bấm `[Kết thúc bữa ăn]`, kiểm tra modal màu xanh/cam nổi bật, hiển thị mã đơn hàng, bấm `[Chuyển sang Thanh toán]` -> Điều hướng sang `/payment/:orderId`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên bấm nút `[Kết thúc bữa ăn]` trên thẻ bàn `OCCUPIED`, **Khi (When)** hộp thoại `EndMealModal` mở lên, **Thì (Then)** hộp thoại luôn hiển thị Card Timeline tiến trình gồm 3 khối:
   - Khối Bắt đầu: Icon `fa-user-check`, nhãn "Bắt đầu dùng bữa", hiển thị giờ và ngày khách nhận bàn.
   - Khối Kết nối: Đường timeline nối giữa kèm pill tóm tắt tổng thời gian dùng bữa (`endingMealDurationText`).
   - Khối Kết thúc: Icon `fa-flag-checkered`, nhãn "Thời điểm kết thúc", hiển thị giờ hiện tại của hệ thống.
2. **Cho trước (Given)** bàn không có đơn hàng mở (`hasActiveOrder = false`), **Khi (When)** modal hiển thị, **Thì (Then)** phần nội dung thông báo:
   - Khối cảnh báo màu vàng: "Khách không sử dụng món ăn. Bạn có chắc chắn muốn trả bàn về trạng thái trống?".
   - Nút hành động chính: `[Xác nhận trả bàn trống]` màu vàng cam. Khi bấm, gọi `ChangeStatusAsync(tableId, Available)` và đóng modal.
3. **Cho trước (Given)** bàn có đơn hàng mở (`hasActiveOrder = true`), **Khi (When)** modal hiển thị, **Thì (Then)** phần nội dung thông báo:
   - Khối thông tin màu xanh/cam: Hiển thị thông báo bàn đang có đơn hàng chưa thanh toán.
   - Nút hành động chính: `[Chuyển sang Thanh toán →]` màu cam chủ đạo (`btn-primary`). Khi bấm, chuyển hướng trình duyệt sang `/payment/:orderId` (RM-016), bàn vẫn giữ nguyên trạng thái `OCCUPIED`.
4. **Cho trước (Given)** nhân viên bấm nút `[Hủy bỏ]` hoặc click ra ngoài backdrop, **Khi (When)** thao tác diễn ra, **Thì (Then)** modal đóng lại an toàn mà không làm thay đổi trạng thái của bàn.

---

### User Story 3 - Chuyển Bàn & Đổi Vị Trí Ngồi Linh Hoạt (Priority: P1)

Là một Nhân viên phục vụ hoặc Quản lý ca, khi khách hàng yêu cầu chuyển từ bàn hiện tại sang một bàn khác (ví dụ: chuyển từ bàn 2 người sang bàn 6 người để đón thêm bạn, hoặc chuyển từ trong nhà ra ngoài sân vườn), tôi muốn chọn chức năng "Chuyển bàn", chọn bàn trống đích và xác nhận, để hệ thống tự động di chuyển toàn bộ đơn hàng đang gọi và thời gian dùng bữa sang bàn mới một cách mượt mà.

**Lý do cho mức độ ưu tiên này**: Đổi chỗ ngồi là tình huống diễn ra hàng ngày tại nhà hàng; tính năng chuyển bàn tự động giúp nhân viên không phải hủy đơn cũ tạo lại đơn mới, bảo toàn hóa đơn và tiêu hao kho.

**Kiểm thử Độc lập**:
- Bàn 01 đang `OCCUPIED`, có đơn hàng `ORD-001` gồm 3 món, đã ngồi 40 phút. Bàn 05 đang `AVAILABLE`.
- Bấm nút `[Chuyển bàn]` trên Bàn 01. Chọn Bàn 05 trong danh sách bàn trống. Bấm `[Xác nhận chuyển bàn]`.
- Kiểm tra Bàn 05 chuyển sang `OCCUPIED`, mang đúng Order `ORD-001` và kế thừa mốc `OccupiedTime` từ Bàn 01 (vẫn hiển thị thời lượng ngồi 40 phút).
- Kiểm tra Bàn 01 tự động chuyển sang trạng thái `CLEANING` để nhân viên lau dọn lại.
- Kiểm tra SignalR broadcast cập nhật tức thì trên tất cả màn hình.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** một bàn ăn đang ở trạng thái `OCCUPIED` (Bàn nguồn), **Khi (When)** nhân viên mở menu thao tác hoặc bấm nút `[Chuyển bàn]`, **Thì (Then)** hệ thống hiển thị hộp thoại `TableTransferModal` gồm:
   - Thông tin bàn nguồn (Tên bàn, Khu vực, Sức chứa, Thời gian ngồi, Số món trong đơn).
   - Danh sách các bàn trống (`AVAILABLE`) có thể chuyển đến, có bộ lọc theo Khu vực và ô tìm kiếm nhanh tên bàn.
   - Bàn đích được đánh dấu rõ sức chứa (khuyến cáo nếu sức chứa bàn đích nhỏ hơn số khách hiện tại).
2. **Cho trước (Given)** nhân viên chọn một bàn đích hợp lệ và bấm `[Xác nhận chuyển bàn]`, **Khi (When)** API backend xử lý giao dịch nguyên tử, **Thì (Then)** hệ thống:
   - Cập nhật `Order.TableId = targetTableId` cho đơn hàng đang hoạt động (nếu có).
   - Cập nhật `TargetTable.Status = TableStatus.Occupied` và `TargetTable.OccupiedTime = sourceTable.OccupiedTime`.
   - Nếu Bàn nguồn đã có đơn hàng hoặc khách đã dùng món: Cập nhật `SourceTable.Status = TableStatus.Cleaning` và `SourceTable.OccupiedTime = null`.
   - Nếu Bàn nguồn chưa có đơn hàng và khách chưa dùng món nào: Cập nhật `SourceTable.Status = TableStatus.Available` và `SourceTable.OccupiedTime = null`.
   - Phát thông điệp Realtime SignalR thông báo trạng thái mới của cả hai bàn.
3. **Cho trước (Given)** trong lúc nhân viên đang chọn bàn đích, một nhân viên khác đã đón khách vào bàn đích đó, **Khi (When)** nhân viên bấm xác nhận, **Thì (Then)** hệ thống chặn lại với lỗi Concurrency Conflict: "Bàn đích vừa được sử dụng bởi nhân viên khác, vui lòng chọn bàn khác!", đồng thời làm mới danh sách bàn trống.

---

### User Story 4 - Gộp Bàn Phục Vụ Đoàn Khách Lớn (Priority: P2)

Là một Quản lý ca hoặc Thu ngân, khi có một đoàn khách đông ngồi ở nhiều bàn lân cận (ví dụ Bàn 03 và Bàn 04) muốn gộp chung hóa đơn để thanh toán một lần, tôi muốn sử dụng tính năng "Gộp bàn" để chuyển toàn bộ món ăn từ bàn phụ sang bàn chính, giúp hóa đơn được tổng hợp chính xác và giải phóng bàn phụ.

**Lý do cho mức độ ưu tiên này**: Đoàn khách gia đình hoặc công ty thường ngồi ghép nhiều bàn nhưng thanh toán chung một hóa đơn duy nhất.

**Kiểm thử Độc lập**:
- Bàn 03 có Order A (2 món, 150k). Bàn 04 có Order B (3 món, 250k).
- Chọn Bàn 03 làm bàn chính, chọn gộp Bàn 04 vào Bàn 03.
- Kiểm tra sau khi gộp: Order A của Bàn 03 chứa toàn bộ 5 món (tổng tiền 400k). Order B chuyển sang trạng thái đã gộp/hủy. Bàn 04 chuyển về trạng thái `CLEANING` hoặc `AVAILABLE`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng có quyền quản lý bàn/order, **Khi (When)** mở tính năng gộp bàn trên một bàn `OCCUPIED`, **Thì (Then)** giao diện hiển thị danh sách các bàn `OCCUPIED` khác đang có đơn hàng mở để chọn gộp.
2. **Cho trước (Given)** người dùng xác nhận gộp Bàn B vào Bàn A, **Khi (When)** hệ thống xử lý, **Thì (Then)** toàn bộ danh sách `OrderItem` của Bàn B được chuyển gộp sang Đơn hàng của Bàn A, tính toán lại tổng tiền của Bàn A.
3. **Cho trước (Given)** quá trình gộp hoàn tất, **Khi (When)** cập nhật trạng thái, **Thì (Then)** Bàn B được giải phóng và chuyển sang trạng thái `CLEANING`.

---

### User Story 5 - Nâng Cấp Giao Diện Quản Trị Sơ Đồ Bàn Admin/Manager (`/tables`) (Priority: P1)

Là Chủ nhà hàng hoặc Quản lý ca, khi tôi truy cập trang Quản lý Bàn ăn (`/tables`), tôi muốn một giao diện sang trọng, hiện đại chuẩn nhận diện Cam & Trắng, có thể chuyển đổi mượt mà giữa chế độ Sơ đồ mặt bằng (Floor Plan Grid) và Bảng danh sách chi tiết (Datatable List View), hỗ trợ lọc theo từng khu vực, tìm kiếm tức thì và thao tác cấu hình bàn nhanh chóng mà không bị giật lag.

**Lý do cho mức độ ưu tiên này**: Màn hình quản trị là trung tâm quan sát toàn bộ nhà hàng của cấp quản lý; thiết kế hiện đại, thông tin mạch lạc giúp quản lý nắm bắt tình hình kinh doanh ngay trong nháy mắt.

**Kiểm thử Độc lập**:
- Truy cập `/tables`. Kiểm tra giao diện tuân thủ bảng màu Cam & Trắng (`#EA580C`), bo góc `rounded-2xl`, thanh điều hướng khu vực có badge số lượng bàn.
- Chuyển đổi qua lại giữa `Floor Plan` (Grid) và `List View`: Kiểm tra dữ liệu chuyển đổi mượt mà dưới 100ms, bộ lọc và từ khóa tìm kiếm được giữ nguyên.
- Kiểm tra các Card Thống kê nhanh mặt bằng (Tổng số bàn, Còn trống, Đang có khách, Đã đặt, Đang dọn dẹp, Tạm ngưng): Bấm vào thẻ nào thì tự động lọc danh sách theo trạng thái đó.
- Thao tác Thêm bàn mới, Sửa bàn, Khóa khu vực hoạt động trơn tru qua các Modal chuyên biệt đã được tách nhỏ.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** Quản lý truy cập `/tables`, **Khi (When)** trang hiển thị, **Thì (Then)** khối Header và Thanh chỉ số mặt bằng (Floor Summary Indicators) hiển thị 6 thẻ tóm tắt với màu sắc nhận diện sắc nét:
   - Tổng số bàn (Icon `fa-table`, viền xám bạc).
   - Bàn trống (Icon `fa-check-circle`, xanh lá `#10B981`).
   - Đang có khách (Icon `fa-utensils`, đỏ cam `#EA580C`).
   - Đã đặt trước (Icon `fa-calendar-check`, vàng hổ phách `#F59E0B`).
   - Đang dọn dẹp (Icon `fa-broom`, xanh lơ `#06B6D4`).
   - Tạm ngưng/Bảo trì (Icon `fa-wrench`, xám chì `#64748B`).
2. **Cho trước (Given)** Quản lý bấm vào bất kỳ thẻ chỉ số nào ở trên, **Khi (When)** thao tác bấm, **Thì (Then)** danh sách bàn bên dưới tự động lọc theo đúng trạng thái tương ứng; bấm lại lần nữa hoặc bấm thẻ Tổng số bàn để bỏ lọc.
3. **Cho trước (Given)** Quản lý chọn chế độ `Floor Plan` (Grid View), **Khi (When)** danh sách hiển thị, **Thì (Then)** các thẻ bàn được bố trí dạng lưới 4 cột (responsive 1-2-3-4 cột tùy màn hình), hiển thị minh họa mặt bàn và ghế ngồi thanh lịch, nhãn số ghế, tên khu vực, huy hiệu trạng thái và cụm nút thao tác nhanh.
4. **Cho trước (Given)** Quản lý chọn chế độ `List View`, **Khi (When)** bảng dữ liệu hiển thị, **Thì (Then)** bảng danh sách hiển thị đầy đủ các cột: STT, Tên bàn, Sức chứa (căn giữa), Khu vực ăn uống, Trạng thái (badge có thể bấm xem chi tiết đặt bàn), và Cột thao tác (Sửa, Xóa an toàn, Đổi trạng thái).

---

### User Story 6 - Đồng Bộ Trạng Thái Thời Gian Thực Toàn Diện Qua SignalR (`TableHub`) (Priority: P2)

Là một Nhân viên hoặc Quản lý đang mở hệ thống trên nhiều thiết bị (máy tính thu ngân, máy tính bảng phục vụ tại sảnh, điện thoại của quản lý ca), tôi muốn mọi thay đổi về trạng thái bàn (Đón khách, Chuyển bàn, Gọi món, Kết thúc bữa, Dọn dẹp xong) được phản ánh tức thì lên màn hình của tôi trong vòng dưới 1 giây mà không cần bấm F5 tải lại trang.

**Lý do cho mức độ ưu tiên này**: Đảm bảo toàn bộ đội ngũ nhà hàng cùng nhìn thấy một "nguồn sự thật duy nhất" (Single Source of Truth), loại trừ rủi ro xung đột phục vụ.

**Kiểm thử Độc lập**:
- Mở đồng thời 2 trình duyệt: Cửa sổ A mở `/tables` (Admin), Cửa sổ B mở `/waiter/tables` (Waiter).
- Tại Cửa sổ B, bấm `[Đón khách]` trên Bàn 02.
- Quan sát tại Cửa sổ A: Trong dưới 1 giây, thẻ Bàn 02 tự động chuyển từ xanh lá sang đỏ ấm `[Đang có khách]`, bộ đếm giờ bắt đầu chạy, thẻ thống kê `Đang có khách` tăng thêm 1.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** hai hoặc nhiều thiết bị đang mở màn hình quản lý bàn, **Khi (When)** có bất kỳ thao tác thay đổi trạng thái bàn nào thành công trên máy chủ, **Thì (Then)** SignalR `TableHub` phát sự kiện `tableStatusChanged` kèm payload `{ tableId, newStatus, tableName, diningAreaId, occupiedTime }`.
2. **Cho trước (Given)** máy khách nhận được sự kiện SignalR, **Khi (When)** xử lý sự kiện trong Angular Signal store, **Thì (Then)** cập nhật trực tiếp mảng `tables` reactive signal, kích hoạt cập nhật giao diện ngay lập tức mà không làm giật hay nhấp nháy toàn bộ trang.
3. **Cho trước (Given)** kết nối WebSocket/SignalR bị ngắt tạm thời do mạng chập chờn, **Khi (When)** kết nối được thiết lập lại (reconnect), **Thì (Then)** hệ thống tự động gọi hàm đồng bộ nạp lại toàn bộ danh sách bàn mới nhất từ máy chủ.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Chuyển bàn khi bàn đích vừa bị chiếm (Target Table Concurrency Conflict)**: Khi hai nhân viên cùng lúc chọn chuyển hai nhóm khách khác nhau vào cùng một bàn trống, giao dịch của nhân viên gửi trước thành công; giao dịch của người sau bị máy chủ từ chối với thông báo thân thiện: *"Bàn đích đã có khách sử dụng, vui lòng chọn bàn trống khác!"* và làm mới danh sách bàn đích.
- **EC-002: Bàn ngồi quá 180 phút (Khách ngồi cực lâu)**: Khi khách dùng bữa vượt quá 3 giờ, hệ thống vẫn duy trì đếm giờ chính xác (ví dụ: `3 giờ 15 phút`), giữ badge cảnh báo `badge-meal-long` không bị tràn vỡ giao diện và không gây gián đoạn hệ thống.
- **EC-003: Chuyển bàn giữa hai bàn có sức chứa chênh lệch lớn**: Khi nhân viên chuyển một đoàn khách 8 người vào bàn chỉ có 2 chỗ ngồi, hệ thống hiển thị cảnh báo xác nhận: *"Sức chứa bàn mới (2 chỗ) nhỏ hơn sức chứa bàn cũ (8 chỗ). Bạn có chắc chắn muốn chuyển không?"* để nhân viên cân nhắc kê thêm ghế hoặc chọn bàn lớn hơn.
- **EC-004: Kết nối SignalR bị mất khi đang đếm giờ dùng bữa**: Timer đếm giờ client dựa trên mốc tuyệt đối `occupiedTime` (DateTime) nhận từ máy chủ thay vì cộng dồn số giây tại client. Nhờ đó, dù client bị mất mạng hoặc đóng trình duyệt mở lại, số phút dùng bữa vẫn hiển thị chuẩn xác 100% so với giờ thực tế.
- **EC-005: Xóa bàn đang phục vụ hoặc đang có đơn hàng**: Hệ thống chặn hoàn toàn thao tác xóa đối với bàn đang `OCCUPIED` hoặc bàn có đơn hàng lịch sử liên kết để bảo toàn dữ liệu tài chính, hiển thị thông báo giải thích chi tiết.
- **EC-006: Khóa khu vực khi có bàn đang phục vụ khách**: Khi quản lý bấm khóa khu vực (Disable Dining Area), nếu khu vực có bàn đang có khách ngồi ăn, hệ thống hiển thị cảnh báo danh sách các bàn đang bận và yêu cầu phục vụ xong trước khi khóa toàn bộ khu vực.

---

## 4. Yêu cầu Hệ thống (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI tái thiết kế giao diện `/tables` (Quản trị sơ đồ bàn) và `/waiter/tables` (Vận hành phục vụ bàn) tuân thủ bảng màu nhận diện Cam & Trắng đặc trưng của Acme.TooHungry (màu chủ đạo `#EA580C`, nền xám nhạt `#F8FAFC`, thẻ trắng `#FFFFFF`, bo góc mềm `rounded-2xl`).
- **FR-002**: Hệ thống PHẢI lưu trữ và đồng bộ trường `OccupiedTime` (DateTime nullable) trên thực thể `RestaurantTable` mỗi khi bàn chuyển sang trạng thái `OCCUPIED`.
- **FR-003**: Khi bàn chuyển từ `OCCUPIED` sang trạng thái khác (`AVAILABLE`, `CLEANING`, `DISABLED`), hệ thống PHẢI tự động đặt `OccupiedTime = null`.
- **FR-004**: Cả hai màn hình `/tables` và `/waiter/tables` PHẢI tích hợp bộ đếm giờ phản ứng (Signal Timer) cập nhật định kỳ mỗi 30 giây, tính toán thời lượng dùng bữa dựa trên `OccupiedTime`.
- **FR-005**: Thẻ bàn PHẢI hiển thị thời lượng dùng bữa bằng định dạng `{X} phút` (khi < 60 phút) hoặc `{H} giờ {M} phút` (khi $\ge$ 60 phút).
- **FR-006**: Hệ thống PHẢI hỗ trợ 2 cấp độ cảnh báo thời gian dùng bữa:
  - Mức 1 ($\ge$ 60 phút): Kích hoạt kiểu hiển thị `badge-meal-warning` (nền vàng nhạt, chữ vàng đậm, icon đồng hồ) nhắc nhở chăm sóc khách.
  - Mức 2 ($\ge$ 90 phút): Kích hoạt kiểu hiển thị `badge-meal-long` (nền đỏ nhạt, chữ đỏ đậm, icon đồng hồ cát nhấp nháy nhẹ) cảnh báo bàn ngồi lâu.
- **FR-007**: Hệ thống PHẢI cung cấp hộp thoại Kết thúc bữa ăn `EndMealModal` tích hợp Card Timeline tiến trình gồm 3 mốc: `Giờ nhận bàn (Seated At) → Thời lượng (Elapsed) → Giờ kết thúc (Ended At)`.
- **FR-008**: Khi bàn kết thúc bữa ăn không có đơn hàng mở (`hasActiveOrder = false`), `EndMealModal` PHẢI hiển thị nút `[Xác nhận trả bàn trống]` để giải phóng bàn về `AVAILABLE`.
- **FR-009**: Khi bàn kết thúc bữa ăn có đơn hàng mở (`hasActiveOrder = true`), `EndMealModal` PHẢI hiển thị nút `[Chuyển sang Thanh toán →]` điều hướng sang `/payment/:orderId` (RM-016), bàn vẫn giữ `OCCUPIED` cho đến khi thanh toán thành công.
- **FR-010**: Hệ thống PHẢI cung cấp tính năng Chuyển bàn (`TransferTableModal`):
  - Cho phép chọn Bàn đích từ danh sách bàn trống (`AVAILABLE`).
  - Chuyển `ActiveOrderId` sang Bàn đích.
  - Chuyển `OccupiedTime` sang Bàn đích và đặt Bàn đích sang `OCCUPIED`.
  - Nếu Bàn nguồn đã có đơn hàng/dùng món: Chuyển Bàn nguồn sang `CLEANING` và đặt `OccupiedTime = null`.
  - Nếu Bàn nguồn chưa có đơn hàng: Chuyển Bàn nguồn thẳng về `AVAILABLE` và đặt `OccupiedTime = null`.
- **FR-011**: Hệ thống PHẢI hỗ trợ tính năng Gộp bàn: Gộp toàn bộ món ăn từ đơn hàng bàn phụ sang đơn hàng bàn chính, đóng đơn hàng bàn phụ, tính tổng tiền cho 1 hóa đơn duy nhất và giải phóng bàn phụ về `CLEANING`.
- **FR-011b**: Cả hai màn hình `/waiter/tables` và `/tables` PHẢI hiển thị trực tiếp các nút thao tác `[Chuyển bàn]` và `[Gộp bàn]` trên thẻ bàn `OCCUPIED` để cả Waiter và Manager đều có thể thực hiện nhanh chóng.
- **FR-012**: Màn hình `/tables` PHẢI hỗ trợ chuyển đổi linh hoạt 1 chạm giữa hai chế độ xem: `Floor Plan Grid` (Sơ đồ mặt bằng trực quan) và `List View` (Bảng danh sách chi tiết Datatable).
- **FR-013**: Khối thống kê nhanh mặt bằng (Floor Summary Indicators) PHẢI cung cấp 6 thẻ chỉ số (Tổng số, Trống, Đang có khách, Đã đặt, Đang dọn, Tạm ngưng) và hỗ trợ bấm lọc tức thì theo trạng thái tương ứng.
- **FR-014**: Thanh điều hướng khu vực (Dining Area Tabs) PHẢI hiển thị danh sách các khu vực đang hoạt động kèm badge số lượng bàn trực thuộc.
- **FR-015**: Màn hình `/tables` PHẢI hỗ trợ các thao tác quản trị: Thêm bàn mới, Chỉnh sửa thông tin bàn, Xóa bàn an toàn, Khóa/Mở bàn riêng lẻ, và Khóa/Mở hàng loạt bàn theo khu vực.
- **FR-016**: Toàn bộ các sự kiện thay đổi trạng thái bàn, đón khách, chuyển bàn, dọn bàn xong PHẢI được phát tức thì qua SignalR `TableHub` đến tất cả các máy khách đang kết nối.
- **FR-017**: Kiến trúc mã nguồn PHẢI tách rời các modal lớn thành các Sub-component độc lập (`TableTransferModalComponent`, `TableEndMealModalComponent`, `TableFormModalComponent`, `DiningAreaModalComponent`), loại bỏ mã nguồn nhân bản giữa `/tables` và `/waiter/tables`.
- **FR-018**: Toàn bộ 100% chuỗi văn bản, tiêu đề, nhãn trạng thái, thông báo xác nhận và tooltip PHẢI được quốc tế hóa đầy đủ trong cả hai tệp `vi.json` và `en.json`.
- **FR-019**: Toàn bộ các phần tử tương tác trên thiết bị cảm ứng (Tablet/POS/Mobile) PHẢI đạt kích thước vùng chạm tối thiểu 44 × 44 pixel.

---

### Yêu cầu Phi chức năng & Hiệu năng (Non-Functional Requirements)

- **NFR-001 (Thời gian Phản hồi Giao diện)**: Thời gian chuyển đổi giữa chế độ `Floor Plan` và `List View` không vượt quá 100 mili-giây.
- **NFR-002 (Độ trễ Đồng bộ Thời gian thực)**: Sự kiện SignalR cập nhật trạng thái bàn và thời gian dùng bữa phải phản ánh lên màn hình các máy khách khác trong thời gian dưới 1 giây.
- **NFR-003 (Hiệu năng Render Danh sách lớn)**: Sử dụng cơ chế Angular Signals kết hợp `trackBy` / `@for (track table.id)` đảm bảo render mượt mà danh sách lên đến 200 bàn ăn mà không gây giật khung hình (60 FPS).
- **NFR-004 (Bảo toàn Toàn vẹn Dữ liệu)**: Nghiệp vụ Chuyển bàn và Gộp bàn phải được thực thi trong một Database Transaction nguyên tử (Atomic Unit of Work), đảm bảo không bao giờ xảy ra tình trạng mất đơn hàng hoặc bàn bị kẹt trạng thái.
- **NFR-005 (Trải nghiệm Cảm ứng & Responsive)**: Giao diện hiển thị hoàn hảo trên các độ phân giải từ Mobile (375px), Tablet dọc (768px), Tablet ngang / POS (1024px), đến Màn hình máy tính lớn (1920px).
- **NFR-006 (Độ chính xác Bộ đếm giờ)**: Timer phía Client dựa trên mốc thời gian tuyệt đối `OccupiedTime` từ Server, đảm bảo sai số đếm giờ dưới 1 giây bất kể mạng chập chờn.

---

## 5. Các Thực thể & Giao diện Chính (Key Entities & Interfaces)

### Mô hình Thực thể Bàn ăn Cập nhật (`RestaurantTable`)
```csharp
public class RestaurantTable : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; } = 4;
    public TableStatus Status { get; set; } = TableStatus.Available;
    public Guid? DiningAreaId { get; set; }
    public DiningArea? DiningArea { get; set; }
    public string? Location { get; set; }

    // Reservation info (RM-009)
    public string? ReservedCustomerName { get; set; }
    public string? ReservedCustomerPhone { get; set; }
    public DateTime? ReservedTime { get; set; }
    public int? ReservedGuestCount { get; set; }
    public string? ReservedNote { get; set; }

    /// <summary>
    /// Thời điểm bàn bắt đầu có khách ngồi (Occupied) để tính thời gian dùng bữa
    /// </summary>
    public DateTime? OccupiedTime { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<TableReservation> Reservations { get; set; } = new List<TableReservation>();
}
```

### Các DTOs Mở rộng cho Chuyển bàn & Gộp bàn
```csharp
public class TransferTableInputDto
{
    public Guid SourceTableId { get; set; }
    public Guid TargetTableId { get; set; }
    public string? Note { get; set; }
}

public class MergeTablesInputDto
{
    public Guid PrimaryTableId { get; set; }
    public List<Guid> SecondaryTableIds { get; set; } = new();
    public string? Note { get; set; }
}
```

### Hợp đồng Giao diện Dịch vụ Bàn (`ITableAppService`)
```csharp
public interface ITableAppService : IApplicationService
{
    Task<TableDto> GetAsync(Guid id);
    Task<PagedResultDto<TableDto>> GetListAsync(GetTablesInput input);
    Task<TableDto> CreateAsync(CreateUpdateTableDto input);
    Task<TableDto> UpdateAsync(Guid id, CreateUpdateTableDto input);
    Task<TableDto> ChangeStatusAsync(Guid id, TableStatus status);
    Task DeleteAsync(Guid id);
    Task SetAreaTablesStatusAsync(Guid diningAreaId, TableStatus status);
    
    // Mở rộng cho RM-017:
    Task<TableDto> TransferTableAsync(TransferTableInputDto input);
    Task<TableDto> MergeTablesAsync(MergeTablesInputDto input);
}
```

### Giao diện Tín hiệu Realtime SignalR (`ITableRealtimeNotifier`)
```csharp
public interface ITableRealtimeNotifier
{
    Task NotifyTableStatusChangedAsync(
        Guid tableId, 
        TableStatus newStatus, 
        string? tableName = null, 
        Guid? diningAreaId = null, 
        DateTime? occupiedTime = null);
        
    Task NotifyTableOrderUpdatedAsync(
        Guid tableId, 
        bool hasActiveOrder, 
        Guid? activeOrderId = null);
}
```

---

## 6. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% bàn ở trạng thái `OCCUPIED` trên cả `/tables` và `/waiter/tables` hiển thị chính xác thời lượng dùng bữa tính từ `OccupiedTime` và tự động cập nhật mỗi 30 giây mà không cần tải lại trang.
- **SC-002**: 100% bàn có thời gian dùng bữa $\ge$ 90 phút hiển thị badge cảnh báo `badge-meal-long` nổi bật để nhân viên nhận diện ngay lập tức.
- **SC-003**: Thao tác Chuyển bàn (`Transfer Table`) chuyển giao thành công toàn bộ Đơn hàng và `OccupiedTime` từ bàn nguồn sang bàn đích, đồng thời giải phóng bàn nguồn sang `CLEANING` trong dưới 500 mili-giây.
- **SC-004**: Hộp thoại Kết thúc bữa ăn `EndMealModal` hiển thị đầy đủ Timeline 3 mốc và phân định chính xác 100% giữa bàn có order (chuyển sang thanh toán RM-016) và bàn không order (trả bàn trống về `AVAILABLE`).
- **SC-005**: Màn hình Quản trị `/tables` hỗ trợ chuyển đổi mượt mà giữa Sơ đồ bàn (Floor Plan Grid) và Danh sách (List View) với độ trễ render dưới 100ms.
- **SC-006**: Sự kiện SignalR cập nhật trạng thái bàn được đồng bộ đến tất cả các thiết bị đang mở trong vòng dưới 1 giây.
- **SC-007**: 100% các chuỗi văn bản giao diện hiển thị chuẩn xác cả Tiếng Việt và Tiếng Anh thông qua `vi.json` và `en.json`.
- **SC-008**: Mã nguồn `TableComponent` được chuẩn hóa, tái cấu trúc thành các sub-component chuyên biệt, giảm kích thước file nguyên khối xuống dưới 800 dòng.

---

## 7. Các Giả định & Ràng buộc (Assumptions & Constraints)

### Giả định (Assumptions):
- Thiết bị vận hành tại bàn của nhân viên chủ yếu là Tablet (iPad / Android) hoặc màn hình cảm ứng POS tại quầy.
- Trạng thái `OccupiedTime` được quản lý thống nhất theo giờ hệ thống của máy chủ.
- Tính năng Thanh toán đơn hàng độc lập RM-016 đã hoàn thiện và tiếp nhận điều hướng từ hộp thoại kết thúc bữa ăn của bàn.

### Ràng buộc (Constraints):
- Tuân thủ nghiêm ngặt bảng màu thương hiệu Cam & Trắng đặc trưng (`#EA580C`, Clean Slate `#F8FAFC`, White `#FFFFFF`).
- Mọi văn bản hiển thị trên giao diện bắt buộc phải có đầy đủ bản dịch trong cả `vi.json` và `en.json`.
- Đảm bảo tính tương thích ngược với các API bàn hiện có mà RM-008, RM-009, RM-010 và RM-015 đang sử dụng.
- Kích thước vùng bấm chạm trên màn hình cảm ứng tối thiểu là 44 × 44 pixel.
