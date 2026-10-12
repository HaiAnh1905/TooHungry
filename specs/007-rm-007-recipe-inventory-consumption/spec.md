# Đặc tả Tính năng (Feature Specification): Quản lý Công thức Món ăn (Recipes) (RM-007)

**Nhánh Tính năng (Feature Branch)**: `007-rm-007-recipe-inventory-consumption`

**Ngày tạo**: 2026-10-01  
**Ngày cập nhật**: 2026-10-09  

**Trạng thái**: Đã làm rõ (Clarified) - Sẵn sàng cho Lập kế hoạch (`/speckit.plan`)

**Đầu vào**:
- Mô tả từ lộ trình phát triển (Roadmap RM-007): "Quản lý Công thức (Recipes) - Định lượng nguyên liệu cho từng món ăn. Thực thể: Recipe, RecipeIngredient — list, tạo, sửa, xoá, vô hiệu hóa. Phụ thuộc: RM-005 (Ingredients), RM-006 (Dishes)."
- Đồng bộ chuẩn hóa kiến trúc Dữ liệu danh mục nền tảng (Master Data, Wave 1) kế thừa từ RM-004 (Units), RM-005 (Ingredients - `EstimatedPrice`, `BaseUnit`, `StorageType`), và RM-006 (Dishes - `Price` gộp, `IsActive`, liên kết Recipe tùy chọn).
- Phân định ranh giới kiến trúc rõ ràng giữa Master Data (RM-007) và Khối Vận hành (Operations, Wave 3): RM-007 cung cấp hợp đồng dữ liệu định lượng chuẩn cho POS Đơn hàng (RM-010) và Quản lý Tồn kho / Xuất kho FEFO (RM-011).

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 09-10-2026 (Chuẩn hóa Kiến trúc RM-007 theo Chuẩn Master Data Wave 1 & Phân định Ranh giới Phân hệ)

- **Q1: Phân định ranh giới kiến trúc giữa RM-007 và các phân hệ hạ nguồn (POS RM-010, Tồn kho RM-011)**:
  - **A1**:
    - **RM-007 (Master Data - Quản lý Công thức)**: Chịu trách nhiệm hoàn toàn về việc khai báo, quản lý, chỉnh sửa, nâng phiên bản (`Version`), kích hoạt/tạm ngưng định lượng nguyên liệu cho từng món ăn, quy đổi đơn vị đo lường (`ConversionFactor`), và tính toán chi phí giá vốn lý thuyết (`Estimated Food Cost`).
    - **RM-010 (Operations - POS Bán hàng)**: Khi khách gọi món và đơn hàng hoàn tất, POS truy vấn Recipe đang hiệu lực (`IsActive = true`) của món ăn từ RM-007 để xác định danh sách nguyên liệu và số lượng tiêu hao cần trừ. Nếu món chưa có Recipe hoặc Recipe bị tạm ngưng, POS vẫn bán món bình thường mà không phát sinh giao dịch trừ kho.
    - **RM-011 (Operations - Quản lý Kho & Giao dịch)**: Nhận yêu cầu khấu trừ nguyên liệu (đã quy đổi về đơn vị cơ sở `BaseUnit`) từ luồng bán hàng, thực hiện thuật toán trừ kho theo hạn sử dụng **FEFO (First Expired, First Out)** trên các lô hàng (`InventoryBatch`), và ghi nhận lịch sử bất biến (`InventoryTransaction`).

- **Q2: Mối quan hệ giữa Món ăn (`Dish` - RM-006) và Công thức (`Recipe` - RM-007)**:
  - **A2**:
    - Quan hệ là **1-N ở mức lưu trữ lịch sử phiên bản**, nhưng **tại một thời điểm cụ thể, mỗi món ăn chỉ được phép có DUY NHẤT một Công thức đang hoạt động (`IsActive = true`)**.
    - Việc tạo công thức cho món ăn là **tùy chọn (Optional)**. Món ăn mới tạo có thể chưa có công thức (ví dụ: đồ uống đóng lon, đồ ăn sẵn).
    - Hệ thống chặn việc kích hoạt hoặc tạo mới một công thức thứ hai ở trạng thái Active cho cùng một món ăn (`Recipe:DishAlreadyHasActiveRecipe`).

- **Q3: Quản lý Phiên bản Công thức (`Recipe Versioning`) và Tính toàn vẹn lịch sử**:
  - **A3**:
    - Khi Bếp trưởng/Quản lý chỉnh sửa định lượng hoặc thay đổi thành phần nguyên liệu trong công thức đang áp dụng, hệ thống tự động tăng số phiên bản (`Version += 1`).
    - Các đơn hàng POS và giao dịch kho đã phát sinh trong quá khứ **giữ nguyên vẹn số liệu lịch sử** theo phiên bản tại thời điểm bán, tuyệt đối không bị tính toán lại hồi tố.
    - Hệ thống cung cấp API tra cứu lịch sử các phiên bản công thức của từng món ăn (`GetHistoryByDishIdAsync`).

- **Q4: Quy đổi Đơn vị đo lường (`ConversionFactor`) và Cơ chế chọn Đơn vị tính**:
  - **A4**:
    - Mỗi dòng nguyên liệu trong công thức (`RecipeIngredient`) chọn đơn vị sử dụng trong bếp (`Unit`) từ danh mục Đơn vị tính chuẩn (`Unit` - RM-004) thông qua `RecipeUnitId`. Đơn vị này có thể khác với đơn vị lưu kho cơ sở của nguyên liệu (`BaseUnit`, ví dụ: Gam / Muỗng vs Kg / Lít).
    - Hệ thống hiển thị sẵn `BaseUnit` của nguyên liệu để đối chiếu và cho phép Bếp trưởng nhập/điều chỉnh hệ số quy đổi `ConversionFactor` (số thực `decimal > 0`, mặc định 1.0 nếu trùng đơn vị cơ sở). Tỷ lệ quy đổi: `BaseQuantity = Quantity * ConversionFactor`.
    - Mọi phép tính toán quy đổi BẮT BUỘC thực hiện bằng kiểu số thực chính xác cao (`decimal`), không làm tròn ở các bước tính toán trung gian.

- **Q5: Tính toán Chi phí Giá vốn Lý thuyết (`Estimated Food Cost`) và Tỷ lệ Food Cost %**:
  - **A5**:
    - Nhằm hỗ trợ Bếp trưởng và Quản lý tối ưu chi phí và định giá bán món (RM-006), hệ thống tự động tính toán tổng chi phí nguyên liệu ước tính của công thức dựa trên đơn giá tham khảo `Ingredient.EstimatedPrice` (đã được bổ sung tại RM-005).
    - Công thức tính:
      $$\text{TotalEstimatedCost} = \sum (\text{BaseQuantity}_i \times \text{Ingredient}_i\text{.EstimatedPrice})$$
      $$\text{FoodCostPercentage} = \frac{\text{TotalEstimatedCost}}{\text{Dish.Price}} \times 100\%$$
    - Thông tin này hiển thị trực quan theo thời gian thực trên form tạo/sửa công thức và modal chi tiết.

- **Q6: Vòng đời Tạm ngưng (`Deactivate`) và Kích hoạt lại (`Reactivate`) Công thức**:
  - **A6**:
    - Khi món ăn tạm thời thay đổi cách chế biến hoặc thiếu nguyên liệu dài ngày, Quản lý có thể Tạm ngưng công thức (`Deactivate`) kèm theo việc nhập lý do bắt buộc (`DeactivationReason`).
    - Công thức bị tạm ngưng sẽ không được POS sử dụng để trừ kho tự động khi bán món.
    - Quản lý có thể kích hoạt lại công thức (`Reactivate`) bất kỳ lúc nào, với điều kiện món ăn đó hiện chưa có công thức nào khác đang Active.

- **Q7: Ràng buộc Xóa an toàn và Xóa mềm (Safe Delete Boundary)**:
  - **A7**:
    - Công thức (`Recipe`) kế thừa `FullAuditedAggregateRoot<Guid>`, hỗ trợ xóa mềm (`Soft Delete`).
    - Nếu công thức đã từng phát sinh dữ liệu liên kết khấu trừ kho hoặc đơn hàng, khuyến nghị sử dụng Tạm ngưng (`Deactivate`) thay vì xóa.
    - Khi một nguyên liệu (`Ingredient`) đang được sử dụng trong ít nhất một công thức còn hiệu lực, phân hệ RM-005 chặn xóa nguyên liệu đó để bảo đảm toàn vẹn dữ liệu.

- **Q8: Thiết kế Giao diện UI/UX theo Design System RM-002 (Cam & Trắng - Orange & White Theme)**:
  - **A8**:
    - Màn hình Quản lý Công thức chuyên biệt tại `/recipes` (hoặc tích hợp qua modal từ `/dishes`).
    - Danh sách hiển thị theo dạng bảng phân trang `SharedTable`, hỗ trợ tìm kiếm theo tên món, lọc theo Danh mục món (`DishCategory`), và bộ lọc theo trạng thái công thức (Tất cả / Đã có công thức / Chưa có công thức).
    - Modal cấu hình công thức (`RecipeModalComponent`) cho phép thêm/sửa/xóa linh hoạt các dòng nguyên liệu, tự động hiển thị đơn vị kho cơ sở, gợi ý hệ số quy đổi, và cập nhật tức thì bảng tổng hợp chi phí giá vốn lý thuyết.
    - Đảm bảo 100% văn bản hỗ trợ song ngữ Tiếng Việt (`vi.json`) và Tiếng Anh (`en.json`).

- **Q9: Xử lý Công thức khi Nguyên liệu thành phần bị Tạm ngưng (`Deactivate`)**:
  - **A9**:
    - Khi một nguyên liệu bị Tạm ngưng (`IsActive = false`) tại phân hệ RM-005, công thức món ăn (`Recipe`) đang hoạt động có chứa nguyên liệu đó **vẫn giữ nguyên trạng thái `IsActive = true`** (không tự động vô hiệu hóa công thức).
    - Hệ thống BẮT BUỘC gắn cờ cảnh báo trực quan (Warning badge: *"Chứa nguyên liệu đang tạm ngưng"*) trên màn hình Quản lý Công thức, màn hình Quản lý món ăn, và màn hình POS gọi món để Bếp trưởng và Quản lý nhận biết kịp thời, chủ động cập nhật công thức hoặc thay thế nguyên liệu.

- **Q10: Cấu trúc Cấp bậc Công thức (Single-level vs Multi-level / Bán thành phẩm)**:
  - **A10**:
    - Phân hệ Master Data (Wave 1) **chỉ áp dụng cấu trúc Công thức 1 cấp (`Single-level Recipe`)**: Mỗi món ăn (`Dish`) chỉ cấu thành trực tiếp từ các nguyên liệu trong kho (`Ingredient`).
    - Khái niệm Bán thành phẩm / Công thức đa cấp lồng nhau (Sub-recipes) được hoãn lại (Deferred) sau Wave 1. Nếu nhà hàng có bán thành phẩm tự chế biến (như nước sốt pha sẵn), bán thành phẩm đó được quản lý tạm thời như một bản ghi `Ingredient` độc lập trong kho.

- **Q11: Phân quyền Truy cập và Hiển thị Giá vốn (Food Cost / Recipe Permissions)**:
  - **A11**:
    - Giới hạn quyền chặt chẽ thông qua hệ thống phân quyền ABP (`TooHungryPermissions.Recipes`): Chỉ các vai trò Quản lý nhà hàng (`Manager` / `Admin`) và Bếp trưởng (`Chef`) mới có quyền truy cập màn hình `/recipes`, thiết lập công thức và xem các thông số tài chính nhạy cảm (`EstimatedPrice`, `TotalEstimatedCost`, `FoodCostPercentage`).
    - Các vai trò vận hành thông thường khác (Thu ngân / Cashier, Nhân viên phục vụ / Waiter) không có quyền truy cập module này và bị chặn ở cả tầng Frontend router guards lẫn Backend authorization attributes.

- **Q12: Điểm vào và Trải nghiệm Điều hướng Giao diện (Frontend Entry Points & Navigation)**:
  - **A12**:
    - Hệ thống hỗ trợ song song 2 điểm vào linh hoạt:
      1. **Trang chuyên biệt `/recipes`**: Hiển thị trên Menu Sidebar thuộc nhóm Thực đơn/Bếp để Quản lý và Bếp trưởng bao quát toàn bộ thực đơn, lọc các món chưa có công thức, và quản trị tập trung.
      2. **Nút thao tác nhanh trên `/dishes` (RM-006)**: Trên bảng danh sách Món ăn, mỗi dòng món ăn có thêm nút hành động nhanh `[Công thức]` (hoặc biểu tượng sách công thức) cho phép mở trực tiếp `RecipeModal` của món đó để xem/sửa công thức mà không cần rời khỏi màn hình quản lý món.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Quản lý Công thức Món ăn (Recipes) (RM-007)** thuộc phân hệ Dữ liệu danh mục nền tảng (Master Data, Wave 1). Đây là mắt xích trung tâm kết nối giữa Món ăn bán trong thực đơn (`Dish` - RM-006), Danh mục nguyên liệu lưu kho (`Ingredient` - RM-005), Đơn vị tính chuẩn (`Unit` - RM-004), và tạo tiền đề cốt lõi cho phân hệ Bán hàng POS (RM-010) cũng như Quản lý Tồn kho / Trừ kho tự động theo FEFO (RM-011).

Màn hình Quản lý Công thức cho phép Bếp trưởng, Quản lý nhà hàng:
1. **Quản lý danh sách công thức toàn diện**: Xem danh sách các món ăn trong thực đơn kèm trạng thái đã thiết lập công thức hay chưa, số lượng nguyên liệu cấu thành, phiên bản hiện tại, và tổng chi phí giá vốn lý thuyết.
2. **Thiết lập & Chỉnh sửa Công thức**: Khai báo các nguyên liệu cấu thành món ăn, chỉ định đơn vị sử dụng trong bếp và hệ số quy đổi về đơn vị lưu kho cơ sở.
3. **Quản lý Phiên bản tự động (`Recipe Versioning`)**: Tự động tăng phiên bản khi có sự điều chỉnh thành phần/định lượng, bảo toàn tính bất biến của các giao dịch trong quá khứ.
4. **Kiểm soát Chi phí Giá vốn (Food Cost)**: Tính toán tự động tổng giá vốn lý thuyết dựa trên đơn giá tham khảo của nguyên liệu và tỷ lệ % giá vốn so với giá niêm yết của món ăn.
5. **Quản lý Vòng đời Công thức**: Bật/tắt trạng thái hoạt động (`IsActive`), tạm ngưng có ghi nhận lý do kiểm toán, và kích hoạt lại công thức an toàn.

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Khai báo Công thức Món ăn Mới (Ưu tiên: P1)

Là một Bếp trưởng, tôi muốn tạo công thức định lượng nguyên liệu cho món ăn (ví dụ: món "Bò bít tết sốt tiêu" gồm Thịt thăn bò 200 g, Tiêu đen 5 g, Bơ lạt 20 g) để chuẩn hóa quy trình chế biến của nhà bếp và làm căn cứ trừ kho tự động khi bán hàng.

**Lý do cho độ ưu tiên**: Là chức năng nghiệp vụ nền tảng cốt lõi nhất của module RM-007, quyết định khả năng liên kết giữa thực đơn và kho nguyên liệu.

**Kiểm thử Độc lập**: Chọn một món ăn chưa có công thức, thêm 3 nguyên liệu với số lượng và đơn vị tương ứng, nhấn Lưu. Kiểm tra công thức được tạo thành công với Version 1, `IsActive = true`, và các dòng nguyên liệu được lưu chính xác.

**Kịch bản Chấp nhận**:
1. **Cho trước** món ăn `Dish` "Bò bít tết sốt tiêu" chưa có công thức nào, **Khi** Quản lý mở modal tạo công thức, nhập tên công thức, thêm các nguyên liệu:
   - Thịt thăn bò: Số lượng `200`, Đơn vị `g`, Hệ số quy đổi `0.001` (Quy đổi thành `0.2 kg` theo BaseUnit).
   - Bơ lạt: Số lượng `20`, Đơn vị `g`, Hệ số quy đổi `0.001` (Quy đổi thành `0.02 kg`).
   - Tiêu đen: Số lượng `5`, Đơn vị `g`, Hệ số quy đổi `0.001` (Quy đổi thành `0.005 kg`).
   và nhấn "Lưu", **Thì** hệ thống tạo thành công bản ghi `Recipe` với `Version = 1`, `IsActive = true`, tạo đủ 3 bản ghi `RecipeIngredient`, và hiển thị thông báo thành công.
2. **Cho trước** form tạo công thức, **Khi** người dùng cố gắng thêm hai dòng có cùng một nguyên liệu (`IngredientId` trùng nhau), **Thì** hệ thống tự động gộp hoặc cập nhật lại định lượng của nguyên liệu đó, không tạo ra hai dòng trùng lặp trong cùng một công thức.
3. **Cho trước** món ăn đã có một công thức đang hoạt động (`IsActive = true`), **Khi** người dùng cố tình tạo thêm một công thức active mới cho món đó, **Thì** hệ thống từ chối và hiển thị thông báo lỗi: món ăn đã có công thức đang hoạt động.

---

### User Story 2 - Xem Danh sách và Trạng thái Công thức theo Món ăn (Ưu tiên: P1)

Là một Quản lý nhà hàng, tôi muốn xem danh sách toàn bộ món ăn trong thực đơn kèm theo trạng thái công thức (Đã có / Chưa có), số lượng nguyên liệu, phiên bản hiện tại và chi phí giá vốn ước tính để dễ dàng rà soát món nào chưa được định lượng.

**Lý do cho độ ưu tiên**: Giúp người quản lý bao quát tình trạng hoàn thiện dữ liệu của toàn bộ thực đơn nhà hàng.

**Kiểm thử Độc lập**: Truy cập màn hình `/recipes`, kiểm tra danh sách hiển thị đầy đủ các cột thông tin, chuyển đổi các tab lọc "Tất cả", "Đã có công thức", "Chưa có công thức", và kiểm tra kết quả lọc theo danh mục món ăn.

**Kịch bản Chấp nhận**:
1. **Cho trước** người dùng truy cập màn hình `/recipes`, **Thì** bảng danh sách hiển thị: Tên món ăn, Danh mục món, Giá bán niêm yết, Trạng thái công thức (Huy hiệu xanh "Đã có công thức" kèm số lượng nguyên liệu và Version, hoặc Huy hiệu cam "Chưa có công thức"), Tổng giá vốn ước tính, và các nút Thao tác (Thiết lập / Chỉnh sửa / Xem chi tiết).
2. **Cho trước** danh sách món ăn, **Khi** người dùng chọn tab lọc "Chưa có công thức", **Thì** bảng chỉ hiển thị các món ăn hiện chưa được gán công thức active nào.
3. **Cho trước** danh sách món ăn, **Khi** người dùng chọn lọc theo Danh mục món (ví dụ: "Món khai vị"), **Thì** bảng chỉ hiển thị các món ăn thuộc danh mục đó.
4. **Cho trước** danh sách món ăn, **Khi** người dùng nhập từ khóa tìm kiếm vào ô tra cứu (ví dụ: "Bò"), **Thì** bảng tự động lọc các món có tên chứa từ khóa tương ứng.

---

### User Story 3 - Chỉnh sửa Công thức và Nâng Phiên bản Tự động (Ưu tiên: P2)

Là một Bếp trưởng, khi tôi thay đổi định lượng hoặc nguyên liệu của món ăn (ví dụ: tăng lượng thịt thăn từ 200 g lên 250 g), tôi muốn công thức được tự động nâng phiên bản (`Version += 1`) để các đơn hàng mới áp dụng định lượng mới, trong khi các đơn hàng cũ trong lịch sử vẫn giữ nguyên định lượng ban đầu.

**Lý do cho độ ưu tiên**: Đảm bảo tính toàn vẹn và bất biến của dữ liệu kiểm toán giá vốn và lịch sử tiêu hao kho.

**Kiểm thử Độc lập**: Cập nhật định lượng của một công thức Version 1. Kiểm tra Version tăng lên 2, định lượng mới được lưu, và dữ liệu lịch sử các đơn hàng trước đó không bị ảnh hưởng.

**Kịch bản Chấp nhận**:
1. **Cho trước** công thức món "Bò bít tết sốt tiêu" đang ở Version 1, **Khi** Bếp trưởng chỉnh sửa số lượng Thịt thăn bò thành `250 g` và nhấn "Lưu", **Thì** hệ thống cập nhật công thức, tự động tăng `Version = 2`, và cập nhật các dòng `RecipeIngredient`.
2. **Cho trước** công thức đang ở Version 1 đã có các đơn hàng trong quá khứ ghi nhận tiêu hao theo Version 1, **Khi** công thức được nâng lên Version 2, **Thì** các đơn hàng mới phát sinh sau thời điểm cập nhật sẽ tiêu hao theo định lượng mới (250 g), các đơn hàng cũ và lịch sử giao dịch kho trước đó giữ nguyên vẹn 100%.

---

### User Story 4 - Ước tính Chi phí Giá vốn (Food Cost) theo Định lượng (Ưu tiên: P2)

Là một Quản lý nhà hàng, tôi muốn khi thiết lập công thức món ăn, hệ thống tự động tính toán tổng chi phí nguyên liệu ước tính và tỷ lệ Food Cost % so với giá bán của món để tôi đánh giá được mức độ sinh lời trước khi phê duyệt áp dụng.

**Lý do cho độ ưu tiên**: Giúp tối ưu hóa bài toán kinh doanh ẩm thực, ngăn ngừa rủi ro định giá bán thấp hơn chi phí nguyên liệu.

**Kiểm thử Độc lập**: Nhập các nguyên liệu có đơn giá tham khảo `EstimatedPrice`, kiểm tra tổng chi phí và tỷ lệ % hiển thị tức thì trên giao diện modal.

**Kịch bản Chấp nhận**:
1. **Cho trước** món "Bò bít tết sốt tiêu" có giá bán niêm yết `Price = 200,000 đ`, các nguyên liệu có đơn giá tham khảo:
   - Thịt thăn bò: `300,000 đ/kg` -> Dùng `0.2 kg` -> Chi phí: `60,000 đ`.
   - Bơ lạt: `150,000 đ/kg` -> Dùng `0.02 kg` -> Chi phí: `3,000 đ`.
   - Tiêu đen: `200,000 đ/kg` -> Dùng `0.005 kg` -> Chi phí: `1,000 đ`.
   **Khi** mở modal công thức, **Thì** hệ thống hiển thị:
   - Tổng giá vốn ước tính: `64,000 đ`.
   - Tỷ lệ Food Cost %: $\frac{64,000}{200,000} \times 100\% = 32\%$.
2. **Cho trước** nguyên liệu chưa được thiết lập đơn giá tham khảo (`EstimatedPrice = 0`), **Khi** tính toán chi phí, **Thì** nguyên liệu đó đóng góp 0 đ vào tổng chi phí và hiển thị chú thích nhỏ nhắc nhở quản lý cập nhật đơn giá tham khảo tại RM-005.

---

### User Story 5 - Vô hiệu hóa và Kích hoạt lại Công thức An toàn (Ưu tiên: P1)

Là một Quản lý nhà hàng, khi một món ăn tạm thời ngừng chế biến theo công thức hiện tại hoặc công thức cần tạm ngưng để rà soát lại, tôi muốn có thể Vô hiệu hóa (`Deactivate`) công thức kèm theo lý do bắt buộc, và Kích hoạt lại (`Reactivate`) khi sẵn sàng mà không làm mất dữ liệu đã cấu hình.

**Lý do cho độ ưu tiên**: Đảm bảo tính linh hoạt trong vận hành thực tế mà vẫn duy trì vết kiểm toán rõ ràng.

**Kiểm thử Độc lập**: Thực hiện Deactivate công thức với lý do "Đổi nhà cung cấp bơ lạt, tạm ngưng chờ công thức mới". Kiểm tra `IsActive = false`, `DeactivationReason` được lưu. Sau đó thực hiện Reactivate và kiểm tra công thức trở lại trạng thái Active.

**Kịch bản Chấp nhận**:
1. **Cho trước** một công thức đang hoạt động (`IsActive = true`), **Khi** Quản lý nhấn "Tạm ngưng", **Thì** hệ thống mở dialog yêu cầu nhập lý do bắt buộc (`DeactivationReason`). Nếu để trống lý do, hệ thống chặn hành động.
2. **Cho trước** Quản lý đã nhập lý do hợp lệ và xác nhận, **Thì** hệ thống cập nhật `IsActive = false`, lưu `DeactivationReason`, và chuyển huy hiệu trạng thái sang màu xám "Tạm ngưng".
3. **Cho trước** một công thức đang bị tạm ngưng, **Khi** Quản lý nhấn "Kích hoạt lại", **Thì** hệ thống kiểm tra nếu món ăn chưa có công thức nào khác đang active, hệ thống chuyển `IsActive = true`, xóa `DeactivationReason`, và hiển thị thông báo thành công.

---

### User Story 6 - Cung cấp Hợp đồng Tiêu hao Kho Hạ nguồn cho POS & FEFO (Ưu tiên: P1)

Là hệ thống Bán hàng POS (RM-010) và Quản lý Kho (RM-011), tôi muốn có API chuẩn từ module Recipes để truy vấn chính xác danh sách nguyên liệu và số lượng tiêu hao (theo đơn vị cơ sở `BaseUnit`) của từng món ăn trong đơn hàng, từ đó thực hiện khấu trừ tồn kho theo quy tắc FEFO một cách tự động và chuẩn xác.

**Lý do cho độ ưu tiên**: Đây là hợp đồng tích hợp then chốt liên kết giữa bán hàng và quản trị tồn kho.

**Kiểm thử Độc lập**: Gọi API `GetActiveByDishIdAsync` với một `DishId`, kiểm tra trả về Recipe active kèm đầy đủ danh sách nguyên liệu, đơn vị cơ sở, và số lượng đã nhân hệ số quy đổi `BaseQuantity`.

**Kịch bản Chấp nhận**:
1. **Cho trước** món "Bò bít tết" có Recipe active gồm 0.2 kg Thịt bò và 0.02 kg Bơ, **Khi** POS gọi API tra cứu công thức của món ăn này, **Thì** hệ thống trả về RecipeDto với trạng thái `IsActive = true`, kèm danh sách nguyên liệu có `BaseQuantity` đã được tính sẵn chính xác.
2. **Cho trước** món "Nước ngọt lon" không có Recipe hoặc Recipe bị tạm ngưng, **Khi** POS gọi API tra cứu, **Thì** hệ thống trả về `null`, báo hiệu cho POS biết món này không có định lượng tự động và không cần sinh giao dịch trừ kho.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Món ăn chưa có Recipe hoặc Recipe bị Inactive khi bán trên POS**:
  - *Hành vi*: POS vẫn cho phép hoàn tất đơn hàng và in hóa đơn thanh toán bình thường. Hệ thống không sinh bất kỳ giao dịch xuất kho tự động nào cho món này (quản lý nguyên liệu qua kiểm kê thủ công).
- **EC-002: Đổi Đơn vị tính cơ bản của Nguyên liệu khi đã nằm trong Công thức**:
  - *Hành vi*: Phân hệ RM-005 BẮT BUỘC khóa không cho phép sửa `BaseUnit` nếu nguyên liệu đã nằm trong `RecipeIngredient`. Người dùng muốn đổi đơn vị đo lường phải tạo nguyên liệu mới.
- **EC-003: Xóa Nguyên liệu hoặc Món ăn đang có liên kết Công thức**:
  - *Hành vi*: Chặn xóa nguyên liệu tại RM-005 nếu đang được tham chiếu trong bất kỳ `RecipeIngredient` nào. Khi xóa món ăn tại RM-006 (Soft Delete), công thức của món ăn đó tự động được đánh dấu Inactive.
- **EC-004: Định lượng số lượng âm hoặc bằng 0, hệ số quy đổi không hợp lệ**:
  - *Hành vi*: Hệ thống ném lỗi nghiệp vụ (`RecipeIngredient:QuantityMustBePositive` hoặc `RecipeIngredient:ConversionFactorMustBePositive`) và chặn lưu trên cả frontend lẫn backend.
- **EC-005: Tạo 2 công thức active cho cùng một món ăn**:
  - *Hành vi*: Hệ thống chặn lưu với lỗi nghiệp vụ `Recipe:DishAlreadyHasActiveRecipe`. Quản lý phải tạm ngưng công thức cũ trước khi kích hoạt công thức mới.
- **EC-006: Nguyên liệu trong công thức bị tạm ngưng ở phân hệ RM-005**:
  - *Hành vi*: Recipe vẫn duy trì trạng thái `IsActive = true`, nhưng hệ thống tự động hiển thị huy hiệu cảnh báo màu vàng/cam trên UI Quản lý Công thức, Thực đơn và POS để nhân viên nhận biết và có phương án xử lý kịp thời.

---

## 3. Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cho phép tạo mới công thức chế biến (`Recipe`) liên kết với một món ăn cụ thể (`Dish`).
- **FR-002**: Mỗi công thức PHẢI bao gồm các thông tin: Tên công thức, Mô tả (tùy chọn), Phiên bản (`Version`, mặc định 1), Trạng thái kích hoạt (`IsActive`, mặc định true), và Danh sách nguyên liệu cấu thành (`Ingredients`).
- **FR-003**: Mỗi dòng nguyên liệu trong công thức (`RecipeIngredient`) PHẢI chọn đơn vị tính từ danh mục Đơn vị tính chuẩn (`Unit` - RM-004) qua `RecipeUnitId` / `Unit`, ghi nhận: `IngredientId`, Số lượng (`Quantity > 0`), Đơn vị công thức (`Unit`), và Hệ số quy đổi (`ConversionFactor > 0`, mặc định 1.0 về đơn vị cơ sở `BaseUnit` của nguyên liệu).
- **FR-004**: Hệ thống PHẢI tự động tính toán số lượng quy đổi về đơn vị cơ sở: $\text{BaseQuantity} = \text{Quantity} \times \text{ConversionFactor}$.
- **FR-005**: Hệ thống PHẢI đảm bảo tính duy nhất: Tại một thời điểm, mỗi món ăn chỉ được phép có tối đa một công thức ở trạng thái `IsActive = true`.
- **FR-006**: Hệ thống PHẢI hỗ trợ chỉnh sửa công thức, cho phép thêm, sửa, xóa các dòng nguyên liệu trong công thức.
- **FR-007**: Hệ thống PHẢI tự động tăng số phiên bản (`Version += 1`) mỗi khi có sự thay đổi về thành phần hoặc định lượng nguyên liệu của công thức.
- **FR-008**: Hệ thống PHẢI bảo toàn tính bất biến của dữ liệu lịch sử: Mọi thay đổi phiên bản công thức KHÔNG ĐƯỢC làm thay đổi số liệu của các đơn hàng và giao dịch kho đã phát sinh trong quá khứ.
- **FR-009**: Hệ thống PHẢI hỗ trợ chức năng Tạm ngưng công thức (`Deactivate`) và BẮT BUỘC yêu cầu người dùng nhập lý do tạm ngưng (`DeactivationReason`).
- **FR-010**: Hệ thống PHẢI hỗ trợ chức năng Kích hoạt lại công thức (`Reactivate`), tự động kiểm tra món ăn chưa có công thức active khác trước khi cho phép kích hoạt lại.
- **FR-011**: Hệ thống PHẢI cung cấp API lấy công thức đang hoạt động theo món ăn (`GetActiveByDishIdAsync`) phục vụ phân hệ POS (RM-010) và Tồn kho (RM-011).
- **FR-012**: Hệ thống PHẢI cung cấp API tra cứu toàn bộ lịch sử các phiên bản công thức của một món ăn (`GetHistoryByDishIdAsync`).
- **FR-013**: Hệ thống PHẢI tự động tính toán tổng chi phí giá vốn ước tính (`TotalEstimatedCost`) và tỷ lệ Food Cost % dựa trên `Ingredient.EstimatedPrice` và `Dish.Price`.
- **FR-014**: Giao diện Quản lý Công thức PHẢI hiển thị bảng danh sách món ăn phân trang, hỗ trợ tìm kiếm theo tên món, lọc theo Danh mục món ăn, và lọc theo trạng thái công thức (Tất cả / Đã có / Chưa có).
- **FR-015**: Giao diện PHẢI tuân thủ 100% chuẩn thiết kế Cam & Trắng (Orange & White Theme) của RM-002 và sử dụng các Shared Components chuẩn (`SharedTable`, `SharedModal`, `CustomSelect`).
- **FR-016**: Toàn bộ nhãn, tiêu đề, thông báo thành công và thông điệp lỗi PHẢI được quốc tế hóa 100% trên cả hai tệp `vi.json` và `en.json`.
- **FR-017**: Hệ thống PHẢI gắn cờ/huy hiệu cảnh báo trực quan khi công thức chứa ít nhất một nguyên liệu đang ở trạng thái Tạm ngưng (`Ingredient.IsActive = false`).
- **FR-018**: Hệ thống PHẢI áp dụng phân quyền ABP (`TooHungryPermissions.Recipes`): Chỉ Quản lý (`Manager`/`Admin`) và Bếp trưởng (`Chef`) mới có quyền truy cập màn hình `/recipes`, thiết lập công thức và xem các trường chi phí giá vốn / Food Cost %; các vai trò khác bị chặn truy cập.
- **FR-019**: Hệ thống PHẢI hỗ trợ 2 điểm vào giao diện: Trang quản trị chuyên biệt `/recipes` trên Menu Sidebar và Nút hành động nhanh `[Công thức]` trên bảng danh sách món ăn `/dishes` (RM-006) để mở trực tiếp modal cấu hình công thức cho món tương ứng.

### Các Thực thể Chính (Key Entities)

- **Recipe (Aggregate Root)**:
  - `Id`: Định danh duy nhất (Guid).
  - `DishId`: Tham chiếu đến Món ăn (`Dish` - RM-006).
  - `Name`: Tên công thức (string, bắt buộc).
  - `Description`: Mô tả quy trình chế biến / lưu ý (string, tùy chọn).
  - `Version`: Số phiên bản công thức (int, bắt đầu từ 1).
  - `IsActive`: Trạng thái hiệu lực (bool, mặc định true).
  - `DeactivationReason`: Lý do tạm ngưng (string, bắt buộc khi `IsActive = false`).
  - `Ingredients`: Tập hợp các nguyên liệu cấu thành (`ICollection<RecipeIngredient>`).
  - Kế thừa: `FullAuditedAggregateRoot<Guid>`.

- **RecipeIngredient (Entity)**:
  - `Id`: Định danh duy nhất (Guid).
  - `RecipeId`: Tham chiếu đến Recipe sở hữu.
  - `IngredientId`: Tham chiếu đến Nguyên liệu (`Ingredient` - RM-005).
  - `Quantity`: Số lượng sử dụng cho 1 suất ăn (decimal > 0).
  - `Unit`: Tên đơn vị đo lường dùng trong công thức (string, ví dụ: "g", "ml", "Muỗng").
  - `ConversionFactor`: Hệ số quy đổi về `BaseUnit` của nguyên liệu (decimal > 0, mặc định 1.0).
  - `IsActive`: Trạng thái dòng nguyên liệu (bool, mặc định true).
  - Kế thừa: `Entity<Guid>`.

---

## 4. Tiêu chí Thành công (Success Criteria)

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: Bếp trưởng/Quản lý có thể hoàn thành việc tạo mới hoặc cập nhật một công thức đầy đủ (gồm 3-5 nguyên liệu) trong thời gian dưới **60 giây**.
- **SC-002**: Tốc độ phản hồi của API tra cứu công thức theo món ăn (`GetActiveByDishIdAsync`) đạt dưới **100 mili-giây**, đảm bảo màn hình POS hoạt động mượt mà không có độ trễ cảm nhận được khi khách gọi món.
- **SC-003**: Độ chính xác tính toán quy đổi đơn vị và giá vốn lý thuyết đạt **100% tuyệt đối** (không bị sai lệch số học thập phân).
- **SC-004**: 100% các trường hợp chỉnh sửa định lượng hoặc thành phần công thức đều tự động nâng số phiên bản (`Version`) mà không gây ảnh hưởng đến bất kỳ bản ghi lịch sử nào trong quá khứ.
- **SC-005**: 100% các thành phần giao diện và thông báo lỗi hỗ trợ song ngữ Tiếng Việt và Tiếng Anh đồng bộ trên `vi.json` và `en.json`.

---

## 5. Các Giả định (Assumptions)

- **A1**: Món ăn (`Dish`) và Nguyên liệu (`Ingredient`) đã được tạo trước thông qua các module RM-006 và RM-005 trước khi đưa vào lập công thức.
- **A2**: Đơn vị tính cơ bản (`BaseUnit`) của nguyên liệu được định nghĩa chuẩn tại RM-004 và RM-005. Người dùng khi thiết lập công thức hiểu rõ tỷ lệ quy đổi giữa đơn vị dùng trong bếp và đơn vị kho cơ sở.
- **A3**: Đơn giá tham khảo `Ingredient.EstimatedPrice` được dùng thuần túy cho mục đích ước tính giá vốn lý thuyết; giá vốn thực tế của kho sẽ do các lô hàng nhập kho (`InventoryBatch` - RM-011) xác định.
- **A4**: Việc khấu trừ kho thực tế khi bán hàng và kiểm tra tồn kho theo FEFO thuộc phạm vi thực thi của phân hệ POS (RM-010) và Tồn kho (RM-011). RM-007 chịu trách nhiệm cung cấp định lượng chuẩn mực.
- **A5**: Cấu trúc công thức ở Wave 1 là đơn cấp (`Single-level`: Món ăn -> Nguyên liệu); các bán thành phẩm được coi là nguyên liệu kho độc lập mà không cần tạo cây công thức lồng nhau.
