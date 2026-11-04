# Bảng Kiểm Yêu cầu Nghiệm thu (Requirements Checklist): RM-028

**Tài liệu tham chiếu**: [spec.md](../spec.md)  
**Mục tiêu**: Đảm bảo 100% các tiêu chí kỹ thuật và trải nghiệm người dùng được kiểm tra chặt chẽ trước khi bàn giao.

---

## 1. Điều hướng & Bố cục Phân hệ Thu ngân (`/cashier`)

- [ ] **CHK-NAV-01**: Tài khoản có vai trò `Cashier` sau khi đăng nhập được tự động điều hướng vào `/cashier/tables`.
- [ ] **CHK-NAV-02**: Tài khoản không có vai trò phù hợp (`Waiter`, người dùng chưa phân quyền) bị chặn 403 khi cố truy cập `/cashier/*`.
- [ ] **CHK-NAV-03**: Trang lỗi 404, 403, 500 tự động đếm ngược 5 giây và đưa tài khoản `Cashier` trở lại `/cashier/tables`.
- [ ] **CHK-NAV-04**: Topbar hiển thị đầy đủ tên thu ngân, ca trực, doanh thu ca, số bàn phục vụ và số đơn chờ.
- [ ] **CHK-NAV-05**: Nút `[Chuyển sang Quản trị]` chỉ hiển thị đối với tài khoản có quyền Quản lý/Quản trị viên (`Manager`/`Admin`).

---

## 2. Quản lý Bàn ăn Thu ngân (`/cashier/tables`)

- [ ] **CHK-TBL-01**: Sơ đồ bàn hiển thị theo từng khu vực, bố cục Bento Grid tương đồng với Waiter.
- [ ] **CHK-TBL-02**: Bộ lọc trạng thái bàn lọc tức thời không cần reload trang.
- [ ] **CHK-TBL-03**: Thẻ bàn hiển thị chính xác số bàn, số ghế, thời gian khách ngồi, trạng thái đơn và tổng tiền tạm tính.
- [ ] **CHK-TBL-04**: Bấm vào bàn mở xem chi tiết đơn hàng hoặc mở modal xếp khách tại quầy.
- [ ] **CHK-TBL-05**: Bàn có yêu cầu thanh toán hiển thị hiệu ứng nhấp nháy viền cam đỏ cảnh báo nổi bật.
- [ ] **CHK-TBL-06**: Nút Reload Sơ đồ Bàn (`[fa-rotate]`) trên cả Waiter (`/waiter/tables`) và Cashier (`/cashier/tables`) tải lại dữ liệu bàn tức thì từ máy chủ mà không làm mới (F5) toàn bộ trang web, bảo toàn bộ lọc khu vực và từ khóa tìm kiếm.

---

## 3. Quản lý Đơn hàng & Thanh toán (`/cashier/orders`)

- [ ] **CHK-ORD-01**: Đơn hàng phân loại theo 4 trạng thái: Mới nhận, Đang xử lý, Yêu cầu thanh toán, Đã hoàn tất.
- [ ] **CHK-ORD-02**: Cho phép xem chi tiết danh sách món, đơn giá, số lượng, thành tiền và ghi chú món.
- [ ] **CHK-ORD-03**: Xuất hóa đơn tạm tính (Pre-bill) chính xác số tiền để gửi khách kiểm tra.
- [ ] **CHK-ORD-04**: Thanh toán Tiền mặt tự động tính tiền thừa trả khách.
- [ ] **CHK-ORD-05**: Thanh toán VietQR hiển thị mã QR động chứa chính xác số tiền và cú pháp chuyển khoản.
- [ ] **CHK-ORD-06**: Xác nhận thanh toán thành công tự động trừ kho nguyên liệu FEFO, đóng đơn `COMPLETED` và chuyển bàn sang `CLEANING`.
- [ ] **CHK-ORD-07**: Nút Reload Danh sách Đơn hàng (`[fa-rotate]`) trên cả Waiter và Cashier cập nhật danh sách đơn mới nhất mà không F5 trang web.

---

## 4. Liên kết & Đồng bộ Thời gian thực Hai chiều (SignalR Sync)

- [ ] **CHK-RT-01**: Waiter check-in bàn -> Cashier lập tức thấy bàn chuyển `OCCUPIED` (< 200ms) kèm Toast thông báo.
- [ ] **CHK-RT-02**: Waiter gọi món mới -> Màn hình Cashier phát âm thanh chuông báo và nổi thông báo đơn mới.
- [ ] **CHK-RT-03**: Waiter bấm "Yêu cầu thanh toán" -> Thẻ bàn trên Cashier nhấp nháy đỏ và xuất hiện tại mục chờ thanh toán.
- [ ] **CHK-RT-04**: Cashier hoàn tất thanh toán -> Màn hình Waiter nhận thông báo dọn bàn và bàn đổi màu sang `CLEANING`.
- [ ] **CHK-RT-05**: Waiter dọn bàn xong bấm "Đã dọn xong" -> Bàn chuyển `AVAILABLE` đồng bộ tức thời trên cả Waiter và Cashier.
- [ ] **CHK-RT-06**: Tự động kết nối lại SignalR khi mạng chập chờn mà không làm đơ giao diện.
- [ ] **CHK-RT-07**: Cơ chế Reload dự phòng độc lập: khi mạng chập chờn hoặc sau khi mở lại màn hình, nhân viên bấm Reload để đồng bộ lại dữ liệu tức thì mà không cần F5.

---

## 5. Đa ngôn ngữ & Kiểm thử Tự động

- [ ] **CHK-I18N-01**: 100% văn bản giao diện, nhãn nút, thẻ cảnh báo và thông báo thời gian thực có đầy đủ cả Tiếng Anh và Tiếng Việt trong `vi.json` và `en.json`.
- [ ] **CHK-TEST-01**: Viết unit tests Vitest cho `cashierAuthGuard`, `CashierSyncService` và các component của phân hệ Cashier.
- [ ] **CHK-TEST-02**: Viết integration tests xUnit cho endpoints thanh toán và phát sự kiện SignalR.
