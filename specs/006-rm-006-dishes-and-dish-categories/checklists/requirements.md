# Specification Quality Checklist: Quản lý Món ăn & Danh mục (Dishes) (RM-006)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details in core user requirements (focused on user value and business operations)
- [x] Focused on user value and business needs (quản lý thực đơn, thiết lập giá bán, danh mục món và liên kết bán hàng/công thức)
- [x] Written for non-technical stakeholders (dễ hiểu, rõ ràng cho quản lý nhà hàng và nhân viên vận hành)
- [x] All mandatory sections completed (Clarifications, User Scenarios, Requirements, Success Criteria, Assumptions)

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous (quy định rõ ràng về duy nhất tên món, kiểm tra giá bán không âm, ràng buộc xóa danh mục có món)
- [x] Success criteria are measurable (thời gian tạo món, độ trễ API tìm kiếm, kiểm toán auditing, tỷ lệ chặn lỗi trùng lặp)
- [x] Success criteria are technology-agnostic (đo lường kết quả nghiệp vụ từ góc nhìn người dùng)
- [x] All acceptance scenarios are defined (kịch bản Given-When-Then cho từng User Story)
- [x] Edge cases are identified (tên trùng dạng khoảng trắng thừa, xóa danh mục có món trực thuộc, giá bán = 0, ảnh lỗi tải dự phòng)
- [x] Scope is clearly bounded (quản lý danh mục & món ăn, phân quyền, tích hợp tải ảnh Cloudinary và gom nhóm POS)
- [x] Dependencies and assumptions identified (phụ thuộc RM-002 Shared UI, liên kết thuận nghịch với Recipe RM-007 và POS RM-011)

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows (CRUD Danh mục, CRUD Món ăn, Tìm kiếm/Lọc/Sắp xếp, Upload ảnh, POS Menu)
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Đặc tả RM-006 đã được chuẩn hóa và hoàn tất phiên làm rõ (`/speckit.clarify`) vào ngày 08-10-2026 với các quyết định kiến trúc then chốt:
  1. **Toàn vẹn Dữ liệu Danh mục**: Nghiêm cấm xóa danh mục món ăn nếu đang có ít nhất một món ăn trực thuộc liên kết; bắt buộc điều chuyển món sang danh mục khác trước khi xóa.
  2. **Thứ tự hiển thị Danh mục (`DisplayOrder`)**: Bổ sung trường `DisplayOrder` (kiểu `int`, mặc định 0) cho `DishCategory` để chủ động sắp xếp thứ tự hiển thị trên Tab và thực đơn POS theo ý muốn (Khai vị → Món chính → Tráng miệng → Đồ uống).
  3. **Đơn giá và Trạng thái**: Đơn giá (`Price`) là giá gộp (Gross Price - đã bao gồm thuế VAT và phí); thuộc tính `IsActive` cho phép bật/tắt bán món linh hoạt mà không ảnh hưởng đến đơn hàng lịch sử.
  4. **Thao tác Hàng loạt (Bulk Actions)**: Bổ sung thanh thao tác hàng loạt (Bulk Actions Bar) khi chọn checkbox nhiều món để Bật/Tạm ngưng phục vụ đồng loạt khi hết hàng hoặc chuyển ca.
  5. **Mã món & Phạm vi Combo**: Giữ cấu trúc Entity tinh gọn, tìm kiếm theo Tên món (không tạo cột Code riêng); chỉ quản lý Món ăn đơn lẻ (`Single Dish`), các gói Combo/Set được phân định sang phase Thực đơn ngày/POS.
  6. **Kiểm toán Xóa Món ăn**: Thao tác xóa món áp dụng cơ chế Soft Delete và bắt buộc nhập lý do xóa (`DeletionReason`) nhằm phục vụ đối soát, đồng thời tự động cập nhật ghi chú trên các mục `DailyMenuItem` tương ứng.
  7. **Tải và Hiển thị Ảnh**: Hỗ trợ tải ảnh lên Cloudinary CDN hoặc dán liên kết ảnh trực tiếp, có khung xem trước và hình ảnh thay thế dự phòng (Fallback Placeholder).
- Đạt 100% chất lượng kiểm định, sẵn sàng chuyển sang bước `/speckit.plan RM-006`.
