# Đặc tả Tính năng (Feature Specification): Đặt bàn (Table Reservation Management)

**Nhánh Tính năng (Feature Branch)**: `009-rm-009-table-reservation`

**Ngày tạo**: 2026-10-09

**Trạng thái**: Hoàn thiện (Ready for Plan)

**Đầu vào**: Yêu cầu nghiệp vụ từ Roadmap RM-009: "Tính năng đặt bàn trước cho khách hàng, tích hợp trực tiếp trên giao diện vận hành của Waiter (`/waiter/tables`)."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 2026-10-09
- Q: Hệ thống có cần tích hợp dịch vụ gửi thông báo tự động (SMS, Zalo ZNS, Email) đến khách hàng trong phiên bản này hay không? → A: **Không tích hợp dịch vụ gửi thông báo bên thứ ba** (SMS/Zalo/Email) trong phiên bản này. Hệ thống tập trung hoàn toàn vào quy trình nghiệp vụ và quản lý trạng thái nội bộ của nhân viên nhà hàng.
- Q: Chu kỳ quét tự động (Polling Interval) của Background Worker phía máy chủ để phát hiện và tự động hủy các đơn đặt bàn quá hạn 1 giờ nên được cấu hình bao lâu một lần? → A: Cấu hình định kỳ **mỗi 5 phút một lần**, giúp tối ưu hóa việc sử dụng tài nguyên nền của máy chủ mà vẫn đảm bảo các bàn quá hạn được giải phóng kịp thời.
- Q: Hệ thống có cho phép cùng một số điện thoại khách hàng được đặt nhiều bàn khác nhau hay không? → A: **Cho phép một số điện thoại đặt nhiều bàn khác nhau** (không áp dụng ràng buộc duy nhất trên số điện thoại), tạo điều kiện thuận lợi cho một người đại diện đặt cùng lúc nhiều bàn cho đoàn khách hoặc gia đình đông người.
- Q: Khi nhân viên mở Modal chỉnh sửa một đơn đặt bàn đang ở trạng thái `RESERVED`, hệ thống có cho phép đổi đơn đặt bàn đó sang một bàn trống khác hay không? → A: **Không cho phép đổi bàn trực tiếp** trong Modal chỉnh sửa; bàn ăn được giữ cố định theo thẻ bàn ban đầu. Nếu khách muốn đổi sang bàn khác, nhân viên thực hiện hủy đặt bàn hiện tại và tạo đơn mới trên bàn mong muốn.
- Q: Khách hàng được phép đặt bàn trước tối đa bao nhiêu ngày so với ngày hiện tại? → A: Cho phép đặt trước tối đa **7 ngày (1 tuần)** tính từ ngày hiện tại. Chặn mọi thao tác chọn ngày quá 7 ngày trong tương lai ở cả DatePicker frontend và validation backend.
- Q: Khung giờ nhận đặt bàn của nhà hàng được quy định và giới hạn cụ thể như thế nào? → A: Nhà hàng hoạt động trong khung giờ từ **09:00 đến 23:00**. Thời gian nhận bàn hợp lệ phải nằm trong khoảng từ **09:00 đến 22:59** hàng ngày. Thời gian nhận bàn từ 23:00 trở đi, trước 09:00, hoặc thời gian trong quá khứ bị chặn hoàn toàn cả ở Frontend lẫn Backend.
- Q: Ràng buộc về số lượng khách đặt bàn (`GuestCount`) đối với bàn ăn được quy định như thế nào? → A: Số lượng khách bắt buộc phải là số nguyên dương (tối thiểu 1) và **không được vượt quá sức chứa tối đa (`Capacity`)** của bàn được chọn. Khi mở Modal đặt bàn, trường số lượng khách mặc định được điền bằng chính sức chứa của bàn.
- Q: Cơ chế tự động hủy đặt bàn quá hạn (Auto Cancel Booking) hoạt động theo nguyên tắc nào? → A: Hệ thống sử dụng Background Worker phía máy chủ (Server-side), chạy định kỳ độc lập không phụ thuộc vào việc nhân viên có mở trình duyệt hay không. Nếu khách hàng không đến nhận bàn trong vòng **1 giờ (60 phút)** kể từ thời gian nhận bàn dự kiến (`ReservationTime + 1h < Now`), hệ thống tự động chuyển trạng thái đơn đặt bàn sang `AUTO_CANCELLED`, đồng thời giải phóng bàn từ `RESERVED` về `AVAILABLE` và đồng bộ tức thì qua SignalR.
- Q: Trên thẻ bàn đang ở trạng thái `RESERVED`, nhân viên phục vụ được phép thực hiện những hành động nào? → A: Thẻ bàn hiển thị huy hiệu `[Đã đặt trước]` màu cảnh báo (warning), hiển thị nổi bật Tên khách hàng và Số điện thoại. Các nút hành động khả dụng gồm: `[Đón khách]` (chuyển sang `OCCUPIED` và hoàn tất đơn đặt bàn), `[Hủy đặt bàn]` (xác nhận hủy, chuyển bàn về `AVAILABLE` và lưu lịch sử `CANCELLED`), `[Vô hiệu hóa bàn]` (chuyển sang `INACTIVE`), và thao tác click vào bàn để xem chi tiết / chỉnh sửa thông tin đặt bàn.
- Q: Khi đơn đặt bàn bị hủy (thủ công hoặc tự động), dữ liệu có bị xóa khỏi hệ thống hay không? → A: Tuyệt đối không xóa dữ liệu (Soft update). Mọi đơn đặt bàn đều được lưu trữ vĩnh viễn trong thực thể lịch sử đặt bàn (`TableReservation`) với trạng thái tương ứng (`CANCELLED` hoặc `AUTO_CANCELLED`) để phục vụ tra cứu, báo cáo thống kê và kiểm toán.

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Tạo Đặt bàn từ Bàn trống trên Giao diện Waiter (Priority: P1)

Là Nhân viên phục vụ (Waiter) hoặc Quản lý nhà hàng, tôi muốn tiếp nhận yêu cầu đặt bàn của khách bằng cách bấm nút `[Đặt bàn]` trên thẻ bàn đang trống (`AVAILABLE`), điền thông tin khách (Tên khách, Số điện thoại, Thời gian nhận bàn, Số lượng khách, Ghi chú) và lưu lại để giữ chỗ cho khách, chuyển trạng thái bàn sang `RESERVED` hiển thị rõ thông tin khách đã đặt.

**Lý do cho mức độ ưu tiên này**: Đây là luồng nghiệp vụ cốt lõi đầu tiên của việc đặt bàn. Nhân viên cần có khả năng ghi nhận yêu cầu giữ chỗ của khách trực tiếp ngay trên sơ đồ bàn tác nghiệp.

**Kiểm thử Độc lập**: Nhân viên truy cập `/waiter/tables`, chọn một bàn `AVAILABLE`, bấm `[Đặt bàn]`, điền form hợp lệ và xác nhận. Bàn lập tức chuyển sang trạng thái `RESERVED`, hiển thị tên và số điện thoại của khách hàng trên thẻ bàn.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một bàn đang ở trạng thái `AVAILABLE`, **Khi (When)** nhân viên bấm nút `[Đặt bàn]`, **Thì (Then)** hệ thống hiển thị Booking Modal với các trường: Tên khách hàng (bắt buộc), Số điện thoại (bắt buộc), Ngày giờ nhận bàn (bắt buộc, chọn ngày giờ trong tương lai), Số lượng khách (bắt buộc, mặc định bằng sức chứa của bàn, không vượt quá sức chứa), Ghi chú (tùy chọn).
2. **Cho trước (Given)** nhân viên đang nhập thông tin đặt bàn trong Booking Modal, **Khi (When)** nhân viên chọn giờ nhận bàn nằm ngoài khung giờ hoạt động (trước 09:00 hoặc từ 23:00 trở đi, ví dụ 08:30 hoặc 23:00), **Thì (Then)** hệ thống báo lỗi validation và ngăn chặn việc xác nhận đặt bàn.
3. **Cho trước (Given)** nhân viên đang nhập thông tin đặt bàn trong Booking Modal, **Khi (When)** nhân viên chọn ngày giờ trong quá khứ hoặc nhập số lượng khách vượt quá sức chứa của bàn (ví dụ bàn 4 chỗ nhập 5 khách), **Thì (Then)** hệ thống báo lỗi không hợp lệ và chặn lưu.
4. **Cho trước (Given)** nhân viên đã điền đầy đủ thông tin đặt bàn hợp lệ, **Khi (When)** bấm `[Xác nhận đặt bàn]`, **Thì (Then)** hệ thống tạo mới bản ghi đặt bàn, chuyển trạng thái bàn từ `AVAILABLE` sang `RESERVED`, thẻ bàn chuyển sang màu warning và hiển thị rõ Tên khách hàng cùng Số điện thoại liên hệ.
5. **Cho trước (Given)** thao tác đặt bàn thành công trên một máy client, **Khi (When)** hệ thống cập nhật trạng thái bàn, **Thì (Then)** toàn bộ các màn hình client khác đang mở `/waiter/tables` tự động cập nhật thẻ bàn sang `RESERVED` theo thời gian thực (SignalR) trong thời gian dưới 1 giây.

---

### User Story 2 - Tiếp đón Khách đã Đặt bàn (Check-in) (Priority: P1)

Là Nhân viên phục vụ, khi khách hàng đã đặt bàn đến nhà hàng đúng hẹn, tôi muốn bấm nút `[Đón khách]` trên thẻ bàn `RESERVED` để đưa khách vào bàn, chuyển trạng thái bàn sang `OCCUPIED` và đánh dấu đơn đặt bàn đã hoàn tất phục vụ.

**Lý do cho mức độ ưu tiên này**: Đảm bảo chuỗi vòng đời bàn ăn diễn ra liền mạch: `AVAILABLE → RESERVED → OCCUPIED → Orders → Payment → CLEANING → AVAILABLE`.

**Kiểm thử Độc lập**: Chọn bàn đang ở trạng thái `RESERVED`, bấm nút `[Đón khách]`, xác nhận bàn chuyển ngay sang `OCCUPIED`, các nút hành động đổi sang nhóm `[Order]` và `[Kết thúc bữa ăn]`, đơn đặt bàn liên kết được đánh dấu trạng thái hoàn thành.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một bàn đang ở trạng thái `RESERVED` (Badge vàng/cam `[Đã đặt trước]`), **Khi (When)** khách đến nhà hàng và nhân viên bấm nút `[Đón khách]`, **Thì (Then)** bàn lập tức chuyển sang trạng thái `OCCUPIED` (Badge đỏ ấm `[Đang có khách]`).
2. **Cho trước (Given)** bàn đã chuyển sang `OCCUPIED` từ việc đón khách đặt trước, **Khi (When)** hệ thống ghi nhận sự kiện, **Thì (Then)** đơn đặt bàn tương ứng được cập nhật trạng thái sang `COMPLETED`, đồng thời thông tin đặt bàn active trên bàn được dọn sạch để sẵn sàng cho chu trình tiếp theo.
3. **Cho trước (Given)** bàn vừa chuyển sang `OCCUPIED`, **Khi (When)** thẻ bàn hiển thị trên giao diện, **Thì (Then)** các nút hành động chuyển đổi chính xác sang nhóm nút của bàn đang phục vụ: nút `[Order]` để điều hướng gọi món (RM-010) và nút `[Kết thúc bữa ăn]` (RM-008/RM-016).

---

### User Story 3 - Xem chi tiết & Chỉnh sửa Thông tin Đặt bàn (Priority: P2)

Là Nhân viên phục vụ hoặc Quản lý, tôi muốn nhấp vào bàn đang ở trạng thái `RESERVED` để xem lại toàn bộ thông tin đặt bàn của khách và có thể cập nhật lại thông tin (đổi giờ hẹn, số lượng khách, tên, SĐT, ghi chú) khi khách hàng liên hệ thay đổi kế hoạch.

**Lý do cho mức độ ưu tiên này**: Khách hàng đặt bàn thường xuyên có nhu cầu thay đổi giờ đến hoặc số lượng người đi kèm; nhân viên cần khả năng điều chỉnh linh hoạt mà không phải hủy tạo lại từ đầu.

**Kiểm thử Độc lập**: Bấm vào bàn `RESERVED`, kiểm tra thông tin hiển thị đầy đủ trong Modal, thay đổi thời gian nhận bàn từ 18:00 sang 19:30, bấm `[Cập nhật]` và xác nhận thông tin mới được lưu chính xác.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một bàn đang ở trạng thái `RESERVED`, **Khi (When)** nhân viên nhấp vào thẻ bàn (hoặc nút xem chi tiết), **Thì (Then)** hệ thống mở Booking Detail Modal hiển thị chi tiết: Tên khách, Số điện thoại, Thời gian nhận bàn, Số lượng khách, Ghi chú và Thời gian tạo đơn.
2. **Cho trước (Given)** nhân viên đang xem chi tiết đơn đặt bàn trong Modal, **Khi (When)** nhân viên chỉnh sửa các thông tin (ví dụ tăng số khách nhưng vẫn `<= Capacity`, dời giờ hẹn nhưng vẫn trong khung giờ 09:00 - 22:59) và bấm `[Lưu thay đổi]`, **Thì (Then)** hệ thống cập nhật thành công và hiển thị thông tin mới nhất trên thẻ bàn.
3. **Cho trước (Given)** nhân viên chỉnh sửa đơn đặt bàn, **Khi (When)** nhân viên thay đổi thời gian nhận bàn sang ngoài khung giờ hoạt động hoặc số khách vượt quá sức chứa của bàn, **Thì (Then)** hệ thống ngăn chặn lưu và hiển thị thông báo lỗi cụ thể.

---

### User Story 4 - Hủy Đặt bàn Thủ công (Manual Cancel Booking) (Priority: P2)

Là Nhân viên phục vụ hoặc Quản lý, khi khách hàng gọi điện thông báo hủy lịch hẹn hoặc không thể đến, tôi muốn bấm nút `[Hủy đặt bàn]` trên thẻ bàn `RESERVED` để hủy đơn đặt bàn và trả bàn về trạng thái trống (`AVAILABLE`) cho khách khác sử dụng.

**Lý do cho mức độ ưu tiên này**: Giải phóng bàn kịp thời để nhà hàng tiếp tục phục vụ các khách hàng vãng lai khác, tối ưu hóa công suất khai thác chỗ ngồi.

**Kiểm thử Độc lập**: Chọn bàn đang `RESERVED`, bấm `[Hủy đặt bàn]`, xác nhận qua hộp thoại xác nhận hủy, kiểm tra bàn chuyển về `AVAILABLE` và bản ghi đặt bàn chuyển trạng thái sang `CANCELLED`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một bàn đang ở trạng thái `RESERVED`, **Khi (When)** nhân viên bấm nút `[Hủy đặt bàn]`, **Thì (Then)** hệ thống hiển thị hộp thoại xác nhận: *"Bạn có chắc chắn muốn hủy đặt bàn này không? Bàn sẽ được chuyển về trạng thái trống."* kèm thông tin tóm tắt của khách.
2. **Cho trước (Given)** hộp thoại xác nhận hủy đặt bàn đang hiển thị, **Khi (When)** nhân viên xác nhận hủy, **Thì (Then)** hệ thống chuyển trạng thái bàn từ `RESERVED` sang `AVAILABLE`, khôi phục các nút hành động ban đầu (`[Đón khách]`, `[Đặt bàn]`, `[Vô hiệu hóa bàn]`).
3. **Cho trước (Given)** đơn đặt bàn bị hủy thủ công, **Khi (When)** hệ thống cập nhật cơ sở dữ liệu, **Thì (Then)** bản ghi đặt bàn được cập nhật trạng thái `CANCELLED`, lưu vết thời gian hủy và tài khoản thực hiện hủy; dữ liệu không bị xóa khỏi hệ thống.

---

### User Story 5 - Tự động Hủy Đặt bàn Quá hạn 1 Giờ (Auto Cancel Booking) (Priority: P3)

Là Quản lý nhà hàng, tôi muốn hệ thống có cơ chế tự động hủy các đơn đặt bàn mà khách không đến nhận sau 1 giờ kể từ thời gian hẹn dự kiến, tự động chuyển bàn về trạng thái trống (`AVAILABLE`) mà không cần nhân viên phải canh chừng hay thao tác thủ công.

**Lý do cho mức độ ưu tiên này**: Trong giờ cao điểm bận rộn, nhân viên có thể quên kiểm tra các bàn khách không đến; tự động hủy giúp nhà hàng không bị lãng phí bàn trống và nâng cao doanh thu.

**Kiểm thử Độc lập**: Giả lập hoặc cấu hình một đơn đặt bàn có thời gian nhận bàn là 18:00, khi thời gian hệ thống vượt quá 19:00 mà chưa đón khách, dịch vụ Background Worker tự động chuyển đơn sang `AUTO_CANCELLED` và chuyển bàn về `AVAILABLE`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một bàn đang ở trạng thái `RESERVED` với thời gian hẹn nhận bàn là `T`, **Khi (When)** thời gian hiện tại của hệ thống vượt quá `T + 60 phút` mà khách chưa được đón, **Thì (Then)** Background Worker trên máy chủ tự động phát hiện đơn đặt bàn quá hạn.
2. **Cho trước (Given)** đơn đặt bàn quá hạn được phát hiện, **Khi (When)** Background Worker xử lý, **Thì (Then)** trạng thái đơn đặt bàn được cập nhật thành `AUTO_CANCELLED`, thông tin đặt bàn active trên bàn được xóa bỏ, và trạng thái bàn chuyển từ `RESERVED` về `AVAILABLE`.
3. **Cho trước (Given)** một bàn được tự động giải phóng do quá hạn, **Khi (When)** tiến trình xử lý hoàn tất trên máy chủ, **Thì (Then)** hệ thống phát tín hiệu thời gian thực (SignalR) để tất cả các giao diện `/waiter/tables` đang mở tự động chuyển bàn về màu xanh `AVAILABLE` mà không cần tải lại trang.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **Khách đến sớm hơn giờ hẹn dự kiến**: Khi khách đến sớm (ví dụ đặt 19:00 nhưng đến lúc 18:30) và bàn đã sẵn sàng ở trạng thái `RESERVED`, nhân viên vẫn có thể bấm `[Đón khách]` ngay lập tức; hệ thống chuyển bình thường sang `OCCUPIED` và đánh dấu đơn hoàn tất thành công.
- **Khách đến sát mốc 60 phút**: Nếu khách đến ở phút thứ 59, nhân viên vẫn có thể đón khách bình thường trước khi Background Worker thực hiện quét hủy tự động.
- **Khách đến sau khi đơn đã bị Auto-Cancel**: Nếu khách đến trễ quá 60 phút và đơn đã bị `AUTO_CANCELLED`, bàn lúc này đã trở về `AVAILABLE`. Nếu bàn vẫn chưa có ai ngồi, nhân viên có thể đón khách như khách vãng lai thông thường (`AVAILABLE → OCCUPIED`).
- **Xung đột thao tác đồng thời (Concurrency Conflict)**: Hai nhân viên cùng lúc thao tác trên một bàn `RESERVED` (một người bấm Đón khách, một người bấm Hủy đặt bàn): Thao tác đến máy chủ trước được ghi nhận thành công, thao tác đến sau nhận thông báo lỗi trạng thái bàn đã thay đổi và giao diện tự động đồng bộ lại.
- **Vô hiệu hóa bàn đang có lịch đặt (`RESERVED`)**: Khi nhân viên hoặc quản lý bấm `[Vô hiệu hóa bàn]` trên bàn `RESERVED`, hệ thống hiển thị cảnh báo rõ ràng rằng bàn đang có khách đặt trước; nếu người dùng vẫn xác nhận vô hiệu hóa, bàn chuyển sang `INACTIVE` và đơn đặt bàn chuyển sang trạng thái hủy (`CANCELLED`).
- **Mất kết nối mạng tạm thời (Offline/Reconnect)**: Khi kết nối SignalR của client bị gián đoạn và kết nối lại thành công, giao diện `/waiter/tables` tự động gọi API lấy lại toàn bộ trạng thái mới nhất để đảm bảo không bỏ sót các sự kiện Auto-Cancel hay Booking mới.

---

## Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cho phép nhân viên bấm nút `[Đặt bàn]` trên bất kỳ thẻ bàn nào đang ở trạng thái `AVAILABLE` trên màn hình `/waiter/tables` để mở Booking Modal.
- **FR-002**: Hệ thống PHẢI bắt buộc nhập Tên khách hàng (chuỗi văn bản, tối đa 128 ký tự, không được để trống hoặc chỉ chứa khoảng trắng).
- **FR-003**: Hệ thống PHẢI bắt buộc nhập Số điện thoại khách hàng (chuỗi số/ký tự hợp lệ theo định dạng điện thoại, từ 8 đến 20 ký tự, không được để trống). Hệ thống cho phép một số điện thoại được đặt nhiều bàn khác nhau (không chặn trùng lặp số điện thoại).
- **FR-004**: Hệ thống PHẢI bắt buộc chọn Thời gian nhận bàn (`ReservationTime`), không cho phép chọn ngày hoặc giờ trong quá khứ so với thời điểm hiện tại, và CHỈ cho phép đặt trước tối đa trong vòng **7 ngày (1 tuần)** tính từ thời điểm hiện tại ở cả giao diện lẫn phía máy chủ.
- **FR-005**: Hệ thống PHẢI bắt buộc kiểm tra Thời gian nhận bàn nằm trong khung giờ hoạt động hợp lệ của nhà hàng từ **09:00 đến 22:59** hàng ngày (chặn hoàn toàn việc tạo hoặc chỉnh sửa giờ nhận bàn trước 09:00 hoặc từ 23:00 trở đi) ở cả tầng Giao diện (Frontend) và tầng Nghiệp vụ Máy chủ (Backend).
- **FR-006**: Hệ thống PHẢI bắt buộc nhập Số lượng khách (`GuestCount`) là số nguyên dương lớn hơn 0 và không được vượt quá Sức chứa tối đa (`Capacity`) của bàn ăn được chọn (`1 <= GuestCount <= Table.Capacity`). Giá trị khởi tạo mặc định trong modal bằng chính `Capacity` của bàn.
- **FR-007**: Hệ thống PHẢI cung cấp trường Ghi chú (`Note`) tùy chọn (tối đa 512 ký tự) để nhân viên ghi nhận các yêu cầu đặc biệt của khách hàng (ví dụ: ghế trẻ em, bàn tiệc sinh nhật).
- **FR-008**: Khi đơn đặt bàn được tạo thành công, hệ thống PHẢI chuyển trạng thái bàn ăn từ `AVAILABLE` sang `RESERVED`, lưu thông tin đặt bàn hiện hành vào bàn ăn, và phát thông điệp thời gian thực (SignalR) để cập nhật toàn bộ các client đang kết nối.
- **FR-009**: Thẻ bàn ở trạng thái `RESERVED` trên giao diện PHẢI hiển thị huy hiệu `[Đã đặt trước]` màu cảnh báo (warning), đồng thời hiển thị nổi bật Tên khách hàng, Số điện thoại và Thời gian nhận bàn dự kiến.
- **FR-010**: Hệ thống PHẢI cung cấp nhóm nút hành động theo ngữ cảnh trên thẻ bàn `RESERVED`, bao gồm: `[Đón khách]`, `[Hủy đặt bàn]`, và `[Vô hiệu hóa bàn]`.
- **FR-011**: Khi nhân viên bấm nút `[Đón khách]` trên bàn `RESERVED`, hệ thống PHẢI chuyển trạng thái bàn sang `OCCUPIED`, cập nhật trạng thái đơn đặt bàn liên kết sang `COMPLETED`, dọn sạch thông tin đặt bàn active trên bàn và phát sự kiện đồng bộ thời gian thực.
- **FR-012**: Hệ thống PHẢI cho phép nhân viên nhấp vào bàn `RESERVED` để mở Modal xem chi tiết thông tin đơn đặt bàn và chỉnh sửa thông tin (Tên khách, SĐT, Thời gian nhận bàn, Số lượng khách, Ghi chú) tuân thủ đầy đủ các quy tắc xác thực như khi tạo mới; bàn ăn được giữ cố định và KHÔNG cho phép đổi sang bàn khác trong modal chỉnh sửa (nếu cần đổi bàn, nhân viên phải hủy đơn cũ và tạo đặt bàn mới trên bàn mong muốn).
- **FR-013**: Khi nhân viên bấm nút `[Hủy đặt bàn]` trên bàn `RESERVED`, hệ thống PHẢI hiển thị hộp thoại xác nhận; sau khi người dùng xác nhận, hệ thống chuyển trạng thái bàn từ `RESERVED` về `AVAILABLE`, cập nhật trạng thái đơn đặt bàn thành `CANCELLED` và lưu vết kiểm toán.
- **FR-014**: Hệ thống PHẢI triển khai Background Worker chạy định kỳ phía máy chủ (Server-side) với chu kỳ **mỗi 5 phút một lần** để tự động quét các đơn đặt bàn có trạng thái `RESERVED`. Nếu thời gian hiện tại trễ hơn thời gian nhận bàn dự kiến từ **60 phút trở lên** (`ReservationTime + 1h < Now`), hệ thống tự động cập nhật đơn đặt bàn sang `AUTO_CANCELLED`, chuyển bàn về `AVAILABLE` và phát tín hiệu Real-time cập nhật giao diện.
- **FR-015**: Hệ thống PHẢI lưu trữ toàn bộ các đơn đặt bàn vào thực thể lịch sử `TableReservation` (không xóa cứng dữ liệu), bao gồm đầy đủ dấu vết kiểm toán (thời gian tạo, người tạo, lịch sử thay đổi trạng thái) để phục vụ tra cứu và báo cáo.

---

### Các Thực thể Chính (Key Entities)

- **`RestaurantTable` (Bàn ăn)**:
  - Đại diện cho bàn vật lý trong nhà hàng (kế thừa `FullAuditedAggregateRoot<Guid>`).
  - Chứa thông tin cấu hình bàn (`Name`, `Capacity`, `Status`, `DiningAreaId`, `Location`).
  - Chứa các trường thông tin đặt bàn active phục vụ hiển thị nhanh trên sơ đồ:
    - `ReservedCustomerName` (string?, tối đa 128 ký tự)
    - `ReservedCustomerPhone` (string?, tối đa 20 ký tự)
    - `ReservedTime` (DateTime?, thời gian hẹn)
    - `ReservedGuestCount` (int?, số lượng khách)
    - `ReservedNote` (string?, tối đa 512 ký tự)
- **`TableReservation` (Đơn đặt bàn)**:
  - Aggregate Root lưu trữ thông tin lịch sử của từng lần đặt bàn (kế thừa `FullAuditedAggregateRoot<Guid>`).
  - Các thuộc tính: `Id`, `TableId`, `CustomerName`, `CustomerPhone`, `ReservationTime`, `GuestCount`, `Note`, `Status`.
- **`ReservationStatus` (Trạng thái đặt bàn)**:
  - Enum đại diện cho vòng đời của đơn đặt bàn:
    - `Confirmed` (Đã đặt trước / Đang giữ chỗ)
    - `Completed` (Đã hoàn thành / Khách đã nhận bàn)
    - `Cancelled` (Đã hủy thủ công bởi nhân viên/quản lý)
    - `AutoCancelled` (Hệ thống tự động hủy do khách trễ quá 1 giờ)

---

## Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: Nhân viên phục vụ có thể hoàn thành việc tạo một đơn đặt bàn mới trên giao diện trong thời gian dưới **30 giây**.
- **SC-002**: Tỷ lệ vi phạm khung giờ hoạt động (đặt ngoài 09:00 - 22:59) hoặc vượt quá sức chứa của bàn đạt **0%** (100% trường hợp không hợp lệ bị chặn ngay lập tức ở cả Frontend và Backend).
- **SC-003**: **100%** các đơn đặt bàn quá hạn 60 phút mà khách không đến nhận bàn được Background Worker máy chủ tự động hủy và giải phóng bàn về trạng thái trống mà không cần sự can thiệp thủ công của nhân viên.
- **SC-004**: Độ trễ cập nhật trạng thái bàn trên sơ đồ `/waiter/tables` khi có đặt bàn mới, đón khách hoặc hủy bàn giữa các thiết bị nhân viên dưới **1 giây** thông qua cơ chế thời gian thực (SignalR).
- **SC-005**: **100%** các nhãn giao diện, thông báo xác nhận và thông báo lỗi của tính năng Đặt bàn được hỗ trợ song ngữ đầy đủ trên cả hai tệp dữ liệu `vi.json` (Tiếng Việt) và `en.json` (Tiếng Anh).

---

## Các Giả định (Assumptions)

- Bàn ăn chỉ cho phép tạo đơn đặt bàn mới khi đang ở trạng thái `AVAILABLE`.
- Mỗi bàn ăn chỉ hỗ trợ tối đa 1 lịch đặt bàn đang hoạt động (`RESERVED`) tại một thời điểm trên sơ đồ phục vụ trực tiếp của Waiter.
- Nhân viên phục vụ (Waiter) và Quản lý (Manager) đều có quyền thực hiện các thao tác đặt bàn, đón khách và hủy đặt bàn trên giao diện bàn ăn.
- Đồng hồ hệ thống máy chủ được đồng bộ thời gian chuẩn NTP để đảm bảo tính chính xác tuyệt đối cho tiến trình quét hủy tự động Background Worker.
- Mọi tương tác giao diện tuân thủ bảng màu nhận diện Cam & Trắng (Orange & White Theme) theo quy định tại Hiến pháp dự án.
- Hệ thống hoạt động hoàn toàn khép kín nội bộ trên quy trình nghiệp vụ của nhân viên, không tích hợp cổng gửi tin nhắn SMS, Zalo hoặc Email ra ngoài cho khách hàng trong phạm vi Wave 2.
