# Nghiên cứu Kỹ thuật & Quyết định Kiến trúc (Technical Research): RM-014 Dự báo Nhu cầu & Kế hoạch Nguyên liệu

**Tính năng**: RM-014 — Dự báo Nhu cầu Món ăn & Kế hoạch Nguyên liệu (Demand Forecasts & Ingredient Requirement Planning)  
**Tài liệu Đặc tả liên quan**: [spec.md](spec.md)  
**Ngày thực hiện**: 2026-10-15  
**Trạng thái**: Hoàn thiện (Resolved)

---

## 1. Nghiên cứu 1: Thuật toán Dự báo Nhu cầu Món ăn theo SMA từ Lịch sử Bán hàng

### Bối cảnh & Vấn đề
Mục tiêu là tự động tính toán số lượng món ăn dự báo cho một khoảng thời gian trong tương lai (`StartDate` đến `EndDate`) dựa trên lịch sử dữ liệu tiêu thụ thực tế. Cần đảm bảo thuật toán nhanh, chính xác, trực quan, có thể giải thích được cho quản lý nhà hàng và không bị sai lệch bởi các đơn hàng bị hủy hay bàn chưa thanh toán.

### Quyết định Kiến trúc (Decision)
Áp dụng phương pháp **Trung bình động đơn giản (Simple Moving Average - SMA)** kết hợp làm tròn trần (`Math.Ceiling`):
1. **Lọc dữ liệu nguồn**:
   - Chỉ lấy các bản ghi `Order` có `Status == OrderStatus.Completed` (đã hoàn tất thanh toán) trong khoảng thời gian từ $(\text{Now} - \text{HistoryDays})$ đến $\text{Now}$.
   - Hỗ trợ các mốc cửa sổ phân tích linh hoạt: 7 ngày, 14 ngày hoặc 30 ngày (mặc định: 7 ngày gần nhất).
2. **Tổng hợp số lượng tiêu thụ theo món**:
   - Nhóm các dòng `OrderItem` theo `DishId`.
   - Tính tổng số lượng bán ra: $\text{TotalSold}(dish) = \sum \text{OrderItem.Quantity}$.
3. **Tính số lượng bán bình quân mỗi ngày**:
   $$\text{DailyAverage}(dish) = \frac{\text{TotalSold}(dish)}{\text{HistoryDays}}$$
4. **Quy đổi sang kỳ dự báo tương lai**:
   - Số ngày của kỳ dự báo: $N = \max(1, \lceil (\text{EndDate} - \text{StartDate}).\text{TotalDays} \rceil)$.
   - Số lượng dự báo đề xuất:
     $$\text{SuggestedQuantity}(dish) = \lceil \text{DailyAverage}(dish) \times N \rceil$$
5. **Xử lý danh mục đầy đủ**:
   - Bao quát toàn bộ các món ăn đang hoạt động (`Dish.IsActive = true`). Món nào chưa có đơn hàng nào trong kỳ phân tích sẽ có số lượng gợi ý ban đầu là `0`.
   - Giao diện cho phép người dùng tùy chỉnh số lượng từng món trước khi bấm lưu.

### Đánh giá các Phương án khác (Alternatives Considered)
- *Hồi quy tuyến tính / Machine Learning (ARIMA, Prophet)*: Bị từ chối vì đòi hỏi tập dữ liệu quá khứ khổng lồ (nhiều tháng/năm), tính toán phức tạp, khó giải thích cho Bếp trưởng và tăng chi phí hạ tầng không cần thiết ở giai đoạn Wave 4.
- *Nhập tay hoàn toàn*: Bị từ chối vì tốn thời gian thao tác của nhân viên khi nhà hàng có hàng trăm món ăn.

---

## 2. Nghiên cứu 2: Bóc tách Công thức Định lượng (Recipe Explosion) & Đối soát Tồn kho Khả dụng

### Bối cảnh & Vấn đề
Từ danh sách số lượng món ăn dự báo, hệ thống cần suy ra tổng nhu cầu từng nguyên liệu thô cần dùng trong nhà bếp và đối chiếu với số lượng tồn kho thực tế để đưa ra gợi ý số lượng cần mua thêm.

### Quyết định Kiến trúc (Decision)
1. **Bóc tách định lượng (Recipe Explosion)**:
   - Với mỗi món ăn `DishId` có số lượng dự báo $\text{Qty}(dish) > 0$:
     - Truy xuất công thức đang kích hoạt (`Recipe.IsActive = true`) có phiên bản mới nhất gắn với `DishId`.
     - Nếu món chưa có công thức: Đánh dấu cờ cảnh báo `HasRecipe = false` trên giao diện để thông báo cho người dùng.
     - Với mỗi nguyên liệu trong công thức (`RecipeIngredient`):
       $$\text{IngredientNeed} = \text{Qty}(dish) \times \text{RecipeIngredient.Quantity}$$
2. **Tổng hợp theo Nguyên liệu cơ sở**:
   - Gom nhóm theo `IngredientId`, tính tổng nhu cầu:
     $$\text{RequiredQuantity}(ingredient) = \sum \text{IngredientNeed}$$
   - Đảm bảo độ chính xác số học cao với kiểu dữ liệu `decimal(18, 4)` để không làm tròn mất định lượng gia vị nhỏ (gam, ml).
3. **Đối soát tồn kho khả dụng thực tế (`CurrentStock`)**:
   - Kế thừa logic tính tồn kho từ RM-005 và RM-011:
     $$\text{CurrentStock}(ingredient) = \sum \text{InventoryBatch.RemainingQuantity}$$
     (chỉ tính các lô `IsActive = true` và chưa quá hạn `ExpiryDate >= Now`).
4. **Tính số lượng gợi ý cần mua (Suggested Purchase)**:
   $$\text{SuggestedPurchaseQuantity} = \max(0, \text{RequiredQuantity} - \text{CurrentStock})$$
5. **Ước tính chi phí mua sắm**:
   $$\text{EstimatedCost} = \text{SuggestedPurchaseQuantity} \times (\text{Ingredient.EstimatedPrice} \mathbin{??} 0)$$

---

## 3. Nghiên cứu 3: Mô hình Lưu trữ & Vòng đời Kế hoạch Nguyên liệu (`IngredientPlan`)

### Bối cảnh & Vấn đề
Cần chốt cách lưu trữ Kế hoạch nguyên liệu: Lưu độc lập hay gắn với dự báo, và quản lý các trạng thái phê duyệt như thế nào để phục vụ công tác thu mua.

### Quyết định Kiến trúc (Decision)
- **Cặp thực thể kép**:
  - `DemandForecast` (Aggregate Root): Lưu trữ dự báo nhu cầu món ăn bán ra.
  - `IngredientPlan` (Aggregate Root): Lưu trữ kế hoạch nhu cầu nguyên liệu và gợi ý mua hàng sinh ra từ bản dự báo, liên kết trực tiếp qua khóa ngoại `DemandForecastId`.
- **Vòng đời trạng thái (`PlanStatus`)**:
  - Tận dụng enum `PlanStatus` đã có sẵn tại `Acme.TooHungry.Domain.Shared/Forecasts/PlanStatus.cs`:
    - `Draft = 0`: Bản nháp sinh tự động kèm bản dự báo, cho phép xem trước và cập nhật.
    - `Confirmed = 1` (Approved): Quản lý/Bếp trưởng đã duyệt kế hoạch mua sắm. Khi ở trạng thái này, giao diện khóa chỉnh sửa và mở tính năng in ấn/xuất Excel.
    - `Executed = 2` (Completed): Thủ kho xác nhận đã nhập mua và giao nhận đủ nguyên liệu cho bếp.
    - `Cancelled = 3`: Kế hoạch bị hủy bỏ.
- **Tính toàn vẹn**:
  - Khi xóa `DemandForecast`, quan hệ khóa ngoại `Cascade Delete` sẽ tự động dọn sạch các bản ghi `IngredientPlan` và `IngredientPlanItem` tương ứng.

---

## 4. Nghiên cứu 4: Phân tích Tài chính Dự toán (Projected Financials)

### Bối cảnh & Vấn đề
Nhà hàng cần biết trước hiệu quả kinh doanh của kỳ dự báo thông qua các chỉ số tài chính cốt lõi: Doanh thu dự kiến, Chi phí nguyên vật liệu lý thuyết và Tỷ lệ Food Cost %.

### Quyết định Kiến trúc (Decision)
Xây dựng DTO tổng hợp `ForecastFinancialSummaryDto` tính toán tại Backend và trả về kèm bản dự báo:
1. **Doanh thu dự kiến (Projected Revenue)**:
   $$\text{ProjectedRevenue} = \sum (\text{ForecastQuantity} \times \text{Dish.Price})$$
2. **Chi phí nguyên liệu dự kiến (Projected Ingredient Cost)**:
   $$\text{ProjectedCost} = \sum (\text{RequiredQuantity} \times \text{Ingredient.EstimatedPrice})$$
3. **Tỷ lệ Food Cost % dự kiến**:
   $$\text{FoodCostPercentage} = \begin{cases} 
   \frac{\text{ProjectedCost}}{\text{ProjectedRevenue}} \times 100\%, & \text{nếu } \text{ProjectedRevenue} > 0 \\
   0\%, & \text{ngược lại}
   \end{cases}$$
4. **Ngân sách mua sắm cần chi trả (Projected Purchase Budget)**:
   $$\text{ProjectedPurchaseBudget} = \sum (\text{SuggestedPurchaseQuantity} \times \text{Ingredient.EstimatedPrice})$$

---

## 5. Nghiên cứu 5: Giải pháp Xuất File Excel & Thiết kế In ấn CSS Print Khổ A4

### Bối cảnh & Vấn đề
Yêu cầu FR-008 đòi hỏi hỗ trợ cả 2 phương thức: Xuất file Excel bảng kê mua hàng và In phiếu chuẩn bị bếp ra giấy A4.

### Quyết định Kiến trúc (Decision)
1. **Xuất file Excel (`.xlsx` / CSV UTF-8 với BOM)**:
   - Cung cấp tính năng xuất bảng tính trực tiếp từ Client Angular:
     - Tạo file định dạng CSV có tiền tố Byte Order Mark (`\uFEFF`) để Microsoft Excel trên Windows tự động nhận diện đúng bảng mã UTF-8 tiếng Việt có dấu.
     - Đặt tên file tự động: `KeHoachMuaHang_YYYYMMDD_HHmm.csv`.
     - Bao gồm các cột chuẩn: STT, Mã nguyên liệu, Tên nguyên liệu, Đơn vị tính cơ sở, Nhu cầu chế biến, Tồn kho khả dụng, Số lượng cần mua thêm, Đơn giá ước tính, Thành tiền dự toán.
2. **In ấn phiếu A4 chuẩn bị bếp (CSS Print)**:
   - Sử dụng CSS Media Query `@media print`:
     - Thiết lập `@page { size: A4 portrait; margin: 15mm; }`.
     - Ẩn toàn bộ thành phần giao diện không cần thiết: `sidebar`, `topbar`, `tabs`, `buttons`, `breadcrumbs`, `footer`.
     - Hiển thị phần Header phiếu in trang trọng: Tên nhà hàng "Acme.TooHungry", Tiêu đề "PHIẾU CHUẨN BỊ NGUYÊN VẬT LIỆU", Mã dự báo, Kỳ dự báo (Từ ngày - Đến ngày), Ngày in.
     - Hiển thị bảng nguyên liệu với viền nét mảnh, độ tương phản cao, tối ưu tiết kiệm mực in.
     - Bổ sung chân trang có phần ký nhận: "Bếp trưởng" và "Thủ kho / Người mua hàng".

---

## 6. Nghiên cứu 6: Phân quyền & Trải nghiệm UI/UX Cam - Trắng

### Bối cảnh & Vấn đề
Phân hệ Dự báo là tính năng quản trị cao cấp, chỉ dành cho cấp Quản lý và Bếp trưởng. Giao diện phải tuân thủ nghiêm ngặt Hiến pháp VI (Bộ nhận diện Cam & Trắng) và Hiến pháp VII (Song ngữ i18n).

### Quyết định Kiến trúc (Decision)
1. **Hệ thống Quyền (Permissions)**:
   - Định nghĩa nhóm quyền `TooHungryPermissions.Forecasts`:
     - `Default`: Xem danh sách và chi tiết dự báo.
     - `Create`: Tạo mới dự báo và tính toán tự động.
     - `Edit`: Chỉnh sửa số lượng món ăn và ghi chú.
     - `Delete`: Xóa bản dự báo.
     - `Approve`: Phê duyệt Kế hoạch nguyên liệu (`Draft` -> `Confirmed`).
2. **Ngôn ngữ Thiết kế UI (Cam & Trắng)**:
   - Khối KPI đầu trang: 4 thẻ thống kê bo góc 12px với viền nổi nhẹ, biểu tượng màu cam `#EA580C`.
   - Bố cục 2 Tab chuyển đổi mượt mà:
     - Tab 1: **Dự báo Món ăn** (Bảng `SharedTable` liệt kê món, hình ảnh, danh mục, số lượng dự báo, thành tiền).
     - Tab 2: **Kế hoạch Nguyên liệu & Mua hàng** (Bảng `SharedTable` liệt kê nguyên liệu, nhu cầu, tồn kho, gợi ý mua, nút Xuất Excel và In phiếu).
3. **Đa ngôn ngữ (i18n)**:
   - Đồng bộ 100% các nhãn vào `vi.json` và `en.json` dưới tiền tố `TooHungry::Forecasts.*`.
