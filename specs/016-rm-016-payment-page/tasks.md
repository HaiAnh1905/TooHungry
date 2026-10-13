# Danh sách Công việc Triển khai (Tasks): RM-016 Thanh toán đơn hàng (Payment Page)

**Tính năng**: `RM-016 — Thanh toán đơn hàng (Payment Page)`  
**Nhánh (Branch)**: `016-rm-016-payment-page` | **Ngày**: 2026-10-12  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md)

---

## Phase 1: Nền tảng Dùng chung & Hợp đồng Backend (Setup & Backend Contracts)

**Mục tiêu**: Chuẩn bị các Enums, DTOs, hợp đồng API và cấu hình môi trường VietQR làm nền tảng cho phân hệ thanh toán.

- [x] T001 [P] Khởi tạo enum `PaymentMethod` (`Cash = 1`, `VietQr = 2`) trong `src/Acme.TooHungry.Domain.Shared/Orders/PaymentMethod.cs`
- [x] T002 [P] Khởi tạo DTO `CompletePaymentInputDto` (`PaymentMethod`, `CashGiven`, `PaymentNote`) trong `src/Acme.TooHungry.Application.Contracts/Orders/CompletePaymentInputDto.cs`
- [x] T003 [P] Bổ sung phương thức `Task<OrderDto> CompletePaymentAsync(Guid id, CompletePaymentInputDto input)` vào `src/Acme.TooHungry.Application.Contracts/Orders/IOrderAppService.cs`
- [x] T004 [P] Cấu hình thông tin tài khoản ngân hàng thụ hưởng `vietQrConfig` (`bankId`, `bankName`, `accountNo`, `accountName`, `template`) trong `angular/src/environments/environment.ts` và `environment.prod.ts`

**Trạm kiểm tra (Checkpoint)**: Toàn bộ hợp đồng dữ liệu backend và cấu hình ngân hàng VietQR đã sẵn sàng để triển khai tầng Application và Frontend.

---

## Phase 2: User Story 4 (Core) - Triển khai API Backend `CompletePaymentAsync` & Giao dịch Nguyên tử (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Xây dựng API chuyên biệt ghi nhận thanh toán an toàn, đồng bộ cập nhật Order `Completed`, Table `Cleaning`, trừ kho nguyên liệu theo FEFO và phát sóng realtime SignalR.  
**Kiểm thử Độc lập**: Gửi yêu cầu `POST /api/app/order/{id}/complete-payment` $\rightarrow$ Order chuyển sang `Completed`, Bàn chuyển sang `Cleaning`, SignalR phát sự kiện và kho được khấu trừ.

- [x] T005 [US4] Triển khai phương thức `CompletePaymentAsync` trong `src/Acme.TooHungry.Application/Orders/OrderAppService.cs`:
  - Kiểm tra đơn hàng tồn tại và trạng thái khác `Completed` / `Cancelled`
  - Cập nhật trạng thái `order.Status = OrderStatus.Completed`
  - Tự động gọi `ProcessOrderInventoryConsumptionAsync(order)` để trừ kho nguyên liệu FEFO
  - Tự động cập nhật bàn ăn `table.Status = TableStatus.Cleaning`, xóa dữ liệu khách đặt cũ (`Reserved*`), lưu DB
  - Phát sự kiện Realtime SignalR: `_realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name)`
  - Trả về `OrderDto` đã hoàn tất
- [x] T006 [US4] Phơi bày endpoint HTTP trong `src/Acme.TooHungry.HttpApi/Controllers/OrderController.cs`:
  - Thêm action `POST /api/app/order/{id}/complete-payment` gọi `_orderAppService.CompletePaymentAsync(id, input)`
  - Đảm bảo kiểm soát phân quyền với `[Authorize(TooHungryPermissions.Orders.Default)]`
- [x] T007 [US4] Cập nhật Angular Proxies trong `angular/src/app/proxy/orders/`:
  - Thêm `PaymentMethod` enum và `CompletePaymentInputDto` trong `models.ts`
  - Bổ sung phương thức `completePayment(id: string, input: CompletePaymentInputDto)` vào `order.service.ts`

**Trạm kiểm tra (Checkpoint)**: API backend hoàn tất thanh toán đã hoạt động và kiểm thử được độc lập qua Postman/Swagger hoặc Unit Test.

---

## Phase 3: User Story 1 - Xem Chi tiết Hóa đơn & Bố cục Standalone 60/40 (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Chuẩn hóa màn hình thanh toán toàn màn hình (Standalone Layout), chia tỉ lệ 60% Hóa đơn : 40% Thu tiền, hiển thị chi tiết toàn bộ các món ăn và tổng tiền chính xác.  
**Kiểm thử Độc lập**: Truy cập `/payment/{orderId}` $\rightarrow$ kiểm tra không có Sidebar/Topbar Waiter; Cột trái 60% hiển thị danh sách món, số lượng, đơn giá, thành tiền và tổng tiền.

- [x] T008 [US1] Tinh chỉnh cấu trúc giao diện bố cục 2 cột (60% Hóa đơn : 40% Thanh toán) trong `angular/src/app/payment/payment.component.html` và `.scss`:
  - Đảm bảo tỉ lệ 60% : 40% trên màn hình desktop/tablet landscape (>= 992px)
  - Tự động chuyển về dạng 1 cột cuộn mượt mà trên thiết bị màn hình nhỏ (< 992px)
  - Header Bar hiển thị: Nút quay lại bàn, Tiêu đề trang, Mã đơn hàng, Tên bàn, Ngày giờ và Badge trạng thái
- [x] T009 [US1] Hoàn thiện bảng chi tiết món ăn trong thẻ Hóa đơn (Cột trái 60%):
  - Hiển thị danh sách món với đầy đủ cột: STT, Tên món, Số lượng (`x{quantity}`), Đơn giá (`{unitPrice} đ`), Thành tiền (`{totalPrice} đ`)
  - Hiển thị Ghi chú đơn hàng (nếu có)
  - Khối tổng kết thanh toán hiển thị Tổng tiền to rõ, định dạng tiền tệ VNĐ
  - Thuật toán tự động tính tổng tiền dự phòng (`sum(quantity * unitPrice)`) nếu backend trả về `totalAmount = 0`
- [x] T010 [US1] Chuẩn hóa nút điều hướng `[← Quay lại danh sách bàn]`:
  - Cập nhật hàm `onBackToTables()` trong `payment.component.ts` điều hướng chính xác về `/waiter/tables`
  - Đảm bảo vùng chạm touch target >= 44×44px

**Trạm kiểm tra (Checkpoint)**: Giao diện hóa đơn 60% hiển thị đầy đủ, chính xác, không bị che khuất và nút quay lại bàn hoạt động trơn tru.

---

## Phase 4: User Story 2 - Thanh toán Tiền mặt & Tính Tiền thối tự động (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Cung cấp hàng nút mệnh giá nhanh (Quick Cash Presets), ô nhập tiền khách đưa và tính toán tiền thối tức thì bằng Angular Signals.  
**Kiểm thử Độc lập**: Chọn tab Tiền mặt $\rightarrow$ bấm nút `[500k]` $\rightarrow$ tiền khách đưa 500k, tiền thừa tự động tính đúng; nhập tiền thiếu $\rightarrow$ cảnh báo đỏ xuất hiện và nút xác nhận bị vô hiệu hóa.

- [x] T011 [US2] Triển khai giao diện Tab Tiền mặt trong `payment.component.html`:
  - Hàng nút mệnh giá nhanh: `[Vừa đủ]`, `[50k]`, `[100k]`, `[200k]`, `[500k]`, `[1.000k]`, `[2.000k]`
  - Ô nhập số tiền khách đưa với định dạng phân cách hàng nghìn
  - Ô hiển thị số tiền thừa cần trả khách với màu xanh ngọc nổi bật
  - Cảnh báo trực quan màu đỏ khi tiền khách đưa nhỏ hơn tổng tiền phải trả
- [x] T012 [US2] Triển khai logic tính tiền thừa và kiểm tra hợp lệ trong `payment.component.ts`:
  - Sử dụng computed signal `changeAmount = computed(() => Math.max(0, (cashGiven() || 0) - effectiveTotalAmount()))`
  - Hàm `setQuickCash(amount)` và `setExactCash()`
  - Ràng buộc chặn thanh toán khi `(cashGiven() || 0) < effectiveTotalAmount()` và phương thức là `cash`

**Trạm kiểm tra (Checkpoint)**: Tính năng thanh toán tiền mặt và tính tiền thối hoạt động chuẩn xác 100%, bảo vệ an toàn chống thu thiếu tiền.

---

## Phase 5: User Story 3 - Thanh toán Quét mã VietQR Động (Priority: P1) 🎯 MVP Core

**Mục tiêu**: Tích hợp mã VietQR Napas 247 động sinh theo tổng tiền và cú pháp `TOOHUNGRY <OrderNumber>`, kèm các nút sao chép 1 chạm có hiệu ứng phản hồi tức thì.  
**Kiểm thử Độc lập**: Chọn tab Chuyển khoản QR $\rightarrow$ mã QR hiển thị đúng tổng tiền; bấm sao chép số tài khoản hoặc nội dung $\rightarrow$ dữ liệu vào clipboard và hiển thị "Đã sao chép".

- [x] T013 [US3] Cập nhật computed signal `vietQrUrl` trong `payment.component.ts`:
  - Đọc cấu hình ngân hàng từ `environment.vietQrConfig`
  - Sinh URL theo mẫu: `https://api.vietqr.io/image/{bankId}-{accountNo}-{template}.jpg?amount={amount}&addInfo={memo}&accountName={accountName}`
  - Nội dung chuyển khoản cú pháp chuẩn hóa: `TOOHUNGRY {orderNumber}`
- [x] T014 [US3] Hoàn thiện giao diện Tab Chuyển khoản QR trong `payment.component.html`:
  - Thẻ hiển thị mã QR có hiệu ứng loading khi ảnh đang tải
  - Khối thông tin ngân hàng thụ hưởng hiển thị: Tên ngân hàng, Số tài khoản, Tên tài khoản, Số tiền, và Nội dung chuyển khoản
  - Các nút `[Sao chép]` với icon copy/check xanh lá và phản hồi tức thì trong 2 giây qua hàm `copyToClipboard(text, field)`

**Trạm kiểm tra (Checkpoint)**: Khách hàng có thể quét mã VietQR mượt mà trên mọi ứng dụng ngân hàng và nhân viên có thể sao chép thông tin nhanh.

---

## Phase 6: User Story 4 & 5 - Hoàn thiện Xác nhận Thanh toán, View Mode & In Hóa đơn K80 (Priority: P1 / P2)

**Mục tiêu**: Khép kín luồng xác nhận thanh toán qua API `CompletePaymentAsync`, chuyển giao diện sang chế độ xem lại (View Mode), và cung cấp định dạng in hóa đơn nhiệt K80 chuyên nghiệp.  
**Kiểm thử Độc lập**: Bấm `[Đã xác nhận thanh toán]` $\rightarrow$ xác nhận hộp thoại $\rightarrow$ Toast thành công, badge COMPLETED, form khóa; bấm `[In hóa đơn]` $\rightarrow$ bản in hiển thị sạch sẽ đúng khổ giấy in nhiệt K80.

- [x] T015 [US4] Cập nhật luồng xác nhận thanh toán trong `payment.component.ts`:
  - Hàm `onConfirmPayment()` hiển thị hộp thoại xác nhận `confirmation.info()` với nội dung chi tiết
  - Hàm `executePayment()` chuẩn bị DTO `CompletePaymentInputDto` (`paymentMethod`, `cashGiven`, `paymentNote`)
  - Gọi `orderService.completePayment(order.id, input)` thay thế cho việc gọi `update`
  - Xử lý debounce: bật cờ `isProcessingPayment = true` khi đang gửi yêu cầu và tắt khi hoàn tất
  - Hiển thị Toast thông báo thành công: "Thanh toán thành công! Đơn hàng đã hoàn tất, bàn đã chuyển sang dọn dẹp và kho đã được khấu trừ theo FEFO."
- [x] T016 [US4] Triển khai chế độ xem lại (View Mode) sau khi đơn hàng ở trạng thái `Completed`:
  - Huy hiệu góc phải Header đổi sang `ĐÃ THANH TOÁN (COMPLETED)` màu xanh ngọc
  - Vô hiệu hóa toàn bộ các nút điều chỉnh tiền hoặc chuyển đổi phương thức thanh toán
  - Nút `[In hóa đơn]` và nút `[← Quay lại danh sách bàn]` được làm nổi bật với độ tương phản cao
- [x] T017 [US5] Chuẩn hóa CSS in ấn `@media print` trong `payment.component.scss`:
  - Đặt khổ in `@page { size: 80mm auto; margin: 4mm; }`
  - Ẩn toàn bộ nút bấm, thanh header điều hướng và cột phương thức thanh toán bên phải
  - Cột hóa đơn mở rộng 100% khổ in, căn giữa, sắc nét, tương phản đen trắng
  - Bổ sung chân hóa đơn in nhiệt: Tên nhà hàng, hotline, địa chỉ và lời cảm ơn "Cảm ơn quý khách & Hẹn gặp lại!"

**Trạm kiểm tra (Checkpoint)**: Luồng thanh toán hoàn tất khép kín, chế độ xem lại rõ ràng và bản in hóa đơn đạt chuẩn in nhiệt K80.

---

## Phase 7: Quốc tế hóa Song ngữ & Kiểm thử Tích hợp (Polish & Verification)

**Mục tiêu**: Đảm bảo 100% các chuỗi văn bản giao diện hiển thị chuẩn xác cả hai ngôn ngữ Tiếng Việt và Tiếng Anh trong cả backend và frontend, xác thực không có lỗi biên dịch.

- [x] T018 [P] Bổ sung đầy đủ các khóa từ điển thanh toán vào `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json` và `en.json`
- [x] T019 [P] Bổ sung và đồng bộ các khóa từ điển thanh toán vào `angular/src/assets/i18n/vi.json` và `en.json`
- [x] T020 [P] Rà soát và kiểm tra toàn bộ nhãn hiển thị trong `payment.component.html` đảm bảo dùng pipe `abpLocalization` chuẩn hóa
- [x] T021 [P] Kiểm tra biên dịch Backend (`dotnet build`) và Frontend (`npm run build` / Angular build) đảm bảo 0 lỗi cảnh báo cú pháp
- [x] T022 [P] Xác thực 4 kịch bản kiểm thử E2E theo [quickstart.md](quickstart.md) và cập nhật trạng thái trong [roadmap.md](../../docs/roadmap.md)

**Trạm kiểm tra (Checkpoint)**: Toàn bộ tính năng RM-016 hoàn tất 100%, sẵn sàng bàn giao cho người dùng vận hành.
