# Hướng dẫn Khởi chạy & Kiểm định (Quickstart Guide): RM-024 Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular

**Mã Tính năng**: `RM-024`  
**Ngày thực hiện**: 2026-10-23  
**Dự án**: `Acme.TooHungry`  
**Tài liệu liên quan**: [spec.md](spec.md) | [plan.md](plan.md) | [contracts/frontend-refactoring-contracts.md](contracts/frontend-refactoring-contracts.md)

---

## 1. Yêu cầu Tiên quyết & Khởi động Môi trường

Đảm bảo hai tiến trình Backend và Frontend đang hoạt động bình thường:
```bash
# 1. Khởi động Backend Web API Host (Terminal 1)
cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
dotnet run

# 2. Khởi động Frontend Angular Client (Terminal 2)
cd d:\DFT\Acme.TooHungry\angular
npm start
```
Mở trình duyệt truy cập: `http://localhost:4200`.

---

## 2. Kịch bản Kiểm tra Chức năng & Hiệu năng Từng bước

### Kịch bản 1: Kiểm thử Phân trang Máy chủ Đơn hàng (`/orders`) & Khắc phục Route Chết
1. Đăng nhập hệ thống với tài khoản Quản lý (`admin`).
2. Điều hướng tới `/orders`.
3. Kiểm tra thanh phân trang:
   - Nếu tổng số đơn > 10, thanh `<app-pager>` hiển thị rõ ràng tổng số bản ghi và các trang tiếp theo (`1`, `2`, `3`...).
   - Bấm sang trang `2`: Danh sách đơn hiển thị trang thứ 2 chính xác mà không bị mất dữ liệu.
4. Nhập từ khóa tìm kiếm vào ô tra cứu (ví dụ: `ORD-` hoặc ghi chú) và chọn bộ lọc trạng thái (ví dụ: `Đang xử lý`):
   - Mở Network tab: Kiểm tra request `GET /api/app/order?filter=...&status=...`.
   - Kết quả trả về đúng số lượng máy chủ lọc và tổng số trang tương ứng.
5. Kiểm tra định tuyến Thu ngân:
   - Đăng nhập với tài khoản Thu ngân (Cashier).
   - Xác minh trang đích chuyển hướng vào `/tables` (hoặc `/waiter/tables`), hoàn toàn không còn bị chuyển vào route lỗi `/table/layout`.

### Kịch bản 2: Kiểm thử Triệt tiêu Rò rỉ Bộ nhớ & Tối ưu Change Detection
1. Mở Chrome DevTools -> tab **Memory** hoặc **Performance**.
2. Tại màn hình chính, thực hiện chuyển đổi qua lại giữa tab ứng dụng và tab khác 20 lần:
   - Theo dõi Console: Không có hiện tượng gọi lặp lại dồn dập `refreshAppState()`.
   - Lắng nghe sự kiện `visibilitychange` chỉ kích hoạt một lần duy nhất với `take(1)`.
3. Kiểm tra `sidebar-widgets`:
   - Bật tính năng **Rendering -> Paint flashing** trong DevTools.
   - Quan sát đồng hồ thời gian thực: Chỉ vùng hiển thị đồng hồ được vẽ lại mỗi giây, toàn bộ cây component của trang không bị kích hoạt lại Change Detection do timer chạy ngoài `NgZone`.

### Kịch bản 3: Kiểm thử Component Dùng chung `<app-pager>` & `<app-table-card>`
1. Truy cập lần lượt các màn hình:
   - Quản lý Món ăn: `/dishes`
   - Quản lý Danh mục: `/dish-categories`
   - Quản lý Nguyên liệu: `/ingredients`
   - Quản lý Đơn vị tính: `/units`
   - Quản lý Công thức: `/recipes`
   - Quản lý Đơn hàng: `/orders`
2. Xác minh tất cả đều sử dụng đồng nhất component `<app-pager>` với nhận diện Cam & Trắng đẹp mắt.
3. Thay đổi số dòng trên trang (10, 25, 50): Bảng dữ liệu tự động cập nhật mượt mà, không giật màn hình và không còn các dòng mã hack `window.dispatchEvent(resize)`.
4. Mở song song hai tab trình duyệt: Tab 1 là `/tables` (Admin) và Tab 2 là `/waiter/tables` (Waiter).
   - Đổi trạng thái một bàn ăn bất kỳ.
   - Xác minh sự kiện SignalR cập nhật đồng thời trên cả hai tab thông qua `TableStateService` và thẻ bàn `<app-table-card>` hiển thị đồng bộ màu badge trạng thái.

### Kịch bản 4: Kiểm thử Modal Tạo đơn Hàng & Tối ưu Template
1. Tại `/orders`, bấm nút "Tạo đơn hàng mới":
   - Quan sát Network tab: Không còn 2 request tải `1000 recipes` và `1000 ingredients`.
   - Modal mở tức thì dưới 100ms.
2. Thêm món vào giỏ hàng và nhập số lượng lớn vượt quá tồn kho:
   - Hệ thống gọi API kiểm tra tồn kho phía server và hiển thị cảnh báo thiếu hụt rõ ràng.
   - Chuỗi cảnh báo hiển thị qua interpolation an toàn `{{ warning }}`, không còn dùng `[innerHTML]`.
3. Lưu đơn hàng:
   - Mã đơn hàng được để trống để máy chủ tự sinh an toàn, không tự sinh random ở client.
   - Payload gửi lên không còn chứa `unitPrice` do client tự đặt.

### Kịch bản 5: Kiểm thử Thông báo Lỗi Không Kép & Đổi Ngôn ngữ Mượt mà
1. Mở màn hình `/waiter/tables` hoặc `/orders`.
2. Bấm đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh tại thanh điều hướng Waiter:
   - Toàn bộ giao diện chuyển sang ngôn ngữ mới mượt mà, không bị chớp trắng hay tải lại trang web (`location.reload`).
   - Ký hiệu tiền tệ hiển thị định dạng chuẩn qua pipe `currency:'VND'`.
3. Thử lưu một thao tác không hợp lệ:
   - Chỉ duy nhất thông báo toast lỗi xuất hiện, không còn bị hiện đồng thời cả modal lỗi mặc định của ABP do đã cấu hình `{ skipHandleError: true }`.

---

## 3. Lệnh Kiểm thử Tự động (Automated Verification Commands)

```bash
# 1. Chạy Unit Tests tầng Backend
cd d:\DFT\Acme.TooHungry
dotnet test test/Acme.TooHungry.Application.Tests/Acme.TooHungry.Application.Tests.csproj

# 2. Kiểm tra biên dịch sạch của Frontend Angular
cd d:\DFT\Acme.TooHungry\angular
npm run build
```
Đảm bảo 100% tests PASS và quá trình build không có bất kỳ lỗi biên dịch nào.
