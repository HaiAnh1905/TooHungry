# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-017 Làm lại trang Quản lý bàn (Table Management Redesign)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-16  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào hành vi và trải nghiệm quản lý bàn, đón khách, chuyển bàn, kết thúc bữa ăn của nhân viên phục vụ / quản lý)
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (theo dõi thời gian dùng bữa real-time, cảnh báo bàn ngồi quá 90 phút, timeline bữa ăn trực quan, chuyển bàn & gộp bàn mượt mà, sơ đồ mặt bằng trực quan)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (quản lý nhà hàng, nhân viên phục vụ, thu ngân)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn bất kỳ dấu [NEEDS CLARIFICATION] / [CẦN LÀM RÕ] nào chưa được giải quyết (đã làm rõ 5 quyết định kiến trúc & vận hành then chốt trong phiên 16-10-2026)
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-008)
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 6 User Stories
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (xung đột bàn đích khi chuyển bàn, khách ngồi quá 180 phút, chênh lệch sức chứa, mất kết nối SignalR, khóa khu vực có khách)
- [x] Phạm vi phân hệ được phân định rõ ràng giữa Vận hành bàn (`/waiter/tables`), Quản trị mặt bằng (`/tables`), Gọi món (RM-010), Thanh toán (RM-016), và Đặt bàn (RM-009)
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-019) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính:
  1. Thẻ bàn hiện đại & Đồng bộ thời gian dùng bữa Real-Time (`OccupiedTime`, cảnh báo $\ge 90$ phút)
  2. Hộp thoại kết thúc bữa ăn `EndMealModal` với Timeline trực quan 3 mốc
  3. Chuyển bàn (`TransferTableModal`) chuyển đổi đơn hàng và thời gian dùng bữa
  4. Gộp bàn phục vụ đoàn khách lớn
  5. Nâng cấp giao diện Quản trị `/tables` (Floor Plan Grid & List View, Thống kê 6 chỉ số, Lọc khu vực)
  6. Đồng bộ SignalR toàn diện thời gian thực (`TableHub`)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-008)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-017 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify`) và làm rõ yêu cầu (`/speckit.clarify`) ngày 16-10-2026 với 5 quyết định kiến trúc & vận hành then chốt:
  1. **Đồng bộ nhận diện thương hiệu Cam & Trắng**: Phân định trải nghiệm giữa `/waiter/tables` (Touch-first, thẻ bàn thông minh) và `/tables` (Quản trị 2 chế độ Floor Plan Grid & Datatable List View).
  2. **Đồng bộ thời gian dùng bữa Real-Time**: Lưu mốc `OccupiedTime` từ Backend, đếm giờ phản ứng mỗi 30s tại Client, kích hoạt hệ thống cảnh báo 2 tầng: Mức 1 ($\ge$ 60 phút, vàng `badge-meal-warning`) và Mức 2 ($\ge$ 90 phút, đỏ cam `badge-meal-long`).
  3. **Nghiệp vụ Chuyển bàn & Gộp bàn an toàn**: 
     - *Chuyển bàn*: Chuyển giao toàn bộ đơn hàng và `OccupiedTime` sang bàn đích; bàn nguồn chuyển sang `CLEANING` nếu đã có order/dùng món, hoặc về `AVAILABLE` nếu chưa dùng món.
     - *Gộp bàn*: Chuyển toàn bộ món ăn từ bàn phụ sang bàn chính, đóng đơn hàng phụ và xuất 1 hóa đơn duy nhất tại RM-016.
     - *Phân quyền*: Cả Waiter và Manager đều có thể thao tác Chuyển bàn và Gộp bàn trực tiếp trên Thẻ bàn ở cả 2 màn hình.
  4. **Hộp thoại Kết thúc bữa ăn thông minh**: Timeline 3 mốc (`Seated At → Elapsed → Ended At`), tự động phân nhánh bàn không có order (trả bàn trống về `AVAILABLE`) và bàn có order (chuyển tiếp sang `/payment/:orderId` RM-016).
  5. **Tái cấu trúc mã nguồn**: Bóc tách các Sub-component và Modal dùng chung (`TableTransferModalComponent`, `TableEndMealModalComponent`, `TableFormModalComponent`, `DiningAreaModalComponent`), triệt tiêu trùng lặp mã nguồn giữa Admin và Waiter.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-017`).
