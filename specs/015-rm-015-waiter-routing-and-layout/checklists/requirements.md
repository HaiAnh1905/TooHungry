# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-015 Điều hướng & Bố cục Waiter

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau phiên làm rõ yêu cầu (`/speckit.clarify`) trước khi chuyển sang giai đoạn lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày cập nhật**: 2026-10-12  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào hành vi và trải nghiệm tác nghiệp của nhân viên phục vụ tại bàn)
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (vào ca nhanh, một chạm tới sơ đồ bàn, loại bỏ menu thừa gây phân tâm, thao tác cảm ứng tối ưu)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (quản lý nhà hàng, nhân viên phục vụ, quản trị viên)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn bất kỳ dấu [NEEDS CLARIFICATION] / [CẦN LÀM RÕ] nào chưa được giải quyết (đã hoàn thành phiên `/speckit.clarify` với 5 quyết định kiến trúc then chốt)
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-007)
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (mất phiên đăng nhập, xoay màn hình đột ngột, URL 404 trong cụm Waiter, ngoại lệ cho màn hình thanh toán toàn màn hình RM-016, tài khoản đa vai trò)
- [x] Phạm vi phân hệ được phân định rõ ràng giữa Điều hướng & Bố cục Waiter (RM-015), Sơ đồ bàn (RM-008), Gọi món (RM-010), Thanh toán (RM-016) và Đăng nhập (RM-001)
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-018) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính (Điều hướng sau đăng nhập, Bố cục 3 vùng Topbar/Sidebar/Content, Gác cổng bảo vệ cụm route, Sidebar ngữ cảnh động qua `WaiterSidebarService`, Lối tắt quay lại quản trị cho Admin/Manager, Tối ưu cảm ứng & responsive Drawer trên tablet)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-007)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-015 đã hoàn tất thành công phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 12-10-2026 với 5 quyết định kiến trúc then chốt:
  1. **Quản lý Sidebar ngữ cảnh động**: Áp dụng mô hình Service-driven Portal thông qua `WaiterSidebarService`; từng trang con (`/waiter/tables`, `/waiter/order/:tableId`) tự đăng ký và giải phóng template bộ lọc của mình.
  2. **Lối tắt Quản trị cho Manager/Admin**: Bổ sung nút `[Quay lại Quản trị]` ở góc phải thanh Topbar (chỉ hiển thị khi tài khoản có vai trò `Manager` hoặc `Administrator`) giúp chuyển đổi tức thì giữa 2 phân hệ.
  3. **Thông tin ca trực tự động trên Topbar**: Tự động tính toán ca trực theo giờ đồng hồ thực tế: Ca Sáng (09:00 - 15:00), Ca Tối (15:00 - 23:00), Ngoài ca trực (23:00 - 09:00) dựa theo giờ mở cửa chuẩn của nhà hàng.
  4. **Tách biệt Màn hình Thanh toán RM-016**: Cấu hình route độc lập cấp App (`/payment/:orderId`) sử dụng Standalone Layout riêng biệt, hoàn toàn không bị áp đặt Topbar hay Sidebar của Waiter Layout.
  5. **Responsive Drawer trên Tablet/Mobile (< 992px)**: Tự động chuyển đổi Sidebar thành Drawer/Offcanvas trượt mượt mà từ cạnh trái, mở qua nút `[Bộ lọc]` trên Topbar, hỗ trợ đóng qua backdrop và đảm bảo chuẩn touch target >= 44×44px.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-015`).
