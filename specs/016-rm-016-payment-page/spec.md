# Đặc tả Tính năng (Feature Specification): Thanh toán đơn hàng (Payment Page)

**Mã Tính năng (Feature ID)**: `RM-016`

**Nhánh Tính năng (Feature Branch)**: `016-rm-016-payment-page`

**Ngày lập**: 2026-10-12

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**: 
- Yêu cầu nghiệp vụ từ Roadmap RM-016: "Màn hình thanh toán đơn hàng độc lập dành cho Waiter và Cashier khi khách kết thúc bữa ăn tại bàn có Order."
- Kế thừa luồng nghiệp vụ từ POS Ordering (RM-010), Quản lý bàn & trạng thái CLEANING (RM-008), và Khấu trừ kho vật lý FEFO (RM-011).

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 12-10-2026 (Phiên làm rõ Yêu cầu `/speckit.clarify` - 4 Quyết định Trọng yếu)
- **Q1: API Backend và Tính Toàn vẹn Giao dịch Thanh toán (`CompletePaymentAsync`)**: Backend nên ghi nhận và xử lý giao dịch thanh toán như thế nào?
  - **A1**: **Xây dựng API chuyên biệt `CompletePaymentAsync` trên `IOrderAppService` (và endpoint `POST /api/app/order/{id}/complete-payment`)**:
    - Nhận vào DTO chuyên biệt `CompletePaymentInputDto` gồm: `PaymentMethod` (Tiền mặt = 1, VietQR = 2), `CashGiven` (số tiền khách đưa đối với tiền mặt), và `PaymentNote` (ghi chú thanh toán nếu có).
    - Backend kiểm tra hợp lệ: Đơn hàng tồn tại, đang ở trạng thái chưa hoàn tất (`Pending` hoặc `Processing`), số tiền thanh toán khớp với giá trị hóa đơn.
    - Thực thi giao dịch nguyên tử (Atomic Unit of Work):
      1. Cập nhật `Order.Status = OrderStatus.Completed`.
      2. Kích hoạt tự động tính toán tiêu hao nguyên liệu theo công thức `Recipe` và khấu trừ kho vật lý FEFO (`ProcessOrderInventoryConsumptionAsync` / RM-011).
      3. Nếu đơn gắn với bàn ăn (`TableId`), cập nhật `Table.Status = TableStatus.Cleaning` (Dọn dẹp bàn), xóa thông tin khách đặt trước (nếu có).
      4. Phát sự kiện Realtime SignalR (`NotifyTableStatusChangedAsync`) để cập nhật tức thì sơ đồ bàn tại `/waiter/tables`.
    - Trả về `OrderDto` đã hoàn tất cho client.
- **Q2: Thuế VAT, Phí Dịch vụ và Giảm giá / Chiết khấu trên Hóa đơn**: Hóa đơn thanh toán RM-016 có cần hỗ trợ tính Thuế VAT hoặc Chiết khấu/Giảm giá không?
  - **A2**: **Giữ đơn giản theo tổng tiền các món ăn (Tổng tiền = Tổng các món), hoãn VAT và giảm giá sang giai đoạn nâng cao**:
    - Ở phạm vi Wave 3 hiện tại, tổng tiền thanh toán được tính đúng bằng tổng thành tiền của danh sách các món ăn đã gọi (`TotalAmount = sum(Quantity * UnitPrice)`).
    - Các tính năng nâng cao như áp thuế VAT (8% hoặc 10%), giảm giá theo voucher/thẻ thành viên hoặc phí dịch vụ sẽ được triển khai ở phân hệ Billing nâng cao tiếp theo để giữ RM-016 tinh gọn, chính xác và đúng tiến độ.
- **Q3: Quản lý Cấu hình Tài khoản Ngân hàng Thụ hưởng cho VietQR**: Thông tin tài khoản ngân hàng thụ hưởng cho mã VietQR nên được quản lý ở đâu?
  - **A3**: **Cấu hình tập trung tại môi trường frontend (`environment.ts`) kèm hằng số mặc định của nhà hàng**:
    - Thông tin gồm: Mã định danh ngân hàng (Bank BIN, ví dụ `970422` cho MBBank), Số tài khoản thụ hưởng, Tên chủ tài khoản (in hoa không dấu, ví dụ `NHA HANG TOOHUNGRY`).
    - Việc đặt trong `environment.ts` giúp dễ dàng thay đổi giữa môi trường Development, Staging và Production mà không cần can thiệp mã nguồn logic.
    - Mã VietQR động sinh theo chuẩn Napas 247: `https://api.vietqr.io/image/{bankId}-{accountNo}-compact2.jpg?amount={amount}&addInfo={memo}&accountName={accountName}` với cú pháp nội dung chuyển khoản `TOOHUNGRY <OrderNumber>`.
    - Áp dụng cơ chế **xác nhận thủ công** (Manual Confirmation) bởi nhân viên sau khi đối soát thông báo tài khoản.
- **Q4: Trải nghiệm Điều hướng sau khi Xác nhận Thanh toán Thành công**: Trải nghiệm điều hướng sau khi xác nhận thanh toán thành công nên diễn ra như thế nào?
  - **A4**: **Giữ tại trang ở chế độ Đã thanh toán (View Mode), làm nổi bật nút `[In hóa đơn]` và nút `[← Quay lại danh sách bàn]` để nhân viên chủ động xử lý**:
    - Sau khi thanh toán thành công, hệ thống hiển thị thông báo Toast thành công.
    - Giữ nhân viên ở lại màn hình thanh toán: Badge chuyển sang `ĐÃ THANH TOÁN (COMPLETED)`, form nhập tiền và nút xác nhận bị khóa/ẩn.
    - Hai nút tác vụ chính được làm nổi bật:
      1. Nút `[In hóa đơn]`: Để nhân viên bấm in phiếu thanh toán giấy K80 cho khách nếu khách yêu cầu.
      2. Nút `[← Quay lại danh sách bàn]`: Để nhân viên chủ động bấm quay về sơ đồ bàn `/waiter/tables` tiếp tục công việc hoặc dọn dẹp bàn đang hiện badge `CLEANING`.
    - Không tự động bật hộp thoại in hay tự động chuyển trang gây mất kiểm soát thao tác của nhân viên.
- **Q5: Bố cục Độc lập Toàn màn hình (Standalone Layout)**: Tuyến đường và cấu trúc giao diện?
  - **A5**: Tuyến đường chính `/payment/:orderId` (kèm route alias `/waiter/payment/:orderId` redirect về `/payment/:orderId`). Sử dụng Standalone layout (`eLayoutType.empty`) toàn màn hình, loại bỏ Topbar và Sidebar của Waiter, phân chia tỉ lệ 60% Hóa đơn : 40% Phương thức thanh toán.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Màn hình **Thanh toán đơn hàng (Payment Page - RM-016)** là chặng kết thúc trực tiếp trong hành trình phục vụ khách tại bàn (Dine-in Customer Journey) của nhà hàng Acme.TooHungry.

Sau khi khách kết thúc bữa ăn và yêu cầu thanh toán (hoặc khi nhân viên bấm `[Kết thúc bữa ăn]` trên sơ đồ bàn RM-008 / RM-010):
1. Hệ thống điều hướng thẳng đến `/payment/:orderId`.
2. Màn hình hiển thị độc lập, tối giản, toàn màn hình, tập trung 100% vào nghiệp vụ đối soát hóa đơn và thu tiền.
3. Cung cấp 2 phương thức thanh toán phổ biến nhất trong nhà hàng hiện đại: **Tiền mặt (Cash)** và **Chuyển khoản QR (VietQR Napas 247)**.
4. Thu ngân/Phục vụ xác nhận thanh toán qua API chuyên biệt `CompletePaymentAsync`: Đơn hàng chuyển sang `COMPLETED`, bàn tự động chuyển sang `CLEANING` để báo hiệu nhân viên phụ trách vệ sinh/dọn bàn sẵn sàng cho lượt khách tiếp theo, đồng thời kho tự động xuất trừ nguyên liệu theo FEFO.

### Sơ đồ Vị trí trong Chu kỳ Phục vụ Nhà hàng:
```text
[Khách ngồi ăn: Bàn OCCUPIED] 
       │
       ▼ (Khách dùng bữa xong / Bấm [Kết thúc bữa ăn])
[Điều hướng sang RM-016: /payment/:orderId]
       │
       ├─► Kiểm tra chi tiết Hóa đơn (60% màn hình)
       └─► Chọn Phương thức (40% màn hình): Tiền mặt / VietQR
               │
               ▼ (Bấm [Đã xác nhận thanh toán] -> Gọi CompletePaymentAsync)
       ┌────────────────────────────────────────────────────────┐
       │ 1. Order Status: COMPLETED                             │
       │ 2. Table Status: CLEANING (Realtime SignalR broadcast) │
       │ 3. Khấu trừ tồn kho FEFO (RM-011)                      │
       │ 4. Chuyển sang View Mode (Khóa form thanh toán)        │
       │ 5. Mở nút [In hóa đơn] nhiệt K80 và [Quay lại bàn]     │
       └────────────────────────────────────────────────────────┘
               │
               ▼ (Nhân viên bấm [Quay lại danh sách bàn])
[Quay về /waiter/tables: Bàn hiện badge CLEANING chờ dọn dẹp]
```

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Xem Chi tiết Hóa đơn Thanh toán Đơn hàng (Priority: P1)

Là một Nhân viên phục vụ hoặc Thu ngân, khi tôi truy cập màn hình thanh toán của một đơn hàng (`/payment/:orderId`), tôi muốn thấy bảng kê chi tiết toàn bộ các món ăn khách đã gọi, số lượng, đơn giá, thành tiền và tổng tiền thanh toán hiển thị rõ ràng ở cột bên trái (chiếm 60% giao diện), để tôi và khách hàng có thể đối soát minh bạch trước khi thu tiền.

**Lý do cho mức độ ưu tiên này**: Tính chính xác và minh bạch của hóa đơn là cốt lõi của giao dịch thương mại; nhân viên cần nhìn thấy toàn bộ chi tiết món gọi mà không bị che khuất.

**Kiểm thử Độc lập**: Mở đơn hàng có 3 món ăn tại `/payment/{orderId}`. Kiểm tra cột trái chiếm 60% chiều rộng, hiển thị đầy đủ: Mã đơn hàng, tên bàn, ngày giờ, danh sách 3 món với cột STT, Tên món, Số lượng, Đơn giá, Thành tiền; dòng Tổng tiền hiển thị số tiền thanh toán chuẩn xác bằng định dạng tiền tệ VNĐ.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở màn hình thanh toán `/payment/:orderId`, **Khi (When)** trang tải xong thông tin đơn hàng, **Thì (Then)** cột trái (60% độ rộng) hiển thị thẻ Hóa đơn (Order Invoice Card) với các thông tin:
   - Header hóa đơn: Tên nhà hàng "Acme.TooHungry", Mã đơn hàng (ví dụ `#ORD-20261012-001`), Tên bàn (ví dụ `Bàn 02`), Ngày giờ đặt đơn.
   - Bảng danh sách món ăn: Cột STT, Tên món ăn, Số lượng (`x{quantity}`), Đơn giá (`{unitPrice} đ`), Thành tiền (`{totalPrice} đ`).
   - Ghi chú đơn hàng (nếu khách/phục vụ có ghi chú món hoặc yêu cầu đặc biệt).
   - Tóm tắt thanh toán: Tạm tính, Tổng tiền thanh toán (Total Amount) định dạng to, rõ ràng, màu sắc nổi bật.
2. **Cho trước (Given)** đơn hàng có tổng tiền được tính toán, **Khi (When)** dữ liệu trả về từ backend có `totalAmount = 0` nhưng các `items` có số lượng và đơn giá, **Thì (Then)** giao diện tự động tính tổng tiền dự phòng (`sum(quantity * unitPrice)`) đảm bảo không bao giờ hiển thị hóa đơn 0 đồng sai lệch.
3. **Cho trước (Given)** nhân viên bấm nút `[← Quay lại danh sách bàn]`, **Khi (When)** click vào nút, **Thì (Then)** hệ thống điều hướng trực tiếp về trang sơ đồ bàn `/waiter/tables` mà không làm thay đổi trạng thái đơn hàng.

---

### User Story 2 - Thanh toán bằng Tiền mặt & Tính Tiền thối tự động (Priority: P1)

Là một Nhân viên phục vụ hoặc Thu ngân, khi khách hàng lựa chọn thanh toán bằng tiền mặt, tôi muốn chọn tab "Tiền mặt", bấm nhanh các nút gợi ý mệnh giá tiền khách đưa hoặc gõ số tiền cụ thể, để hệ thống tự động tính số tiền thừa cần trả lại khách, giúp thao tác thu tiền diễn ra nhanh chóng, chính xác và không sợ nhầm lẫn.

**Lý do cho mức độ ưu tiên này**: Tiền mặt vẫn là phương thức thanh toán phổ biến tại bàn; tính năng tính tiền thối tự động giúp nhân viên tránh sai sót số học trong giờ cao điểm.

**Kiểm thử Độc lập**: Chọn tab "Tiền mặt". Đơn hàng tổng tiền 320.000 đ. Bấm nút quick cash `[500.000 đ]`. Kiểm tra ô tiền khách đưa hiển thị 500.000 đ, ô tiền thối lại hiển thị 180.000 đ. Bấm nút `[Vừa đủ]`, kiểm tra tiền khách đưa thành 320.000 đ và tiền thối lại là 0 đ. Nhập 300.000 đ (nhỏ hơn 320.000 đ), kiểm tra xuất hiện cảnh báo "Số tiền khách đưa không đủ" và nút xác nhận bị vô hiệu hóa.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng đang ở tab "Tiền mặt" (Cash), **Khi (When)** bấm nút `[Vừa đủ]`, **Thì (Then)** trường "Tiền khách đưa" tự động điền bằng đúng `Tổng tiền thanh toán` và "Tiền thừa trả khách" hiển thị `0 đ`.
2. **Cho trước (Given)** người dùng bấm vào các nút mệnh giá nhanh (`[50k]`, `[100k]`, `[200k]`, `[500k]`, `[1.000k]`, `[2.000k]`), **Khi (When)** bấm chọn, **Thì (Then)** trường "Tiền khách đưa" cập nhật mệnh giá tương ứng và "Tiền thừa trả khách" tự động cập nhật bằng `Tiền khách đưa - Tổng tiền`.
3. **Cho trước (Given)** người dùng gõ số tiền khách đưa vào ô nhập liệu, **Khi (When)** số tiền đưa `< Tổng tiền`, **Thì (Then)** hệ thống hiển thị thông báo nhắc nhở màu đỏ "Khách đưa còn thiếu {thiếu} đ", và nút `[Đã xác nhận thanh toán]` chuyển sang trạng thái disabled (vô hiệu hóa).
4. **Cho trước (Given)** người dùng nhập số tiền khách đưa `>= Tổng tiền`, **Khi (When)** dữ liệu hợp lệ, **Thì (Then)** ô "Tiền thừa trả khách" hiển thị số tiền thừa nổi bật bằng màu xanh lá, và nút `[Đã xác nhận thanh toán]` sẵn sàng để kích hoạt.

---

### User Story 3 - Thanh toán bằng Quét mã VietQR Động (Priority: P1)

Là một Nhân viên phục vụ hoặc Khách hàng, khi khách muốn thanh toán qua ứng dụng ngân hàng di động (Mobile Banking), tôi muốn hiển thị mã VietQR động chứa chính xác số tài khoản ngân hàng nhà hàng, số tiền đơn hàng và nội dung chuyển khoản theo mã đơn, kèm tính năng sao chép thông tin nhanh, để khách chỉ cần quét mã là thanh toán được ngay mà không cần nhập tay thông tin chuyển khoản.

**Lý do cho mức độ ưu tiên này**: Chuyển khoản QR là xu hướng thanh toán chủ đạo tại Việt Nam; mã QR tự sinh kèm số tiền và nội dung giúp khách quét mã 1 giây là hoàn thành giao dịch mà không sai sót tài khoản hay số tiền.

**Kiểm thử Độc lập**: Chọn tab "Chuyển khoản QR". Kiểm tra ảnh mã VietQR hiển thị đầy đủ, sắc nét. Kiểm tra URL của ảnh mã QR chứa tham số số tiền đúng bằng tổng hóa đơn, nội dung chuyển khoản chứa `TOOHUNGRY {OrderNumber}`. Bấm nút sao chép "Số tài khoản" hoặc "Nội dung", kiểm tra clipboard nhận đúng chuỗi ký tự và hiển thị phản hồi "Đã chép" trong 2 giây.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên chọn tab "Chuyển khoản QR" (QR Payment), **Khi (When)** giao diện hiển thị, **Thì (Then)** hiển thị thẻ VietQR thanh toán gồm:
   - Khung hình mã QR chuẩn VietQR sinh từ URL cấu hình `environment.ts` với logo Napas 247.
   - Trạng thái loading mượt mà khi hình ảnh QR đang tải và tự động hiển thị hình khi tải xong.
   - Hướng dẫn trực quan: "Mở ứng dụng ngân hàng bất kỳ để quét mã thanh toán".
2. **Cho trước (Given)** thẻ VietQR hiển thị, **Khi (When)** quan sát khối thông tin tài khoản bên dưới, **Thì (Then)** hiển thị rõ ràng:
   - Ngân hàng thụ hưởng: Tên ngân hàng (ví dụ `MBBank / Ngân hàng Quân Đội`).
   - Chủ tài khoản: Tên nhà hàng (ví dụ `NHA HANG TOOHUNGRY`).
   - Số tài khoản thụ hưởng kèm nút `[Sao chép]`.
   - Số tiền cần chuyển kèm nút `[Sao chép]`.
   - Nội dung chuyển khoản chuẩn hóa `TOOHUNGRY <OrderNumber>` kèm nút `[Sao chép]`.
3. **Cho trước (Given)** người dùng bấm nút `[Sao chép]` tại bất kỳ trường thông tin nào, **Khi (When)** thao tác bấm, **Thì (Then)** dữ liệu được ghi vào Clipboard của hệ thống và nút đổi trạng thái thành icon check xanh lá kèm thông báo "Đã chép" trong 2 giây.
4. **Cho trước (Given)** phương thức QR áp dụng quy trình xác nhận thủ công, **Khi (When)** khách thông báo đã chuyển khoản thành công, **Thì (Then)** nhân viên/thu ngân đối soát tiền về tài khoản và bấm nút `[Đã xác nhận thanh toán]` để hệ thống ghi nhận.

---

### User Story 4 - Xác nhận Thanh toán qua API Chuyên biệt & Chuyển trạng thái Kép (Priority: P1)

Là một Nhân viên phục vụ hoặc Thu ngân có thẩm quyền, sau khi nhận đủ tiền mặt hoặc xác nhận tiền chuyển khoản đã vào tài khoản nhà hàng, tôi muốn bấm nút `[Đã xác nhận thanh toán]` và xác nhận hộp thoại để hệ thống gọi API `CompletePaymentAsync`, ghi nhận hoàn tất đơn hàng, tự động chuyển trạng thái bàn ăn sang `CLEANING` (Đang dọn dẹp), và tự động xuất trừ kho nguyên liệu theo thuật toán FEFO.

**Lý do cho mức độ ưu tiên này**: Đảm bảo luồng khép kín chu trình bàn ăn: Khách trả tiền xong -> Bàn chuyển sang dọn dẹp -> Nhân viên thấy bàn CLEANING trên sơ đồ bàn để vào dọn dẹp và reset về AVAILABLE. Đồng thời kho trừ đúng thực tế trong 1 transaction an toàn.

**Kiểm thử Độc lập**: Mở đơn hàng bàn 02 (đang `OCCUPIED`). Bấm `[Đã xác nhận thanh toán]`. Hộp thoại xác nhận hiển thị tóm tắt số tiền và mã đơn. Bấm xác nhận. Kiểm tra API `POST /api/app/order/{id}/complete-payment` cập nhật đơn hàng thành `Completed`. Kiểm tra trạng thái bàn 02 trong cơ sở dữ liệu chuyển thành `Cleaning`. Kiểm tra SignalR gửi thông báo trạng thái bàn thay đổi. Kiểm tra kho trừ nguyên liệu. Giao diện trang thanh toán chuyển sang badge `ĐÃ THANH TOÁN (COMPLETED)`, khóa form thanh toán, mở nút in hóa đơn và giữ nguyên tại trang cho đến khi bấm `[Quay lại danh sách bàn]`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** đơn hàng đang ở trạng thái `Pending` hoặc `Processing`, **Khi (When)** nhân viên bấm nút `[Đã xác nhận thanh toán]`, **Thì (Then)** hệ thống hiển thị hộp thoại xác nhận (Confirmation Dialog) với nội dung: "Xác nhận thanh toán cho đơn hàng {OrderNumber} với số tiền {TotalAmount} đ?".
2. **Cho trước (Given)** hộp thoại xác nhận đang hiển thị, **Khi (When)** nhân viên bấm nút `[Hủy / Cancel]`, **Thì (Then)** hộp thoại đóng lại và trạng thái đơn hàng không thay đổi.
3. **Cho trước (Given)** nhân viên bấm nút `[Đồng ý / Confirm]`, **Khi (When)** hệ thống gửi yêu cầu tới API `CompletePaymentAsync`, **Thì (Then)** backend thực hiện giao dịch nguyên tử:
   - Ghi nhận `PaymentMethod` (Tiền mặt hoặc VietQR), số tiền khách đưa và ghi chú thanh toán.
   - Trạng thái Order chuyển thành `Completed` (`OrderStatus.Completed`).
   - Bàn ăn tương ứng chuyển trạng thái thành `Cleaning` (`TableStatus.Cleaning`), đồng thời xóa thông tin khách đặt trước (nếu có).
   - Gửi thông báo SignalR `NotifyTableStatusChangedAsync` tới tất cả các client đang xem màn hình `/waiter/tables`.
   - Tính toán tiêu hao nguyên liệu của các món ăn theo công thức `Recipe` và trừ kho vật lý theo FEFO.
4. **Cho trước (Given)** thanh toán thành công, **Khi (When)** giao diện nhận kết quả từ API, **Thì (Then)**:
   - Hiển thị Toast thông báo thành công: "Thanh toán thành công! Đơn hàng đã hoàn tất, đã tự động tính tiêu hao và khấu trừ nguyên liệu theo FEFO."
   - Badge trạng thái ở Header chuyển thành `ĐÃ THANH TOÁN (COMPLETED)` màu xanh ngọc.
   - Vô hiệu hóa toàn bộ các nút điều chỉnh tiền hoặc chuyển đổi phương thức thanh toán (chuyển sang View Mode).
   - Nút `[In hóa đơn]` và nút `[← Quay lại danh sách bàn]` hiển thị nổi bật để nhân viên chủ động thao tác.
5. **Cho trước (Given)** một đơn hàng đã ở trạng thái `Completed`, **Khi (When)** bất kỳ ai truy cập lại vào URL `/payment/:orderId` của đơn hàng đó, **Thì (Then)** màn hình hiển thị ngay ở chế độ xem lại hóa đơn đã hoàn tất (View Mode), nút xác nhận thanh toán bị ẩn/khóa với thông báo "Đơn hàng này đã thanh toán hoàn tất!".

---

### User Story 5 - In Hóa đơn Thanh toán (Print Receipt) (Priority: P2)

Là một Nhân viên phục vụ hoặc Thu ngân, sau khi thanh toán hoặc khi khách yêu cầu hóa đơn giấy/phiếu thanh toán tạm thời, tôi muốn bấm nút `[In hóa đơn]` để mở giao diện in chuyên nghiệp của trình duyệt được định dạng chuẩn khổ giấy in nhiệt (K80 / 80mm) hoặc A5, giúp in ra phiếu thanh toán rõ ràng, đẹp mắt cho khách hàng lưu giữ.

**Lý do cho mức độ ưu tiên này**: Khách hàng nhà hàng thường xuyên cần phiếu thanh toán hoặc hóa đơn tạm tính để đối soát tiền mặt hoặc làm thủ tục thanh toán công ty.

**Kiểm thử Độc lập**: Bấm nút `[In hóa đơn]` trên giao diện. Trình duyệt kích hoạt hộp thoại in `window.print()`. Kiểm tra CSS `@media print` ẩn các nút bấm, ẩn cột phương thức thanh toán, ẩn header quay lại; chỉ in phần Hóa đơn (Order Invoice) với bố cục gọn gàng, độ tương phản cao, tối ưu cho khổ giấy in nhiệt 80mm.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở màn hình thanh toán, **Khi (When)** bấm nút `[In hóa đơn]`, **Thì (Then)** hệ thống gọi hàm in trình duyệt (`window.print()`).
2. **Cho trước (Given)** giao diện chuẩn bị in (`@media print`), **Khi (When)** chế độ in được kích hoạt, **Thì (Then)** CSS in ấn tự động:
   - Ẩn toàn bộ nút bấm: Nút quay lại bàn, nút in hóa đơn, nút sao chép, nút xác nhận thanh toán.
   - Ẩn toàn bộ Cột phương thức thanh toán bên phải (ẩn mã QR, form tiền mặt).
   - Cột hóa đơn mở rộng 100% khổ in, căn giữa, nền trắng, chữ đen sắc nét.
   - Hiển thị đầy đủ logo/tên nhà hàng, địa chỉ, hotline, mã đơn hàng, tên bàn, ngày giờ, bảng chi tiết món ăn, tổng tiền và lời cảm ơn "Cảm ơn quý khách & Hẹn gặp lại!".

---

### User Story 6 - Phân quyền Thao tác Thanh toán (Payment Permission & Role Guard) (Priority: P2)

Là Quản trị viên hệ thống, tôi muốn đảm bảo chỉ các nhân viên có vai trò phù hợp (`Waiter`, `Cashier`, `Manager`, `Administrator`) hoặc sở hữu quyền thao tác đơn hàng (`TooHungry.Orders` / `TooHungry.Payments`) mới có thể truy cập màn hình thanh toán và bấm xác nhận thanh toán, ngăn ngừa việc nhân viên khác (ví dụ nhân viên kho `InventoryStaff`) can thiệp vào dòng tiền nhà hàng.

**Lý do cho mức độ ưu tiên này**: Bảo đảm an ninh tài chính của nhà hàng, ngăn chặn thao tác sai lệch từ nhân viên không có nhiệm vụ thu ngân.

**Kiểm thử Độc lập**: Đăng nhập tài khoản `InventoryStaff` truy cập `/payment/{orderId}` -> Bị chặn và chuyển hướng kèm cảnh báo 403 Forbidden. Đăng nhập tài khoản `Waiter` hoặc `Cashier` -> Truy cập và thanh toán bình thường.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng chưa đăng nhập hoặc đăng nhập bằng vai trò không có quyền thanh toán, **Khi (When)** cố gắng truy cập `/payment/:orderId`, **Thì (Then)** guard tuyến đường chặn truy cập và chuyển hướng về màn hình phù hợp kèm thông báo từ chối.
2. **Cho trước (Given)** người dùng đăng nhập có vai trò `Waiter`, `Cashier`, `Manager`, hoặc `Administrator`, **Khi (When)** truy cập `/payment/:orderId`, **Thì (Then)** guard cho phép truy cập đầy đủ các chức năng thanh toán.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Mã đơn hàng không tồn tại hoặc bị xóa (404 Order Not Found)**: Khi truy cập vào một `orderId` không có trong hệ thống, màn hình hiển thị thông báo lỗi "Không tìm thấy mã đơn hàng cần thanh toán!", tự động điều hướng người dùng quay lại `/waiter/tables` sau 1.5 giây.
- **EC-002: Đơn hàng đã thanh toán từ trước (Double Payment Prevention)**: Nếu một nhân viên khác hoặc thu ngân đã bấm thanh toán đơn hàng này trên máy tính khác, khi người thứ hai bấm xác nhận, API `CompletePaymentAsync` ném lỗi nghiệp vụ (`BusinessException`), từ chối giao dịch trùng lặp và cập nhật trạng thái hiển thị của giao diện sang `ĐÃ THANH TOÁN (COMPLETED)`.
- **EC-003: Đơn hàng đã bị hủy (Cancelled Order)**: Nếu đơn hàng ở trạng thái `Cancelled`, giao diện hiển thị cảnh báo "Đơn hàng này đã bị hủy, không thể tiến hành thanh toán!", khóa toàn bộ thao tác thu tiền và chỉ cho phép bấm quay lại danh sách bàn.
- **EC-004: Đơn hàng không có món ăn hoặc tổng tiền bằng 0 (Empty Items / Zero Total)**: Nếu đơn hàng chưa có món ăn nào được chọn, hệ thống hiển thị cảnh báo "Đơn hàng chưa có món ăn để thanh toán", vô hiệu hóa nút xác nhận thanh toán và khuyến khích quay lại màn hình gọi món `/waiter/order/:tableId`.
- **EC-005: Khách đổi ý phương thức thanh toán giữa chừng**: Người dùng có thể chuyển đổi tự do qua lại giữa 2 tab "Tiền mặt" và "Chuyển khoản QR" bất cứ lúc nào trước khi bấm nút xác nhận thanh toán mà không làm mất thông tin đơn hàng hay gây lỗi hiển thị.
- **EC-006: Mất kết nối mạng trong lúc bấm xác nhận thanh toán**: Nếu kết nối mạng gián đoạn đúng lúc bấm xác nhận, nút thanh toán khôi phục trạng thái sẵn sàng (bỏ cờ loading), hiển thị Toast thông báo lỗi mạng để nhân viên kiểm tra lại trước khi thực hiện bấm xác nhận lần tiếp theo, tránh tạo giao dịch treo.

---

## 4. Yêu cầu Hệ thống (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cung cấp tuyến đường độc lập `/payment/:orderId` dành riêng cho màn hình Thanh toán đơn hàng.
- **FR-002**: Hệ thống PHẢI cấu hình tuyến đường alias `/waiter/payment/:orderId` tự động chuyển tiếp (redirect) về `/payment/:orderId` để đảm bảo tính tương thích với các liên kết từ sơ đồ bàn RM-008 và POS RM-010.
- **FR-003**: Tuyến đường `/payment/:orderId` PHẢI sử dụng chế độ Standalone Layout (`eLayoutType.empty`), ẩn hoàn toàn Topbar và Sidebar của `WaiterLayoutComponent` cũng như menu quản trị của hệ thống.
- **FR-004**: Màn hình thanh toán PHẢI có thanh tiêu đề đầu trang (Header Bar) hiển thị:
  - Nút `[← Quay lại danh sách bàn]` điều hướng về `/waiter/tables`.
  - Tiêu đề màn hình "Thanh toán đơn hàng" kèm icon hóa đơn.
  - Thông tin tóm tắt: Mã đơn hàng (`OrderNumber`), Tên bàn (`TableName`), Ngày giờ lập hóa đơn (`OrderDate`).
  - Huy hiệu trạng thái đơn hàng (Order Status Badge): `CHỜ THANH TOÁN (PENDING)` hoặc `ĐÃ THANH TOÁN (COMPLETED)` hoặc `ĐÃ HỦY (CANCELLED)`.
- **FR-005**: Màn hình thanh toán PHẢI được chia theo tỉ lệ bố cục 2 cột chuẩn mực: Cột trái (60% chiều rộng) cho Hóa đơn đơn hàng và Cột phải (40% chiều rộng) cho Phương thức thanh toán (trên màn hình máy tính bảng/desktop).
- **FR-006**: Cột Hóa đơn đơn hàng (60%) PHẢI hiển thị bảng danh sách các món ăn đã gọi gồm: Số thứ tự, Tên món ăn, Số lượng, Đơn giá, Thành tiền; cùng ghi chú đơn hàng và dòng Tổng tiền thanh toán định dạng tiền tệ VNĐ rõ nét (`TotalAmount = sum(Quantity * UnitPrice)`).
- **FR-007**: Cột Phương thức thanh toán (40%) PHẢI cung cấp 2 tab phương thức thanh toán: `Tiền mặt` (Cash) và `Chuyển khoản QR` (QR Payment).
- **FR-008**: Khi chọn phương thức `Tiền mặt`, hệ thống PHẢI cung cấp:
  - Các nút gợi ý mệnh giá tiền nhanh: `[Vừa đủ]`, `[50.000 đ]`, `[100.000 đ]`, `[200.000 đ]`, `[500.000 đ]`, `[1.000.000 đ]`, `[2.000.000 đ]`.
  - Ô nhập số tiền khách đưa với định dạng số phân cách hàng nghìn.
  - Ô hiển thị số tiền thừa cần trả khách (`Tiền thừa = Tiền khách đưa - Tổng tiền`).
  - Cảnh báo và vô hiệu hóa nút thanh toán nếu tiền khách đưa nhỏ hơn tổng tiền phải trả.
- **FR-009**: Khi chọn phương thức `Chuyển khoản QR`, hệ thống PHẢI đọc thông tin ngân hàng thụ hưởng từ cấu hình môi trường frontend (`environment.vietQrConfig`):
  - Mã định danh ngân hàng / BIN, Số tài khoản, Tên chủ tài khoản nhà hàng.
  - Số tiền thanh toán khớp chính xác với tổng hóa đơn.
  - Nội dung chuyển khoản cú pháp chuẩn hóa: `TOOHUNGRY <OrderNumber>`.
  - Cung cấp các nút sao chép (Copy) 1 chạm kèm phản hồi thị giác (Visual feedback) cho: Số tài khoản, Số tiền, và Nội dung chuyển khoản.
- **FR-010**: Phương thức Chuyển khoản QR PHẢI áp dụng quy trình xác nhận thủ công (Manual Confirmation); nhân viên kiểm tra biến động số dư và bấm nút `[Đã xác nhận thanh toán]` để hệ thống ghi nhận.
- **FR-011**: Nút `[Đã xác nhận thanh toán]` PHẢI hiển thị hộp thoại xác nhận (Confirmation Modal) yêu cầu nhân viên tái xác nhận trước khi thực thi giao dịch.
- **FR-012**: Backend PHẢI cung cấp API chuyên biệt `CompletePaymentAsync` trên `IOrderAppService` (endpoint `POST /api/app/order/{id}/complete-payment`):
  - Nhận vào DTO `CompletePaymentInputDto` (`PaymentMethod`, `CashGiven`, `PaymentNote`).
  - Cập nhật trạng thái đơn hàng sang `OrderStatus.Completed`.
  - Tự động cập nhật trạng thái bàn ăn sang `TableStatus.Cleaning` (Dọn dẹp).
  - Tự động xóa thông tin khách đặt trước (Reserved info) trên bàn ăn nếu có.
  - Phát sự kiện Realtime SignalR (`NotifyTableStatusChangedAsync`) để cập nhật tức thì sơ đồ bàn tại `/waiter/tables`.
  - Tự động tính toán lượng tiêu hao nguyên liệu theo công thức `Recipe` của các món và xuất trừ tồn kho vật lý theo thuật toán FEFO (RM-011).
- **FR-013**: Sau khi thanh toán thành công, giao diện PHẢI chuyển sang trạng thái đã hoàn tất (View Mode):
  - Badge chuyển sang `ĐÃ THANH TOÁN (COMPLETED)`.
  - Khóa toàn bộ form thu tiền và nút xác nhận thanh toán.
  - Hiển thị thông báo Toast thành công.
  - Giữ nguyên người dùng tại màn hình thanh toán, làm nổi bật nút `[In hóa đơn]` và nút `[← Quay lại danh sách bàn]` để người dùng chủ động thao tác.
- **FR-014**: Hệ thống PHẢI cung cấp nút `[In hóa đơn]` cho phép kích hoạt chức năng in hóa đơn của trình duyệt (`window.print()`).
- **FR-015**: Hệ thống PHẢI cung cấp định dạng in ấn chuyên dụng (`@media print`) tối ưu cho khổ in nhiệt 80mm (K80) và giấy in tiêu chuẩn: Ẩn các nút điều hướng/tác vụ, ẩn cột phương thức thanh toán, căn chỉnh bảng hóa đơn đẹp mắt, rõ ràng.
- **FR-016**: Tuyến đường `/payment/:orderId` PHẢI được bảo vệ bằng guard xác thực và phân quyền, chỉ cho phép người dùng có vai trò `Waiter`, `Cashier`, `Manager`, hoặc `Administrator` truy cập.
- **FR-017**: Toàn bộ chuỗi văn bản giao diện trên trang thanh toán PHẢI hỗ trợ song ngữ Tiếng Việt và Tiếng Anh trong cả 2 tệp `vi.json` và `en.json`.
- **FR-018**: Trên màn hình di động/tablet có chiều rộng `< 992px`, bố cục PHẢI tự động chuyển đổi sang dạng 1 cột cuộn mượt mà (Hóa đơn ở trên, Khối phương thức thanh toán ở dưới) mà không làm vỡ các trường nhập liệu hay mã QR.

---

### Yêu cầu Phi chức năng & Hiệu năng (Non-Functional Requirements)

- **NFR-001 (Thời gian tải hóa đơn)**: Toàn bộ thông tin đơn hàng và mã VietQR phải được hiển thị đầy đủ trong vòng dưới 300 mili-giây kể từ khi truy cập đường dẫn.
- **NFR-002 (Thời gian xử lý thanh toán)**: Quá trình gọi `CompletePaymentAsync`, cập nhật trạng thái đơn hàng, bàn ăn và xuất trừ kho FEFO phải hoàn tất trong vòng dưới 1 giây.
- **NFR-003 (Độ nhạy Cảm ứng - Touch Friendliness)**: Tất cả các nút bấm chọn mệnh giá, nút sao chép và nút xác nhận thanh toán phải có kích thước tối thiểu 44 × 44 pixel để thao tác chạm bằng ngón tay không bị trượt trên màn hình cảm ứng hoặc iPad.
- **NFR-004 (Độ tin cậy Dữ liệu & Chống thanh toán đúp)**: Hệ thống phải có cơ chế ngăn chặn bấm xác nhận liên tiếp (Double-click / Debounce), vô hiệu hóa nút bấm ngay khi bắt đầu tiến trình gửi yêu cầu thanh toán (`isProcessingPayment = true`).
- **NFR-005 (Chất lượng Định dạng In ấn)**: Bản in sinh ra từ `window.print()` phải sắc nét, không bị nhòe mã đơn, không bị ngắt dòng bất hợp lý ở bảng chi tiết món ăn, tương thích tốt với các dòng máy in nhiệt POS K80 phổ biến.
- **NFR-006 (Bảng màu Thương hiệu)**: Tuân thủ bảng màu nhận diện chuẩn của Acme.TooHungry: Màu chủ đạo Cam `#EA580C`, Trắng nền sạch sẽ `#FFFFFF`, và Slate Gray thanh lịch.

---

## 5. Các Thực thể & Giao diện Chính (Key Entities & Interfaces)

### 1. Enum Phương thức Thanh toán (PaymentMethod)
```csharp
// Acme.TooHungry.Orders.PaymentMethod
namespace Acme.TooHungry.Orders;

public enum PaymentMethod
{
    Cash = 1,     // Tiền mặt
    VietQr = 2    // Chuyển khoản QR (VietQR Napas 247)
}
```

### 2. DTO Nghiệp vụ Thanh toán (Payment DTOs)
```csharp
// Acme.TooHungry.Orders.CompletePaymentInputDto
namespace Acme.TooHungry.Orders;

public class CompletePaymentInputDto
{
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public decimal CashGiven { get; set; }
    public string? PaymentNote { get; set; }
}
```

### 3. API Hợp đồng Nghiệp vụ Thanh toán (Backend Application Contract)
```csharp
// Acme.TooHungry.Orders.IOrderAppService
public interface IOrderAppService : IApplicationService
{
    Task<OrderDto> GetAsync(Guid id);
    Task<OrderDto> CompletePaymentAsync(Guid id, CompletePaymentInputDto input);
}
```

### 4. Cấu hình VietQR trên Frontend (Angular Environment)
```typescript
// angular/src/environments/environment.ts
export const environment = {
  // ...
  vietQrConfig: {
    bankId: '970422', // MBBank
    bankName: 'MBBank',
    accountNo: '9999888866',
    accountName: 'NHA HANG TOOHUNGRY',
    template: 'compact2',
  }
};
```

### 5. Giao diện Dữ liệu Frontend (Angular Payment Component Models)
```typescript
export interface PaymentState {
  orderId: string;
  order: OrderDto | null;
  paymentMethod: 'qr' | 'cash';
  cashGiven: number | null;
  isProcessingPayment: boolean;
  copiedField: string | null;
}

export interface QuickCashOption {
  label: string;
  amount: number;
}
```

---

## 6. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% người dùng khi kết thúc bữa ăn tại `/waiter/tables` bấm chuyển sang thanh toán được điều hướng tức thì tới `/payment/:orderId` với bố cục Standalone Layout toàn màn hình không có Sidebar/Topbar thừa.
- **SC-002**: Bố cục 2 cột (60% Hóa đơn : 40% Thanh toán) hiển thị chuẩn xác, không bị méo mó hay tràn giao diện trên các độ phân giải màn hình từ 992px trở lên.
- **SC-003**: Mã VietQR tự động sinh ra hiển thị chính xác số tiền của hóa đơn và nội dung chuyển khoản `TOOHUNGRY <OrderNumber>`, quét thành công trên các ứng dụng ngân hàng thông dụng tại Việt Nam.
- **SC-004**: Tab tiền mặt tự động tính tiền thừa chuẩn xác 100% trong mọi trường hợp nhập mệnh giá tiền khách đưa.
- **SC-005**: 100% các lần gọi API `CompletePaymentAsync` thành công kích hoạt đồng thời 3 hiệu ứng: (1) Đơn hàng chuyển sang `COMPLETED`, (2) Bàn ăn chuyển sang `CLEANING` kèm thông báo realtime SignalR, (3) Kho vật lý được khấu trừ theo FEFO.
- **SC-006**: Sau khi thanh toán, màn hình giữ nguyên ở chế độ xem lại (View Mode), nút `[In hóa đơn]` và nút `[← Quay lại danh sách bàn]` hiển thị sẵn sàng cho nhân viên chủ động xử lý.
- **SC-007**: Tính năng In hóa đơn (`window.print()`) in đúng bảng kê món ăn, ẩn sạch sẽ các nút điều hướng và form thu tiền, vừa vặn khổ giấy in nhiệt K80.
- **SC-008**: 100% các từ ngữ hiển thị trên trang thanh toán được dịch chuẩn xác cả hai ngôn ngữ Tiếng Việt và Tiếng Anh trong `vi.json` và `en.json`.

---

## 7. Các Giả định & Ràng buộc (Assumptions & Constraints)

### Giả định (Assumptions):
- Thu ngân hoặc Nhân viên phục vụ đứng tại quầy hoặc tại bàn để xác nhận thông tin thanh toán với khách hàng.
- Tài khoản ngân hàng của nhà hàng đã được cấu hình sẵn theo định dạng Napas 247 để sinh mã VietQR.
- Cơ chế xác nhận thanh toán chuyển khoản hiện tại là **xác nhận thủ công** bởi nhân viên sau khi kiểm tra thông báo tài khoản nhà hàng, chưa tích hợp webhook ngân hàng tự động.
- Trạng thái `CLEANING` của bàn ăn là bước đệm cần thiết trước khi nhân viên phục vụ hoàn tất việc dọn dẹp và trả bàn về trạng thái `AVAILABLE` (RM-008).

### Ràng buộc (Constraints):
- Mọi chuỗi văn bản UI bắt buộc phải có đầy đủ bản dịch trong `en.json` và `vi.json`.
- Màn hình thanh toán bắt buộc phải dùng Standalone Layout (`eLayoutType.empty`), không được hiển thị lồng ghép bên trong `WaiterLayoutComponent`.
- Phân quyền thao tác thanh toán chặt chẽ cho các vai trò `Waiter`, `Cashier`, `Manager`, và `Administrator`.
