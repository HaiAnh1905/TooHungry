# Đặc tả Tính năng (Feature Specification): Quản lý Món ăn & Danh mục (Dishes) (RM-006)

**Nhánh Tính năng (Feature Branch)**: `006-rm-006-dishes-and-dish-categories`

**Ngày tạo**: 2026-09-23

**Ngày cập nhật**: 2026-10-08

**Trạng thái**: Đã làm rõ (Clarified)

**Đầu vào**: Mô tả từ roadmap: "Danh sách các món ăn bán trong nhà hàng, hình ảnh, giá bán, danh mục món. Thực thể: Dish, DishCategory — list, tạo, sửa, xoá. Phụ thuộc: RM-002."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 08-10-2026 (Đồng bộ chuẩn hóa RM-006 với Kiến trúc hệ thống và Roadmap)
- **Q1: Hiện trạng tầng Backend & API của Món ăn và Danh mục**:
  → **A1**: Đã hoàn thiện toàn diện:
  - **Domain Entities**: `Dish` và `DishCategory` kế thừa `FullAuditedAggregateRoot<Guid>`.
  - **Domain Services**: `DishManager` (kiểm tra tính duy nhất của tên món không phân biệt chữ hoa/thường, chặn giá bán âm `< 0`, chuyển đổi trạng thái kinh doanh `ToggleActiveAsync`, xóa món bắt buộc lý do `DeleteWithReasonAsync` và tự động cập nhật ghi chú `[Đã ngừng phục vụ]` trên `DailyMenuItem`), `DishCategoryManager` (kiểm tra tính duy nhất của tên danh mục, chặn xóa danh mục nếu đang có món ăn trực thuộc `CheckCanDeleteAsync`).
  - **Application Services & Contracts**: `DishAppService`, `DishCategoryAppService`, `IDishAppService`, `IDishCategoryAppService` hỗ trợ đầy đủ CRUD, phân trang, lọc theo danh mục / từ khóa / trạng thái kinh doanh, và API gom nhóm thực đơn cho POS `GetMenuForPosAsync`.
  - **Controller RESTful**: `DishController` (`api/app/dish`) và auto conventional controller cho `DishCategoryAppService` (`api/app/dish-category`).
  - **Kiểm thử tự động**: Đã có bộ test suite tích hợp trong `Acme.TooHungry.Application.Tests/Dishes/` (`DishAppService_Tests`, `DishCategoryAppService_Tests`).
- **Q2: Thiết kế Giao diện UI/UX theo Design System RM-002 (Orange & White Theme)**:
  → **A2**: Giao diện quản lý thực đơn và danh mục món tuân thủ thiết kế Cam & Trắng hiện đại của hệ thống:
  - Sử dụng các Shared Components từ RM-002: `SharedTable` (phân trang, sắp xếp, tìm kiếm), `SharedModal` (form thêm/sửa, modal xác nhận xóa kèm nhập lý do).
  - Tổ chức Tab lọc theo trạng thái: Tab "Đang phục vụ", "Tạm ngưng", và "Tất cả" kèm huy hiệu đếm số lượng món (badge count).
  - Huy hiệu trạng thái (Status Badge): Xanh lá (`Đang kinh doanh`) và Xám (`Tạm ngưng`).
  - Hiển thị hình ảnh: Hỗ trợ khung xem trước ảnh (Image Preview) theo thời gian thực khi dán link hoặc upload ảnh qua Cloudinary, kèm ảnh thay thế dự phòng (Fallback Placeholder) khi link ảnh bị lỗi hoặc để trống.
- **Q3: Quốc tế hóa (i18n)**:
  → **A3**: Toàn bộ nhãn form, tiêu đề bảng, thông điệp lỗi nghiệp vụ và thông báo Toaster đều hỗ trợ 100% song ngữ Tiếng Việt (`vi.json`) và Tiếng Anh (`en.json`).
- **Q4: Mã món ăn (Dish Code / SKU)**: Món ăn (`Dish`) có cần bổ sung trường Mã món (Dish Code / SKU) để phục vụ tìm kiếm và order nhanh trên màn hình POS không?
  → **A4**: Không bổ sung trường Code riêng; giữ nguyên cấu trúc Entity hiện tại (tìm kiếm trên POS và quản trị thực hiện trực tiếp bằng Tên món `Name` hoặc Mô tả).
- **Q5: Chính sách Đơn giá niêm yết (`Price`) và Thuế/Phí**: Đơn giá món ăn được hiểu là giá đã bao gồm thuế (Gross Price) hay giá chưa thuế (Net Price)?
  → **A5**: Đơn giá (`Price`) là giá gộp (Gross Price - đã bao gồm mọi khoản thuế VAT và phí nếu có). Khách hàng thanh toán đúng mức giá niêm yết này, màn hình POS và hóa đơn thanh toán sẽ áp dụng trực tiếp đơn giá này để tính tổng tiền.
- **Q6: Phạm vi quản lý Món Combo / Set Menu**: Món ăn trong RM-006 có cần hỗ trợ quản lý Món Combo / Set (gồm nhiều món con bên trong) không?
  → **A6**: RM-006 chỉ quản lý Món ăn đơn lẻ (`Single Dish`). Các hình thức Combo hoặc Set thực đơn được phân bổ sang phân hệ Bán hàng POS (`POS` - RM-010) trong giai đoạn vận hành sau để giữ Master Data món ăn rõ ràng, tách bạch trách nhiệm.
- **Q7: Thao tác hàng loạt (Bulk Operations) trên Giao diện Món ăn**: Giao diện Quản lý món ăn có cần hỗ trợ thao tác hàng loạt (chọn nhiều món để Tạm ngưng/Kích hoạt cùng lúc) không?
  → **A7**: Có. Bổ sung thanh thao tác hàng loạt (Bulk Actions Bar) khi người dùng tích chọn checkbox ở các dòng món ăn, cho phép quản lý nhanh chóng Bật (`Bulk Activate`) hoặc Tạm ngưng (`Bulk Deactivate`) hàng loạt món cùng lúc (hữu ích khi hết hàng đột xuất hoặc chuyển ca). Không áp dụng thao tác Xóa hàng loạt để triệt tiêu rủi ro mất an toàn dữ liệu và bảo đảm mỗi thao tác xóa đều có lý do kiểm toán riêng.
- **Q8: Thứ tự hiển thị Danh mục món ăn (`DishCategory.DisplayOrder`)**: Danh mục món ăn có cần thuộc tính Thứ tự hiển thị để chủ động sắp xếp trên giao diện và màn hình POS không?
  → **A8**: Có. Bổ sung thuộc tính `DisplayOrder` (kiểu số nguyên `int`, mặc định 0) vào `DishCategory`. Bảng danh mục cho phép quản lý nhập thứ tự ưu tiên, và danh sách Tab lọc cũng như màn hình POS sẽ ưu tiên sắp xếp theo `DisplayOrder` tăng dần trước khi sắp xếp theo Tên danh mục (A-Z).

### Phiên 24-09-2026
- Q: Món ăn (`Dish`) có cần trường trạng thái `IsActive` (Đang kinh doanh / Tạm ngưng phục vụ) độc lập với thao tác Xóa mềm (Soft Delete) không?  
  → A: Có, bổ sung thuộc tính `bool IsActive { get; set; } = true` vào `Dish` để cho phép bật/tắt kinh doanh món linh hoạt trên thực đơn và màn hình POS mà không cần xóa mềm bản ghi.
- Q: Kiểu dữ liệu của đơn giá món ăn (`Dish.Price`) trong mã nguồn C# và cơ sở dữ liệu có nên chuẩn hóa thành `decimal` thay vì `float` không?  
  → A: Có, chuẩn hóa `Price` sang kiểu `decimal` (trong Domain Entity, DTOs và cấu hình EF Core) để đảm bảo độ chính xác tuyệt đối trong tính toán tiền tệ và hóa đơn, đồng bộ với `OrderItem.UnitPrice`.
- Q: Khi tạo mới hoặc cập nhật một món ăn (`Dish`), việc liên kết với công thức định lượng (`Recipe`) là bắt buộc hay tùy chọn?  
  → A: Tùy chọn (Optional). Món ăn được phép tạo và kinh doanh bình thường khi chưa có `Recipe` (phù hợp với đồ uống đóng lon/chai hoặc món ăn liền); công thức định lượng sẽ được cấu hình bổ sung sau qua module Recipe.
- Q: Giao diện quản lý danh sách Món ăn có cần cung cấp bộ lọc theo trạng thái phục vụ (`IsActive`) không?  
  → A: Có, tổ chức giao diện theo dạng Tab chuyên biệt ("Đang phục vụ" và "Tạm ngưng" kèm tab "Tất cả") giúp quản lý nhà hàng dễ dàng kiểm soát nhóm món đang bán và nhóm món cần xử lý mở bán lại.
- Q: Khi người dùng xóa một món ăn (`Dish`) mà món đó đang nằm trong Thực đơn ngày (`DailyMenu`) đang hoạt động, hệ thống nên xử lý như thế nào?  
  → A: Hiển thị hộp thoại yêu cầu người dùng nhập lý do xóa món (`DeletionReason`) để phục vụ kiểm toán và đối soát sau này; đồng thời áp dụng cơ chế Xóa mềm (`Soft Delete`) cho `Dish` và tự động chuyển các mục `DailyMenuItem` liên quan sang trạng thái "Đã ngừng phục vụ" mà không làm mất tính toàn vẹn dữ liệu.

### Phiên 23-09-2026
- Q: Một món ăn có bắt buộc phải thuộc về một danh mục món không?  
  → A: Không bắt buộc ở mức Database (trường `DishCategoryId` cho phép `nullable` để tăng tính linh hoạt). Tuy nhiên, trên giao diện và luồng nghiệp vụ khuyến nghị phân loại rõ ràng; các món chưa được gán danh mục sẽ tự động được hiển thị vào nhóm "Chưa phân loại" (Unassigned / Other Dishes).
- Q: Quy tắc tính duy nhất của Tên món ăn (`Dish.Name`) và Tên danh mục (`DishCategory.Name`) được quy định như thế nào?  
  → A: Tên món ăn và tên danh mục phải là duy nhất trên toàn hệ thống (không phân biệt chữ hoa chữ thường - case-insensitive sau khi chuẩn hóa cắt bỏ khoảng trắng thừa đầu cuối). Khi tạo mới hoặc cập nhật, hệ thống phải kiểm tra và từ chối nếu tên đã tồn tại.
- Q: Cơ chế xóa Danh mục món ăn (`DishCategory`) khi đang có món ăn trực thuộc xử lý như thế nào?  
  → A: Chặn xóa cứng. Nếu một danh mục đang được ít nhất 1 món ăn liên kết (`Dish.DishCategoryId == Category.Id`), hệ thống từ chối xóa và hiển thị thông báo lỗi thân thiện kèm số lượng món đang phụ thuộc, yêu cầu người dùng chuyển các món ăn sang danh mục khác trước khi xóa.
- Q: Cơ chế quản lý và lưu trữ hình ảnh món ăn (`ImageUrl`) được thiết kế ra sao?  
  → A: Hỗ trợ hai phương thức: (1) Tải ảnh trực tiếp lên dịch vụ lưu trữ đám mây Cloudinary CDN (kèm thanh tiến trình upload, hỗ trợ định dạng JPG, PNG, WEBP dung lượng tối đa 5MB) và (2) Nhập trực tiếp liên kết URL ảnh bên ngoài. Trên giao diện bắt buộc có khung xem trước (preview) và xử lý ảnh mặc định (fallback placeholder) khi đường dẫn ảnh bị lỗi.
- Q: Giá bán món ăn (`Price`) có những ràng buộc nghiệp vụ gì?  
  → A: Giá bán phải là số thực không âm (`Price >= 0`), tính theo đơn vị Việt Nam Đồng (VND). Giao diện hiển thị theo định dạng tiền tệ bản địa (vi-VN, vd: `35.000 đ`).
- Q: Món ăn (`Dish`) tích hợp thế nào với các phân hệ khác (Công thức Recipe, Bán hàng POS, Thực đơn ngày DailyMenu)?  
  → A:
  - Với **Công thức & Tồn kho (`Recipe`)**: Mỗi món ăn có thể liên kết với một công thức định lượng nguyên liệu (1-1) để trừ tồn kho khi bán hàng.
  - Với **Bán hàng POS (`Order`)**: Món ăn được chọn vào giỏ gọi món thông qua `OrderItem`, đơn giá tại thời điểm đặt được lưu snapshot độc lập trong `OrderItem.UnitPrice`.
  - Với **Thực đơn ngày (`DailyMenu`)**: Món ăn có thể được đưa vào thực đơn áp dụng theo ngày qua `DailyMenuItem`.
- Q: Khi xóa một món ăn (`Dish`), dữ liệu lịch sử đơn hàng cũ có bị ảnh hưởng không?  
  → A: Không bị ảnh hưởng. Do thực thể `Dish` kế thừa `FullAuditedAggregateRoot<Guid>` của ABP Framework, thao tác xóa áp dụng cơ chế Soft Delete (đánh dấu `IsDeleted = true`). Các bản ghi đơn hàng lịch sử vẫn giữ nguyên vẹn thông tin và liên kết để đối soát doanh thu.

---

## Kịch bản Người dùng & Kiểm thử *(bắt buộc)*

### User Story 1 - Quản lý Danh mục Món ăn (Priority: P1)

Là Quản lý nhà hàng, tôi muốn tạo mới, chỉnh sửa thông tin, xem danh sách và xóa các danh mục món ăn (ví dụ: Khai vị, Món chính, Món lẩu, Đồ uống, Tráng miệng) để tổ chức thực đơn khoa học và giúp nhân viên cũng như khách hàng tra cứu món dễ dàng.

**Lý do cho độ ưu tiên này**: Danh mục món là thực thể phân nhóm cơ sở của thực đơn. Thiếu danh mục, thực đơn hàng trăm món sẽ hỗn loạn và không thể hiển thị trực quan trên giao diện POS hay thực đơn điện tử.

**Kiểm thử Độc lập**: Quản lý tạo mới danh mục "Món nướng BBQ", sửa mô tả thành "Các món nướng than hoa", sau đó kiểm tra danh mục xuất hiện trong danh sách và có thể được chọn khi tạo món ăn.

**Kịch bản Chấp nhận**:

1. **Given** Quản lý đang ở trang Quản lý Danh mục món ăn, **When** nhấn "Thêm danh mục", nhập tên hợp lệ "Món nướng BBQ" kèm mô tả và bấm Lưu, **Then** hệ thống tạo danh mục thành công, hiển thị trong bảng dữ liệu với thông báo xác nhận thành công.
2. **Given** Quản lý nhập tên danh mục đã tồn tại trong hệ thống (kể cả khác cách viết hoa/thường như "món nướng bbq"), **When** bấm Lưu, **Then** hệ thống từ chối lưu và hiển thị thông báo lỗi danh mục đã tồn tại.
3. **Given** một danh mục đã tồn tại và đang KHÔNG chứa món ăn nào, **When** Quản lý xác nhận xóa danh mục, **Then** hệ thống xóa danh mục khỏi cơ sở dữ liệu và cập nhật lại bảng danh sách.
4. **Given** một danh mục đang chứa ít nhất một món ăn, **When** Quản lý cố gắng xóa danh mục này, **Then** hệ thống chặn hành động và hiển thị cảnh báo: danh mục đang được sử dụng bởi các món ăn, không thể xóa.

---

### User Story 2 - Quản lý Món ăn trong Thực đơn (Priority: P1)

Là Quản lý nhà hàng, tôi muốn thêm mới món ăn, chỉnh sửa chi tiết món (tên món, giá bán, danh mục, mô tả thành phần/hương vị, hình ảnh đại diện) và xóa món ăn khi ngừng kinh doanh để duy trì thực đơn luôn cập nhật và chính xác.

**Lý do cho độ ưu tiên này**: Món ăn là hàng hóa cốt lõi sinh ra doanh thu cho nhà hàng. Việc quản lý thông tin món và giá bán chính xác là điều kiện tiên quyết cho toàn bộ quy trình bán hàng và thanh toán.

**Kiểm thử Độc lập**: Quản lý thêm món "Bò sốt tiêu đen" với giá `120.000 đ`, chọn danh mục "Món chính", tải lên hình ảnh món và lưu lại. Món hiển thị đầy đủ trong danh sách thực đơn với ảnh preview và định dạng giá chuẩn VND.

**Kịch bản Chấp nhận**:

1. **Given** Quản lý mở form "Thêm món ăn mới", **When** nhập tên món "Phở bò đặc biệt", giá `65000`, chọn danh mục "Món chính", nhập mô tả và dán/tải link ảnh hợp lệ rồi nhấn Lưu, **Then** hệ thống lưu món ăn thành công, hiển thị trong danh sách với đầy đủ hình ảnh đại diện, danh mục và giá bán.
2. **Given** Quản lý nhập thông tin món mới với tên đã có trong thực đơn (ví dụ: "Phở Bò Đặc Biệt"), **When** nhấn Lưu, **Then** hệ thống từ chối tạo và hiển thị thông báo lỗi tên món ăn đã tồn tại.
3. **Given** Quản lý nhập giá bán là số âm (ví dụ: `-50000`), **When** bấm Lưu hoặc kiểm tra dữ liệu, **Then** hệ thống báo lỗi trường giá bán phải lớn hơn hoặc bằng 0 và không cho phép gửi yêu cầu.
4. **Given** một món ăn trong danh sách, **When** Quản lý chỉnh sửa giá bán từ `65000` thành `70000` và cập nhật hình ảnh mới, **Then** hệ thống lưu lại các thay đổi thành công và cập nhật tức thì trên bảng hiển thị.
5. **Given** một món ăn trong danh sách, **When** Quản lý chọn xóa món, **Then** hệ thống hiển thị hộp thoại xác nhận yêu cầu bắt buộc nhập lý do xóa món (`DeletionReason`), sau khi người dùng nhập lý do và bấm xác nhận, hệ thống thực hiện Xóa mềm (`Soft Delete`), lưu vết lý do xóa để kiểm soát và tự động chuyển các mục `DailyMenuItem` tương ứng sang trạng thái "Đã ngừng phục vụ".
6. **Given** một món ăn đang ở trạng thái phục vụ (`IsActive == true`), **When** Quản lý gạt công tắc chuyển sang Tạm ngưng phục vụ (`IsActive = false`), **Then** hệ thống cập nhật trạng thái ngay lập tức và ẩn món khỏi màn hình chọn món bán hàng POS mà không xóa dữ liệu món.

---

### User Story 3 - Tìm kiếm, Lọc và Sắp xếp Món ăn (Priority: P2)

Là Quản lý hoặc Nhân viên phục vụ, tôi muốn tìm kiếm nhanh món ăn theo từ khóa tên hoặc mô tả, lọc theo từng danh mục món cụ thể, và sắp xếp theo giá cả hoặc tên món để nhanh chóng tìm thấy món ăn mong muốn giữa thực đơn phong phú.

**Lý do cho độ ưu tiên này**: Khi thực đơn có hàng chục đến hàng trăm món ăn, khả năng tìm kiếm và lọc tức thì là yếu tố quyết định tốc độ thao tác và năng suất làm việc của nhân viên.

**Kiểm thử Độc lập**: Nhập từ khóa "bò" vào ô tìm kiếm và chọn bộ lọc danh mục "Món chính". Hệ thống chỉ trả về danh sách các món thuộc danh mục "Món chính" có chứa từ khóa "bò" trong tên hoặc mô tả.

**Kịch bản Chấp nhận**:

1. **Given** danh sách có nhiều món ăn thuộc các danh mục khác nhau, **When** người dùng chọn lọc theo danh mục "Đồ uống", **Then** bảng dữ liệu chỉ hiển thị các món thuộc danh mục "Đồ uống".
2. **Given** ô tìm kiếm từ khóa, **When** người dùng gõ từ khóa "lẩu thái", **Then** hệ thống lọc và hiển thị các món ăn có chứa từ khóa "lẩu thái" trong tên hoặc mô tả.
3. **Given** danh sách món đang hiển thị, **When** người dùng chọn sắp xếp "Giá: Thấp → Cao", **Then** danh sách được sắp xếp theo thứ tự giá bán tăng dần.
4. **Given** danh sách kết quả nhiều hơn số dòng trên 1 trang, **When** người dùng chuyển trang hoặc thay đổi kích thước trang (10, 20, 50 dòng/trang), **Then** hệ thống phân trang chính xác và hiển thị chỉ số tổng số bản ghi đúng thực tế.
5. **Given** giao diện quản lý thực đơn, **When** người dùng bấm chuyển đổi giữa các Tab "Đang phục vụ" và "Tạm ngưng", **Then** bảng dữ liệu lập tức lọc và hiển thị danh sách món tương ứng với trạng thái đã chọn kèm số lượng món (badge count) trên từng tab.

---

### User Story 4 - Quản lý Tải lên và Tối ưu Hình ảnh Món ăn (Cloudinary CDN) (Priority: P2)

Là Quản lý nhà hàng, tôi muốn có trải nghiệm tải lên hình ảnh món ăn trực quan (kéo thả hoặc chọn file ảnh tải trực tiếp lên Cloudinary CDN) hoặc dán link ảnh từ bên ngoài, có khung xem trước (preview) và xử lý tự động khi ảnh lỗi để đảm bảo thực đơn luôn sinh động, bắt mắt và tải nhanh.

**Lý do cho độ ưu tiên này**: Hình ảnh món ăn là yếu tố quan trọng kích thích vị giác của khách hàng trên thực đơn và giúp nhân viên nhận diện món ăn nhanh chóng trên màn hình POS cảm ứng.

**Kiểm thử Độc lập**: Quản lý kéo thả một file ảnh `pho_bo.jpg` vào vùng tải ảnh trong modal thêm món. Hệ thống hiển thị thanh tiến trình upload lên Cloudinary, tự động điền URL ảnh trả về vào form và hiển thị ảnh xem trước sắc nét.

**Kịch bản Chấp nhận**:

1. **Given** modal thêm/sửa món ăn, **When** Quản lý kéo thả hoặc chọn một tệp ảnh hợp lệ (JPG/PNG/WEBP < 5MB), **Then** hệ thống tải ảnh lên Cloudinary CDN, hiển thị thanh tiến trình và gán đường dẫn URL CDN an toàn vào dữ liệu món.
2. **Given** Quản lý chọn file có dung lượng vượt quá 5MB hoặc định dạng không hợp lệ (như .pdf, .exe), **When** chọn file, **Then** hệ thống từ chối nhận file và hiển thị cảnh báo định dạng hoặc dung lượng không được hỗ trợ.
3. **Given** Quản lý không muốn upload file mà dán trực tiếp đường dẫn URL ảnh vào ô nhập liệu, **When** URL thay đổi, **Then** khung xem trước ảnh hiển thị ảnh từ URL đó.
4. **Given** đường dẫn ảnh bị lỗi (404 hoặc đường dẫn hỏng), **When** giao diện hiển thị ảnh món ăn, **Then** hệ thống tự động hiển thị ảnh placeholder mặc định kèm biểu tượng món ăn thay vì hiển thị hình ảnh vỡ.

---

### User Story 5 - Cung cấp Dữ liệu Món ăn Nhóm theo Danh mục cho Giao diện Bán hàng POS (Priority: P3)

Là Nhân viên POS hoặc Thu ngân, tôi muốn hệ thống cung cấp nguồn dữ liệu món ăn được phân loại rõ ràng theo từng danh mục món để màn hình POS có thể hiển thị dạng thẻ lưới (Grid Card) kèm hình ảnh, tên món, giá bán và bộ lọc nhanh.

**Lý do cho độ ưu tiên này**: Module Dishes là nhà cung cấp dữ liệu nền tảng cho module POS Bán hàng (`006-pos-ordering-and-billing`). Dữ liệu món phải được tổ chức chuẩn hóa để màn hình POS tải và hiển thị mượt mà.

**Kiểm thử Độc lập**: Màn hình POS gọi service lấy danh sách món ăn, hệ thống trả về đầy đủ các món kèm thông tin danh mục, giá tiền và ảnh đại diện; cho phép lọc theo tab danh mục trên POS mà không cần gọi lại API nhiều lần.

**Kịch bản Chấp nhận**:

1. **Given** màn hình POS Order đang khởi động, **When** tải danh sách thực đơn, **Then** hệ thống trả về danh sách các món ăn kèm `DishCategoryName`, `Price`, `ImageUrl` và `Id`.
2. **Given** các món ăn không được gán danh mục (`DishCategoryId == null`), **When** hiển thị trên POS, **Then** các món này được gom chung vào nhóm danh mục "Món khác" / "Chưa phân loại" để nhân viên không bị bỏ sót món khi gọi món.

---

### Các Trường hợp Ngoại lệ

- **Tên trùng lặp dạng ẩn**: Nhập tên có chứa khoảng trắng thừa đầu cuối hoặc nhiều khoảng trắng giữa các từ (vd: `"  Phở   Bò  "`) -> Hệ thống phải tự động chuẩn hóa (`Trim()`, chuẩn hóa khoảng trắng) trước khi kiểm tra trùng và lưu trữ.
- **Xóa danh mục có món ăn phụ thuộc**: Người dùng cố tình gửi request xóa ID danh mục qua API khi danh mục vẫn còn món ăn -> Backend chặn lại với `UserFriendlyException`, không để xảy ra lỗi Foreign Key Constraint ở tầng Database.
- **Giá bán bằng 0**: Một số món ăn kèm, gia vị thêm hoặc quà tặng khuyến mãi có thể có giá bằng 0 VND -> Hệ thống cho phép giá `= 0`, nhưng nghiêm cấm giá âm (`< 0`).
- **Giá bán có phần thập phân**: Tiền tệ VND không sử dụng số thập phân lẻ xu -> Hệ thống quy định giá là số nguyên dương hoặc làm tròn đến hàng đơn vị khi lưu và hiển thị.
- **Đứt kết nối khi upload ảnh Cloudinary**: Khi quá trình upload ảnh lên đám mây gặp sự cố mạng -> Hệ thống dừng trạng thái loading, hiển thị thông báo lỗi upload và cho phép người dùng thử lại hoặc nhập link URL thủ công.
- **Dữ liệu phân trang rỗng**: Khi tìm kiếm từ khóa không khớp với bất kỳ món nào -> Bảng dữ liệu hiển thị trạng thái "Chưa có dữ liệu ở đây" (Empty State) kèm hình minh họa thân thiện thay vì bảng trống trơn.
- **Phân quyền truy cập trái phép**: Người dùng chưa đăng nhập hoặc nhân viên không có quyền `Dishes.Create` / `Dishes.Edit` / `Dishes.Delete` khi cố tình gọi API sẽ nhận mã lỗi `401 Unauthorized` hoặc `403 Forbidden`.

---

## Yêu cầu *(bắt buộc)*

### Yêu cầu Chức năng

- **FR-001**: Hệ thống PHẢI cung cấp chức năng quản lý Danh mục món ăn (`DishCategory`) bao gồm: Tạo mới, Chỉnh sửa thông tin, Thiết lập thứ tự hiển thị (`DisplayOrder`), Xem danh sách phân trang và Xóa danh mục. Danh mục trên Tab lọc và POS ưu tiên hiển thị theo `DisplayOrder` tăng dần rồi đến Tên (A-Z).
- **FR-002**: Tên danh mục món ăn (`DishCategory.Name`) PHẢI là duy nhất trên toàn hệ thống (không phân biệt hoa thường sau khi trim khoảng trắng), độ dài tối đa 128 ký tự.
- **FR-003**: Hệ thống PHẢI ngăn chặn việc xóa Danh mục món ăn nếu danh mục đó đang được liên kết với ít nhất một Món ăn (`Dish`).
- **FR-004**: Hệ thống PHẢI cung cấp chức năng quản lý Món ăn (`Dish`) bao gồm: Tạo mới món, Cập nhật thông tin món, Xem chi tiết, Xem danh sách phân trang và Xóa món ăn.
- **FR-005**: Món ăn PHẢI bao gồm các trường thông tin:
  - `Name`: Tên món ăn (Bắt buộc, duy nhất toàn hệ thống, tối đa 128 ký tự; là khóa tìm kiếm chính, không sử dụng mã SKU/Code riêng).
  - `Description`: Mô tả món ăn, hương vị, nguyên liệu đặc trưng (Tùy chọn, tối đa 512 ký tự).
  - `Price`: Giá bán niêm yết theo chuẩn Gross Price đã gồm thuế/phí (Bắt buộc, kiểu `decimal >= 0`, đơn vị VND).
  - `ImageUrl`: Đường dẫn hình ảnh đại diện (Tùy chọn, tối đa 1024 ký tự).
  - `DishCategoryId`: Mã danh mục liên kết (Tùy chọn, khóa ngoại tham chiếu đến `DishCategory`).
  - `IsActive`: Trạng thái phục vụ kinh doanh (Bắt buộc, kiểu boolean, mặc định `true`: Đang kinh doanh, `false`: Tạm ngưng bán).
- **FR-006**: Hệ thống PHẢI áp dụng cơ chế Soft Delete cho Món ăn (`FullAuditedAggregateRoot<Guid>`) kèm việc yêu cầu bắt buộc nhập Lý do xóa món (`DeletionReason`, tối đa 256 ký tự) để phục vụ kiểm toán và đối soát; đồng thời các mục `DailyMenuItem` tương ứng trong Thực đơn ngày đang áp dụng sẽ tự động chuyển sang trạng thái "Đã ngừng phục vụ" mà không làm mất tính toàn vẹn dữ liệu.
- **FR-007**: Hệ thống PHẢI hỗ trợ tìm kiếm Món ăn theo từ khóa (khớp trong Tên món ăn hoặc Mô tả món ăn).
- **FR-008**: Hệ thống PHẢI hỗ trợ lọc danh sách Món ăn theo Danh mục cụ thể hoặc xem tất cả danh mục, đồng thời tổ chức giao diện theo dạng Tab trạng thái phục vụ ("Đang phục vụ", "Tạm ngưng", "Tất cả") kèm số lượng món tương ứng.
- **FR-009**: Hệ thống PHẢI hỗ trợ sắp xếp danh sách Món ăn theo nhiều tiêu chí: Tên (A → Z, Z → A), Giá bán (Thấp → Cao, Cao → Thấp), hoặc Thời gian tạo.
- **FR-010**: Hệ thống PHẢI tích hợp cơ chế tải ảnh lên dịch vụ Cloudinary CDN từ giao diện người dùng, đồng thời hỗ trợ dán liên kết ảnh trực tiếp và hiển thị ảnh xem trước (Image Preview) theo thời gian thực.
- **FR-011**: Giao diện PHẢI hiển thị hình ảnh dự phòng mặc định (Fallback Image Placeholder) khi đường dẫn ảnh bị rỗng hoặc gặp sự cố tải ảnh.
- **FR-012**: Hệ thống PHẢI hỗ trợ phân quyền chặt chẽ thông qua ABP Permission Management:
  - `TooHungryPermissions.Dishes.Default`: Quyền xem danh sách thực đơn và danh mục món.
  - `TooHungryPermissions.Dishes.Create`: Quyền tạo mới món ăn và danh mục món.
  - `TooHungryPermissions.Dishes.Edit`: Quyền chỉnh sửa thông tin món ăn và danh mục món.
  - `TooHungryPermissions.Dishes.Delete`: Quyền xóa món ăn và danh mục món.
- **FR-013**: Hệ thống PHẢI hỗ trợ đa ngôn ngữ (Localization) đầy đủ tiếng Việt (`vi`) và tiếng Anh (`en`) cho toàn bộ nhãn, tiêu đề, thông báo thành công và thông điệp lỗi của module.
- **FR-014**: Hệ thống PHẢI hỗ trợ chuyển đổi trạng thái phục vụ kinh doanh của Món ăn (`IsActive`: Bật/Tắt) nhanh chóng để quản lý tạm ngưng bán khi hết nguyên liệu hoặc theo mùa mà không làm mất thông tin hay gián đoạn các liên kết.
- **FR-015**: Hệ thống PHẢI hỗ trợ chọn nhiều món ăn thông qua checkbox trên bảng dữ liệu và thực hiện cập nhật trạng thái phục vụ hàng loạt (`Bulk Activate` / `Bulk Deactivate`) qua thanh tác vụ hàng loạt (Bulk Actions Bar), đồng thời hiển thị thông báo kết quả cập nhật tương ứng.

---

### Các Thực thể Chính

- **DishCategory (Danh mục món ăn)**:
  - `Id`: Khóa chính định danh duy nhất (`Guid`).
  - `Name`: Tên danh mục món (Ví dụ: "Khai vị", "Món chính", "Món lẩu", "Đồ uống"). Bắt buộc, duy nhất toàn hệ thống.
  - `Description`: Mô tả tóm tắt về danh mục.
  - `DisplayOrder`: Thứ tự hiển thị ưu tiên trên Tab và màn hình POS (kiểu `int`, mặc định `0`).
  - `Dishes`: Danh sách các món ăn thuộc danh mục (`ICollection<Dish>`).
  - Kế thừa: `FullAuditedAggregateRoot<Guid>`.

- **Dish (Món ăn)**:
  - `Id`: Khóa chính định danh duy nhất (`Guid`).
  - `Name`: Tên món ăn (Ví dụ: "Phở bò tái lăn", "Trà đào cam sả"). Bắt buộc, duy nhất toàn hệ thống.
  - `Description`: Mô tả chi tiết về món ăn, thành phần hoặc cách thưởng thức.
  - `Price`: Đơn giá bán niêm yết theo chuẩn giá gộp Gross Price đã bao gồm thuế/phí (kiểu `decimal >= 0`, đơn vị VND).
  - `ImageUrl`: Đường dẫn URL hình ảnh đại diện (Cloudinary CDN hoặc URL ngoài).
  - `DishCategoryId`: Khóa ngoại liên kết tới `DishCategory` (Nullable).
  - `DishCategory`: Đối tượng danh mục liên kết (`Navigation Property`).
  - `IsActive`: Trạng thái phục vụ kinh doanh (`bool`, mặc định `true`: Đang phục vụ, `false`: Tạm ngưng bán).
  - `DeletionReason`: Lý do xóa món phục vụ kiểm soát kiểm toán (`string?`, tối đa 256 ký tự).
  - `Recipe`: Công thức định lượng nguyên liệu liên kết 1-1 (`Navigation Property`, Tùy chọn / Nullable).
  - `DailyMenuItems`: Danh sách các mục thực đơn ngày liên kết (`ICollection<DailyMenuItem>`).
  - Kế thừa: `FullAuditedAggregateRoot<Guid>`.

- **Recipe (Công thức định lượng - Mối quan hệ liên đới)**:
  - `Id`: Khóa chính (`Guid`).
  - `DishId`: Khóa ngoại liên kết trực tiếp tới `Dish` (Quan hệ 1-1).
  - `RecipeIngredients`: Danh sách nguyên liệu và định lượng tương ứng phục vụ việc trừ tồn kho tự động khi bán món.

---

## Tiêu chí Thành công *(bắt buộc)*

### Kết quả Đo lường được

- **SC-001**: Quản lý có thể tạo mới một danh mục và thêm mới 5 món ăn hoàn chỉnh kèm hình ảnh xem trước trong thời gian dưới 2 phút.
- **SC-002**: Tốc độ phản hồi của API tìm kiếm và lọc danh sách món ăn dưới 500ms đối với quy mô thực đơn lên đến 500 món ăn.
- **SC-003**: 100% các thao tác cố ý nhập trùng tên món ăn hoặc cố ý xóa danh mục đang chứa món ăn đều bị hệ thống ngăn chặn an toàn và phản hồi thông báo rõ ràng cho người dùng.
- **SC-004**: Quá trình tải ảnh lên Cloudinary hoàn tất và phản chiếu ảnh preview trong form nhập liệu trong thời gian dưới 3 giây trong điều kiện mạng tiêu chuẩn.
- **SC-005**: 100% các thao tác thay đổi dữ liệu (Tạo, Sửa, Xóa) đều được ghi nhận đầy đủ thông tin kiểm toán (Auditing: người tạo, thời gian tạo, người sửa, thời gian sửa) theo chuẩn ABP Framework.

---

## Các Giả định

- Định dạng tiền tệ mặc định của toàn hệ thống là Việt Nam Đồng (VND); không hỗ trợ đa tiền tệ trong phạm vi phiên bản hiện tại.
- Quản lý nhà hàng và nhân viên vận hành hệ thống thông qua trình duyệt web trên máy tính bảng hoặc máy tính để bàn với kết nối Internet ổn định để đảm bảo việc tải ảnh từ Cloudinary CDN hoạt động trơn tru.
- Module Công thức (`Recipe`) và Định lượng nguyên liệu (`RecipeIngredient`) được quản lý cấu hình chuyên sâu ở spec Công thức chế biến, nhưng dữ liệu món ăn tại spec này là thực thể cha bắt buộc để gán công thức.
- Module Bán hàng POS (`006-pos-ordering-and-billing`) tái sử dụng trực tiếp service và DTO của module Dishes để hiển thị thực đơn và tính toán giá trị đơn hàng.
