# Danh sách Công việc (Task Breakdown): Đăng nhập & Đăng xuất (RM-001)

**Chi nhánh**: `001-rm-001-login` | **Ngày**: 2026-10-06 | **Thông số**: [spec.md](./spec.md) | **Kế hoạch**: [plan.md](./plan.md)

---

## Giai đoạn 1: Cấu hình Backend (Identity & Account Lockout)
- [ ] 1.1. Mở file module (vd: `TooHungryDomainModule.cs` hoặc `TooHungryHttpApiHostModule.cs`) để cấu hình `IdentityOptions`.
- [ ] 1.2. Kích hoạt tính năng `Lockout` cho user mới (`AllowedForNewUsers = true`).
- [ ] 1.3. Thiết lập số lần đăng nhập sai tối đa `MaxFailedAccessAttempts = 5`.
- [ ] 1.4. Thiết lập thời gian khóa mặc định `DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5)`.
- [ ] 1.5. Đảm bảo cấu hình ẩn tự đăng ký tài khoản (Tùy chọn thiết lập `IsSelfRegistrationEnabled = false` trong cấu hình ABP).

## Giai đoạn 2: Tùy biến Giao diện Đăng nhập (Angular Frontend)
- [ ] 2.1. Tạo mới component `CustomLoginComponent` (gồm html, ts, scss) trong thư mục `angular/src/app/auth/login/`.
- [ ] 2.2. Xây dựng form đăng nhập tối giản (chỉ gồm Logo, Input Username/Email, Input Password, Nút Login).
- [ ] 2.3. Loại bỏ hoàn toàn các nút/đường link: "Đăng ký", "Quên mật khẩu", "Ghi nhớ đăng nhập".
- [ ] 2.4. Đăng ký thay thế Component: Map `eAccountComponents.Login` thành `CustomLoginComponent` qua `ReplaceableComponentsService` tại `app.component.ts`.

## Giai đoạn 3: Điều hướng theo Vai trò (Role-based Redirection)
- [ ] 3.1. Xây dựng hoặc tích hợp logic điều hướng vào sự kiện Login thành công (bên trong `CustomLoginComponent` hoặc một Service riêng biệt).
- [ ] 3.2. Lấy thông tin Role của user thông qua `ConfigStateService.getOne('currentUser')`.
- [ ] 3.3. Thực hiện switch case và `Router.navigate` đúng địa chỉ cho từng Role (`Administrator`, `Manager`, `InventoryStaff`, `Waiter`, `Cashier`).
- [ ] 3.4. Thêm trang fallback (vd: `/` hoặc thông báo lỗi) nếu Role không khớp hoặc user chưa có Role hợp lệ.

## Giai đoạn 4: Đăng xuất & Bảo vệ Route (Route Guards)
- [ ] 4.1. Xác nhận và kiểm tra nút Logout (mặc định của Theme) vẫn hoạt động, gọi `AuthService.logout()` và xóa token hợp lệ.
- [ ] 4.2. Đảm bảo các route trong hệ thống (`/inventory`, `/dashboard`, `/table`, v.v.) đều được gán `AuthGuard` bảo vệ (chặn truy cập trực tiếp nếu chưa có token).

## Giai đoạn 5: Đa ngôn ngữ (I18N) & Hoàn thiện
- [ ] 5.1. Rà soát file `vi.json` và `en.json` đảm bảo các nhãn trong màn hình đăng nhập đều được sử dụng biến localize (`::Login`, `::Password`, `::Username`).
- [ ] 5.2. Kiểm tra các câu thông báo lỗi (vd: Account locked out, Invalid password) đã được ABP dịch sang Tiếng Việt chuẩn xác.
- [ ] 5.3. Thực hiện kiểm thử Manual/End-to-End để đóng tính năng.
