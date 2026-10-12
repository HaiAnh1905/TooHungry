# Danh sách Công việc (Task Breakdown): Shared UI & Design System (RM-002)

**Chi nhánh**: `002-rm-002-shared-ui` | **Ngày**: 2026-10-06 | **Thông số**: [spec.md](./spec.md) | **Kế hoạch**: [plan.md](./plan.md)

---

## Giai đoạn 1: Tích hợp và Cấu hình NG-ZORRO
- [ ] 1.1. Cài đặt package `ng-zorro-antd` và các dependency liên quan vào dự án Angular (`npm install ng-zorro-antd`).
- [ ] 1.2. Khai báo import CSS/LESS của NG-ZORRO vào cấu hình build (`angular.json`).
- [ ] 1.3. Khởi tạo file `_variables.scss` (hoặc `.less`) trong thư mục `theme/` để cấu hình ghi đè màu sắc (Primary, Text, Background) theo thương hiệu TooHungry.
- [ ] 1.4. Thiết lập ngôn ngữ mặc định cho NG-ZORRO (`NZ_I18N`) đồng bộ với ABP LocalizationService (hỗ trợ hiển thị đúng tiếng Việt).

## Giai đoạn 2: Xây dựng Layout Quản trị (Left Sidebar)
- [ ] 2.1. Tạo mới module và thư mục `shared/layout/` chứa `MainLayoutComponent`, `SidebarComponent`, `HeaderComponent`.
- [ ] 2.2. Xây dựng **Sidebar**: Sử dụng `nz-sider` và `nz-menu`, móc nối danh sách route từ `RoutesService` của ABP để render menu động theo Role.
- [ ] 2.3. Xây dựng **Header**: Sử dụng `nz-header`, tích hợp component Logo và User Dropdown (hiển thị thông tin user, nút Đăng xuất).
- [ ] 2.4. Đăng ký thay thế Component: Map `eThemeBasicComponents.ApplicationLayout` thành `MainLayoutComponent` qua `ReplaceableComponentsService` của ABP.

## Giai đoạn 3: Xây dựng Shared Table Component
- [ ] 3.1. Tạo component `app-shared-table` trong `shared/components/table/`.
- [ ] 3.2. Cấu hình lõi `nz-table` với các `@Input` bắt buộc: `columns` (mảng cột định nghĩa), `data` (dữ liệu list), `totalCount`, `loading`.
- [ ] 3.3. Tích hợp tính năng: Phân trang (Pagination) và gửi emit (`@Output`) khi có thay đổi trang/sắp xếp.
- [ ] 3.4. Triển khai các tính năng nâng cao thông qua tham số `@Input`: `stickyHeader`, `expandable` (Mở rộng dòng).
- [ ] 3.5. Xây dựng khu vực lọc nâng cao (Advanced Filter) tích hợp chung hoặc đính kèm vào header bảng.
- [ ] 3.6. Xử lý cell template (ng-template) để người dùng bảng có thể tuỳ biến giao diện từng cột (nút Action, Badge trạng thái).

## Giai đoạn 4: Xây dựng Shared Modal, Forms & Utilities
- [ ] 4.1. Tạo component `app-shared-modal` trong `shared/components/modal/` đóng gói `nz-modal`. Cấu hình header, footer và truyền content dạng `ng-content`.
- [ ] 4.2. Xây dựng các form controls wrapper cơ bản (Input, Select, DatePicker) bao bọc `nz-form-item`.
- [ ] 4.3. Tích hợp hiển thị lỗi Validation động (dựa vào form control state) và tự động bind chuỗi lỗi qua ABP Localization.
- [ ] 4.4. Đăng ký và cung cấp các service thông báo (`NzMessageService`, `NzModalService` cho Confirm Dialog) vào `SharedModule`.
- [ ] 4.5. Xây dựng component `app-shared-spinner` để làm loading indicator tái sử dụng.

## Giai đoạn 5: Đa ngôn ngữ (I18N) & Hoàn thiện
- [ ] 5.1. Bổ sung các key nội dung chung (Save, Cancel, Search, Delete, No Data...) vào `vi.json` và `en.json` của ABP Backend hoặc Frontend.
- [ ] 5.2. Đảm bảo toàn bộ hard-coded string trong Shared Table và Shared Modal được thay thế bằng `{{ '::Key' | abpLocalization }}`.
- [ ] 5.3. Xác nhận chức năng trên cả 2 ngôn ngữ và trên màn hình di động/tablet (Responsive Layout).
