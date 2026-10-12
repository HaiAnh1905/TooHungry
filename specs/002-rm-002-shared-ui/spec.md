# Đặc tả Tính năng (Feature Specification): Shared UI & Design System (RM-002)

**Nhánh Tính năng (Feature Branch)**: `002-rm-002-shared-ui`

**Ngày tạo**: 2026-10-06

**Trạng thái**: Bản nháp (Draft)

**Đầu vào**: Mô tả từ Roadmap: "Xây dựng các component UI cơ bản (table, form, modal) và cấu trúc layout hệ thống bằng Angular."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 06-10-2026 (Lần 1 - `/speckit.clarify`)
- **Q1: Thư viện UI (Design System) cốt lõi nào cho Angular Frontend?** -> **A1**: Sử dụng **NG-ZORRO (Ant Design Angular)** (ng.ant.design) làm thư viện UI component chính.
- **Q2: Cấu trúc Layout chính của hệ thống quản trị?** -> **A2**: Sử dụng Left Sidebar (Thanh menu trái) cho toàn bộ hệ thống quản trị, Header trên cùng chứa User info.
- **Q3: Shared Table Component cần hỗ trợ những tính năng nào?** -> **A3**: Phân trang (Pagination), Tìm kiếm (Search), Sắp xếp (Sort) cơ bản; Cố định cột (Sticky Columns) / Cố định Header; Mở rộng dòng (Row Expansion); và Lọc dữ liệu nâng cao (Advanced Filter).

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Shared UI & Design System (RM-002)** là nền tảng giao diện (Wave 0) của hệ thống Restaurant Management System (Acme.TooHungry). Thay vì xây dựng giao diện lặp lại cho từng chức năng, hệ thống cần một thư viện các component UI dùng chung (Shared Components) và cấu trúc Layout tổng thể (Header, Sidebar, Content Area, Footer).

Điều này giúp:
- Đảm bảo tính nhất quán (Consistency) về mặt thiết kế trên toàn bộ ứng dụng.
- Tăng tốc độ phát triển (Development Speed) cho các màn hình nghiệp vụ ở các Wave sau.
- Dễ dàng bảo trì và cập nhật thiết kế tập trung.

**Giới hạn phạm vi**: RM-002 chỉ cung cấp bộ khung UI/UX tĩnh và các component Angular tái sử dụng. Nó không chứa business logic cụ thể của bất kỳ thực thể nào.

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Bố cục hệ thống (Layout)
Là người dùng cuối, tôi muốn thấy một giao diện có cấu trúc rõ ràng bao gồm thanh điều hướng (Sidebar/Header) và khu vực nội dung chính, để tôi có thể dễ dàng chuyển đổi giữa các chức năng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** người dùng đã đăng nhập thành công, **Khi** hệ thống tải trang, **Thì** bố cục chính hiển thị thanh menu bên trái (Sidebar) hoặc Header trên cùng, khu vực nội dung ở giữa tự động co giãn theo màn hình.

### User Story 2 - Bảng dữ liệu dùng chung (Shared Table Component)
Là lập trình viên frontend, tôi muốn có một component bảng (Table) chuẩn hóa hỗ trợ phân trang, tìm kiếm và sắp xếp để hiển thị danh sách dữ liệu.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** hệ thống cần hiển thị danh sách (ví dụ: Users, Ingredients), **Khi** lập trình viên sử dụng `SharedTableComponent` và truyền cấu hình cột/data, **Thì** bảng hiển thị đúng định dạng thiết kế chuẩn, có phân trang và thanh công cụ.

### User Story 3 - Biểu mẫu và Hộp thoại (Forms & Modals)
Là lập trình viên frontend, tôi muốn có các component Form (Input, Select, DatePicker) và Modal chuẩn để tạo các chức năng Thêm/Sửa/Xóa.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** người dùng bấm nút "Thêm mới", **Khi** hệ thống gọi `SharedModalComponent`, **Thì** một hộp thoại chuẩn xuất hiện ở giữa màn hình, làm mờ nền (backdrop) và chứa các component Form chuẩn (có xử lý validation UI).

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

1. **Hiển thị trên thiết bị di động**: Mặc dù là hệ thống quản lý chủ yếu dùng trên PC/Tablet, layout và các components (đặc biệt là Table) cần xử lý ngắt dòng hoặc cuộn ngang hợp lý nếu kích thước màn hình bị thu nhỏ, tránh vỡ giao diện.
2. **Thiếu cấu hình khi dùng component**: Các shared component phải có giá trị mặc định an toàn (fallback defaults) nếu lập trình viên quên truyền thông số cấu hình.

---

## 4. Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Xây dựng **Application Layout** chuẩn gồm: Header (chứa thông tin user, nút Logout), Sidebar (Menu điều hướng động theo Role) nằm bên trái, và Content Area ở giữa.
- **FR-002**: Xây dựng **Shared Table Component** (sử dụng `nz-table` của NG-ZORRO) hỗ trợ: Hiển thị dữ liệu theo mảng cột động, phân trang (Pagination), tìm kiếm (Search), sắp xếp (Sort), cố định cột/header (Sticky), mở rộng dòng (Row Expansion) để xem chi tiết, và lọc dữ liệu nâng cao (Advanced Filter). Template tùy chỉnh cho từng ô dữ liệu (Action buttons, Status badge).
- **FR-003**: Xây dựng **Shared Modal Component** hỗ trợ mở hộp thoại động, truyền component con vào nội dung Modal, có nút Xác nhận/Hủy và bắt sự kiện đóng.
- **FR-004**: Xây dựng bộ **Form Controls** dùng chung bọc ngoài các element chuẩn của framework, tích hợp sẵn hiển thị lỗi (Validation messages) đa ngôn ngữ.
- **FR-005**: Xây dựng các component phụ trợ: Toast/Notification (Thông báo), Confirm Dialog (Hộp thoại xác nhận thao tác nguy hiểm), Loading Spinner (Chỉ báo đang tải).
- **FR-006**: Tất cả text tĩnh trên các component dùng chung PHẢI hỗ trợ đa ngôn ngữ (I18N), lấy từ `en.json` và `vi.json`.

### Yêu cầu Phi chức năng & Bảo mật (Non-Functional & Security Requirements)

- **NFR-001**: Phải sử dụng **NG-ZORRO (Ant Design)** làm UI Framework lõi, tuân thủ bảng màu và typography của Ant Design, có thể tùy chỉnh thêm (Theme overrides) thông qua SCSS/LESS theo hướng dẫn thiết kế.
- **NFR-002**: Components phải là dạng "Dumb/Presentational Components" (chỉ nhận `@Input` và phát `@Output`), không gọi trực tiếp API hay phụ thuộc vào State Management (NgRx) ngoại trừ Layout.

---

## 5. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

- **SC-001**: Layout hiển thị nhất quán, đáp ứng được các trạng thái thu phóng màn hình cơ bản.
- **SC-002**: Đội ngũ phát triển có thể nhúng Shared Table, Shared Modal vào màn hình bất kỳ chỉ bằng cách cấu hình qua `@Input` mà không cần viết lại CSS/HTML khung.
- **SC-003**: Thông báo lỗi validation của Form và các text cố định trên component (như "Cancel", "Save") tự động chuyển đổi theo ngôn ngữ hệ thống.

---

## 6. Các Giả định (Assumptions)

- **Công nghệ Frontend**: Dự án sử dụng Angular tương thích với ABP Framework, kết hợp với thư viện UI **NG-ZORRO (Ant Design Angular)** (`ng-zorro-antd`) để xây dựng Design System và các Shared Components thay vì dùng mặc định của ABP.
- **Chưa có nghiệp vụ**: Giai đoạn này chỉ làm bộ khung UI, dữ liệu dùng để test là dữ liệu giả (mock data) hoặc component được test độc lập (ví dụ qua Storybook nếu có).
