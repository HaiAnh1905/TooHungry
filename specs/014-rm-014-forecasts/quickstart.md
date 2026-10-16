# Hướng dẫn Kiểm thử Nhanh (Quickstart Validation Guide): RM-014 Dự báo Nhu cầu & Kế hoạch Nguyên liệu

**Tính năng**: RM-014 — Dự báo Nhu cầu Món ăn & Kế hoạch Nguyên liệu (Demand Forecasts & Ingredient Requirement Planning)  
**Tài liệu Đặc tả liên quan**: [spec.md](spec.md) | [data-model.md](data-model.md) | [forecast-api-contracts.md](contracts/forecast-api-contracts.md)  
**Ngày cập nhật**: 2026-10-15  
**Trạng thái**: Hoàn thiện (Resolved)

---

## 1. Điều kiện Tiên quyết (Prerequisites)

1. **Hệ thống Backend & Database**:
   - .NET 10.0+ SDK đã cài đặt.
   - EF Core Migrations đã cập nhật đầy đủ (bảng `AppDemandForecasts`, `AppDemandForecastItems`, `AppIngredientPlans`, `AppIngredientPlanItems`).
   - Dịch vụ backend đang chạy:
     ```powershell
     cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.HttpApi.Host
     dotnet run
     ```
2. **Hệ thống Frontend Angular**:
   - Node.js v18/v20, Angular CLI.
   - Ứng dụng client đang chạy:
     ```powershell
     cd d:\DFT\Acme.TooHungry\angular
     npm start
     ```
3. **Dữ liệu Nền tảng (Master Data)**:
   - Đã có danh sách Món ăn (`Dish` - RM-006).
   - Đã có Nguyên liệu (`Ingredient` - RM-005) có thiết lập `EstimatedPrice` và `BaseUnit`.
   - Đã có Công thức món ăn (`Recipe` - RM-007) đang kích hoạt (`IsActive = true`).
   - Đã có một số đơn hàng thanh toán thành công (`Order.Status = Completed` - RM-010/RM-016) trong 7 ngày qua.

---

## 2. Các Kịch bản Kiểm thử Nghiệp vụ (Validation Scenarios)

### Kịch bản 1: Tự động Sinh Dự báo Nhu cầu Món ăn từ Lịch sử Bán hàng (SMA)
1. Đăng nhập vào hệ thống bằng tài khoản Quản lý (`Manager`) hoặc Bếp trưởng (`Chef`).
2. Trên thanh điều hướng, chọn menu **"Dự báo & Kế hoạch"** (`/forecasts`).
3. Bấm nút `[+ Tạo bản dự báo mới]`.
4. Trong form tạo dự báo:
   - Chọn khoảng thời gian: Từ ngày mai (`StartDate`) đến 7 ngày sau (`EndDate`).
   - Chọn kỳ phân tích lịch sử: `7 ngày qua (Mặc định)`.
   - Bấm nút `[⚡ Tự động tính từ Lịch sử]`.
5. **Kết quả mong đợi**:
   - Hệ thống gọi API `POST /api/app/demand-forecast/generate`.
   - Bảng danh sách món ăn tự động điền các món đã bán trong 7 ngày qua kèm số lượng dự báo tương ứng: $\lceil \text{DailyAverage} \times 7 \rceil$.
   - Các món chưa từng bán hiển thị số lượng `0`.
   - 4 thẻ KPI tài chính đầu trang tự động cập nhật: Doanh thu dự kiến, Chi phí nguyên liệu dự kiến, Tỷ lệ Food Cost % và Ngân sách mua hàng.

---

### Kịch bản 2: Điều chỉnh Số lượng Thủ công & Lưu Bản Dự báo
1. Tại bảng danh sách món vừa được gợi ý:
   - Chỉnh sửa số lượng món "Bò bít tết" từ 20 phần lên 35 phần (do có tiệc cuối tuần).
   - Nhập ghi chú: "Tiệc sinh nhật đặt trước 15 phần".
2. Bấm nút `[Lưu bản dự báo]`.
3. **Kết quả mong đợi**:
   - Hệ thống gọi API `POST /api/app/demand-forecast`.
   - Bản ghi `DemandForecast` được lưu vào DB cùng các dòng `DemandForecastItem`.
   - Đồng thời, backend tự động bóc tách định lượng `Recipe` và tạo thực thể `IngredientPlan` ở trạng thái `Draft = 0`.
   - Hệ thống hiển thị thông báo Toast thành công: *"Đã lưu bản dự báo và khởi tạo kế hoạch nguyên liệu"*.
   - Giao diện tự động chuyển sang trang Chi tiết dự báo `/forecasts/detail/{id}`.

---

### Kịch bản 3: Đối soát Tồn kho Khả dụng & Xem Gợi ý Mua hàng
1. Tại trang Chi tiết dự báo, chuyển sang Tab **"Kế hoạch Nguyên liệu & Mua hàng"**.
2. Quan sát bảng danh sách nguyên liệu tổng hợp:
   - Cột **Nhu cầu chế biến (`RequiredQuantity`)**: Tổng lượng nguyên liệu cần theo công thức.
   - Cột **Tồn kho khả dụng (`CurrentStock`)**: Số lượng còn tồn thực tế trong kho (loại trừ các lô quá hạn).
   - Cột **Cần mua thêm (`SuggestedPurchaseQuantity`)**: $\max(0, \text{RequiredQuantity} - \text{CurrentStock})$.
   - Cột **Thành tiền dự toán (`EstimatedCost`)**: $\text{SuggestedPurchaseQuantity} \times \text{EstimatedPrice}$.
3. **Kết quả mong đợi**:
   - Các nguyên liệu thiếu hụt tồn kho được làm nổi bật với badge màu cam cảnh báo.
   - Các nguyên liệu đã đủ tồn kho hiển thị badge xanh lá "Đã đủ tồn".
   - Món ăn nào chưa có công thức định lượng hiển thị cảnh báo *"Chưa cấu hình công thức"*.

---

### Kịch bản 4: Phê duyệt Kế hoạch Nguyên liệu (`Draft` -> `Confirmed`)
1. Bếp trưởng / Quản lý kiểm tra xong bảng kê nguyên liệu.
2. Bấm nút `[✓ Phê duyệt kế hoạch]`.
3. Xác nhận trong hộp thoại: *"Bạn có chắc chắn muốn phê duyệt kế hoạch mua nguyên liệu cho kỳ này?"*.
4. **Kết quả mong đợi**:
   - Hệ thống gọi API `PUT /api/app/ingredient-plan/{id}/status` với `status: 1` (`Confirmed`).
   - Huy hiệu trạng thái chuyển sang màu xanh ngọc: `ĐÃ PHÊ DUYỆT (CONFIRMED)`.
   - Form chỉnh sửa số lượng được khóa lại để bảo toàn dữ liệu phục vụ bộ phận thu mua.
   - Nút `[Xuất Excel mua hàng]` và `[In phiếu chuẩn bị bếp]` sáng lên sẵn sàng tác nghiệp.

---

### Kịch bản 5: Xuất Bảng Kê Mua hàng ra File Excel
1. Tại tab "Kế hoạch Nguyên liệu & Mua hàng", bấm nút `[📥 Xuất Excel mua hàng]`.
2. Trình duyệt tải về file `KeHoachMuaHang_20261016_20261022.csv`.
3. Mở file bằng Microsoft Excel trên Windows.
4. **Kết quả mong đợi**:
   - File mở không bị lỗi font tiếng Việt nhờ tiền tố UTF-8 BOM (`\uFEFF`).
   - Có đầy đủ các cột: STT, Mã nguyên liệu, Tên nguyên liệu, Đơn vị tính, Nhu cầu chế biến, Tồn khả dụng, Cần mua thêm, Đơn giá ước tính, Thành tiền dự toán.
   - Dòng tổng cộng ở cuối bảng hiển thị chính xác tổng ngân sách mua hàng.

---

### Kịch bản 6: Xem trước & In Phiếu Chuẩn bị Bếp Khổ A4
1. Bấm nút `[🖨️ In phiếu chuẩn bị bếp]`.
2. Hộp thoại in của trình duyệt bật lên.
3. **Kết quả mong đợi**:
   - Toàn bộ thanh menu sidebar, topbar, tabs, nút bấm đều tự động ẩn hoàn toàn.
   - Trang in hiển thị tiêu đề trang trọng: "PHIẾU CHUẨN BỊ NGUYÊN VẬT LIỆU", Mã dự báo, Kỳ dự báo.
   - Bảng danh sách nguyên liệu phân bổ vừa vặn khổ A4.
   - Cuối trang có 2 ô ký tên rõ ràng: "Bếp trưởng" và "Thủ kho / Người mua hàng".

---

## 3. Kiểm thử Tự động (Automated Tests Execution)

### 3.1. Kiểm thử Tầng Backend (.NET)
Chạy bộ kiểm thử tự động cho module Forecasts:
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.Application.Tests --filter "FullyQualifiedName~Forecast"
```
**Tiêu chí đạt**: 100% tests PASS (Kiểm thử tính toán SMA, bóc tách công thức Recipe, kiểm tra phân quyền và tính toán tồn kho).

### 3.2. Kiểm thử Tầng Frontend (Angular)
Chạy kiểm tra cú pháp và build bundle:
```powershell
cd d:\DFT\Acme.TooHungry\angular
npm run build
```
**Tiêu chí đạt**: Quá trình build hoàn thành 0 lỗi (Zero TypeScript / Template errors).
