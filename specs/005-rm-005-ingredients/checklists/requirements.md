# Specification Quality Checklist: Quản lý Nguyên liệu (Ingredients) (RM-005)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Đặc tả RM-005 đã hoàn thành đầy đủ phiên làm rõ (`/speckit.clarify`) vào ngày 08-10-2026 với 5 quyết định kiến trúc then chốt:
  1. **Khóa Đơn vị tính (`BaseUnit`)**: Bị vô hiệu hóa không cho sửa một khi nguyên liệu đã phát sinh lô tồn kho hoặc đã được gắn vào công thức món ăn (muốn đổi phải Tạm ngưng và tạo mới).
  2. **Đơn giá tham khảo (`EstimatedPrice`)**: Bổ sung trường tùy chọn trong `Ingredient` để hỗ trợ tính giá vốn lý thuyết cho công thức món ăn (RM-007); giá vốn thực tế vẫn do các lô kho ở RM-012 quản lý.
  3. **Ranh giới Master Data**: RM-005 tuyệt đối không có ô nhập số lượng tồn kho ban đầu; toàn bộ số lượng và lô kho bắt buộc phải tạo qua phiếu nhập kho theo lô ở RM-012.
  4. **Tồn kho an toàn (`CurrentStock`)**: Chỉ tính tổng các lô kho còn hạn sử dụng; nếu có lô hết hạn, hiển thị thêm chỉ báo cảnh báo lô quá hạn riêng biệt.
  5. **Mặc định hiển thị**: Bảng danh sách nguyên liệu mặc định chỉ hiển thị các mặt hàng Đang hoạt động (`IsActive = true`) và cung cấp bộ lọc linh hoạt ("Đang dùng", "Tạm ngưng", "Tất cả").
- Sẵn sàng 100% để chuyển sang giai đoạn `/speckit.plan RM-005`.
