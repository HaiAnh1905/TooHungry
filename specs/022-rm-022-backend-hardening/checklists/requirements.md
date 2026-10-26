# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-022 Ổn định hóa & Vá lỗi Nghiêm trọng Backend (Backend Data Integrity & Concurrency Hardening)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-22  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai kỹ thuật tầng thấp rò rỉ vào kịch bản người dùng (tập trung vào giá trị trải nghiệm & độ tin cậy vận hành: tính đúng tiền, chống thất thoát kho, bàn ăn chính xác, không sập server khi nhiều người đặt đơn đồng thời).
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của Nhà hàng (Quản lý, Bếp, Thu ngân, Tiếp tân, Kế toán kho).
- [x] Diễn đạt rõ ràng, mạch lạc, phù hợp cho cả các bên liên quan kỹ thuật và phi kỹ thuật.
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án.

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn thẻ [NEEDS CLARIFICATION] nào chưa được giải quyết (đã làm rõ và thống nhất 10 quyết định kiến trúc then chốt tại phần Clarifications).
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ (FR-001 đến FR-018).
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-007).
- [x] Tiêu chí thành công độc lập với chi tiết công nghệ nội bộ.
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 6 User Stories.
- [x] Các trường hợp biên (Edge Cases: EC-001 đến EC-008) đã được nhận diện và định nghĩa cách thức ứng phó rõ ràng.
- [x] Phạm vi phân hệ được phân định rõ ràng (Backend Data Integrity & Concurrency Hardening, không thay đổi UI Angular).
- [x] Các phụ thuộc (RM-008, RM-009, RM-010, RM-011, RM-014) và giả định đã được xác định rõ ràng.

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-018) đều có kịch bản chấp nhận tương ứng.
- [x] Kịch bản người dùng bao quát toàn bộ các luồng trọng yếu:
  1. Khấu trừ kho chính xác 1 lần duy nhất và đóng băng đơn hàng đã Hoàn tất/Đã hủy (`Order.Complete()`, `Order.Cancel()`).
  2. Tính toán đơn giá phía máy chủ, triệt tiêu lỗ hổng Client tự đặt giá và thắt chặt validation DTO.
  3. Chống Race Condition tạo đơn bàn ăn bằng Filtered Unique Index, loại bỏ Mass Assignment tại `TableDtos.cs`, gửi SignalR sau commit, và gộp bàn an toàn bảo toàn ghi chú.
  4. Sửa công thức tính tồn kho trong dự báo (bỏ nhân `ConversionFactor` 2 lần), cài đặt State Machine cho kế hoạch nguyên liệu và chống crash trùng món.
  5. Chuẩn hóa vòng đời đặt bàn (chỉ khóa Reserved trước 60 phút), kiểm tra trạng thái khi Check-In, thống nhất khung giờ mở cửa và múi giờ UTC (`Clock.Now`).
  6. Chuẩn hóa lô hàng điều chỉnh kiểm kê tăng và tính bất biến dữ liệu kho.
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-007).
- [x] Tuân thủ nghiêm ngặt Hiến pháp dự án Acme.TooHungry (DDD, ABP Layering, Unit of Work, Auditing, i18n).

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-022 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify RM-022`) và làm rõ yêu cầu chuyên sâu (`/speckit.clarify RM-022`) ngày 22-10-2026 với 5 quyết định tương tác & 10 định hướng kỹ thuật then chốt giải quyết dứt điểm 15 lỗi nghiêm trọng từ `CODE_REVIEW.md`.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-022`).
