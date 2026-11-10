# Danh sách Công việc Triển khai (Tasks): RM-029 Chống Tấn công Brute-Force & Bảo vệ Xác thực Đăng nhập

**Tính năng**: `RM-029 — Chống Tấn công Brute-Force & Bảo vệ Xác thực Đăng nhập (Login Anti-Brute-Force & Rate Limiting)`  
**Nhánh (Branch)**: `029-rm-029-login-anti-brute-force` | **Ngày**: 2026-11-09  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md) | **Hợp đồng (Contracts)**: [contracts/api-contracts.md](contracts/api-contracts.md)

---

## Phase 1: Nền tảng Backend Domain Service & Khóa Tài khoản Bậc thang Lũy tiến

**Mục tiêu**: Xây dựng Domain Service `UserLockoutManager` quản lý nấc phạt lũy tiến (**5 phút → 10 phút → 15 phút → 30 phút**), xử lý hoàn nguyên sau 24 giờ không tái phạm (*24h Inactivity Decay Window*), reset khi đăng nhập đúng và cấp quyền mở khóa cho Admin.

- [X] **T001 [Backend]**: Khai báo quyền `TooHungryPermissions.Identity.Users.ManageLockout` trong `src/Acme.TooHungry.Domain.Shared/Permissions/TooHungryPermissions.cs` và định nghĩa quyền trong `TooHungryPermissionDefinitionProvider.cs`.
- [X] **T002 [Backend]**: Định nghĩa interface `IUserLockoutManager` trong `src/Acme.TooHungry.Domain/Identity/IUserLockoutManager.cs`:
  - `Task<TimeSpan> CalculateLockoutTimeSpanAsync(IdentityUser user)`
  - `Task<bool> HandleFailedAccessAsync(IdentityUser user)`
  - `Task HandleSuccessfulLoginAsync(IdentityUser user)`
  - `Task AdminUnlockAsync(IdentityUser user)`
- [X] **T003 [Backend]**: Triển khai `UserLockoutManager` trong `src/Acme.TooHungry.Domain/Identity/UserLockoutManager.cs`:
  - Thuật toán nấc phạt bậc thang: Nấc 1 = 5m, Nấc 2 = 10m, Nấc 3 = 15m, Nấc 4 = 30m (trần).
  - Kiểm tra Decay Window: Nếu `user.GetProperty<DateTimeOffset?>("LastLockoutUtc") + 24h < UtcNow` -> tự động hạ `LockoutLevel` về 0.
  - Lưu trữ bền vững `LockoutLevel` và `LastLockoutUtc` qua `ExtraProperties` của `IdentityUser`.
  - Reset `AccessFailedCount = 0` và `LockoutLevel = 0` khi đăng nhập thành công.
- [X] **T004 [Backend]**: Viết Unit Tests xUnit cho `UserLockoutManager` trong `test/Acme.TooHungry.Domain.Tests/Identity/UserLockoutManager_Tests.cs`:
  - Kiểm thử 4 nấc khóa liên tiếp (5m → 10m → 15m → 30m).
  - Kiểm thử tự động hoàn nguyên nấc 1 sau 24 giờ không có lỗi sai.
  - Kiểm thử reset về 0 khi người dùng nhập đúng mật khẩu.
  - Kiểm thử Admin mở khóa gỡ bỏ lệnh phạt tức thời.

---

## Phase 2: Tích hợp Middleware Rate Limiting & Chống Timing Attack trên HttpApi.Host

**Mục tiêu**: Cấu hình Sliding Window Rate Limiting (10 req/phút/IP) trả về HTTP 429 và `Retry-After`; tích hợp thuật toán băm giả lập hằng số thời gian (*Constant-time Dummy Hash*) để triệt tiêu lỗ hổng Timing Attack.

- [X] **T005 [Backend]**: Cấu hình `Microsoft.AspNetCore.RateLimiting` trong `src/Acme.TooHungry.HttpApi.Host/TooHungryHttpApiHostModule.cs`:
  - Tạo policy `"LoginRateLimitPolicy"` với thuật toán Sliding Window: `PermitLimit = 10`, `Window = 1 phút`, `SegmentsPerWindow = 6`, `QueueLimit = 0`.
  - Phân vùng theo Client IP bảo mật qua `ForwardedHeadersOptions`.
  - Tích hợp `OnRejected` callback: Trả về HTTP `429 Too Many Requests`, header `Retry-After: <số giây>` và body JSON lỗi chuẩn ABP.
- [X] **T006 [Backend]**: Áp dụng policy `"LoginRateLimitPolicy"` cho route OpenIddict Token Endpoint `/connect/token` và ABP Login `/api/account/login`.
- [X] **T007 [Backend]**: Xây dựng `AntiTimingAttackDummyHasher` trong `src/Acme.TooHungry.HttpApi.Host/Security/AntiTimingAttackDummyHasher.cs`:
  - Chạy phép băm giả lập thời gian hằng số khi tài khoản không tồn tại trong cơ sở dữ liệu để đảm bảo độ lệch thời gian xử lý < 15ms.
- [X] **T008 [Backend]**: Viết Integration Tests xUnit trong `test/Acme.TooHungry.Application.Tests/Security/RateLimiting_Tests.cs` xác nhận request thứ 11 từ 1 IP bị chặn với mã 429 và header `Retry-After`.

---

## Phase 3: Cơ chế Thử thách Xác thực Động (Dynamic CAPTCHA) & API Hỗ trợ

**Mục tiêu**: Xây dựng câu đố số học nội bộ nhẹ ký số HMAC-SHA256 hoạt động 100% offline trên mạng LAN nhà hàng; cung cấp API tra cứu trạng thái khóa cho Client.

- [X] **T009 [Backend]**: Xây dựng `InternalCaptchaManager` trong `src/Acme.TooHungry.Domain/Security/InternalCaptchaManager.cs`:
  - Sinh ngẫu nhiên câu đố số học (ví dụ: `15 + 8 = ?`), ký số bảo mật bằng HMAC-SHA256 kèm timestamp có hạn dùng 2 phút.
  - Hàm thẩm định `ValidateCaptchaAnswer(string challengeId, string answer, string signature, long timestamp)`.
- [X] **T010 [Backend]**: Tạo các DTOs trong `src/Acme.TooHungry.Application.Contracts/Identity/IdentityLockoutDtos.cs`:
  - `LoginFailureDto`, `AdminUnlockUserDto`, `CheckLockoutStatusDto`, `CaptchaChallengeDto`.
- [X] **T011 [Backend]**: Xây dựng `AccountSecurityController` trong `src/Acme.TooHungry.HttpApi.Host/Controllers/AccountSecurityController.cs`:
  - `GET /api/account/captcha-challenge`: Lấy câu đố số học khi cần xác minh.
  - `POST /api/account/check-lockout-status`: Tra cứu thời gian khóa còn lại (`remainingSeconds`) mà không làm tăng bộ đếm sai.
- [X] **T012 [Backend]**: Tích hợp kiểm tra CAPTCHA bắt buộc trong luồng xác thực OpenIddict `/connect/token` khi user/IP có từ 3 lần nhập sai liên tiếp.

---

## Phase 4: Giao diện Đăng nhập Angular với Cooldown Countdown Timer & CAPTCHA

**Mục tiêu**: Xây dựng đồng hồ đếm ngược Cooldown Timer chuẩn Bento Card Cam & Trắng (`#EA580C`, `#FFF3E8`), component câu đố số học và quản lý State phản ứng bằng Angular Signals.

- [X] **T013 [Frontend]**: Khởi tạo tệp mô hình dữ liệu `angular/src/app/account/models/auth-lockout.models.ts`.
- [X] **T014 [Frontend]**: Xây dựng `AuthLockoutService` trong `angular/src/app/shared/services/auth-lockout.service.ts`:
  - Quản lý Signal State: `remainingSeconds`, `isLocked`, `requireCaptcha`, `captchaQuestion`.
  - Tính toán mốc thời gian Cooldown ưu tiên: `Math.max(lockoutRemaining, ipRateLimitRemaining)`.
  - Bộ đếm thời gian RxJS `timer(0, 1000)` đếm lùi đều đặn mỗi giây và tự động mở khóa form khi về `00:00` (không cần F5 trang).
- [X] **T015 [Frontend]**: Xây dựng `CooldownTimerComponent` trong `angular/src/app/account/login/components/cooldown-timer/`:
  - Bento Card bo góc mềm mại 12px, nền `#FFF3E8`, viền `#EA580C`, icon ổ khóa nhịp thở nhẹ.
  - Hiển thị thời gian đếm lùi `MM:SS`.
- [X] **T016 [Frontend]**: Xây dựng `CaptchaChallengeComponent` trong `angular/src/app/account/login/components/captcha-challenge/`:
  - Hiển thị câu hỏi số học và trường nhập đáp án khi `requireCaptcha = true`.
- [X] **T017 [Frontend]**: Cập nhật form đăng nhập (`login.component.ts` / `html`):
  - Bắt lỗi HTTP 429 và HTTP 400 Lockout -> kích hoạt Cooldown Timer.
  - Hiển thị cảnh báo số lần thử còn lại khi sai 3 hoặc 4 lần.
  - Khóa toàn bộ ô nhập và nút Submit khi đang Cooldown.
- [X] **T018 [Frontend]**: Viết Unit Tests Vitest cho `AuthLockoutService` và `CooldownTimerComponent`.

---

## Phase 5: Quản trị viên Mở khóa Tài khoản & Cảnh báo An ninh Thời gian thực

**Mục tiêu**: Cung cấp năng lực mở khóa tài khoản thủ công cho Quản trị viên trên UI và lệnh CLI khẩn cấp trên server; phát cảnh báo SignalR kèm âm thanh khi có đợt brute-force dồn dập.

- [X] **T019 [Backend]**: Xây dựng `IdentityUserLockoutAppService` trong `src/Acme.TooHungry.Application/Identity/IdentityUserLockoutAppService.cs`:
  - Endpoint `POST /api/app/identity/users/{id}/unlock` yêu cầu quyền `TooHungryPermissions.Identity.Users.ManageLockout`.
- [X] **T020 [Backend]**: Bổ sung tham số lệnh CLI `--unlock-admin` trong dự án `src/Acme.TooHungry.DbMigrator/DbMigratorHostedService.cs` để Quản trị viên kỹ thuật mở khóa khẩn cấp tài khoản `admin` trực tiếp từ server.
- [X] **T021 [Backend]**: Mở rộng SignalR Hub phát sự kiện `SecurityAlertTriggered` khi một dải IP phát sinh hơn 50 lần đăng nhập thất bại trong 5 phút.
- [X] **T022 [Frontend]**: Cập nhật màn hình Quản lý Người dùng `angular/src/app/identity/users/`:
  - Hiển thị huy hiệu đỏ cảnh báo "Tài khoản đang bị khóa" trên dòng nhân viên bị lockout.
  - Bổ sung nút thao tác nhanh **[Mở khóa tài khoản]** (gắn chỉ thị `*abpPermission="'TooHungry.Identity.Users.ManageLockout'"`).
- [X] **T023 [Frontend]**: Lắng nghe sự kiện SignalR `SecurityAlertTriggered`: Hiển thị Banner/Toast cảnh báo đỏ khẩn cấp và phát âm thanh cảnh báo an ninh cho Admin/Manager đang trực.

---

## Phase 6: Đa ngôn ngữ (i18n), Kiểm thử Tự động & Nghiệm thu Toàn diện

**Mục tiêu**: Đảm bảo 100% bản địa hóa song ngữ Tiếng Việt và Tiếng Anh (`vi.json`, `en.json`) và toàn bộ test suites đạt 100% PASS.

- [X] **T024 [I18n]**: Cấu hình 100% từ điển đa ngôn ngữ trong cả 4 tệp:
  - `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json`
  - `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json`
  - `angular/src/assets/i18n/vi.json`
  - `angular/src/assets/i18n/en.json`
  - Các khóa: `LockoutLevel1Message`, `LockoutLevel2Message`, `LockoutLevel3Message`, `LockoutLevel4Message`, `RateLimitExceededMessage`, `RemainingAttemptsWarning`, `AccountUnlockedSuccess`, `CaptchaRequiredMessage`.
- [X] **T025 [Testing]**: Viết Integration Tests xUnit kiểm thử toàn trình chuỗi: 5 lần sai -> Khóa 5m -> Đăng nhập đúng -> Reset về 0; và kiểm thử Admin mở khóa thành công.
- [X] **T026 [Verification]**: Chạy kiểm tra strict compilation `npm run build` trên Angular và chạy toàn bộ test suite `dotnet test`.

