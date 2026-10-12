# Phân tích Hiện trạng Hệ thống (Analysis): RM-003

Quá trình quét và phân tích mã nguồn hiện tại của dự án cho thấy các kết quả sau:

## 1. Backend (ABP Framework)
- **Data Seeder (`TooHungryDataSeederContributor.cs`)**: Đã tồn tại trong thư mục `src\Acme.TooHungry.Domain`. Hiện tại, ta có thể inject `IdentityRoleManager` vào class này để tự động seed 5 roles (Administrator, Manager, InventoryStaff, Waiter, Cashier) khi chạy migration.
- **Permission Definitions (`TooHungryPermissionDefinitionProvider.cs`)**: Đã tồn tại trong project `Application.Contracts`. Các quyền hiện tại của nhà hàng có thể đã được khai báo ở đây hoặc sẽ được cập nhật. Ở phía Frontend, chúng ta sẽ dựa vào Group Name của các permissions này để lọc ra các quyền nghiệp vụ kinh doanh, ẩn đi các quyền thuộc nhóm `AbpIdentity` hay `TenantManagement`.
- **Identity APIs**: API CRUD (IdentityUserAppService, IdentityRoleAppService, PermissionAppService) đã có sẵn qua package `Volo.Abp.Identity.Domain` và tự động sinh endpoint.

## 2. Frontend (Angular)
- **Identity Module**: Hiện tại thư mục `src/app` chưa có module `identity`. Do đó, chúng ta sẽ khởi tạo một Angular Module hoàn toàn mới (`ng generate module identity --routing`).
- **Shared Components**: Thư mục `src/app/shared/components` đã có sẵn `<app-shared-table>` và `<app-shared-modal>` (nhờ quá trình phát triển RM-002). Đây là lợi thế lớn giúp rút ngắn thời gian xây dựng UI và đảm bảo đúng thiết kế "wow" của ứng dụng.
- **Routing (`route.provider.ts`)**: Chưa khai báo menu cho Identity. Chúng ta cần cập nhật file này để thêm một nhóm menu `IdentityGroup` (quản trị hệ thống) và hiển thị chỉ cho quyền Administrator.

## 3. Đánh giá Rủi ro (Risks & Mitigations)
- **Rủi ro API proxy**: Mặc định ABP sinh sẵn các proxy class trong thư mục `@abp/ng.identity`. Nếu dự án không cài package này ở Angular, chúng ta sẽ phải dùng `npm install @abp/ng.identity` hoặc tự định nghĩa API calls thủ công.
  - *Mitigation*: Nên ưu tiên cài đặt package `@abp/ng.identity` ở Angular để sử dụng các DTOs và Services có sẵn.
- **Lọc quyền hệ thống**: UI Permissions sẽ nhận về một mảng phẳng các quyền. Cần cẩn thận khi map thành dạng `Grouped Checkbox` để không bỏ sót các nhánh phân cấp của cây quyền mặc định.

## Kết luận
Hệ thống đã chuẩn bị đầy đủ nền tảng (Shared UI bên Frontend và DataSeeder bên Backend) để bắt tay vào làm RM-003 mà không vướng blocker nào. Tiến độ dự kiến sẽ nhanh và suôn sẻ.
