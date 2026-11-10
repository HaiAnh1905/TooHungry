# Hướng dẫn Kiểm thử Nhanh (Quickstart Guide): RM-029 Chống Tấn công Brute-Force & Rate Limiting

**Nhánh**: `029-rm-029-login-anti-brute-force` | **Ngày**: 2026-11-09 | **Đặc tả**: [spec.md](spec.md)

Tài liệu này cung cấp các kịch bản kiểm thử nhanh dành cho lập trình viên và kiểm thử viên (QA) để xác minh tính năng bảo vệ đăng nhập.

---

## 1. Kiểm thử Tự động (Automated Test Suite)

Chạy các bài kiểm thử xUnit Backend cho cơ chế Lockout bậc thang và Rate Limiter:

```powershell
# Chạy toàn bộ kiểm thử bảo mật Lockout & Rate Limit
dotnet test Acme.TooHungry/test/Acme.TooHungry.Application.Tests --filter "FullyQualifiedName~Lockout|RateLimit"

# Chạy unit test Angular
cd Acme.TooHungry/angular
npm run test -- --include src/app/account/login/*.spec.ts
```

---

## 2. Kiểm thử Thủ công bằng cURL / Postman

### Kịch bản 1: Kiểm thử Khóa Tài khoản Bậc thang (5m → 10m → 15m → 30m)

1. Gửi liên tiếp 5 request sai mật khẩu tới endpoint OpenIddict:
```bash
for i in {1..5}; do
  curl -X POST http://localhost:44320/connect/token \
    -d "grant_type=password&username=cashier1&password=WrongPassword123!&client_id=TooHungry_App" \
    -H "Content-Type: application/x-www-form-urlencoded"
done
```
2. **Kỳ vọng ở lần thứ 5**: Response trả về lỗi `account_locked_out` với `lockout_level: 1` và `remaining_seconds ~ 300` (5 phút).
3. Đợi hết 5 phút (hoặc admin mở khóa), thử tiếp 5 lần sai nữa:
   - **Kỳ vọng**: `lockout_level: 2` và `remaining_seconds ~ 600` (10 phút).
4. Tiếp tục thử nấc 3 và nấc 4:
   - Nấc 3: 15 phút (`900s`).
   - Nấc 4: 30 phút (`1800s`).
5. Nhập đúng mật khẩu:
   - Token trả về thành công (HTTP 200), bộ đếm sai được reset về 0.

---

### Kịch bản 2: Kiểm thử Rate Limiting theo Client IP (HTTP 429)

Gửi dồn dập 11 request đăng nhập trong vòng 30 giây:
```bash
for i in {1..11}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:44320/connect/token \
    -d "grant_type=password&username=testuser&password=password&client_id=TooHungry_App" \
    -H "Content-Type: application/x-www-form-urlencoded"
done
```
* **Kỳ vọng**: Từ request thứ 1 đến 10 trả về mã `400` (Bad Request do sai tài khoản). Request thứ 11 trả về **`429` (Too Many Requests)** kèm header `Retry-After`.

---

### Kịch bản 3: Kiểm thử Giao diện Cooldown Countdown Timer trên Angular

1. Mở trình duyệt tại `http://localhost:4200/account/login`.
2. Nhập sai mật khẩu 3 lần:
   - Kiểm tra xuất hiện cảnh báo còn 2 lần thử và xuất hiện khối CAPTCHA.
3. Nhập sai tiếp lần 4 và lần 5:
   - Kiểm tra form bị vô hiệu hóa (`disabled`).
   - Kiểm tra đồng hồ đếm ngược `04:59` đếm lùi đều đặn mỗi giây theo chuẩn giao diện Bento Cam & Trắng (`#EA580C`).
4. Khi đồng hồ về `00:00`:
   - Form tự động mở khóa (enabled) mà không cần reload trang (F5).

