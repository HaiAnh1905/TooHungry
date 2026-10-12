# Đặc tả Tính năng (Feature Specification): POS / Đơn hàng (POS Ordering & Dining Session Management)

**Mã Tính năng (Feature ID)**: `RM-010`

**Nhánh Tính năng (Feature Branch)**: `010-rm-010-pos-ordering-and-billing`

**Ngày cập nhật**: 2026-10-09

**Trạng thái**: Hoàn thiện (Ready for Plan)

**Đầu vào**: Yêu cầu nghiệp vụ từ Roadmap RM-010: "Quản lý đơn hàng, gọi món tại bàn cho Waiter và quy trình phục vụ bữa ăn."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 2026-10-09
- **Q1: Trạng thái `PENDING` của đơn hàng được hiểu như thế nào trong phân hệ POS?**
  - **A1**: Trong module này, `PENDING` được định nghĩa là **Order đang hoạt động và chưa được thanh toán** (không mang nghĩa là chưa gửi bếp). Trong suốt thời gian đơn ở trạng thái `PENDING`, nhân viên phục vụ (Waiter) có toàn quyền thêm món, tăng số lượng, giảm số lượng hoặc xóa món khỏi đơn hàng.
- **Q2: Quy tắc về Active Order và Phiên ăn (Dining Session) của bàn ăn?**
  - **A2**: Mỗi phiên ăn của một bàn đang phục vụ (`OCCUPIED`) chỉ tồn tại **duy nhất một đơn hàng hoạt động** (`Active Order`). Tuyệt đối không sinh nhiều Order cho cùng một phiên ăn (Ví dụ: Bàn 05 có Order #001, khi khách gọi thêm món thì hệ thống cập nhật vào Order #001, không sinh Order #002). Khi Waiter truy cập lại trang gọi món của bàn có đơn `PENDING`, hệ thống tự động tải lại toàn bộ đơn này để tiếp tục thao tác (`Continue Order`).
- **Q3: Cơ chế kiểm tra tồn kho nguyên liệu khi Waiter gọi món áp dụng theo hình thức nào?**
  - **A3**: Áp dụng **Kiểm tra tồn khả dụng tức thời (Instant stock validation)** tại thời điểm tăng số lượng món và khi bấm `[Đặt đơn]`; **không thực hiện giữ chỗ kho cứng (Stock reservation/hold)** cho đơn hàng `PENDING`. Khấu trừ vật lý tồn kho thực tế theo thuật toán FEFO chỉ diễn ra khi đơn được hoàn tất thanh toán (RM-016).
- **Q4: Hành vi khi bấm nút `[Đặt đơn]` (Submit / Update Order)?**
  - **A4**: Khi Waiter nhấn `[Đặt đơn]`, hệ thống tạo mới Active Order (nếu bàn chưa có đơn) hoặc cập nhật Active Order hiện tại của bàn, gắn đúng `TableId`, lưu các `OrderItem` và đặt trạng thái đơn hàng là `PENDING`. Sau khi lưu thành công, Waiter có thể nhấn nút `[← Back]` để quay về màn hình danh sách bàn `/waiter/tables`.
- **Q5: Ranh giới giữa RM-010 và phân hệ Thanh toán RM-016?**
  - **A5**: RM-010 tập trung chuyên sâu vào giao diện và nghiệp vụ gọi món tại bàn cho Waiter (`/waiter/order/:tableId`). Tại màn hình sơ đồ bàn (`/waiter/tables`), khi bàn `OCCUPIED` bấm nút `[Kết thúc bữa ăn]`: Nếu bàn có Active Order, hệ thống hiển thị hộp thoại xác nhận và điều hướng sang trang Thanh toán độc lập `/waiter/payment/:orderId` thuộc phạm vi RM-016.
- **Q6: Vị trí và cơ chế nhập ghi chú chế biến cho từng món ăn (Item Notes) trên giao diện gọi món?**
  - **A6**: Cho phép nhập trong **Food Detail Modal** trước khi đưa món vào giỏ, đồng thời hỗ trợ xem và chỉnh sửa trực tiếp dưới từng dòng món ăn trong **Order Drawer**, ánh xạ trực tiếp vào thuộc tính `OrderItem.Note`.
- **Q7: Xử lý thế nào khi Waiter xóa sạch toàn bộ món trong giỏ của một đơn hàng `PENDING` đã lưu từ trước?**
  - **A7**: Vô hiệu hóa (disable) nút `[Đặt đơn]` khi giỏ hàng rỗng để ngăn chặn lưu đơn rỗng; cung cấp nút chức năng riêng `[Hủy đơn hàng]` trên giao diện (kèm hộp thoại xác nhận và nhập lý do hủy) để chuyển trạng thái đơn hàng sang `CANCELLED`.
- **Q8: Đồng bộ Realtime SignalR khi Waiter tạo mới hoặc cập nhật đơn hàng?**
  - **A8**: Có. Sau khi lưu thành công đơn hàng, hệ thống phát thông báo SignalR thời gian thực (`NotifyTableOrderUpdatedAsync`) để cập nhật cờ `hasActiveOrder = true` và `activeOrderId` trên sơ đồ bàn `/waiter/tables` của tất cả client đang kết nối trong thời gian dưới 1 giây.
- **Q9: Cơ chế tìm kiếm món ăn trên lưới thực đơn?**
  - **A9**: Bố trí ô tìm kiếm nhanh ở đầu lưới thực đơn, hỗ trợ tìm kiếm tức thì client-side theo tên món (không phân biệt hoa/thường, hỗ trợ gõ tiếng Việt có dấu/không dấu) kết hợp đồng thời với bộ lọc danh mục món của Sidebar.

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Điều hướng Gọi món & Định vị Bàn ăn cho Waiter (Priority: P1)

Là Nhân viên phục vụ (Waiter), khi bàn ăn chuyển sang trạng thái đang có khách (`OCCUPIED`), tôi muốn bấm nút `[Order]` trên thẻ bàn để điều hướng trực tiếp sang màn hình gọi món `/waiter/order/:tableId`, quan sát thẻ thông tin bàn ăn (Table Information Card) tại đầu Sidebar và danh mục món ăn để bắt đầu phục vụ chính xác bàn đó.

**Lý do cho mức độ ưu tiên này**: Đây là điểm bắt đầu của quy trình phục vụ bữa ăn tại bàn. Nếu không thể điều hướng đúng bàn và nhận diện thông tin bàn ăn, nhân viên sẽ dễ ghi nhầm đơn sang bàn khác.

**Kiểm thử Độc lập**: Chọn bàn Bàn 03 (`OCCUPIED`, 4 chỗ ngồi) tại `/waiter/tables`, bấm nút `[Order]`. Hệ thống chuyển hướng sang `/waiter/order/{tableId-03}`. Sidebar hiển thị Table Information Card ghi rõ "Bàn 03", "4 chỗ ngồi", badge "Đang có khách". Header hiển thị nút `[← Back]` và nút `[🛒]`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một bàn ăn đang ở trạng thái `OCCUPIED` trên màn hình `/waiter/tables`, **Khi (When)** Waiter bấm nút `[Order]` trên thẻ bàn, **Thì (Then)** hệ thống điều hướng trực tiếp sang trang gọi món `/waiter/order/:tableId` tương ứng.
2. **Cho trước (Given)** Waiter đang ở trang `/waiter/order/:tableId`, **Khi (When)** trang được tải, **Thì (Then)** ở đầu Sidebar bắt buộc hiển thị Table Information Card với đầy đủ thông tin: Tên bàn, Số chỗ ngồi (Capacity) và Trạng thái hiện tại (`OCCUPIED`).
3. **Cho trước (Given)** Sidebar của trang gọi món, **Khi (When)** hiển thị danh sách danh mục món ăn (Menu Categories), **Thì (Then)** danh mục mặc định ở trạng thái mở rộng (Expanded) và cho phép bấm chọn để lọc danh sách món ăn hiển thị.
4. **Cho trước (Given)** Header của trang gọi món, **Khi (When)** Waiter quan sát thanh điều hướng trên cùng, **Thì (Then)** hiển thị nút `[← Back]` để quay lại `/waiter/tables` và biểu tượng giỏ hàng `[🛒]` kèm số lượng món hiện có trong đơn.

---

### User Story 2 - Duyệt Thực đơn, Xem Chi tiết & Thêm Món vào Giỏ (Priority: P1)

Là Waiter, tôi muốn duyệt danh sách món ăn dạng lưới (Food Cards), xem ảnh, tên món, giá bán, xem chi tiết mô tả món khi cần và chọn món nhanh vào giỏ hàng phục vụ khách.

**Lý do cho mức độ ưu tiên này**: Giao diện chọn món trực quan, mượt mà giúp Waiter thao tác nhanh trong giờ cao điểm của nhà hàng, giảm thiểu thời gian khách phải chờ đợi.

**Kiểm thử Độc lập**: Trên màn hình Order, quan sát lưới món ăn hiển thị 3 thẻ món mỗi hàng. Bấm nút đặt món góc trên bên phải của "Bò Bít Tết" (250,000đ) -> món được thêm vào giỏ. Bấm vào thân thẻ món "Pizza Hải Sản" -> mở Modal chi tiết món ăn (ảnh, mô tả, giá, nút đóng `[X]`, nút `[Đặt món]`).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** danh sách món ăn đang hiển thị, **Khi (When)** hiển thị trên màn hình, **Thì (Then)** bố cục thực đơn trình bày dạng lưới với đúng 3 Food Cards trên mỗi hàng (trên màn hình desktop/tablet chuẩn).
2. **Cho trước (Given)** một Food Card trên lưới món ăn, **Khi (When)** hiển thị, **Thì (Then)** thẻ món bao gồm: Ảnh món ăn (khung ảnh vuông, nền đen), Tên món ăn, Giá bán niêm yết, và Nút đặt món nhanh nằm ở góc trên bên phải ảnh.
3. **Cho trước (Given)** Food Card của một món ăn, **Khi (When)** Waiter nhấn trực tiếp vào thẻ món (ngoài nút đặt nhanh), **Thì (Then)** hệ thống mở Modal chi tiết món ăn (Food Detail Modal) hiển thị đầy đủ: Ảnh món, Tên món, Mô tả chi tiết, Giá bán, nút đóng `[X]` và nút hành động `[Đặt món]`.
4. **Cho trước (Given)** món ăn hiển thị trên lưới hoặc trong Modal chi tiết, **Khi (When)** Waiter bấm nút đặt món, **Thì (Then)** món ăn được thêm vào giỏ hàng với số lượng ban đầu là 1 (nếu chưa có) hoặc tăng số lượng lên 1 (nếu đã có trong giỏ), đồng thời badge số lượng trên nút `[🛒]` tự động tăng.

---

### User Story 3 - Quản lý Giỏ hàng (Order Drawer) & Kiểm tra Tồn kho Công thức (Priority: P1)

Là Waiter, tôi muốn mở ngăn kéo giỏ hàng (Order Drawer) từ bên phải màn hình để kiểm tra danh sách món đã chọn, điều chỉnh số lượng (tăng/giảm) hoặc xóa món, đồng thời hệ thống tự động kiểm tra tồn kho nguyên liệu theo định lượng công thức (Recipe) và ngăn chặn việc tăng số lượng nếu không đủ nguyên liệu.

**Lý do cho mức độ ưu tiên này**: Đảm bảo nhân viên không thể nhận order vượt quá năng lực phục vụ thực tế của nhà bếp, ngăn chặn hoàn toàn tình trạng âm kho nguyên liệu và hủy món sau khi khách đã chờ lâu.

**Kiểm thử Độc lập**: Bấm nút `[🛒]`, Order Drawer trượt ra từ mép phải màn hình hiển thị danh sách món. Bấm `[+]` để tăng Pizza từ 2 lên 3 phần. Nếu kho đủ bột mì và phô mai, số lượng cập nhật thành 3 và tổng tiền tính lại. Nếu kho chỉ đủ làm 2 phần, hệ thống hiển thị thông báo lỗi "Không đủ nguyên liệu trong kho để phục vụ thêm món này" và giữ nguyên số lượng là 2.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** Waiter đang ở trang Order, **Khi (When)** bấm biểu tượng `[🛒]` trên Header, **Thì (Then)** Order Drawer trượt ra mượt mà từ mép phải màn hình.
2. **Cho trước (Given)** Order Drawer đang mở, **Khi (When)** hiển thị các món đã chọn, **Thì (Then)** mỗi món hiển thị rõ ràng: Tên món, Số lượng hiện tại, Đơn giá, Thành tiền (Số lượng × Đơn giá), và Tổng tiền của toàn bộ đơn hàng ở chân Drawer.
3. **Cho trước (Given)** một món ăn trong Order Drawer, **Khi (When)** Waiter bấm nút tăng số lượng `[+]`, **Thì (Then)** hệ thống bắt buộc kiểm tra tồn kho nguyên liệu khả dụng theo định lượng công thức (Recipe Validation) cho số lượng tăng thêm đó:
   - Nếu đủ nguyên liệu: Cho phép tăng số lượng và cập nhật lại thành tiền.
   - Nếu không đủ nguyên liệu: Hiển thị cảnh báo thiếu nguyên liệu cụ thể, chặn không cho tăng số lượng và giữ nguyên số lượng cũ (tuyệt đối không cho phép âm kho).
4. **Cho trước (Given)** một món ăn trong Order Drawer, **Khi (When)** Waiter bấm nút giảm số lượng `[-]`, **Thì (Then)** nếu số lượng > 1 thì giảm bớt 1 phần; nếu số lượng = 1 thì hỏi xác nhận xóa món khỏi đơn hàng.
5. **Cho trước (Given)** một món ăn trong Order Drawer, **Khi (When)** Waiter bấm biểu tượng thùng rác `[Xóa]`, **Thì (Then)** món ăn bị loại bỏ hoàn toàn khỏi giỏ hàng và tổng tiền đơn hàng được tính toán lại ngay lập tức.

---

### User Story 4 - Quy tắc Active Order Duy nhất & Tiếp tục Gọi món (Continue Order) (Priority: P1)

Là Waiter, khi phục vụ một bàn ăn trong suốt bữa ăn của khách, tôi muốn hệ thống chỉ duy trì duy nhất một Active Order cho phiên ăn đó; khi khách gọi thêm món, tôi có thể mở lại trang Order của bàn để tiếp tục bổ sung món vào đơn hiện tại mà không bị sinh ra các đơn hàng phân mảnh.

**Lý do cho mức độ ưu tiên này**: Đảm bảo tính toàn vẹn dữ liệu đơn hàng cho mỗi bàn, tránh tình trạng thanh toán sót đơn hoặc dữ liệu hóa đơn bị chia tách không kiểm soát.

**Kiểm thử Độc lập**: Bàn 05 đã có đơn hàng PENDING gồm 2 món. Waiter quay lại `/waiter/tables` rồi lại bấm `[Order]` vào Bàn 05. Hệ thống tải lại chính xác đơn hàng PENDING của Bàn 05 cùng 2 món trước đó. Waiter thêm 1 món mới và bấm `[Đặt đơn]`. Hệ thống cập nhật vào đúng Order hiện tại, mã Order không đổi, không sinh Order mới.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một bàn `OCCUPIED` chưa có đơn hàng nào, **Khi (When)** Waiter chọn món và bấm `[Đặt đơn]`, **Thì (Then)** hệ thống tạo mới Active Order đầu tiên cho bàn với trạng thái `PENDING`.
2. **Cho trước (Given)** một bàn `OCCUPIED` đã có Active Order ở trạng thái `PENDING`, **Khi (When)** Waiter truy cập lại `/waiter/order/:tableId`, **Thì (Then)** hệ thống tự động tải lại toàn bộ thông tin của Active Order đó vào giỏ hàng (`Continue Order`).
3. **Cho trước (Given)** Active Order đang có trạng thái `PENDING`, **Khi (When)** Waiter thêm món mới hoặc chỉnh sửa số lượng và bấm `[Đặt đơn]`, **Thì (Then)** hệ thống cập nhật trực tiếp danh sách món vào Active Order hiện tại, giữ nguyên `OrderNumber` và phiên ăn của bàn, tuyệt đối không tạo đơn mới.
4. **Cho trước (Given)** một phiên ăn của một bàn, **Khi (When)** kiểm tra trong cơ sở dữ liệu, **Thì (Then)** không bao giờ tồn tại nhiều hơn 1 đơn hàng ở trạng thái chưa thanh toán (`PENDING`) cho cùng một `TableId`.

---

### User Story 5 - Xác nhận Đơn hàng (`Submit / Update Order`) & Rời Trang (Priority: P1)

Là Waiter, sau khi chọn xong các món ăn cho khách, tôi muốn bấm nút `[Đặt đơn]` trong Order Drawer để hệ thống lưu trữ đơn hàng `PENDING`, sau đó có thể quay lại danh sách bàn để tiếp tục phục vụ các bàn khác.

**Lý do cho mức độ ưu tiên này**: Khép kín quy trình gọi món cho nhân viên phục vụ, cho phép nhân viên xác nhận dữ liệu đã hoàn tất và chuyển sang phục vụ bàn tiếp theo.

**Kiểm thử Độc lập**: Thêm 2 món vào giỏ hàng, mở Drawer, bấm `[Đặt đơn]`. Hệ thống lưu đơn thành công, hiển thị thông báo thành công dạng Toast, đóng giỏ hàng. Bấm `[← Back]` quay về `/waiter/tables`. Thẻ bàn hiển thị biểu tượng đơn hàng đang chạy.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** giỏ hàng có ít nhất một món ăn, **Khi (When)** Waiter bấm nút `[Đặt đơn]` ở cuối Order Drawer, **Thì (Then)** hệ thống thực hiện kiểm tra tính hợp lệ toàn diện (bao gồm kiểm tra tồn kho nguyên liệu), lưu/cập nhật đơn hàng xuống hệ thống với trạng thái `PENDING` và hiển thị thông báo lưu thành công.
2. **Cho trước (Given)** giỏ hàng không có món nào (trống), **Khi (When)** Waiter xem Order Drawer, **Thì (Then)** nút `[Đặt đơn]` bị vô hiệu hóa (disabled) và hệ thống hiển thị thông báo giỏ hàng đang trống.
3. **Cho trước (Given)** đơn hàng đã được lưu thành công, **Khi (When)** Waiter bấm nút `[← Back]` trên Header, **Thì (Then)** hệ thống điều hướng mượt mà quay trở lại màn hình danh sách bàn `/waiter/tables`.
4. **Cho trước (Given)** Waiter đã thay đổi số lượng hoặc thêm món vào giỏ hàng nhưng chưa bấm `[Đặt đơn]`, **Khi (When)** bấm `[← Back]`, **Thì (Then)** hệ thống hiển thị cảnh báo xác nhận có thay đổi chưa lưu trước khi rời khỏi trang.

---

### User Story 6 - Chuyển tiếp Bữa ăn sang Phân hệ Thanh toán RM-016 (Priority: P2)

Là Waiter hoặc Quản lý, khi khách tại bàn `OCCUPIED` dùng bữa xong và yêu cầu thanh toán, tôi muốn bấm nút `[Kết thúc bữa ăn]` trên thẻ bàn tại `/waiter/tables` để kiểm tra đơn hàng đang hoạt động và chuyển tiếp mượt mà sang trang Thanh toán độc lập `/waiter/payment/:orderId` (RM-016).

**Lý do cho mức độ ưu tiên này**: Kết nối liền mạch chu trình vận hành nhà hàng giữa giai đoạn gọi món (RM-010) và giai đoạn thanh toán/dọn bàn (RM-016/RM-008).

**Kiểm thử Độc lập**: Tại `/waiter/tables`, bấm `[Kết thúc bữa ăn]` trên Bàn 02 đang `OCCUPIED` có đơn hàng PENDING. Modal xác nhận hiển thị tóm tắt đơn hàng. Bấm xác nhận -> hệ thống điều hướng trực tiếp sang `/waiter/payment/{orderId}` của RM-016.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** bàn `OCCUPIED` có Active Order ở trạng thái `PENDING`, **Khi (When)** Waiter bấm nút `[Kết thúc bữa ăn]` trên thẻ bàn, **Thì (Then)** hệ thống hiển thị Modal xác nhận với thông tin tóm tắt của bàn và mã đơn hàng.
2. **Cho trước (Given)** Modal xác nhận kết thúc bữa ăn đang mở, **Khi (When)** Waiter bấm nút xác nhận thanh toán, **Thì (Then)** hệ thống điều hướng trực tiếp sang màn hình thanh toán `/waiter/payment/:orderId` tương ứng.
3. **Cho trước (Given)** bàn `OCCUPIED` nhưng chưa phát sinh bất kỳ món ăn nào trong đơn hàng, **Khi (When)** Waiter bấm `[Kết thúc bữa ăn]`, **Thì (Then)** hệ thống hỏi xác nhận giải phóng bàn trống về lại `AVAILABLE` mà không chuyển sang trang thanh toán.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **Món ăn bị vô hiệu hóa hoặc hết hàng trong lúc Waiter đang thao tác**: Nếu một món ăn bị quản trị viên đánh dấu không khả dụng (`IsAvailable = false`) hoặc nguyên liệu trong kho bị xuất hết cho đơn khác trước khi Waiter bấm `[Đặt đơn]`, hệ thống PHẢI cảnh báo cụ thể tên món ăn bị thiếu và yêu cầu điều chỉnh lại giỏ hàng trước khi lưu.
- **Mất kết nối mạng khi đang thao tác gọi món**: Giao diện PHẢI giữ nguyên trạng thái giỏ hàng hiện tại trong bộ nhớ tạm của client, hiển thị thanh cảnh báo mất kết nối và tự động thử lại khi kết nối mạng phục hồi.
- **Nhiều nhân viên cùng mở trang Order của một bàn**: Hệ thống áp dụng kiểm tra phiên bản dữ liệu (`Concurrency Check`). Khi một nhân viên đã bấm `[Đặt đơn]`, nhân viên còn lại khi thao tác sẽ nhận được thông báo dữ liệu đơn hàng đã được cập nhật từ thiết bị khác và tự động tải lại dữ liệu mới nhất.
- **Bàn bị vô hiệu hóa hoặc chuyển trạng thái bất thường từ bên ngoài**: Nếu bàn ăn bị quản lý đổi trạng thái trong lúc Waiter đang mở trang Order, hệ thống PHẢI cảnh báo người dùng và chuyển hướng an toàn về danh sách bàn.

---

## Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cung cấp tuyến đường (Route) `/waiter/order/:tableId` dành riêng cho nhân viên phục vụ gọi món tại bàn.
- **FR-002**: Khi điều hướng từ nút `[Order]` trên thẻ bàn `OCCUPIED` tại `/waiter/tables`, hệ thống PHẢI nạp đúng thông tin bàn ăn theo `tableId` và hiển thị Table Information Card ở đầu Sidebar (bao gồm Tên bàn, Sức chứa, Trạng thái).
- **FR-003**: Hệ thống PHẢI hiển thị danh mục món ăn (Menu Categories) trên Sidebar với trạng thái mở rộng mặc định, cho phép lọc thực đơn theo từng nhóm danh mục.
- **FR-004**: Header trang gọi món PHẢI có nút `[← Back]` để quay về `/waiter/tables` và nút `[🛒]` hiển thị số lượng món trong giỏ để mở Order Drawer.
- **FR-005**: Danh sách thực đơn PHẢI được hiển thị theo dạng lưới với 3 Food Cards trên mỗi hàng (đối với màn hình desktop/tablet). Mỗi thẻ món PHẢI gồm: Ảnh món (ảnh vuông, nền đen), Tên món, Giá bán niêm yết và Nút đặt món nhanh ở góc trên bên phải.
- **FR-006**: Khi nhấn vào thẻ món ăn (ngoài nút đặt nhanh), hệ thống PHẢI mở Modal chi tiết món ăn (Food Detail Modal) hiển thị: Ảnh, Tên món, Mô tả, Giá bán, ô nhập Ghi chú chế biến tùy chỉnh (`Item Note`), nút đóng `[X]` và nút `[Đặt món]`.
- **FR-007**: Hệ thống PHẢI cung cấp Order Drawer trượt từ bên phải khi bấm biểu tượng `[🛒]`, hiển thị danh sách món đã chọn (Tên món, Số lượng, Đơn giá, Thành tiền, Ghi chú món kèm khả năng chỉnh sửa ghi chú) và Tổng tiền toàn đơn.
- **FR-008**: Order Drawer PHẢI cho phép Waiter tăng số lượng, giảm số lượng và xóa món ăn trực tiếp trong giỏ hàng.
- **FR-009**: Hệ thống PHẢI thực thi quy tắc **Duy nhất một Active Order**: Mỗi phiên ăn của bàn `OCCUPIED` chỉ tồn tại duy nhất một đơn hàng ở trạng thái `PENDING`. Nếu đã có đơn `PENDING`, hệ thống PHẢI tự động tải lại đơn đó để tiếp tục thao tác (`Continue Order`), không tạo thêm đơn mới.
- **FR-010**: Trạng thái `PENDING` của đơn hàng PHẢI được định nghĩa là **Order chưa thanh toán**; Waiter có toàn quyền thêm, sửa số lượng, hoặc xóa món trong đơn khi đơn đang ở trạng thái này.
- **FR-011**: Hệ thống BẮT BUỘC phải thực hiện **Kiểm tra tồn kho nguyên liệu (Inventory Stock Validation)** theo định lượng công thức (Recipe) ở cả Frontend và Backend khi tăng số lượng món ăn:
  - Nếu đủ nguyên liệu: Cho phép tăng số lượng.
  - Nếu không đủ nguyên liệu: Hiển thị cảnh báo thiếu nguyên liệu chi tiết và CHẶN tăng số lượng, tuyệt đối không cho phép tồn kho âm.
- **FR-012**: Khi Waiter nhấn nút `[Đặt đơn]` trong Order Drawer: Hệ thống PHẢI kiểm tra giỏ hàng có ít nhất 1 món ăn (vô hiệu hóa nút `[Đặt đơn]` khi giỏ rỗng), tạo Active Order (nếu chưa có) hoặc cập nhật Active Order hiện tại, gắn đúng `TableId`, đặt trạng thái đơn hàng là `PENDING` và lưu danh sách `OrderItem`.
- **FR-013**: Tại màn hình `/waiter/tables`, khi nhấn nút `[Kết thúc bữa ăn]` của bàn `OCCUPIED` có Active Order, hệ thống PHẢI hiển thị xác nhận và điều hướng sang trang Thanh toán `/waiter/payment/:orderId` thuộc phân hệ RM-016.
- **FR-014**: Tất cả các nhãn, thông báo và nút bấm trên giao diện gọi món PHẢI hỗ trợ đầy đủ song ngữ Tiếng Việt và Tiếng Anh (`vi.json` và `en.json`) theo quy chuẩn i18n của dự án.
- **FR-015**: Giao diện gọi món PHẢI tuân thủ triệt để bảng màu nhận diện Cam & Trắng (Orange & White Theme) theo Hiến pháp Acme.TooHungry (Điều VI).
- **FR-016**: Hệ thống PHẢI cung cấp chức năng `[Hủy đơn hàng]` trên trang gọi món (kèm hộp thoại xác nhận và nhập lý do hủy) để chuyển trạng thái Active Order sang `CANCELLED` mà không làm thay đổi trạng thái bàn ăn nếu Waiter muốn hủy toàn bộ đơn của phiên ăn.
- **FR-017**: Sau khi tạo mới hoặc cập nhật Active Order thành công, hệ thống PHẢI phát tín hiệu Realtime SignalR (`NotifyTableOrderUpdatedAsync`) tới tất cả các client đang mở sơ đồ bàn `/waiter/tables` để cập nhật trạng thái `hasActiveOrder = true` trong thời gian dưới 1 giây.
- **FR-018**: Giao diện thực đơn PHẢI cung cấp ô tìm kiếm nhanh (Search input) ở đầu danh sách món, hỗ trợ tìm kiếm tức thì theo từ khóa tên món kết hợp song song với bộ lọc danh mục món trên Sidebar.

---

### Các Thực thể Chính (Key Entities)

- **Order (Đơn hàng)**:
  - Đại diện cho đơn hàng trong một phiên ăn của một bàn.
  - Thuộc tính chính: `Id`, `OrderNumber`, `TableId` (liên kết với `RestaurantTable`), `OrderDate`, `Status` (`Pending`, `Processing`, `Completed`, `Cancelled`), `TotalAmount`, `Note`.
  - Quy tắc bất biến: Chỉ duy nhất 1 Order có `Status == OrderStatus.Pending` cho mỗi `TableId` trong một thời điểm.
- **OrderItem (Mục món ăn trong đơn)**:
  - Đại diện cho từng món ăn và số lượng được gọi trong đơn hàng.
  - Thuộc tính chính: `Id`, `OrderId`, `DishId` (liên kết với `Dish`), `Quantity`, `UnitPrice`, `TotalPrice`, `Note`.
- **Recipe & RecipeIngredient (Công thức & Nguyên liệu công thức - Tham chiếu từ RM-007)**:
  - Dùng để xác định định lượng nguyên liệu cấu thành món ăn nhằm phục vụ kiểm tra khả năng đáp ứng tồn kho khi đặt món.
- **RestaurantTable (Bàn ăn - Tham chiếu từ RM-008)**:
  - Thực thể bàn ăn liên kết với đơn hàng (`TableId`). Cung cấp thông tin tên bàn, khu vực và sức chứa hiển thị trên Table Information Card.

---

## Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: Waiter có thể hoàn thành việc chọn món cho một bàn 4 người và bấm `[Đặt đơn]` thành công trong thời gian dưới **45 giây**.
- **SC-002**: Tốc độ phản hồi của API tải thông tin bàn và thực đơn khi vào `/waiter/order/:tableId` đạt dưới **300ms**.
- **SC-003**: 100% các yêu cầu tăng số lượng món vượt quá tồn kho nguyên liệu khả dụng đều bị hệ thống chặn chính xác và hiển thị thông điệp cảnh báo rõ ràng, không để xảy ra bất kỳ trường hợp âm kho nào.
- **SC-004**: Đảm bảo 100% không phát sinh hiện tượng trùng lặp đơn hàng (`Duplicate Active Order`) cho cùng một bàn trong một phiên ăn.
- **SC-005**: 100% các chuỗi văn bản trên giao diện đều có mặt đầy đủ trong cả hai tệp ngôn ngữ `vi.json` và `en.json`.
- **SC-006**: Độ phủ kiểm thử tự động (Unit Tests & Integration Tests) cho các quy tắc nghiệp vụ Active Order và Stock Validation đạt tối thiểu **90%**.

---

## Các Giả định (Assumptions)

- **A1**: Danh mục món ăn (`Dish`), danh mục nhóm món (`DishCategory`), công thức món ăn (`Recipe`) và dữ liệu bàn ăn (`RestaurantTable`) đã được khởi tạo và cấu hình đầy đủ từ các module nền tảng trước đó (RM-004, RM-005, RM-006, RM-007, RM-008).
- **A2**: Nhân viên phục vụ thao tác trên các thiết bị máy tính bảng (Tablet) hoặc màn hình cảm ứng POS tại nhà hàng có kết nối mạng ổn định với máy chủ nội bộ.
- **A3**: Nghiệp vụ thanh toán chi tiết (tiền mặt, quét mã VietQR, in hóa đơn nhiệt, tính thuế VAT/chiết khấu) được thực hiện độc lập tại màn hình chuyên biệt của phân hệ RM-016.
- **A4**: Việc kiểm tra tồn kho nguyên liệu trong RM-010 dựa trên số lượng tồn kho khả dụng hiện tại của nguyên liệu trong kho so với định lượng công thức của món ăn đang được order.
