# Quyết định nghiên cứu & kiến ​​trúc: Món ăn, danh mục & liên kết công thức

**Tính năng**: `002-dishes-and-dish-categories`
**Focus**: Mục 3 - Liên kết Công thức định lượng (Recipe & RecipeIngredient)  
**Ngày**: 24-09-2026

---

## 1. Quyết định Kiến trúc 1: Mô hình Liên kết Dish - Recipe (Quan hệ 1 - 1)

### Quyết định:
- `Recipe` là một **Aggregate Root độc lập** (`FullAuditedAggregateRoot<Guid>`) sở hữu khóa ngoại `DishId` (`unique foreign key`) trỏ về `Dish`.
- Trên thực thể `Dish`, navigation property `public Recipe? Recipe { get; set; }` là **Tùy chọn (Optional / Nullable)**.
- Khi tạo mới một `Dish`, không bắt buộc phải tạo `Recipe`. Món ăn có thể được kinh doanh ngay (ví dụ: nước ngọt lon, bia, đồ ăn kèm sẵn).
- Khi tạo hoặc cập nhật công thức, `Recipe` sẽ được gắn với `DishId`. Mỗi món ăn tối đa chỉ có 1 công thức chuẩn (`1 - 1`).

### Lý do chọn (Rationale):
- **Phù hợp thực tế F&B**: Không phải mặt hàng nào trên thực đơn cũng cần chế biến (nhiều mặt hàng bán liền không qua bếp).
- **Phân tách trách nhiệm (Separation of Concerns)**: Bếp trưởng / Quản lý bếp có thể hoàn thiện công thức định lượng sau khi Quản lý nhà hàng đã lên khung thực đơn và giá bán.
- **Đồng bộ với Visual Paradigm (`RMS-TH.vpp`)**: Sơ đồ lớp định nghĩa `Dish (1) ── (1) Recipe` với `DishId` trong `Recipe`.

### Các giải pháp thay thế đã xem xét:
- *Bắt buộc tạo Recipe cùng Dish*: Gây cản trở và lỗi nhập liệu khi thêm các món nước đóng lon hoặc món ăn ngoài không cần định lượng bếp.
- *Nhúng Recipe làm Value Object bên trong Dish*: Vi phạm nguyên tắc DDD vì `Recipe` quản lý danh sách con `RecipeIngredient` phức tạp và có thể liên đới tới quy trình kiểm soát hao hụt kho độc lập.

---

## 2. Quyết định Kiến trúc 2: Định lượng Nguyên liệu (`RecipeIngredient`) & Đơn vị tính (`Unit`)

### Quyết định:
- `RecipeIngredient` là Entity thuộc Aggregate `Recipe` (`FullAuditedEntity<Guid>`).
- Cấu trúc gồm:
  - `RecipeId`: Khóa ngoại trỏ về `Recipe`.
  - `IngredientId`: Khóa ngoại trỏ về `Ingredient` (Nguyên liệu thô).
  - `Quantity`: Định lượng sử dụng (kiểu `decimal(18, 4)` để hỗ trợ các đơn vị lẻ như `0.005 kg` hoặc `15.5 ml`).
  - `Note`: Ghi chú kỹ thuật chế biến (vd: "thái hạt lựu", "ướp sốt 15p").
- Đơn vị tính: `Ingredient` liên kết với `Unit` (Đơn vị tính chuẩn: kg, g, ml, quả,...). Khi định lượng trong `RecipeIngredient`, số lượng `Quantity` luôn tuân theo đơn vị tính gốc của `Ingredient` để tránh sai số chuyển đổi.

### Lý do chọn:
- Hạn chế việc quy đổi đơn vị phức tạp ở giai đoạn đầu; mọi định lượng trong công thức đều neo theo đơn vị lưu kho chuẩn của nguyên liệu (`Ingredient.Unit`).
- Độ chính xác 4 số thập phân (`decimal(18, 4)`) là chuẩn cho ngành thực phẩm, đảm bảo tính toán vi lượng gia vị (hạt tiêu, muối, hương liệu) mà không bị làm tròn về 0.

---

## 3. Quyết định Kiến trúc 3: Tích hợp với Trừ kho POS & Kế hoạch Nguyên liệu

### Quyết định:
- Khi bán hàng qua POS (`006-pos-ordering-and-billing`):
  1. Khi một `OrderItem` được xác nhận thanh toán/chế biến, hệ thống kiểm tra `Dish.Recipe`.
  2. **Nếu Dish CÓ Recipe**: Hệ thống duyệt từng dòng `RecipeIngredient`, tính `Tổng tiêu hao = OrderItem.Quantity * RecipeIngredient.Quantity`, sau đó tự động trừ tồn kho nguyên liệu tương ứng trong `Inventory` và ghi nhận một bản ghi `InventoryTransaction` loại `Export` (Xuất kho chế biến).
  3. **Nếu Dish KHÔNG CÓ Recipe**: Bỏ qua bước trừ kho công thức (hoặc nếu sau này có module bán lẻ trực tiếp thì trừ kho sản phẩm đóng lon tương ứng).
- Khi lập Kế hoạch nguyên liệu (`IngredientPlan` từ `DemandForecast`):
  - Dự báo số lượng bán của `Dish` trong ngày (`DemandForecastItem.ExpectedQuantity`) sẽ được nhân với định lượng từng `RecipeIngredient` để ra tổng nhu cầu nguyên liệu cần nhập kho (`IngredientPlanItem.RequiredQuantity`).

---

## 4. Quyết định Kiến trúc 4: Chuẩn hóa Kiểu Tiền tệ (`decimal`) và Ngôn ngữ bản địa

### Quyết định:
- Tất cả thuộc tính giá tiền (`Dish.Price`, `OrderItem.UnitPrice`, `OrderItem.TotalPrice`) sử dụng `decimal` trong C# và `decimal(18, 2)` (hoặc `18, 0` cho VND) trong cơ sở dữ liệu.
- Định dạng tiền tệ hiển thị trên giao diện Angular theo chuẩn `vi-VN`: dấu chấm phân cách hàng nghìn (vd: `65.000 đ`).

---

## 5. Quyết định Kiến trúc 5: Quản lý Hình ảnh Cloudinary CDN & Fallback

### Quyết định:
- Frontend Angular hỗ trợ tải ảnh trực tiếp qua Cloudinary Upload Widget / REST API bằng unsigned upload preset hoặc signed backend endpoint.
- Nếu không có mạng hoặc chưa cấu hình Cloudinary, người dùng có thể dán trực tiếp đường dẫn URL ảnh bên ngoài (`https://...`).
- Trên UI có component directive `appImgFallback` để hiển thị ảnh placeholder mặc định SVG nếu link ảnh bị 404 hoặc mạng chập chờn.

---

## 6. Quyết định Kiến trúc 6: Kiểm toán Xóa món & Lý do Xóa (`DeletionReason`)

### Quyết định:
- Thực thể `Dish` bổ sung trường: `public string? DeletionReason { get; set; }` (tối đa 256 ký tự).
- Khi người dùng gửi request `DELETE /api/app/dish/{id}`, API nhận DTO `DeleteDishDto { string DeletionReason }`.
- Backend lưu `DeletionReason` vào bản ghi trước khi gọi `DeleteAsync` (ABP Soft Delete).
- Đồng thời, backend tìm tất cả các `DailyMenuItem` tham chiếu đến `DishId` này trong các thực đơn ngày đang kích hoạt và cập nhật trạng thái hiển thị của chúng.

---

## 7. Quyết định Kiến trúc 7: Thứ tự Hiển thị Danh mục (`DishCategory.DisplayOrder`)

### Quyết định:
- Bổ sung thuộc tính `DisplayOrder` (kiểu `int`, mặc định `0`) vào `DishCategory`.
- Các API truy vấn danh mục (`GetListAsync`, `GetMenuForPosAsync`) và giao diện Tab lọc trên Angular sẽ ưu tiên sắp xếp theo `DisplayOrder` tăng dần (`ASC`), sau đó mới đến `Name` (`ASC`).
- Tạo migration bổ sung cột `DisplayOrder` trong bảng `AppDishCategories`.

### Lý do chọn:
- Nhà hàng luôn có nhu cầu định hướng thực khách xem món theo trình tự bữa ăn chuẩn (Khai vị → Món chính → Món nướng/lẩu → Tráng miệng → Đồ uống). Sắp xếp theo chữ cái thuần túy sẽ làm đảo lộn trải nghiệm gọi món.

---

## 8. Quyết định Kiến trúc 8: Thao tác Hàng loạt (Bulk Operations) trên Giao diện Món ăn

### Quyết định:
- Bổ sung thanh công cụ thao tác hàng loạt (Bulk Actions Bar) xuất hiện khi người dùng chọn ít nhất 1 checkbox trên bảng danh sách món ăn.
- Cung cấp 2 tác vụ hàng loạt: `Bulk Activate` (Kích hoạt phục vụ các món đã chọn) và `Bulk Deactivate` (Tạm ngưng phục vụ các món đã chọn).
- Backend bổ sung API endpoint `POST /api/app/dish/bulk-toggle-active` nhận `{ List<Guid> DishIds, bool IsActive }`.
- **Tuyệt đối không hỗ trợ Bulk Delete**: Thao tác xóa món bắt buộc phải thực hiện từng món kèm xác nhận và nhập lý do `DeletionReason` để đảm bảo trách nhiệm kiểm toán.

---

## 9. Quyết định Kiến trúc 9: Chính sách Đơn giá Niêm yết (Gross Price) & Tra cứu theo Tên

### Quyết định:
- `Dish.Price` được quy định rõ là **Gross Price (Giá gộp)** — đã bao gồm toàn bộ thuế GTGT/VAT và phí phục vụ (nếu có).
- Khách hàng và nhân viên POS thanh toán chính xác theo đơn giá này. Bóc tách thuế (nếu cần cho hóa đơn tài chính) sẽ do module Hóa đơn/Thanh toán (RM-016) xử lý tính toán ngược.
- Món ăn không tạo trường `Code` / `SKU` riêng. Hệ thống sử dụng trực tiếp Tên món ăn (`Name`, đã có ràng buộc duy nhất không phân biệt hoa thường) kết hợp chuẩn hóa bỏ dấu để phục vụ tìm kiếm nhanh trên UI và POS.

---

## 10. Quyết định Kiến trúc 10: Giới hạn Phạm vi Món ăn Đơn lẻ (Single Dish Scope)

### Quyết định:
- Trong phạm vi RM-006, mọi món ăn trong danh mục đều là **Món ăn đơn lẻ (`Single Dish`)**.
- Các khái niệm Combo, Set thực đơn trọn gói, hoặc Thực đơn theo ngày sẽ được quản lý ở phân hệ Bán hàng POS (`POS` - RM-010) bằng cách liên kết nhiều `Dish` con. Điều này giữ cho Master Data món ăn luôn tinh gọn, chuẩn hóa và không bị trùng lặp trách nhiệm.

