# Đặc tả Tính năng (Feature Specification): Tái thiết kế Giao diện Quản lý Tồn kho & Lô hàng (Inventory UI Redesign)

**Mã Tính năng (Feature ID)**: `RM-012`

**Nhánh Tính năng (Feature Branch)**: `012-rm-012-inventory-ui-redesign`

**Ngày cập nhật**: 2026-10-09

**Trạng thái**: Hoàn thiện Đặc tả & Đã làm rõ (Ready for Planning)

**Đầu vào**: Yêu cầu nghiệp vụ từ Roadmap RM-012: "Làm lại giao diện trang quản lý tồn kho để thân thiện hơn với người dùng, kết nối trọn vẹn và tối ưu hóa các API từ RM-011."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên Làm rõ Yêu cầu (Clarification Session — 2026-10-09)
- **Q1: Bố cục giao diện hiển thị danh sách chi tiết các Lô hàng (Batches) của một nguyên liệu nên sử dụng hình thức nào?**
  - **A1**: Sử dụng **Hộp thoại Modal trung tâm (Centered Modal)** kích thước lớn (`size: 'xl'`), đồng bộ hoàn toàn với phong cách `abp-modal` hiện có của hệ thống (`IngredientBatchesModalComponent`). Modal có thanh tiêu đề cam sang trọng, bảng danh sách lô hiển thị theo thứ tự FEFO và nút đóng/thao tác nhanh.
- **Q2: Khi người dùng chuyển sang Tab 3 "Lịch sử Giao dịch", hệ thống nên xử lý việc chọn nguyên liệu ban đầu như thế nào?**
  - **A2**: **Tự động chọn nguyên liệu đầu tiên** trong danh sách (hoặc nguyên liệu vừa được chọn từ Tab 1) và tải ngay lịch sử giao dịch tương ứng để người dùng thấy dữ liệu tức thì; đồng thời bố trí một Dropdown tìm kiếm & chọn nguyên liệu (`app-custom-select` có icon `fa-box` và chế độ `searchable: true`) ở thanh bộ lọc phía trên để người dùng dễ dàng chuyển đổi sang nguyên liệu khác.
- **Q3: Thanh Banner Cảnh báo Tồn kho (Inventory Alerts Banner) nên hiển thị và tương tác như thế nào khi có nhiều cảnh báo cùng lúc?**
  - **A3**: Hiển thị **Banner thông minh tinh gọn** tóm tắt tổng số cảnh báo cùng thông điệp cảnh báo nguy cấp nhất (Ưu tiên số 1: Lô hàng tươi sống `FRESH` đã quá hạn sử dụng kèm nút `[Xuất hủy ngay]`). Banner cung cấp nút `[Xem chi tiết]` để mở rộng/thu gọn danh sách đầy đủ các cảnh báo phụ (hàng sắp hết hạn trong 24h, thiếu kho dưới định mức) và nút `[Đóng tạm thời]` (Dismiss) để người dùng ẩn banner khi không muốn bị che khuất tầm nhìn.
- **Q4: Quy trình xác nhận và nhập lý do Xuất hủy lô hàng (Discard Batch) nên diễn ra như thế nào?**
  - **A4**: Sử dụng **Hộp thoại Modal xác nhận xuất hủy chuyên dụng (`DiscardBatchModalComponent`)** tích hợp sẵn danh mục các lý do mẫu phổ biến (Quá hạn sử dụng, Hư hỏng/biến chất trong quá trình lưu kho, Rách bao bì/nhiễm bẩn) thông qua Dropdown, kèm theo ô nhập văn bản (Textarea) để ghi chú chi tiết. Hệ thống bắt buộc người dùng chọn hoặc nhập lý do trước khi kích hoạt API `POST /api/app/inventory/batches/{id}/discard`.
- **Q5: Có nên cung cấp lối tắt (Shortcut) từ dòng nguyên liệu ở Tab 1 để tra cứu nhanh Lịch sử Giao dịch ở Tab 3 không?**
  - **A5**: **Có, bổ sung nút lối tắt `[Lịch sử biến động]` (biểu tượng đồng hồ `fa-clock-rotate-left`)** ngay trên cột Thao tác của từng dòng nguyên liệu ở Tab 1. Khi người dùng bấm nút này, hệ thống sẽ tự động chuyển sang Tab 3, chọn ngay nguyên liệu tương ứng và lập tức tải danh sách lịch sử giao dịch.

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Bố cục Trang Tồn kho Một cấp, Thẻ KPI & Banner Cảnh báo Tinh gọn (Ưu tiên: P1)

Là một Quản lý Nhà hàng / Thủ kho, tôi muốn màn hình Quản lý Tồn kho có Header một cấp tinh gọn, các thẻ chỉ số KPI tổng hợp và thanh banner cảnh báo thông minh ở đầu trang, để tôi nắm bắt ngay lập tức tình trạng sức khỏe của kho hàng và xử lý các nguy cơ hết hạn khẩn cấp.

**Lý do cho mức độ ưu tiên này**: Loại bỏ hoàn toàn sự phân mảnh, lặp lại tiêu đề, tạo ấn tượng chuyên nghiệp chuẩn nhận diện thương hiệu Cam & Trắng và cung cấp thông tin cảnh báo nguy cấp tức thì cho thủ kho.

**Kiểm thử Độc lập**: Truy cập `/inventory`. Kiểm tra chỉ có duy nhất 1 tiêu đề trang, 4 thẻ chỉ số KPI hiển thị số liệu chính xác (Tổng nguyên liệu, An toàn, Cảnh báo thiếu hụt, Lô quá hạn), các nút `[Làm mới]`, `[+ Thiết lập tồn kho]`, `[+ Nhập kho]` được bố trí liền mạch. Nếu có lô hàng tươi sống quá hạn, thanh banner cảnh báo xuất hiện thông báo tóm tắt nguy cấp nhất kèm nút `[Xem chi tiết]` mở rộng và nút `[Đóng]` ẩn banner.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** người dùng truy cập trang `/inventory`, **Khi** trang hoàn tất tải dữ liệu, **Thì** Header trang chỉ có một khối tiêu đề duy nhất, không có thẻ card con lặp lại tiêu đề bên dưới.
2. **Cho trước** trang Quản lý Tồn kho hiển thị, **Khi** người dùng quan sát 4 thẻ KPI trên đầu trang, **Thì** các thẻ hiển thị:
   - Tổng nguyên liệu quản lý (Icon giỏ hàng/nguyên liệu).
   - Tồn kho an toàn (Icon khiên xanh / dấu tích).
   - Cảnh báo thiếu hụt / Dưới định mức (Icon cảnh báo tam giác cam `#F59E0B`).
   - Lô quá hạn khẩn cấp (Icon lửa / chấm than đỏ `#EF4444`).
3. **Cho trước** hệ thống tồn tại cảnh báo từ API `GET /api/app/inventory/alerts`, **Khi** Banner Cảnh báo hiển thị, **Thì** thông điệp cảnh báo nguy cấp nhất (hàng tươi sống quá hạn) được ưu tiên hàng đầu; người dùng có thể bấm `[Xem chi tiết]` để bung toàn bộ danh sách hoặc bấm `[Đóng]` để ẩn banner.

---

### User Story 2 - Tra cứu Chi tiết Lô hàng Nguyên liệu qua Centered Modal (Ưu tiên: P1)

Là một Thủ kho, tôi muốn xem nhanh tổng quan danh sách nguyên liệu ở Tab 1, và khi cần kiểm tra cụ thể các lô còn tồn của một nguyên liệu tôi có thể bấm nút `[Xem các lô]` để mở hộp thoại Modal trung tâm kích thước lớn (size 'xl') hiển thị đầy đủ chi tiết các lô hàng theo chuẩn FEFO.

**Lý do cho mức độ ưu tiên này**: Phân tách rành mạch giữa dữ liệu tổng quan (để đặt hàng, theo dõi định mức) và dữ liệu chi tiết lô (để kiểm tra date thực tế, đối chiếu giá vốn), giúp bảng tổng quan gọn gàng, tải nhanh và trải nghiệm tra cứu tập trung.

**Kiểm thử Độc lập**: Tại Tab 1 "Tổng quan Tồn kho", nhấn nút `[Xem các lô]` trên dòng nguyên liệu "Cá Hồi Na Uy". Modal `IngredientBatchesModal` mở ra ở giữa màn hình (size 'xl'), hiển thị bảng danh sách các lô theo thứ tự FEFO (hạn dùng gần nhất xếp trên đầu), kèm số lượng tồn, giá vốn, badge trạng thái hạn dùng và nút xuất hủy nếu lô quá hạn.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** người dùng ở Tab 1 "Tổng quan Tồn kho", **Khi** xem bảng nguyên liệu, **Thì** mỗi dòng có cột Thao tác chứa các nút: `[Xem các lô]` (`fa-boxes-stacked`), `[Lịch sử biến động]` (`fa-clock-rotate-left`), `[Điều chỉnh tồn kho]` (`fa-sliders`), `[Chỉnh sửa]` (`fa-pen`).
2. **Cho trước** người dùng nhấn nút `[Xem các lô]` của một nguyên liệu, **Khi** modal mở ra, **Thì** hệ thống mở Centered Modal (size 'xl') tải danh sách lô của nguyên liệu đó từ API `GET /api/app/inventory/batches?ingredientId={id}`, hiển thị bảng chi tiết gồm: Mã lô, Số lượng ban đầu, Số lượng còn lại, Đơn vị, Ngày nhập, Hạn sử dụng, Đơn giá vốn, Trạng thái hạn dùng (Expiration Badge) và nút Xuất hủy.
3. **Cho trước** danh sách lô trong modal, **Khi** quan sát thứ tự các lô, **Thì** các lô được sắp xếp theo đúng nguyên tắc FEFO (hạn sử dụng sớm nhất hiển thị đầu tiên).
4. **Cho trước** một nguyên liệu chưa có lô hàng nào còn tồn (Tồn kho = 0), **Khi** mở modal chi tiết lô, **Thì** hiển thị trạng thái rỗng (Empty State) thân thiện kèm thông điệp rõ ràng và nút bấm nhanh `[+ Nhập kho nguyên liệu này]`.

---

### User Story 3 - Danh sách Lô hàng Toàn kho & Modal Xuất hủy Lô quá hạn Có Lý do Mẫu (Ưu tiên: P1)

Là một Quản lý / Thủ kho, tôi muốn chuyển sang Tab 2 "Danh sách Lô hàng" để kiểm soát toàn bộ các lô đang lưu trữ trong kho, lọc theo tình trạng hạn dùng và thực hiện thao tác Xuất hủy (Discard) đối với các lô bị hư hỏng hoặc quá hạn thông qua Modal xác nhận có sẵn gợi ý lý do mẫu.

**Lý do cho mức độ ưu tiên này**: Đảm bảo quy trình xử lý phế phẩm an toàn thực phẩm, đồng thời giải phóng dung lượng kho và đồng bộ chính xác biến động sổ sách tài chính với lý do kiểm toán minh bạch.

**Kiểm thử Độc lập**: Chuyển sang Tab 2 "Danh sách Lô hàng", lọc các lô "Quá hạn", bấm nút `[Xuất hủy]` trên lô hết hạn, Modal xác nhận mở ra với Dropdown lý do mẫu (Quá hạn, Hư hỏng biến chất, Rách bao bì), chọn lý do và xác nhận hủy. Lô hàng chuyển sang trạng thái đã hủy (`RemainingQuantity = 0`, `IsActive = false`) và ghi nhận giao dịch xuất hủy tương ứng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** người dùng bấm chọn Tab 2 "Danh sách Lô hàng", **Khi** bảng hiển thị, **Thì** các tiêu đề cột đều được dịch song ngữ chính xác (không còn text tiếng Việt thô như `<th>NGUYÊN LIỆU</th>`, `<th>VÒNG ĐỜI BẢO QUẢN</th>`).
2. **Cho trước** người dùng sử dụng bộ lọc tình trạng lô hàng, **Khi** chọn "Quá hạn" hoặc "Sắp hết hạn", **Thì** danh sách lập tức lọc chính xác các lô thỏa mãn tiêu chí mà không làm chậm giao diện.
3. **Cho trước** một lô hàng quá hạn hoặc hư hỏng trong danh sách (hoặc trong modal chi tiết lô), **Khi** người dùng bấm nút `[Xuất hủy]` (`fa-ban`), **Thì** hệ thống mở Modal xác nhận xuất hủy (`DiscardBatchModalComponent`) yêu cầu chọn lý do mẫu hoặc nhập ghi chú chi tiết.
4. **Cho trước** người dùng xác nhận xuất hủy với lý do hợp lệ, **Khi** API `POST /api/app/inventory/batches/{id}/discard` phản hồi thành công, **Thì** hệ thống hiển thị thông báo Toaster thành công, cập nhật ngay lập tức số lượng tồn về 0 và làm mới thẻ chỉ số KPI kho.

---

### User Story 4 - Tra cứu Lịch sử Giao dịch Tự động Tải & Lối tắt Chuyển tab Nhanh (Ưu tiên: P2)

Là một Kế toán kho / Quản lý Nhà hàng, tôi muốn truy cập Tab 3 "Lịch sử Giao dịch" để tra cứu mọi biến động kho (Nhập kho, Xuất chế biến theo công thức món, Điều chỉnh kiểm kê, Xuất hủy phế phẩm) với cơ chế tự động chọn nguyên liệu đầu tiên, hoặc bấm nút lối tắt từ Tab 1 để nhảy ngay vào lịch sử nguyên liệu cần tra cứu.

**Lý do cho mức độ ưu tiên này**: Đảm bảo tính minh bạch tuyệt đối của dòng chảy nguyên vật liệu, loại bỏ trạng thái trống khó chịu khi chuyển tab và tăng tốc độ tra cứu lịch sử đối soát.

**Kiểm thử Độc lập**: Tại Tab 1, bấm nút `[Lịch sử biến động]` trên dòng "Thịt Bò Wagyu", hệ thống tự động nhảy sang Tab 3 với dropdown chọn sẵn "Thịt Bò Wagyu" và hiển thị bảng lịch sử giao dịch tương ứng với số lượng tăng (+ xanh), giảm (- cam đỏ), đơn giá vốn, thời gian thực hiện và người tạo.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** người dùng chọn Tab 3 "Lịch sử Giao dịch", **Khi** tab mở ra, **Thì** hệ thống tự động chọn nguyên liệu đầu tiên trong danh sách (hoặc nguyên liệu vừa kích hoạt từ lối tắt Tab 1) và gọi API `GET /api/app/inventory/transactions/{ingredientId}` để hiển thị dữ liệu ngay lập tức.
2. **Cho trước** người dùng đang ở Tab 1 "Tổng quan Tồn kho", **Khi** bấm nút `[Lịch sử biến động]` (`fa-clock-rotate-left`) trên một dòng nguyên liệu, **Thì** giao diện tự động chuyển sang Tab 3 và tải đúng lịch sử của nguyên liệu đó.
3. **Cho trước** thanh công cụ của Tab 3, **Khi** người dùng muốn xem nguyên liệu khác, **Thì** Dropdown tìm kiếm nguyên liệu (`CustomSelectComponent` có tìm kiếm) cho phép gõ tên để lọc và đổi nguyên liệu tức thì.
4. **Cho trước** mỗi dòng giao dịch hiển thị trong bảng, **Thì**:
   - Giao dịch Nhập kho (IN): Hiển thị badge xanh lá, số lượng `+X.XX ĐVT`.
   - Giao dịch Xuất kho (OUT / RECIPE): Hiển thị badge cam ấm, số lượng `-X.XX ĐVT` kèm mã tham chiếu đơn hàng nếu có.
   - Giao dịch Điều chỉnh (ADJUSTMENT_IN / ADJUSTMENT_OUT): Hiển thị badge màu tím/xanh dương với lý do kiểm kê.
   - Giao dịch Xuất hủy (DISCARD): Hiển thị badge màu đỏ với lý do hủy hàng.
   - Đơn giá vốn (`UnitCost`): Định dạng tiền tệ VND chuẩn (ví dụ: `250.000 ₫`).

---

### User Story 5 - Đa ngôn ngữ Hoàn chỉnh & Trải nghiệm Thẩm mỹ Cam & Trắng (Ưu tiên: P2)

Là một Người dùng nói Tiếng Việt hoặc Tiếng Anh, tôi muốn toàn bộ giao diện, các nhãn, thẻ badge, tooltip, thông báo và bộ chọn trang đều hiển thị song ngữ chuẩn xác theo ngôn ngữ đã chọn, không còn sót bất kỳ localization key thô hay văn bản bị lệch tông màu.

**Lý do cho mức độ ưu tiên này**: Tuân thủ tuyệt đối Hiến pháp Acme.TooHungry (Điều VI - Nhận diện Cam & Trắng và Điều VII - Quốc tế hóa I18N), nâng cao trải nghiệm người dùng cao cấp.

**Kiểm thử Độc lập**: Đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh trên thanh điều hướng chính, kiểm tra toàn bộ màn hình Quản lý Tồn kho (cả 3 Tab, Modal Chi tiết Lô, Modal Xuất hủy Lô, Modal Nhập kho, Thẻ KPI, Cảnh báo): 100% văn bản chuyển đổi chính xác, không xuất hiện `::` thô.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước** giao diện đang hiển thị Tiếng Việt, **Khi** kiểm tra bảng lô hàng và phân trang, **Thì** không còn nhãn thô `<th>NGUYÊN LIỆU</th>`, bộ chọn dòng hiển thị "10 dòng / trang" mượt mà.
2. **Cho trước** người dùng chuyển sang Tiếng Anh (`en`), **Khi** xem trang, **Thì** toàn bộ tiêu đề, tab, badge trạng thái, thẻ KPI và thông báo lỗi/thành công đều chuyển sang tiếng Anh chuẩn ngữ nghĩa.
3. **Cho trước** người dùng thao tác hover trên các dòng và nút bấm, **Thì** các hiệu ứng chuyển đổi vi mô phản hồi êm ái, tông màu chủ đạo Cam tươi (`#EA580C`) và nền ấm nhẹ (`#FFF3E8`), các góc bo mềm mại (12px - 16px).

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **Khi danh sách tồn kho hoặc lô hàng rỗng**: Hiển thị thẻ Trạng thái Rỗng (Empty State) thẩm mỹ với biểu tượng kho hàng, thông điệp hướng dẫn rõ ràng và nút gợi ý `[+ Nhập kho ngay]`.
- **Khi nguyên liệu không có bất kỳ lô nào còn hạn (Chỉ toàn lô quá hạn)**: Bảng nguyên liệu hiển thị trạng thái cảnh báo khẩn cấp màu đỏ "Cần nhập mới ngay", nút xem lô mở modal với các lô quá hạn được làm nổi bật để xử lý hủy.
- **Khi kết nối mạng chập chờn hoặc API bị lỗi**: Hiển thị trạng thái lỗi có nút `[Thử lại]` thân thiện, không để màn hình trắng hay vỡ bố cục giao diện.
- **Khi tên nguyên liệu hoặc mã lô rất dài**: Hiển thị cắt ngắn thông minh kèm tooltip khi rê chuột vào (`text-truncate` + `title`), bảo đảm độ rộng các cột bảng luôn cân đối.
- **Khi sử dụng trên màn hình kích thước nhỏ (Tablet / Laptop 13-inch)**: Các thẻ KPI tự động xếp thành 2 cột hoặc cuộn ngang, bảng dữ liệu có thanh cuộn ngang mượt mà với header cố định, các nút thao tác không bị dồn ép.

---

## Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI tái cấu trúc Header trang Tồn kho thành một khối Header cấp trang duy nhất, loại bỏ hoàn toàn tiêu đề card con và nút lặp lại bên dưới.
- **FR-002**: Hệ thống PHẢI tích hợp 4 Thẻ Chỉ số Tồn kho (KPI Cards) ở đầu trang: (1) Tổng số nguyên liệu, (2) Tồn kho an toàn, (3) Cảnh báo thiếu hụt, (4) Lô quá hạn khẩn cấp.
- **FR-003**: Hệ thống PHẢI tích hợp Thanh Banner Cảnh báo Tồn kho thông minh (Inventory Alert Banner) tiêu thụ dữ liệu từ API `GET /api/app/inventory/alerts`, tóm tắt cảnh báo nguy cấp nhất, cho phép mở rộng/thu gọn và đóng tạm thời (Dismiss).
- **FR-004**: Hệ thống PHẢI tổ chức giao diện theo hệ thống 3 Tab chuẩn nhận diện Cam & Trắng:
  - Tab 1: **Tổng quan Tồn kho** (`StockOverview`)
  - Tab 2: **Danh sách Lô hàng** (`BatchList`)
  - Tab 3: **Lịch sử Giao dịch** (`TransactionHistory`)
- **FR-005**: Hệ thống PHẢI cung cấp Centered Modal kích thước lớn (`size: 'xl'`) mang tên `IngredientBatchesModalComponent` khi người dùng bấm nút `[Xem các lô]` trên dòng nguyên liệu ở Tab 1, hiển thị đầy đủ thông tin các lô theo thứ tự FEFO.
- **FR-006**: Hệ thống PHẢI cung cấp nút lối tắt `[Lịch sử biến động]` (`fa-clock-rotate-left`) trên từng dòng nguyên liệu ở Tab 1, tự động chuyển sang Tab 3 và tải lịch sử giao dịch của nguyên liệu đó.
- **FR-007**: Hệ thống PHẢI cung cấp Modal xác nhận xuất hủy chuyên dụng (`DiscardBatchModalComponent`) tích hợp Dropdown các lý do mẫu (Quá hạn, Hư hỏng biến chất, Rách bao bì) và ô nhập ghi chú chi tiết trước khi gọi API `POST /api/app/inventory/batches/{id}/discard`.
- **FR-008**: Hệ thống PHẢI cung cấp giao diện tra cứu Lịch sử Giao dịch trên Tab 3, tự động chọn nguyên liệu đầu tiên khi mở tab, hỗ trợ Dropdown tìm kiếm nguyên liệu và hiển thị chi tiết các giao dịch biến động theo thời gian thực từ API `GET /api/app/inventory/transactions/{ingredientId}`.
- **FR-009**: Hệ thống PHẢI cập nhật Angular `InventoryService` để đồng bộ chính xác endpoint `/api/app/inventory/transactions/${ingredientId}` với Backend HttpApi.
- **FR-010**: Hệ thống PHẢI bảo đảm 100% các chuỗi văn bản trên giao diện đều được quốc tế hóa (I18N song ngữ Tiếng Việt và Tiếng Anh trong `vi.json` và `en.json`), xóa bỏ toàn bộ nhãn hardcode.
- **FR-011**: Hệ thống PHẢI áp dụng nhất quán Bộ nhận diện Hình ảnh Cam & Trắng (Orange & White Theme) theo Điều VI Hiến pháp Acme.TooHungry (nền trắng `#FFFFFF`, điểm nhấn `#EA580C`, nền active `#FFF3E8`, bo góc mềm 12-16px).

---

### Các Thực thể & Mô hình Giao diện Chính (Key Entities & ViewModels)

- **InventoryKpiSummary**: Mô hình dữ liệu tính toán cho 4 thẻ chỉ số đầu trang (Tổng nguyên liệu, Số lượng an toàn, Số lượng cảnh báo thiếu, Số lượng lô quá hạn khẩn cấp).
- **IngredientDto**: Thông tin tổng quan nguyên liệu (Id, Name, Code, BaseUnit, StorageType, CurrentStock, MinStock, IsActive).
- **InventoryBatchDto**: Thông tin chi tiết lô hàng (Id, IngredientId, IngredientName, BatchCode, Quantity, RemainingQuantity, PurchaseUnit, ConversionFactor, ReceivedAt, ExpiryDate, UnitCost, StorageType, IsExpired, IsNearExpiry, IsActive).
- **InventoryTransactionDto**: Thông tin giao dịch kho (Id, IngredientId, IngredientName, BatchId, BatchCode, TransactionType, Quantity, UnitCost, Reason, ReferenceId, CreationTime, CreatorId).
- **InventoryAlertDto**: Thông tin cảnh báo tồn kho (AlertType, Severity, IngredientId, IngredientName, BatchId, BatchCode, Message, Timestamp).
- **DiscardBatchInputDto**: Thông tin lý do xuất hủy lô hàng (`reason: string`).

---

## Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: **100% Nhất quán & Không trùng lặp**: Loại bỏ triệt để 100% sự lặp lại tiêu đề trang và 0% localization key bị lộ mã thô trên toàn bộ giao diện quản lý tồn kho.
- **SC-002**: **Tra cứu Lô hàng 1-Click**: Người dùng có thể xem danh sách toàn bộ các lô của bất kỳ nguyên liệu nào qua Centered Modal (size 'xl') chỉ trong 1 cú nhấp chuột từ Tab Tổng quan, thời gian mở modal dưới 200ms.
- **SC-003**: **Xử lý Hủy lô Nhanh chóng**: Người dùng có thể thực hiện xuất hủy một lô quá hạn trực tiếp từ Banner cảnh báo hoặc từ danh sách lô/modal với gợi ý lý do mẫu trong vòng dưới 3 thao tác bấm.
- **SC-004**: **Lối tắt Tra cứu Lịch sử Tức thì**: Bấm nút lối tắt lịch sử từ Tab 1 chuyển thẳng sang Tab 3 và hiển thị dữ liệu lịch sử trong dưới 300ms mà không qua bất kỳ màn hình trống nào.
- **SC-005**: **Độ phủ Quốc tế hóa 100%**: Mọi chuỗi văn bản mới (KPI cards, banner cảnh báo, modal chi tiết lô, modal hủy lô, tab lịch sử giao dịch) đều được dịch trọn vẹn cả Tiếng Việt và Tiếng Anh trong `vi.json` và `en.json`.
- **SC-006**: **Tương thích Responsive & Thẩm mỹ**: Giao diện hiển thị hoàn hảo không bị tràn viền (overflow), không lỗi giao diện trên các độ phân giải phổ biến từ 1024px trở lên; đạt điểm hài lòng cao về tính thẩm mỹ Cam & Trắng.

---

## Các Giả định (Assumptions)

- **ASSUMP-001**: Backend REST API và quyền truy cập (`TooHungryPermissions.Inventories.*`) đã được triển khai đầy đủ và kiểm thử tự động đạt 100% ở phân hệ RM-011.
- **ASSUMP-002**: Client Angular sử dụng Angular 19 với Standalone Components và tận dụng các component dùng chung hiện có (`CustomSelectComponent`, `AbpModalModule`, `ThemeSharedModule`).
- **ASSUMP-003**: Dữ liệu tồn kho và giao dịch được đồng bộ thời gian thực qua lời gọi API; khi thực hiện điều chỉnh hoặc xuất hủy, giao diện tự động làm mới số liệu tương ứng.
- **ASSUMP-004**: Các quy tắc nghiệp vụ cốt lõi (FEFO, quy đổi đơn vị, ghi nhận chi phí vốn) được tầng Domain đảm bảo và UI Redesign tập trung tối ưu hóa trải nghiệm tương tác của người dùng.
