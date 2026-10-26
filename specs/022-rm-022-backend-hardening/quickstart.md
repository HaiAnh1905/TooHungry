# Hướng dẫn Kiểm thử & Xác thực Nhanh (Quickstart Validation Guide): RM-022 Ổn định hóa & Vá lỗi Nghiêm trọng Backend

**Mã Tính năng (Feature ID)**: `RM-022`  
**Nhánh (Branch)**: `022-rm-022-backend-hardening`  
**Ngày thực hiện**: 2026-10-22  
**Đặc tả tham chiếu**: [spec.md](spec.md) | **Thiết kế Dữ liệu**: [data-model.md](data-model.md)

---

## 1. Chuẩn bị Môi trường Kiểm thử

- Chạy lệnh build và xác minh biên dịch thành công:
  ```powershell
  dotnet build d:\DFT\Acme.TooHungry\Acme.TooHungry.sln
  ```
- Khởi động cơ sở dữ liệu và áp dụng Migrations (nếu có cập nhật Filtered Unique Index):
  ```powershell
  dotnet run --project d:\DFT\Acme.TooHungry\src\Acme.TooHungry.DbMigrator
  ```
- Khởi động Backend API Host:
  ```powershell
  dotnet run --project d:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
  ```

---

## 2. Các Kịch bản Xác thực Trọng yếu (Runnable Scenarios)

### Kịch bản 1: Xác thực Chống Trừ kho Trùng lặp & Đóng băng Đơn hàng (Backend #1)

1. **Thực hiện**:
   - Sử dụng tài khoản Waiter tạo một đơn hàng có món ăn chứa nguyên liệu công thức Recipe.
   - Gọi API thanh toán/hoàn tất đơn: `POST /api/app/order/{id}` chuyển trạng thái sang `Completed`.
   - Ghi nhận số dư tồn kho của nguyên liệu trong bảng `InventoryBatches`.
   - Thử gọi lại `PUT /api/app/order/{id}` với payload chỉnh sửa ghi chú hoặc số lượng.
2. **Kỳ vọng**:
   - Lần gọi thứ 2 bị server từ chối ngay lập tức với mã lỗi HTTP 403/BusinessException:
     ```json
     {
       "error": {
         "code": "TooHungry:Order:AlreadyCompleted",
         "message": "Đơn hàng này đã hoàn tất, không thể chỉnh sửa hoặc trừ kho lại!"
       }
     }
     ```
   - Số dư tồn kho của các lô nguyên liệu giữ nguyên 100%, không phát sinh bất kỳ bản ghi `InventoryTransactionType.OUT` nào mới.

---

### Kịch bản 2: Xác thực Tính Giá Phía Server & Validation DTO (Backend #2, #3)

1. **Thực hiện**:
   - Món "Phở bò đặc biệt" có giá niêm yết trong hệ thống là `85,000 VND`.
   - Gửi request `POST /api/app/order` tạo đơn hàng giả lập gian lận từ client:
     ```json
     {
       "tableId": "<table-guid>",
       "items": [
         {
           "dishId": "<pho-bo-guid>",
           "quantity": 2,
           "unitPrice": 1000,
           "totalPrice": 2000
         }
       ]
     }
     ```
2. **Kỳ vọng**:
   - Server phớt lờ hoàn toàn các trường `unitPrice: 1000` và `totalPrice: 2000`.
   - Dữ liệu trả về và lưu trong CSDL:
     + `UnitPrice = 85000`
     + `TotalPrice = 170000`
     + `Order.TotalAmount = 170000`.
3. **Thực hiện tiếp**: Gửi request với `quantity: -1` hoặc `items: []`.
   - Server trả về HTTP 400 Bad Request kèm thông báo validation lỗi rõ ràng.

---

### Kịch bản 3: Xác thực Chống Race Condition với Filtered Unique Index (Backend #12)

1. **Thực hiện**:
   - Sử dụng công cụ kiểm thử tải (hoặc mở 2 cửa sổ Postman/PowerShell song song) gửi đồng thời 2 request `POST /api/app/order/submit-order` cho cùng một bàn ăn Bàn 01.
2. **Kỳ vọng**:
   - Request 1: Tạo đơn thành công (HTTP 200/201), đơn ở trạng thái `Pending` (hoặc `Processing`).
   - Request 2: Vi phạm Unique Constraint tại database. Server bắt `DbUpdateException` và ném:
     ```json
     {
       "error": {
         "code": "TooHungry:Order:TableAlreadyHasActiveOrder",
         "message": "Bàn này đã có một đơn hàng đang hoạt động! Đang đồng bộ dữ liệu..."
       }
     }
     ```
   - Tuyệt đối không trả về mã lỗi 500 Unhandled Exception.
   - Client hiển thị Toast thông báo và tự động tải lại đơn của Request 1.

---

### Kịch bản 4: Xác thực Chống Mass Assignment Bàn ăn & Gộp bàn Bảo toàn Ghi chú (Backend #10, #16)

1. **Xác thực Mass Assignment**:
   - Bàn 02 đang ở trạng thái `Occupied` (có khách ngồi).
   - Gửi request cập nhật thông tin bàn: `PUT /api/app/table/{id}` với payload:
     ```json
     {
       "name": "Bàn 02 VIP",
       "capacity": 6,
       "status": 0
     }
     ```
   - Kiểm tra CSDL: Tên bàn đổi thành "Bàn 02 VIP", sức chứa 6; nhưng trạng thái bàn `Status` vẫn là `Occupied` (1), thời gian `OccupiedTime` không bị xóa.
2. **Xác thực Gộp bàn (`MergeTablesAsync`)**:
   - Bàn 01 gọi 1 "Trà đào" ghi chú "Ít ngọt".
   - Bàn 02 gọi 2 "Trà đào" ghi chú "Không đá".
   - Gọi API gộp Bàn 02 vào Bàn 01.
   - Kỳ vọng:
     + Bàn 01 có 1 dòng "Trà đào" với số lượng `3` phần.
     + Ghi chú món: `"[Ít ngọt] | [Gộp từ Bàn 02: Không đá]"`.
     + Đơn giá `UnitPrice` tính chuẩn theo `Dish.Price` của Trà đào.

---

### Kịch bản 5: Xác thực Vòng đời Đặt bàn & Worker Hủy Bàn Nguyên tử (Backend #15, #29)

1. **Đặt bàn trước 3 ngày**:
   - Tạo đơn đặt bàn cho thời điểm 3 ngày sau.
   - Kiểm tra bàn ăn: Trạng thái vẫn là `Available` (0), phục vụ khách bình thường.
2. **Đặt bàn trước 30 phút**:
   - Tạo đơn đặt bàn cho thời điểm cách hiện tại 30 phút.
   - Kiểm tra bàn ăn: Trạng thái hiển thị là `Reserved` (2).
3. **Background Worker Hủy Bàn**:
   - Tạo đơn đặt bàn có giờ hẹn đã quá hạn 70 phút.
   - Kích hoạt `ReservationAutoCancelBackgroundWorker.ProcessOverdueReservationsAsync`.
   - Kỳ vọng: Đơn đặt bàn chuyển `AutoCancelled`, bàn ăn giải phóng về `Available` trong cùng một transaction `[UnitOfWork]`.

---

### Kịch bản 6: Xác thực Tồn kho Dự báo & Lô Kiểm kê Tăng (Backend #4, #25, #26)

1. **Tồn kho Dự báo**:
   - Nguyên liệu "Thịt bò" có 2 lô hàng, mỗi lô còn tồn 10 kg (BaseUnit: `kg`, ConversionFactor: `1.0`).
   - Gọi API lấy kế hoạch dự báo nhu cầu (`/api/app/ingredient-plan/...`).
   - Kỳ vọng: `CurrentStock` hiển thị đúng `20 kg` (không bị nhân đôi thành `40 kg`).
2. **State Machine Kế hoạch Dự báo**:
   - Chuyển kế hoạch sang `Executed`.
   - Thử gọi API chuyển về `Draft`: Server từ chối và ném `BusinessException`.
3. **Lô Kiểm kê Tăng**:
   - Thực hiện kiểm kê kho tăng 5 kg nguyên liệu "Thịt bò".
   - Kiểm tra lô mới tạo: Mã lô `ADJ-*`, `PurchaseUnit = "kg"`, `UnitCost` lấy theo `EstimatedPrice`, hạn sử dụng lấy theo hạn dùng xa nhất của các lô hiện hành (không bị cộng 1 năm).
