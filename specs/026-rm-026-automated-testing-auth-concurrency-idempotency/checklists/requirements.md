# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-026 Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến (Automated Testing: Auth, Concurrency & Idempotency)

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau bước lập đặc tả (`/speckit.specify`) trước khi chuyển sang giai đoạn làm rõ chi tiết (`/speckit.clarify`) hoặc lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày lập**: 2026-10-23  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không có chi tiết triển khai tầng quá thấp rò rỉ vào kịch bản người dùng (tập trung vào giá trị vận hành và trải nghiệm: hệ thống vận hành tin cậy, không bị trừ kho lặp lại gây thất thoát tài sản, không crash 500 khi giờ cao điểm nhiều nhân viên phục vụ cùng tạo đơn, và bảo vệ an toàn 100% dữ liệu nhạy cảm trước người dùng thiếu quyền hạn).
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của Nhà hàng (Chủ nhà hàng, Kế toán, Thủ kho, Nhân viên phục vụ, Kỹ sư phần mềm & QA).
- [x] Diễn đạt rõ ràng, mạch lạc, phù hợp cho cả các bên liên quan kỹ thuật và phi kỹ thuật.
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án Acme.TooHungry.

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn thẻ [NEEDS CLARIFICATION] nào chưa được giải quyết (đã làm rõ 4 quyết định kỹ thuật nền tảng: Giả lập runtime auth testing qua claims/scope, kiểm thử tương tranh SQLite In-Memory qua DI scopes độc lập, ma trận assertion bất biến cho thanh toán và trừ kho, chuẩn hóa test hồi quy cho chuyển bàn/gộp bàn/kiểm kê).
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ (FR-001 đến FR-022).
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-006).
- [x] Tiêu chí thành công độc lập với chi tiết công nghệ nội bộ.
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then cho 5 User Stories.
- [x] Các trường hợp biên (Edge Cases: EC-001 đến EC-005) đã được nhận diện và định nghĩa cách thức ứng phó rõ ràng.
- [x] Phạm vi phân hệ được phân định rõ ràng (Bảo mật thời gian chạy ABP, Tương tranh tạo đơn và trừ kho, Luồng nghiệp vụ trọng yếu Chuyển/Gộp bàn/Kiểm kê, và Thuật toán FEFO).
- [x] Các phụ thuộc (RM-022, RM-023, RM-024, RM-025) và giả định đã được xác định rõ ràng.

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-022) đều có kịch bản chấp nhận tương ứng.
- [x] Kịch bản người dùng bao quát toàn bộ các luồng trọng yếu:
  1. Kiểm thử phân quyền thời gian chạy ABP (`MediaController`, `DailyMenuAppService`, `RecipeController.by-dish`, `TableOrderController.complete`, `OrderAppService.Delete`, `DishCategoryAppService.Delete`) và ma trận quyền vai trò (Waiter, InventoryKeeper).
  2. Kiểm thử tính bất biến (Idempotency) khi hoàn tất đơn hàng và thanh toán, khẳng định kho không bao giờ bị trừ 2 lần (triệt tiêu Backend #1).
  3. Kiểm thử tương tranh tạo đơn đồng thời trên cùng bàn (chống race condition, không ném HTTP 500 - triệt tiêu Backend #12) và tương tranh khấu trừ kho FEFO (triệt tiêu Backend #5).
  4. Kiểm thử hồi quy các luồng vận hành trọng yếu: Chuyển bàn (`TransferTableAsync`), Gộp bàn (`MergeTablesAsync` bảo toàn ghi chú và giá niêm yết CSDL - triệt tiêu Backend #16), Hủy đơn (`CancelActiveOrderAsync`) và Cân đối kiểm kê (`StockAdjustment` tính đúng giá vốn và hạn dùng theo StorageType - triệt tiêu Backend #25).
  5. Kiểm thử thuật toán xuất kho theo hạn sử dụng (FEFO đa lô hàng).
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-006).
- [x] Tuân thủ nghiêm ngặt Hiến pháp dự án Acme.TooHungry (DDD, ABP Layering, Non-blocking Async, Concurrency, Auditing, i18n).

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-026 đã hoàn tất thành công cả hai bước lập đặc tả (`/speckit.specify RM-026`) và làm rõ yêu cầu chuyên sâu (`/speckit.clarify RM-026`) ngày 23-10-2026 với 4 quyết định chốt hạ (ClaimsPrincipal & Fake Scope cho Runtime Auth testing, Ném `TooHungry:Order:AlreadyCompleted` cho Idempotency, DI Scope độc lập qua `IServiceScopeFactory` cho Concurrency test trong SQLite In-Memory, và chuẩn hóa cộng dồn + đồng bộ giá CSDL + ghép Note cho luồng Gộp bàn).
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Toàn bộ yêu cầu và thiết kế đã hoàn toàn sáng tỏ và sẵn sàng 100% cho việc lập kế hoạch kiến trúc chi tiết (`/speckit.plan RM-026`).
