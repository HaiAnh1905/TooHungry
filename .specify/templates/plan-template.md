# Kế hoạch Triển khai (Implementation Plan): [FEATURE]

**Nhánh (Branch)**: `[###-feature-name]` | **Ngày**: [DATE] | **Đặc tả (Spec)**: [link]

**Đầu vào (Input)**: Đặc tả tính năng từ `/specs/[###-feature-name]/spec.md`

**Lưu ý**: Mẫu này được điền bởi lệnh `/speckit.plan`; định nghĩa của nó mô tả luồng thực thi.

## Tóm tắt (Summary)

[Trích xuất từ đặc tả tính năng: yêu cầu chính + phương pháp kỹ thuật từ nghiên cứu]

## Bối cảnh Kỹ thuật (Technical Context)

<!--
  YÊU CẦU HÀNH ĐỘNG: Thay thế nội dung trong phần này bằng các chi tiết kỹ thuật
  cho dự án. Cấu trúc ở đây được trình bày với vai trò tư vấn để hướng dẫn quá trình lặp.
-->

**Ngôn ngữ/Phiên bản**: [ví dụ: C# 13, .NET 10.0, Angular 19 hoặc CẦN LÀM RÕ]

**Dependencies chính**: [ví dụ: ABP Framework 9.x, EF Core hoặc CẦN LÀM RÕ]

**Lưu trữ**: [nếu có, ví dụ: PostgreSQL, SQL Server hoặc N/A]

**Kiểm thử**: [ví dụ: xUnit, Moq, Jasmine hoặc CẦN LÀM RÕ]

**Nền tảng đích**: [ví dụ: Web application, API Server hoặc CẦN LÀM RÕ]

**Loại dự án**: [ví dụ: web-service/spa-app/cli hoặc CẦN LÀM RÕ]

**Mục tiêu hiệu suất**: [theo domain, ví dụ: < 200ms phản hồi API hoặc CẦN LÀM RÕ]

**Ràng buộc**: [theo domain, ví dụ: Hỗ trợ I18n đầy đủ tiếng Việt và tiếng Anh hoặc CẦN LÀM RÕ]

**Quy mô/Phạm vi**: [theo domain, ví dụ: Quản lý hàng nghìn đơn vị hoặc CẦN LÀM RÕ]

## Kiểm tra Hiến pháp (Constitution Check)

*CỔNG: Phải vượt qua trước nghiên cứu Phase 0. Kiểm tra lại sau thiết kế Phase 1.*

[Các cổng được xác định dựa trên file constitution]

## Cấu trúc Dự án (Project Structure)

### Tài liệu (tính năng này)

```text
specs/[###-feature]/
├── plan.md              # File này (kết quả lệnh /speckit.plan)
├── research.md          # Kết quả Phase 0 (lệnh /speckit.plan)
├── data-model.md        # Kết quả Phase 1 (lệnh /speckit.plan)
├── quickstart.md        # Kết quả Phase 1 (lệnh /speckit.plan)
├── contracts/           # Kết quả Phase 1 (lệnh /speckit.plan)
└── tasks.md             # Kết quả Phase 2 (lệnh /speckit.tasks - KHÔNG được tạo bởi /speckit.plan)
```

### Mã nguồn (root repository)
<!--
  YÊU CẦU HÀNH ĐỘNG: Thay thế cây thư mục giả dưới đây bằng bố cục thực tế
  cho tính năng này. Xóa các tùy chọn không dùng và mở rộng cấu trúc đã chọn
  bằng các đường dẫn thực (ví dụ: src/Acme.TooHungry.Domain).
-->

```text
src/Acme.TooHungry.Domain/
├── [Entities]/
src/Acme.TooHungry.Application.Contracts/
├── [Dtos]/
src/Acme.TooHungry.Application/
├── [Services]/
src/Acme.TooHungry.EntityFrameworkCore/
angular/src/app/
├── [FeatureModule]/
```

**Quyết định Cấu trúc**: [Ghi chú lại cấu trúc được chọn và dẫn chiếu tới các thư mục thực đã được thu thập ở trên]

## Theo dõi Độ phức tạp (Complexity Tracking)

> **CHỈ ĐIỀN nếu Kiểm tra Hiến pháp có những vi phạm cần phải được biện minh**

| Vi phạm | Tại sao cần | Phương án Đơn giản hơn bị từ chối vì |
|-----------|------------|-------------------------------------|
| [ví dụ: Bỏ qua ABP Repository] | [Nhu cầu hiện tại] | [Tại sao Repository không đủ] |
