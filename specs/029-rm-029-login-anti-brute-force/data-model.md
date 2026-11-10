# Mô hình Dữ liệu (Data Model): RM-029 Chống Tấn công Brute-Force & Bảo vệ Xác thực Đăng nhập

**Nhánh**: `029-rm-029-login-anti-brute-force` | **Ngày**: 2026-11-09 | **Đặc tả**: [spec.md](spec.md) | **Kế hoạch**: [plan.md](plan.md)

---

## 1. Mở rộng Thực thể `IdentityUser` (ABP Identity)

Thay vì tạo bảng mới làm phân mảnh dữ liệu xác thực, tính năng mở rộng cơ chế `ExtraProperties` của `IdentityUser` theo chuẩn ABP Framework:

```text
┌─────────────────────────────────────────────────────────────┐
│                        IdentityUser                         │
├─────────────────────────────────────────────────────────────┤
│ + Id: Guid                                                  │
│ + UserName: string                                          │
│ + Email: string                                             │
│ + AccessFailedCount: int                                    │
│ + LockoutEnabled: bool (default: true)                      │
│ + LockoutEnd: DateTimeOffset?                               │
├─────────────────────────────────────────────────────────────┤
│ ExtraProperties:                                            │
│   - "LockoutLevel": int (0: Chưa phạt, 1..4: Cấp độ phạt)  │
│   - "LastLockoutUtc": DateTimeOffset?                       │
└─────────────────────────────────────────────────────────────┘
```

### Chi tiết các thuộc tính Lockout của `IdentityUser`:
| Thuộc tính / Key | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `AccessFailedCount` | `int` | `0` | Số lần nhập sai mật khẩu liên tiếp trong chu kỳ hiện tại (tối đa 5). |
| `LockoutEnabled` | `bool` | `true` | Cờ kích hoạt chính sách khóa cho người dùng này. |
| `LockoutEnd` | `DateTimeOffset?` | `null` | Mốc thời gian UTC kết thúc lệnh khóa tài khoản. |
| `ExtraProperties["LockoutLevel"]` | `int` | `0` | Cấp độ phạt bậc thang lũy tiến (1: 5m, 2: 10m, 3: 15m, 4: 30m). |
| `ExtraProperties["LastLockoutUtc"]`| `DateTimeOffset?` | `null` | Thời điểm UTC lần cuối cùng tài khoản bị kích hoạt khóa. |

---

## 2. Máy Trạng thái Khóa Tài khoản Bậc thang (Lockout State Machine)

```text
       [Active - Bình thường]
                 │
                 │ Nhập sai 5 lần liên tiếp
                 ▼
       [Khóa Nấc 1: 5 phút] ────── (Đăng nhập đúng sau khi hết giờ) ──────┐
                 │                                                          │
                 │ Hết giờ, tiếp tục nhập sai 5 lần                         │
                 ▼                                                          │
       [Khóa Nấc 2: 10 phút] ───── (Đăng nhập đúng sau khi hết giờ) ──────┤
                 │                                                          │
                 │ Hết giờ, tiếp tục nhập sai 5 lần                         │
                 ▼                                                          │
       [Khóa Nấc 3: 15 phút] ───── (Đăng nhập đúng sau khi hết giờ) ──────┤
                 │                                                          │
                 │ Hết giờ, tiếp tục nhập sai 5 lần                         │
                 ▼                                                          │
   ┌── [Khóa Nấc 4: 30 phút (Trần)] (Đăng nhập đúng sau khi hết giờ) ──────┤
   │             │                                                          │
   └── Sai 5 lần ┘                                                          │
                                                                            │
   (Tự động reset: AccessFailedCount = 0 & LockoutLevel = 0) ◄──────────────┘
```

---

## 3. Data Transfer Objects (DTOs)

### 3.1. DTO Phản hồi Kết quả Xác thực Thất bại (`LoginFailureDto`)
DTO chuẩn hóa được trả về khi đăng nhập thất bại do sai mật khẩu hoặc tài khoản bị khóa:

```csharp
namespace Acme.TooHungry.Identity;

public class LoginFailureDto
{
    /// <summary>
    /// Cho biết tài khoản có đang bị khóa hay không
    /// </summary>
    public bool IsLockedOut { get; set; }

    /// <summary>
    /// Cấp độ phạt bậc thang hiện tại (1: 5m, 2: 10m, 3: 15m, 4: 30m)
    /// </summary>
    public int LockoutLevel { get; set; }

    /// <summary>
    /// Số giây còn lại trước khi tài khoản được mở khóa (dùng cho countdown timer)
    /// </summary>
    public int RemainingSeconds { get; set; }

    /// <summary>
    /// Số lần thử còn lại trong chu kỳ 5 lần trước khi bị khóa
    /// </summary>
    public int RemainingAttemptsBeforeLock { get; set; }

    /// <summary>
    /// Cho biết client có bắt buộc phải giải CAPTCHA hay không
    /// </summary>
    public bool RequireCaptcha { get; set; }

    /// <summary>
    /// ID phiên thử thách CAPTCHA số học (nếu áp dụng cơ chế internal fallback)
    /// </summary>
    public string? CaptchaChallengeId { get; set; }

    /// <summary>
    /// Câu hỏi thử thách số học (ví dụ: "14 + 9 = ?")
    /// </summary>
    public string? CaptchaQuestion { get; set; }

    /// <summary>
    /// Thông báo lỗi an toàn, chuẩn hóa song ngữ
    /// </summary>
    public string SafeErrorMessage { get; set; } = string.Empty;
}
```

### 3.2. DTO Mở khóa Tài khoản Thủ công bởi Admin (`AdminUnlockUserDto`)
```csharp
namespace Acme.TooHungry.Identity;

public class AdminUnlockUserDto
{
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
}
```

### 3.3. DTO Xác minh CAPTCHA Nội bộ (`InternalCaptchaVerificationDto`)
```csharp
namespace Acme.TooHungry.Identity;

public class InternalCaptchaVerificationDto
{
    public string ChallengeId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public long Timestamp { get; set; }
}
```

---

## 4. Mô hình Bộ nhớ Đệm Phân vùng Rate Limiting (In-Memory Rate Limiting Model)

Sử dụng `PartitionedRateLimiter` của .NET với khóa phân vùng là Client IP:

```text
RateLimiterPartitionCache:
┌─────────────────────┬───────────────────┬───────────────────────────────┐
│ Partition Key (IP)  │ Window (60s)      │ Trạng thái                    │
├─────────────────────┼───────────────────┼───────────────────────────────┤
│ "192.168.1.45"      │ 3 / 10 requests   │ ALLOWED                       │
│ "14.232.112.5"      │ 10 / 10 requests  │ LIMIT_REACHED                 │
│ "14.232.112.5"      │ Req thứ 11        │ REJECTED (HTTP 429, Retry 35s)│
└─────────────────────┴───────────────────┴───────────────────────────────┘
```

---

## 5. Mô hình Trạng thái Phía Client Angular (Signal State)

```typescript
export interface AuthLockoutState {
  isLocked: boolean;
  lockoutLevel: number;
  remainingSeconds: number;
  remainingAttempts: number;
  requireCaptcha: boolean;
  captchaQuestion?: string;
  captchaChallengeId?: string;
}

export const initialAuthLockoutState: AuthLockoutState = {
  isLocked: false,
  lockoutLevel: 0,
  remainingSeconds: 0,
  remainingAttempts: 5,
  requireCaptcha: false
};
```

