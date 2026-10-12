# Kế hoạch Triển khai (Implementation Plan): Đăng nhập & Đăng xuất (RM-001)

**Chi nhánh**: `001-rm-001-login` | **Ngày**: 2026-10-06 | **Thông số**: [spec.md](./spec.md)

**Đầu vào**: Thông số tính năng từ [spec.md](./spec.md) bao gồm các yêu cầu về UI, Role-based Redirection, và cơ chế Account Lockout.

---

## 1. Tóm tắt

Triển khai cấu hình và tùy biến luồng Đăng nhập (Authentication) và Điều hướng (Redirection) dựa trên cơ sở hạ tầng của ABP Framework:
1. **Tùy chỉnh Giao diện Đăng nhập (Angular)**:
   - Ẩn hoàn toàn các tính năng mặc định: "Đăng ký" (Register), "Quên mật khẩu" (Forgot Password), và "Ghi nhớ đăng nhập" (Remember Me).
   - Chỉ giữ lại trường Username/Email, Password và nút Login.
2. **Điều hướng theo Vai trò (Role-based Redirection)**:
   - Ngay sau khi đăng nhập thành công, hệ thống đọc Role duy nhất của tài khoản và tự động chuyển hướng: `Administrator` -> `/identity/users`, `Manager` -> `/dashboard`, `InventoryStaff` -> `/inventory`, `Waiter` -> `/table`, `Cashier` -> `/table/layout`.
3. **Bảo mật & Khóa tài khoản (Account Lockout)**:
   - Cấu hình Identity Options ở Backend: Khóa tài khoản tạm thời 5 phút sau 5 lần đăng nhập sai mật khẩu liên tiếp. Cấu hình áp dụng cho mọi Role.
4. **Bảo vệ Tài nguyên (Route Guards)**:
   - Đảm bảo người dùng chưa đăng nhập không thể vào trong (chuyển hướng về Login) và người dùng ấn Logout sẽ hủy session/token ngay lập tức.

---

## 2. Bối cảnh Kỹ thuật

- **Ngôn ngữ / Phiên bản**: C# 13, .NET 10.0 SDK.
- **Giao diện người dùng**: Angular 19 (Mẫu ABP Angular), TypeScript 5.x.
- **Phụ thuộc chính**:
   - Kế thừa và cấu hình Module `Volo.Abp.Identity` và `Volo.Abp.Account` của ABP.
   - `OAuthService` (angular-oauth2-oidc) hoặc `AuthService` của ABP để quản lý token.
- **Bảo mật**: Cơ chế Account Lockout mặc định của ASP.NET Core Identity.
- **Quy chuẩn UI/UX**: Sử dụng I18N song ngữ (vi/en). Giao diện tối giản chỉ phục vụ đăng nhập.

---

## 3. Kiểm tra Hiến pháp (Constitution Gates)

| Nguyên tắc | Yêu cầu | Tình trạng tuân thủ | Bằng chứng / Giải pháp |
| :--- | :--- | :---: | :--- |
| **I. Domain-Driven Design & ABP Layering** | Tái sử dụng Identity Module | **PASSED** | Không tạo Entity mới, chỉ cấu hình `IdentityOptions` tại lớp `Domain` hoặc `EntityFrameworkCore`. |
| **III. Test-First & Quality Gates** | Kiểm thử cấu hình lockout | **PASSED** | Viết Integration tests để xác nhận cấu hình Lockout hoạt động đúng (sai 5 lần bị khóa). |
| **IV. Strict API Contract & Angular Modular** | Không sửa trực tiếp core | **PASSED** | Tùy biến UI Angular thông qua Component Replacement (ReplaceableComponents) hoặc Settings. |
| **V. Security & Auditing** | Ngăn Brute-force, bảo vệ Route | **PASSED** | Bật Account Lockout, sử dụng AuthGuard của ABP trên Frontend. |
| **VII. Quốc tế hóa & Nội địa hóa (I18N)** | Song ngữ Việt - Anh | **PASSED** | Đảm bảo các chuỗi lỗi (Login failed, Account locked) hỗ trợ Tiếng Việt trong `vi.json`. |

---

## 4. Cấu trúc Dự án & Bố cục Tệp

### 4.1. Tài liệu Đặc tả (Tính năng 001)
```text
specs/001-rm-001-login/
├── spec.md              # Feature specification (Đã clarify)
├── plan.md              # Implementation plan (Tài liệu này)
└── checklists/
    └── requirements.md  # (Tùy chọn) Checklist rà soát
```

### 4.2. Kiến trúc Mã nguồn

```text
# Domain Layer (Cấu hình Lockout)
src/Acme.TooHungry.Domain/
└── TooHungryDomainModule.cs                   # Cấu hình IdentityOptions (Lockout)

# Application / Web Layer (Cấu hình Ẩn Register/Password Reset nếu dùng Server-side UI)
src/Acme.TooHungry.HttpApi.Host/
└── appsettings.json                           # Cấu hình Settings cho Account Module (tắt IsSelfRegistrationEnabled)

# Frontend Layer (Angular - Tùy biến Login Component & Redirection)
angular/src/app/
├── auth/
│   ├── login/
│   │   ├── custom-login.component.ts          # Replace ABP Login Component
│   │   ├── custom-login.component.html        # UI Login rút gọn (bỏ Remember me, Forgot Pwd, Register)
│   │   └── custom-login.component.scss
│   └── auth-guard.service.ts                  # (Hoặc cấu hình sự kiện AuthService) để Role-based Redirect
├── app.component.ts                           # Lắng nghe sự kiện login thành công để redirect
└── app.module.ts                              # Đăng ký ReplaceableComponent cho Login
```

---

## 5. Kế hoạch Triển khai Chi tiết

### Giai đoạn 1: Cấu hình Backend (Identity & Account Lockout)
1. **Bật và Cấu hình Account Lockout**:
   - Mở file `TooHungryDomainModule.cs` (hoặc module tương ứng).
   - Trong `ConfigureServices`, cấu hình `IdentityOptions`:
     ```csharp
     Configure<IdentityOptions>(options =>
     {
         options.Lockout.AllowedForNewUsers = true;
         options.Lockout.MaxFailedAccessAttempts = 5;
         options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
     });
     ```
2. **Vô hiệu hóa Đăng ký (Tùy chọn Backend Settings)**:
   - Cấu hình Setting của ABP Account Module để vô hiệu hóa tính năng tự đăng ký (đảm bảo bảo mật nhiều lớp):
   - Đặt `Abp.Account.IsSelfRegistrationEnabled` thành `false`.

### Giai đoạn 2: Tùy biến Giao diện Đăng nhập (Angular Frontend)
1. **Tạo Custom Login Component**:
   - Do yêu cầu ẩn "Remember Me", "Forgot Password", "Register", cách an toàn nhất trong ABP Angular là thay thế (Replace) Component đăng nhập mặc định (`eAccountComponents.Login`).
   - Thiết kế `custom-login.component.html` chỉ có: Logo, Input Username, Input Password, và nút Submit. Không render các thẻ `<a>` quên mật khẩu hoặc checkbox Remember me.
2. **Đăng ký Component Replacement**:
   - Sử dụng `ReplaceableComponentsService` trong `app.component.ts` hoặc một module khởi tạo để map `eAccountComponents.Login` sang `CustomLoginComponent`.

### Giai đoạn 3: Điều hướng theo Vai trò (Role-based Redirection)
1. **Xử lý sự kiện đăng nhập thành công**:
   - Trong Angular, lắng nghe observable từ `OAuthService` (sự kiện `token_received`) hoặc hook vào logic sau khi form login trả về thành công.
   - Gọi `ConfigStateService.getOne('currentUser')` để lấy thông tin user và roles.
2. **Logic Điều hướng (Redirection)**:
   - Viết một service `RoleRedirectService`:
     - Nếu role `Administrator` -> `Router.navigate(['/identity/users'])`.
     - Nếu role `Manager` -> `Router.navigate(['/dashboard'])`.
     - Nếu role `InventoryStaff` -> `Router.navigate(['/inventory'])`.
     - Nếu role `Waiter` -> `Router.navigate(['/table'])`.
     - Nếu role `Cashier` -> `Router.navigate(['/table/layout'])`.
   - Vì spec quy định mỗi tài khoản chỉ có 1 Role duy nhất, ta chỉ cần lấy role đầu tiên trong mảng `roles` của user.

### Giai đoạn 4: Đăng xuất & Bảo vệ Route
1. **Kiểm tra chức năng Logout**:
   - Nút Logout mặc định của ABP ở Header. Đảm bảo nó gọi hàm `AuthService.logout()` và xóa token, đưa về trang Login.
2. **Route Guards**:
   - Đảm bảo các route nội bộ (như `/inventory`, `/table`) đều được bảo vệ bởi `AuthGuard` của ABP (`import { AuthGuard } from '@abp/ng.core';`).

### Giai đoạn 5: Đa ngôn ngữ (I18N)
1. **Kiểm tra File Ngôn ngữ**:
   - Xác minh các thông báo lỗi trả về từ API (ví dụ: User is locked out, Invalid username or password) đã có bản dịch Tiếng Việt trong `vi.json` mặc định của ABP. 
   - Cập nhật thêm nếu cần để thông báo thân thiện.

---

## 6. Chiến lược Kiểm thử (Testing Strategy)

- **Backend / Integration Test**:
  - Test case: Gọi API login với sai password 5 lần liên tiếp -> Kỳ vọng lần 6 trả về lỗi Account Locked (ngay cả khi nhập đúng password).
- **Frontend / E2E Test**:
  - Đăng nhập với tài khoản gán role `Manager` -> Xác nhận URL hiện tại là `/dashboard`.
  - Đăng nhập với tài khoản gán role `Waiter` -> Xác nhận URL là `/table`.
  - Truy cập trực tiếp `/inventory` khi chưa đăng nhập -> Xác nhận bị đá văng về `/login`.
  - Mở trang `/login` -> Xác nhận không có link Đăng ký, Quên mật khẩu, hay checkbox Ghi nhớ đăng nhập.
