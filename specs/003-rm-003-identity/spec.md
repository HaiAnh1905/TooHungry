# Đặc tả Tính năng (Feature Specification): Quản lý Người dùng & Phân quyền (RM-003)

**Nhánh Tính năng (Feature Branch)**: `003-rm-003-identity`

**Ngày tạo**: 2026-10-06

**Trạng thái**: Hoàn thành (Completed)

**Đầu vào**: Mô tả từ roadmap: "Quản lý danh sách nhân viên, tài khoản và phân quyền vào các module nghiệp vụ. Thực thể: IdentityUser, IdentityRole — list, tạo, sửa, xoá, phân quyền. Backend: Đã có sẵn của ABP Framework."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 06-10-2026 (Lần 1 - `/speckit.clarify`)
- **Q1: Hiển thị Phân quyền (Permissions)**: -> **A1**: Chỉ hiển thị các quyền nghiệp vụ (business permissions) của nhà hàng, ẩn đi các quyền hệ thống nội bộ của ABP.
- **Q2: Mật khẩu khởi tạo**: -> **A2**: Quản trị viên tự nhập mật khẩu thủ công khi tạo tài khoản nhân viên.
- **Q3: Giao diện Phân quyền**: -> **A3**: Sử dụng giao diện dạng Danh sách Checkbox được nhóm theo từng module (Grouped Checkboxes) để thân thiện với người dùng cuối hơn thay vì dạng TreeView.
- **Q4: Đa vai trò (Multiple Roles)**: -> **A4**: Giữ nguyên đặc tả RM-001, mỗi tài khoản chỉ gắn đúng 1 Role duy nhất.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Quản lý Người dùng & Phân quyền (RM-003)** cho phép quản trị viên (Administrator) quản lý toàn bộ tài khoản nhân viên trong hệ thống nhà hàng Acme.TooHungry. Quản trị viên có thể thêm mới nhân viên, cập nhật thông tin, kích hoạt hoặc vô hiệu hóa tài khoản, và gán vai trò (Role) cho nhân viên để phân quyền truy cập vào các phân hệ (modules) tương ứng.

Tính năng này đóng vai trò sống còn trong việc vận hành bảo mật của nhà hàng, đảm bảo nhân viên chỉ được phép nhìn thấy và thao tác trên những màn hình thuộc thẩm quyền của mình.

**Backend**: Sử dụng hoàn toàn module Identity (IdentityUser, IdentityRole) đã được cung cấp sẵn bởi ABP Framework, không cần thiết kế lại cơ sở dữ liệu hay API mới, chỉ cần tích hợp giao diện (Frontend) theo đúng chuẩn thiết kế của nhà hàng (RM-002).

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Xem danh sách Người dùng & Vai trò (Ưu tiên: P1)

Là một Quản trị viên (Administrator), tôi muốn xem danh sách tất cả các nhân viên (người dùng) và các vai trò (roles) trong hệ thống để quản lý tổng quan.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** Quản trị viên truy cập trang Quản lý Người dùng, **Khi** trang được tải, **Thì** hệ thống hiển thị bảng (Table) danh sách nhân viên bao gồm: Tên, Email, Trạng thái (Active/Inactive), và Vai trò (Role).
2. **Cho trước** Quản trị viên chuyển sang tab/trang Vai trò, **Khi** trang được tải, **Thì** hệ thống hiển thị danh sách các vai trò (Administrator, Manager, InventoryStaff, Waiter, Cashier).

### User Story 2 - Thêm mới Nhân viên (Ưu tiên: P1)

Là một Quản trị viên, tôi muốn tạo tài khoản cho nhân viên mới vào làm để họ có thể đăng nhập hệ thống.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** Quản trị viên ở màn hình danh sách người dùng, **Khi** nhấn "Thêm mới", điền đầy đủ thông tin (Tên, Email, Mật khẩu khởi tạo) và chọn một Role (ví dụ: Waiter), sau đó lưu lại, **Thì** tài khoản mới được tạo thành công, được cấp Role tương ứng và hiển thị trong danh sách.

### User Story 3 - Cập nhật thông tin và Trạng thái Tài khoản (Ưu tiên: P1)

Là một Quản trị viên, tôi muốn có thể sửa thông tin của nhân viên hoặc vô hiệu hóa tài khoản khi nhân viên đó nghỉ việc.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** một tài khoản đang Active, **Khi** Quản trị viên chọn "Vô hiệu hóa" (Deactivate/Lock), **Thì** trạng thái tài khoản chuyển sang Inactive và nhân viên này không thể đăng nhập.
2. **Cho trước** một tài khoản đã có, **Khi** Quản trị viên chỉnh sửa Role (đổi từ Waiter sang Cashier), **Thì** hệ thống cập nhật Role thành công và áp dụng quyền mới cho nhân viên trong lần đăng nhập tiếp theo.

### User Story 4 - Phân quyền (Permissions) cho Vai trò (Ưu tiên: P2)

Là một Quản trị viên, tôi muốn xem và cấu hình chi tiết quyền hạn (permissions) của từng Vai trò đối với các module trong hệ thống.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** Quản trị viên ở danh sách Vai trò, **Khi** nhấn "Phân quyền" (Permissions) cho một Role, **Thì** hệ thống hiển thị modal danh sách các quyền (cây phân quyền của ABP) để Quản trị viên có thể tick chọn hoặc bỏ chọn.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

1. **Khóa tài khoản quản trị**: Khuyến cáo không cho phép Quản trị viên xóa hoặc vô hiệu hóa tài khoản quản trị viên cuối cùng (hoặc chính mình) để tránh mất quyền điều khiển hệ thống.
2. **Xóa người dùng**: Sử dụng API xóa của ABP, nhưng thực chất ABP sẽ áp dụng Soft Delete (xóa mềm).

---

## 4. Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI có màn hình Quản lý Người dùng cho phép hiển thị danh sách dạng bảng, có phân trang, tìm kiếm theo tên/email.
- **FR-002**: Hệ thống PHẢI cho phép Thêm, Sửa thông tin người dùng (Username, Name, Email, Password, Trạng thái Active) thông qua modal form.
- **FR-003**: Hệ thống PHẢI cho phép gán Vai trò (Role) cho người dùng ngay lúc tạo hoặc sửa. Mỗi người dùng chỉ được gắn 1 Role chính.
- **FR-004**: Hệ thống PHẢI có màn hình Quản lý Vai trò (Roles) hiển thị danh sách các role hiện có, và chức năng thêm/sửa Role.
- **FR-005**: Hệ thống PHẢI tích hợp giao diện Phân quyền (Permissions Management) để thiết lập quyền cho từng Role. Giao diện này PHẢI hiển thị dưới dạng **Danh sách Checkbox được nhóm theo module**, và **CHỈ hiển thị các quyền nghiệp vụ của nhà hàng** (ẩn các quyền hệ thống nội bộ của ABP).
- **FR-006**: Giao diện PHẢI hỗ trợ đa ngôn ngữ (I18N), sử dụng `vi.json` và `en.json`.
- **FR-007**: UI của màn hình Quản lý Người dùng, Vai trò, và Phân quyền PHẢI sử dụng 100% các component thiết kế từ **RM-002 (Shared UI)** để bảo đảm tính nhất quán (vibrant colors, table component, modal component, v.v.). Không dùng giao diện mặc định thô cứng của ABP.

### Yêu cầu Phi chức năng & Bảo mật (Non-Functional & Security Requirements)

- **NFR-001**: Toàn bộ thao tác CRUD người dùng và phân quyền PHẢI gọi qua API của ABP Identity Module (IdentityUserAppService, IdentityRoleAppService).
- **NFR-002**: Chỉ có người dùng mang Role `Administrator` (hoặc có quyền tương ứng) mới được phép truy cập phân hệ Quản lý Identity.

---

## 5. Tiêu chí Thành công (Success Criteria)

- **SC-001**: Quản trị viên có thể tạo thành công một nhân viên mới và gán Role từ giao diện Angular custom.
- **SC-002**: UI sử dụng chính xác các component từ `RM-002` (Table, Button, Modal, Input) với trải nghiệm "Wow" theo định hướng thiết kế.
- **SC-003**: Có thể cập nhật Role hoặc vô hiệu hóa thành công tài khoản nhân viên.
- **SC-004**: Mở được modal Phân quyền (Permissions) và lưu thành công quyền của một Role thông qua Identity Permissions API.

---

## 6. Các Giả định (Assumptions)

- Backend đã được thiết lập Identity Module và IdentityServer/OpenIddict của ABP. Các Identity API đã sẵn sàng sử dụng.
- Cấu hình Angular Frontend đã load sẵn các proxy cho Identity API.
