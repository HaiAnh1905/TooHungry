# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-025 Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code (Database Query Optimization & Clean Code)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-23  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai tầng quá thấp rò rỉ vào kịch bản người dùng (tập trung vào giá trị vận hành và trải nghiệm: hệ thống phản hồi nhanh, không bị nghẽn luồng worker, phân trang kho mượt mà, thông báo lỗi song ngữ chuẩn xác, mã nguồn sạch sẽ không chứa mật khẩu rác).
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của Nhà hàng (Quản lý nhà hàng, Thủ kho, Nhân viên Thu ngân, Nhân viên Phục vụ bàn, Kỹ sư bảo trì hệ thống Backend/Frontend).
- [x] Diễn đạt rõ ràng, mạch lạc, phù hợp cho cả các bên liên quan kỹ thuật và phi kỹ thuật.
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án Acme.TooHungry.

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn thẻ [NEEDS CLARIFICATION] nào chưa được giải quyết (đã làm rõ và thống nhất 6 trụ cột kỹ thuật then chốt tại phần Clarifications bao quát trọn vẹn 18 phát hiện kỹ thuật từ CODE_REVIEW.md được giao cho RM-025).
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ (FR-001 đến FR-030).
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-008).
- [x] Tiêu chí thành công độc lập với chi tiết công nghệ nội bộ.
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 6 User Stories.
- [x] Các trường hợp biên (Edge Cases: EC-001 đến EC-006) đã được nhận diện và định nghĩa cách thức ứng phó rõ ràng.
- [x] Phạm vi phân hệ được phân định rõ ràng (Tối ưu truy vấn EF Core, chống N+1, xóa blocking sync, thêm indexes, phân trang server kho, đóng gói Rich Domain Model, sinh mã an toàn chống trùng, chuẩn hóa Exception/Logging/i18n, tách tệp SRP, dọn dẹp file rác thư mục gốc và dead code Angular kèm TypeScript strict mode).
- [x] Các phụ thuộc (RM-004, RM-007, RM-011, RM-014, RM-018) và giả định đã được xác định rõ ràng.

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-030) đều có kịch bản chấp nhận tương ứng.
- [x] Kịch bản người dùng bao quát toàn bộ các luồng trọng yếu:
  1. Tối ưu hóa hiệu năng truy vấn và xử lý bất đồng bộ không chặn (Non-blocking Async, loại bỏ N+1 tại Forecast, Recipe, Order; chuyển đổi toàn bộ `.ToList()`/`.FirstOrDefault()` đồng bộ sang `AsyncExecuter`; bổ sung indexes).
  2. Phân trang máy chủ chuẩn mực cho lịch sử giao dịch kho (`GetTransactionsAsync`) và tối ưu hóa tính toán cảnh báo tồn kho (`GetAlertsAsync`).
  3. Đóng gói Rich Domain Model (đóng public setters, gom reset trạng thái bàn vào `table.Release()`, domain methods cho Order) và sinh mã nghiệp vụ an toàn kèm salt chống trùng trong 1 giây.
  4. Chuẩn hóa ngoại lệ nghiệp vụ, triệt tiêu 100% `UserFriendlyException` tiếng Việt hardcode sang `BusinessException` song ngữ, ghi log cảnh báo trên Dashboard, loại bỏ `dynamic`.
  5. Đơn trách nhiệm tệp mã nguồn (tách `DishAppServices.cs` và `ForecastAppServices.cs`), xóa bỏ tập tin rác ở thư mục gốc (`test.cs`, `Reflect.cs`...) và dọn dẹp 7 nhóm permission mồ côi.
  6. Chuẩn hóa kiến trúc Frontend Angular: dọn dead code, xóa `HttpClientModule` thừa, loại bỏ `console.error` và kích hoạt TypeScript Strict Mode.
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-008).
- [x] Tuân thủ nghiêm ngặt Hiến pháp dự án Acme.TooHungry (DDD, ABP Layering, Non-blocking Async, Auditing, i18n song ngữ `vi.json` và `en.json`, tài liệu Markdown bằng Tiếng Việt).

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-025 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify RM-025`) và làm rõ yêu cầu chuyên sâu (`/speckit.clarify RM-025`) ngày 23-10-2026 với 4 quyết định chốt hạ (Clone Snapshot cho Recipe Version History, Date-Time + Salt4 ngẫu nhiên cho mã đơn và mã lô, gỡ bỏ AutoInclude xuyên Aggregate, và kích hoạt TypeScript Strict Mode toàn diện trên Angular).
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Toàn bộ yêu cầu và thiết kế đã hoàn toàn sáng tỏ và sẵn sàng 100% cho việc lập kế hoạch kiến trúc chi tiết (`/speckit.plan RM-025`).
