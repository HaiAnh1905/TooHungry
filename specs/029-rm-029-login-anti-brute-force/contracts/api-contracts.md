# Hợp đồng Giao diện Lập trình (API Contracts): RM-029 Chống Tấn công Brute-Force & Rate Limiting

**Nhánh**: `029-rm-029-login-anti-brute-force` | **Ngày**: 2026-11-09 | **Đặc tả**: [spec.md](../spec.md)

---

## 1. Hợp đồng Xác thực Token Endpoint: `POST /connect/token`

Cổng xác thực OpenIddict tiêu chuẩn hỗ trợ OAuth 2.0 Password Grant Type:

* **Phương thức**: `POST`
* **Content-Type**: `application/x-www-form-urlencoded`
* **Tham số Request**:
  * `grant_type`: `"password"`
  * `username`: `"cashier1"`
  * `password`: `"SecretPass@123"`
  * `client_id`: `"TooHungry_App"`
  * `scope`: `"offline_access TooHungry"`
  * `captcha_answer`: `string` (tùy chọn, bắt buộc nếu `requireCaptcha = true`)
  * `captcha_challenge_id`: `string` (tùy chọn)

### Phản hồi Thành công (HTTP 200 OK):
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200..."
}
```

### Phản hồi Khi Sai Mật khẩu (HTTP 400 Bad Request):
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid username or password.",
  "remaining_attempts": 2,
  "require_captcha": true,
  "safe_message": "Tên đăng nhập hoặc mật khẩu không chính xác."
}
```

### Phản hồi Khi Tài khoản Bị Khóa (HTTP 400 Bad Request / Lockout):
```json
{
  "error": "account_locked_out",
  "error_description": "User account is locked out.",
  "lockout_level": 1,
  "remaining_seconds": 298,
  "safe_message": "Tài khoản của bạn đã bị khóa tạm thời 5 phút do nhập sai 5 lần liên tiếp. Vui lòng thử lại sau."
}
```

---

## 2. Hợp đồng Chặn Tần suất Rate Limiting: `HTTP 429 Too Many Requests`

Áp dụng cho mọi route xác thực (`/connect/token`, `/api/account/login`, `/Account/Login`):

* **HTTP Status Code**: `429 Too Many Requests`
* **Headers bắt buộc**:
  * `Retry-After`: `<số_giây>` (ví dụ: `42`)
  * `X-RateLimit-Limit`: `10`
  * `X-RateLimit-Remaining`: `0`
* **Body Response**:
```json
{
  "error": {
    "code": "TooHungry:RateLimitExceeded",
    "message": "Quá nhiều yêu cầu đăng nhập từ địa chỉ IP của bạn. Vui lòng thử lại sau.",
    "details": "Client IP đã gửi hơn 10 requests trong vòng 1 phút. Hãy đợi đến khi hết thời gian chờ.",
    "data": {
      "retryAfterSeconds": 42
    }
  }
}
```

---

## 3. Hợp đồng Kiểm tra Trạng thái Khóa: `POST /api/account/check-lockout-status`

Endpoint cho phép Client truy vấn nhanh trạng thái khóa và số giây còn lại mà không làm tăng bộ đếm nhập sai:

* **Phương thức**: `POST`
* **Content-Type**: `application/json`
* **Request Body**:
```json
{
  "userNameOrEmail": "cashier1"
}
```
* **Response**:
```json
{
  "isLockedOut": true,
  "lockoutLevel": 2,
  "remainingSeconds": 542,
  "requireCaptcha": true
}
```

---

## 4. Hợp đồng Quản trị viên Mở khóa Tài khoản: `POST /api/app/identity/users/{id}/unlock`

Endpoint dành riêng cho Quản trị viên (Admin/Manager) chủ động gỡ bỏ lệnh khóa tài khoản:

* **Phương thức**: `POST`
* **URL**: `/api/app/identity/users/{id}/unlock`
* **Yêu cầu Quyền**: `[Authorize(TooHungryPermissions.Identity.Users.ManageLockout)]`
* **Request Body**:
```json
{
  "reason": "Nhân viên quên mật khẩu, đã cấp lại mật khẩu tạm"
}
```
* **Response (HTTP 200 OK)**:
```json
{
  "success": true,
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "message": "Mở khóa tài khoản thành công. Bộ đếm sai và nấc phạt đã được hoàn nguyên về 0."
}
```

---

## 5. Hợp đồng Yêu cầu Thử thách CAPTCHA Nội bộ: `GET /api/account/captcha-challenge`

* **Phương thức**: `GET`
* **URL**: `/api/account/captcha-challenge`
* **Response (HTTP 200 OK)**:
```json
{
  "challengeId": "9d48b1a8-c319-450e-a612-92138eb15f33",
  "question": "15 + 8 = ?",
  "signature": "a8fbc1029c...hmac_sha256",
  "expiresAtUtc": "2026-11-09T09:35:00Z"
}
```

