<!--
Sync Impact Report:
- Version change: 1.2.0 → 1.3.0
- List of modified principles:
  - Translated all contents to Vietnamese.
  - Added VIII. Documentation Language (Ngôn ngữ tài liệu)
- Added sections:
  - Documentation Language (Ngôn ngữ tài liệu)
- Removed sections: None
- Follow-up TODOs: None
-->

# Hiến pháp Acme.TooHungry (Acme.TooHungry Constitution)

## Các Nguyên tắc Cốt lõi (Core Principles)

### I. Domain-Driven Design (DDD) & Cấu trúc phân lớp ABP
Mã nguồn BẮT BUỘC phải tuân thủ nghiêm ngặt các nguyên tắc của Domain-Driven Design theo cấu trúc của ABP Framework:
- **Tầng Domain (`Acme.TooHungry.Domain`)**: Chứa các thực thể cốt lõi (Core entities), Aggregate Roots, Domain Services, Value Objects, và Domain Events. Logic nghiệp vụ BẮT BUỘC phải nằm ở đây, tuyệt đối không đặt trong Application Services hoặc Controllers.
- **Tầng Application (`Acme.TooHungry.Application`)**: Điều phối use case, ánh xạ DTO (DTO mapping), và kiểm tra quyền (permission checks). Application services BẮT BUỘC phải điều phối các đối tượng domain và KHÔNG ĐƯỢC chứa các quy tắc nghiệp vụ hoặc các truy vấn cơ sở dữ liệu thô.
- **Tầng Infrastructure / Entity Framework Core (`Acme.TooHungry.EntityFrameworkCore`)**: Triển khai Repository, ánh xạ cơ sở dữ liệu, và cấu hình EF Core.
- **Tầng HTTP API (`Acme.TooHungry.HttpApi.Host`)**: Các endpoint REST API, định tuyến (routing), và middleware.

### II. UML & Sự đồng nhất của Domain Model
Bất kỳ sự sửa đổi hoặc bổ sung nào đối với các thực thể, mối quan hệ domain, ranh giới aggregate, và các quy trình nghiệp vụ nhà hàng (RMS) ĐỀU PHẢI nhất quán với các đặc tả mô hình trực quan của dự án (`RMS-TH.vpp`). Các quyết định về cấu trúc domain NÊN được đối chiếu với mô hình kiến trúc trước khi chốt migrations hoặc thiết kế API.

### III. Test-First & Cổng chất lượng tự động (KHÔNG THỂ THƯƠNG LƯỢNG)
Chất lượng và tính chính xác PHẢI được đảm bảo thông qua các bài kiểm thử tự động (automated tests):
- **Domain Tests (`Acme.TooHungry.Domain.Tests`)**: Các bất biến (Invariants), logic domain, và chuyển đổi trạng thái thực thể BẮT BUỘC phải có độ phủ unit test toàn diện.
- **Application Tests (`Acme.TooHungry.Application.Tests`)**: Luồng dịch vụ end-to-end và các cổng kiểm tra quyền BẮT BUỘC phải được xác minh qua integration tests.
- **Sửa lỗi (Bug Fixes) & Tái cấu trúc (Refactoring)**: Bất kỳ lỗi nào được báo cáo BẮT BUỘC phải được tái hiện bằng một bài test thất bại (failing test) trước khi viết mã sửa lỗi (chu trình Red-Green-Refactor).

### IV. Hợp đồng API nghiêm ngặt & Tích hợp Module Angular
- Các API được cung cấp bởi `HttpApi.Host` BẮT BUỘC phải được định kiểu mạnh (strongly typed), được tài liệu hóa qua Swagger/OpenAPI, và trả về cấu trúc response nhất quán của ABP.
- Client Angular (`angular/`) BẮT BUỘC phải sử dụng các service proxies và models được sinh tự động hoặc định kiểu mạnh. Nghiêm cấm các lời gọi HTTP ad-hoc trực tiếp không có kiểu dữ liệu hoặc bỏ qua các quy ước proxy của ABP.
- Các UI components BẮT BUỘC phải duy trì sự phân tách rõ ràng giữa logic giao diện, định tuyến (routing) và tương tác với service.

### V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy mặc định
- Tất cả các thực thể nghiệp vụ lưu trữ NÊN kế thừa từ các lớp base audited của ABP (ví dụ `FullAuditedAggregateRoot<Guid>`) để duy trì dấu vết kiểm toán (audit trails).
- Tất cả các endpoint của Application Service BẮT BUỘC phải được bảo vệ bằng các định nghĩa Quyền (Permission) rõ ràng của ABP (`[Authorize(...)]`).
- Xác thực và cấp phát token BẮT BUỘC phải tuân thủ nghiêm ngặt các cấu hình OpenIddict và các thực tiễn bảo mật tốt nhất.

### VI. Sự nhất quán của UI/UX & Hệ thống thiết kế (Giao diện Cam & Trắng)
Tất cả các thành phần frontend, đặc biệt là Dropdowns, Selects, và Popover Menus, BẮT BUỘC phải áp dụng nhất quán bộ nhận diện hình ảnh **Cam & Trắng** đặc trưng:
- **Bảng màu (Color Palette)**:
  - Nền/Bề mặt (Surface/Background): Màu trắng sạch và sắc nét (`#FFFFFF` hoặc trắng thẻ mềm) với các khung chứa góc bo tròn (`border-radius: 12px - 16px`) và hiệu ứng đổ bóng nổi nhẹ (`0 4px 20px rgba(0, 0, 0, 0.08)`).
  - Trạng thái Active / Selected: Tương phản nền màu đào/cam ấm nhẹ (ví dụ, `#FFF3E8` / `#FFEDD5`) với văn bản màu cam đậm và biểu tượng chevron/check đồng bộ (`#C85A17` / `#EA580C`).
  - Điểm nhấn chính & Icons: Cam sáng rực rỡ (`#EA580C` / `#F97316`) cho các dấu chấm trạng thái (status dots), biểu tượng (iconography), và các phần highlight.
  - Văn bản mặc định: Văn bản tối màu trung tính có độ tương phản cao (`#2D3748` / `#1F2937`) cho các mục mặc định/không hoạt động.
- **Tương tác vi mô (Micro-Interactions) & Bố cục**:
  - Khoảng cách giữa các mục BẮT BUỘC phải tạo cảm giác thoải mái (padding `8px 12px` đến `10px 14px`) với các góc của mục được bo tròn mềm mại (`border-radius: 8px`).
  - Các mục trạng thái (ví dụ: Pending, Processing, Completed, Cancelled) BẮT BUỘC phải bao gồm một chỉ báo hình ảnh trực quan (biểu tượng tròn hoặc huy hiệu) ở bên trái để dễ dàng quét nhanh.
  - Trạng thái di chuột (Hover states) BẮT BUỘC phải cung cấp sự chuyển tiếp nhẹ nhàng sang nền có tông màu ấm nhạt.

### VII. Quốc tế hóa & Nội địa hóa (I18N)
1. **Yêu cầu song ngữ:**
   - Tất cả các chuỗi văn bản (văn bản UI, nhãn, thông báo lỗi, nội dung phản hồi, tooltips) BẮT BUỘC phải hỗ trợ đầy đủ cả hai phiên bản ngôn ngữ: Tiếng Việt và Tiếng Anh.
   - Nghiêm cấm việc hardcode văn bản trực tiếp vào mã nguồn hoặc các UI templates.
2. **Quy ước về Cấu trúc & Lưu trữ:**
   - Dữ liệu ngôn ngữ BẮT BUỘC phải được chia thành hai tệp JSON tiêu chuẩn:
     - `vi.json`: Chứa tất cả các bản dịch Tiếng Việt.
     - `en.json`: Chứa tất cả các bản dịch Tiếng Anh.
   - Cấu trúc key-value giữa `vi.json` và `en.json` BẮT BUỘC phải đồng bộ 100% (cùng cấu trúc phân cấp key, cùng định dạng nội suy chuỗi nếu có).

### VIII. Ngôn ngữ Tài liệu (Documentation Language)
- Tất cả các tài liệu Markdown (.md) được tạo ra trong dự án này (bao gồm cả các file do Speckit tạo ra hoặc được cập nhật bằng tay) **BẮT BUỘC** phải sử dụng **Tiếng Việt**.
- Điều này áp dụng cho tất cả các bản đặc tả (specs), kế hoạch (plan), danh sách công việc (tasks), ghi chú nghiên cứu (research) và các file cấu hình hướng dẫn của Speckit.

## Tiêu chuẩn Công nghệ & Ràng buộc
- **Backend**: .NET 10.0+ SDK, C# 13+, ABP Framework 9.x+.
- **Truy cập Dữ liệu**: Entity Framework Core với Code-First migrations. Migrations BẮT BUỘC phải được thực thi và xác minh qua `Acme.TooHungry.DbMigrator`.
- **Frontend**: Angular (mẫu ABP Angular mới nhất), Node.js v18/v20, TypeScript, SCSS.
- **Identity & Auth**: OpenIddict với phương pháp tiếp cận chứng chỉ kép (ký & mã hóa) để sẵn sàng cho môi trường production.
- **Mô hình hóa & Tài liệu**: Visual Paradigm (`RMS-TH.vpp`) cho mô hình hóa domain; Tài liệu Markdown trong `.specify/` và thư mục gốc của repository.

## Quy trình Phát triển & Cổng Chất lượng
1. **Thực thi Dựa trên Đặc tả (Spec-Driven Execution)**: Việc triển khai tính năng, tái cấu trúc đáng kể, và các bổ sung kiến trúc BẮT BUỘC phải bắt đầu bằng các đặc tả rõ ràng (thông qua `/speckit.specify` và `/speckit.plan`).
2. **Quản trị Lược đồ Cơ sở dữ liệu**: Những thay đổi về lược đồ (schema) BẮT BUỘC phải tạo ra các EF Core migrations rõ ràng. Nghiêm cấm các sửa đổi SQL thô vào các bảng production mà không thông qua migrations.
3. **Phân tích Tĩnh (Static Analysis) & Code Style**: Code BẮT BUỘC phải tuân thủ các quy tắc trong tệp `.editorconfig` của dự án và các quy ước lập trình của ABP (đặt tên rõ ràng, xuyên suốt các pattern bất đồng bộ `async/await`).

## Quản trị (Governance)
- Hiến pháp này đóng vai trò là thỏa thuận có thẩm quyền cho mọi quyết định về kiến trúc và kỹ thuật trong `Acme.TooHungry`.
- Bất kỳ sửa đổi nào đối với các nguyên tắc này đều yêu cầu tài liệu hóa, đánh giá rõ ràng và tăng phiên bản theo semantic versioning:
  - **MAJOR**: Những thay đổi phá vỡ các tầng kiến trúc, các quy tắc quản trị cơ bản, hoặc xóa bỏ các nguyên tắc.
  - **MINOR**: Bổ sung các nguyên tắc mới, mở rộng tech stack, hoặc các yêu cầu về luồng công việc cấu trúc.
  - **PATCH**: Cải thiện từ ngữ, làm rõ, và các cập nhật tài liệu không gây phá vỡ (non-breaking).
- Tất cả các pull requests, automated agents, và các phiên pair-programming BẮT BUỘC phải xác minh sự tuân thủ các nguyên tắc này trước khi merge.

**Version**: 1.3.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-29
