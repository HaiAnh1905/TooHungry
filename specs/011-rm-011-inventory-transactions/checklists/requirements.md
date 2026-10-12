# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-011 Quản lý Tồn kho & Giao dịch

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả trước khi chuyển sang giai đoạn lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày tạo**: 2026-10-09  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật rò rỉ vào kịch bản người dùng (tập trung vào hành vi người dùng, giá trị nghiệp vụ kho)
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (chống thất thoát, quản lý hạn dùng an toàn thực phẩm, kiểm kê minh bạch)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (quản lý nhà hàng, thủ kho, kế toán)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn bất kỳ dấu [NEEDS CLARIFICATION] nào chưa được giải quyết
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (lô quá hạn FRESH, xuất kho thiếu hàng, kiểm kê chênh lệch thừa/thiếu, quy đổi đơn vị không tròn)
- [x] Phạm vi phân hệ được phân định rõ ràng giữa Quản lý Kho RM-011, Nguyên liệu Master Data RM-005, Đơn hàng POS RM-010, và UI Redesign RM-012
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-019) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính (Nhập kho theo lô, Xuất kho FEFO, Lịch sử giao dịch, Kiểm kê điều chỉnh, Cảnh báo hạn dùng, Tiêu hủy lô)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-006)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-011 đã hoàn tất thành công phiên làm rõ (`/speckit.clarify`) ngày 09-10-2026 với 5 quyết định kiến trúc then chốt:
  1. **Kiểm soát tương tranh (Concurrency Control)**: Áp dụng Optimistic Concurrency Control qua `ConcurrencyStamp` trên `InventoryBatch`, tự động retry tối đa 3 lần tại Application layer khi có xung đột giữa nhiều đơn hàng thanh toán đồng thời (FR-019).
  2. **Cảnh báo hàng tươi sống trong ngày**: Bổ sung mức cảnh báo `EXPIRING_TODAY` cho đồ tươi (`StorageType.FRESH`) hết hạn trong 24h và tự động đưa lên vị trí ưu tiên xuất FEFO số 1 (FR-012).
  3. **Lưu vết giá vốn đích danh**: Bổ sung trường `UnitCost` vào thực thể `InventoryTransaction` để lưu lại đơn giá vốn của lô tại thời điểm xuất/nhập/điều chỉnh, phục vụ tính COGS chuẩn xác (FR-009, FR-015).
  4. **Vòng đời hàng quá hạn**: Lô quá hạn tự động loại khỏi FEFO và bật cảnh báo `EXPIRED`, nhưng giữ nguyên tồn kho để kiểm đếm thực tế; bắt buộc thủ kho/quản lý bấm Discard thủ công kèm lý do để ghi nhận biên bản xuất hủy `ADJUSTMENT_OUT` (FR-013).
  5. **Phân quyền nghiêm ngặt**: Chỉ tài khoản vai trò Quản lý (`Manager`) và Quản trị viên (`Admin`) mới có quyền thực hiện Điều chỉnh kiểm kê (`Inventories.Adjust`) và Tiêu hủy lô (`Inventories.Discard`); nhân viên thông thường chỉ có quyền Xem và Nhập kho (FR-018).
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng cho bước `/speckit.plan RM-011`.
