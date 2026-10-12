# Hướng dẫn Khởi chạy & Xác minh Nhanh (Quickstart): Quản lý Khu vực Ăn uống & Bàn ăn (RM-008)

**Tính năng**: `008-rm-008-dining-areas-and-tables`  
**Ngày**: 2026-10-09  

---

## 1. Tiền điều kiện Môi trường (Prerequisites)

1. **.NET 10 SDK** đã cài đặt (`dotnet --version` $\ge$ 10.0).
2. **Node.js 18 hoặc 20** (`node -v`).
3. Database SQL Server đang chạy (chuỗi kết nối trong `appsettings.json` của `HttpApi.Host`).
4. Khởi chạy đồng thời 2 dịch vụ:
   - Backend Host:
     ```bash
     cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
     dotnet run
     ```
   - Frontend Angular:
     ```bash
     cd d:\DFT\Acme.TooHungry\angular
     npm start
     ```

---

## 2. Kịch bản Kiểm thử Tự động (Automated Verification)

Chạy bộ kiểm thử tầng Domain và Application để thẩm tra toàn bộ quy tắc nghiệp vụ:

```powershell
cd d:\DFT\Acme.TooHungry

# Chạy kiểm thử Domain (Entity Invariants, TableStatus, DiningArea Soft Delete/Deactivate)
dotnet test test/Acme.TooHungry.Domain.Tests

# Chạy kiểm thử Application Services (DiningAreaAppService, TableAppService workflows)
dotnet test test/Acme.TooHungry.Application.Tests
```

**Kết quả mong đợi**: 100% các bài test liên quan đến `DiningArea` và `RestaurantTable` (chặn trùng tên bàn, chặn xóa khi có khách, chặn vô hiệu hóa khu vực khi có khách, đổi trạng thái bàn) đều vượt qua (`Passed`).

---

## 3. Kịch bản Xác minh Thủ công Luồng Người dùng (Manual End-to-End Walkthrough)

### Kịch bản 1: Quản lý thiết lập Khu vực & Bàn ăn mới (Manager Flow)
1. Đăng nhập tài khoản Quản lý (`admin`) trên trình duyệt `http://localhost:4200`.
2. Truy cập menu **Khu vực ăn uống** (`/dining-areas`).
3. Nhấn **Thêm khu vực**, nhập Tên "Tầng 2 - Ngoài trời", Mô tả "Khu vực ngắm cảnh". Lưu thành công; khu vực hiển thị trạng thái `Đang hoạt động`, số lượng bàn = 0.
4. Truy cập menu **Bàn ăn** (`/tables`), nhấn **Thêm bàn**:
   - Tên bàn: "Bàn 201", Sức chứa: 4, Khu vực: "Tầng 2 - Ngoài trời".
   - Nhấn Lưu -> Bàn hiển thị với trạng thái `Còn trống` (`AVAILABLE`).
5. Thử tạo bàn khác cùng tên "Bàn 201" ở một khu vực khác -> Hệ thống từ chối và hiển thị thông báo lỗi: *Tên bàn 'Bàn 201' đã tồn tại trong hệ thống*.

---

### Kịch bản 2: Vận hành Bàn chuyên biệt cho Waiter (`/waiter/tables`)
1. Đăng nhập tài khoản Nhân viên phục vụ hoặc Quản lý, truy cập đường dẫn `/waiter/tables`.
2. Kiểm tra giao diện:
   - Danh sách bàn được dàn theo bố cục lưới chuẩn **4 Thẻ Bàn (Table Cards) trên mỗi hàng**.
   - Thanh Tab chỉ hiển thị các khu vực đang hoạt động (`IsActive = true`).
3. Thao tác trên "Bàn 201" (`AVAILABLE` - Xanh lá):
   - Nhấn `[Đón khách]` -> Thẻ bàn lập tức chuyển sang màu đỏ ấm `[Đang có khách]` (`OCCUPIED`) mà không cần mở modal.
   - Nhấn `[Order]` -> Trình duyệt điều hướng sang `/waiter/order/:tableId`.
   - Quay lại `/waiter/tables`, nhấn `[Kết thúc bữa ăn]` (trường hợp khách chưa gọi món) -> Hộp thoại xuất hiện: *"Khách không sử dụng món ăn. Bạn có chắc chắn muốn chuyển bàn về trạng thái trống?"* -> Xác nhận -> Bàn chuyển về `AVAILABLE`.
4. Thao tác vô hiệu hóa bàn:
   - Trên bàn trống, nhấn `[Vô hiệu hóa bàn]` -> Bàn chuyển sang màu xám `[Vô hiệu hóa]` (`INACTIVE`), toàn bộ nút đón khách, đặt bàn, tạo order bị khóa.
   - Nhấn `[Kích hoạt bàn]` -> Bàn khôi phục về `AVAILABLE`.

---

### Kịch bản 3: Kiểm tra Đồng bộ Thời gian thực SignalR & Xung đột Đồng thời
1. Mở hai cửa sổ trình duyệt song song (hoặc hai thiết bị) cùng mở màn hình `/waiter/tables`.
2. Tại Cửa sổ 1: Bấm `[Đón khách]` trên "Bàn 201".
3. Quan sát Cửa sổ 2: Trong vòng chưa đầy 1 giây, thẻ "Bàn 201" tự động đổi sang màu đỏ ấm `[Đang có khách]` mà không cần F5.
4. Kiểm tra xung đột: Ở cả hai cửa sổ cùng lúc mở một bàn trống, Cửa sổ 1 bấm đón khách, ngay lập tức Cửa sổ 2 bấm vô hiệu hóa bàn -> Cửa sổ 2 hiển thị thông báo toast: *"Trạng thái bàn đã được cập nhật bởi nhân viên khác"* và thẻ bàn đồng bộ trạng thái mới từ Cửa sổ 1.
