# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-019 Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-19  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào hành vi và trải nghiệm nhìn thấy thông báo lỗi thân thiện, đồng hồ đếm ngược 5 giây và nút quay về trang của người dùng).
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (nhân viên phục vụ không bị kẹt trang lỗi, quản lý nhanh chóng quay lại Dashboard, bảo mật không lộ stack trace).
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (chủ nhà hàng, quản lý ca, nhân viên phục vụ bàn).
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án.

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ.
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-007).
- [x] Tiêu chí thành công độc lập với công nghệ.
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 6 User Stories.
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (người dùng có nhiều vai trò đồng thời, mất mạng hoàn toàn, chuyển tab trình duyệt khiến đếm ngược bị lệch).
- [x] Phạm vi phân hệ được phân định rõ ràng giữa trang lỗi 404, 403, 500/505 và các không gian làm việc (`/waiter/tables`, `/`, `/inventory`, `/tables`).
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng (RM-001, RM-002, RM-003, RM-015, RM-018).

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-012) đều có kịch bản chấp nhận tương ứng.
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính:
  1. Waiter gặp lỗi 404 và tự động quay về `/waiter/tables` sau 5s.
  2. Người dùng bị từ chối quyền 403 từ `smartPermissionGuard` và tự động quay về trang tương ứng.
  3. Quản lý / Admin chỉ quay về Dashboard nếu có quyền xem Dashboard (`TooHungry.Dashboard`), ngược lại về trang nghiệp vụ đầu tiên được cấp quyền (`/tables`, `/orders`...).
  4. Lỗi máy chủ 500 / 505 hiển thị Trace ID an toàn kèm nút sao chép và nút thử lại.
  5. Tương tác tạm dừng đếm ngược (nút Pause hoặc hover) và tiếp tục đếm ngược.
  6. Khách chưa đăng nhập quay về trang đăng nhập hoặc trạm vào ca.
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-007).
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ.

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-019 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify`) và làm rõ yêu cầu (`/speckit.clarify RM-019`) ngày 19-10-2026 với 6 quyết định kiến trúc & vận hành then chốt:
  1. **Kiến trúc màn hình lỗi toàn trang (Full-page Error Layout)**: Sử dụng layout riêng biệt (`eLayoutType.empty`) cho `/error/403`, `/error/500` và 404 Wildcard để đảm bảo tính nhất quán, sang trọng và không bị xung đột với các widget điều hành.
  2. **Bộ nút hành động chính & phụ đầy đủ**: Nút chính `[Quay về trang chính của tôi]` (định tuyến theo vai trò), kèm nút phụ `[Quay lại trang trước]` (Browser Back an toàn) và nút `[Thử lại]` (cho lỗi 500/505).
  3. **Thanh tiến trình đếm ngược 5 giây trực quan (Linear Progress Bar)**: Co dần từ 100% về 0% mượt mà phía trên nút bấm; hỗ trợ nút `[Tạm dừng]`, tự dừng khi rê chuột (hover) và khi chuyển tab (`document.hidden`).
  4. **Quy tắc phân giải trang làm việc theo vai trò & thẩm quyền (Role & Permission Resolution)**:
     - `Waiter` -> `/waiter/tables`.
     - `Manager`/`Admin`: Chỉ về `/` nếu **có quyền** `TooHungry.Dashboard`; nếu **không có quyền** sẽ định tuyến về trang nghiệp vụ đầu tiên được phân quyền (`/tables`, `/orders`, `/dishes`, `/inventory`...) để tránh vòng lặp lỗi 403.
     - `Cashier` -> `/tables`, `InventoryStaff` -> `/inventory`, Khách -> `/account/login` hoặc `/`.
  5. **Thiết kế Bento Card hiện đại chuẩn nhận diện Cam & Trắng (`#EA580C`)**: Minh họa Vector SVG riêng cho từng mã lỗi (Bàn trống / Ổ khóa / Dây cáp gián đoạn), bo góc lớn `rounded-2xl`, responsive tối ưu mọi thiết bị.
  6. **100% Quốc tế hóa (i18n)**: Toàn bộ từ điển lỗi, thông điệp đếm ngược và nhãn các nút được khai báo song ngữ Tiếng Việt (`vi.json`) và Tiếng Anh (`en.json`).
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-019`).
