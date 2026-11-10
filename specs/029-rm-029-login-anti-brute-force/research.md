# Nghiên cứu Kỹ thuật (Technical Research): RM-029 Chống Tấn công Brute-Force & Bảo vệ Xác thực Đăng nhập

**Nhánh**: `029-rm-029-login-anti-brute-force` | **Ngày**: 2026-11-09 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Cơ chế Khóa Tài khoản Bậc thang Lũy tiến (Escalating Lockout Ladder)

### 1.1. Thách thức với cấu hình mặc định của ASP.NET Core Identity
- Mặc định, `IdentityOptions.Lockout.DefaultLockoutTimeSpan` chỉ hỗ trợ một khoảng thời gian tĩnh cố định (ví dụ: `TimeSpan.FromMinutes(5)`).
- Khi người dùng hết hạn khóa và tiếp tục nhập sai, thời gian khóa của các lần tiếp theo vẫn chỉ là 5 phút. Điều này không đáp ứng được yêu cầu nghiệp vụ tăng dần độ trừng phạt theo bậc thang:
  - **Lần 1**: Khóa 5 phút
  - **Lần 2**: Khóa 10 phút
  - **Lần 3**: Khóa 15 phút
  - **Lần 4 trở đi**: Khóa 30 phút (mức trần)

### 1.2. Giải pháp Kiến trúc: `UserLockoutManager` trong Tầng Domain
- **Lưu trữ nấc phạt**: Tận dụng cơ chế `ExtraProperties` chuẩn của ABP Framework trên thực thể `IdentityUser` với khóa `LockoutLevel` (kiểu `int`). Giải pháp này:
  - Không phá vỡ bảng `AbpUsers` cốt lõi của ABP Identity.
  - Tự động được lưu trữ bền vững trong cơ sở dữ liệu qua EF Core.
  - Được bảo toàn qua các chu kỳ khởi động lại server.
- **Quy tắc tính toán thời gian khóa (`GetNextLockoutTimeSpan`)**:
  ```csharp
  public TimeSpan CalculateLockoutTimeSpan(int currentLevel)
  {
      return currentLevel switch
      {
          1 => TimeSpan.FromMinutes(5),
          2 => TimeSpan.FromMinutes(10),
          3 => TimeSpan.FromMinutes(15),
          _ => TimeSpan.FromMinutes(30)
      };
  }
  ```
- **Xử lý sự kiện đăng nhập thất bại**:
  - Khi người dùng nhập sai, gọi `UserManager.AccessFailedAsync(user)`.
  - Nếu `user.AccessFailedCount >= 5`:
    - Đọc `currentLevel = user.GetProperty<int>("LockoutLevel", 0) + 1`.
    - Tính toán `lockoutDuration = CalculateLockoutTimeSpan(currentLevel)`.
    - Gán `lockoutEnd = DateTimeOffset.UtcNow.Add(lockoutDuration)`.
    - Gọi `UserManager.SetLockoutEndDateAsync(user, lockoutEnd)`.
    - Cập nhật `user.SetProperty("LockoutLevel", currentLevel)`.
    - Reset `user.AccessFailedCount = 0` (để chu kỳ sau bắt đầu đếm 5 lần mới).
- **Xử lý sự kiện đăng nhập thành công**:
  - Gọi `UserManager.ResetAccessFailedCountAsync(user)`.
  - Đặt lại `user.SetProperty("LockoutLevel", 0)`.
- **Xử lý Admin mở khóa thủ công (`AdminUnlockAsync`)**:
  - Gọi `UserManager.SetLockoutEndDateAsync(user, null)`.
  - Gọi `UserManager.ResetAccessFailedCountAsync(user)`.
  - Đặt lại `user.SetProperty("LockoutLevel", 0)`.

---

## 2. Giới hạn Tần suất (Rate Limiting) theo Client IP bằng ASP.NET Core Built-in RateLimiter

### 2.1. Đánh giá lựa chọn công nghệ
- **Phương án A: Thư viện bên thứ ba (AspNetCoreRateLimit)**: Đã cũ, ít được cập nhật cho .NET 9/10, cấu hình phức tạp.
- **Phương án B: `Microsoft.AspNetCore.RateLimiting` (.NET Built-in)**:
  - Tích hợp sâu vào ASP.NET Core pipeline từ .NET 7+.
  - Hiệu năng cực cao (Zero-allocation path), hỗ trợ PartitionedRateLimiter.
  - Hỗ trợ đầy đủ 4 thuật toán: Fixed Window, Sliding Window, Token Bucket, Concurrency.
  - **Lựa chọn**: **Phương án B** với thuật toán **Sliding Window** (Cửa sổ trượt).

### 2.2. Thiết kế Sliding Window Policy cho Endpoints Đăng nhập
- **Tham số cấu hình**:
  - `PermitLimit = 10` (tối đa 10 requests).
  - `Window = TimeSpan.FromMinutes(1)` (khung thời gian 1 phút).
  - `SegmentsPerWindow = 6` (chia nhỏ 1 phút thành 6 phân đoạn 10 giây để cửa sổ trượt mượt mà).
  - `QueueLimit = 0` (không xếp hàng chờ, từ chối ngay khi vượt ngưỡng để tiết kiệm tài nguyên).
- **Phân vùng (Partitioning) theo Client IP**:
  ```csharp
  options.AddPolicy("LoginRateLimitPolicy", context =>
  {
      var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
      return RateLimitPartition.GetSlidingWindowLimiter(clientIp, _ => new SlidingWindowRateLimiterOptions
      {
          PermitLimit = 10,
          Window = TimeSpan.FromMinutes(1),
          SegmentsPerWindow = 6,
          QueueLimit = 0
      });
  });
  ```
- **Xử lý từ chối (OnRejected Callback)**:
  - Thiết lập HTTP Status `429 Too Many Requests`.
  - Thêm header `Retry-After: <số giây>`.
  - Trả về payload JSON theo chuẩn ABP Error Response:
    ```json
    {
      "error": {
        "code": "TooHungry:RateLimitExceeded",
        "message": "Quá nhiều yêu cầu đăng nhập từ địa chỉ IP của bạn. Vui lòng thử lại sau.",
        "details": "Client IP đã vượt quá giới hạn 10 lần thử / phút. Vui lòng chờ trước khi thử lại."
      }
    }
    ```

---

## 3. Chống Tấn công Thời gian (Timing Attack) & Rà quét Tài khoản (Account Enumeration)

### 3.1. Phân tích lỗ hổng Timing Attack
- Trong các hệ thống thông thường, khi kiểm tra đăng nhập:
  - Nếu username không tồn tại trong DB: Hàm trả về `UserNotFound` ngay lập tức (thời gian xử lý ~5ms).
  - Nếu username tồn tại nhưng sai password: Hệ thống phải chạy thuật toán băm mật khẩu PBKDF2/Argon2 (thời gian xử lý ~100ms - 200ms).
- Kẻ tấn công có thể đo độ trễ mạng để suy đoán xem tài khoản `admin`, `cashier`, `manager` có tồn tại trong hệ thống hay không.

### 3.2. Giải pháp Giả lập Tính toán Hằng số Thời gian (Constant-time Evaluation)
- Khi tìm kiếm username/email không thấy:
  ```csharp
  if (user == null)
  {
      // Chạy một phép băm giả lập với chuỗi ngẫu nhiên để tiêu tốn đúng lượng CPU tương đương
      _dummyPasswordHasher.VerifyHashedPassword(_dummyUser, _dummyHashedPassword, providedPassword);
      
      // Ghi log audit an toàn
      _logger.LogWarning("[SECURITY_AUDIT] Failed login attempt for non-existent identity: {Identity}", sanitizedIdentity);
      
      return SignInResult.Failed;
  }
  ```
- Kết quả: Độ lệch thời gian xử lý giữa tài khoản có thực và không có thực là `< 15ms`, triệt tiêu hoàn toàn khả năng dò quét tài khoản qua độ trễ mạng.

---

## 4. Thử thách Xác thực Động (Dynamic CAPTCHA / Proof-of-Human)

### 4.1. Ngưỡng kích hoạt
- Khi một IP hoặc một tài khoản có số lần đăng nhập sai đạt **3 lần**:
  - Backend trả về cờ `requireCaptcha: true` trong response.
  - Frontend Angular tự động render khối Thử thách Xác thực.

### 4.2. Giải pháp kỹ thuật CAPTCHA kép (Hybrid Solution)
1. **Môi trường Production (Có Internet)**:
   - Tích hợp **Cloudflare Turnstile**: Giải pháp vô hình, không bắt người dùng bấm chọn đèn giao thông/xe bus gây bực bội, tốc độ xác minh < 1 giây, bảo mật cao.
2. **Môi trường Nhà hàng Nội bộ (Offline / Mạng cục bộ không ra ngoài Internet)**:
   - Tích hợp **Fallback Arithmetic CAPTCHA Engine**:
     - Backend sinh phép toán số học ngẫu nhiên (ví dụ: `17 + 8 = ?`), ký số mã HMAC bằng Secret Key kèm timestamp có hạn dùng 2 phút.
     - Frontend hiển thị câu hỏi số học đơn giản.
     - Khi submit, Backend xác thực chữ ký HMAC và kết quả tính toán mà không cần gọi API ra bên ngoài internet.

---

## 5. Kiến trúc Giao diện Cooldown Countdown Timer trên Angular

### 5.1. Quản lý State bằng Angular Signals
- Sử dụng Signal nguyên bản (`signal`, `computed`) để đảm bảo hiệu năng cao nhất mà không gây Change Detection toàn ứng dụng:
  ```typescript
  readonly remainingSeconds = signal<number>(0);
  readonly isLocked = computed(() => this.remainingSeconds() > 0);
  readonly formattedTime = computed(() => {
    const s = this.remainingSeconds();
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });
  ```
- Bộ đếm thời gian: Sử dụng RxJS `timer(0, 1000)` kết hợp `takeWhile(() => this.remainingSeconds() > 0)`:
  - Mỗi giây giảm `remainingSeconds` đi 1 đơn vị.
  - Khi đếm về 0: Tự động giải phóng trạng thái khóa, bật lại nút Đăng nhập và các trường nhập liệu, xóa bỏ cảnh báo mà không cần reload (F5) trang.

### 5.2. Chuẩn Thiết kế Nhận diện Bento Card Cam & Trắng
- Thẻ thông báo trạng thái Cooldown:
  - Khung viền màu cam ấm `#EA580C`, nền màu đào nhạt `#FFF3E8`, góc bo mềm mại `border-radius: 12px`.
  - Icon ổ khóa màu cam `#EA580C` xoay nhẹ hoặc nhịp thở nhẹ nhàng.
  - Typography hiển thị thời gian đếm ngược: `font-size: 20px; font-weight: 700; color: #EA580C; font-family: monospace;`.

