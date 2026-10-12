# Danh sách Tác vụ (Tasks): Quản lý Người dùng & Phân quyền (RM-003)

Dưới đây là danh sách các công việc cụ thể cần thực hiện để hoàn thành tính năng RM-003, được trích xuất từ `plan.md`.

## Giai đoạn 1: Backend - Khởi tạo dữ liệu (Data Seeding)
- [x] Mở file `DataSeeder` (hoặc tạo class mới implement `IDataSeedContributor`).
- [x] Khởi tạo 5 Roles mặc định: `Administrator`, `Manager`, `InventoryStaff`, `Waiter`, `Cashier` (sử dụng `IdentityRoleManager`).
- [x] Chạy lệnh `dotnet run` (hoặc `DbMigrator`) để đẩy các Role này vào cơ sở dữ liệu.
- [x] Mở `PermissionDefinitionProvider`, xác định và nhóm các quyền nghiệp vụ của hệ thống (nếu cần điều chỉnh).

## Giai đoạn 2: Frontend - Cấu hình Routing & Module
- [x] Tạo module `IdentityModule` trong thư mục `src/app/identity`.
- [x] Khai báo Routing cho `/identity/users` (trang quản lý người dùng).
- [x] Khai báo Routing cho `/identity/roles` (trang quản lý vai trò).
- [x] Đăng ký `IdentityModule` vào `AppRoutingModule` hoặc `Route.Provider` để xuất hiện trên thanh menu (nếu cần).

## Giai đoạn 3: Frontend - Xây dựng trang Quản lý Người dùng
- [x] Tạo `UserListComponent`. Tích hợp component `<app-shared-table>`.
- [x] Liên kết API `IdentityUserAppService.getList` để hiển thị danh sách người dùng.
- [x] Tạo `UserModalComponent`. Tích hợp component `<app-shared-modal>`.
- [x] Dựng form Thêm/Sửa người dùng với các trường: Tên đăng nhập, Tên, Email, Mật khẩu, Trạng thái (Active/Inactive), Vai trò (Dropdown 5 roles).
- [x] Tích hợp API `IdentityUserAppService.create` và `update` vào form.
- [x] Xử lý sự kiện "Khóa/Mở khóa" trên bảng danh sách, gọi API cập nhật `IsActive`.

## Giai đoạn 4: Frontend - Xây dựng trang Quản lý Vai trò (Roles)
- [x] Tạo `RoleListComponent`. Tích hợp component `<app-shared-table>`.
- [x] Liên kết API `IdentityRoleAppService.getList` để hiển thị danh sách Vai trò.
- [x] Tạo `PermissionsModalComponent`. Tích hợp component `<app-shared-modal>`.
- [x] Lấy danh sách quyền từ API `PermissionAppService.get`. Lọc bỏ các nhóm quyền hệ thống của ABP (`AbpIdentity`, `FeatureManagement`, v.v.).
- [x] Xây dựng UI danh sách quyền dạng Checkbox được nhóm theo module.
- [x] Gọi API `PermissionAppService.update` để lưu lại thay đổi quyền khi submit form.

## Giai đoạn 5: Ngôn ngữ & Kiểm thử
- [x] Thêm các khóa dịch thuật cho màn hình Identity vào `en.json`.
- [x] Thêm các khóa dịch thuật cho màn hình Identity vào `vi.json`.
- [x] Kiểm thử E2E: Tạo User mới -> Gán Role -> Thử đăng nhập -> Kiểm tra xem User có vào đúng trang theo Role và bị chặn bởi Permission hay không.
