# Kế hoạch Triển khai (Implementation Plan): Shared UI & Design System (RM-002)

**Chi nhánh**: `002-rm-002-shared-ui` | **Ngày**: 2026-10-06 | **Thông số**: [spec.md](./spec.md)

**Đầu vào**: Thông số tính năng từ [spec.md](./spec.md) bao gồm các yêu cầu về UI framework (NG-ZORRO), cấu trúc Layout (Left Sidebar) và các bộ component dùng chung (Table, Form, Modal).

---

## 1. Tóm tắt

Triển khai xây dựng bộ UI cốt lõi (Design System) cho hệ thống, làm nền tảng cho tất cả các màn hình nghiệp vụ phía sau (Wave 1, 2, 3, 4):
1. **Tích hợp NG-ZORRO**:
   - Cài đặt và cấu hình thư viện `ng-zorro-antd` thay thế cho giao diện Bootstrap mặc định của ABP Framework.
   - Thiết lập Theme SCSS/LESS tùy chỉnh theo nhận diện thương hiệu.
2. **Cấu trúc Layout chính**:
   - Tạo `MainLayoutComponent` gồm Header (User info, Logout) và Left Sidebar (chứa Menu điều hướng lấy từ ABP Route provider).
   - Đăng ký thay thế Component Layout mặc định của ABP.
3. **Bộ Shared Components**:
   - **Shared Table**: Bọc `nz-table` thành component dùng chung (`app-shared-table`), hỗ trợ phân trang, tìm kiếm, sắp xếp, cố định cột/header, mở rộng dòng và lọc nâng cao thông qua cấu hình đầu vào (`@Input`).
   - **Shared Modal**: Bọc `nz-modal` để dễ dàng hiển thị các form thêm/sửa/xóa.
   - **Shared Forms**: Thiết kế các control chuẩn (`nz-input`, `nz-select`, `nz-date-picker`) và tích hợp validation error messages hỗ trợ i18n.
   - **Utility Components/Services**: Khai báo và cấu hình `NzMessageService` (Toast), `NzModalService` (Confirm Dialog), và `nz-spin` (Loading Spinner).

---

## 2. Bối cảnh Kỹ thuật

- **Ngôn ngữ / Phiên bản**: Angular 19, TypeScript 5.x.
- **Giao diện người dùng**: NG-ZORRO (Ant Design Angular).
- **Kiến trúc CSS**: SCSS / LESS (NG-ZORRO gốc dùng LESS, cần cấu hình build hoặc override qua SCSS).
- **ABP Framework Integration**:
   - Sử dụng `ReplaceableComponentsService` của ABP để thay thế Application Layout.
   - Sử dụng `LocalizationService` để đa ngôn ngữ các text tĩnh.

---

## 3. Kiểm tra Hiến pháp (Constitution Gates)

| Nguyên tắc | Yêu cầu | Tình trạng tuân thủ | Bằng chứng / Giải pháp |
| :--- | :--- | :---: | :--- |
| **I. Domain-Driven Design & ABP Layering** | Tách biệt giao diện khỏi nghiệp vụ | **PASSED** | RM-002 chỉ tạo "Dumb Components", không chứa logic nghiệp vụ. |
| **III. Test-First & Quality Gates** | Component dễ test | **PASSED** | Các component chỉ giao tiếp qua `@Input()` và `@Output()`. |
| **IV. Strict API Contract & Angular Modular** | Mô-đun hóa Shared UI | **PASSED** | Toàn bộ thành phần UI được gom vào thư mục `shared/` và xuất ra qua một Angular Module chung. |
| **VII. Quốc tế hóa & Nội địa hóa (I18N)** | Song ngữ Việt - Anh | **PASSED** | Bắt buộc lấy text (Save, Cancel, No Data) từ file `.json` ngôn ngữ qua ABP pipe `| abpLocalization`. |

---

## 4. Cấu trúc Dự án & Bố cục Tệp

### 4.1. Tài liệu Đặc tả (Tính năng 002)
```text
specs/002-rm-002-shared-ui/
├── spec.md              # Feature specification (Đã clarify)
├── plan.md              # Implementation plan (Tài liệu này)
└── checklists/
    └── requirements.md  # (Tùy chọn) Checklist rà soát
```

### 4.2. Kiến trúc Mã nguồn (Frontend)
```text
angular/src/app/
├── shared/                             # Khu vực chứa UI dùng chung
│   ├── components/
│   │   ├── table/                      # app-shared-table component
│   │   ├── modal/                      # app-shared-modal component
│   │   └── form-controls/              # Các wrapper cho input, select, validation
│   ├── layout/
│   │   ├── main-layout.component.ts    # Custom ABP Layout
│   │   ├── main-layout.component.html
│   │   ├── header/
│   │   └── sidebar/
│   └── shared.module.ts                # Module export các shared components
├── theme/                              # Khu vực chứa biến CSS/LESS/SCSS
│   ├── _variables.scss                 # Ghi đè màu sắc Ant Design
│   └── styles.scss                     # Import theme toàn cục
└── app.module.ts                       # Khai báo thay thế layout ABP
```

---

## 5. Kế hoạch Triển khai Chi tiết

### Giai đoạn 1: Tích hợp và Cấu hình NG-ZORRO
1. **Cài đặt thư viện**:
   - Chạy lệnh cài đặt `ng-zorro-antd` vào project Angular.
2. **Cấu hình Theme**:
   - Khai báo import CSS hoặc LESS của NG-ZORRO vào cấu hình build (`angular.json`).
   - Thiết lập các biến CSS tùy chỉnh (Primary color, text color, spacing) để làm brand cho hệ thống TooHungry.
3. **Cấu hình Ngôn ngữ cho NG-ZORRO**:
   - Đồng bộ ngôn ngữ đang chọn trong ABP với ngôn ngữ của `nz-i18n` (để các component như DatePicker hiển thị đúng locale Tiếng Việt/Tiếng Anh).

### Giai đoạn 2: Xây dựng Layout Quản trị (Left Sidebar)
1. **Thiết kế Layout Component**:
   - Tạo `MainLayoutComponent` bọc ngoài bằng `nz-layout`.
   - **Sidebar**: Sử dụng `nz-sider` kết hợp `nz-menu`. Lấy danh sách menu từ `RoutesService` của ABP để render tự động dựa theo role.
   - **Header**: Sử dụng `nz-header` chứa logo (thu gọn) và dropdown thông tin User (đăng xuất, chuyển ngôn ngữ).
2. **Đăng ký Replace Component**:
   - Sử dụng `ReplaceableComponentsService` của ABP để thay thế `eThemeBasicComponents.ApplicationLayout` bằng `MainLayoutComponent`.

### Giai đoạn 3: Xây dựng Shared Table Component
1. **Tạo `app-shared-table`**:
   - Dùng `nz-table` làm lõi.
   - `@Input()`: `columns` (mảng cấu hình cột), `data` (dữ liệu list), `totalCount` (tổng số record), `loading` (trạng thái chờ).
   - `@Input()`: Cấu hình mở rộng: `stickyHeader`, `expandable`, `showFilter`.
   - `@Output()`: `queryParamsChange` (phát ra event khi người dùng phân trang, sort, filter).
2. **Template tùy chỉnh (Cell Templates)**:
   - Cho phép truyền các `<ng-template>` vào các ô đặc thù (VD: ô Action chứa các nút Sửa/Xóa, ô Status dạng badge màu sắc).

### Giai đoạn 4: Xây dựng Shared Modal, Forms & Utilities
1. **Tạo `app-shared-modal`**:
   - Dùng `nz-modal` làm lõi, quản lý trạng thái mở/đóng qua service hoặc `@Input`.
   - `@Input()`: Tiêu đề, Kích thước (size), Trạng thái loading của nút Xác nhận.
2. **Tích hợp Validation form**:
   - Tạo các component hoặc directive wrapper để bọc `nz-form-item`.
   - Tự động hiển thị lỗi từ Angular Reactive Forms bằng text i18n.
3. **Các Utilities (Toast, Confirm, Spinner)**:
   - Export các service `NzMessageService`, `NzModalService` vào chung một `AppUIUtilityService` (tùy chọn) để dễ gọi từ các Component.
   - Tạo `app-shared-spinner` (dùng `nz-spin`) để bọc các khu vực loading cục bộ.

### Giai đoạn 5: Đa ngôn ngữ (I18N)
1. Cập nhật file `vi.json` và `en.json` cho các chuỗi hiển thị chung của hệ thống UI (ví dụ: Nút "Đồng ý", "Hủy bỏ", "Không có dữ liệu", "Tìm kiếm").
2. Đảm bảo Shared Table và Modal gọi hàm localization thay vì fix cứng text.

---

## 6. Chiến lược Kiểm thử (Testing Strategy)

- **UI/Visual Test**:
   - Đảm bảo Layout render đúng Left Sidebar, không bị vỡ giao diện trên màn hình Desktop nhỏ (thu gọn sidebar tự động).
- **Component Test**:
   - Truyền mock data vào `app-shared-table` để kiểm tra phân trang có phát event đúng trang và kích thước trang không.
   - Kiểm tra Form validation error có xuất hiện ngay khi nhấn Submit với input trống.
- **Integration Test**:
   - Đảm bảo menu trái tự động ẩn/hiện các chức năng dựa trên quyền hạn (Role/Permissions) từ ABP framework.
