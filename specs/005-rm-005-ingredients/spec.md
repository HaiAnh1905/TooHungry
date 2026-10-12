# Đặc tả Tính năng (Feature Specification): Quản lý Nguyên liệu (Ingredients) (RM-005)

**Nhánh Tính năng (Feature Branch)**: `005-rm-005-ingredients`

**Ngày tạo**: 2026-10-08

**Trạng thái**: Đã làm rõ (Clarified)

**Đầu vào**: Mô tả từ roadmap: "Danh sách nguyên liệu dùng để chế biến, lưu kho. Thực thể: Ingredient — list, tạo, sửa, xoá. Phụ thuộc: RM-004."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 08-10-2026 (Khởi tạo đặc tả RM-005)
- **Q1: Ràng buộc tính duy nhất của Tên nguyên liệu (`Name`)**: Hệ thống kiểm tra trùng lặp tên nguyên liệu như thế nào?
  → **A1**: Tên nguyên liệu (`Name`) là duy nhất trong toàn hệ thống (không phân biệt chữ hoa/thường, tự động loại bỏ khoảng trắng thừa ở hai đầu `Trim()`). Nếu người dùng nhập tên đã tồn tại ở trạng thái đang hoạt động, hệ thống từ chối và báo lỗi. Nếu tên đã tồn tại nhưng ở trạng thái Tạm ngưng (`IsActive = false`), hệ thống cảnh báo và gợi ý khôi phục (`SmartRestore`) thay vì tạo mới trùng lặp.
- **Q2: Liên kết giữa Nguyên liệu (`Ingredient`) và Đơn vị tính (`Unit` - RM-004)**: Đơn vị tính của nguyên liệu được quản lý như thế nào?
  → **A2**: Mỗi nguyên liệu bắt buộc phải gắn với một Đơn vị tính cơ bản (`BaseUnit` / `UnitId`) từ danh mục Đơn vị tính chuẩn của RM-004 (ví dụ: Kg, Gam, Lít, Lon, Chai, Thùng). Dropdown chọn đơn vị tính chỉ hiển thị các đơn vị đang hoạt động (`IsActive = true`). Ràng buộc khóa ngoại logic bảo đảm đơn vị tính không bị xóa khi đang có nguyên liệu sử dụng (đã được hiện thực tại `UnitManager.CheckCanDeleteAsync`).
- **Q3: Ràng buộc xóa nguyên liệu (Safe Delete Constraint)**: Khi nào nguyên liệu được phép xóa, và khi nào bị chặn xóa?
  → **A3**: Hệ thống BẮT BUỘC chặn xóa (ném `UserFriendlyException`) nếu nguyên liệu đã được gắn vào bất kỳ Công thức món ăn nào (`RecipeIngredient` - RM-007) hoặc đã có lô tồn kho (`InventoryBatch` - RM-011) có số lượng > 0 hoặc đã phát sinh giao dịch nhập/xuất kho. Khi bị chặn xóa, hệ thống hiển thị thông báo lỗi rõ ràng và hướng dẫn người dùng sử dụng tính năng "Tạm ngưng hoạt động" (`Deactivate`) thay vì xóa. Chỉ cho phép xóa (Soft Delete) đối với nguyên liệu mới tạo chưa phát sinh bất kỳ liên kết dữ liệu nào.
- **Q4: Vòng đời Tạm ngưng (`Deactivate`) và Kích hoạt lại (`Reactivate` / `SmartRestore`)**: Nghiệp vụ tạm ngưng và kích hoạt lại hoạt động ra sao?
  → **A4**:
  - Khi một nguyên liệu không còn sử dụng hoặc tạm hết hàng từ nhà cung cấp, quản lý có thể Tạm ngưng (`Deactivate`) kèm theo việc nhập lý do bắt buộc (`DeactivationReason`). Nguyên liệu tạm ngưng sẽ bị ẩn khỏi dropdown khi lập công thức món ăn mới (RM-007) hoặc nhập kho mới (RM-011), nhưng vẫn hiển thị trong báo cáo lịch sử và màn hình quản lý nguyên liệu (có huy hiệu "Tạm ngưng").
  - Quản lý có thể Kích hoạt lại (`Reactivate`) bất kỳ lúc nào, hoặc Khôi phục thông minh (`SmartRestore`) cho phép cập nhật lại ngưỡng tồn kho tối thiểu (`MinStock`).
- **Q5: Ngưỡng tồn kho tối thiểu (`MinStock`) và Cảnh báo sắp hết hàng**: Mục đích của trường `MinStock` là gì và hiển thị như thế nào?
  → **A5**: `MinStock` là số lượng tồn tối thiểu cần duy trì trong kho để đảm bảo hoạt động nấu nướng không bị gián đoạn (mặc định bằng 0, độ chính xác 4 chữ số thập phân). Trên bảng danh sách nguyên liệu, hệ thống tính toán Tồn kho hiện tại (`CurrentStock` tổng hợp từ các lô hàng `InventoryBatch`). Nếu `CurrentStock <= MinStock`, dòng nguyên liệu sẽ hiển thị cảnh báo trực quan (huy hiệu màu cam/đỏ "Sắp hết hàng" hoặc "Hết hàng") giúp nhân viên nhận diện nhu cầu nhập hàng ngay lập tức.
- **Q6: Loại bảo quản (`StorageType`) và Phương thức tiêu hao (`ConsumptionMethod`)**: Hai thuộc tính này có ý nghĩa gì?
  → **A6**:
  - `StorageType`: Phân loại điều kiện lưu kho gồm `SHORT_TERM` (Ngắn hạn / Thực phẩm tươi sống, cần bảo quản lạnh/mát) và `LONG_TERM` (Dài hạn / Hàng khô, gia vị, đồ hộp).
  - `ConsumptionMethod`: Xác định cách thức trừ kho gồm `RECIPE` (Tự động trừ tồn kho theo định lượng công thức món ăn khi đơn hàng hoàn tất - RM-007/RM-010) và `MANUAL` (Trừ kho thủ công theo ca/ngày thông qua kiểm kê hoặc xuất hủy - RM-011).
- **Q7: Ràng buộc chỉnh sửa Đơn vị tính (`BaseUnit` / `UnitId`)**: Hệ thống có cho phép chỉnh sửa Đơn vị tính của một Nguyên liệu sau khi đã phát sinh lô tồn kho hoặc đã được gắn vào công thức món ăn không?
  → **A7**: Khóa không cho phép sửa. Nếu nguyên liệu đã phát sinh ít nhất một lô tồn kho (`InventoryBatch` - RM-011) hoặc đã được gắn vào công thức món ăn (`RecipeIngredient` - RM-007), trường Đơn vị tính (`BaseUnit` / `UnitId`) BẮT BUỘC bị vô hiệu hóa (disabled / read-only) trên form chỉnh sửa và backend chặn cập nhật (`UserFriendlyException`). Người dùng muốn đổi đơn vị đo lường phải Tạm ngưng (`Deactivate`) nguyên liệu cũ và tạo nguyên liệu mới để đảm bảo tính toàn vẹn 100% của số liệu tồn kho và tỷ lệ định lượng.
- **Q8: Quản lý Đơn giá tham khảo (`EstimatedPrice`)**: Trong danh mục Nguyên liệu, hệ thống có quản lý trường đơn giá tham khảo không?
  → **A8**: Có. Bổ sung trường tùy chọn `EstimatedPrice` (decimal >= 0, độ chính xác 18, 2, mặc định 0) trong thực thể `Ingredient`. Trường này đóng vai trò đơn giá tham khảo cho 1 đơn vị cơ bản (`BaseUnit`), phục vụ tính toán chi phí giá vốn lý thuyết (Food Cost) khi thiết lập Công thức món ăn (RM-007). Giá vốn thực tế xuất nhập kho kế toán vẫn được quản lý chuẩn xác theo từng lô hàng (`InventoryBatch` thuộc RM-011).
- **Q9: Ranh giới Tồn kho ban đầu (Initial Stock Boundary)**: Khi tạo mới một Nguyên liệu (RM-005), hệ thống có cho phép nhập trực tiếp số lượng tồn kho ban đầu không?
  → **A9**: Tuyệt đối không. RM-005 thuần túy là phân hệ Dữ liệu danh mục nền tảng (Master Data). Toàn bộ biến động số lượng tồn kho và các lô hàng BẮT BUỘC phải được tạo thông qua Phiếu nhập kho theo lô tại phân hệ Quản lý kho (RM-011) để bảo đảm theo dõi hạn sử dụng, số lô và dấu vết kiểm toán kế toán kho (`Audit Trail`). Màn hình RM-005 chỉ hiển thị trường `CurrentStock` ở chế độ chỉ đọc (read-only) được tổng hợp từ các lô kho hoạt động.
- **Q10: Quy tắc tính Tồn kho an toàn (`CurrentStock`) đối với Lô hết hạn**: Tồn kho hiện tại (`CurrentStock`) hiển thị trên bảng danh sách nguyên liệu được tính toán ra sao khi có các lô kho đã quá hạn sử dụng?
  → **A10**: `CurrentStock` chỉ tính tổng số lượng của các lô hàng đang hoạt động và CÒN HẠN SỬ DỤNG (`ExpiryDate >= Hôm nay` hoặc không thiết lập hạn). Điều này bảo đảm số liệu phản ánh chính xác lượng nguyên liệu an toàn sẵn sàng cho bếp chế biến. NẾU nguyên liệu có tồn kho ở các lô đã quá hạn sử dụng (`ExpiryDate < Hôm nay`), hệ thống BẮT BUỘC hiển thị thêm một chỉ báo/huy hiệu cảnh báo trực quan riêng biệt (ví dụ: *"Có lô quá hạn chờ xử lý"*) để nhắc nhở nhân viên kho thực hiện thủ tục xuất hủy tại RM-011.
- **Q11: Trạng thái hiển thị mặc định trên giao diện danh sách**: Khi người dùng truy cập màn hình `/ingredients`, danh sách nguyên liệu mặc định hiển thị theo trạng thái hoạt động nào?
  → **A11**: Mặc định chỉ hiển thị các nguyên liệu Đang hoạt động (`IsActive = true`). Bộ lọc trạng thái trên thanh công cụ được đặt mặc định là "Đang hoạt động", cho phép người dùng linh hoạt chuyển đổi sang "Tạm ngưng" hoặc "Tất cả" khi cần tra cứu các nguyên liệu cũ.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Quản lý Nguyên liệu (Ingredients) (RM-005)** thuộc phân hệ Dữ liệu danh mục nền tảng (Master Data, Wave 1). Đây là mắt xích trung tâm kết nối giữa Đơn vị tính (RM-004), Công thức định lượng món ăn (RM-007), Quản lý kho theo lô (RM-011, RM-012, RM-013), và Dự báo nguyên liệu (RM-014).

Màn hình Quản lý Nguyên liệu cho phép Quản lý nhà hàng, Bếp trưởng hoặc Quản lý kho:
1. **Xem danh sách nguyên liệu toàn diện**: Hiển thị tên nguyên liệu, đơn vị tính chuẩn, loại bảo quản, cách thức tiêu hao, định mức tồn tối thiểu, tồn kho thực tế hiện tại, và trạng thái kích hoạt.
2. **Tìm kiếm & Lọc đa chiều**: Tìm nhanh theo tên/đơn vị tính; lọc theo trạng thái (Đang dùng / Tạm ngưng), loại bảo quản (Ngắn hạn / Dài hạn), phương thức tiêu hao (Theo công thức / Thủ công), và trạng thái cảnh báo tồn kho (Dưới định mức).
3. **Thêm mới nguyên liệu**: Chọn đơn vị tính từ danh mục RM-004, thiết lập định mức tồn tối thiểu, kiểm tra trùng tên tự động với cơ chế phát hiện nguyên liệu cũ đang tạm ngưng để gợi ý khôi phục.
4. **Chỉnh sửa thông tin**: Cập nhật tên, đơn vị tính, định mức tồn tối thiểu, loại bảo quản và phương thức tiêu hao.
5. **Quản lý vòng đời an toàn (Deactivate / Reactivate / SmartRestore)**: Tạm ngưng nguyên liệu có ghi nhận lý do mà không làm mất lịch sử giao dịch; kích hoạt lại hoặc khôi phục với định mức tồn mới.
6. **Xóa an toàn (Safe Delete)**: Chặn xóa nếu nguyên liệu đang nằm trong công thức món ăn hoặc đã có lô hàng tồn kho.

**Giao diện (Frontend)**: Xây dựng màn hình chuyên biệt tại `/ingredients` trên Angular, tích hợp vào menu sidebar dưới nhóm Kho (`::Menu:InventoryGroup`), sử dụng 100% Shared UI từ RM-002 (`shared-table`, `shared-modal`, `custom-select`, bộ nhận diện thương hiệu Cam & Trắng - Orange & White Theme theo Hiến pháp Acme.TooHungry).

**Backend**: Hoàn thiện và chuẩn hóa tầng Domain & Application (`Ingredient`, `IIngredientAppService`, `IngredientAppService`, `IngredientController`, DTOs, AutoMapper profile, cơ chế bảo vệ xóa an toàn, phân quyền `TooHungryPermissions.Ingredients`).

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Xem danh sách Nguyên liệu và Tồn kho (Ưu tiên: P1)

Là một Quản lý nhà hàng hoặc Quản lý kho, tôi muốn xem danh sách toàn bộ nguyên liệu kèm theo đơn vị tính, loại bảo quản, tồn kho hiện tại và trạng thái cảnh báo để theo dõi nhanh tình hình nguyên vật liệu của nhà hàng.

**Lý do ưu tiên**: Đây là màn hình tổng quan cốt lõi phục vụ tra cứu hàng ngày của bộ phận bếp và kho.

**Kiểm thử Độc lập**: Truy cập màn hình `/ingredients`, hệ thống hiển thị bảng danh sách nguyên liệu với đầy đủ thông tin phân trang, tìm kiếm và trạng thái tồn kho.

**Kịch bản Chấp nhận**:
1. **Cho trước** người dùng có quyền xem nguyên liệu (`TooHungryPermissions.Ingredients.Default`), **Khi** truy cập trang `/ingredients`, **Thì** hệ thống mặc định lọc và hiển thị danh sách các nguyên liệu Đang hoạt động (`IsActive = true`), bộ lọc trạng thái được đặt mặc định là "Đang dùng", bảng gồm các cột: Tên nguyên liệu, Đơn vị tính, Loại bảo quản (Ngắn hạn / Dài hạn), Phương thức tiêu hao (Theo công thức / Thủ công), Định mức tồn tối thiểu (`MinStock`), Đơn giá tham khảo (`EstimatedPrice`), Tồn kho hiện tại (`CurrentStock`), Trạng thái (Đang dùng / Tạm ngưng), Thao tác (Sửa, Tạm ngưng/Kích hoạt, Xóa).
2. **Cho trước** danh sách nguyên liệu có nguyên liệu với `CurrentStock <= MinStock`, **Khi** xem danh sách, **Thì** hệ thống hiển thị huy hiệu cảnh báo nổi bật (màu cam "Sắp hết hàng" hoặc màu đỏ "Hết hàng") tại cột tồn kho.
3. **Cho trước** danh sách nguyên liệu, **Khi** người dùng nhập từ khóa tìm kiếm (ví dụ: "Thịt bò" hoặc "kg"), **Thì** danh sách tự động lọc ra các nguyên liệu có tên hoặc đơn vị tính phù hợp.
4. **Cho trước** danh sách nguyên liệu, **Khi** người dùng chọn bộ lọc theo Loại bảo quản, Phương thức tiêu hao, hoặc Trạng thái hoạt động, **Thì** bảng dữ liệu cập nhật chính xác theo tiêu chí lọc.
5. **Cho trước** nguyên liệu có các lô hàng kho đã quá hạn sử dụng, **Khi** xem danh sách, **Thì** `CurrentStock` chỉ tính tổng số lượng các lô còn hạn sử dụng, đồng thời hiển thị huy hiệu/tooltip cảnh báo riêng báo hiệu có lô quá hạn chờ xuất hủy.

---

### User Story 2 - Thêm mới Nguyên liệu (Ưu tiên: P1)

Là một Quản lý kho hoặc Bếp trưởng, tôi muốn thêm mới một nguyên liệu vào hệ thống (ví dụ: "Thịt bò Wagyu", đơn vị "Kg", loại bảo quản "Ngắn hạn", tiêu hao "Theo công thức", tồn tối thiểu "5 kg") để đưa vào sử dụng làm công thức món ăn và nhập kho.

**Lý do ưu tiên**: Cho phép mở rộng danh mục nguyên liệu phục vụ thực đơn và mua hàng.

**Kiểm thử Độc lập**: Nhấn nút "Thêm mới", điền thông tin hợp lệ và lưu, nguyên liệu mới xuất hiện ngay trên danh sách.

**Kịch bản Chấp nhận**:
1. **Cho trước** người dùng ở màn hình `/ingredients`, **Khi** nhấn nút "Thêm mới", **Thì** hệ thống mở modal form thêm mới nguyên liệu với các trường:
   - Tên nguyên liệu (bắt buộc, text).
   - Đơn vị tính (bắt buộc, dropdown chọn từ danh mục `Unit` của RM-004 đang hoạt động).
   - Định mức tồn tối thiểu (`MinStock`, số >= 0, mặc định 0).
   - Đơn giá tham khảo (`EstimatedPrice`, không bắt buộc, số >= 0, mặc định 0, tính theo 1 đơn vị cơ bản).
   - Loại bảo quản (dropdown: Ngắn hạn / Dài hạn, mặc định Ngắn hạn).
   - Phương thức tiêu hao (dropdown: Theo công thức / Thủ công, mặc định Theo công thức).
   *(Lưu ý: Form không có ô nhập số lượng tồn kho thực tế; tồn kho ban đầu bắt buộc tạo qua phiếu nhập kho theo lô ở RM-011)*.
2. **Cho trước** form thêm mới, **Khi** người dùng nhập đầy đủ thông tin hợp lệ và nhấn "Lưu", **Thì** hệ thống lưu thành công, hiển thị toast thông báo thành công, đóng modal và tải lại danh sách với nguyên liệu mới.
3. **Cho trước** form thêm mới, **Khi** người dùng nhập tên nguyên liệu đã tồn tại và đang hoạt động (ví dụ: "Thịt ba chỉ"), **Thì** hệ thống hiển thị thông báo lỗi "Tên nguyên liệu đã tồn tại trong hệ thống!" và chặn lưu.
4. **Cho trước** form thêm mới, **Khi** người dùng nhập tên nguyên liệu đã từng tồn tại nhưng đang bị tạm ngưng (`IsActive = false`), **Thì** hệ thống hiển thị hộp thoại cảnh báo: *"Nguyên liệu này đã tồn tại và đang bị tạm ngưng. Bạn có muốn kích hoạt lại nguyên liệu này không?"* kèm nút "Kích hoạt lại" (`SmartRestore`).

---

### User Story 3 - Chỉnh sửa thông tin Nguyên liệu (Ưu tiên: P1)

Là một Quản lý kho, tôi muốn chỉnh sửa thông tin của một nguyên liệu (ví dụ: điều chỉnh định mức tồn tối thiểu từ 5 lên 10 kg, hoặc đổi phân loại bảo quản) khi quy trình vận hành thay đổi.

**Lý do ưu tiên**: Giữ cho thông tin quản lý nguyên liệu luôn chính xác và phù hợp với thực tế vận hành.

**Kiểm thử Độc lập**: Nhấn nút "Sửa" ở một dòng nguyên liệu, thay đổi định mức tồn tối thiểu và lưu, bảng dữ liệu cập nhật giá trị mới.

**Kịch bản Chấp nhận**:
1. **Cho trước** một nguyên liệu trên danh sách, **Khi** người dùng nhấn nút "Sửa", **Thì** modal mở ra và điền sẵn dữ liệu hiện tại của nguyên liệu đó.
2. **Cho trước** form chỉnh sửa, **Khi** người dùng thay đổi định mức tồn tối thiểu (`MinStock`) hoặc đổi loại bảo quản và nhấn "Lưu", **Thì** hệ thống cập nhật thành công, hiển thị thông báo thành công và đóng modal.
3. **Cho trước** form chỉnh sửa, **Khi** người dùng đổi tên nguyên liệu thành một tên trùng với nguyên liệu khác trong hệ thống, **Thì** hệ thống báo lỗi trùng lặp và chặn lưu.
4. **Cho trước** form chỉnh sửa của một nguyên liệu đã có lô hàng tồn kho hoặc đã nằm trong công thức món ăn, **Khi** form mở ra, **Thì** trường chọn Đơn vị tính bị khóa (read-only / disabled) kèm tooltip giải thích lý do để ngăn chặn sai lệch số liệu tồn kho và định lượng.

---

### User Story 4 - Tạm ngưng và Kích hoạt lại Nguyên liệu (Ưu tiên: P2)

Là một Quản lý nhà hàng, tôi muốn tạm ngưng một nguyên liệu (kèm theo lý do) khi nhà cung cấp ngừng cung ứng hoặc nhà hàng đổi menu theo mùa, và có thể kích hoạt lại khi có hàng trở lại.

**Lý do ưu tiên**: Quản lý vòng đời nguyên liệu mềm dẻo, ngăn việc chọn nhầm nguyên liệu đã ngừng dùng vào công thức hoặc đơn nhập kho mới mà không làm mất lịch sử kế toán kho.

**Kiểm thử Độc lập**: Thực hiện tạm ngưng một nguyên liệu với lý do, kiểm tra trạng thái chuyển sang "Tạm ngưng", sau đó thực hiện kích hoạt lại.

**Kịch bản Chấp nhận**:
1. **Cho trước** một nguyên liệu đang hoạt động, **Khi** người dùng nhấn thao tác "Tạm ngưng", **Thì** hệ thống hiển thị modal yêu cầu nhập lý do tạm ngưng (bắt buộc, ví dụ: "Hết hàng từ nhà cung cấp").
2. **Cho trước** modal tạm ngưng, **Khi** người dùng nhập lý do và xác nhận, **Thì** hệ thống cập nhật `IsActive = false`, ghi nhận `DeactivationReason`, hiển thị huy hiệu "Tạm ngưng" trên bảng và toast thông báo thành công.
3. **Cho trước** một nguyên liệu đang tạm ngưng, **Khi** người dùng nhấn thao tác "Kích hoạt lại", **Thì** hệ thống mở modal cho phép xác nhận và tùy chọn cập nhật lại định mức tồn tối thiểu mới (`NewMinStock`), sau khi xác nhận thì `IsActive = true`, xóa lý do tạm ngưng và nguyên liệu hoạt động trở lại bình thường.

---

### User Story 5 - Xóa an toàn Nguyên liệu (Ưu tiên: P2)

Là một Quản trị viên, tôi muốn xóa những nguyên liệu được tạo nhầm trong lúc kiểm thử hoặc nhập sai mà chưa phát sinh giao dịch nào, đồng thời được bảo vệ tuyệt đối không xóa nhầm nguyên liệu đang được dùng.

**Lý do ưu tiên**: Dọn dẹp dữ liệu rác an toàn, đảm bảo tính toàn vẹn dữ liệu chuỗi cung ứng và công thức món ăn.

**Kiểm thử Độc lập**: Thử xóa nguyên liệu chưa liên kết (thành công), nguyên liệu đã gắn vào công thức món ăn (bị chặn), và nguyên liệu đã có lô kho (bị chặn).

**Kịch bản Chấp nhận**:
1. **Cho trước** một nguyên liệu mới tạo chưa từng được sử dụng trong công thức (`RecipeIngredient`) và chưa có lô hàng kho (`InventoryBatch`), **Khi** người dùng nhấn "Xóa" và xác nhận trên modal cảnh báo, **Thì** hệ thống thực hiện Soft Delete và xóa nguyên liệu khỏi danh sách.
2. **Cho trước** một nguyên liệu đang được sử dụng trong ít nhất một công thức món ăn (`RecipeIngredient`), **Khi** người dùng nhấn "Xóa" và xác nhận, **Thì** hệ thống từ chối xóa, ném thông báo lỗi thân thiện giải thích rằng nguyên liệu đang được dùng trong công thức món ăn và gợi ý chuyển sang "Tạm ngưng".
3. **Cho trước** một nguyên liệu đã có lô hàng tồn kho (`InventoryBatch`), **Khi** người dùng nhấn "Xóa" và xác nhận, **Thì** hệ thống từ chối xóa, ném thông báo lỗi giải thích rằng nguyên liệu đã có dữ liệu lô kho và yêu cầu sử dụng chức năng "Tạm ngưng".

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

1. **Tên nguyên liệu chứa khoảng trắng thừa**: Người dùng nhập `"   Thịt bò Mỹ   "`, hệ thống tự động loại bỏ khoảng trắng thừa (`Trim()`) thành `"Thịt bò Mỹ"` trước khi kiểm tra trùng lặp và lưu trữ.
2. **Trùng lặp không phân biệt hoa thường**: `"thịt bò"`, `"Thịt Bò"`, `"THỊT BÒ"` được coi là cùng một nguyên liệu và bị chặn tạo mới trùng lặp.
3. **Tên nguyên liệu trùng với nguyên liệu đã tạm ngưng**: Hệ thống không báo lỗi chung chung mà thông báo rõ nguyên liệu đã tồn tại ở trạng thái tạm ngưng, cung cấp tùy chọn khôi phục nhanh (`SmartRestore`).
4. **Định mức tồn tối thiểu (`MinStock`) âm**: Người dùng cố tình nhập giá trị âm (ví dụ: -5), hệ thống chặn ngay tại validator của frontend và backend validation ném `BusinessException`.
5. **Đơn vị tính bị vô hiệu hóa trong lúc tạo nguyên liệu**: Nếu một đơn vị tính bị tắt kích hoạt (`IsActive = false`) ở RM-004, đơn vị đó không xuất hiện trong dropdown chọn đơn vị tính của màn hình Nguyên liệu mới.
6. **Xóa nguyên liệu có liên kết**: Chặn xóa và hướng dẫn người dùng chuyển sang trạng thái "Tạm ngưng" (`Deactivate`) để bảo vệ dữ liệu lịch sử kế toán kho và công thức.
7. **Cố tình đổi Đơn vị tính của nguyên liệu đã có dữ liệu vận hành**: Hệ thống khóa trường Đơn vị tính trên giao diện và backend từ chối cập nhật (`UserFriendlyException`), thông báo người dùng phải Tạm ngưng và tạo nguyên liệu mới.
8. **Lô hàng quá hạn sử dụng**: Tự động loại trừ khỏi `CurrentStock` khả dụng phục vụ bếp, kích hoạt chỉ báo cảnh báo lô quá hạn riêng để bảo đảm 100% an toàn vệ sinh thực phẩm.
9. **Hiển thị tồn kho khi chưa có lô hàng nào**: Nếu nguyên liệu chưa từng có lô nhập kho nào, `CurrentStock` hiển thị bằng 0 kèm huy hiệu cảnh báo (nếu `MinStock > 0`).

---

## 4. Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cung cấp giao diện quản lý danh sách Nguyên liệu chuyên biệt tại route `/ingredients` dưới dạng bảng dữ liệu (`shared-table`), hỗ trợ phân trang, tìm kiếm theo tên hoặc đơn vị tính, sắp xếp theo tên hoặc thời gian tạo.
- **FR-002**: Hệ thống PHẢI tích hợp bộ lọc đa tiêu chí trên danh sách nguyên liệu:
  - Lọc theo Loại bảo quản (`StorageType`: Tất cả, Ngắn hạn, Dài hạn).
  - Lọc theo Phương thức tiêu hao (`ConsumptionMethod`: Tất cả, Theo công thức, Thủ công).
  - Lọc theo Trạng thái hoạt động (`IsActive`: Đang dùng [mặc định], Tạm ngưng, Tất cả).
  - Lọc theo Tình trạng tồn kho (Tất cả, Sắp hết hàng / Dưới định mức).
- **FR-003**: Hệ thống PHẢI cho phép Thêm mới nguyên liệu với các trường:
  - Tên nguyên liệu (`Name`): Bắt buộc, độ dài 1-128 ký tự, duy nhất trong hệ thống (không phân biệt hoa thường).
  - Đơn vị tính (`BaseUnit` / `UnitId`): Bắt buộc, chọn từ danh mục Đơn vị tính (`Unit`) đang kích hoạt (`IsActive = true`) của RM-004.
  - Định mức tồn tối thiểu (`MinStock`): Bắt buộc, số thập phân >= 0, mặc định 0.
  - Đơn giá tham khảo (`EstimatedPrice`): Tùy chọn, số thập phân >= 0 (độ chính xác 18, 2), mặc định 0, dùng để ước tính chi phí công thức (RM-007).
  - Loại bảo quản (`StorageType`): Bắt buộc, enum `SHORT_TERM` (mặc định) hoặc `LONG_TERM`.
  - Phương thức tiêu hao (`ConsumptionMethod`): Bắt buộc, enum `RECIPE` (mặc định) hoặc `MANUAL`.
  - Tuyệt đối KHÔNG có trường nhập tồn kho thực tế ban đầu tại form RM-005; toàn bộ tồn kho phải được tạo qua phiếu nhập kho theo lô ở RM-011.
- **FR-004**: Hệ thống PHẢI cho phép Chỉnh sửa thông tin nguyên liệu hiện có (Tên, Đơn vị tính, Định mức tồn tối thiểu, Đơn giá tham khảo, Loại bảo quản, Phương thức tiêu hao) qua modal form (`shared-modal`). NẾU nguyên liệu đã phát sinh lô hàng tồn kho (`InventoryBatch`) hoặc đã nằm trong công thức món ăn (`RecipeIngredient`), trường Đơn vị tính (`BaseUnit` / `UnitId`) BẮT BUỘC PHẢI bị khóa (read-only / disabled) trên giao diện và backend BẮT BUỘC PHẢI từ chối thay đổi đơn vị tính với `UserFriendlyException`.
- **FR-005**: Hệ thống PHẢI kiểm tra tính duy nhất của Tên nguyên liệu khi Tạo mới và khi Cập nhật. Nếu tên trùng với nguyên liệu đang hoạt động, PHẢI ném `BusinessException("Ingredient:NameAlreadyExists")`. Nếu tên trùng với nguyên liệu đang tạm ngưng, PHẢI ném `BusinessException("Ingredient:AlreadyExistsInactive")` kèm thông tin Id để hỗ trợ gợi ý khôi phục.
- **FR-006**: Hệ thống PHẢI cung cấp tính năng Tạm ngưng hoạt động (`Deactivate`) cho nguyên liệu:
  - Yêu cầu nhập lý do bắt buộc (`DeactivationReason`, tối đa 500 ký tự).
  - Cập nhật `IsActive = false` và lưu lý do.
  - Khi tạm ngưng, nguyên liệu PHẢI bị ẩn khỏi các dropdown chọn nguyên liệu khi tạo công thức món ăn mới (RM-007) hoặc nhập kho mới (RM-011).
- **FR-007**: Hệ thống PHẢI cung cấp tính năng Kích hoạt lại (`Reactivate`) và Khôi phục thông minh (`SmartRestore`):
  - Khôi phục trạng thái `IsActive = true` và xóa lý do tạm ngưng.
  - Cho phép người dùng tùy chọn cập nhật lại `MinStock` mới.
- **FR-008**: Hệ thống PHẢI kiểm tra ràng buộc trước khi Xóa nguyên liệu:
  - Nếu nguyên liệu đang được tham chiếu trong bất kỳ Công thức món ăn nào (`RecipeIngredient`), PHẢI chặn xóa và ném `UserFriendlyException`.
  - Nếu nguyên liệu đã phát sinh các lô hàng tồn kho (`InventoryBatch`), PHẢI chặn xóa và ném `UserFriendlyException`.
  - Chỉ cho phép xóa mềm (Soft Delete qua ABP) khi nguyên liệu không có bất kỳ ràng buộc nào nói trên.
- **FR-009**: Hệ thống PHẢI tính toán và hiển thị Tồn kho hiện tại (`CurrentStock`) cho từng nguyên liệu dựa trên tổng số lượng còn lại của các lô hàng đang hoạt động và CÒN HẠN SỬ DỤNG (`InventoryBatch.RemainingQuantity` với `ExpiryDate == null || ExpiryDate >= Today`). Nếu `CurrentStock <= MinStock`, hệ thống PHẢI hiển thị huy hiệu cảnh báo trực quan ("Sắp hết hàng" / "Hết hàng"). Nếu nguyên liệu có các lô hàng đã quá hạn sử dụng, hệ thống PHẢI hiển thị chỉ báo cảnh báo lô quá hạn riêng biệt để hỗ trợ quản lý kho xuất hủy (RM-011).
- **FR-010**: Hệ thống PHẢI cấu hình phân quyền ABP Permissions cho module Ingredients bao gồm:
  - `TooHungryPermissions.Ingredients.Default` (Quyền xem danh sách)
  - `TooHungryPermissions.Ingredients.Create` (Quyền tạo mới)
  - `TooHungryPermissions.Ingredients.Edit` (Quyền chỉnh sửa, tạm ngưng, kích hoạt lại)
  - `TooHungryPermissions.Ingredients.Delete` (Quyền xóa an toàn)
- **FR-011**: Hệ thống PHẢI bổ sung mục điều hướng "Nguyên liệu" (`::Menu:Ingredients`) vào thanh menu sidebar (trong `route.provider.ts`) dưới nhóm Kho (`::Menu:InventoryGroup`), kiểm soát hiển thị bằng quyền `TooHungryPermissions.Ingredients.Default`.
- **FR-012**: Toàn bộ giao diện PHẢI hỗ trợ đa ngôn ngữ (I18N), cập nhật đầy đủ và đồng bộ 100% trong `vi.json` và `en.json`.
- **FR-013**: Giao diện PHẢI tuân thủ triệt để Hiến pháp Acme.TooHungry (Bộ nhận diện Cam & Trắng - Orange & White Theme, Shared Components từ RM-002, bo tròn góc, shadow tinh tế, responsive và micro-interactions mượt mà).

### Yêu cầu Phi chức năng & Kiến trúc (Non-Functional Requirements)

- **NFR-001 (Kiến trúc DDD)**: Tuân thủ cấu trúc phân lớp ABP Framework: Thực thể `Ingredient` tại `Domain`, dịch vụ ứng dụng `IngredientAppService` tại `Application`, hợp đồng `IIngredientAppService` tại `Application.Contracts`, Controller tại `HttpApi`, giao diện tại `Angular`.
- **NFR-002 (Bảo mật & Kiểm toán)**: Thực thể `Ingredient` kế thừa `FullAuditedAggregateRoot<Guid>`, tự động ghi nhận người tạo, thời gian tạo, người sửa, thời gian sửa và hỗ trợ Soft Delete (`IsDeleted`). Tất cả API PHẢI được gắn `[Authorize]` theo đúng phân quyền.
- **NFR-003 (Hiệu năng)**: Thời gian phản hồi API truy vấn danh sách nguyên liệu dưới 200ms với tập dữ liệu thông thường; giao diện chuyển trang và lọc dữ liệu mượt mà, không giật lag.

### Các Thực thể Chính (Key Entities)

- **Ingredient**:
  - `Id`: `Guid` (Khóa chính).
  - `Name`: `string` (Tên nguyên liệu, độ dài tối đa 128 ký tự, Unique).
  - `BaseUnit`: `string` (Tên/Ký hiệu đơn vị tính cơ bản, độ dài tối đa 32 ký tự, liên kết logic với `Unit.Name` hoặc `Unit.Abbreviation` của RM-004).
  - `MinStock`: `decimal` (Ngưỡng cảnh báo tồn kho tối thiểu, Precision 18, 4, >= 0).
  - `EstimatedPrice`: `decimal` (Đơn giá tham khảo cho 1 `BaseUnit`, Precision 18, 2, >= 0, mặc định 0).
  - `StorageType`: `StorageType` (Enum: `SHORT_TERM` = 0, `LONG_TERM` = 1).
  - `ConsumptionMethod`: `ConsumptionMethod` (Enum: `RECIPE` = 0, `MANUAL` = 1).
  - `IsActive`: `bool` (Cờ trạng thái hoạt động, mặc định `true`).
  - `DeactivationReason`: `string?` (Lý do tạm ngưng sử dụng, tối đa 500 ký tự).
  - Các trường kiểm toán từ `FullAuditedAggregateRoot<Guid>`.

---

## 5. Tiêu chí Thành công (Success Criteria)

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: Người dùng có quyền có thể xem, tìm kiếm, lọc danh sách và thực hiện Thêm mới / Chỉnh sửa một nguyên liệu hoàn tất trong dưới 30 giây.
- **SC-002**: 100% các trường hợp nhập trùng tên nguyên liệu đang hoạt động đều bị chặn với thông báo lỗi rõ ràng bằng đúng ngôn ngữ người dùng đang chọn.
- **SC-003**: 100% các trường hợp nhập tên nguyên liệu trùng với nguyên liệu đang tạm ngưng đều được hệ thống phát hiện và gợi ý kích hoạt lại (`SmartRestore`).
- **SC-004**: 100% các trường hợp cố ý xóa một nguyên liệu đang gắn trong công thức món ăn hoặc đang có lô hàng tồn kho đều bị chặn thành công, bảo vệ tính toàn vẹn dữ liệu kế toán kho.
- **SC-005**: 100% các nguyên liệu có tồn kho hiện tại dưới hoặc bằng định mức tồn tối thiểu (`CurrentStock <= MinStock`) đều hiển thị cảnh báo trực quan nổi bật trên bảng danh sách.
- **SC-006**: Dropdown chọn đơn vị tính khi tạo/sửa nguyên liệu chỉ hiển thị các đơn vị tính đang hoạt động (`IsActive = true`) từ danh mục RM-004.
- **SC-007**: Mọi văn bản trên giao diện đều chuyển đổi chính xác khi người dùng đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh (không còn text hardcode).
- **SC-008**: Giao diện sử dụng 100% Shared UI từ RM-002 với phong cách Cam & Trắng đồng nhất toàn hệ thống.

---

## 6. Các Giả định (Assumptions)

- **Quản lý Đơn vị tính (RM-004)**: Đã hoàn thành, cung cấp đầy đủ API và danh mục đơn vị tính chuẩn (Kg, Gam, Lít, Lon, Chai, Thùng...).
- **Hệ thống Shared UI (RM-002)**: Cung cấp sẵn các component chuẩn (`SharedTableComponent`, `SharedModalComponent`, `CustomSelectComponent`, Toast notifications).
- **Quản lý Công thức (RM-007) & Kho (RM-011)**: Thực thể `RecipeIngredient` tham chiếu tới `IngredientId`, và thực thể `InventoryBatch` tham chiếu tới `IngredientId`. Ràng buộc kiểm tra trước khi xóa nguyên liệu sẽ truy vấn trên hai bảng này.
- **Quyền hạn (Permissions)**: Bộ quyền `TooHungryPermissions.Ingredients` đã được khai báo sẵn trong `TooHungryPermissionDefinitionProvider` và sẵn sàng để phân quyền cho các vai trò như Quản lý nhà hàng, Bếp trưởng, Nhân viên kho.
