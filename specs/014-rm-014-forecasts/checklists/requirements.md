# Danh sách Kiểm tra Chất lượng Đặc tả (Specification Quality Checklist): RM-014 Dự báo Nhu cầu & Kế hoạch Nguyên liệu

**Mục đích**: Xác thực tính đầy đủ và chất lượng của đặc tả sau phiên làm rõ yêu cầu (`/speckit.clarify`) trước khi chuyển sang giai đoạn lập kế hoạch chi tiết (`/speckit.plan`).  
**Ngày cập nhật**: 2026-10-14  
**Tính năng**: [spec.md](../spec.md)

## Chất lượng Nội dung (Content Quality)

- [x] Không để rò rỉ chi tiết triển khai kỹ thuật tầng thấp vào kịch bản người dùng (tập trung vào giá trị nghiệp vụ quản lý dự báo, nhu cầu nguyên liệu và gợi ý mua hàng)
- [x] Tập trung vào giá trị người dùng và nhu cầu vận hành thực tế của nhà hàng (chống thiếu hụt món, kiểm soát lãng phí nguyên vật liệu tươi sống, tối ưu chi phí mua hàng)
- [x] Diễn đạt rõ ràng, phù hợp cho cả các bên liên quan phi kỹ thuật (Giám đốc, Bếp trưởng, Thủ kho, Quản trị viên)
- [x] Đã hoàn thành 100% tất cả các phần bắt buộc theo mẫu hiến pháp dự án

## Tính Đầy đủ của Yêu cầu (Requirement Completeness)

- [x] Không còn bất kỳ dấu [NEEDS CLARIFICATION] / [CẦN LÀM RÕ] nào chưa được giải quyết (đã hoàn thành phiên `/speckit.clarify` ngày 14-10-2026 với 3 quyết định kiến trúc & vận hành then chốt)
- [x] Các yêu cầu có thể kiểm thử độc lập và không mơ hồ
- [x] Tiêu chí thành công có thể đo lường định lượng và định tính cụ thể (SC-001 đến SC-006)
- [x] Tiêu chí thành công độc lập với công nghệ
- [x] Tất cả các kịch bản chấp nhận (Acceptance Scenarios) đều được định nghĩa đầy đủ theo chuẩn Given/When/Then
- [x] Các trường hợp biên (Edge Cases) đã được nhận diện và xử lý (dữ liệu lịch sử rỗng, món chưa có công thức, công thức nhiều phiên bản, tồn kho âm/bằng 0, khoảng thời gian không hợp lệ)
- [x] Ranh giới phạm vi được phân định rõ ràng giữa Dự báo (RM-014), Đơn hàng POS (RM-010), Kho theo lô (RM-011) và Thanh toán (RM-016)
- [x] Các phụ thuộc và giả định đã được xác định rõ ràng

## Tính Sẵn sàng của Tính năng (Feature Readiness)

- [x] Tất cả các yêu cầu chức năng (FR-001 đến FR-013) đều có kịch bản chấp nhận tương ứng
- [x] Kịch bản người dùng bao quát toàn bộ các luồng chính (Sinh dự báo từ lịch sử theo SMA, Bóc tách định lượng nguyên liệu theo công thức, Đối soát tồn kho & Gợi ý mua hàng, Phân tích Doanh thu/Food Cost %, Quản lý danh sách & Xuất Excel / In phiếu A4)
- [x] Tính năng đáp ứng đầy đủ các kết quả đầu ra trong Tiêu chí thành công (SC-001 đến SC-006)
- [x] Không để rò rỉ chi tiết triển khai kỹ thuật vào phần đặc tả nghiệp vụ

## Ghi chú & Đánh giá (Notes)

- Đặc tả RM-014 đã hoàn tất thành công phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 14-10-2026 với 3 quyết định kiến trúc then chốt:
  1. **Thuật toán dự báo số lượng món ăn**: Áp dụng Trung bình động đơn giản (SMA) với tùy chọn cửa sổ phân tích 7, 14 hoặc 30 ngày từ các đơn hàng `Completed`. Làm tròn trần `Ceiling` cho kỳ dự báo $N$ ngày và cho phép Bếp trưởng điều chỉnh thủ công.
  2. **Cơ chế lưu trữ Kế hoạch nguyên liệu (`IngredientPlan`)**: Tự động sinh đồng thời và lưu trữ thực thể `IngredientPlan` & `IngredientPlanItem` trong DB gắn với `DemandForecast`. Quản lý vòng đời trạng thái (`Draft` -> `Approved` -> `Completed`).
  3. **Phạm vi xuất báo cáo**: Hỗ trợ đầy đủ cả 2 phương thức: Xuất file Excel (`.xlsx`) danh sách mua hàng hoàn chỉnh và In ấn phiếu A4 chuẩn bị bếp (CSS Print) tối ưu kiểm đếm kho.
- Trạng thái kiểm định: **ĐẠT 100% (16/16 tiêu chí PASS)**. Sẵn sàng 100% cho bước lập kế hoạch chi tiết (`/speckit.plan RM-014`).
