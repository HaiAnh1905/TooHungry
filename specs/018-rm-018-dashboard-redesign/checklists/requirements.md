# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-018 Làm mới trang Dashboard (Dashboard Redesign)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-16  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào hành vi và trải nghiệm quan sát số liệu kinh doanh, chỉ số vận hành, sơ đồ bàn, biểu đồ doanh thu theo giờ và top món bán chạy của quản lý nhà hàng)
- [x] Tập trung vào giá trị người dùng và nhu cầu điều hành thực tế của nhà hàng (nắm bắt doanh thu và đơn hàng hôm nay, tỷ lệ lấp đầy bàn ăn, kiểm soát nguyên liệu thiếu hụt, truy cập tác vụ nhanh)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (chủ nhà hàng, quản lý ca, thu ngân, bếp trưởng)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-008)
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 7 User Stories
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (ngày mới mở chưa có đơn hàng, tỷ lệ bàn khi không có bàn, kho không có cảnh báo, xung đột realtime khi thanh toán, điều hướng vai trò bởi `dashboardGuard`, mất kết nối mạng)
- [x] Phạm vi phân hệ được phân định rõ ràng giữa Dashboard tổng quan (`/`), Quản trị bàn (`/tables`), Gọi món POS (`/waiter/order`), Quản lý kho (`/inventory`), và Món ăn (`/dishes`)
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-013) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính:
  1. Thẻ chỉ số KPI vận hành hôm nay (Doanh thu, Đơn hàng, Tỷ lệ lấp đầy bàn, Cảnh báo kho)
  2. Biểu đồ doanh thu & nhịp độ đơn hàng theo khung giờ hoạt động (09:00 - 23:00)
  3. Danh sách Top 5 món ăn bán chạy nhất (Best Sellers) kèm xếp hạng #1-#5
  4. Sơ đồ bàn ăn thu nhỏ trực tiếp (Live Table Status Summary & Multi-segment Progress Bar)
  5. Đơn hàng gần đây & Widget cảnh báo kho thông minh (FEFO cận hạn dùng / hết hàng)
  6. Khối lối tắt vận hành nhanh (Quick Actions)
  7. Trạm Vào Ca Nội Bộ (Terminal Mode) cho nhân viên chưa đăng nhập (Đồng hồ số thời gian thực, Giờ mở cửa)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-008)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-018 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify`) và làm rõ yêu cầu (`/speckit.clarify`) ngày 16-10-2026 với 4 quyết định kiến trúc & vận hành then chốt:
  1. **Giải pháp Biểu đồ Chart.js Dual-axis**: Tích hợp `chart.js` hiển thị biểu đồ 2 trục tung kết hợp (Bar cột doanh thu VND màu cam `#EA580C` và Line đường uốn cong số lượng đơn hàng), tooltip responsive chi tiết và animation mượt mà.
  2. **Bộ lọc thời gian linh hoạt (Mặc định 7 ngày gần đây & Date Range Picker)**: Mặc định hiển thị dữ liệu 7 ngày gần nhất, hỗ trợ thanh công cụ chuyển đổi nhanh `[Hôm nay]`, `[Hôm qua]`, `[7 ngày gần nhất]` và bộ chọn khoảng ngày tùy chỉnh (`GetDashboardInput`).
  3. **Cập nhật dữ liệu Realtime kết hợp SignalR & Refresh thủ công**: Lắng nghe sự kiện `tableStatusChanged` từ `TableHub` và sự kiện thanh toán hoàn tất từ `OrderHub` để cập nhật tức thì thẻ KPI, biểu đồ và sơ đồ bàn, đồng thời duy trì nút `[Làm mới]` thủ công.
  4. **Phân quyền và Bảo vệ vai trò (`dashboardGuard`)**: Chỉ `Manager` và `Administrator` được truy cập Dashboard trung tâm. Các vai trò khác tự động chuyển hướng vào màn hình chuyên môn (`Waiter` -> `/waiter/tables`, `InventoryStaff` -> `/inventory`, `Cashier` -> `/tables`). Khi chưa đăng nhập hiển thị màn hình Trạm Vào Ca Nội Bộ.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-018`).
