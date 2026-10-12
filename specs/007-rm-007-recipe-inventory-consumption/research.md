# Giai đoạn 0: Nghiên cứu Kiến trúc & Quyết định Kỹ thuật (Research)

**Tính năng**: `007-rm-007-recipe-inventory-consumption` — Quản lý Công thức Món ăn (Recipes) (RM-007)  
**Ngày cập nhật**: 2026-10-09  

---

## 1. Tổng hợp Nghiên cứu & Quyết định Kỹ thuật

### Nghiên cứu 1: Cơ chế Chọn Đơn vị tính và Hệ số Quy đổi (`ConversionFactor`)

- **Bối cảnh**: Trong công thức nấu ăn, đầu bếp thường định lượng bằng các đơn vị nhỏ hoặc đơn vị quy ước (như gam, ml, muỗng cà phê, lát, quả), trong khi kho lưu trữ nguyên liệu (`Ingredient` - RM-005) thường quản lý theo đơn vị cơ sở chuẩn (`BaseUnit` - RM-004, ví dụ: kg, lít, hộp).
- **Quyết định**: 
  - Mỗi dòng nguyên liệu (`RecipeIngredient`) liên kết với danh mục Đơn vị tính chuẩn (`Unit` - RM-004) thông qua `RecipeUnitId` (hoặc chuỗi đơn vị `Unit`).
  - Hệ thống hiển thị sẵn `BaseUnit` của nguyên liệu để đối chiếu và cho phép Bếp trưởng nhập/điều chỉnh hệ số quy đổi `ConversionFactor` (số thực `decimal > 0`, mặc định là 1.0 nếu cùng đơn vị).
  - Tỷ lệ quy đổi: $\text{BaseQuantity} = \text{Quantity} \times \text{ConversionFactor}$.
  - Toàn bộ tính toán được thực hiện bằng kiểu dữ liệu số thực chính xác cao (`decimal`) mà không làm tròn số học ở các bước trung gian.
- **Lý do lựa chọn**: Vừa tận dụng được danh mục Đơn vị tính chuẩn của RM-004 để tránh sai chính tả, vừa mang lại sự linh hoạt tối đa cho Bếp trưởng khi định lượng bằng các đơn vị nhà bếp đặc thù mà vẫn quy đổi về đơn vị kho chuẩn xác 100%.
- **Các phương án thay thế đã xem xét**:
  - *Cố định ConversionFactor theo bảng quy đổi toán học cứng*: Bị từ chối vì không thể xử lý được các đơn vị ước lượng theo thói quen nấu nướng (ví dụ: 1 quả trứng = 0.05 kg, 1 muỗng đường = 0.01 kg).
  - *Nhập tự do chuỗi văn bản không qua danh mục RM-004*: Bị từ chối vì dễ dẫn đến sai lệch chính tả và không thể tận dụng tính năng đa ngôn ngữ của RM-004.

---

### Nghiên cứu 2: Ứng xử của Công thức khi Nguyên liệu thành phần bị Tạm ngưng (`Deactivate`)

- **Bối cảnh**: Trong vận hành thực tế, một nguyên liệu có thể bị nhà cung cấp hết hàng tạm thời và Thủ kho thực hiện tạm ngưng nguyên liệu đó ở RM-005 (`Ingredient.IsActive = false`). Cần xác định hành vi của các công thức món ăn đang hoạt động (`Recipe.IsActive = true`) có chứa nguyên liệu này.
- **Quyết định**:
  - Công thức món ăn vẫn giữ nguyên trạng thái `IsActive = true` (không tự động vô hiệu hóa công thức một cách âm thầm).
  - Hệ thống tự động phát hiện và gắn cờ cảnh báo trực quan (Warning badge: *"Chứa nguyên liệu đang tạm ngưng"*) trên màn hình Quản lý Công thức, màn hình Quản lý Món ăn, và màn hình POS bán hàng (RM-010).
- **Lý do lựa chọn**: Giúp nhà hàng chủ động trong vận hành: Bếp trưởng và Quản lý nhận biết ngay để kịp thời điều chỉnh công thức hoặc tìm nguồn nguyên liệu thay thế, tránh việc hệ thống tự động vô hiệu hóa công thức gây đình trệ đột ngột toàn bộ hoạt động bán hàng của món ăn.
- **Các phương án thay thế đã xem xét**:
  - *Tự động vô hiệu hóa Recipe*: Bị từ chối vì làm xáo trộn vận hành mà nhà hàng không kịp trở tay, thu ngân không rõ nguyên nhân món ăn biến mất khỏi danh sách bán.
  - *Chặn không cho phép tạm ngưng nguyên liệu*: Bị từ chối vì nguyên liệu thực tế đã hết hàng, thủ kho bắt buộc phải tạm ngưng để tránh nhập liệu nhầm.

---

### Nghiên cứu 3: Cấu trúc Cấp bậc Công thức (Single-level vs Multi-level / Bán thành phẩm)

- **Bối cảnh**: Một số nhà hàng cao cấp có chế biến bán thành phẩm (Sub-recipes, ví dụ: nước sốt pha sẵn, bột ủ sẵn) và món ăn chính lại dùng bán thành phẩm này.
- **Quyết định**:
  - Phân hệ Master Data (Wave 1) chỉ áp dụng cấu trúc Công thức 1 cấp (`Single-level Recipe`): Mỗi món ăn (`Dish`) chỉ cấu thành trực tiếp từ danh mục nguyên liệu (`Ingredient`).
  - Hoãn (Deferred) mô hình công thức lồng nhau (Sub-recipes) cho các phiên bản sau Wave 1. Nếu nhà hàng có bán thành phẩm tự chế biến, bán thành phẩm đó được tạo như một bản ghi `Ingredient` độc lập trong kho.
- **Lý do lựa chọn**: Giữ cho Domain Model tinh gọn, dễ bảo trì, giải quyết đúng mục tiêu cốt lõi của Wave 1 mà không làm phức tạp hóa thuật toán tính chi phí và trừ kho FEFO hạ nguồn.
- **Các phương án thay thế đã xem xét**:
  - *Hỗ trợ cây công thức đa cấp đệ quy ngay trong Wave 1*: Bị từ chối vì độ phức tạp vượt trội, tăng nguy cơ lỗi lặp vô hạn (circular dependency) và kéo dài thời gian hoàn thành Wave 1.

---

### Nghiên cứu 4: Phân quyền Thao tác và Bảo mật Hiển thị Giá vốn (Food Cost)

- **Bối cảnh**: Thông tin giá vốn lý thuyết (`TotalEstimatedCost`) và tỷ lệ Food Cost % là bí mật kinh doanh tài chính nhạy cảm của nhà hàng, không nên để nhân viên phục vụ bàn hay thu ngân nhìn thấy.
- **Quyết định**:
  - Giới hạn quyền chặt chẽ qua hệ thống phân quyền ABP (`TooHungryPermissions.Recipes`): Chỉ các vai trò Quản lý (`Manager` / `Admin`) và Bếp trưởng (`Chef`) mới có quyền truy cập vào URL `/recipes`, mở modal thiết lập công thức và xem các thông số giá vốn.
  - Các vai trò vận hành khác (Thu ngân / Cashier, Nhân viên phục vụ / Waiter) bị chặn ở cả tầng Frontend router guards và Backend authorization attributes (`[Authorize(TooHungryPermissions.Recipes.Default)]`).
- **Lý do lựa chọn**: Tuân thủ nguyên tắc bảo mật và phân quyền của Hiến pháp Acme.TooHungry (Điều V), bảo vệ dữ liệu tỷ suất lợi nhuận của nhà hàng.
- **Các phương án thay thế đã xem xét**:
  - *Cho phép thu ngân xem công thức nhưng ẩn cột giá*: Bị từ chối vì thu ngân chỉ cần biết tên món và giá bán trên POS (RM-010); việc xem công thức định lượng chi tiết là nghiệp vụ của nhà bếp.

---

### Nghiên cứu 5: Điểm vào và Điều hướng Giao diện Người dùng (Frontend Navigation)

- **Bối cảnh**: Bếp trưởng vừa cần một nơi bao quát toàn bộ thực đơn để rà soát món nào chưa có công thức, vừa cần thao tác nhanh khi đang xem danh sách món ăn tại màn hình `/dishes` (RM-006).
- **Quyết định**:
  - Hỗ trợ song song 2 điểm vào:
    1. **Trang chuyên biệt `/recipes`**: Nằm trên Menu Sidebar (nhóm Thực đơn/Bếp) hỗ trợ phân trang `SharedTable`, bộ lọc danh mục món, và bộ lọc trạng thái (Tất cả / Đã có công thức / Chưa có công thức).
    2. **Nút thao tác nhanh `[Công thức]` trên bảng `/dishes`**: Cho phép mở trực tiếp modal cấu hình công thức của món ăn đó mà không cần phải chuyển trang.
- **Lý do lựa chọn**: Tạo sự thuận tiện tối đa cho luồng thao tác của người dùng, gắn kết chặt chẽ giữa Master Data Món ăn (RM-006) và Master Data Công thức (RM-007).
- **Các phương án thay thế đã xem xét**:
  - *Chỉ làm trang `/recipes` độc lập*: Bị từ chối vì người dùng phải copy ID/tên món hoặc chuyển đổi qua lại giữa hai màn hình rất mất thời gian.
  - *Chỉ nhúng vào modal Món ăn của `/dishes`*: Bị từ chối vì không có màn hình tổng quan để lọc và rà soát các món còn thiếu công thức trên toàn thực đơn.

---

### Nghiên cứu 6: Tính toán Chi phí Giá vốn Lý thuyết và Tỷ lệ Food Cost %

- **Bối cảnh**: Bếp trưởng và Quản lý cần biết giá vốn ước tính để đưa ra quyết định định giá bán cho món ăn hoặc tối ưu hóa định lượng.
- **Quyết định**:
  - Công thức tính:
    $$\text{ItemEstimatedCost}_i = \text{BaseQuantity}_i \times \text{Ingredient}_i\text{.EstimatedPrice}$$
    $$\text{TotalEstimatedCost} = \sum_{i=1}^{n} \text{ItemEstimatedCost}_i$$
    $$\text{FoodCostPercentage} = \begin{cases} \left(\frac{\text{TotalEstimatedCost}}{\text{Dish.Price}}\right) \times 100\% & \text{khi } \text{Dish.Price} > 0 \\ 0\% & \text{khi } \text{Dish.Price} = 0 \end{cases}$$
  - Thực hiện tính toán tức thời (real-time) ngay trên form khi người dùng thay đổi số lượng, đơn vị, hệ số quy đổi hoặc thêm/bớt nguyên liệu.
- **Lý do lựa chọn**: Cung cấp phản hồi trực quan ngay lập tức, hỗ trợ đầu bếp cân đối chi phí nguyên liệu trong quá trình thiết lập công thức.
- **Các phương án thay thế đã xem xét**:
  - *Chỉ tính toán ở backend sau khi bấm Lưu*: Bị từ chối vì trải nghiệm người dùng kém; đầu bếp không biết được tỷ lệ giá vốn thay đổi thế nào khi thử nghiệm điều chỉnh định lượng.

---

### Nghiên cứu 7: Cơ chế Quản lý Phiên bản Công thức (`Recipe Versioning`)

- **Bối cảnh**: Công thức món ăn có thể thay đổi theo thời gian (ví dụ: mùa đông thêm gia vị cay, đổi tỷ lệ nguyên liệu). Các đơn hàng POS trong quá khứ không được phép bị tính toán lại hồi tố.
- **Quyết định**:
  - Aggregate Root `Recipe` quản lý thuộc tính `Version` (kiểu số nguyên `int`, bắt đầu từ 1).
  - Mỗi khi thực hiện cập nhật công thức thông qua `RecipeManager.UpdateAsync`, hệ thống tự động tăng `Version += 1` (`recipe.BumpVersion()`).
  - Phân hệ Bán hàng POS (RM-010) khi tạo đơn hàng sẽ ghi nhận snapshot hoặc tra cứu phiên bản công thức tại thời điểm phát sinh đơn hàng, đảm bảo tính bất biến 100% của số liệu kiểm toán lịch sử.
- **Lý do lựa chọn**: Đơn giản, hiệu quả, phù hợp với kiến trúc Aggregate Root của ABP Framework và bảo toàn tính toàn vẹn dữ liệu kế toán.
