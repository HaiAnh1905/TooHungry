# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-013 Tồn kho - Khóa/Khôi phục

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau phiên làm rõ yêu cầu (`/speckit.clarify`) trước khi chuyển sang giai đoạn lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày cập nhật**: 2026-10-12  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật rò rỉ vào kịch bản người dùng (tập trung vào hành vi người dùng, an toàn bếp và kho)
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (chống xuất nhầm nguyên liệu hỏng/ngừng dùng, chặn POS bán món thiếu nguyên liệu, lưu vết kiểm toán)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (quản lý nhà hàng, bếp trưởng, thủ kho, nhân viên order)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn bất kỳ dấu [NEEDS CLARIFICATION] / [CẦN LÀM RÕ] nào chưa được giải quyết (đã hoàn thành phiên `/speckit.clarify` với 5 câu hỏi quyết định)
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (đơn hàng POS dở dang, mặt hàng còn tồn kho > 0, món ăn trong Daily Menu, tạm khóa lô hàng duy nhất, concurrency)
- [x] Phạm vi phân hệ được phân định rõ ràng giữa Quản lý Kho RM-013, Giao dịch Kho RM-011, UI Redesign RM-012, Nguyên liệu RM-005, và Món ăn RM-006
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-020) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính (Vô hiệu hóa item kèm lý do & cascade, Kích hoạt lại item, Tạm khóa/khôi phục lô hàng kèm lý do, Màn hình `/ingredients/deactivated`, Khôi phục thông minh khi thiết lập tồn kho)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-006)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-013 đã hoàn tất thành công phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 12-10-2026 với 5 quyết định kiến trúc then chốt:
  1. **Xử lý đơn POS dở dang (Active Orders)**: Khi nguyên liệu/món ăn bị vô hiệu hóa, chỉ chặn gọi món mới trên POS; các đơn dở dang tại bàn vẫn được hoàn tất và thanh toán bình thường (FR-016).
  2. **Hiển thị & Bộ lọc Tab 1 (Kho)**: Mặc định Tab 1 chỉ hiển thị mặt hàng đang hoạt động; bổ sung bộ lọc 3 trạng thái (`Đang hoạt động`, `Đã tạm ngưng / Khóa`, `Tất cả`) trên thanh công cụ để người dùng chủ động xem khi cần (FR-005).
  3. **Tạm khóa Lô hàng (`InventoryBatch`)**: Modal tạm khóa tích hợp danh mục lý do mẫu (Chờ kiểm định chất lượng, Nghi ngờ biến chất/hư hỏng, Lỗi quy cách đóng gói, Khác) và ghi chú chi tiết, lưu vào `InventoryBatch.DeactivationReason` (FR-009).
  4. **Phân cấp Quyền hạn (ABP Permissions)**: Vô hiệu hóa mặt hàng (ảnh hưởng dây chuyền đến Recipe/Dish) chỉ dành cho `Manager` và `Admin`; Tạm khóa/khôi phục lô hàng cho phép cả `WarehouseKeeper`, `Manager` và `Admin` để kịp thời cách ly hàng lỗi (FR-018).
  5. **Chỉ báo Giao diện Recipe & Dish**: Hiển thị huy hiệu `[Chứa nguyên liệu tạm ngưng]` trên danh sách và highlight dòng nguyên liệu trong modal kèm tooltip giải thích lý do (FR-017).
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước `/speckit.plan RM-013`.
