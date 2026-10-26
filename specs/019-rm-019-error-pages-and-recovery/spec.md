# Đặc tả Tính năng (Feature Specification): Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing)

**Mã Tính năng (Feature ID)**: `RM-019`

**Nhánh Tính năng (Feature Branch)**: `019-rm-019-error-pages-and-recovery`

**Ngày lập**: 2026-10-19

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-019: *"Thiết kế và triển khai bộ trang thông báo lỗi hệ thống hiện đại (404 Not Found, 403 Forbidden, 500 Internal Server Error / 505 HTTP Version Not Supported) kèm cơ chế điều hướng phục hồi thông minh theo vai trò và tự động trả người dùng về trang làm việc sau 5 giây, áp dụng đồng bộ cho Admin, Manager và Waiter."*
- Tích hợp và kế thừa từ các phân hệ:
  - RM-001 (Xác thực đăng nhập & Lưu trữ phiên người dùng ABP Identity)
  - RM-002 (Shared UI & Design System Cam & Trắng `#EA580C`)
  - RM-003 (Phân quyền & Vai trò người dùng ABP Identity)
  - RM-015 (Điều hướng phân hệ Waiter `/waiter/tables` & `waiterAuthGuard`)
  - RM-018 (Không gian điều hành của Admin & Manager `/` Dashboard trung tâm)
  - `smartPermissionGuard` & `dashboardGuard` (Bảo vệ quyền truy cập và chuyển hướng vai trò)

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 19-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.clarify` - 6 Quyết định Then chốt)

- **Q1: Kiến trúc hiển thị khi phát sinh lỗi (Full-page vs Modal Dialog)**: Khi phát sinh lỗi 403 (từ chối quyền) hoặc 500/505 (lỗi máy chủ) trong quá trình người dùng đang thao tác trên hệ thống, giao diện phản hồi theo phương thức nào?
  - **A1**: **Chuyển toàn trang sang màn hình lỗi độc lập (`/error/403`, `/error/500`) với layout riêng biệt (`eLayoutType.empty`)**:
    - Đảm bảo tính nhất quán tuyệt đối về giao diện trên toàn hệ thống.
    - Tránh các xung đột render giao diện bị phân mảnh hoặc lỗi CSS đè layout khi API trả về 500/403.
    - Cung cấp không gian thoáng đãng, sang trọng để hiển thị minh họa SVG, thông tin đối soát lỗi và nút điều hướng phục hồi.
- **Q2: Nút hành động phụ bên cạnh nút chính (Secondary Action Buttons)**: Bên cạnh nút bấm chính đưa người dùng về trang thuộc về vai trò của họ, có bổ sung thêm nút hành động phụ nào không?
  - **A2**: **Bổ sung nút phụ `[Thử lại]` (cho lỗi 500/505) và `[Quay lại trang trước]` (nếu trang trước hợp lệ)**:
    - Nút chính (Primary CTA): `[Quay về trang chính của tôi]` (Return to My Home - định tuyến theo vai trò).
    - Nút phụ 1: `[Quay lại trang trước]` (Back to Previous Page - sử dụng `Location.back()` an toàn, chỉ khả dụng nếu trang trước đó không phải một trang lỗi khác để tránh vòng lặp).
    - Nút phụ 2 (chỉ hiển thị với lỗi 500/505): `[Thử lại]` (Retry - kích hoạt tải lại yêu cầu vừa thất bại hoặc reload trang).
- **Q3: Phong cách hiển thị trực quan của đồng hồ đếm ngược 5 giây (Countdown UX Styling)**: Phong cách hiển thị của đồng hồ đếm ngược 5 giây trên trang lỗi được thiết kế như thế nào?
  - **A3**: **Thanh tiến trình đếm ngược (Linear Progress Bar) mượt mà chạy phía trên nút bấm kèm dòng chữ đếm ngược số giây (5s... 4s... 3s...)**:
    - Thanh tiến trình ngang mỏng tinh tế màu cam `#EA580C` co dần từ 100% về 0% trong 5 giây.
    - Dòng chữ hiển thị rõ ràng: *"Hệ thống sẽ tự động đưa bạn về trang làm việc sau 5... 4... 3... 2... 1 giây..."*.
    - Hỗ trợ nút bấm `[Tạm dừng]` / `[Tiếp tục]` bên cạnh và tự động tạm ngưng khi người dùng rê chuột (hover) vào thẻ lỗi hoặc chuyển tab trình duyệt.
- **Q4: Quy tắc xác định trang làm việc (Role-based Recovery Resolution)**: Khi người dùng gặp mã lỗi (404, 403, 500/505), nút quay lại và luồng tự động trả về trang làm việc của họ được xác định như thế nào?
  - **A4**: **Dựa trên vai trò người dùng trong `currentUser.roles` kết hợp kiểm tra quyền xem Dashboard (`TooHungry.Dashboard`)**:
    - `Waiter` (Nhân viên phục vụ bàn - không kèm Manager/Admin): Điều hướng về `/waiter/tables` (Danh sách bàn ăn).
    - `Manager` / `Administrator` / `admin`:
      + **Nếu có quyền `TooHungry.Dashboard`**: Điều hướng về `/` (Dashboard trung tâm), nút hiển thị `[Quay về Dashboard]`.
      + **Nếu KHÔNG có quyền `TooHungry.Dashboard`**: Tự động chuyển hướng về trang nghiệp vụ đầu tiên mà họ được cấp quyền (`/tables`, `/orders`, `/dishes`, `/inventory`...) để tránh vòng lặp lỗi 403 cấm truy cập Dashboard.
    - `Cashier` (Thu ngân): Điều hướng về `/table/layout` hoặc `/tables`.
    - `InventoryStaff` (Thủ kho): Điều hướng về `/inventory`.
    - `Chưa đăng nhập / Khách`: Điều hướng về `/account/login` hoặc `/` (Trạm vào ca nội bộ).
- **Q5: Thiết kế Visual & Trải nghiệm thẩm mỹ (Modern Design Aesthetics)**:
  - **A5**: Áp dụng phong cách Bento Card / Glassmorphism bo góc lớn (`rounded-2xl`), nền sáng/tối đồng bộ hệ thống, điểm nhấn sắc cam `#EA580C`. Mỗi mã lỗi có hình minh họa Vector SVG độc quyền với micro-animation nhẹ nhàng:
    - 404: Đĩa ăn trống và bản đồ thất lạc.
    - 403: Ổ khóa bảo mật phân quyền.
    - 500/505: Nồi súp quá nhiệt / Dây cáp bếp gián đoạn kết nối.
- **Q6: Đa ngôn ngữ (i18n)**:
  - **A6**: 100% các đoạn text (tiêu đề lỗi, giải thích, thông điệp đếm ngược, nhãn nút chính, nhãn nút phụ [Thử lại] / [Quay lại trang trước]) được định nghĩa đầy đủ trong `vi.json` và `en.json`.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Trong một hệ thống phần mềm quản lý nhà hàng vận hành liên tục (09:00 - 23:00) như Acme.TooHungry, các sự cố truy cập nhầm trang (404), cố tình hoặc vô tình truy cập vùng không có quyền (403), hoặc lỗi gián đoạn mạng/máy chủ (500/505) là không thể tránh khỏi.

Trang báo lỗi mặc định của trình duyệt hoặc khung popup thông báo kỹ thuật thô sơ hiện tại gây ra nhiều điểm yếu nghiêm trọng:
1. **Làm gián đoạn dòng công việc (Broken Workflow)**: Nhân viên phục vụ (Waiter) đang bận rộn đón khách hoặc gọi món bị kẹt lại trang lỗi mà không biết bấm vào đâu để quay về danh sách bàn.
2. **Thiếu tính chuyên nghiệp**: Báo lỗi thô thiển, hiển thị stack trace kỹ thuật gây hoang mang cho nhân viên vận hành và tiềm ẩn rủi ro bảo mật thông tin nội bộ.
3. **Thao tác thủ công lặp lại**: Người dùng phải bấm nút Back của trình duyệt hoặc xóa thanh địa chỉ URL để gõ lại trang chủ.

**RM-019 (Trang báo lỗi & Phục hồi điều hướng)** giải quyết triệt để vấn đề này bằng một giải pháp thông minh:
- **Tự động nhận diện vai trò**: Nhận biết người dùng là ai (Admin, Manager, Waiter...) để chỉ định trang đích chính xác.
- **Tự động phục hồi sau 5 giây**: Nếu người dùng bất động hoặc bối rối, hệ thống tự động đưa họ về "ngôi nhà làm việc" an toàn sau 5 giây đếm ngược mượt mà.

### Sơ đồ Luồng Phục hồi Điều hướng (Recovery Navigation Flow):
```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SỰ CỐ XẢY RA TRÊN HỆ THỐNG                            │
├────────────────────────────────┬────────────────────────────┬───────────────────────────┤
│    URL Không tồn tại (404)     │  Không có quyền hạn (403)  │  Lỗi Máy chủ (500 / 505)  │
│    (Gõ nhầm / Link hỏng)       │ (smartPermissionGuard chặn)│  (API Backend sự cố/505)  │
└────────────────────────────────┴─────────────┬──────────────┴───────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     TRANG THÔNG BÁO LỖI HIỆN ĐẠI (ERROR PAGE COMPONENT)                 │
│  - Minh họa Vector SVG trực quan theo mã lỗi (Bàn trống / Ổ khóa / Cáp gián đoạn)      │
│  - Tiêu đề & Thông điệp thân thiện song ngữ (vi / en)                                   │
│  - Mã đối soát lỗi Trace ID (cho lỗi 500/505) kèm nút [Sao chép]                        │
│  - Đồng hồ đếm ngược 5 giây: "Tự động đưa bạn về trang làm việc sau 5s..."              │
│  - Nút [Tạm dừng] / [Tiếp tục] / Tự dừng khi Hover                                      │
└──────────────────────────────────────────────┬──────────────────────────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          [NGƯỜI DÙNG BẤM NÚT THỦ CÔNG]                 [HẾT 5 GIÂY KHÔNG THAO TÁC]
     ┌─────────────────────────────────────┐               ┌────────────────────────┐
     │ Nút [Quay về trang chính của tôi]   │               │ Auto Recovery Trigger  │
     └──────────────────┬──────────────────┘               └───────────┬────────────┘
                        │                                              │
                        └──────────────────────┬───────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       BỘ ĐỊNH TUYẾN THEO VAI TRÒ (UserRoleNavigationService)            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  • Waiter (Nhân viên phục vụ)    ────────► /waiter/tables (Danh sách bàn ăn)           │
│  • Manager / Administrator / admin ─────► / (Dashboard trung tâm nhà hàng)             │
│  • Cashier (Thu ngân)            ────────► /table/layout hoặc /tables                   │
│  • InventoryStaff (Thủ kho)      ────────► /inventory (Quản lý kho nguyên liệu)         │
│  • Chưa đăng nhập / Khách        ────────► /account/login hoặc / (Trạm vào ca)          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 — Nhân viên Phục vụ (Waiter) gặp lỗi 404 (Priority: P1)
Là một **Nhân viên phục vụ (Waiter)** đang trong ca trực, khi tôi bấm nhầm một đường link không tồn tại hoặc gõ sai địa chỉ URL, tôi muốn nhìn thấy trang lỗi 404 được thiết kế đẹp mắt, thân thiện, có nút quay về màn hình Danh sách bàn ăn (`/waiter/tables`), và nếu tôi không thao tác gì thì sau 5 giây hệ thống tự động đưa tôi về danh sách bàn, để tôi không bị gián đoạn công việc phục vụ khách hàng.

**Lý do ưu tiên**: Nhân viên phục vụ thao tác trên máy tính bảng hoặc máy POS cảm ứng; việc tự động phục hồi về danh sách bàn giúp tiết kiệm thời gian và tránh việc nhân viên phải gọi hỗ trợ kỹ thuật chỉ vì bấm nhầm link.

**Kiểm thử Độc lập**:
- Đăng nhập bằng tài khoản có vai trò `Waiter`.
- Nhập URL không tồn tại: `/waiter/unknown-page` hoặc `/invalid-table-route`.
- Kiểm tra giao diện hiển thị trang 404 phong cách Cam & Trắng hiện đại.
- Nút chính hiển thị: `[Quay về Danh sách bàn]`.
- Đồng hồ đếm ngược chạy từ 5 về 0 giây kèm thanh tiến trình.
- Sau 5 giây, URL tự động chuyển về `/waiter/tables`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang đăng nhập với vai trò `Waiter`, **Khi (When)** nhân viên truy cập một route không tồn tại, **Thì (Then)** hệ thống hiển thị trang lỗi 404 với minh họa bàn ăn trống và dòng thông báo: *"Không tìm thấy trang yêu cầu"*.
2. **Cho trước (Given)** trang lỗi 404 hiển thị cho Waiter, **Khi (When)** đồng hồ đếm ngược 5 giây bắt đầu chạy, **Thì (Then)** nút chính hiển thị văn bản `[Quay về Danh sách bàn]`.
3. **Cho trước (Given)** đếm ngược kết thúc sau 5 giây mà không có tương tác nào, **When (Khi)** đồng hồ chạm mốc 0, **Thì (Then)** hệ thống tự động chuyển hướng người dùng đến `/waiter/tables`.

---

### User Story 2 — Người dùng bị chặn truy cập 403 Forbidden (Priority: P1)
Là một **Nhân viên phục vụ** hoặc **Nhân viên kho**, khi tôi truy cập vào một trang quản trị vượt quá quyền hạn của mình (ví dụ trang cài đặt hệ thống `/identity/users`), tôi muốn nhìn thấy trang báo lỗi 403 thông báo rõ ràng tôi không có quyền truy cập, kèm nút quay về trang làm việc của tôi và cơ chế tự động chuyển trang sau 5 giây, để tôi không bị kẹt ở màn hình trắng hoặc popup lỗi kỹ thuật.

**Lý do ưu tiên**: Phân quyền hệ thống ABP cần được thông báo thân thiện và lịch sự thay vì hiển thị lỗi kỹ thuật khó hiểu.

**Kiểm thử Độc lập**:
- Đăng nhập tài khoản `Waiter`.
- Truy cập vào `/identity/users` hoặc `/forecasts`.
- Kiểm tra hệ thống chuyển hướng mềm sang trang lỗi 403.
- Trang hiển thị minh họa Ổ khóa bảo mật phân quyền kèm thông điệp: *"Truy cập bị từ chối"*.
- Nút chính hiển thị `[Quay về Danh sách bàn]` và tự động đưa về `/waiter/tables` sau 5 giây.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng có vai trò `Waiter`, **Khi (When)** truy cập vào URL yêu cầu quyền Admin/Manager mà người dùng không có, **Thì (Then)** `smartPermissionGuard` chuyển hướng người dùng đến trang lỗi 403.
2. **Cho trước (Given)** trang lỗi 403 hiển thị, **Khi (When)** kiểm tra giao diện, **Thì (Then)** hiển thị icon ổ khóa bảo mật màu cam, giải thích lý do không có quyền và nút phụ `[Đổi tài khoản]`.
3. **Cho trước (Given)** sau 5 giây không có thao tác, **When (Khi)** đồng hồ kết thúc, **Thì (Then)** hệ thống tự động chuyển hướng người dùng về trang làm việc của vai trò đó.

---

### User Story 3 — Quản lý (Manager) / Admin chỉ quay về Dashboard nếu có quyền xem Dashboard (Priority: P1)
Là một **Quản lý nhà hàng (Manager)** hoặc **Admin**, khi tôi gặp sự cố (404, 403, 500/505), tôi muốn hệ thống kiểm tra thẩm quyền của tôi:
- **Nếu tôi có quyền xem Dashboard (`TooHungry.Dashboard`)**: Trang lỗi hiển thị nút bấm `[Quay về Dashboard]`, và nếu tôi không làm gì thì sau 5 giây tự động đưa tôi về Dashboard trung tâm (`/`).
- **Nếu tôi KHÔNG có quyền xem Dashboard (`TooHungry.Dashboard`)**: Hệ thống tuyệt đối không đưa tôi về `/` (tránh gây lỗi lặp 403), mà tự động xác định trang nghiệp vụ đầu tiên mà tôi được phân quyền (ví dụ: `/tables`, `/orders`, `/dishes`, `/inventory`...) kèm nhãn nút tương ứng, hoặc hiển thị `[Quay về Đăng nhập]` nếu không có quyền nghiệp vụ nào.

**Lý do ưu tiên**: Phân quyền động của hệ thống cho phép tùy biến quyền hạn của từng tài khoản Quản lý; việc kiểm tra quyền trước khi định tuyến phục hồi đảm bảo người dùng không bị "văng" vào trang cấm dẫn đến vòng lặp lỗi luẩn quẩn.

**Kiểm thử Độc lập**:
- **Case 3A (Có quyền Dashboard)**: Đăng nhập tài khoản `admin` (có quyền `TooHungry.Dashboard`). Truy cập URL hỏng `/admin/unknown`. Trang 404 hiển thị nút `[Quay về Dashboard]`. Sau 5 giây tự động chuyển về `/`.
- **Case 3B (Không có quyền Dashboard nhưng có quyền Bàn ăn)**: Đăng nhập tài khoản Manager đã bị thu hồi quyền `TooHungry.Dashboard` nhưng có quyền `TooHungry.Tables`. Truy cập URL hỏng. Trang 404 hiển thị nút `[Quay về Quản lý bàn]`. Sau 5 giây tự động chuyển về `/tables`.
- **Case 3C (Không có bất kỳ quyền nghiệp vụ nào)**: Đăng nhập tài khoản bị tước toàn bộ quyền nghiệp vụ. Trang lỗi hiển thị nút `[Quay về Đăng nhập]`. Sau 5 giây tự động chuyển về `/account/login`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng có vai trò `Manager` hoặc `Administrator` VÀ có quyền `TooHungry.Dashboard` được cấp, **Khi (When)** gặp lỗi 404, 403 hoặc 500, **Thì (Then)** nút phục hồi hiển thị nhãn `[Quay về Dashboard]` và sau 5 giây tự động chuyển về `/`.
2. **Cho trước (Given)** người dùng có vai trò `Manager` hoặc `Administrator` nhưng KHÔNG có quyền `TooHungry.Dashboard`, **Khi (When)** gặp lỗi 404, 403 hoặc 500, **Thì (Then)** hệ thống kiểm tra danh sách quyền được cấp và định tuyến về trang nghiệp vụ đầu tiên hợp lệ (ví dụ `/tables` nếu có `TooHungry.Tables`), nút phục hồi hiển thị tên trang tương ứng.
3. **Cho trước (Given)** đếm ngược 5 giây kết thúc, **When (Khi)** hết giờ, **Thì (Then)** hệ thống điều hướng trực tiếp về trang đích hợp lệ đã được xác định ở trên.

---

### User Story 4 — Xử lý Sự cố Máy chủ 500 / 505 kèm Mã đối soát Trace ID (Priority: P2)
Là một **Người dùng hệ thống** (bất kỳ vai trò nào), khi API backend gặp sự cố nội bộ (500) hoặc lỗi giao thức (505), tôi muốn nhìn thấy thông báo lỗi thân thiện, nút `[Thử lại]` để gọi lại thao tác, và mã Trace ID an toàn để có thể sao chép gửi cho bộ phận kỹ thuật, đồng thời có nút quay về trang của tôi sau 5 giây đếm ngược.

**Lý do ưu tiên**: Lỗi máy chủ cần cung cấp mã tra cứu kỹ thuật để đội IT đối soát log mà không làm lộ stack trace nhạy cảm ra màn hình.

**Kiểm thử Độc lập**:
- Kích hoạt một API trả về HTTP 500 hoặc 505.
- Trang lỗi 500/505 hiển thị thông báo: *"Sự cố máy chủ hệ thống"*.
- Hiển thị Mã đối soát lỗi: `Trace ID: req-xxxx-xxxx` kèm nút `[Sao chép]`.
- Bấm nút `[Sao chép]`: Hiển thị tooltip "Đã sao chép!" trong 2 giây.
- Nút `[Thử lại]` cho phép tải lại thao tác trước đó.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** API backend phản hồi HTTP 500 hoặc 505, **When (Khi)** HTTP interceptor bắt lỗi, **Then (Thì)** hiển thị giao diện lỗi 500/505 với hình minh họa kết nối gián đoạn.
2. **Cho trước (Given)** phản hồi lỗi có `traceId` hoặc `correlationId`, **When (Khi)** hiển thị trang, **Then (Thì)** mã này xuất hiện ở dạng chip/badge kèm nút sao chép nhanh vào clipboard.
3. **Cho trước (Given)** người dùng bấm `[Thử lại]`, **When (Khi)** click, **Then (Thì)** hệ thống tải lại trang hoặc gửi lại yêu cầu gần nhất.

---

### User Story 5 — Kiểm soát Đếm ngược: Tạm dừng và Tiếp tục (Priority: P2)
Là một **Người dùng hệ thống**, khi trang báo lỗi hiển thị cùng đồng hồ đếm ngược 5 giây, tôi muốn có thể chủ động tạm dừng đếm ngược bằng cách bấm nút `[Tạm dừng]` hoặc di chuột vào khung thông báo lỗi, để tôi có đủ thời gian đọc thông tin kỹ thuật mà không bị hệ thống tự động chuyển trang ngoài ý muốn.

**Lý do ưu tiên**: Tôn trọng quyền kiểm soát của người dùng (User Control and Freedom), tránh gây ức chế khi người dùng đang đọc thông tin thì bị "cướp" màn hình.

**Kiểm thử Độc lập**:
- Mở trang lỗi bất kỳ. Đồng hồ đếm ngược chạy từ 5.
- Di chuột vào khung thẻ lỗi (hover): Đồng hồ dừng ngay lập tức tại giây hiện tại (ví dụ dừng ở giây 3).
- Rê chuột ra ngoài (unhover): Đồng hồ tiếp tục đếm từ giây 3 về 0.
- Bấm nút `[Tạm dừng]`: Đồng hồ dừng vĩnh viễn cho đến khi người dùng bấm `[Tiếp tục đếm ngược]`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** đồng hồ đếm ngược đang chạy, **When (Khi)** người dùng di chuột vào khung thông báo lỗi, **Then (Thì)** đồng hồ đếm ngược tạm dừng, thanh tiến trình ngừng co lại.
2. **Cho trước (Given)** người dùng bấm nút `[Tạm dừng]`, **When (Khi)** click, **Then (Thì)** đồng hồ dừng lại và nhãn nút đổi thành `[Tiếp tục]`.
3. **Cho trước (Given)** người dùng bấm nút `[Tiếp tục]`, **When (Khi)** click, **Then (Thì)** đồng hồ tiếp tục đếm ngược từ giây hiện tại về 0.

---

### User Story 6 — Khách vãng lai / Người dùng chưa đăng nhập gặp lỗi (Priority: P2)
Là một **Người dùng chưa đăng nhập** hoặc phiên làm việc đã hết hạn, khi tôi truy cập một trang lỗi, tôi muốn nút quay về đưa tôi về trang Đăng nhập (`/account/login`) hoặc màn hình Trạm Vào Ca Nội Bộ (`/`), và tự động chuyển về đó sau 5 giây.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng chưa xác thực (`isAuthenticated = false`), **When (Khi)** gặp lỗi 404, **Then (Thì)** nút quay về hiển thị `[Quay về Đăng nhập]`.
2. **Cho trước (Given)** hết 5 giây đếm ngược, **When (Khi)** hết giờ, **Then (Thì)** hệ thống tự động điều hướng người dùng về `/` (Trạm vào ca) hoặc `/account/login`.

---

## 3. Bảng Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống phải cung cấp một thành phần giao diện chuyên biệt `ErrorPageComponent` (Standalone Component) có khả năng hiển thị tương ứng cho cả 4 mã trạng thái HTTP: `404`, `403`, `500` và `505`.
- **FR-002**: Hệ thống phải cấu hình Angular Router Wildcard `**` trỏ về `ErrorPageComponent` để đón bắt toàn bộ các URL không tồn tại (Lỗi 404).
- **FR-003**: Hệ thống phải cung cấp các route chuyên biệt cho lỗi phân quyền `/error/403` và lỗi máy chủ `/error/500` sử dụng layout trống (`eLayoutType.empty`) để hiển thị toàn màn hình không bị vỡ giao diện.
- **FR-004**: Hệ thống phải xây dựng dịch vụ định tuyến theo vai trò `UserRoleNavigationService` với phương thức `getDefaultHomeRoute()` và `getDefaultHomeLabelKey()` xác định đường dẫn đích dựa trên vai trò `currentUser.roles` và kiểm tra quyền qua `PermissionService`:
  - `Waiter` (không kèm Manager/Admin) -> `/waiter/tables` (nhãn: `ErrorPages.BackToTableList`)
  - `Manager` / `Administrator` / `admin`:
    + Nếu có quyền `TooHungry.Dashboard` (`permissionService.getGrantedPolicy('TooHungry.Dashboard')`): trả về `/` (nhãn: `ErrorPages.BackToDashboard`)
    + Nếu KHÔNG có quyền `TooHungry.Dashboard`: tìm trang nghiệp vụ đầu tiên được cấp quyền theo thứ tự ưu tiên:
      1. `TooHungry.Tables` -> `/tables` (nhãn: `ErrorPages.BackToTableManagement`)
      2. `TooHungry.Orders` -> `/orders` (nhãn: `ErrorPages.BackToOrders`)
      3. `TooHungry.Dishes` -> `/dishes` (nhãn: `ErrorPages.BackToDishes`)
      4. `TooHungry.Inventories` -> `/inventory` (nhãn: `ErrorPages.BackToInventory`)
      5. `AbpIdentity.Users` -> `/identity/users` (nhãn: `ErrorPages.BackToUserManagement`)
      6. Fallback nếu không có quyền nào: `/account/login` (nhãn: `ErrorPages.BackToLogin`)
  - `Cashier` -> `/table/layout` hoặc `/tables` (nhãn: `ErrorPages.BackToHome`)
  - `InventoryStaff` -> `/inventory` (nhãn: `ErrorPages.BackToHome`)
  - Khách chưa đăng nhập -> `/` hoặc `/account/login` (nhãn: `ErrorPages.BackToLogin`)
- **FR-005**: Giao diện trang lỗi phải hiển thị nút hành động chính (Primary Action Button) với nhãn văn bản được cá nhân hóa theo vai trò người dùng và trạng thái phân quyền.
- **FR-006**: Hệ thống phải kích hoạt bộ đếm ngược tự động 5 giây (`autoRedirectDuration = 5`) ngay khi component lỗi được khởi tạo.
- **FR-007**: Hệ thống phải hiển thị thanh tiến trình trực quan (Linear Progress Bar) hoặc đồng hồ đếm ngược phản ánh chính xác số giây còn lại từ 5 về 0.
- **FR-008**: Khi bộ đếm ngược chạm mốc 0 giây mà không bị hủy, hệ thống phải tự động gọi `router.navigate([targetRoleRoute])`.
- **FR-009**: Hệ thống phải hỗ trợ tạm dừng đếm ngược khi:
  - Người dùng bấm nút `[Tạm dừng]`.
  - Người dùng di chuột (hover) vào vùng nội dung thông báo lỗi.
- **FR-010**: Hệ thống phải cho phép tiếp tục đếm ngược khi người dùng bấm nút `[Tiếp tục]` hoặc di chuột ra khỏi vùng thẻ lỗi (unhover).
- **FR-011**: Đối với mã lỗi 500/505, hệ thống phải hiển thị Mã đối soát lỗi (Error Trace ID / Correlation ID) nếu có, cùng nút bấm cho phép sao chép nhanh vào Clipboard và hiển thị thông báo "Đã sao chép!".
- **FR-012**: Toàn bộ các chuỗi văn bản (tiêu đề lỗi, mô tả chi tiết, nhãn nút, thông điệp đếm ngược) phải được dịch và cấu hình 100% song ngữ Tiếng Việt (`vi.json`) và Tiếng Anh (`en.json`).

---

## 4. Yêu cầu Phi chức năng & Trường hợp biên (Non-Functional Requirements & Edge Cases)

### 4.1 Yêu cầu Phi chức năng (Non-Functional Requirements)
- **NFR-001 (Thiết kế & Thẩm mỹ)**: Chuẩn nhận diện Cam & Trắng (`#EA580C`), phong cách Bento Card bo góc lớn `rounded-2xl`, hiệu ứng đổ bóng mượt mà, hỗ trợ giao diện sáng (Light Mode) và giao diện tối (Dark Mode) đồng bộ hệ thống.
- **NFR-002 (Hiệu năng & Trọng lượng)**: Component lỗi độc lập (Standalone), tải nhanh dưới 100 mili-giây, không phụ thuộc vào các API nặng.
- **NFR-003 (Khả năng tương thích Responsive)**: Hiển thị hoàn hảo trên màn hình máy tính để bàn (Desktop POS), máy tính bảng của nhân viên phục vụ (Tablet 10-12 inch) và điện thoại di động (Mobile). Chuẩn touch-target tối thiểu 44×44px cho ngón tay.
- **NFR-004 (Bảo mật thông tin)**: Tuyệt đối không hiển thị SQL Exception, Server Stack Trace hoặc thông tin nhạy cảm của hệ thống trên màn hình lỗi 500/505.
- **NFR-005 (Quản lý Bộ nhớ & Tránh rò rỉ)**: Hủy bỏ hoàn toàn bộ đếm ngược `setInterval` / `subscription` trong vòng đời `ngOnDestroy` khi component bị hủy để tránh memory leak.

### 4.2 Xử lý Trường hợp biên (Edge Cases)
- **EC-001 (Manager/Admin không có quyền Dashboard)**: Đảm bảo không điều hướng về `/` khi người dùng không sở hữu quyền `TooHungry.Dashboard`, tránh rơi vào vòng lặp lỗi 403 Forbidden bất tận.
- **EC-002 (Người dùng có nhiều vai trò đồng thời)**: Nếu tài khoản vừa có vai trò `Waiter` vừa có vai trò `Manager` hoặc `Administrator`: Hệ thống ưu tiên vai trò cấp cao hơn, chỉ định trang đích là `/` (nếu có quyền Dashboard) hoặc trang quản lý tương ứng.
- **EC-003 (Mất kết nối mạng hoàn toàn)**: Nếu người dùng gặp lỗi do mất mạng (Offline), đếm ngược tự động tạm dừng kèm thông báo: *"Vui lòng kiểm tra lại kết nối mạng của thiết bị"*.
- **EC-004 (Người dùng chuyển tab trình duyệt)**: Khi tab bị ẩn (Inactive Tab), đồng hồ đếm ngược sử dụng `document.hidden` để tạm dừng, chỉ đếm tiếp khi người dùng quay lại tab để tránh việc người dùng bị đổi trang mà không hề hay biết.

---

## 5. Tiêu chí Thành công (Success Criteria)

- **SC-001**: 100% các URL không tồn tại đều được chuyển hướng mượt mà về trang lỗi 404 hiện đại, không bao giờ xuất hiện trang lỗi trắng của trình duyệt.
- **SC-002**: 100% các lỗi từ chối phân quyền (403) hiển thị giao diện thân thiện với giải thích rõ ràng và nút phục hồi.
- **SC-003**: 100% Manager/Admin có quyền Dashboard được điều hướng về `/`, và 100% Manager/Admin không có quyền Dashboard được chuyển hướng an toàn về trang nghiệp vụ đầu tiên mà họ được cấp quyền mà không bị lặp lỗi 403.
- **SC-004**: Tỷ lệ tự động phục hồi đúng trang đạt 100% sau 5 giây khi người dùng không can thiệp.
- **SC-005**: 100% tính năng tạm dừng đếm ngược (qua click nút hoặc hover) hoạt động chính xác và tức thì.
- **SC-006**: Đạt 100% độ phủ song ngữ Tiếng Việt & Tiếng Anh trong `vi.json` và `en.json`.
- **SC-007**: Thời gian tải trang lỗi < 150 mili-giây trên mọi thiết bị.

---

## 6. Bảng Ánh xạ Điều hướng Phục hồi theo Vai trò & Phân quyền (Role & Permission Resolution Matrix)

| Vai trò người dùng (`roles`) | Điều kiện Quyền hạn | URL trang phục hồi ("Trang của họ") | Tên nút hiển thị (Tiếng Việt) | Nút hiển thị (Tiếng Anh) |
|---|---|---|---|---|
| `Waiter` (đơn lẻ) | Bất kỳ | `/waiter/tables` | Quay về Danh sách bàn | Return to Table List |
| `Manager`, `Administrator`, `admin` | **Có quyền** `TooHungry.Dashboard` | `/` | Quay về Dashboard quản trị | Return to Dashboard |
| `Manager`, `Administrator`, `admin` | **Không có** `TooHungry.Dashboard`, có `TooHungry.Tables` | `/tables` | Quay về Quản lý bàn | Return to Table Management |
| `Manager`, `Administrator`, `admin` | **Không có** `TooHungry.Dashboard`, có `TooHungry.Orders` | `/orders` | Quay về Quản lý đơn hàng | Return to Orders |
| `Manager`, `Administrator`, `admin` | **Không có** `TooHungry.Dashboard`, có `TooHungry.Dishes` | `/dishes` | Quay về Quản lý món ăn | Return to Dishes |
| `Manager`, `Administrator`, `admin` | **Không có** `TooHungry.Dashboard`, có `TooHungry.Inventories` | `/inventory` | Quay về Quản lý kho | Return to Inventory |
| `Cashier` | Bất kỳ | `/table/layout` hoặc `/tables` | Quay về Sơ đồ bàn thu ngân | Return to POS Tables |
| `InventoryStaff` | Bất kỳ | `/inventory` | Quay về Quản lý kho | Return to Inventory |
| Bất kỳ ai không có quyền | Không có quyền nào | `/account/login` | Quay về Đăng nhập | Return to Login |

---

## 7. Cấu trúc Kỹ thuật & Từ điển Đa ngôn ngữ (i18n Dictionary)

### 7.1 Cấu trúc Component Angular
- **Component**: `ErrorPageComponent` (Standalone Component).
- **Vị trí**: `angular/src/app/shared/components/error-page/error-page.component.ts`.
- **Inputs**:
  - `statusCode`: `404 | 403 | 500 | 505` (mặc định lấy từ route data hoặc trạng thái HTTP).
  - `autoRedirectDuration`: `number` (mặc định `5` giây).
  - `customTitle`: `string` (tùy chọn ghi đè tiêu đề i18n).
  - `customMessage`: `string` (tùy chọn ghi đè mô tả).
  - `traceId`: `string` (mã đối soát lỗi dành cho 500/505).

### 7.2 Từ điển Tiếng Việt (`vi.json`)
```json
"ErrorPages": {
  "404": {
    "Title": "Không tìm thấy trang yêu cầu",
    "Description": "Trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đường dẫn đã thay đổi."
  },
  "403": {
    "Title": "Truy cập bị từ chối",
    "Description": "Bạn không có quyền truy cập vào phân hệ này. Vui lòng liên hệ Quản lý nếu bạn cần cấp quyền."
  },
  "500": {
    "Title": "Sự cố máy chủ hệ thống",
    "Description": "Hệ thống đang gặp sự cố kỹ thuật tạm thời. Đội ngũ kỹ thuật đã được thông báo để khắc phục."
  },
  "505": {
    "Title": "Giao thức không được hỗ trợ",
    "Description": "Phiên bản giao thức HTTP của trình duyệt hiện tại không được máy chủ hỗ trợ."
  },
  "AutoRedirectNotice": "Hệ thống sẽ tự động đưa bạn về trang làm việc sau {0} giây...",
  "PauseCountdown": "Tạm dừng",
  "ResumeCountdown": "Tiếp tục",
  "BackToHome": "Quay về trang chính của tôi",
  "BackToTableList": "Quay về Danh sách bàn",
  "BackToDashboard": "Quay về Dashboard",
  "BackToTableManagement": "Quay về Quản lý bàn",
  "BackToOrders": "Quay về Quản lý đơn hàng",
  "BackToDishes": "Quay về Quản lý món ăn",
  "BackToInventory": "Quay về Quản lý kho",
  "BackToUserManagement": "Quay về Quản lý người dùng",
  "BackToLogin": "Quay về Đăng nhập",
  "BackToPreviousPage": "Quay lại trang trước",
  "Retry": "Thử lại",
  "CopyTraceId": "Sao chép mã lỗi",
  "Copied": "Đã sao chép!"
}
```

### 7.3 Từ điển Tiếng Anh (`en.json`)
```json
"ErrorPages": {
  "404": {
    "Title": "Page Not Found",
    "Description": "The page you are looking for doesn't exist, was removed, or the URL has changed."
  },
  "403": {
    "Title": "Access Denied",
    "Description": "You do not have permission to access this resource. Please contact your manager if you need access."
  },
  "500": {
    "Title": "Internal Server Error",
    "Description": "The system encountered an unexpected error. Our technical team has been notified."
  },
  "505": {
    "Title": "HTTP Version Not Supported",
    "Description": "The server does not support the HTTP protocol version used in the request."
  },
  "AutoRedirectNotice": "Automatically returning to your workspace in {0} seconds...",
  "PauseCountdown": "Pause",
  "ResumeCountdown": "Resume",
  "BackToHome": "Return to My Home",
  "BackToTableList": "Return to Table List",
  "BackToDashboard": "Return to Dashboard",
  "BackToTableManagement": "Return to Table Management",
  "BackToOrders": "Return to Orders",
  "BackToDishes": "Return to Dishes",
  "BackToInventory": "Return to Inventory",
  "BackToUserManagement": "Return to User Management",
  "BackToLogin": "Return to Login",
  "BackToPreviousPage": "Back to Previous Page",
  "Retry": "Retry",
  "CopyTraceId": "Copy Error Code",
  "Copied": "Copied!"
}
```
