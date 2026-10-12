# Đặc tả Tính năng (Feature Specification): Tồn kho - Khóa/Khôi phục (Inventory Deactivate & Restore)

**Mã Tính năng (Feature ID)**: `RM-013`

**Nhánh Tính năng (Feature Branch)**: `013-rm-013-inventory-deactivate-restore`

**Ngày cập nhật**: 2026-10-12

**Trạng thái**: Hoàn thiện Đặc tả & Đã làm rõ (Clarified & Ready for Plan)

**Đầu vào**: Yêu cầu nghiệp vụ từ Roadmap RM-013: "Thêm luồng khóa, ẩn sản phẩm khỏi kho hoặc khôi phục lại khi cần. Bổ sung cơ chế Khóa/Tạm ngưng (Deactivate) và Khôi phục (Restore) đối với từng lô hàng hoặc mặt hàng tồn kho cụ thể."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 29-09-2026 (Lần 1)
- **Q**: Khi thực hiện vô hiệu hóa một mặt hàng tại trang Quản lý Inventory, trạng thái không khả dụng và lý do có được lưu vết như thế nào?
  - **A**: Trạng thái vô hiệu hóa kèm lý do được lưu trữ dưới dạng thuộc tính nghiệp vụ (`IsActive = false` và `DeactivationReason`), phân biệt rõ ràng với việc xóa mềm kỹ thuật (`ISoftDelete`), đảm bảo dữ liệu lịch sử và kiểm toán không bị mất mát.

### Phiên 29-09-2026 (Lần 2 - `/speckit.clarify`)
- **Q1: Trạng thái & Phạm vi dữ liệu**: Khi vô hiệu hóa item ở trang Quản lý Tồn kho (Inventory), hệ thống xử lý trạng thái hiển thị bên Quản lý Nguyên liệu như thế nào?
  - **A1**: Màn hình danh sách vô hiệu hóa ở Quản lý Nguyên liệu là danh sách tra cứu các nguyên liệu tồn kho đang bị vô hiệu hóa (`IsActive = false`), hiển thị kèm Tên nguyên liệu và lý do vô hiệu hóa.
- **Q2: Tổ chức Giao diện Màn hình Vô hiệu hóa**: Trang danh sách nguyên liệu bị vô hiệu hóa trong phân hệ Quản lý Nguyên liệu được tổ chức theo hình thức nào?
  - **A2**: Tạo màn hình riêng biệt với đường dẫn `/ingredients/deactivated`, đồng thời bổ sung các nút điều hướng chuyển đổi qua lại giữa màn hình danh sách nguyên liệu (`/ingredients`) và màn hình nguyên liệu vô hiệu hóa (`/ingredients/deactivated`).
- **Q3: Ràng buộc Tồn kho thực tế (`CurrentStock > 0`)**: Khi item tồn kho vẫn còn số lượng tồn thực tế (`CurrentStock > 0`), hệ thống xử lý thế nào khi người dùng vô hiệu hóa?
  - **A3**: Vẫn cho phép vô hiệu hóa, nhưng trên Modal nhập lý do sẽ hiển thị thêm thông tin/cảnh báo nổi bật về số lượng tồn kho hiện tại để người dùng nắm rõ trước khi xác nhận.
- **Q4: Hành vi nút Chỉnh sửa trên Item Inactive**: Nút Chỉnh sửa cho phép thao tác gì khi item đang ở trạng thái không khả dụng?
  - **A4**: Cho phép chỉnh sửa thông tin cấu hình tồn kho cơ bản (như mức tồn tối thiểu `MinStock`) mà không mở lại các hành động nghiệp vụ (Nhập kho, Xuất kho, Dọn kho).

### Phiên 30-09-2026 (Lần 3 - `/speckit.clarify` - Vô hiệu hóa Dây chuyền)
- **Q1: Vô hiệu hóa Dây chuyền (Cascading Deactivation)**: Khi một item bị vô hiệu hóa tại Inventory, hệ thống xử lý các công thức và món ăn liên quan như thế nào?
  - **A1**: Thực hiện vô hiệu hóa dây chuyền toàn diện:
    1. Cập nhật `Ingredient.IsActive = false`, lưu `Ingredient.DeactivationReason`.
    2. Mọi công thức (`Recipe`) có chứa nguyên liệu này (qua `RecipeIngredient`) đều bị chuyển thành `Recipe.IsActive = false`, ghi nhận lý do tự động: `$"Vô hiệu hóa do nguyên liệu '{Ingredient.Name}' bị vô hiệu hóa: {Reason}"`.
    3. Món ăn (`Dish`) gắn với công thức đó bị chuyển thành `Dish.IsActive = false`, ghi nhận `Dish.DeletionReason = $"Vô hiệu hóa do nguyên liệu '{Ingredient.Name}' bị vô hiệu hóa: {Reason}"`.
    4. Món ăn trong Thực đơn Hàng ngày (`DailyMenuItem`) được đánh dấu "Tạm ngưng phục vụ", POS lập tức chặn order món ăn đó.
- **Q2: Hành vi khi Kích hoạt lại (Reactivation / Smart Restore)**: Khi Item được kích hoạt lại (tại màn hình Tồn kho hoặc khi khôi phục thông minh), các Recipe và Dish trước đó có tự động kích hoạt lại không?
  - **A2**: **KHÔNG tự động kích hoạt lại**. Hệ thống chỉ kích hoạt lại `Ingredient` (`IsActive = true`, xóa `DeactivationReason`). Các `Recipe` và `Dish` liên quan **vẫn giữ nguyên trạng thái vô hiệu hóa** để Bếp trưởng và Quản lý chủ động rà soát công thức trước khi mở bán trở lại.
- **Q3: Xử lý Thực đơn Hàng ngày (Daily Menu)**: Khi Dish bị vô hiệu hóa dây chuyền, các món trong Daily Menu đang áp dụng (hôm nay hoặc tương lai) xử lý ra sao?
  - **A3**: Đánh dấu các món ăn đó trong Daily Menu là **"Tạm ngưng phục vụ / Không khả dụng"** (bổ sung ghi chú `[Đã ngừng phục vụ]` trên `DailyMenuItem`), ngăn chặn hoàn toàn nhân viên POS gọi món/order món ăn đó.

### Phiên 12-10-2026 (Lần 4 - `/speckit.clarify` - Chuẩn hóa Toàn diện 5 Quyết định Kiến trúc & Vận hành)
- **Q1: Phân định cơ chế Khóa/Khôi phục giữa Mặt hàng tồn kho (Tab 1) và Lô hàng tồn kho (Tab 2) trên trang `/inventory`?**
  - **A1**:
    1. **Tại Tab 1 (Tổng quan Tồn kho / Mặt hàng Nguyên liệu)**: Nút thao tác "Xóa/Tạm ngưng" thực hiện vô hiệu hóa toàn bộ mặt hàng nguyên liệu đó trong kho và kích hoạt Cascading Deactivation (đồng bộ `Ingredient.IsActive = false`, khóa các Recipe và Dish liên quan). Cột thao tác của mặt hàng chuyển sang hiển thị đúng 2 nút: **Kích hoạt lại** và **Chỉnh sửa**.
    2. **Tại Tab 2 (Danh sách Lô hàng - `InventoryBatch`)**: Bổ sung thao tác Tạm khóa / Khôi phục cho từng lô hàng cụ thể (`InventoryBatch.IsActive = false / true`). Khóa một lô hàng CHỈ loại trừ lô đó khỏi thuật toán xuất kho FEFO (giữ nguyên số lượng tồn để kiểm định chất lượng, không hủy số lượng như hành động Discard), và **KHÔNG kích hoạt Cascading Deactivation** nếu mặt hàng vẫn còn các lô hàng hợp lệ khác.
- **Q2: Quy trình Khôi phục Thông minh khi Thiết lập Tồn kho (Smart Restoration on Setup)?**
  - **A2**: Khi người dùng mở Modal "Thiết lập tồn kho" hoặc "Thêm nguyên liệu" và chọn một nguyên liệu đã tồn tại trong cơ sở dữ liệu nhưng đang ở trạng thái `IsActive == false`, hệ thống phát hiện và hiển thị hộp thoại cảnh báo: *"Nguyên liệu này đã tồn tại trong hệ thống nhưng đang bị vô hiệu hóa. Bạn có muốn khôi phục lại nguyên liệu này không?"*.
    - Nếu Đồng ý: Hệ thống khôi phục trạng thái hoạt động (`IsActive = true`, xóa lý do vô hiệu hóa), cập nhật các giá trị thiết lập mới (`MinStock`), thông báo thành công và làm mới danh sách.
    - Nếu Từ chối: Hủy bỏ thao tác và thông báo thông điệp giải thích rõ ràng, ngăn chặn việc tạo bản ghi trùng lặp.
- **Q3: Xử lý các đơn hàng POS dở dang (Active Orders) khi nguyên liệu/món ăn bị vô hiệu hóa dây chuyền?**
  - **A3**: Hệ thống **chỉ ngăn chặn việc gọi món mới trên POS** (loại khỏi menu chọn món hoặc báo lỗi nếu cố tình thêm vào order mới). Đối với các đơn hàng hiện hữu đang phục vụ dở dang tại bàn (đã gọi món nhưng chưa thanh toán), các món ăn vẫn được giữ nguyên để nhà bếp hoàn tất chế biến và thu ngân tiến hành thanh toán bình thường mà không bị gián đoạn vận hành.
- **Q4: Hiển thị và bộ lọc đối với các mặt hàng đã bị vô hiệu hóa trên Tab 1 (Tổng quan Tồn kho)?**
  - **A4**: Mặc định bảng dữ liệu Tab 1 hiển thị các mặt hàng đang hoạt động (`IsActive = true`) để giao diện gọn gàng. Trên thanh công cụ tìm kiếm & lọc bổ sung bộ chọn **Trạng thái hoạt động** gồm 3 tùy chọn: **Đang hoạt động** (Mặc định), **Đã tạm ngưng / Khóa**, và **Tất cả**. Khi chọn hiển thị các mặt hàng đã khóa, cột Thao tác hiển thị đúng 2 nút: **Kích hoạt lại** và **Chỉnh sửa**.
- **Q5: Yêu cầu ghi nhận lý do khi tạm khóa từng Lô hàng cụ thể (InventoryBatch) trên Tab 2?**
  - **A5**: **Bắt buộc nhập lý do tạm khóa lô**. Hệ thống cung cấp Modal tạm khóa tích hợp danh mục lý do mẫu (Chờ kiểm định chất lượng, Nghi ngờ biến chất/hư hỏng, Lỗi quy cách đóng gói, Khác) kèm ô nhập ghi chú chi tiết. Bổ sung trường `DeactivationReason` (`string?`, tối đa 500 ký tự) vào thực thể `InventoryBatch` để phục vụ đối soát kiểm định chất lượng và lưu vết kiểm toán.
- **Q6: Phân quyền và vai trò người dùng (ABP Permissions) đối với các thao tác Khóa và Khôi phục?**
  - **A6**: Áp dụng phân cấp quyền hạn chặt chẽ:
    - **Vô hiệu hóa / Khôi phục Mặt hàng tồn kho (ảnh hưởng dây chuyền đến Recipe và Dish)**: Yêu cầu quyền Quản lý (`TooHungryPermissions.Inventories.Edit` / `Delete`), chỉ tài khoản có vai trò Quản lý (`Manager`) hoặc Quản trị viên (`Admin`) mới được phép thực hiện.
    - **Tạm khóa / Khôi phục Lô hàng tồn kho cụ thể (`InventoryBatch`)**: Cho phép cả Thủ kho (`WarehouseKeeper`), Quản lý (`Manager`) và Quản trị viên (`Admin`) thực hiện (`TooHungryPermissions.Inventories.Adjust` hoặc `TooHungryPermissions.Inventories.DeactivateBatch`) nhằm kịp thời cách ly hàng lỗi/nghi ngờ biến chất mà không cần chờ phê duyệt cấp cao.
- **Q7: Chỉ báo cảnh báo trên giao diện Quản lý Công thức (Recipe) và Món ăn (Dish) khi có nguyên liệu bị vô hiệu hóa?**
  - **A7**: Hiển thị huy hiệu cảnh báo vàng cam `[Chứa nguyên liệu tạm ngưng]` trên danh sách Recipe và Dish; khi mở modal chi tiết thì highlight màu cam các dòng nguyên liệu thành phần bị khóa kèm tooltip hiển thị lý do vô hiệu hóa cụ thể.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Trong hệ thống nhà hàng **Acme.TooHungry**, việc xóa cứng hoặc xóa ngay lập tức một bản ghi tồn kho mà không có lý do có thể gây sai lệch đối soát kho, nhầm lẫn dữ liệu hoặc mất lịch sử luân chuyển nguyên liệu.

Tính năng **Tồn kho - Khóa/Khôi phục (RM-013)** chuẩn hóa quy trình **Vô hiệu hóa (Soft Deactivation)**, **Vô hiệu hóa Dây chuyền (Cascading Deactivation)**, **Tạm ngưng Lô hàng (Batch Deactivation)**, **Kích hoạt lại (Reactivation)** và **Khôi phục thông minh khi thiết lập tồn kho (Smart Restoration on Setup)**:
1. **Tại trang Quản lý Tồn kho (`/inventory`)**:
   - **Tab 1 (Tổng quan Tồn kho)**: Thao tác "Tạm ngưng / Xóa" được thay thế bằng quy trình mở Modal bắt buộc nhập **Lý do vô hiệu hóa**. Nếu mặt hàng còn số lượng tồn (`CurrentStock > 0`), Modal hiển thị cảnh báo tồn kho còn lại. Sau khi xác nhận, mặt hàng chuyển sang trạng thái **Không khả dụng (Inactive)** và kích hoạt **Vô hiệu hóa Dây chuyền (Cascading Deactivation)** (khóa công thức `Recipe`, khóa món ăn `Dish`, đánh dấu `DailyMenuItem` trên POS). Cột thao tác của mặt hàng chỉ hiển thị duy nhất **2 nút**: **Kích hoạt lại** và **Chỉnh sửa**.
   - Mặc định bảng Tab 1 chỉ hiển thị mặt hàng đang hoạt động; người dùng có thể dùng bộ lọc trạng thái (Đang hoạt động / Đã tạm ngưng / Tất cả) để rà soát mặt hàng bị khóa.
   - Bấm nút **Kích hoạt lại** sẽ hiển thị Modal xác nhận để khôi phục mặt hàng về trạng thái hoạt động bình thường (`Ingredient.IsActive = true`, xóa `DeactivationReason`). Các `Recipe` và `Dish` liên quan **vẫn giữ nguyên trạng thái vô hiệu hóa** để Bếp trưởng/Quản lý chủ động rà soát công thức trước khi mở bán lại.
   - **Tab 2 (Danh sách Lô hàng)**: Cho phép thủ kho tạm khóa (`InventoryBatch.IsActive = false`) từng lô hàng cụ thể kèm lý do khi nghi ngờ chất lượng cần cách ly kiểm định; lô bị khóa sẽ không được thuật toán FEFO đưa vào danh sách xuất kho. Bấm khôi phục lô sẽ đưa lô hàng trở lại chu kỳ FEFO bình thường.
2. **Tại phân hệ Quản lý Nguyên liệu (`/ingredients`)**:
   - Bổ sung màn hình riêng biệt `/ingredients/deactivated` để theo dõi tập trung các **Nguyên liệu đang bị vô hiệu hóa**, có nút chuyển đổi linh hoạt qua lại với trang `/ingredients`. Bảng danh sách tinh gọn với đúng **4 cột**: **STT**, **Tên nguyên liệu**, **Lý do vô hiệu hóa**, và **Thao tác** (Nút Kích hoạt lại).
3. **Khi Thiết lập Tồn kho mới (Inventory Setup)**:
   - Nếu người dùng chọn thiết lập một nguyên liệu đã tồn tại trong hệ thống nhưng đang ở trạng thái bị vô hiệu hóa, hệ thống đưa ra cảnh báo và hỏi người dùng có muốn **khôi phục lại nguyên liệu** này không. Nếu đồng ý thì khôi phục sản phẩm sang khả dụng và lưu cấu hình tồn kho thành công; nếu từ chối thì báo lỗi và hủy thao tác.
4. **Tại phân hệ Bếp & Thực đơn (Recipe & Dishes)**:
   - Hiển thị huy hiệu `[Chứa nguyên liệu tạm ngưng]` trên bảng danh sách, và highlight các thành phần bị khóa trong modal công thức kèm tooltip lý do giúp Bếp trưởng xử lý nhanh.

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Vô hiệu hóa Mặt hàng Tồn kho kèm Lý do & Vô hiệu hóa Dây chuyền (Ưu tiên: P1)

Là một Quản lý kho, tôi muốn khi ấn nút tạm ngưng một mặt hàng trong bảng Tồn kho (Tab 1) thì hệ thống yêu cầu nhập lý do vô hiệu hóa, sau đó chuyển trạng thái mặt hàng thành không khả dụng, đồng thời tự động vô hiệu hóa dây chuyền các công thức (Recipe) và món ăn (Dish) chứa nguyên liệu đó, và giới hạn nút thao tác chỉ còn Kích hoạt lại và Chỉnh sửa, nhằm ghi nhận vết kiểm toán và ngăn chặn phục vụ món ăn thiếu nguyên liệu trên POS.

**Lý do cho mức độ ưu tiên này**: Đảm bảo an toàn vận hành bếp và điểm bán hàng, tránh tình trạng POS vẫn bán món ăn mà nguyên liệu cấu thành đã bị dừng sử dụng trong kho.

**Kiểm thử Độc lập**: Truy cập `/inventory` (Tab 1), bấm nút Tạm ngưng/Khóa ở nguyên liệu "Thịt bò Kobe", nhập lý do "Ngừng nhập từ nhà cung cấp cũ" và xác nhận. Kiểm tra dòng đó đổi trạng thái sang "Không khả dụng" (`IsActive = false`), cột Thao tác chỉ còn 2 nút (Kích hoạt lại, Chỉnh sửa); kiểm tra công thức món "Bò bít tết Kobe" và món ăn "Bò bít tết Kobe" chuyển thành Không khả dụng; trên POS món này bị khóa không cho gọi món mới.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** bảng Tồn kho có mặt hàng "Thịt bò Kobe" đang hoạt động (`IsActive = true`), **Khi (When)** người dùng click vào icon Tạm ngưng/Xóa trên dòng đó, **Thì (Then)** hệ thống hiển thị Modal nhập "Lý do vô hiệu hóa mặt hàng" với trường nhập liệu bắt buộc (Required).
2. **Cho trước (Given)** Modal nhập lý do đang mở, **Khi (When)** người dùng để trống lý do và ấn Xác nhận, **Thì (Then)** hệ thống hiển thị thông báo lỗi yêu cầu nhập lý do và không thực hiện thao tác.
3. **Cho trước (Given)** Modal nhập lý do đang mở và item còn tồn kho thực tế (`CurrentStock > 0`), **Khi (When)** modal hiển thị, **Thì (Then)** hệ thống hiển thị cảnh báo nổi bật màu cam về số lượng tồn kho còn lại (`CurrentStock`) trước khi xác nhận.
4. **Cho trước (Given)** Modal nhập lý do đang mở, **Khi (When)** người dùng nhập lý do hợp lệ và ấn Xác nhận, **Thì (Then)**:
   - Mặt hàng chuyển sang `IsActive = false` và lưu `DeactivationReason`.
   - Cột thao tác của item ẩn các nút khác và chỉ còn hiển thị 2 nút: **Kích hoạt lại** và **Chỉnh sửa**.
   - Nguyên liệu liên kết chuyển sang `Ingredient.IsActive = false`.
   - Toàn bộ công thức (`Recipe`) có chứa nguyên liệu này chuyển sang `IsActive = false` kèm lý do tự động.
   - Món ăn (`Dish`) tương ứng chuyển sang `IsActive = false`, lưu lý do vào `DeletionReason`.
   - Các bản ghi `DailyMenuItem` chứa món ăn này được cập nhật nhãn `[Đã ngừng phục vụ]`, POS chặn order mới món này (các đơn dở dang tại bàn vẫn được thanh toán bình thường).

---

### User Story 2 - Kích hoạt lại Mặt hàng Tồn kho bị Vô hiệu hóa (Ưu tiên: P1)

Là một Quản lý kho, tôi muốn khi bấm nút kích hoạt lại trên mặt hàng đang bị vô hiệu hóa tại bảng Tồn kho (Tab 1), hệ thống hiển thị Modal xác nhận, và khi tôi đồng ý thì mặt hàng và nguyên liệu sẽ được khôi phục trở lại trạng thái khả dụng đầy đủ tính năng trong kho, trong khi các Recipe/Dish liên quan vẫn giữ trạng thái vô hiệu hóa để Bếp trưởng chủ động kiểm tra lại trước khi mở bán.

**Lý do cho mức độ ưu tiên này**: Đảm bảo nguyên liệu có thể nhập xuất kho trở lại nhưng không tự ý mở bán món ăn khi chưa có sự rà soát công thức từ Bếp trưởng.

**Kiểm thử Độc lập**: Bấm nút Kích hoạt lại trên một mặt hàng đang không khả dụng, xác nhận trên Confirm Modal, kiểm tra mặt hàng quay về trạng thái "Khả dụng", các nút thao tác xuất hiện trở lại; kiểm tra các Recipe và Dish liên quan vẫn ở trạng thái Không khả dụng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** một mặt hàng tồn kho đang ở trạng thái "Không khả dụng" (`IsActive = false`), **Khi (When)** người dùng bấm nút "Kích hoạt lại", **Thì (Then)** hệ thống hiển thị Confirm Modal với nội dung hỏi người dùng có chắc chắn muốn kích hoạt lại mặt hàng này không.
2. **Cho trước (Given)** Confirm Modal đang hiển thị, **Khi (When)** người dùng chọn Hủy bỏ, **Thì (Then)** mặt hàng vẫn giữ nguyên trạng thái "Không khả dụng".
3. **Cho trước (Given)** Confirm Modal đang hiển thị, **Khi (When)** người dùng chọn Đồng ý/Xác nhận, **Thì (Then)**:
   - Hệ thống cập nhật trạng thái mặt hàng thành "Khả dụng" (`IsActive = true`, xóa bỏ `DeactivationReason`).
   - Cập nhật `Ingredient.IsActive = true`.
   - Phục hồi toàn bộ các nút thao tác chuẩn trong kho (Điều chỉnh tồn kho, Xem các lô, Lịch sử biến động).
   - Các `Recipe` và `Dish` liên quan trước đó **vẫn giữ nguyên trạng thái vô hiệu hóa** để người quản lý/bếp trưởng rà soát kích hoạt thủ công.

---

### User Story 3 - Khóa/Tạm ngưng và Khôi phục từng Lô hàng cụ thể (Inventory Batch) (Ưu tiên: P2)

Là một Thủ kho hoặc Quản lý, tôi muốn có khả năng tạm khóa một lô hàng cụ thể trong danh sách Lô hàng (Tab 2) kèm lý do (chọn từ danh mục mẫu hoặc nhập ghi chú) khi phát hiện nghi vấn về chất lượng hoặc bao bì cần cách ly kiểm tra, và khôi phục lại khi kiểm định đạt, để ngăn chặn thuật toán FEFO xuất nhầm lô hàng đó mà không phải xóa bỏ số lượng tồn của lô.

**Lý do cho mức độ ưu tiên này**: Quản lý chất lượng chi tiết đến từng lô hàng nhập khẩu/nhập kho theo tiêu chuẩn an toàn thực phẩm.

**Kiểm thử Độc lập**: Truy cập Tab 2 (Danh sách Lô hàng), chọn một lô hàng đang khả dụng và bấm nút Tạm khóa lô. Chọn lý do "Chờ kiểm định chất lượng" và xác nhận; kiểm tra trạng thái lô chuyển sang "Tạm ngưng" (`IsActive = false`); thử nghiệm gọi đơn hàng POS để xác nhận thuật toán FEFO bỏ qua lô này; sau đó bấm nút Kích hoạt lại lô và kiểm tra lô quay lại chu trình FEFO bình thường.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** một lô hàng `InventoryBatch` đang hoạt động (`IsActive = true`), **Khi (When)** người dùng bấm nút "Tạm khóa lô" trên dòng lô hàng đó, **Thì (Then)** hệ thống hiển thị Modal tạm khóa tích hợp dropdown danh mục lý do mẫu và ô ghi chú chi tiết.
2. **Cho trước (Given)** Modal tạm khóa lô đang mở, **Khi (When)** người dùng chọn/nhập lý do hợp lệ và xác nhận, **Thì (Then)** hệ thống cập nhật `InventoryBatch.IsActive = false`, lưu `DeactivationReason`, hiển thị huy hiệu "Đã tạm ngưng" trên dòng lô hàng, và thuật toán xuất kho FEFO tự động bỏ qua lô này.
3. **Cho trước (Given)** một lô hàng đang bị tạm khóa (`IsActive = false`), **Khi (When)** người dùng bấm nút "Khôi phục lô" và xác nhận, **Thì (Then)** hệ thống cập nhật `InventoryBatch.IsActive = true`, xóa lý do, huy hiệu chuyển về khả dụng, và thuật toán FEFO đưa lô trở lại luồng xuất kho tự động.

---

### User Story 4 - Màn hình Danh sách Nguyên liệu bị Vô hiệu hóa (`/ingredients/deactivated`) (Ưu tiên: P2)

Là một Quản lý hoặc Nhân viên kho, tôi muốn có một màn hình riêng biệt (`/ingredients/deactivated`) trong phân hệ Quản lý Nguyên liệu để theo dõi toàn bộ các nguyên liệu tồn kho đang bị vô hiệu hóa cùng lý do cụ thể, kèm nút điều hướng chuyển đổi qua lại với màn hình danh sách chính, giúp dễ dàng rà soát và kích hoạt lại khi cần.

**Lý do cho mức độ ưu tiên này**: Tách biệt luồng xem các mặt hàng ngừng sử dụng để giao diện danh sách chính không bị rối, đồng thời theo dõi tập trung lý do vô hiệu hóa.

**Kiểm thử Độc lập**: Truy cập vào phân hệ Quản lý Nguyên liệu (`/ingredients`), nhấn nút điều hướng "Xem nguyên liệu vô hiệu hóa" để chuyển sang màn hình `/ingredients/deactivated`. Kiểm tra bảng hiển thị đúng 4 cột: STT, Tên nguyên liệu, Lý do, Thao tác; bấm nút kích hoạt một dòng và kiểm tra item đó được kích hoạt lại và không còn xuất hiện trong danh sách vô hiệu hóa.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng ở màn hình Quản lý Nguyên liệu (`/ingredients`), **Khi (When)** người dùng click nút điều hướng sang màn hình nguyên liệu vô hiệu hóa, **Thì (Then)** hệ thống chuyển hướng đến `/ingredients/deactivated`.
2. **Cho trước (Given)** người dùng ở màn hình `/ingredients/deactivated`, **Thì (Then)** hệ thống hiển thị bảng dữ liệu chỉ gồm đúng **4 cột**:
   - Cột 1: Thứ tự (STT)
   - Cột 2: Tên nguyên liệu (Ingredient Name)
   - Cột 3: Lý do vô hiệu hóa (Deactivation Reason)
   - Cột 4: Thao tác (Nút Kích hoạt lại / Khôi phục)
   Đồng thời có nút "Quay lại danh sách nguyên liệu" để trở về `/ingredients`.
3. **Cho trước (Given)** bảng danh sách nguyên liệu vô hiệu hóa, **Khi (When)** người dùng ấn nút Kích hoạt tại một dòng, **Thì (Then)** hệ thống mở Confirm Modal, sau khi xác nhận thì nguyên liệu tồn kho đó được cập nhật `IsActive = true`, xóa `DeactivationReason`, và không còn xuất hiện trong danh sách này nữa.

---

### User Story 5 - Khôi phục Thông minh khi Thiết lập Tồn kho (Ưu tiên: P1)

Là một Người dùng thiết lập tồn kho, khi tôi chọn thêm tồn kho cho một nguyên liệu mà nguyên liệu đó đã từng tồn tại trong hệ thống nhưng đang bị vô hiệu hóa, hệ thống sẽ cảnh báo cho tôi biết và đề xuất khôi phục lại nguyên liệu đó thay vì báo lỗi không rõ ràng hoặc tạo trùng lặp dữ liệu.

**Lý do cho mức độ ưu tiên này**: Trải nghiệm người dùng thông minh, xử lý triệt để tình huống dữ liệu lịch sử bị trùng lặp hoặc người dùng vô tình tạo lại mặt hàng đã bị tắt trước đó.

**Kiểm thử Độc lập**: Đã có nguyên liệu X bị vô hiệu hóa tồn kho. Mở modal Thiết lập tồn kho (Thêm mới), chọn nguyên liệu X và nhập mức tồn tối thiểu, ấn Lưu. Kiểm tra cảnh báo hiển thị hỏi có muốn khôi phục không; thử cả 2 trường hợp: Đồng ý (khôi phục thành công) và Từ chối (hiển thị thông báo lỗi và hủy thao tác).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nguyên liệu A đã có bản ghi trong hệ thống nhưng đang ở trạng thái bị vô hiệu hóa (`IsActive == false`), **Khi (When)** người dùng thực hiện thiết lập tồn kho cho nguyên liệu A và ấn Lưu, **Thì (Then)** hệ thống phát hiện và hiển thị hộp thoại cảnh báo: *"Nguyên liệu này đã tồn tại trong hệ thống nhưng đang bị vô hiệu hóa. Bạn có muốn khôi phục lại nguyên liệu này không?"*.
2. **Cho trước (Given)** hộp thoại cảnh báo khôi phục đang hiển thị, **Khi (When)** người dùng chọn "Xác nhận khôi phục", **Thì (Then)** hệ thống khôi phục trạng thái khả dụng cho bản ghi tồn kho (`Ingredient.IsActive = true`), xóa `DeactivationReason`, cập nhật mức tồn tối thiểu mới (`MinStock`), thông báo thành công và đóng modal. (Recipe và Dish vẫn giữ trạng thái vô hiệu hóa chờ rà soát).
3. **Cho trước (Given)** hộp thoại cảnh báo khôi phục đang hiển thị, **Khi (When)** người dùng chọn "Không / Hủy bỏ", **Thì (Then)** hệ thống hiển thị thông báo lỗi: *"Không thể thiết lập tồn kho vì nguyên liệu đã tồn tại và đang bị vô hiệu hóa."*, đồng thời không thay đổi dữ liệu trong kho.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

1. **Nguyên liệu đang có tồn kho thực tế (`CurrentStock > 0`) nhưng bị vô hiệu hóa**:
   - Hệ thống vẫn cho phép vô hiệu hóa kèm lý do, nhưng Modal nhập lý do hiển thị thêm thông báo cảnh báo màu cam nổi bật: *"Lưu ý: Mặt hàng này hiện vẫn còn tồn kho thực tế ({CurrentStock} {BaseUnit}). Bạn có chắc chắn muốn vô hiệu hóa không?"*.
   - Item sau khi vô hiệu hóa sẽ không tham gia vào các luồng xuất kho tự động thông thường cho đến khi được kích hoạt lại.
2. **Đơn hàng POS đang phục vụ dở dang (Active Orders) khi nguyên liệu/món ăn bị vô hiệu hóa**:
   - Hệ thống CHỈ chặn gọi món mới trên POS. Các đơn hàng hiện hữu tại bàn đã gọi món trước thời điểm vô hiệu hóa vẫn được giữ nguyên đầy đủ để nhà bếp chế biến và thu ngân thanh toán bình thường, tránh gián đoạn trải nghiệm của thực khách.
3. **Món ăn đang phục vụ trong Daily Menu có nguyên liệu bị vô hiệu hóa**:
   - Ngay khi nguyên liệu bị vô hiệu hóa, hệ thống tự động tìm tất cả `DailyMenuItem` chứa món ăn tương ứng trong các Daily Menu hiện tại/tương lai, cập nhật ghi chú `[Đã ngừng phục vụ]`, đồng thời API POS loại bỏ món này khỏi danh sách món có thể đặt mới.
4. **Kích hoạt lại nguyên liệu khi công thức và món ăn vẫn đang vô hiệu hóa**:
   - Item tồn kho được kích hoạt lại để phục vụ nhập xuất kho bình thường. Bếp trưởng/Quản lý chủ động vào phân hệ Món ăn / Công thức để kiểm tra và bật lại món khi nguyên liệu đã sẵn sàng.
5. **Tạm khóa lô hàng duy nhất còn lại của một nguyên liệu**:
   - Khi lô hàng khả dụng duy nhất bị tạm khóa, tổng tồn kho khả dụng FEFO của nguyên liệu đó tạm thời tính bằng 0. Hệ thống hiển thị cảnh báo thiếu kho (`OUT_OF_STOCK` hoặc `SHORTAGE`) tương ứng trên Dashboard và Banner Cảnh báo.
6. **Người dùng mở đồng thời nhiều tab và một tab khác đã kích hoạt lại sản phẩm**:
   - Khi tab hiện tại cố gắng khôi phục hoặc kích hoạt lại, hệ thống xử lý concurrency an toàn, reload dữ liệu mới nhất mà không gây lỗi exception 500.

---

## 4. Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI quản lý trạng thái khả dụng thông qua trường `IsActive` (kiểu `bool`, mặc định `true`) và `DeactivationReason` (kiểu `string?`, tối đa 500 ký tự) trên thực thể `Ingredient` và `InventoryBatch`.
- **FR-002**: Khi người dùng nhấn nút Tạm ngưng/Xóa trên bảng Tồn kho (`/inventory`, Tab 1), hệ thống PHẢI hiển thị Modal yêu cầu nhập Lý do vô hiệu hóa thay vì xóa trực tiếp. Nếu item còn số lượng tồn (`CurrentStock > 0`), modal PHẢI hiển thị thêm cảnh báo số lượng tồn kho còn lại.
- **FR-003**: Trường Lý do trong Modal vô hiệu hóa PHẢI là bắt buộc (Required), không được để trống hoặc chỉ chứa khoảng trắng.
- **FR-004**: Sau khi xác nhận vô hiệu hóa trên Tab 1, hệ thống PHẢI chuyển trạng thái của Item thành không khả dụng (`IsActive = false`), lưu lý do vào `DeactivationReason`, và ghi nhận audit thời gian/người thực hiện.
- **FR-005**: Mặc định bảng dữ liệu Tab 1 PHẢI hiển thị các mặt hàng đang hoạt động (`IsActive = true`). Thanh công cụ tìm kiếm & lọc PHẢI cung cấp bộ chọn **Trạng thái** gồm 3 tùy chọn: `Đang hoạt động` (Mặc định), `Đã tạm ngưng / Khóa`, và `Tất cả`.
- **FR-006**: Đối với các item tồn kho ở trạng thái không khả dụng trên Tab 1, giao diện bảng Tồn kho PHẢI ẩn các nút nghiệp vụ khác (Điều chỉnh tồn kho, Xem các lô) và CHỈ hiển thị duy nhất 2 nút: **Nút Kích hoạt lại** và **Nút Chỉnh sửa**. Nút Chỉnh sửa cho phép cập nhật thông số cấu hình tồn kho (như `MinStock`) mà không mở lại các hành động nghiệp vụ kho.
- **FR-007**: Khi nhấn nút Kích hoạt lại trên item không khả dụng, hệ thống PHẢI hiển thị Confirm Modal yêu cầu người dùng xác nhận hành động kích hoạt lại.
- **FR-008**: Sau khi người dùng xác nhận kích hoạt lại, hệ thống PHẢI cập nhật trạng thái item thành khả dụng (`IsActive = true`), xóa trắng `DeactivationReason`, và phục hồi đầy đủ tất cả các nút thao tác trong kho. Các `Recipe` và `Dish` liên quan vẫn giữ nguyên trạng thái vô hiệu hóa để người quản lý rà soát kích hoạt lại thủ công.
- **FR-009**: Hệ thống PHẢI cung cấp khả năng Tạm khóa (`IsActive = false`) và Khôi phục (`IsActive = true`) cho từng lô hàng cụ thể (`InventoryBatch`) trên Tab 2 (Danh sách Lô hàng). Khi tạm khóa, hệ thống PHẢI hiển thị Modal yêu cầu chọn lý do mẫu hoặc nhập ghi chú chi tiết và lưu vào `InventoryBatch.DeactivationReason`. Lô bị tạm khóa PHẢI được thuật toán xuất kho FEFO tự động bỏ qua.
- **FR-010**: Hệ thống PHẢI cung cấp một màn hình danh sách riêng biệt với đường dẫn `/ingredients/deactivated` trong phân hệ Quản lý Nguyên liệu, kèm nút điều hướng qua lại giữa `/ingredients` và `/ingredients/deactivated`.
- **FR-011**: Bảng danh sách tại màn hình `/ingredients/deactivated` CHỈ ĐƯỢC CÓ đúng **4 cột**:
  1. Cột Thứ tự (Index / STT)
  2. Cột Tên nguyên liệu (Ingredient Name)
  3. Cột Lý do (Deactivation Reason)
  4. Cột Thao tác (Action - Nút Kích hoạt lại)
- **FR-012**: Khi thực hiện chức năng "Thiết lập tồn kho" hoặc "Thêm nguyên liệu", nếu nguyên liệu đã tồn tại trong bảng dữ liệu nhưng đang ở trạng thái bị vô hiệu hóa (`IsActive == false`), hệ thống PHẢI hiển thị thông báo xác nhận hỏi người dùng có muốn khôi phục lại hay không.
- **FR-013**: Nếu người dùng xác nhận khôi phục trong form thiết lập tồn kho, hệ thống PHẢI chuyển trạng thái tồn kho sang khả dụng (`IsActive = true`), xóa trắng `DeactivationReason`, cập nhật các giá trị thiết lập mới (như `MinStock`) và thông báo thành công.
- **FR-014**: Nếu người dùng chọn không khôi phục, hệ thống PHẢI dừng tiến trình, không tạo mới bản ghi, và hiển thị thông báo lỗi giải thích nguyên liệu đã tồn tại và đang bị vô hiệu hóa.
- **FR-015**: **Vô hiệu hóa Dây chuyền (Cascading Deactivation)**: Khi một item nguyên liệu tồn kho bị vô hiệu hóa trên Tab 1, hệ thống PHẢI tự động chuyển trạng thái của `Ingredient.IsActive = false`, tìm tất cả các công thức (`Recipe`) có chứa nguyên liệu này (qua `RecipeIngredient`) để chuyển sang `Recipe.IsActive = false` kèm `DeactivationReason`, đồng thời chuyển các món ăn (`Dish`) tương ứng sang `Dish.IsActive = false` kèm `Dish.DeletionReason`.
- **FR-016**: **Bảo vệ Thực đơn & Điểm bán hàng (POS Protection)**: Đối với các món ăn bị vô hiệu hóa dây chuyền, nếu món ăn đang có trong Thực đơn hàng ngày (`DailyMenuItem`) của các thực đơn đang mở, hệ thống PHẢI cập nhật ghi chú món là `[Đã ngừng phục vụ]` và ngăn chặn việc đặt món mới trên POS; các đơn hàng POS dở dang tại bàn vẫn được phép thanh toán bình thường.
- **FR-017**: **Chỉ báo Giao diện Recipe & Dish**: Trên danh sách Quản lý Công thức và Món ăn, hệ thống PHẢI hiển thị huy hiệu cảnh báo vàng cam `[Chứa nguyên liệu tạm ngưng]` cho các công thức/món ăn có nguyên liệu thành phần bị vô hiệu hóa; trong modal chi tiết PHẢI highlight màu cam dòng nguyên liệu bị khóa kèm tooltip giải thích lý do.
- **FR-018**: **Phân quyền người dùng (ABP Permissions)**:
  - Thao tác Vô hiệu hóa / Khôi phục Mặt hàng tồn kho: Bắt buộc quyền Quản lý (`TooHungryPermissions.Inventories.Edit` / `Delete`), chỉ vai trò `Manager` hoặc `Admin` mới được thực hiện.
  - Thao tác Tạm khóa / Khôi phục Lô hàng (`InventoryBatch`): Cho phép cả `WarehouseKeeper`, `Manager` và `Admin` thực hiện để kịp thời cách ly hàng lỗi.
- **FR-019**: Toàn bộ nhãn, tiêu đề, placeholder, thông báo cảnh báo và thông báo lỗi PHẢI được cấu hình song ngữ trong cả hai tệp `en.json` và `vi.json` theo đúng quy ước I18N.
- **FR-020**: Giao diện các Modal, Badge trạng thái và Action Buttons PHẢI tuân thủ nghiêm ngặt Theme Cam & Trắng (`#EA580C`, `#FFF3E8`, `#FFFFFF`, bo góc 12px - 16px).

---

### Các Thực thể Chính (Key Entities)

- **Ingredient**:
  - `IsActive`: `bool` (Mặc định `true`). Chỉ định nguyên liệu đang hoạt động hay bị vô hiệu hóa.
  - `DeactivationReason`: `string?` (Tối đa 500 ký tự). Lưu lý do khi người dùng thực hiện vô hiệu hóa.
  - `MinStock`: `decimal`. Ngưỡng tồn kho tối thiểu.
  - `StorageType`: `StorageType` (FRESH / SHORT_TERM / LONG_TERM).
  - `ConsumptionMethod`: `ConsumptionMethod` (RECIPE / MANUAL / HYBRID).
- **InventoryBatch**:
  - `IsActive`: `bool` (Mặc định `true`). Cho phép tạm khóa/cách ly từng lô hàng cụ thể khỏi luồng xuất kho FEFO mà không xóa số lượng còn lại.
  - `DeactivationReason`: `string?` (Tối đa 500 ký tự). Lưu lý do tạm khóa lô (chọn từ danh mục mẫu hoặc nhập ghi chú).
  - `RemainingQuantity`: `decimal`. Số lượng tồn còn lại của lô hàng.
  - `ExpiryDate`: `DateTime`. Hạn sử dụng của lô hàng.
- **Recipe**:
  - `IsActive`: `bool` (Mặc định `true`). Bị chuyển sang `false` khi có bất kỳ nguyên liệu thành phần nào trong `RecipeIngredient` bị vô hiệu hóa.
  - `DeactivationReason`: `string?` (Tối đa 500 ký tự). Ghi nhận lý do vô hiệu hóa dây chuyền.
- **Dish**:
  - `IsActive`: `bool`. Bị chuyển sang `false` khi Recipe tương ứng bị vô hiệu hóa.
  - `DeletionReason`: `string?`. Ghi nhận lý do vô hiệu hóa dây chuyền.
- **DailyMenuItem**:
  - Cập nhật ghi chú `[Đã ngừng phục vụ]` khi món ăn `Dish` liên kết bị vô hiệu hóa, POS chặn đặt món mới.

---

## 5. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% các thao tác nhấn nút tạm ngưng/xóa tại Tab 1 trang Tồn kho đều kích hoạt Modal nhập lý do, không còn bất kỳ trường hợp nào xóa thẳng không qua nhập lý do.
- **SC-002**: 100% các mặt hàng ở trạng thái không khả dụng trên Tab 1 bảng Tồn kho chỉ hiển thị đúng 2 nút: Kích hoạt lại và Chỉnh sửa.
- **SC-003**: 100% các lô hàng ở trạng thái tạm khóa (`InventoryBatch.IsActive = false`) trên Tab 2 được thuật toán xuất kho FEFO tự động bỏ qua, không gây sai lệch số lượng tồn thực tế.
- **SC-004**: Trang danh sách nguyên liệu vô hiệu hóa tại `/ingredients/deactivated` hiển thị chính xác đúng 4 cột theo đặc tả, không thừa không thiếu.
- **SC-005**: 100% các chuỗi ngôn ngữ được tra cứu qua `abpLocalization` với đầy đủ định nghĩa trong cả `en.json` và `vi.json`.
- **SC-006**: Khi thiết lập tồn kho cho nguyên liệu đã bị vô hiệu hóa, hộp thoại xác nhận khôi phục được hiển thị 100% trường hợp, xử lý đúng hành vi khi người dùng chọn Đồng ý hoặc Từ chối.

---

## 6. Các Giả định (Assumptions)

- Phân quyền: Tính năng vô hiệu hóa và kích hoạt lại tồn kho sử dụng quyền quản lý kho hiện có (`TooHungryPermissions.Inventories.Default` / `Delete` / `Edit`).
- Cơ chế lưu trữ: Do ABP Framework có cơ chế `ISoftDelete`, trường `IsActive` và `DeactivationReason` được quản lý như một thuộc tính nghiệp vụ (Business State) trên `Ingredient` và `InventoryBatch`, đảm bảo dữ liệu vẫn truy vấn được để phục vụ màn hình danh sách vô hiệu hóa `/ingredients/deactivated` và kiểm tra khi thiết lập kho mới.
- Vô hiệu hóa dây chuyền & Khôi phục: Khi vô hiệu hóa một mặt hàng nguyên liệu ở kho, `Ingredient.IsActive = false` và các `Recipe`/`Dish` liên quan bị khóa tự động để bảo vệ an toàn bán hàng. Khi kích hoạt lại ở kho, chỉ có `Ingredient.IsActive = true`, các `Recipe` và `Dish` liên quan vẫn giữ nguyên trạng thái vô hiệu hóa để Bếp trưởng/Quản lý chủ động rà soát chất lượng công thức trước khi mở bán trở lại.
