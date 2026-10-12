# Hướng dẫn Kiểm thử Nhanh (Quickstart Guide): RM-010 POS / Đơn hàng

**Tính năng**: `RM-010 — POS / Đơn hàng (POS Ordering & Dining Session Management)`  
**Ngày**: 2026-10-09  
**Trạng thái**: Sẵn sàng thực thi (Ready for Execution)

---

## 1. Kiểm thử Tự động (Automated Tests)

### Chạy Unit Tests tầng Domain & Application
```bash
# Kiểm tra các bài test liên quan đến OrderAppService và Stock Validation
dotnet test test/Acme.TooHungry.Application.Tests/Acme.TooHungry.Application.Tests.csproj --filter "FullyQualifiedName~Orders"
```

### Kiểm tra Build Angular & Proxy
```bash
# Sinh API proxies cho Angular
cd angular
npm run generate-proxy

# Kiểm tra biên dịch Angular
npm run build
```

---

## 2. Kịch bản Kiểm thử Thủ công End-to-End (E2E Manual Walkthrough)

### Bước 1: Khởi động hệ thống
1. Chạy Backend: `dotnet run --project src/Acme.TooHungry.HttpApi.Host`
2. Chạy Frontend: `cd angular && npm start`
3. Đăng nhập với tài khoản có vai trò `Waiter` hoặc `Admin`.

### Bước 2: Điều hướng từ Sơ đồ bàn sang Màn hình Gọi món
1. Truy cập `/waiter/tables`.
2. Tìm một bàn đang ở trạng thái `AVAILABLE` (ví dụ "Bàn 03"). Bấm nút `[Đón khách]` để chuyển bàn sang `OCCUPIED`.
3. Trên thẻ bàn "Bàn 03", bấm nút `[Order]`.
4. **Kỳ vọng**:
   - Hệ thống điều hướng trực tiếp sang URL: `/waiter/order/{tableId-03}`.
   - Header hiển thị nút `[← Back]` và nút `[🛒]` với badge `0`.
   - Đầu Sidebar trái hiển thị **Table Information Card**: Tên bàn "Bàn 03", Sức chứa, và Huy hiệu `OCCUPIED`.
   - Phía dưới Sidebar là danh sách danh mục món ăn (Menu Categories) mở rộng mặc định.

### Bước 3: Duyệt Thực đơn & Thêm Món
1. Quan sát lưới món ăn hiển thị 3 Food Cards trên mỗi hàng (ảnh vuông nền đen, tên món, giá bán màu cam).
2. Thử gõ từ khóa vào ô tìm kiếm nhanh ở đầu lưới món (ví dụ "pizza") $\rightarrow$ danh sách lọc realtime tức thì.
3. Bấm trực tiếp vào thân thẻ món "Pizza Hải Sản" $\rightarrow$ mở **Food Detail Modal**.
4. Nhập ghi chú chế biến: "Ít cay, nướng kỹ", bấm `[Đặt món]`.
5. **Kỳ vọng**: Món ăn được đưa vào giỏ hàng, Modal đóng lại, badge trên nút `[🛒]` tăng lên `1`.

### Bước 4: Kiểm tra Giỏ hàng (Order Drawer) & Kiểm tra Tồn kho
1. Bấm nút `[🛒]` trên Header $\rightarrow$ Order Drawer trượt ra từ mép phải màn hình.
2. Kiểm tra dòng món hiển thị: Tên món, Đơn giá, Số lượng, Thành tiền và Ghi chú đã nhập.
3. Bấm nút `[+]` để tăng số lượng món lên (ví dụ: Pizza x 2, x 3...):
   - Nếu đủ tồn kho nguyên liệu theo Recipe: Số lượng tăng bình thường, tổng tiền cập nhật mượt mà.
   - Nếu thử tăng vượt quá tồn kho nguyên liệu thực tế: Hệ thống hiển thị Toast cảnh báo thiếu nguyên liệu cụ thể và chặn đứng việc tăng số lượng (không cho phép âm kho).
4. Sửa nhanh ghi chú món trực tiếp ngay tại dòng món trong Drawer: "Nhiều phô mai" $\rightarrow$ ghi chú cập nhật tức thì.

### Bước 5: Xác nhận Đơn hàng (`Submit Order`)
1. Bấm nút `[Đặt đơn]` ở chân Drawer.
2. **Kỳ vọng**:
   - Hệ thống tạo Active Order với trạng thái `PENDING`, hiển thị Toast thông báo thành công.
   - Bấm nút `[← Back]` quay về `/waiter/tables`.
   - Thẻ bàn "Bàn 03" tự động hiển thị biểu tượng đơn hàng đang mở (`TableHasOpenOrder`) màu xanh qua SignalR.

### Bước 6: Kiểm tra Bất biến Tiếp tục Gọi món (`Continue Order`)
1. Tại `/waiter/tables`, bấm lại nút `[Order]` trên "Bàn 03".
2. **Kỳ vọng**: Màn hình gọi món nạp lại đúng toàn bộ các món đã gọi của đơn `PENDING` trước đó (`Continue Order`).
3. Chọn thêm 1 lon nước ngọt và bấm `[Đặt đơn]`.
4. **Kỳ vọng**: Đơn hàng được cập nhật vào đúng mã Order cũ, không sinh mã Order mới.

### Bước 7: Kết thúc Bữa ăn & Chuyển tiếp Thanh toán (RM-016)
1. Quay lại `/waiter/tables`, trên thẻ bàn "Bàn 03", bấm nút `[Kết thúc bữa ăn]`.
2. Modal xác nhận hiển thị tóm tắt đơn hàng đang có.
3. Bấm xác nhận thanh toán $\rightarrow$ hệ thống điều hướng thẳng sang `/waiter/payment/{orderId}` thuộc phân hệ RM-016.
