# Hiến pháp (Constitution) [TÊN DỰ ÁN]
<!-- Ví dụ: Spec Constitution, TaskFlow Constitution, v.v. -->

## Các Nguyên tắc Cốt lõi (Core Principles)

### [TÊN_NGUYÊN_TẮC_1]
<!-- Ví dụ: I. Ưu tiên Thư viện (Library-First) -->
[MÔ_TẢ_NGUYÊN_TẮC_1]
<!-- Ví dụ: Mọi tính năng đều bắt đầu như một thư viện độc lập; Các thư viện phải khép kín, có thể kiểm thử độc lập, được tài liệu hóa; Yêu cầu mục đích rõ ràng - không có thư viện chỉ mang tính tổ chức -->

### [TÊN_NGUYÊN_TẮC_2]
<!-- Ví dụ: II. Giao diện CLI (CLI Interface) -->
[MÔ_TẢ_NGUYÊN_TẮC_2]
<!-- Ví dụ: Mọi thư viện đều bộc lộ chức năng qua CLI; Giao thức văn bản vào/ra: stdin/args → stdout, lỗi → stderr; Hỗ trợ JSON + các định dạng dễ đọc cho người -->

### [TÊN_NGUYÊN_TẮC_3]
<!-- Ví dụ: III. Kiểm thử Trước (Test-First) (KHÔNG THỂ THƯƠNG LƯỢNG) -->
[MÔ_TẢ_NGUYÊN_TẮC_3]
<!-- Ví dụ: Bắt buộc áp dụng TDD: Viết test → Người dùng phê duyệt → Test thất bại → Sau đó mới code; Chu trình Red-Green-Refactor được thi hành nghiêm ngặt -->

### [TÊN_NGUYÊN_TẮC_4]
<!-- Ví dụ: IV. Kiểm thử Tích hợp (Integration Testing) -->
[MÔ_TẢ_NGUYÊN_TẮC_4]
<!-- Ví dụ: Các khu vực trọng tâm yêu cầu kiểm thử tích hợp: Contract test cho thư viện mới, Thay đổi hợp đồng, Giao tiếp giữa các dịch vụ, Các lược đồ chung -->

### [TÊN_NGUYÊN_TẮC_5]
<!-- Ví dụ: V. Khả năng Quan sát (Observability), VI. Phiên bản & Thay đổi Phá vỡ (Versioning & Breaking Changes), VII. Sự Đơn giản (Simplicity) -->
[MÔ_TẢ_NGUYÊN_TẮC_5]
<!-- Ví dụ: I/O dạng văn bản đảm bảo khả năng debug; Yêu cầu logging có cấu trúc; Hoặc: định dạng MAJOR.MINOR.BUILD; Hoặc: Bắt đầu đơn giản, nguyên tắc YAGNI -->

## [TÊN_PHẦN_2]
<!-- Ví dụ: Các Ràng buộc Bổ sung, Yêu cầu Bảo mật, Tiêu chuẩn Hiệu suất, v.v. -->

[NỘI_DUNG_PHẦN_2]
<!-- Ví dụ: Yêu cầu về tech stack, tiêu chuẩn tuân thủ, chính sách triển khai, v.v. -->

## [TÊN_PHẦN_3]
<!-- Ví dụ: Quy trình Phát triển (Development Workflow), Quy trình Đánh giá (Review Process), Cổng Chất lượng (Quality Gates), v.v. -->

[NỘI_DUNG_PHẦN_3]
<!-- Ví dụ: Yêu cầu đánh giá code, các cổng kiểm thử, quy trình phê duyệt triển khai, v.v. -->

## Quản trị (Governance)
<!-- Ví dụ: Hiến pháp cao hơn tất cả các thực tiễn khác; Sửa đổi yêu cầu tài liệu hóa, phê duyệt, kế hoạch chuyển đổi -->

[CÁC_QUY_TẮC_QUẢN_TRỊ]
<!-- Ví dụ: Tất cả các PRs/reviews phải xác minh sự tuân thủ; Sự phức tạp phải được biện minh; Sử dụng [FILE_HƯỚNG_DẪN] cho các hướng dẫn phát triển trong lúc thực thi -->

**Phiên bản (Version)**: [PHIÊN_BẢN_HIẾN_PHÁP] | **Ngày phê chuẩn (Ratified)**: [NGÀY_PHÊ_CHUẨN] | **Lần sửa cuối (Last Amended)**: [NGÀY_SỬA_ĐỔI_CUỐI]
<!-- Ví dụ: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->
