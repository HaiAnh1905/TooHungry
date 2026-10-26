# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-021 Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-20  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào giá trị trải nghiệm: hiển thị KPI rõ ràng, phân loại FEFO trực quan, thao tác nhanh trên từng lô và bố cục hiện đại).
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của Quản lý nhà hàng và Admin (kiểm soát tài chính kho, ngăn ngừa thất thoát, cảnh báo hạn dùng kịp thời, không bị rối mắt bởi giao diện monolithic cũ).
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (chủ nhà hàng, quản lý vận hành, kế toán kho).
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án.

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ.
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-007).
- [x] Tiêu chí thành công độc lập với công nghệ.
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 6 User Stories.
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (nguyên liệu chưa từng nhập kho, lô hết hạn đúng hôm nay, xung đột dữ liệu realtime, xóa nguyên liệu đang có liên kết, kiểm kê số âm).
- [x] Phạm vi phân hệ được phân định rõ ràng giữa màn hình quản trị `/inventory` (Dashboard Layout) và phân hệ quầy kho `/inventory-keeper` (RM-020).
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng (RM-001, RM-002, RM-003, RM-005, RM-011, RM-012, RM-013, RM-014, RM-018, RM-019, RM-020).

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-015) đều có kịch bản chấp nhận tương ứng.
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính:
  1. Thẻ KPI Bento Grid & Băng rôn cảnh báo tồn kho ghim đầu trang.
  2. Quản lý danh mục nguyên liệu với thanh tiến trình trực quan (Visual Stock Progress Bar).
  3. Quản lý danh mục lô hàng với Badge hạn dùng FEFO thời gian thực và thao tác 1 chạm (Khóa, Mở khóa, Xuất hủy).
  4. Nhật ký giao dịch xuất nhập tồn bất biến và biên bản cân đối kiểm kê kho thực tế.
  5. Tối ưu hóa toàn diện 4 modal nghiệp vụ kho theo chuẩn thiết kế Bento hiện đại.
  6. Kết nối đề xuất nhập hàng từ module Dự báo (RM-014) và nút lối tắt sang Phân hệ Thủ kho (RM-020).
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-007).
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ.

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-021 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify`) và làm rõ yêu cầu (`/speckit.clarify RM-021`) ngày 20-10-2026 với 4 quyết định kiến trúc & trải nghiệm then chốt:
  1. **Cấu trúc Tab & Đồng bộ Query Param**: Giữ route chính `/inventory?tab=ingredients|batches|transactions`, phân rã thành các sub-components độc lập (`InventoryKpiBar`, `InventoryAlertsBanner`, `InventoryIngredientTab`, `InventoryBatchTab`, `InventoryTransactionTab`) hỗ trợ bookmark và chia sẻ liên kết trực tiếp.
  2. **Theo dõi Lô hàng (Batches View) & FEFO Timeline**: Bảng Bento Card hiện đại với thanh đếm ngược hạn dùng FEFO trực quan, phân màu cảnh báo (Xanh/Cam/Đỏ/Tím) và thanh tác vụ nhanh 1 chạm trên từng dòng (Khóa lô RM-013, Mở khóa, Xuất hủy).
  3. **Tích hợp Dự báo nhu cầu (RM-014)**: Thẻ tiện ích Bento thông minh (`Replenishment Insights Widget`) hiển thị Top nguyên liệu dự báo thiếu trong 7 ngày tới kèm nút 1-click mở modal nhập lô điền sẵn số lượng.
  4. **Chuẩn hóa Modal theo Bento Design System**: Tái thiết kế toàn diện 4 Modal (`CreateBatchModal`, `DiscardBatchModal`, `StockAdjustmentModal`, `IngredientBatchesModal`) theo chuẩn Cam & Trắng `#EA580C`, bo góc `rounded-2xl`, validate realtime, chia sẻ dùng chung cho cả `/inventory` và `/inventory-keeper`.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-021`).

