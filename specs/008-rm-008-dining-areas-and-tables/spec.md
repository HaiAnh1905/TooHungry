# Đặc tả Tính năng (Feature Specification): Quản lý Khu vực Ăn uống & Bàn ăn (Dining Areas and Tables Management)

**Nhánh Tính năng (Feature Branch)**: `008-rm-008-dining-areas-and-tables`

**Ngày tạo**: 2026-10-09

**Trạng thái**: Hoàn thiện (Ready for Plan)

**Đầu vào**: Yêu cầu nghiệp vụ từ Roadmap RM-008: "Quản lý sơ đồ khu vực & bàn ăn của nhà hàng, đồng thời cung cấp giao diện vận hành bàn chuyên biệt cho Waiter (`/waiter/tables`)."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 2026-10-09
- Q: Trên màn hình vận hành phục vụ (`/waiter/tables`), các Khu vực ăn uống (Dining Area) đang bị vô hiệu hóa (`IsActive = false`) nên được hiển thị như thế nào đối với nhân viên phục vụ? → A: Ẩn hoàn toàn tab khu vực `IsActive = false` trên giao diện `/waiter/tables` của Waiter; chỉ hiển thị đầy đủ trên màn hình quản trị cấu hình danh mục của Quản lý để tối ưu không gian làm việc.
- Q: Khi nhân viên bấm nút `[Kết thúc bữa ăn]` đối với bàn đang có Order (Trường hợp 2) và hệ thống điều hướng sang màn hình Thanh toán (RM-016), trạng thái của bàn ăn sẽ được xử lý như thế nào tại thời điểm này? → A: Giữ nguyên trạng thái bàn là `OCCUPIED` khi điều hướng sang thanh toán; bàn CHỈ tự động chuyển sang `CLEANING` sau khi giao dịch thanh toán tại RM-016 thực sự hoàn tất thành công.
- Q: Trong trường hợp hai nhân viên phục vụ cùng thao tác đồng thời trên một bàn ăn, hệ thống xử lý xung đột cạnh tranh (Concurrency Conflict) như thế nào? → A: Áp dụng cơ chế kiểm soát đồng thời (Optimistic Concurrency / Atomic Status Check): thao tác của người gửi đến máy chủ trước thành công; thao tác của người đến sau bị từ chối kèm thông báo giải thích *"Trạng thái bàn đã được cập nhật bởi nhân viên khác"* và giao diện tự động đồng bộ lại tức thì qua SignalR.

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Vận hành Sơ đồ Bàn chuyên biệt cho Nhân viên Phục vụ (Priority: P1)

Là Nhân viên phục vụ (Waiter) hoặc Thu ngân, tôi muốn truy cập màn hình vận hành bàn chuyên biệt (`/waiter/tables`) với danh sách các bàn được sắp xếp trực quan theo dạng Thẻ (Card Grid 4 cột), phân tách theo từng Khu vực (Dining Area) và bộ lọc trạng thái, hiển thị thông tin rõ ràng (Tên bàn, Sức chứa chỗ ngồi, Huy hiệu trạng thái) cùng các nút hành động theo ngữ cảnh để nhanh chóng tiếp đón khách, nhận đơn, kết thúc bữa ăn hoặc dọn dẹp bàn theo thời gian thực.

**Lý do cho mức độ ưu tiên này**: Đây là màn hình tác nghiệp cốt lõi và có tần suất tương tác cao nhất trong ca làm việc của nhân viên phục vụ, quyết định tốc độ đón tiếp khách và luân chuyển chỗ ngồi của toàn bộ nhà hàng.

**Kiểm thử Độc lập**: Nhân viên phục vụ đăng nhập, truy cập `/waiter/tables`, duyệt danh sách bàn dưới dạng lưới 4 thẻ/hàng, lọc theo từng tầng/khu vực và thực hiện trọn vẹn chu trình chuyển đổi trạng thái bàn từ Đón khách (`AVAILABLE` → `OCCUPIED`), Kết thúc bữa ăn không dùng món (`OCCUPIED` → `AVAILABLE`), hoặc hoàn tất dọn dẹp (`CLEANING` → `AVAILABLE`).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** nhân viên đang ở màn hình `/waiter/tables`, **Khi (When)** trang được hiển thị, **Thì (Then)** danh sách bàn được dàn theo dạng Card Grid chuẩn 4 thẻ trên mỗi hàng (responsive linh hoạt trên màn hình nhỏ/tablet), mỗi thẻ hiển thị rõ: Tên bàn, Số lượng chỗ ngồi (Capacity), Huy hiệu trạng thái bàn (Status badge có mã màu riêng biệt), và nhóm nút thao tác tương ứng với trạng thái đó.
2. **Cho trước (Given)** một bàn đang ở trạng thái `AVAILABLE` (Badge xanh lá `[Còn trống]`), **Khi (When)** nhân viên bấm nút `[Đón khách]`, **Thì (Then)** bàn lập tức chuyển sang trạng thái `OCCUPIED` (hỗ trợ trạng thái hợp lệ `OCCUPIED + No Order` để khách ổn định chỗ trước khi gọi món).
3. **Cho trước (Given)** một bàn đang ở trạng thái `AVAILABLE`, **Khi (When)** nhân viên bấm nút `[Đặt bàn]`, **Thì (Then)** hệ thống kích hoạt mở giao diện/hộp thoại đặt trước thông tin khách hàng (chuẩn bị sẵn sàng cho module Đặt bàn RM-009).
4. **Cho trước (Given)** một bàn đang ở trạng thái `AVAILABLE`, **Khi (When)** nhân viên bấm nút `[Vô hiệu hóa bàn]`, **Thì (Then)** bàn chuyển tức thì sang trạng thái `INACTIVE` (Badge xám `[Vô hiệu hóa]`) và khóa mọi hành vi tiếp khách hay gọi món.
5. **Cho trước (Given)** một bàn đang ở trạng thái `INACTIVE`, **Khi (When)** nhân viên hoặc quản lý bấm nút `[Kích hoạt bàn]`, **Thì (Then)** bàn chuyển trạng thái trở lại `AVAILABLE` (sẵn sàng đón khách mới).
6. **Cho trước (Given)** một bàn đang ở trạng thái `OCCUPIED` (Badge đỏ ấm `[Đang có khách]`), **Khi (When)** nhân viên bấm nút `[Order]`, **Thì (Then)** hệ thống điều hướng trực tiếp sang trang gọi món `/waiter/order/:tableId` tương ứng của bàn đó (tích hợp module POS RM-010).
7. **Cho trước (Given)** một bàn đang ở trạng thái `OCCUPIED` nhưng khách chưa hề gọi món nào (không có Order mở), **Khi (When)** nhân viên bấm nút `[Kết thúc bữa ăn]`, **Thì (Then)** hệ thống hiển thị hộp thoại xác nhận: *"Khách không sử dụng món ăn. Bạn có chắc chắn muốn chuyển bàn về trạng thái trống?"*; sau khi nhân viên xác nhận, bàn lập tức chuyển về trạng thái `AVAILABLE`.
8. **Cho trước (Given)** một bàn đang ở trạng thái `OCCUPIED` và đã có đơn hàng mở liên kết, **Khi (When)** nhân viên bấm nút `[Kết thúc bữa ăn]`, **Thì (Then)** hệ thống hiển thị hộp thoại xác nhận kết thúc bữa ăn và điều hướng sang màn hình Thanh toán (module RM-016); trạng thái bàn vẫn giữ nguyên là `OCCUPIED` cho đến khi giao dịch thanh toán tại RM-016 hoàn tất thành công mới tự động chuyển sang `CLEANING`.
9. **Cho trước (Given)** một bàn đang ở trạng thái `CLEANING` (Badge màu trắng/sáng `[Đang dọn dẹp]`), **Khi (When)** nhân viên vệ sinh xong và bấm nút `[Dọn dẹp xong]`, **Thì (Then)** bàn chuyển sang trạng thái `AVAILABLE`, khôi phục toàn bộ các nút thao tác ban đầu của bàn trống.
10. **Cho trước (Given)** một bàn đang ở trạng thái `RESERVED` (Badge vàng/cam `[Đã đặt trước]`), **Khi (When)** khách hẹn đến nhận bàn, **Thì (Then)** nhân viên có thể bấm `[Nhận bàn]` để chuyển sang `OCCUPIED`, hoặc `[Hủy đặt]` để khôi phục về `AVAILABLE`.

---

### User Story 2 - Quản lý Cấu hình Khu vực Ăn uống (Dining Areas) (Priority: P2)

Là Quản lý nhà hàng (Manager), tôi muốn tạo mới, chỉnh sửa thông tin, xem danh sách kèm số lượng bàn và kích hoạt hoặc vô hiệu hóa các khu vực ăn uống (Tầng 1, Tầng 2, Sân vườn, Phòng VIP) để tổ chức không gian nhà hàng khoa học, đồng thời đảm bảo không xóa cứng khu vực nhằm bảo toàn tính toàn vẹn của dữ liệu lịch sử đơn hàng.

**Lý do cho mức độ ưu tiên này**: Khu vực ăn uống là thực thể phân nhóm cấp cao nhất, bắt buộc phải có để phân chia không gian và gán các bàn ăn tương ứng.

**Kiểm thử Độc lập**: Quản lý tạo khu vực "Phòng VIP Lầu 2", chỉnh sửa tên mô tả, chuyển trạng thái khu vực sang `IsActive = false`, kiểm tra toàn bộ các bàn trong khu vực tự động chuyển sang trạng thái tạm ngưng (`INACTIVE` / `Disabled`), và khi kích hoạt lại thì bàn khôi phục trạng thái `AVAILABLE`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** Quản lý đang ở trang quản lý khu vực, **Khi (When)** nhập tên khu vực hợp lệ (tối đa 128 ký tự) cùng mô tả tùy chọn và lưu, **Thì (Then)** khu vực mới được lưu vào hệ thống với trạng thái `IsActive = true`, số lượng bàn khởi tạo bằng 0 và xuất hiện ngay trong danh sách khu vực.
2. **Cho trước (Given)** một khu vực hiện có không có bất kỳ bàn nào đang phục vụ khách (`OCCUPIED`), **Khi (When)** Quản lý chuyển khu vực sang vô hiệu hóa (`IsActive = false`), **Thì (Then)** hệ thống cập nhật trạng thái khu vực và tự động chuyển toàn bộ các bàn thuộc khu vực đó sang trạng thái `INACTIVE` (`Disabled`).
3. **Cho trước (Given)** một khu vực có ít nhất một bàn đang ở trạng thái `OCCUPIED` hoặc có đơn hàng chưa hoàn tất thanh toán, **Khi (When)** Quản lý cố gắng vô hiệu hóa khu vực đó, **Thì (Then)** hệ thống từ chối hành động và hiển thị thông báo cảnh báo rõ ràng yêu cầu xử lý xong các bàn có khách trước.
4. **Cho trước (Given)** một khu vực đang bị vô hiệu hóa, **Khi (When)** Quản lý kích hoạt lại khu vực (`IsActive = true`), **Thì (Then)** trạng thái khu vực trở lại khả dụng và các bàn trực thuộc tự động chuyển sang trạng thái `AVAILABLE`.
5. **Cho trước (Given)** Quản lý đang thao tác trên danh sách khu vực, **Khi (When)** xem thông tin khu vực, **Thì (Then)** hệ thống KHÔNG cung cấp nút xóa cứng (hard delete) nhằm đảm bảo an toàn tuyệt đối cho lịch sử giao dịch.

---

### User Story 3 - Thiết lập & Quản lý Danh mục Bàn ăn (Restaurant Tables) (Priority: P2)

Là Quản lý nhà hàng, tôi muốn tạo mới bàn ăn, chỉnh sửa thông tin bàn (tên/số hiệu bàn, sức chứa chỗ ngồi, khu vực trực thuộc, vị trí mô tả) và xóa bàn khi cần thiết (khi bàn không có khách) để kiểm soát chuẩn xác năng lực phục vụ của nhà hàng.

**Lý do cho mức độ ưu tiên này**: Bàn ăn là đơn vị cơ sở gắn liền với mọi nghiệp vụ tiếp đón khách, phục vụ món ăn và thanh toán hóa đơn.

**Kiểm thử Độc lập**: Quản lý tạo bàn mới "Bàn 12" thuộc "Tầng 1" với sức chứa 6 người; thử tạo một bàn khác cùng tên "Bàn 12" ở khu vực khác và kiểm tra hệ thống chặn trùng lặp; xóa một bàn trống và kiểm tra số lượng bàn của khu vực tự động giảm đi 1.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** Quản lý đang ở màn hình quản trị cấu hình bàn, **Khi (When)** nhập tên bàn chưa tồn tại trong toàn hệ thống, sức chứa hợp lệ (từ 1 đến 100), chọn khu vực đang hoạt động (`IsActive = true`) và nhấn Lưu, **Thì (Then)** bàn mới được tạo thành công với trạng thái khởi tạo mặc định là `AVAILABLE`.
2. **Cho trước (Given)** Quản lý nhập tên bàn trùng lặp với bất kỳ bàn nào đã có trong toàn nhà hàng (kể cả khác khu vực), **Khi (When)** nhấn Lưu, **Thì (Then)** hệ thống từ chối tạo và hiển thị thông báo lỗi tên bàn đã tồn tại.
3. **Cho trước (Given)** một bàn ăn đang ở trạng thái `AVAILABLE` hoặc `INACTIVE` và không có đơn hàng chưa thanh toán, **Khi (When)** Quản lý thực hiện xóa bàn, **Thì (Then)** hệ thống xóa bàn thành công và cập nhật lại chỉ số tổng số bàn của khu vực tương ứng.
4. **Cho trước (Given)** một bàn ăn đang ở trạng thái `OCCUPIED` hoặc đang liên kết với đơn hàng chưa đóng, **Khi (When)** Quản lý cố gắng xóa bàn, **Thì (Then)** hệ thống chặn thao tác xóa và hiển thị cảnh báo bàn đang phục vụ khách.
5. **Cho trước (Given)** Quản lý muốn thay đổi khu vực ăn uống của một bàn, **Khi (When)** bàn đang có khách ngồi (`OCCUPIED`), **Thì (Then)** hệ thống không cho phép đổi khu vực cho đến khi bàn được thanh toán hoặc giải phóng.

---

### User Story 4 - Đồng bộ Trạng thái Bàn theo Thời gian thực (Real-time Synchronization) (Priority: P3)

Là Nhân viên phục vụ hoặc Quản lý ca, tôi muốn mọi thay đổi về trạng thái bàn (do nhân viên khác cập nhật, do hệ thống tự động đổi khi có order hoặc thanh toán) được phản ánh tức thì lên màn hình `/waiter/tables` của tôi mà không cần tải lại trang.

**Lý do cho mức độ ưu tiên này**: Tránh tình trạng xung đột thông tin (hai nhân viên cùng xếp khách vào một bàn trống cùng lúc), nâng cao hiệu suất phối hợp ca làm việc.

**Kiểm thử Độc lập**: Mở hai cửa sổ trình duyệt cùng hiển thị `/waiter/tables`; ở cửa sổ 1, bấm `[Đón khách]` trên "Bàn 01"; kiểm tra ở cửa sổ 2 trong vòng dưới 1 giây, thẻ "Bàn 01" tự động đổi sang màu đỏ ấm `[Đang có khách]` kèm theo nhóm nút hành động cập nhật tương ứng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** hai thiết bị (hoặc hai phiên làm việc) đang mở màn hình `/waiter/tables`, **Khi (When)** thiết bị thứ nhất đổi trạng thái bàn từ `AVAILABLE` sang `OCCUPIED`, **Thì (Then)** màn hình của thiết bị thứ hai tự động cập nhật màu sắc, badge và danh sách nút bấm trong thời gian dưới 1 giây.
2. **Cho trước (Given)** kết nối thời gian thực bị gián đoạn tạm thời, **Khi (When)** kết nối mạng được khôi phục, **Thì (Then)** giao diện tự động đồng bộ lại toàn bộ trạng thái bàn mới nhất từ máy chủ mà không làm gián đoạn trải nghiệm của nhân viên.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **Trùng lặp tên bàn trên toàn hệ thống**: Tên bàn phải duy nhất tuyệt đối trong toàn bộ nhà hàng, không phụ thuộc vào khu vực. Hệ thống chặn lưu và thông báo lỗi rõ ràng nếu trùng lặp.
- **Sức chứa ngoài phạm vi cho phép**: Nhập sức chứa nhỏ hơn 1 hoặc lớn hơn 100 sẽ bị chặn ngay tại giao diện và tầng nghiệp vụ với thông báo hợp lệ hóa.
- **Khách không dùng món (Occupied no-order checkout)**: Khách vào bàn (`OCCUPIED`) nhưng đổi ý rời đi mà không gọi món; khi nhân viên chọn `[Kết thúc bữa ăn]`, hệ thống nhận diện không có Order và hỏi xác nhận giải phóng bàn trực tiếp về `AVAILABLE` mà không chuyển sang thanh toán.
- **Vô hiệu hóa khu vực có khách**: Chặn hoàn toàn việc đổi `IsActive = false` của khu vực nếu có bất kỳ bàn nào bên trong đang ở trạng thái `OCCUPIED` hoặc có order đang mở.
- **Xóa bàn đang phục vụ**: Chặn hoàn toàn thao tác xóa bàn nếu bàn đang có khách hoặc order mở.
- **Xung đột thao tác đồng thời (Concurrency Conflict)**: Hai nhân viên cùng tác động lên một bàn cùng lúc; hệ thống thực thi theo nguyên tắc người đến trước (first-come), từ chối người thứ hai với thông báo giải thích và thẻ bàn lập tức cập nhật trạng thái mới nhất từ SignalR.
- **Mất kết nối mạng tạm thời**: Khi kết nối thời gian thực bị mất, giao diện hiển thị biểu tượng trạng thái kết nối nhẹ nhàng và tự động tái kết nối nền kèm tải lại dữ liệu mới nhất.

---

## Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cho phép Quản lý tạo mới Khu vực ăn uống với: Tên khu vực (bắt buộc, tối đa 128 ký tự), Mô tả (tùy chọn, tối đa 512 ký tự), Trạng thái hoạt động `IsActive` (mặc định là `true`).
- **FR-002**: Hệ thống PHẢI cho phép Quản lý cập nhật thông tin Khu vực ăn uống (Tên, Mô tả).
- **FR-003**: Hệ thống KHÔNG ĐƯỢC cung cấp thao tác xóa cứng Khu vực ăn uống; thay vào đó PHẢI cung cấp cơ chế Kích hoạt / Vô hiệu hóa (`IsActive`). Khi khu vực bị vô hiệu hóa, toàn bộ bàn trực thuộc PHẢI tự động chuyển sang trạng thái `INACTIVE` (`Disabled`). Khi kích hoạt lại khu vực, các bàn trực thuộc PHẢI chuyển về `AVAILABLE`.
- **FR-004**: Hệ thống PHẢI hiển thị danh sách Khu vực ăn uống kèm theo chỉ số tổng số bàn của từng khu vực và cờ trạng thái `IsActive`.
- **FR-005**: Hệ thống PHẢI cho phép Quản lý tạo mới Bàn ăn với: Tên/Số hiệu bàn (bắt buộc, duy nhất trên toàn bộ nhà hàng), Sức chứa (nguyên dương từ 1 đến 100, mặc định là 4), Khu vực trực thuộc (bắt buộc, phải là khu vực đang có `IsActive = true`), Vị trí mô tả (tùy chọn, tối đa 128 ký tự).
- **FR-006**: Hệ thống PHẢI hỗ trợ đầy đủ 5 trạng thái vòng đời bàn ăn:
  - `AVAILABLE` (Bàn trống, sẵn sàng đón khách)
  - `OCCUPIED` (Đang có khách ngồi)
  - `RESERVED` (Đã đặt trước)
  - `CLEANING` (Đang dọn dẹp)
  - `INACTIVE` / `Disabled` (Vô hiệu hóa / Tạm dừng phục vụ)
- **FR-007**: Hệ thống PHẢI cung cấp màn hình vận hành bàn chuyên biệt cho Waiter tại đường dẫn `/waiter/tables` hiển thị danh sách bàn dạng Card Grid chuẩn 4 thẻ trên mỗi hàng.
- **FR-008**: Mỗi Thẻ Bàn (Table Card) trên `/waiter/tables` PHẢI hiển thị đầy đủ: Tên bàn, Sức chứa chỗ ngồi (Capacity), Huy hiệu trạng thái (Status badge), và Nhóm nút hành động theo ngữ cảnh trạng thái:
  - Trạng thái `AVAILABLE`: Nút `[Đón khách]`, Nút `[Đặt bàn]`, Nút `[Vô hiệu hóa bàn]`.
  - Trạng thái `INACTIVE`: Nút `[Kích hoạt bàn]` (chặn toàn bộ hành vi đón khách, đặt bàn, tạo order).
  - Trạng thái `OCCUPIED`: Nút `[Order]` (điều hướng sang `/waiter/order/:tableId`), Nút `[Kết thúc bữa ăn]` (phân nhánh 2 trường hợp: không có order thì xác nhận giải phóng bàn về `AVAILABLE`; có order thì xác nhận và điều hướng sang màn hình Thanh toán trong khi bàn vẫn duy trì trạng thái `OCCUPIED` cho đến khi thanh toán xong).
  - Trạng thái `CLEANING`: Nút `[Dọn dẹp xong]` (chuyển về `AVAILABLE`).
  - Trạng thái `RESERVED`: Nút `[Nhận bàn]` (chuyển sang `OCCUPIED`), Nút `[Hủy đặt]` (chuyển về `AVAILABLE`).
- **FR-009**: Hệ thống PHẢI công nhận trạng thái `OCCUPIED + No Order` là một trạng thái kinh doanh hợp lệ khi nhân viên thực hiện thao tác `[Đón khách]`.
- **FR-010**: Hệ thống PHẢI hỗ trợ chuyển đổi trạng thái bàn tự động qua sự kiện: tự động chuyển sang `OCCUPIED` khi có Order mới mở tại bàn; tự động chuyển sang `CLEANING` khi hóa đơn thanh toán hoàn tất từ module RM-016.
- **FR-011**: Hệ thống PHẢI ngăn chặn việc xóa Bàn ăn nếu bàn đó đang ở trạng thái `OCCUPIED` hoặc đang có đơn hàng mở chưa hoàn tất.
- **FR-012**: Hệ thống PHẢI cung cấp thanh công cụ lọc bàn theo Tab Khu vực (Tất cả, và các khu vực đang hoạt động `IsActive = true`) và lọc theo Trạng thái bàn trên giao diện `/waiter/tables`. Các khu vực bị vô hiệu hóa (`IsActive = false`) PHẢI được ẩn hoàn toàn khỏi danh sách tab trên `/waiter/tables`.
- **FR-013**: Hệ thống PHẢI hỗ trợ đồng bộ trạng thái bàn theo thời gian thực (Real-time qua SignalR) tới tất cả các thiết bị máy khách đang mở màn hình `/waiter/tables`, đồng thời áp dụng cơ chế kiểm soát xung đột đồng thời (Atomic Status Check) để ngăn chặn ghi đè khi nhiều nhân viên thao tác cùng lúc trên một bàn.
- **FR-014**: Hệ thống PHẢI áp dụng phân quyền nghiêm ngặt:
  - Quyền Quản lý (`DiningAreas.Manage`, `Tables.Manage`): Tạo, sửa, kích hoạt/vô hiệu hóa khu vực; tạo, sửa, xóa bàn ăn.
  - Quyền Vận hành Nhân viên (`DiningAreas.View`, `Tables.View`, `Tables.UpdateStatus`): Xem sơ đồ bàn, thao tác chuyển đổi trạng thái bàn trên `/waiter/tables`.
- **FR-015**: Giao diện PHẢI tuân thủ Bộ nhận diện Cam & Trắng đặc trưng (Orange & White Theme) theo Hiến pháp Acme.TooHungry và hỗ trợ 100% song ngữ (`vi.json` / `en.json`).

---

### Các Thực thể Chính (Key Entities)

- **DiningArea (Khu vực ăn uống)**: Đại diện cho phân vùng không gian trong nhà hàng (Tầng 1, Tầng 2, Ngoài trời, Phòng VIP).
  - *Thuộc tính chính*: Mã định danh (`Id`), Tên khu vực (`Name`, bắt buộc, tối đa 128 ký tự), Mô tả (`Description`, tùy chọn), Trạng thái hoạt động (`IsActive`, boolean), Danh sách các bàn trực thuộc (`Tables`).
- **RestaurantTable (Bàn ăn)**: Đại diện cho một bàn ăn cụ thể trong nhà hàng.
  - *Thuộc tính chính*: Mã định danh (`Id`), Tên/Số hiệu bàn (`Name`, bắt buộc, duy nhất toàn hệ thống, tối đa 128 ký tự), Sức chứa chỗ ngồi (`Capacity`, nguyên dương 1-100), Trạng thái hiện tại (`Status`, kiểu enum `TableStatus`), Mã khu vực trực thuộc (`DiningAreaId`), Đối tượng khu vực (`DiningArea`), Ghi chú vị trí (`Location`), Thông tin đặt chỗ trước (`ReservedCustomerName`, `ReservedCustomerPhone`, `ReservedTime`, `ReservedGuestCount`, `ReservedNote`).
- **TableStatus (Trạng thái bàn)**: Kiểu liệt kê gồm 5 trạng thái vòng đời:
  - `Available` = 0 (Bàn trống)
  - `Occupied` = 1 (Đang có khách ngồi)
  - `Reserved` = 2 (Đã đặt trước)
  - `Disabled` / `Inactive` = 3 (Vô hiệu hóa / Tạm dừng)
  - `Cleaning` = 4 (Đang dọn dẹp)

---

## Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: Nhân viên phục vụ thực hiện thao tác tiếp đón khách (`AVAILABLE` → `OCCUPIED`) trên thẻ bàn tại `/waiter/tables` chỉ với 1 cú nhấp chuột và phản hồi hoàn tất trong thời gian dưới 500 mili-giây.
- **SC-002**: Khi trạng thái bàn thay đổi trên một thiết bị, màn hình của tất cả các nhân viên khác mở cùng sơ đồ bàn phản ánh màu sắc và trạng thái mới trong thời gian dưới 1 giây.
- **SC-003**: 100% các hành vi cố ý vô hiệu hóa khu vực có khách hoặc xóa bàn đang có khách/đơn hàng đều bị hệ thống chặn lại với thông báo giải thích cụ thể.
- **SC-004**: Người quản lý có thể tạo mới một khu vực cùng với 10 bàn ăn hoàn chỉnh trong thời gian dưới 2 phút.
- **SC-005**: Giao diện sơ đồ bàn tải mượt mà và hiển thị trực quan tối thiểu 100 bàn ăn trong thời gian dưới 1.5 giây.
- **SC-006**: 100% các chuỗi văn bản trên giao diện đều hiển thị chuẩn xác cả hai ngôn ngữ Tiếng Việt và Tiếng Anh khi chuyển đổi qua lại.

---

## Các Giả định (Assumptions)

- Bàn ăn bắt buộc phải gắn với một Khu vực ăn uống đang hoạt động (`IsActive = true`).
- Màn hình phục vụ `/waiter/tables` được tối ưu hóa cho màn hình Desktop và Máy tính bảng (Tablet) sử dụng trình duyệt hiện đại với kết nối mạng ổn định.
- Nghiệp vụ đặt trước bàn chuyên sâu (quản lý danh sách lịch đặt theo ngày, chọn khung giờ) được xử lý tại module Đặt bàn RM-009; module RM-008 cung cấp giao diện hiển thị trạng thái và tiếp nhận khách.
- Nghiệp vụ gọi món chi tiết được chuyển tiếp sang module POS RM-010 thông qua nút `[Order]` dẫn tới `/waiter/order/:tableId`.
- Nghiệp vụ thanh toán và chuyển bàn sang dọn dẹp được liên kết với module Thanh toán RM-016.
- Nghiệp vụ chuyển bàn (Move Table) và gộp bàn (Merge Tables) được quản lý tại module Đơn hàng & Thanh toán.
