# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-020 Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-19  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào hành vi và trải nghiệm nhìn thấy thông tin cảnh báo, tìm kiếm mã lô, thao tác 1 chạm và bố cục chuyên biệt).
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế tại quầy kho nhà hàng (thao tác nhanh, không bị phân tâm bởi menu quản trị cồng kềnh, phân loại bảo quản lạnh/đông/khô, kiểm soát hạn dùng FEFO).
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (chủ nhà hàng, quản lý vận hành, thủ kho).
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án.

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ.
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-007).
- [x] Tiêu chí thành công độc lập với công nghệ.
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 6 User Stories.
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (mất mạng khi ở trong kho lạnh kín, quét nhầm mã lạ, tài khoản đa vai trò, tích hợp phục hồi RM-019).
- [x] Phạm vi phân hệ được phân định rõ ràng giữa cụm tuyến đường `/inventory-keeper/*` và các phân hệ quản trị khác (`/inventory`, `/tables`, `/waiter`).
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng (RM-001, RM-002, RM-003, RM-011, RM-012, RM-013, RM-015, RM-019).

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-015) đều có kịch bản chấp nhận tương ứng.
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính:
  1. Thủ kho (`InventoryStaff`) đăng nhập thành công và tự động vào `/inventory-keeper/dashboard`.
  2. Cấu trúc bố cục 3 vùng độc lập (Topbar, Contextual Sidebar, Main Content) hiển thị tối giản, sạch sẽ.
  3. Bộ gác cổng `inventoryKeeperAuthGuard` bảo vệ an toàn phân hệ, từ chối các vai trò không liên quan.
  4. Thanh Sidebar ngữ cảnh động hỗ trợ tìm kiếm tức thì, quét mã vạch và lọc theo nhiệt độ bảo quản.
  5. Thao tác 1 chạm tại quầy kho: Nhập lô mới, Xuất hủy lô hết hạn, Khóa/Mở khóa lô (RM-013).
  6. Khả năng tương thích thiết bị cầm tay với Drawer trượt Offcanvas và chuẩn chạm ngón tay >= 44×44px.
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-007).
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ.

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-020 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify`) và làm rõ yêu cầu (`/speckit.clarify RM-020`) ngày 19-10-2026 với 6 quyết định kiến trúc & vận hành then chốt:
  1. **Tuyến đường cơ sở & 3 phân hệ con**: `/inventory-keeper/dashboard` (Tổng quan & FEFO), `/inventory-keeper/batches` (Danh mục lô & Thao tác 1 chạm), `/inventory-keeper/transactions` (Nhật ký biến động & Kiểm kê), giữ nguyên trang `/inventory` cũ cho cấp Quản lý.
  2. **Cơ chế Quét mã vạch kép linh hoạt**: Tự động nhận diện súng quét mã vạch HID (USB/Bluetooth) kết hợp hộp thoại quét Camera HTML5 trên máy tính bảng/di động.
  3. **Cơ chế đồng bộ số liệu cảnh báo Topbar**: Tải dữ liệu ban đầu khi vào ca, tự động làm mới tức thì (reactive event) sau mỗi thao tác nhập/xuất/khóa/kiểm kê, kèm nút `[Làm mới]` thủ công.
  4. **Bộ gác cổng `inventoryKeeperAuthGuard` & Điều hướng vai trò**: Tự động đưa `InventoryStaff` vào `/inventory-keeper/dashboard` sau đăng nhập; bảo vệ cụm route an toàn tuyệt đối.
  5. **Tương thích màn hình cảm ứng & Drawer trượt Offcanvas**: Tối ưu cho thiết bị cầm tay kiểm kê tại quầy kho (< 992px), touch target >= 44×44px.
  6. **Đồng bộ với Phục hồi điều hướng RM-019 & Quốc tế hóa 100%**: Đưa người dùng về `/inventory-keeper/dashboard` khi gặp sự cố lỗi; 100% chuỗi văn bản song ngữ `vi.json` và `en.json`.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-020`).

