# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-016 Thanh toán đơn hàng (Payment Page)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau phiên làm rõ yêu cầu (`/speckit.clarify`) trước khi chuyển sang giai đoạn lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày cập nhật**: 2026-10-12  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào hành vi và trải nghiệm thu tiền, đối soát hóa đơn của nhân viên phục vụ / thu ngân)
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (minh bạch hóa đơn, tính tiền thối tự động, mã VietQR quét liền tay, in hóa đơn nhiệt K80, chuyển trạng thái bàn sang Cleaning)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (quản lý nhà hàng, nhân viên phục vụ, thu ngân)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn bất kỳ dấu [NEEDS CLARIFICATION] / [CẦN LÀM RÕ] nào chưa được giải quyết (đã hoàn thành phiên `/speckit.clarify` ngày 12-10-2026 với 4 quyết định kiến trúc then chốt)
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-008)
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (mã đơn không tồn tại 404, chống thanh toán trùng lặp qua API `CompletePaymentAsync`, đơn đã hủy, đơn không có món ăn, đổi phương thức thanh toán giữa chừng, rớt mạng khi thanh toán)
- [x] Phạm vi phân hệ được phân định rõ ràng giữa Thanh toán (RM-016), Gọi món (RM-010), Bố cục Waiter (RM-015), Sơ đồ bàn & Dọn bàn (RM-008), và Trừ kho FEFO (RM-011)
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-018) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính (Xem hóa đơn 60%, Tiền mặt & tiền thối tự động, Quét mã VietQR động, Xác nhận thanh toán qua `CompletePaymentAsync` & chuyển trạng thái kép, In hóa đơn nhiệt K80, Phân quyền truy cập & guard)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-008)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-016 đã hoàn tất thành công phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 12-10-2026 với 4 quyết định kiến trúc then chốt:
  1. **API chuyên biệt `CompletePaymentAsync`**: Xây dựng endpoint `POST /api/app/order/{id}/complete-payment` nhận `CompletePaymentInputDto` (`PaymentMethod`, `CashGiven`, `PaymentNote`), cập nhật Order `COMPLETED`, Table `CLEANING`, trừ kho FEFO và broadcast SignalR trong 1 transaction an toàn.
  2. **Tổng tiền đơn hàng**: Giữ nguyên tắc tính tổng tiền theo tổng các món ăn (`TotalAmount = sum(Quantity * UnitPrice)`), hoãn áp dụng VAT và giảm giá sang phân hệ nâng cao.
  3. **Cấu hình VietQR tập trung**: Đặt thông tin tài khoản ngân hàng thụ hưởng tại `environment.vietQrConfig` (frontend), áp dụng cơ chế xác nhận thủ công bởi nhân viên.
  4. **Trải nghiệm sau thanh toán (View Mode)**: Giữ tại trang ở chế độ Đã thanh toán, khóa form thu tiền, làm nổi bật hai nút `[In hóa đơn]` và `[← Quay lại danh sách bàn]` để nhân viên chủ động xử lý, không tự động chuyển trang gây mất kiểm soát.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-016`).
