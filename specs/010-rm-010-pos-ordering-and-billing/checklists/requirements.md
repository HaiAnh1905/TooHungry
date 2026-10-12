# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-010 POS / Đơn hàng

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả trước khi chuyển sang giai đoạn lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày tạo**: 2026-10-09  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật (ngôn ngữ lập trình, framework, schema DB thô) rò rỉ vào kịch bản người dùng
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (gọi món nhanh, chống âm kho, một active order duy nhất cho mỗi bàn)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (quản lý nhà hàng, nhân viên phục vụ, thu ngân)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn bất kỳ dấu [NEEDS CLARIFICATION] nào chưa được giải quyết
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (mất mạng, hết nguyên liệu, nhiều nhân viên thao tác đồng thời)
- [x] Phạm vi phân hệ được phân định rõ ràng giữa Gọi món POS (RM-010) và Thanh toán (RM-016), Quản lý bàn (RM-008), Công thức (RM-007)
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-018) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính (Điều hướng, Chọn món, Giỏ hàng Drawer, Kiểm tra tồn kho, Đặt/Cập nhật đơn, Tiếp tục đơn, Chuyển tiếp thanh toán)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-006)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-010 đã hoàn tất phiên làm rõ (`/speckit.clarify`) ngày 09-10-2026 với 5 quyết định kiến trúc then chốt:
  1. **Tồn kho**: Kiểm tra tồn khả dụng tức thời, không giữ chỗ kho cứng cho đơn `PENDING`, khấu trừ FEFO khi thanh toán (RM-016).
  2. **Ghi chú món**: Nhập trong Food Detail Modal và chỉnh sửa nhanh tại dòng món trong Order Drawer (`OrderItem.Note`).
  3. **Giỏ hàng rỗng**: Chặn nút `[Đặt đơn]` khi giỏ rỗng, cung cấp nút riêng `[Hủy đơn hàng]` chuyển đơn sang `CANCELLED`.
  4. **Realtime**: Phát tín hiệu SignalR (`NotifyTableOrderUpdatedAsync`) cập nhật `hasActiveOrder = true` trên sơ đồ bàn `/waiter/tables`.
  5. **Tìm kiếm món**: Trang bị ô tìm kiếm nhanh client-side theo từ khóa tên món kết hợp cùng bộ lọc danh mục món trên Sidebar.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng cho bước `/speckit.plan RM-010`.
