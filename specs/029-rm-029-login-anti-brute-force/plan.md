# Kế hoạch Triển khai (Implementation Plan): RM-029 Chống Tấn công Brute-Force & Bảo vệ Xác thực Đăng nhập (Login Anti-Brute-Force & Rate Limiting)

**Nhánh (Branch)**: `029-rm-029-login-anti-brute-force` | **Ngày**: 2026-11-09 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả kỹ thuật từ `specs/029-rm-029-login-anti-brute-force/spec.md` với 6 quyết định kiến trúc then chốt:
1. **Khóa tài khoản theo bậc thang lũy tiến (Escalating Lockout Ladder)**: Sau 5 lần nhập sai liên tiếp, thời gian khóa tăng dần: 5 phút → 10 phút → 15 phút → 30 phút (trần); reset sạch bộ đếm khi đăng nhập đúng.
2. **Giới hạn tần suất gọi API (Rate Limiting)**: ASP.NET Core Built-in RateLimiter thuật toán Sliding Window áp dụng cho các route xác thực (`/connect/token`, `/api/account/login`), tối đa 10 requests / phút / IP, trả về HTTP 429 và `Retry-After`.
3. **Chống Timing Attack & Rà quét Tài khoản (Account Enumeration)**: Phép băm giả lập thời gian hằng số (Constant-time dummy hash verification) khi tài khoản không tồn tại; đồng nhất hóa thông báo lỗi an toàn.
4. **Thử thách Xác thực Động (Dynamic CAPTCHA)**: Kích hoạt sau 3 lần sai liên tiếp từ cùng IP/tài khoản để chặn bot trước khi chạm ngưỡng khóa.
5. **Giao diện Angular Cooldown Timer**: Hiển thị cảnh báo số lần thử còn lại, đồng hồ đếm ngược Cooldown Timer (`MM:SS`) chuẩn nhận diện Cam & Trắng (`#EA580C`), tự động mở khóa khi hết giờ mà không cần F5 trang.
6. **Quản trị viên mở khóa & Đa ngôn ngữ (i18n)**: Endpoint mở khóa tài khoản thủ công cho Quản trị viên (`RM-003`), hỗ trợ 100% song ngữ Tiếng Việt và Tiếng Anh (`vi.json`, `en.json`).

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện giải pháp bảo vệ an ninh nhiều lớp (*Defense-in-depth*) chống các cuộc tấn công dò đoán mật khẩu tự động (Brute-Force), tấn công rà quét diện rộng (Password Spraying) và tấn công chiếm quyền tài khoản (Credential Stuffing) cho hệ thống Quản lý Nhà hàng `Acme.TooHungry`. Giải pháp kết hợp giữa Domain Service quản lý nấc phạt tài khoản, Middleware giới hạn tần suất tầng mạng, bộ đệm phân vùng in-memory hiệu năng cao và giao diện tương tác người dùng an toàn trên Angular.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Backend**: C# 13, .NET 9.0/10.0, ABP Framework 9.x, Entity Framework Core, OpenIddict, ASP.NET Core RateLimiting
- **Frontend**: TypeScript 5.x, Angular 19+, Standalone Components, Signal Reactive State (`signal`, `computed`), RxJS Observables
- **Lưu trữ State**: `IdentityUser.ExtraProperties` (lưu trữ cấp độ phạt bền vững), In-memory Cache / Partitioned Rate Limiter
- **Nền tảng đích**: Web application, POS Terminal, Tablet, Desktop
- **Ràng buộc Hiệu năng**:
  - Middleware Rate Limiting kiểm tra tần suất < **5ms** / request.
  - Phép băm giả lập đảm bảo độ lệch thời gian giữa user có/không tồn tại < **15ms**.
  - Đồng hồ đếm ngược phía Angular chạy trơn tru, không gây Change Detection toàn app.
- **Ràng buộc Thương hiệu & Giao diện**:
  - Chuẩn Bento Card Cam & Trắng (`#EA580C`, viền `#EDE4D6`, nền `#FFF3E8`).
  - 100% văn bản nạp qua `abpLocalization` pipe hoặc `LocalizationService` (`en.json`, `vi.json`).

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - Logic tính toán nấc phạt bậc thang và quy tắc mở khóa nằm tại `UserLockoutManager` trong `Acme.TooHungry.Domain`. Tầng Host chỉ điều phối HTTP Middleware và OpenIddict handlers.
- [x] **II. UML & Domain Model Alignment**:
  - Không phá vỡ cấu trúc Aggregate Root `IdentityUser`; sử dụng cơ chế `ExtraProperties` mở rộng chuẩn ABP.
- [x] **III. Test-First & Automated Quality Gates**:
  - Xây dựng bộ test xUnit kiểm thử đầy đủ các nấc khóa bậc thang (5m, 10m, 15m, 30m), Rate Limiter 10 req/phút, và unit test Angular cho Cooldown Timer Component.
- [x] **IV. Hợp đồng API nghiêm ngặt**:
  - Xác định đầy đủ API contracts cho OpenIddict Token Endpoint, Account API, và Admin Unlock API tại `contracts/api-contracts.md`.
- [x] **V. Bảo mật & Kiểm toán An ninh**:
  - Ghi vết đầy đủ mọi sự kiện vi phạm vào `AbpAuditLogs` và Serilog; bật cờ `lockoutOnFailure: true` trên mọi kênh xác thực.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Thiết kế Bento Card bo góc mềm mại, typography `Plus Jakarta Sans`, màu cam chủ đạo `#EA580C`.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% thông báo lỗi, cảnh báo số lần thử, nhãn đồng hồ đếm ngược có đầy đủ trong cả 4 tệp `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - 100% hồ sơ kỹ thuật (spec, plan, research, data-model, quickstart, contracts, checklists) được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (specs/)
```text
specs/029-rm-029-login-anti-brute-force/
├── spec.md                            # Đặc tả nghiệp vụ và các quyết định kiến trúc
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật Lockout ladder, RateLimiter, Anti-timing attack
├── data-model.md                      # Thiết kế ExtraProperties, DTOs và máy trạng thái Lockout
├── quickstart.md                      # Hướng dẫn kiểm thử nhanh cho Dev và QA
├── contracts/
│   └── api-contracts.md               # Hợp đồng RESTful API, Rate Limit headers và phản hồi lỗi
└── checklists/
    └── requirements.md                # Bảng kiểm tra yêu cầu nghiệm thu chi tiết
```

### Mã nguồn Cần Triển khai & Cập nhật

#### 1. Backend (.NET 9 / C# / ABP)
```text
src/
├── Acme.TooHungry.Domain.Shared/
│   ├── Permissions/
│   │   ├── TooHungryPermissions.cs                   # Bổ sung TooHungryPermissions.Identity.Users.ManageLockout
│   │   └── TooHungryPermissionDefinitionProvider.cs  # Khai báo quyền Mở khóa tài khoản cho Admin
│   └── Localization/TooHungry/
│       ├── vi.json                                   # Bản dịch Tiếng Việt: thông báo khóa, rate limit, cảnh báo thử
│       └── en.json                                   # Bản dịch Tiếng Anh: Lockout messages, Rate limit, Cooldown
├── Acme.TooHungry.Domain/
│   └── Identity/
│       ├── UserLockoutManager.cs                     # Domain Service quản lý nấc phạt bậc thang (5m->10m->15m->30m)
│       └── IUserLockoutManager.cs
├── Acme.TooHungry.Application.Contracts/
│   └── Identity/
│       ├── IIdentityUserLockoutAppService.cs         # Interface API mở khóa và tra cứu trạng thái lockout
│       └── IdentityLockoutDtos.cs                    # LoginFailureDto, AdminUnlockUserDto, v.v.
├── Acme.TooHungry.Application/
│   └── Identity/
│       └── IdentityUserLockoutAppService.cs          # Triển khai API mở khóa tài khoản thủ công cho Admin
└── Acme.TooHungry.HttpApi.Host/
    ├── TooHungryHttpApiHostModule.cs                 # Cấu hình ASP.NET Core RateLimiter Middleware & Identity Lockout
    ├── Security/
    │   ├── AntiTimingAttackDummyHasher.cs            # Constant-time dummy hash verification khi user không tồn tại
    │   └── SlidingWindowIpRateLimiterPolicy.cs       # Cấu hình policy giới hạn tần suất 10 req/phút/IP
    └── Controllers/
        └── AccountSecurityController.cs              # Endpoint kiểm tra trạng thái khóa và CAPTCHA challenge
```

#### 2. Frontend (Angular 19 / Standalone)
```text
angular/src/
├── app/
│   ├── account/
│   │   └── login/
│   │       ├── login.component.ts                    # Tích hợp bắt lỗi Lockout, RateLimit 429 và Cooldown State
│   │       ├── login.component.html                  # Hiển thị Cooldown Timer Bento Card, Cảnh báo số lần thử
│   │       ├── login.component.scss                  # SCSS Bento Card Cam & Trắng, nhịp thở icon ổ khóa
│   │       └── components/
│   │           ├── cooldown-timer/                   # Component đồng hồ đếm ngược Cooldown Timer
│   │           │   ├── cooldown-timer.component.ts
│   │           │   ├── cooldown-timer.component.html
│   │           │   └── cooldown-timer.component.scss
│   │           └── captcha-challenge/                # Component thử thách CAPTCHA động
│   │               ├── captcha-challenge.component.ts
│   │               ├── captcha-challenge.component.html
│   │               └── captcha-challenge.component.scss
│   ├── shared/
│   │   └── services/
│   │       └── auth-lockout.service.ts               # Dịch vụ quản lý State đếm ngược và bắt sự kiện lỗi xác thực
│   └── users/
│       └── user-list/                                # Màn hình Quản lý Người dùng RM-003
│           └── user-list.component.ts                # Bổ sung nút [Mở khóa tài khoản] cho Quản trị viên
└── assets/
    └── i18n/
        ├── vi.json                                   # Khóa bản dịch Tiếng Việt phía Client
        └── en.json                                   # Khóa bản dịch Tiếng Anh phía Client
```

---

## Các Giai đoạn Triển khai (Implementation Phases)

### Giai đoạn 1: Nền tảng Backend Domain Service & Khóa Tài khoản Bậc thang Lũy tiến
- **T-001**: Khai báo quyền `TooHungryPermissions.Identity.Users.ManageLockout` trong `TooHungryPermissions.cs` và `TooHungryPermissionDefinitionProvider.cs`.
- **T-002**: Xây dựng Domain Service `UserLockoutManager` (`IUserLockoutManager`) trong `Acme.TooHungry.Domain/Identity/`:
  - Thuật toán tính toán nấc phạt bậc thang: Level 1 = 5m, Level 2 = 10m, Level 3 = 15m, Level 4 = 30m.
  - Tự động hoàn nguyên nấc phạt về ban đầu (Nấc 1) nếu sau 24 giờ kể từ lần khóa gần nhất tài khoản không tái phạm (Inactivity Decay Window 24h).
  - Hàm `HandleFailedAccessAsync(IdentityUser user)` ghi nhận lần nhập sai, cập nhật `LockoutLevel` qua `ExtraProperties` và thiết lập `LockoutEnd`.
  - Hàm `HandleSuccessfulLoginAsync(IdentityUser user)` xóa `AccessFailedCount` và đưa `LockoutLevel` về 0.
  - Hàm `AdminUnlockAsync(IdentityUser user)` gỡ bỏ `LockoutEnd`, xóa số lần sai và reset cấp độ phạt.

### Giai đoạn 2: Tích hợp Middleware Rate Limiting & Chống Timing Attack trên HttpApi.Host
- **T-003**: Cấu hình `services.AddRateLimiter` trong `TooHungryHttpApiHostModule.cs`:
  - Khởi tạo policy `"LoginRateLimitPolicy"` sử dụng thuật toán Sliding Window (10 req / 1 phút / Client IP, SegmentsPerWindow = 6, QueueLimit = 0).
  - Tích hợp `OnRejected` callback: Gán HTTP Status `429 Too Many Requests`, thêm header `Retry-After: <số giây>` và xuất JSON lỗi chuẩn hóa.
- **T-004**: Áp dụng Rate Limiting middleware cho các route OpenIddict `/connect/token`, `/api/account/login`, `/Account/Login`.
- **T-005**: Xây dựng `AntiTimingAttackDummyHasher` thực hiện phép băm giả lập thời gian hằng số khi người dùng không tồn tại trong DB, loại bỏ nguy cơ Timing Attack.
- **T-006**: Bổ sung `IdentityUserLockoutAppService` cung cấp API mở khóa thủ công `/api/app/identity/users/{id}/unlock` yêu cầu quyền hạn nhân, đồng thời trang bị lệnh CLI khẩn cấp `Acme.TooHungry.DbMigrator --unlock-admin` cho Quản trị viên kỹ thuật.

### Giai đoạn 3: Cơ chế Thử thách Xác thực Động (Dynamic CAPTCHA)
- **T-007**: Xây dựng `AccountSecurityController` cung cấp endpoint `/api/account/captcha-challenge` và `/api/account/check-lockout-status`.
- **T-008**: Triển khai bộ sinh câu đố số học nội bộ nhẹ kèm chữ ký số HMAC-SHA256 (hạn dùng 2 phút), bảo đảm hệ thống hoạt động 100% offline trên mạng LAN nhà hàng không phụ thuộc internet ngoài.
- **T-009**: Tích hợp kiểm tra bắt buộc CAPTCHA trong luồng xử lý đăng nhập nếu tài khoản hoặc IP đã có từ 3 lần thử sai liên tiếp.

### Giai đoạn 4: Giao diện Đăng nhập Angular với Cooldown Countdown Timer
- **T-010**: Xây dựng `AuthLockoutService` phía Angular quản lý State Signal cho Lockout, Rate Limiting và thời gian đếm ngược `remainingSeconds`.
- **T-011**: Xây dựng `CooldownTimerComponent`: Hiển thị đồng hồ đếm ngược `MM:SS` dạng thẻ Bento viền cam `#EA580C`, nền màu đào nhạt `#FFF3E8`, icon ổ khóa nhịp thở nhẹ nhàng.
- **T-012**: Xây dựng `CaptchaChallengeComponent`: Hiển thị thử thách câu đố số học khi có cờ `requireCaptcha = true`.
- **T-013**: Cập nhật `LoginComponent`:
  - Bắt lỗi HTTP 429 từ Rate Limiter -> đọc header `Retry-After` và kích hoạt Cooldown Timer.
  - Bắt lỗi Account Lockout từ Backend -> đọc `remainingSeconds` và hiển thị cảnh báo theo nấc thời gian.
  - Khi cả hai bị chặn đồng thời: Tính toán thời gian Cooldown theo `Math.max(lockoutRemaining, ipRateLimitRemaining)`.
  - Hiển thị cảnh báo số lần thử còn lại khi sai 3 hoặc 4 lần.
  - Tự động mở khóa form khi đồng hồ đếm về `00:00` mà không cần F5 trang.

### Giai đoạn 5: Năng lực Quản trị viên Mở khóa Tài khoản & Cảnh báo An ninh Thời gian thực
- **T-014**: Cập nhật giao diện Quản lý Người dùng (`RM-003`):
  - Hiển thị huy hiệu đỏ cảnh báo "Tài khoản đang bị khóa" trên bảng danh sách nhân viên nếu `lockoutEnd > now`.
  - Bổ sung nút thao tác nhanh **[Mở khóa tài khoản]** (chỉ hiển thị với người dùng có quyền `TooHungryPermissions.Identity.Users.ManageLockout`).
  - Gọi API `/api/app/identity/users/{id}/unlock`, cập nhật danh sách tức thì và thông báo Toast thành công.
- **T-014B**: Tích hợp phát sự kiện SignalR `SecurityAlertTriggered` kèm âm thanh cảnh báo nổi bật tới màn hình của Admin/Manager đang trực khi phát hiện đợt brute-force vượt ngưỡng nguy hiểm (>50 lần sai trong 5 phút).

### Giai đoạn 6: Đa ngôn ngữ (i18n), Bộ Kiểm thử Tự động & Nghiệm thu Toàn diện
- **T-015**: Cấu hình 100% từ điển đa ngôn ngữ song ngữ trong cả 4 tệp `vi.json` và `en.json` (Domain.Shared và Angular assets):
  - Khóa: `LockoutLevel1Message`, `LockoutLevel2Message`, `LockoutLevel3Message`, `LockoutLevel4Message`, `RateLimitExceededMessage`, `RemainingAttemptsWarning`, `AccountUnlockedSuccess`.
- **T-016**: Viết Unit Tests xUnit cho `UserLockoutManager`: Kiểm thử 4 nấc khóa bậc thang (5m, 10m, 15m, 30m), reset khi login đúng, và admin unlock.
- **T-017**: Viết Integration Tests xUnit cho Rate Limiting Middleware: Mô phỏng 11 requests liên tiếp từ 1 IP, xác nhận HTTP 429 và header `Retry-After`.
- **T-018**: Viết Unit Tests Angular cho `AuthLockoutService` và `CooldownTimerComponent`.
- **T-019**: Chạy kiểm tra strict compilation `npm run build` và kiểm thử hồi quy toàn bộ hệ thống.

