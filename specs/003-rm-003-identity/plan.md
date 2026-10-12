# Kế hoạch Triển khai (Implementation Plan): Quản lý Người dùng & Phân quyền (RM-003)

Dựa trên đặc tả tính năng đã chốt, dưới đây là kế hoạch chi tiết từng bước để triển khai RM-003.

## Giai đoạn 1: Backend - Khởi tạo dữ liệu (Data Seeding)

Do ABP đã cung cấp sẵn toàn bộ REST APIs cho Identity (`IdentityUserAppService`, `IdentityRoleAppService`, `PermissionAppService`), công việc ở Backend chủ yếu là khởi tạo dữ liệu mẫu và các Role cơ bản.

- **Bước 1.1**: Cập nhật `DataSeeder` (trong thư mục `Domain`) để tự động tạo 5 Roles mặc định khi khởi chạy ứng dụng lần đầu:
  - `Administrator`
  - `Manager`
  - `InventoryStaff`
  - `Waiter`
  - `Cashier`
- **Bước 1.2**: Đảm bảo quyền (Permission) của ứng dụng `Acme.TooHungry` được định nghĩa đầy đủ trong `PermissionDefinitionProvider` để có thể hiển thị trên giao diện phân quyền sau này.

## Giai đoạn 2: Frontend - Cấu hình Routing & Module

- **Bước 2.1**: Tạo (hoặc ghi đè) Angular Module `IdentityModule` trong thư mục `src/app/identity`.
- **Bước 2.2**: Thiết lập Routing cho 2 trang chính:
  - `/identity/users`: Component danh sách người dùng.
  - `/identity/roles`: Component danh sách vai trò.

## Giai đoạn 3: Frontend - Xây dựng trang Quản lý Người dùng

- **Bước 3.1: Giao diện Danh sách Người dùng (`UserListComponent`)**
  - Tích hợp component `shared-table` từ RM-002.
  - Cấu hình các cột hiển thị: Tên người dùng, Email, Trạng thái (Active/Inactive), Vai trò (Role).
  - Tích hợp thanh công cụ tìm kiếm và phân trang sử dụng API `IdentityUserAppService.getList`.
- **Bước 3.2: Giao diện Thêm/Sửa Người dùng (`UserModalComponent`)**
  - Sử dụng component `shared-modal` từ RM-002 để tạo form nhập liệu.
  - Các trường: Tên đăng nhập (Username), Họ tên (Name), Email, Mật khẩu (Password - tự nhập), Trạng thái (Checkbox), Vai trò (Dropdown lấy từ danh sách Roles).
  - Tích hợp API `IdentityUserAppService.create` và `IdentityUserAppService.update`. (Lưu ý: API ABP hỗ trợ truyền Role kèm theo dữ liệu User).
- **Bước 3.3: Xử lý Vô hiệu hóa Tài khoản**
  - Thêm hành động "Khóa/Mở khóa" vào mỗi dòng trên bảng. 
  - Gọi API cập nhật thuộc tính `IsActive` của User.

## Giai đoạn 4: Frontend - Xây dựng trang Quản lý Vai trò (Roles)

- **Bước 4.1: Giao diện Danh sách Vai trò (`RoleListComponent`)**
  - Sử dụng `shared-table` để hiển thị 5 Roles.
  - Cột hiển thị: Tên vai trò, Mặc định (Default), Cố định (Static).
- **Bước 4.2: Giao diện Phân quyền (`PermissionsModalComponent`)**
  - Tích hợp API `PermissionAppService.get` để lấy danh sách quyền của một Role.
  - Xử lý dữ liệu (Filter): **Loại bỏ các quyền hệ thống nội bộ của ABP** (chẳng hạn `AbpIdentity`, `FeatureManagement`, `TenantManagement`), chỉ giữ lại các quyền liên quan đến logic kinh doanh của nhà hàng.
  - Thiết kế UI dạng **Danh sách Checkbox nhóm theo Module** (Grouped Checkbox List).
  - Tích hợp API `PermissionAppService.update` để lưu lại cấu hình.

## Giai đoạn 5: Ngôn ngữ & Kiểm thử

- **Bước 5.1 (I18n)**: Cập nhật các key đa ngôn ngữ cho toàn bộ màn hình vào 2 file `en.json` và `vi.json`.
- **Bước 5.2 (Test)**: 
  - Kiểm tra luồng tạo User với mật khẩu tự nhập và Role.
  - Đăng nhập bằng User mới tạo để đảm bảo mật khẩu và Role hoạt động đúng (RM-001).
  - Kiểm tra UI checkbox phân quyền có lọc đúng các quyền hệ thống hay chưa.
