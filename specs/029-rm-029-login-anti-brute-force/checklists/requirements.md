# Bảng Kiểm Tra Yêu Cầu Nghiệm Thu (Requirements Checklist): RM-029

**Nhánh**: `029-rm-029-login-anti-brute-force` | **Ngày**: 2026-11-09 | **Đặc tả**: [spec.md](../spec.md)

---

## 1. Yêu cầu Khóa Tài khoản Bậc thang Lũy tiến (Escalating Lockout)

- [ ] **CHK-001**: Khóa tài khoản tạm thời 5 phút sau 5 lần nhập sai liên tiếp đầu tiên (`LockoutLevel = 1`).
- [ ] **CHK-002**: Khóa tài khoản tạm thời 10 phút sau 5 lần nhập sai tiếp theo (`LockoutLevel = 2`).
- [ ] **CHK-003**: Khóa tài khoản tạm thời 15 phút sau 5 lần nhập sai tiếp theo (`LockoutLevel = 3`).
- [ ] **CHK-004**: Khóa tài khoản tạm thời 30 phút cho lần vi phạm thứ 4 trở đi (`LockoutLevel = 4`).
- [ ] **CHK-005**: Tự động reset `AccessFailedCount = 0` và `LockoutLevel = 0` ngay khi đăng nhập đúng mật khẩu.
- [ ] **CHK-006**: Đảm bảo `lockoutOnFailure: true` được kích hoạt trên mọi luồng xác thực OpenIddict và ABP Account API.
- [ ] **CHK-007**: Cho phép Quản trị viên (Admin/Manager) mở khóa tài khoản thủ công tức thì qua API.

---

## 2. Yêu cầu Giới hạn Tần suất (Rate Limiting) & Chống Timing Attack

- [ ] **CHK-008**: Kích hoạt ASP.NET Core RateLimiter Middleware thuật toán Sliding Window trên `/connect/token`, `/api/account/login`, `/Account/Login`.
- [ ] **CHK-009**: Chặn đứng request thứ 11 trong vòng 1 phút từ cùng một IP với HTTP Status `429 Too Many Requests`.
- [ ] **CHK-010**: Header `Retry-After: <số giây>` được trả về kèm response 429.
- [ ] **CHK-011**: Triệt tiêu lỗ hổng Timing Attack bằng phép băm giả lập thời gian hằng số khi user không tồn tại trong cơ sở dữ liệu.
- [ ] **CHK-012**: Thông báo lỗi đăng nhập thất bại chung nhất quán, tuyệt đối không tiết lộ tài khoản có tồn tại hay không.

---

## 3. Yêu cầu Thử thách Động (Dynamic CAPTCHA)

- [ ] **CHK-013**: Kích hoạt hiển thị thử thách CAPTCHA khi phát hiện 3 lần đăng nhập thất bại liên tiếp từ cùng IP hoặc username.
- [ ] **CHK-014**: Nút Đăng nhập bị vô hiệu hóa cho tới khi người dùng giải đúng CAPTCHA.
- [ ] **CHK-015**: Backend xác thực hợp lệ chữ ký và kết quả CAPTCHA trước khi thẩm định mật khẩu.

---

## 4. Yêu cầu Giao diện Người dùng Angular & Cooldown Timer

- [ ] **CHK-016**: Hiển thị cảnh báo số lần thử còn lại trước khi tài khoản bị khóa tạm thời.
- [ ] **CHK-017**: Vô hiệu hóa toàn bộ form và hiển thị đồng hồ đếm ngược Cooldown Timer (`MM:SS`) khi bị khóa hoặc rate-limited.
- [ ] **CHK-018**: Thiết kế giao diện Cooldown tuân thủ chuẩn Bento Card Cam & Trắng (`#EA580C`, nền `#FFF3E8`).
- [ ] **CHK-019**: Tự động kích hoạt lại form và ẩn cảnh báo khi đồng hồ về `00:00` mà không cần reload (F5) trang web.

---

## 5. Yêu cầu Kiểm toán An ninh & Đa ngôn ngữ (i18n)

- [ ] **CHK-020**: Ghi nhận đầy đủ log kiểm toán an ninh qua ABP AuditLogging & Serilog lưu vết: IP, User-Agent, thời điểm UTC, tài khoản và loại vi phạm.
- [ ] **CHK-021**: Bắn log cảnh báo mức độ cao `[SECURITY_ALERT][BRUTE_FORCE]` khi có dấu hiệu brute-force dồn dập.
- [ ] **CHK-022**: 100% nhãn giao diện, thông báo lỗi, thông báo cảnh báo và văn bản đồng hồ đếm ngược được bản địa hóa đầy đủ trong `vi.json` và `en.json`.
- [ ] **CHK-023**: 100% xUnit test suites và Angular unit tests pass.

