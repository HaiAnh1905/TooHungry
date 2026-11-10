# Đặc tả Tính năng (Feature Specification): Chống Tấn công Brute-Force & Bảo vệ Xác thực Đăng nhập (Login Anti-Brute-Force & Rate Limiting)

**Mã Tính năng (Feature ID)**: `RM-029`

**Nhánh Tính năng (Feature Branch)**: `029-rm-029-login-anti-brute-force`

**Ngày lập**: 2026-11-09

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-029: *"Thiết lập cơ chế phòng thủ chuyên sâu nhiều tầng (Defense-in-depth) nhằm bảo vệ triệt để các endpoint xác thực và đăng nhập khỏi các cuộc tấn công dò đoán mật khẩu tự động (Brute-Force), tấn công rà quét mật khẩu phổ biến diện rộng (Password Spraying) và chiếm đoạt tài khoản (Credential Stuffing)."*
- Yêu cầu làm rõ từ cuộc trao đổi với người dùng: *"Về phần khóa tài khoản theo người dùng, chỉnh lại phần khóa tạm thời, từ lần đầu là 5 phút sau đó là 10 phút, 15 phút và cuối cùng là 30 phút."*
- Kế thừa & Tương thích:
  - `RM-001`: Đăng nhập & Xác thực hệ thống qua OpenIddict & ABP Identity.
  - `RM-002`: Hệ thống Shared UI, Bento Card & chuẩn thương hiệu Cam & Trắng (`#EA580C`).
  - `RM-003`: Quản lý Người dùng, Vai trò & Phân quyền Identity.
  - `RM-023`: Bảo mật Endpoints, vệ sinh mã nguồn, chuẩn hóa phân quyền & Token Factory.
  - `RM-026`: Bộ kiểm thử tự động phân quyền, bảo mật & tính bất biến.

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 09-11-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.clarify` - 6 Quyết định Then chốt)

- **Q1: Cơ chế khóa tài khoản theo người dùng (Account Lockout Policy) hoạt động theo bậc thang như thế nào?**
  - **A1**: **Áp dụng cơ chế bậc thang lũy tiến (Escalating Lockout Ladder)** sau mỗi 5 lần nhập sai mật khẩu liên tiếp (`MaxFailedAccessAttempts = 5`):
    - **Nấc 1 (Lần đầu)**: Khóa tài khoản tạm thời **5 phút**.
    - **Nấc 2 (Lần 2)**: Sau khi hết 5 phút nấc 1 mà người dùng tiếp tục nhập sai 5 lần liên tiếp -> Khóa tạm thời **10 phút**.
    - **Nấc 3 (Lần 3)**: Tiếp tục sai 5 lần sau nấc 2 -> Khóa tạm thời **15 phút**.
    - **Nấc 4 trở đi (Cuối cùng/Trần)**: Tiếp tục sai 5 lần sau nấc 3 -> Khóa tạm thời **30 phút** (mức trần tối đa cho mọi chu kỳ sai kế tiếp).
    - **Cơ chế hoàn nguyên (Reset)**: Ngay khi người dùng nhập đúng thông tin và đăng nhập thành công, hệ thống xóa sạch bộ đếm sai (`AccessFailedCount = 0`) và khôi phục nấc phạt về mặc định (Nấc 1).
    - **Quản trị viên mở khóa (Admin Override)**: Quản trị viên (Admin/Manager) có quyền chủ động mở khóa tài khoản tức thì trong màn hình Quản lý Người dùng (`RM-003`) khi nhân viên gặp sự cố.

- **Q2: Phạm vi áp dụng Lockout trên tầng Backend ABP & OpenIddict?**
  - **A2**: **Kích hoạt bắt buộc `lockoutOnFailure: true` trên mọi kênh xác thực**:
    - OpenIddict Token Endpoint: `/connect/token` với `grant_type=password`.
    - ABP Account API: `/api/account/login` và `/api/account/check-password`.
    - ABP MVC Account Login Page: `/Account/Login`.
    - Mọi lời gọi API xác thực thất bại đều phải kích hoạt hàm `UserManager.AccessFailedAsync(user)` để tính toán chính xác nấc khóa thời gian.

- **Q3: Cơ chế Giới hạn Tần suất (Rate Limiting) theo IP & Endpoint để chống Password Spraying?**
  - **A3**: **Triển khai middleware `Microsoft.AspNetCore.RateLimiting` tích hợp sẵn của .NET**:
    - **Chính sách (Policy)**: Sliding Window Rate Limiter áp dụng trên các route xác thực (`/connect/token`, `/api/account/login`, `/Account/Login`).
    - **Tham số cấu hình**: Tối đa 10 requests / 1 phút trên mỗi Client IP (hoặc dải IP sau proxy hợp lệ qua `X-Forwarded-For`).
    - **Phản hồi**: Khi vượt ngưỡng, hệ thống lập tức ngắt kết nối và trả về HTTP `429 Too Many Requests` kèm tiêu đề `Retry-After: <số giây>`, ngăn ngừa kẻ tấn công thử xoay vòng hàng loạt tài khoản từ một IP (*Password Spraying Attack*).

- **Q4: Chống tấn công thời gian (Timing Attack) và rà quét tài khoản (Username Enumeration)?**
  - **A4**: **Đồng nhất hóa phản hồi và chuẩn hóa thời gian tính toán**:
    - Khi sai thông tin (dù là sai username hay sai password): Hệ thống trả về thông báo lỗi chung nhất quán: *"Tên đăng nhập hoặc mật khẩu không chính xác"*.
    - Khi user không tồn tại trong cơ sở dữ liệu: Hệ thống vẫn thực hiện một phép băm giả lập (dummy password hash verification) bằng thời gian với phép băm thật, triệt tiêu sự chênh lệch mili-giây mà kẻ tấn công có thể đo đạc để suy đoán tài khoản.

- **Q5: Cơ chế Thử thách Động (Dynamic CAPTCHA / Proof-of-Human)?**
  - **A5**: **Chốt sử dụng CAPTCHA câu đố số học nội bộ (Internal Arithmetic Puzzle, ký số HMAC-SHA256)**:
    - Nếu cùng một IP hoặc cùng một tài khoản có **3 lần đăng nhập thất bại liên tiếp**: Màn hình đăng nhập sẽ tự động hiển thị thử thách câu đố số học nhẹ (ví dụ: `15 + 8 = ?`), sinh ngẫu nhiên từ Backend và ký bảo mật bằng HMAC-SHA256 kèm timestamp hạn dùng 2 phút.
    - Hoạt động 100% độc lập trên mạng cục bộ (LAN) của nhà hàng, tuyệt đối không phụ thuộc vào kết nối Internet ra bên ngoài hay dịch vụ đám mây bên thứ ba (như Turnstile/reCAPTCHA).
    - Nút Đăng nhập chỉ được phép submit khi thử thách CAPTCHA được giải đúng và chữ ký HMAC hợp lệ.

- **Q6: Trải nghiệm người dùng (UX) và Đa ngôn ngữ (i18n) trên giao diện Angular?**
  - **A6**: **Phản hồi an toàn, minh bạch, trực quan và chuẩn song ngữ**:
    - Hiển thị cảnh báo số lần nhập sai còn lại trước khi tài khoản bị khóa (ví dụ: *"Bạn còn 2 lần thử trước khi tài khoản bị khóa tạm thời"*).
    - Khi tài khoản bị khóa: Nút Đăng nhập bị vô hiệu hóa (`disabled`), kèm theo đồng hồ đếm ngược thời gian chờ (`Cooldown Timer`) hiển thị trực quan (ví dụ: *"Tài khoản tạm thời bị khóa. Vui lòng thử lại sau 04:59"*).
    - 100% các chuỗi văn bản cảnh báo, lỗi và nhãn thời gian phải được cập nhật đồng bộ trong cả hai tệp `en.json` và `vi.json`.

- **Q7: Chính sách khóa tài khoản có áp dụng như nhau cho tài khoản Quản trị viên tối cao (admin) không?**
  - **A7**: **Vẫn áp dụng đầy đủ chính sách khóa bậc thang (5m → 10m → 15m → 30m) cho tài khoản admin để bảo đảm an ninh cao nhất, nhưng trang bị công cụ mở khóa khẩn cấp qua CLI**:
    - Để tránh tình trạng Quản trị viên bị khóa ngoài vĩnh viễn hoặc bị tấn công từ chối dịch vụ (DoS tài khoản), hệ thống cung cấp công cụ dòng lệnh khẩn cấp trong `Acme.TooHungry.DbMigrator` (tham số `--unlock-admin`), cho phép kỹ sư/DevOps mở khóa tức thời tài khoản `admin` ngay trên server.

- **Q8: Nấc phạt bậc thang (Lockout Level) có tự động hạ/reset theo thời gian nếu người dùng không tái phạm không?**
  - **A8**: **Tự động hoàn nguyên nấc phạt về Nấc 1 sau 24 giờ không có hoạt động sai (Inactivity Decay Window - 24 giờ)**:
    - Nếu một tài khoản đã từng bị phạt ở nấc cao (Nấc 2 hoặc Nấc 3), nhưng sau 24 giờ kể từ lần khóa gần nhất không phát sinh thêm bất kỳ lần nhập sai nào, hệ thống sẽ tự động hạ cấp độ phạt `LockoutLevel` về 0 (chu kỳ phạt tiếp theo nếu có sẽ bắt đầu lại từ Nấc 1: 5 phút).
    - Ngay khi người dùng đăng nhập thành công với mật khẩu chính xác, hệ thống cũng xóa sạch bộ đếm sai (`AccessFailedCount = 0`) và đưa `LockoutLevel` về 0 ngay lập tức.

- **Q9: Khi phát hiện đợt tấn công brute-force dồn dập (ví dụ > 50 lần sai trong 5 phút), hệ thống nên phát cảnh báo qua kênh nào?**
  - **A9**: **Bắn thông báo thời gian thực qua SignalR kèm âm thanh cảnh báo tới màn hình Admin/Manager đang trực, kết hợp ghi log Serilog & AuditLog**:
    - Khi vượt ngưỡng nguy hiểm (High-severity threshold), Backend phát sự kiện `SecurityAlertTriggered` qua SignalR tới nhóm người dùng có vai trò `Administrator` và `Manager` đang đăng nhập.
    - Giao diện Admin/Manager hiển thị Toast/Banner cảnh báo đỏ khẩn cấp (*"Phát hiện dấu hiệu tấn công Brute-force từ IP [xxx]!"*), kích hoạt chuông cảnh báo âm thanh và ghi log `[SECURITY_ALERT][BRUTE_FORCE]` vào Serilog / `AbpAuditLogs`.

- **Q10: Khi cả tài khoản và địa chỉ IP đều bị chặn đồng thời, giao diện Cooldown Timer nên ưu tiên hiển thị thời gian đếm ngược nào?**
  - **A10**: **Hiển thị mốc thời gian chờ lớn hơn (`Math.max(lockoutRemaining, ipRateLimitRemaining)`)**:
    - Giao diện Cooldown Timer sẽ tính toán và hiển thị mốc thời gian chờ dài nhất giữa hai cơ chế, giúp nhân viên nắm bắt chính xác thời điểm thực sự có thể thao tác đăng nhập lại mà không bị chặn tiếp bởi bất kỳ lớp bảo vệ nào.



---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Chống Tấn công Brute-Force & Bảo vệ Xác thực Đăng nhập (RM-029)** là tấm khiên an ninh trọng yếu bảo vệ cổng xác thực của hệ thống Quản lý Nhà hàng `Acme.TooHungry`. Trong môi trường nhà hàng hiện đại, các thiết bị POS, máy tính bảng phục vụ và máy trạm thu ngân thường xuyên chia sẻ mạng nội bộ và kết nối Internet, tiềm ẩn nguy cơ bị quét cổng hoặc rò rỉ thông tin đăng nhập.

Hệ thống triển khai mô hình bảo vệ chuyên sâu 4 lớp (*Defense-in-depth*):
1. **Lớp 1 (User-level)**: Khóa tài khoản bậc thang lũy tiến (5 phút → 10 phút → 15 phút → 30 phút).
2. **Lớp 2 (Network/IP-level)**: Sliding Window Rate Limiting trên Client IP đối với các endpoint xác thực.
3. **Lớp 3 (Challenge-level)**: Kích hoạt Dynamic CAPTCHA sau 3 lần thử sai.
4. **Lớp 4 (Auditing/Monitoring)**: Ghi vết kiểm toán an ninh và cảnh báo tức thời khi có dấu hiệu brute-force dồn dập.

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Khóa tài khoản theo bậc thang lũy tiến khi nhập sai mật khẩu (Ưu tiên: P1)

Là một hệ thống an ninh, tôi muốn tự động khóa tài khoản tạm thời theo các nấc thời gian tăng dần khi người dùng nhập sai mật khẩu 5 lần liên tiếp, nhằm làm tê liệt các đòn tấn công dò đoán mật khẩu tự động mà không gây khó khăn vĩnh viễn cho người dùng thật.

**Lý do cho mức độ ưu tiên này**: Đây là yêu cầu cốt lõi nhất nhằm ngăn chặn hoàn toàn việc tin tặc dùng danh sách từ điển thử mật khẩu liên tục trên một tài khoản nhân viên.

**Kiểm thử Độc lập**: Có thể kiểm thử độc lập bằng bài test tự động (xUnit Integration Test) mô phỏng 5 lần gọi API xác thực sai liên tiếp và kiểm tra trường `LockoutEnd` của `IdentityUser`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Nấc 1 (5 phút)**:
   - **Cho trước**: Tài khoản `cashier1` đang hoạt động bình thường, chưa từng bị khóa.
   - **Khi**: Người dùng nhập sai mật khẩu 5 lần liên tiếp.
   - **Thì**: Tài khoản bị khóa tạm thời; thuộc tính `LockoutEnd` được gán bằng `UtcDateTime.Now + 5 phút`. Giao diện hiển thị thông báo khóa và đồng hồ đếm ngược 5 phút. Mọi nỗ lực đăng nhập trong 5 phút này (dù đúng mật khẩu) đều bị từ chối với thông báo tài khoản đang bị khóa.
2. **Nấc 2 (10 phút)**:
   - **Cho trước**: Tài khoản `cashier1` vừa hết hạn khóa 5 phút của Nấc 1.
   - **Khi**: Người dùng tiếp tục nhập sai mật khẩu 5 lần liên tiếp nữa.
   - **Thì**: Hệ thống nhận diện đây là lần vi phạm thứ 2 và khóa tài khoản trong **10 phút** (`LockoutEnd = UtcDateTime.Now + 10 phút`).
3. **Nấc 3 (15 phút)**:
   - **Cho trước**: Tài khoản `cashier1` vừa hết hạn khóa 10 phút của Nấc 2.
   - **Khi**: Người dùng tiếp tục nhập sai mật khẩu 5 lần liên tiếp.
   - **Thì**: Hệ thống khóa tài khoản trong **15 phút**.
4. **Nấc 4 trở đi (30 phút)**:
   - **Cho trước**: Tài khoản `cashier1` vừa hết hạn khóa 15 phút của Nấc 3.
   - **Khi**: Người dùng tiếp tục nhập sai mật khẩu 5 lần liên tiếp.
   - **Thì**: Hệ thống khóa tài khoản trong **30 phút**. Các chu kỳ vi phạm tiếp theo nếu có đều duy trì mức khóa trần này là 30 phút.
5. **Đăng nhập thành công khôi phục trạng thái ban đầu**:
   - **Cho trước**: Tài khoản `cashier1` đã từng bị phạt ở Nấc 2 hoặc Nấc 3 và đã hết thời gian khóa.
   - **Khi**: Người dùng nhập chính xác mật khẩu hợp lệ.
   - **Thì**: Hệ thống cấp token đăng nhập thành công, tự động đặt lại `AccessFailedCount = 0` và reset cấp độ phạt bậc thang về 0. Lần vi phạm tiếp theo sau này (nếu có) sẽ bắt đầu lại từ Nấc 1 (5 phút).

---

### User Story 2 - Giới hạn tần suất gọi API theo Client IP (Rate Limiting) (Ưu tiên: P1)

Là hệ thống máy chủ, tôi muốn giới hạn tần suất gửi yêu cầu xác thực từ mỗi địa chỉ IP (tối đa 10 requests / phút), nhằm ngăn chặn các cuộc tấn công rà quét mật khẩu diện rộng trên nhiều tài khoản (*Password Spraying* hoặc *DDoS Login*).

**Lý do cho mức độ ưu tiên này**: Khi kẻ tấn công đổi username liên tục (chỉ thử 1 lần cho mỗi user) thì cơ chế khóa tài khoản cá nhân sẽ không bị kích hoạt. Do đó, Rate Limiting theo IP là chốt chặn bắt buộc ở tầng hạ tầng mạng.

**Kiểm thử Độc lập**: Gọi liên tiếp 11 requests tới endpoint `/connect/token` hoặc `/api/account/login` từ cùng một IP trong vòng dưới 60 giây và kiểm tra phản hồi HTTP Status Code 429.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Trong ngưỡng an toàn**:
   - **Cho trước**: Client IP gửi dưới 10 requests đăng nhập trong vòng 1 phút.
   - **Khi**: Client gửi request hợp lệ tiếp theo.
   - **Thì**: Request được chuyển tiếp vào bộ phận xử lý xác thực bình thường (HTTP 200 hoặc HTTP 400).
2. **Vượt ngưỡng giới hạn**:
   - **Cho trước**: Client IP đã gửi 10 requests đăng nhập trong vòng 1 phút.
   - **Khi**: Client gửi tiếp request thứ 11 trong cùng khung thời gian 1 phút đó.
   - **Thì**: Middleware RateLimiter chặn đứng request ngay lập tức, trả về HTTP status `429 Too Many Requests`, kèm header `Retry-After: <số giây>` và body JSON lỗi chuẩn hóa. Request thứ 11 không được chạm tới cơ sở dữ liệu để bảo vệ tài nguyên hệ thống.

---

### User Story 3 - Kích hoạt Thử thách Bảo mật Động (Dynamic CAPTCHA) (Ưu tiên: P2)

Là người dùng hợp pháp, tôi muốn được hệ thống đưa ra thử thách xác minh người thật (CAPTCHA) sau khi nhập sai 3 lần, để nhắc nhở tôi kiểm tra lại thông tin trước khi bị khóa tài khoản 5 phút, đồng thời chặn đứng các con bot đang cố gắng submit tự động.

**Lý do cho mức độ ưu tiên này**: Tăng cường bảo mật trước khi chạm ngưỡng phạt nặng, bảo vệ người dùng lơ đễnh và ngăn bot chiếm dụng phiên.

**Kiểm thử Độc lập**: Nhập sai 3 lần trên giao diện Angular, kiểm tra component CAPTCHA xuất hiện và nút Login bị khóa cho đến khi hoàn thành CAPTCHA.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Kích hoạt sau 3 lần sai**:
   - **Cho trước**: Màn hình đăng nhập đang ở trạng thái thông thường.
   - **Khi**: Người dùng hoặc bot nhập sai thông tin 3 lần liên tiếp.
   - **Thì**: Giao diện hiển thị thêm khối Thử thách Xác thực câu đố số học nội bộ (Arithmetic Puzzle) và dòng cảnh báo *"Vui lòng hoàn thành câu đố xác minh để tiếp tục (còn 2 lần thử trước khi khóa)"*.
2. **Chặn submit khi chưa giải CAPTCHA**:
   - **Cho trước**: Khối CAPTCHA đang hiển thị nhưng chưa được giải.
   - **Khi**: Người dùng cố tình bấm nút Đăng nhập hoặc gửi form.
   - **Thì**: Nút Đăng nhập bị disable, form không gửi request đi.
3. **Submit thành công khi giải đúng CAPTCHA**:
   - **Cho trước**: CAPTCHA đã được xác nhận hợp lệ.
   - **Khi**: Người dùng bấm Đăng nhập.
   - **Thì**: Request đăng nhập được gửi kèm token/kết quả CAPTCHA lên Backend để xác minh trước khi thẩm định mật khẩu.

---

### User Story 4 - Giao diện Đăng nhập An toàn với Đồng hồ Đếm ngược Cooldown (Ưu tiên: P2)

Là nhân viên nhà hàng đang thao tác tại màn hình Đăng nhập, tôi muốn biết rõ số lần thử còn lại và nếu bị khóa, tôi muốn thấy đồng hồ đếm ngược thời gian còn lại một cách trực quan bằng ngôn ngữ của mình (Tiếng Việt / Tiếng Anh).

**Lý do cho mức độ ưu tiên này**: Đảm bảo trải nghiệm người dùng (UX) rõ ràng, giảm tải hoang mang và số lượng cuộc gọi nhờ hỗ trợ kỹ thuật khi tài khoản bị khóa tạm thời.

**Kiểm thử Độc lập**: Mô phỏng trạng thái khóa tài khoản và kiểm tra giao diện Angular hiển thị countdown timer đếm lùi từng giây và tự động mở khóa nút bấm khi hết giờ.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Hiển thị đếm ngược khi bị khóa**:
   - **Cho trước**: Tài khoản bị khóa 5 phút (hoặc 10m/15m/30m).
   - **Khi**: Hệ thống trả về trạng thái Lockout kèm thời gian kết thúc `lockoutEnd`.
   - **Thì**: Form đăng nhập chuyển sang trạng thái Cooldown:
     - Toàn bộ ô nhập Username, Password và nút Đăng nhập bị khóa (disabled).
     - Xuất hiện đồng hồ đếm ngược dạng thẻ mềm Bento viền cam: `04:59` đếm lùi về `00:00`.
     - Thông báo hiển thị rõ ràng bằng ngôn ngữ đã chọn: *"Tài khoản tạm thời bị khóa. Vui lòng thử lại sau [MM:SS]"*.
2. **Tự động mở khóa khi hết giờ**:
   - **Cho trước**: Đồng hồ đếm ngược đếm về `00:00`.
   - **Khi**: Thời gian khóa kết thúc.
   - **Thì**: Các ô nhập và nút Đăng nhập tự động kích hoạt trở lại (enabled), thông báo lỗi tự động ẩn đi để nhân viên tiếp tục thao tác mà không cần phải reload lại trình duyệt (F5).

---

### User Story 5 - Ghi vết Kiểm toán An ninh & Cảnh báo Tức thời (Ưu tiên: P3)

Là Quản trị viên hệ thống (Administrator), tôi muốn theo dõi được toàn bộ các sự kiện đăng nhập thất bại, vi phạm rate limit và khóa tài khoản qua Audit Log, đồng thời nhận được cảnh báo khi có sự cố bất thường để kịp thời ứng phó.

**Lý do cho mức độ ưu tiên này**: Cung cấp khả năng quan sát an ninh (Security Observability) và đối soát sự cố khi hệ thống bị tấn công mạng.

**Kiểm thử Độc lập**: Kiểm tra dữ liệu được ghi vào `AbpAuditLogs` hoặc file log Serilog sau khi kích hoạt các sự kiện lockout và rate limit.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Ghi log chi tiết sự kiện an ninh**:
   - **Cho trước**: Một request đăng nhập bị từ chối do sai mật khẩu, chạm ngưỡng khóa hoặc vi phạm rate limit.
   - **Khi**: Backend xử lý sự kiện.
   - **Thì**: Hệ thống tự động ghi nhận một bản ghi Audit Log chứa: Địa chỉ IP client, User-Agent, Tên tài khoản mục tiêu, Thời điểm chính xác (UTC), Loại vi phạm (`LOGIN_FAILED`, `ACCOUNT_LOCKED_LEVEL_X`, `RATE_LIMIT_EXCEEDED`).
2. **Cảnh báo mức độ nghiêm trọng thời gian thực**:
   - **Cho trước**: Một dải IP phát sinh hơn 50 lần đăng nhập thất bại trong vòng 5 phút (ngưỡng tấn công dồn dập).
   - **Khi**: Ngưỡng cảnh báo an ninh bị vượt qua.
   - **Thì**: Hệ thống phát sự kiện SignalR `SecurityAlertTriggered` tức thời đến toàn bộ Quản trị viên (`Administrator`) và Quản lý (`Manager`) đang online, hiển thị Toast cảnh báo đỏ nổi bật, phát âm thanh chuông cảnh báo an ninh, đồng thời ghi log `[SECURITY_ALERT][BRUTE_FORCE]` vào Serilog và `AbpAuditLogs`.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

1. **Tấn công phân tán từ nhiều địa chỉ IP (Distributed Brute Force / Botnet)**:
   - *Kịch bản*: Nhiều IP khác nhau cùng tấn công vào một tài khoản `admin`.
   - *Xử lý*: Cơ chế Rate Limiting theo IP sẽ không bắt được trường hợp này, nhưng cơ chế **Khóa tài khoản theo bậc thang (User-level Lockout)** sẽ bắt được ngay khi tổng số lần sai trên tài khoản đó chạm ngưỡng 5 lần. Tài khoản sẽ lập tức bị khóa trên toàn hệ thống.
2. **Tấn công Password Spraying (1 mật khẩu thử trên nhiều username từ 1 IP)**:
   - *Kịch bản*: Kẻ tấn công thử mật khẩu `123456` lần lượt trên 100 tài khoản khác nhau từ một máy chủ.
   - *Xử lý*: Không tài khoản nào bị sai quá 1 lần nên Lockout user không kích hoạt. Tuy nhiên, cơ chế **Rate Limiting theo Client IP** sẽ phát hiện IP này vượt ngưỡng 10 requests/phút và lập tức chặn đứng với mã lỗi 429.
3. **Quản trị viên chủ động can thiệp mở khóa (Admin Manual Unlock)**:
   - *Kịch bản*: Nhân viên nhập sai bị khóa nhưng đang trong ca làm việc gấp, liên hệ Admin nhờ hỗ trợ.
   - *Xử lý*: Quản trị viên vào màn hình Quản lý Người dùng (`RM-003`), bấm nút **[Mở khóa tài khoản]**. Backend gọi `UserManager.SetLockoutEndDateAsync(user, null)` và `UserManager.ResetAccessFailedCountAsync(user)`. Tài khoản lập tức đăng nhập lại được bình thường và cấp độ phạt trở về Nấc 1.
4. **Lệch đồng hồ giữa Client và Server (Clock Skew)**:
   - *Kịch bản*: Máy trạm của người dùng bị sai múi giờ hoặc lệch giờ so với máy chủ.
   - *Xử lý*: Backend luôn trả về thời gian còn lại dưới dạng số giây (`remainingSeconds`) thay vì chỉ trả về mốc thời gian tuyệt đối. Frontend sử dụng `remainingSeconds` để khởi tạo bộ đếm ngược, đảm bảo độ chính xác tuyệt đối không bị ảnh hưởng bởi đồng hồ của máy trạm.
5. **Ủy quyền qua Proxy / Load Balancer (X-Forwarded-For Spoofing)**:
   - *Kịch bản*: Kẻ tấn công giả mạo header `X-Forwarded-For` để giả dạng các IP khác nhau.
   - *Xử lý*: Cấu hình `ForwardedHeadersOptions` trên ASP.NET Core (`TooHungryHttpApiHostModule.cs`) chỉ tin tưởng các proxy và dải mạng được chỉ định trong cấu hình; loại bỏ các header giả mạo từ bên ngoài mạng tin cậy.

---

## 4. Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI áp dụng cơ chế khóa tài khoản bậc thang lũy tiến đối với mọi tài khoản người dùng:
  - Nấc 1: Khóa 5 phút sau 5 lần nhập sai liên tiếp.
  - Nấc 2: Khóa 10 phút nếu tiếp tục nhập sai 5 lần sau Nấc 1.
  - Nấc 3: Khóa 15 phút nếu tiếp tục nhập sai 5 lần sau Nấc 2.
  - Nấc 4 trở đi: Khóa tối đa 30 phút cho mọi chu kỳ sai 5 lần tiếp theo.
- **FR-002**: Hệ thống PHẢI đồng bộ xóa bộ đếm số lần sai (`AccessFailedCount = 0`) và reset cấp độ phạt bậc thang về 0 ngay khi người dùng đăng nhập thành công bằng mật khẩu chính xác, HOẶC tự động hoàn nguyên nấc phạt về 0 nếu sau 24 giờ kể từ lần khóa gần nhất tài khoản không phát sinh thêm bất kỳ lần nhập sai nào (Inactivity Decay Window 24h).
- **FR-003**: Hệ thống PHẢI áp dụng ràng buộc `lockoutOnFailure: true` đồng bộ trên tất cả các luồng xác thực: OpenIddict Token Endpoint (`/connect/token` password grant), API đăng nhập (`/api/account/login`), và trang đăng nhập MVC.
- **FR-004**: Hệ thống PHẢI kích hoạt Rate Limiting theo địa chỉ IP trên các route xác thực với ngưỡng tối đa 10 requests / 1 phút / Client IP, sử dụng thuật toán Sliding Window.
- **FR-005**: Khi request vi phạm Rate Limit, hệ thống PHẢI trả về mã trạng thái HTTP `429 Too Many Requests` kèm tiêu đề `Retry-After` chứa số giây cần chờ trước khi được gửi request tiếp theo.
- **FR-006**: Khi xác thực thất bại do thông tin không chính xác, hệ thống PHẢI trả về thông báo lỗi chung, an toàn (ví dụ: *"Tên đăng nhập hoặc mật khẩu không chính xác"*), tuyệt đối không tiết lộ tài khoản có tồn tại hay không (chống Account Enumeration).
- **FR-007**: Khi tài khoản bị khóa do Lockout, hệ thống PHẢI trả về thông báo an toàn kèm thời gian còn lại (số giây) để giao diện hiển thị cho người dùng.
- **FR-008**: Hệ thống PHẢI hiển thị thử thách CAPTCHA câu đố số học nội bộ (ký số HMAC-SHA256, chạy 100% offline) trên giao diện khi phát hiện 3 lần đăng nhập thất bại liên tiếp từ cùng IP hoặc tài khoản.
- **FR-009**: Giao diện đăng nhập Angular PHẢI hiển thị cảnh báo số lần thử còn lại (khi còn 1 hoặc 2 lần thử) để người dùng chủ động kiểm tra lại Caps Lock/mật khẩu.
- **FR-010**: Khi tài khoản hoặc IP bị khóa/rate-limited, giao diện Angular PHẢI vô hiệu hóa (disable) form đăng nhập và hiển thị đồng hồ đếm ngược Cooldown Timer chính xác theo mốc thời gian lớn hơn (`Math.max(lockoutRemaining, ipRateLimitRemaining)`) mà Backend trả về.
- **FR-011**: Khi đồng hồ đếm ngược kết thúc, giao diện Angular PHẢI tự động mở khóa các ô nhập liệu và nút Đăng nhập mà không yêu cầu người dùng phải tải lại trang (F5).
- **FR-012**: Màn hình Quản lý Người dùng (`RM-003`) PHẢI cho phép Quản trị viên (có quyền `TooHungryPermissions.Identity.Users.ManageLockout`) thực hiện mở khóa tài khoản thủ công ngay lập tức cho nhân viên.
- **FR-013**: Hệ thống PHẢI ghi vết đầy đủ các sự kiện an ninh vào Audit Log (IP, User-Agent, UTC timestamp, tài khoản mục tiêu, loại vi phạm) VÀ phát sự kiện SignalR thời gian thực kèm âm thanh cảnh báo tới màn hình của Quản trị viên (`Administrator`, `Manager`) đang trực khi phát hiện đợt brute-force vượt ngưỡng nguy hiểm (>50 lần sai trong 5 phút).
- **FR-014**: Hệ thống PHẢI thực hiện cân bằng thời gian xử lý (Constant-time calculation) giữa trường hợp tài khoản tồn tại và tài khoản không tồn tại để triệt tiêu lỗ hổng Timing Attack.
- **FR-015**: 100% các nhãn giao diện, thông báo lỗi, thông báo cảnh báo và văn bản đồng hồ đếm ngược PHẢI được cấu hình song ngữ đầy đủ trong `vi.json` và `en.json`.

### Yêu cầu Phi chức năng & Bảo mật (Non-Functional & Security Requirements)

- **NFR-001 (Bảo mật)**: Mọi thao tác kiểm tra Lockout, Rate Limiting và thẩm định mật khẩu BẮT BUỘC phải thực hiện tại tầng Backend. Không tin cậy bất kỳ trạng thái nào do Client gửi lên.
- **NFR-002 (Hiệu năng)**: Middleware Rate Limiter và bộ đếm Lockout phải được lưu trữ trong bộ nhớ đệm phân tán / in-memory cache hiệu năng cao, đảm bảo thời gian xử lý kiểm tra tần suất dưới 5ms cho mỗi request.
- **NFR-003 (Độ tin cậy)**: Khi ứng dụng khởi động lại hoặc chạy multi-instance, trạng thái khóa của tài khoản (`LockoutEnd`, `AccessFailedCount`) BẮT BUỘC phải được bảo toàn trong cơ sở dữ liệu `AbpUsers`.
- **NFR-004 (Tuân thủ UI/UX)**: Giao diện thẻ cảnh báo Cooldown và đồng hồ đếm ngược BẮT BUỘC phải tuân thủ chuẩn thiết kế Bento Grid và tone màu nhận diện Cam & Trắng (`#EA580C`, `#FFF3E8`) theo Hiến pháp dự án.

### Các Thực thể & Thành phần Dữ liệu Chính (Key Entities & Data Models)

- **IdentityUser (Mở rộng trạng thái Lockout)**:
  - `AccessFailedCount` (int): Số lần đăng nhập sai liên tiếp hiện tại.
  - `LockoutEnd` (DateTimeOffset?): Mốc thời gian UTC kết thúc thời gian khóa tài khoản.
  - `LockoutEnabled` (bool): Cờ bật/tắt chính sách khóa cho người dùng (mặc định: `true`).
  - `LockoutLevel` (int - ExtraProperty / Quản lý nội bộ): Nấc phạt hiện tại (0: Chưa phạt, 1: 5m, 2: 10m, 3: 15m, 4: 30m).
- **RateLimitRecord (In-memory / Cache)**:
  - `ClientIp` (string): Địa chỉ IP của client gửi request.
  - `RequestTimestamps` (List<DateTime>): Danh sách mốc thời gian các request trong khung trượt 1 phút.
- **SecurityAuditLogEntry**:
  - `ActionName`: `LOGIN_FAILED`, `LOGIN_LOCKOUT_TRIGGERED`, `RATE_LIMIT_BLOCKED`, `ADMIN_MANUAL_UNLOCK`.
  - `ClientIpAddress`, `BrowserInfo`, `ExecutionTime`, `UserName`, `ExtraData`.

---

## 5. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001 (Ngăn chặn 100% Brute-force đơn lẻ)**: 100% các kịch bản thử mật khẩu tự động vượt quá 5 lần trên 1 tài khoản đều bị chặn đứng và khóa chính xác theo các nấc 5m → 10m → 15m → 30m.
- **SC-002 (Ngăn chặn 100% Password Spraying)**: 100% các đợt gửi request đăng nhập dồn dập từ một địa chỉ IP vượt quá 10 req/phút đều bị ngắt kết nối với mã lỗi HTTP 429 mà không tiêu tốn tài nguyên truy vấn DB.
- **SC-003 (Độ chính xác Cooldown UX)**: Đồng hồ đếm ngược trên giao diện Angular hiển thị khớp 100% với thời gian khóa thực tế từ máy chủ (độ lệch dưới 1 giây) và tự động mở khóa ngay khi hết giờ mà không cần F5 trang.
- **SC-004 (Độ phủ Kiểm thử Tự động)**: Đạt 100% bài kiểm thử tự động vượt qua (100% pass trên xUnit tests cho Lockout bậc thang, Rate Limiter middleware, và Jasmine/Karma tests cho Countdown Component trên Angular).
- **SC-005 (Bảo vệ Thông tin Tài khoản)**: Không có bất kỳ sự khác biệt nào về mã phản hồi, nội dung thông báo lỗi hoặc độ trễ xử lý (độ lệch dưới 50ms) giữa tài khoản tồn tại và không tồn tại trong hệ thống.
- **SC-006 (Đa ngôn ngữ Tuyệt đối)**: 100% các chuỗi văn bản cảnh báo, lỗi và thông báo trạng thái khóa đều hiển thị chuẩn xác cả Tiếng Việt và Tiếng Anh (`vi.json`, `en.json`).

---

## 6. Các Giả định (Assumptions)

- **A-001**: Hệ thống sử dụng OpenIddict làm Auth Server chính theo cấu trúc chuẩn của ABP Framework 9.x.
- **A-002**: Cơ chế Rate Limiting ban đầu sử dụng ASP.NET Core Built-in Rate Limiter với bộ nhớ MemoryCache (sẵn sàng cấu hình chuyển sang Redis khi triển khai cụm Server phân tán).
- **A-003**: Đối với thử thách CAPTCHA, giải pháp câu đố số học nội bộ nhẹ ký số HMAC-SHA256 được sử dụng hoàn toàn để bảo đảm hệ thống hoạt động ổn định 100% trong mạng LAN nội bộ nhà hàng, không phụ thuộc kết nối Internet ra bên ngoài.
- **A-004**: Quản trị viên hệ thống có tài khoản `admin` vẫn tuân thủ cơ chế bảo vệ bậc thang này, nhưng được trang bị công cụ dòng lệnh khẩn cấp qua `Acme.TooHungry.DbMigrator --unlock-admin` để mở khóa ngay lập tức từ server nếu bị tấn công DoS hoặc quên mật khẩu.

