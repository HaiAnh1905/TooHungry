# Đặc tả Tính năng (Feature Specification): Đăng nhập & Đăng xuất (RM-001)

**Nhánh Tính năng (Feature Branch)**: `001-rm-001-login`

**Ngày tạo**: 2026-10-06

**Trạng thái**: Bản nháp (Draft)

**Đầu vào**: Mô tả của người dùng: "Xây dựng chức năng Đăng nhập (RM-001) cho hệ thống Restaurant Management System... Acceptance criteria: tài khoản Active với thông tin chính xác đăng nhập thành công; thông tin sai hoặc tài khoản không Active bị từ chối; role của tài khoản được xác định tự động sau khi đăng nhập; người chưa đăng nhập không thể truy cập protected resources; và Logout phải kết thúc phiên xác thực hiện tại."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 06-10-2026 (Lần 1 - `/speckit.clarify`)
- **Q1: Điều hướng theo vai trò**: URL mặc định cho từng Role là gì? -> **A1**: `Administrator` -> `/identity/users`, `Manager` -> `/dashboard`, `InventoryStaff` -> `/inventory`, `Waiter` -> `/table`, `Cashier` -> `/table/layout`.
- **Q2: Xử lý Multiple Roles**: -> **A2**: Mỗi tài khoản chỉ có 1 Role duy nhất, không hỗ trợ Multiple Roles cho một tài khoản.
- **Q3: Ghi nhớ đăng nhập (Remember Me)**: -> **A3**: Không hỗ trợ "Remember Me". Khi hết session hoặc Logout, phiên làm việc kết thúc ngay lập tức để bảo đảm an toàn trên thiết bị dùng chung.
- **Q4: Chức năng phụ trên trang Login**: -> **A4**: Ẩn hoàn toàn Register và Forgot Password khỏi màn hình Login. Nhân viên quên mật khẩu phải báo cho Administrator.
- **Q5: Khóa tài khoản (Account Lockout)**: -> **A5**: Bật cơ chế khóa tài khoản: Sai mật khẩu 5 lần liên tiếp sẽ bị khóa tạm thời 5 phút. Khi đăng nhập thành công, reset bộ đếm về 0.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Đăng nhập & Đăng xuất (RM-001)** là cửa ngõ bảo mật đầu tiên của hệ thống Restaurant Management System (Acme.TooHungry). Chức năng này cho phép nhân viên hệ thống đăng nhập bằng tài khoản đã được cấp (thông qua Username/Email và Password). Hệ thống yêu cầu xác thực thông tin đăng nhập và trạng thái tài khoản, đảm bảo chỉ những tài khoản đang hoạt động (Active) mới được truy cập hệ thống.

Sau khi xác thực thành công, hệ thống tự động xác định vai trò (Role) của người dùng từ cơ sở dữ liệu để đưa vào giao diện và ngữ cảnh phù hợp. Hệ thống hỗ trợ 5 vai trò cốt lõi: **Administrator, Manager, InventoryStaff, Waiter, Cashier**.

**Giới hạn phạm vi**: RM-001 chỉ chịu trách nhiệm Authentication (Xác thực) và xác định Role sau khi đăng nhập. Tính năng này KHÔNG bao gồm các nghiệp vụ đăng ký tài khoản (Sign Up), quản lý người dùng (CRUD User), thay đổi Role hay phân quyền chi tiết (thuộc phạm vi của RM-003).

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Đăng nhập thành công với tài khoản hợp lệ (Ưu tiên: P1)

Là một nhân viên của nhà hàng, tôi muốn đăng nhập bằng Username/Email và mật khẩu để có thể vào hệ thống làm việc với vai trò tương ứng của mình.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở màn hình Đăng nhập (Login), **Khi (When)** nhân viên nhập Username/Email và Password chính xác của một tài khoản đang Active, rồi ấn "Login", **Thì (Then)** hệ thống xác thực thành công, tạo session/token, tự động xác định Role (ví dụ: Cashier) và chuyển hướng nhân viên vào giao diện chính dành cho Cashier.

### User Story 2 - Đăng nhập thất bại do sai thông tin hoặc tài khoản Inactive (Ưu tiên: P1)

Là hệ thống bảo mật, tôi muốn từ chối đăng nhập khi người dùng nhập sai thông tin hoặc tài khoản bị vô hiệu hóa, đồng thời không tiết lộ thông tin nhạy cảm về việc tài khoản đó có thực sự tồn tại trong hệ thống hay không.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở màn hình Đăng nhập, **Khi (When)** nhân viên nhập sai Password hoặc sai Username, **Thì (Then)** hệ thống từ chối đăng nhập, không tạo session/token, hiển thị thông báo lỗi chung chung (VD: "Thông tin đăng nhập không chính xác") và tăng bộ đếm số lần đăng nhập sai.
2. **Cho trước (Given)** nhân viên đang ở màn hình Đăng nhập, **Khi (When)** nhân viên nhập đúng thông tin của một tài khoản đang bị vô hiệu hóa (Inactive), **Thì (Then)** hệ thống từ chối đăng nhập và hiển thị thông báo "Tài khoản của bạn đã bị vô hiệu hóa".

### User Story 3 - Khóa tài khoản chống Brute-force (Ưu tiên: P1)

Là hệ thống bảo mật, tôi muốn tự động khóa tài khoản tạm thời nếu đăng nhập sai nhiều lần liên tiếp, nhằm ngăn chặn các cuộc tấn công dò đoán mật khẩu (brute-force).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** tài khoản chưa bị khóa, **Khi (When)** người dùng nhập sai mật khẩu 5 lần liên tiếp, **Thì (Then)** tài khoản bị khóa tạm thời trong 5 phút. Nếu tiếp tục đăng nhập (dù đúng hay sai mật khẩu) trong thời gian này, hệ thống thông báo tài khoản đang bị khóa.
2. **Cho trước (Given)** tài khoản đang bị khóa 5 phút, **Khi (When)** hết thời gian 5 phút và người dùng đăng nhập đúng, **Thì (Then)** hệ thống cho phép đăng nhập thành công và reset bộ đếm số lần sai về 0.

### User Story 4 - Bảo vệ tài nguyên và Đăng xuất (Ưu tiên: P1)

Là hệ thống bảo mật, tôi muốn người dùng chưa đăng nhập không thể truy cập các trang nội bộ, và người dùng đã đăng nhập có thể đăng xuất an toàn để kết thúc phiên làm việc.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** một người dùng chưa đăng nhập, **Khi (When)** người dùng cố tình truy cập vào URL của một trang yêu cầu xác thực (VD: `/inventory`), **Thì (Then)** hệ thống phát hiện không có session/token hợp lệ, chặn truy cập (Unauthorized) và tự động chuyển hướng người dùng về màn hình Login.
2. **Cho trước (Given)** nhân viên đang đăng nhập hợp lệ trong hệ thống, **Khi (When)** nhân viên nhấn nút "Logout" (Đăng xuất), **Thì (Then)** hệ thống kết thúc phiên xác thực hiện tại, xóa/vô hiệu hóa session/token và đưa nhân viên về màn hình Login.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

1. **Truy cập đồng thời từ nhiều thiết bị**: Hiện tại quy định chung của ABP Framework xử lý token, RM-001 không yêu cầu ràng buộc chặn đa thiết bị trừ khi có yêu cầu cấu hình cụ thể sau này.
2. **Người dùng tự ý thay đổi giao diện frontend (Ẩn/Hiện nút)**: Xác thực (Authentication) và kiểm tra quyền phải được thực hiện chặt chẽ ở Backend. Việc ẩn/hiện menu ở frontend chỉ là UX, mọi request tới API (ví dụ: API của Manager) từ tài khoản Waiter đều sẽ bị Backend chặn đứng (403 Forbidden).

---

## 4. Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI có một màn hình Đăng nhập bao gồm: trường nhập Username hoặc Email, trường nhập Password, nút Login và khu vực hiển thị thông báo lỗi.
- **FR-002**: Khi người dùng nhấn Login, hệ thống PHẢI gửi dữ liệu lên Backend để xác thực (Authentication). Việc xác thực PHẢI kiểm tra tính chính xác của Username/Email và Password, đồng thời kiểm tra trạng thái tài khoản (chỉ Active mới được phép).
- **FR-003**: Nếu đăng nhập thất bại do sai thông tin, hệ thống PHẢI từ chối và hiển thị thông báo lỗi an toàn (ví dụ: "Tên đăng nhập hoặc mật khẩu không chính xác") để tránh rò rỉ thông tin (Account Enumeration).
- **FR-004**: Nếu đăng nhập thành công, hệ thống PHẢI tạo authentication session/token hợp lệ và tự động trích xuất các Role hiện có của tài khoản từ cơ sở dữ liệu.
- **FR-005**: Mỗi tài khoản chỉ mang đúng 1 Role duy nhất ở cấp độ hệ thống. Hệ thống hỗ trợ 5 Role: **Administrator, Manager, InventoryStaff, Waiter, Cashier**.
- **FR-006**: Sau khi xác thực thành công, hệ thống PHẢI điều hướng người dùng tới màn hình mặc định tương ứng với Role: `Administrator` -> `/identity/users`; `Manager` -> `/dashboard`; `InventoryStaff` -> `/inventory`; `Waiter` -> `/table`; `Cashier` -> `/table/layout`.
- **FR-007**: Hệ thống PHẢI ngăn chặn người chưa đăng nhập truy cập các tài nguyên được bảo vệ (Protected Resources). Mọi nỗ lực truy cập trái phép PHẢI bị trả về lỗi Unauthorized (401) hoặc chuyển hướng về màn hình Login.
- **FR-008**: Hệ thống PHẢI cung cấp chức năng Logout cho người dùng đã đăng nhập. Khi Logout, session/token PHẢI bị kết thúc ngay lập tức. KHÔNG hỗ trợ tính năng "Ghi nhớ đăng nhập" (Remember Me).
- **FR-009**: Giao diện Login CHỈ hiển thị trường nhập Username/Email, Password và nút Login. PHẢI ẨN hoàn toàn các tính năng Đăng ký (Register) và Quên mật khẩu (Forgot Password) mặc định của ABP Framework.
- **FR-010**: Hệ thống PHẢI áp dụng cơ chế khóa tài khoản (Account Lockout) đối với mọi Role: Nếu đăng nhập sai 5 lần liên tiếp, tài khoản bị khóa tạm thời 5 phút. Khi đăng nhập thành công, reset bộ đếm về 0.
- **FR-011**: Giao diện và các thông báo lỗi PHẢI hỗ trợ đa ngôn ngữ (I18N), cập nhật đầy đủ trong `en.json` và `vi.json`.

### Yêu cầu Phi chức năng & Bảo mật (Non-Functional & Security Requirements)

- **NFR-001**: Mật khẩu (Password) PHẢI được băm (hashing) an toàn trong cơ sở dữ liệu, KHÔNG ĐƯỢC lưu dưới dạng plaintext.
- **NFR-002**: Backend đóng vai trò quyết định tối hậu cho việc kiểm tra quyền và xác thực. Không dựa vào Frontend để bảo mật dữ liệu.

---

## 5. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

- **SC-001**: Tài khoản Active với thông tin chính xác (Username/Email + Password) đăng nhập thành công và nhận được Token.
- **SC-002**: Mọi trường hợp sai thông tin đăng nhập hoặc tài khoản không Active đều bị từ chối, hiển thị lỗi chung và không sinh token.
- **SC-003**: Hệ thống tự động điều hướng đúng tới trang mặc định được chỉ định riêng cho từng Role (1 trong 5 role) sau khi đăng nhập.
- **SC-004**: Người dùng chưa đăng nhập hoàn toàn không thể truy cập các trang nội bộ (Protected Resources).
- **SC-005**: Chức năng Logout kết thúc thành công phiên xác thực hiện tại. Giao diện đăng nhập không chứa tính năng "Remember Me", "Register", và "Forgot Password".
- **SC-006**: Cơ chế Account Lockout hoạt động chính xác: Khóa đúng 5 phút sau 5 lần sai và cho phép đăng nhập lại bình thường (kèm reset đếm) khi hết hạn khóa.

---

## 6. Các Giả định (Assumptions)

- **Quản lý Tài khoản**: Các tài khoản và mật khẩu của nhân viên đã được quản trị viên (Administrator) tạo sẵn và cấp phát thông qua phân hệ Quản lý Người dùng (thuộc RM-003). RM-001 chỉ tập trung vào việc xác thực các tài khoản đã tồn tại này.
- **Cơ chế xác thực**: Hệ thống sử dụng cơ sở hạ tầng xác thực mặc định của ABP Framework (Identity Server / OpenIddict, JWT Token) để quản lý Session và Token.
