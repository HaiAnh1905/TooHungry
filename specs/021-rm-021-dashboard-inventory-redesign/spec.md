# Đặc tả Tính năng (Feature Specification): Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)

**Mã Tính năng (Feature ID)**: `RM-021`

**Nhánh Tính năng (Feature Branch)**: `021-rm-021-dashboard-inventory-redesign`

**Ngày lập**: 2026-10-20

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-021: *"Tái thiết kế toàn diện giao diện và tối ưu hóa trải nghiệm người dùng (UI/UX Redesign) cho màn hình Quản lý Tồn kho (`/inventory`) thuộc phân hệ Quản trị / Dashboard dành cho Quản lý (Manager) và Quản trị viên (Admin)"*
- Tích hợp và kế thừa từ các phân hệ:
  - RM-001: Xác thực đăng nhập & Quản lý phiên người dùng ABP Identity
  - RM-002: Hệ thống Shared UI, component dùng chung và chuẩn nhận diện thương hiệu Cam & Trắng (`#EA580C`)
  - RM-003: Phân quyền & Vai trò người dùng (`Manager`, `Administrator`)
  - RM-005: Quản lý Nguyên liệu (Ingredients), đơn vị tính và định mức giá vốn
  - RM-011: Quản lý Tồn kho & Giao dịch, lô hàng (`InventoryBatch`), xuất kho FEFO và kiểm kê điều chỉnh
  - RM-012: Giao diện Tồn kho ban đầu
  - RM-013: Vòng đời tạm ngưng, khóa và khôi phục an toàn lô hàng (`DeactivateBatch`, `ReactivateBatch`)
  - RM-014: Dự báo nhu cầu nguyên liệu (Forecasts & Replenishment Insights)
  - RM-018: Làm mới trang Dashboard theo phong cách Bento Grid & KPI Cards
  - RM-019: Hệ thống Trang báo lỗi Bento Card & Phục hồi điều hướng thông minh theo vai trò (`UserRoleNavigationService`)
  - RM-020: Phân hệ & Bố cục Thủ kho (`/inventory-keeper`)

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 20-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.clarify RM-021` - 4 Quyết định Thiết kế Then chốt)

- **Q1: Cấu trúc điều hướng và phân rã các Tab (Nguyên liệu, Lô hàng, Nhật ký giao dịch) trên `/inventory`**:
  - **A1**: **Giữ route chính `/inventory` và đồng bộ trạng thái Tab qua Query Parameter (`?tab=ingredients|batches|transactions`), phân tách các tab thành sub-components độc lập**:
    - Route URL thống nhất: `/inventory` với query param:
      + `/inventory?tab=ingredients` (mặc định): Danh mục nguyên liệu & định mức tồn an toàn.
      + `/inventory?tab=batches`: Danh sách chi tiết các lô hàng và kiểm soát hạn dùng FEFO.
      + `/inventory?tab=transactions`: Lịch sử biến động xuất nhập tồn bất biến và kiểm kê.
    - Phân rã component monolithic 1000+ dòng hiện tại thành các sub-components độc lập:
      + `InventoryKpiBarComponent`: 4 thẻ Bento KPI tài chính & trạng thái kho.
      + `InventoryAlertsBannerComponent`: Băng rôn cảnh báo khẩn cấp đầu trang có accordion mở rộng.
      + `InventoryIngredientTabComponent`: Danh mục nguyên liệu, định mức an toàn, thanh tiến trình trực quan.
      + `InventoryBatchTabComponent`: Danh sách lô hàng, timeline hạn sử dụng FEFO, trạng thái khóa (RM-013).
      + `InventoryTransactionTabComponent`: Nhật ký xuất nhập tồn bất biến & kiểm kê điều chỉnh.
    - Hỗ trợ lưu lịch sử duyệt, bookmark hoặc chia sẻ liên kết trực tiếp đến đúng Tab mà không cần reload trang.

- **Q2: Trải nghiệm theo dõi Danh mục Lô hàng (Batches View) và trực quan hóa hạn dùng FEFO**:
  - **A2**: **Bảng Bento Card hiện đại với thanh đếm ngược / timeline hạn dùng FEFO trực quan, phân màu cảnh báo và thanh tác vụ nhanh 1 chạm trên từng dòng**:
    - Mỗi lô hàng (`InventoryBatch`) hiển thị rõ Mã lô, Nguyên liệu, Ngày nhập, Ngày hết hạn kèm Badge FEFO thời gian thực:
      + *Xanh lá*: An toàn (> 7 ngày).
      + *Vàng cam (`Cận date`)*: Còn <= 7 ngày, kèm dòng đếm ngược *"Còn X ngày"*.
      + *Đỏ rực (`Quá hạn`)*: Đã quá hạn sử dụng, kèm nhãn *"Cần xuất hủy"*.
      + *Tím / Xám (`Đã khóa`)*: Đang tạm ngưng theo RM-013, hiển thị lý do khóa khi hover.
    - Thanh tác vụ nhanh trên từng dòng cho phép 1 chạm thực hiện:
      + `[Khóa lô]` (RM-013): Mở modal nhập lý do khóa nhanh.
      + `[Mở khóa]`: Kích hoạt lại lô hàng khả dụng cho FEFO.
      + `[Xuất hủy]`: Mở modal xuất hủy lô quá hạn / hỏng (DISCARD).

- **Q3: Tích hợp thông tin Đề xuất Mua hàng / Bổ sung kho từ module Dự báo (RM-014)**:
  - **A3**: **Bổ sung thẻ tiện ích Bento thông minh (`Replenishment Insights Widget`) ghim ở đầu/cạnh bảng, hiển thị Top nguyên liệu dự báo thiếu trong 7 ngày tới kèm nút 1-click mở modal nhập lô điền sẵn số lượng**:
    - Thẻ Bento hiển thị danh sách Top 3-5 nguyên liệu có tồn khả dụng (`CurrentStock`) thấp hơn nhu cầu dự báo từ Kế hoạch mua hàng RM-014.
    - Mỗi dòng đề xuất hiển thị: Tên nguyên liệu, Tồn hiện tại, Nhu cầu dự báo, Số lượng đề xuất mua thêm (Suggested Quantity).
    - Nút bấm `[+ Nhập lô nhanh]` ngay trên dòng đề xuất sẽ mở `CreateBatchModal` với nguyên liệu và số lượng gợi ý đã được điền sẵn tự động, giúp Quản lý phê duyệt và nhập hàng trong 3 giây.

- **Q4: Nâng cấp và chuẩn hóa toàn diện các Modal tác vụ nghiệp vụ kho**:
  - **A4**: **Tái thiết kế toàn diện 4 Modal theo chuẩn Bento Design System (Cam & Trắng `#EA580C`, bo góc `rounded-2xl`, validate realtime), chia sẻ dùng chung mượt mà cho cả Dashboard (`/inventory`) và phân hệ Thủ kho (`RM-020`)**:
    - Bốn Modal chuẩn hóa gồm:
      1. `CreateInventoryBatchModalComponent`: Nhập lô hàng mới (tự động gợi ý ngày hôm nay, tính thành tiền dự toán).
      2. `DiscardBatchModalComponent`: Xuất hủy lô quá hạn / hỏng (bắt buộc nhập lý do, ghi nhật ký DISCARD).
      3. `StockAdjustmentModalComponent`: Cân đối kiểm kê kho thực tế (tự tính delta chênh lệch, chặn nhập số âm).
      4. `IngredientBatchesModalComponent`: Tra cứu nhanh tất cả các lô thuộc một nguyên liệu cụ thể.
    - 100% tuân thủ phong cách Bento: Header cam nhận diện, viền xám nhạt tinh tế, input focus viền cam, hỗ trợ phím tắt `Enter` / `Esc`, thông báo lỗi inline thời gian thực.
    - Tái sử dụng trọn vẹn giữa `/inventory` và `/inventory-keeper`, bảo đảm tính đồng nhất và không trùng lặp mã nguồn.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Trong hệ thống vận hành nhà hàng **Acme.TooHungry**, module Tồn kho (Inventory) đóng vai trò huyết mạch kết nối giữa khâu Nhập nguyên liệu, Chế biến bếp (Recipes - RM-007), Bán hàng (POS Orders - RM-010) và Dự báo nhu cầu (Forecasts - RM-014).

Màn hình `/inventory` ban đầu (được xây dựng từ RM-011, RM-012, RM-013) là nơi Quản lý nhà hàng và Quản trị viên kiểm soát toàn bộ tài sản kho. Tuy nhiên, sau các đợt nâng cấp lớn của toàn hệ thống (Dashboard Redesign RM-018, Table Redesign RM-017, Error Pages RM-019 và Inventory Keeper Portal RM-020), giao diện `/inventory` bộc lộ một số hạn chế:
1. **Giao diện chưa đồng bộ phong cách**: Vẫn mang phong cách giao diện cũ, nhiều class Bootstrap rải rác, chưa đồng bộ chuẩn Bento Grid hiện đại và bảng màu Cam & Trắng (`#EA580C`) của hệ thống mới.
2. **Component nguyên khối cồng kềnh**: File HTML và TypeScript lên tới hơn 1.000 dòng, tích hợp cả 3 tab dữ liệu, các modal nghiệp vụ và logic tính toán cảnh báo trong cùng một component, gây khó khăn cho việc bảo trì và làm giảm tốc độ render.
3. **Trải nghiệm quản lý lô (Batches View) cần trực quan hơn**: Danh sách lô hàng cần hiển thị rõ ràng hơn về vòng đời hạn dùng (FEFO Timeline), tình trạng bảo quản (Khô/Mát/Đông) và trạng thái khóa/mở khóa (RM-013) với các thao tác nhanh ngay trên dòng.
4. **Thiếu sự gắn kết với Dự báo (RM-014) và Phân hệ Thủ kho (RM-020)**: Quản lý chưa có góc nhìn tổng thể giữa số liệu tồn kho thực tế và kế hoạch mua hàng dự báo, đồng thời thiếu lối tắt di chuyển nhanh sang không gian quầy kho.

**RM-021 (Làm lại giao diện kho bên Dashboard)** ra đời nhằm tái thiết kế toàn diện màn hình `/inventory`, biến nơi đây thành một **Trung tâm Quản trị Tồn kho & Tài chính Kho Hiện đại**, thanh lịch, mạnh mẽ và đồng bộ hoàn hảo với toàn bộ hệ sinh thái Acme.TooHungry.

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 — Thẻ KPI Bento Grid & Băng rôn Cảnh báo Thông minh (Priority: P1)

Là một **Quản lý Nhà hàng (Manager)**, khi tôi truy cập trang Quản lý kho `/inventory`, tôi muốn nhìn thấy ngay 4 thẻ KPI chỉ số kho tổng quan và băng rôn cảnh báo khẩn cấp ở đầu trang, để nắm bắt tức thì tình trạng an toàn kho, số mặt hàng sắp hết và các lô hàng cận date cần xử lý.

**Lý do ưu tiên**: Giúp người quản lý nắm bắt sức khỏe tồn kho trong vòng 3 giây đầu tiên mà không cần phải lướt tìm qua từng trang dữ liệu.

**Kiểm thử Độc lập**:
- Truy cập `/inventory` với tài khoản `Manager`.
- Xác minh 4 thẻ KPI Bento hiển thị chính xác số liệu: Tổng số mặt hàng, Mặt hàng tồn an toàn, Mặt hàng sắp hết, và Lô hàng quá hạn/cần xuất hủy.
- Kiểm tra Băng rôn Cảnh báo (Alerts Banner): Hiển thị cảnh báo mức độ cao nhất, có nút mở rộng xem danh sách chi tiết các cảnh báo và nút tạm ẩn.
- Bấm vào từng thẻ KPI: Tự động lọc bảng dữ liệu phía dưới theo tiêu chí tương ứng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** Quản lý đang ở trang `/inventory`, **Khi (When)** trang tải xong, **Thì (Then)** 4 thẻ Bento KPI hiển thị với thiết kế hiện đại chuẩn Cam & Trắng:
   - **Thẻ 1 (Tổng mặt hàng)**: Hiển thị tổng số nguyên liệu đang quản lý, icon hình khối kho, nền trắng viền xám nhẹ.
   - **Thẻ 2 (Tồn an toàn)**: Hiển thị số nguyên liệu có tồn kho trên định mức tối thiểu, icon khiên bảo vệ, màu nhấn xanh lá (`#16A34A`).
   - **Thẻ 3 (Cảnh báo thiếu hụt)**: Hiển thị số nguyên liệu dưới định mức tồn an toàn, icon tam giác cảnh báo, màu nhấn vàng cam (`#D97706`).
   - **Thẻ 4 (Lô quá hạn / Cần hủy)**: Hiển thị số lô hàng đã quá hạn sử dụng cần lập biên bản xuất hủy, icon thùng rác / cảnh báo đỏ, màu nhấn đỏ (`#DC2626`).
2. **Cho trước (Given)** hệ thống có các cảnh báo tồn kho hoặc hạn dùng, **Khi (When)** hiển thị băng rôn cảnh báo đầu trang, **Thì (Then)** hiển thị tóm tắt cảnh báo khẩn cấp nhất kèm nút `[Xem chi tiết (X)]`. Bấm nút sẽ mở rộng danh sách cảnh báo dạng Accordion mượt mà, hỗ trợ nút bấm điều hướng nhanh đến đúng nguyên liệu hoặc lô hàng liên quan.
3. **Cho trước (Given)** Quản lý click chuột vào thẻ "Cảnh báo thiếu hụt", **Khi (When)** thao tác click diễn ra, **Thì (Then)** hệ thống tự động chuyển sang Tab Nguyên liệu và kích hoạt bộ lọc "Chỉ xem nguyên liệu thiếu hụt" trong thời gian dưới 100ms.

---

### User Story 2 — Danh mục Nguyên liệu & Định mức An toàn (Ingredients Tab Redesign) (Priority: P1)

Là một **Quản lý Nhà hàng**, tôi muốn xem danh sách các mặt hàng nguyên liệu trên một bảng dữ liệu hiện đại, rõ ràng, hiển thị tồn kho hiện tại so với định mức an toàn, điều kiện bảo quản và giá vốn ước tính, để dễ dàng lập kế hoạch mua sắm hoặc điều chỉnh nguyên liệu.

**Lý do ưu tiên**: Quản lý danh mục nguyên liệu là chức năng cốt lõi hàng ngày của người quản trị kho.

**Kiểm thử Độc lập**:
- Xem Tab Nguyên liệu: Cột Tên nguyên liệu, Mã, Đơn vị chuẩn, Điều kiện bảo quản (Mát/Đông/Khô), Tồn kho khả dụng, Định mức tồn an toàn, Thanh tiến trình tồn kho (Progress Bar).
- Kiểm tra tính năng tìm kiếm theo tên/mã nguyên liệu với độ trễ phản hồi tức thì (debounce 250ms).
- Kiểm tra bộ lọc theo Điều kiện bảo quản và bộ lọc Trạng thái tồn (Tất cả / An toàn / Thiếu hụt).
- Thao tác các nút hành động trên dòng: Xem danh sách lô hàng (`[Lô hàng]`), Nhập thêm lô mới (`[+ Nhập kho]`), Chỉnh sửa thông tin nguyên liệu (`[Sửa]`).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** Quản lý đang ở Tab Nguyên liệu, **Khi (When)** quan sát từng dòng nguyên liệu, **Thì (Then)** giao diện hiển thị thanh tiến trình trực quan (Visual Stock Progress Bar) phản ánh tỷ lệ tồn kho so với định mức an toàn:
   - Xanh lá: Tồn kho >= 100% định mức an toàn.
   - Vàng cam: Tồn kho từ 50% đến < 100% định mức an toàn.
   - Đỏ rực: Tồn kho < 50% định mức an toàn (hoặc hết hàng).
2. **Cho trước (Given)** Quản lý muốn tạo mới nguyên liệu, **Khi (When)** nhấn nút `[+ Thêm nguyên liệu]`, **Thì (Then)** mở modal `IngredientModal` với thiết kế bo góc mềm mại, kiểm tra hợp lệ dữ liệu và cập nhật ngay vào bảng sau khi lưu thành công.
3. **Cho trước (Given)** Quản lý bấm nút `[Lô hàng]` trên dòng nguyên liệu "Thịt bò Wagyu", **Khi (When)** thao tác, **Thì (Then)** hệ thống mở Modal chi tiết các lô hàng hoặc tự động chuyển sang Tab Lô hàng và ghim bộ lọc theo đúng nguyên liệu đó.

---

### User Story 3 — Quản lý Lô hàng Nâng cao & Trực quan hóa Hạn dùng FEFO (Batches Tab Redesign) (Priority: P1)

Là một **Quản lý Nhà hàng**, tôi muốn theo dõi chi tiết từng lô hàng nhập về (`InventoryBatch`) với huy hiệu hạn sử dụng rõ ràng (còn hạn, cận date, quá hạn), trạng thái hoạt động (đang dùng, đã khóa RM-013) và thực hiện các thao tác 1 chạm như Khóa lô, Kích hoạt lại hoặc Xuất hủy lô quá hạn, nhằm đảm bảo chất lượng an toàn thực phẩm theo nguyên tắc FEFO.

**Lý do ưu tiên**: Quản lý hạn dùng và kiểm soát lô bị khóa là nghiệp vụ trọng yếu ngăn ngừa rủi ro ngộ độc thực phẩm và giảm lãng phí tài sản nhà hàng.

**Kiểm thử Độc lập**:
- Chuyển sang Tab "Danh sách Lô hàng": Bảng hiển thị danh sách toàn bộ các lô với Mã lô, Tên nguyên liệu, Ngày nhập, Ngày hết hạn, Số lượng ban đầu, Số lượng tồn hiện tại, Đơn giá nhập và Badge trạng thái hạn dùng.
- Thao tác Khóa lô (RM-013): Nhấn `[Khóa lô]` -> Mở modal chọn lý do mẫu -> Xác nhận -> Lô chuyển sang trạng thái Inactive, loại khỏi FEFO.
- Thao tác Mở khóa lô: Nhấn `[Mở khóa]` -> Xác nhận -> Lô trở lại trạng thái khả dụng.
- Thao tác Xuất hủy lô (`[Xuất hủy]`): Mở modal nhập lý do hủy -> Xác nhận -> Ghi nhận giao dịch DISCARD và trừ kho.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** danh sách các lô hàng đang hiển thị, **Khi (When)** quan sát cột Hạn sử dụng, **Thì (Then)** hệ thống hiển thị Badge trạng thái trực quan:
   - **Xanh lá**: Còn hạn dài (> 7 ngày).
   - **Vàng cam (`Cận date`)**: Hạn sử dụng còn <= 7 ngày, kèm dòng đếm ngược *"Còn X ngày"*.
   - **Đỏ (`Quá hạn`)**: Đã quá ngày hết hạn, kèm nhãn *"Cần xuất hủy"*.
   - **Xám tím (`Đã khóa`)**: Lô đang bị tạm ngưng theo RM-013, hiển thị kèm lý do khóa khi rê chuột.
2. **Cho trước (Given)** một lô hàng quá hạn, **Khi (When)** Quản lý nhấn nút `[Xuất hủy]`, **Thì (Then)** mở `DiscardBatchModal` hiện đại, hiển thị rõ số lượng hủy, đơn vị chuẩn và bắt buộc nhập lý do xuất hủy trước khi xác nhận.
3. **Cho trước (Given)** Quản lý nhập thêm một lô hàng mới, **Khi (When)** bấm `[+ Nhập lô mới]`, **Thì (Then)** mở `CreateBatchModal` với danh mục chọn nguyên liệu tìm kiếm nhanh (`CustomSelect`), tự động điền ngày nhập hôm nay, tính toán thành tiền dự kiến dựa trên số lượng và đơn giá.

---

### User Story 4 — Nhật ký Giao dịch Xuất Nhập Tồn & Kiểm kê Cân đối (Transactions Tab Redesign) (Priority: P1)

Là một **Quản lý Nhà hàng**, tôi muốn tra cứu lịch sử toàn bộ các giao dịch biến động kho (Nhập hàng, Khấu trừ POS bán hàng, Xuất hủy hư hỏng, Điều chỉnh kiểm kê) và có thể thực hiện cân đối kho nhanh chóng (Stock Adjustment), nhằm minh bạch số liệu và ngăn chặn thất thoát.

**Lý do ưu tiên**: Minh bạch sổ sách kế toán kho và xử lý độ lệch giữa số liệu thực tế với số liệu trên phần mềm.

**Kiểm thử Độc lập**:
- Chuyển sang Tab "Nhật ký Giao dịch": Hiển thị bảng biến động kho với Ngày giờ, Loại giao dịch (IN, OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, DISCARD), Nguyên liệu, Mã lô, Số lượng biến động, Số dư sau giao dịch và Ghi chú.
- Lọc giao dịch theo: Loại giao dịch, Khoảng thời gian (Hôm nay, 7 ngày qua, Tháng này), Tên nguyên liệu.
- Bấm nút `[Điều chỉnh kiểm kê]`: Mở modal `StockAdjustmentModal` để nhập số lượng thực tế đếm được và ghi nhận chênh lệch.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** Quản lý đang ở Tab Nhật ký Giao dịch, **Khi (When)** xem cột Loại giao dịch, **Thì (Then)** hiển thị badge màu sắc và icon phân biệt rõ ràng:
   - Nhập hàng (`IN`): Badge xanh lá `[+ Nhập kho]`.
   - Tiêu hao POS (`OUT`): Badge xanh dương `[- Tiêu hao POS]`.
   - Kiểm kê tăng (`ADJUSTMENT_IN`): Badge tím `[+ Kiểm kê tăng]`.
   - Kiểm kê giảm (`ADJUSTMENT_OUT`): Badge cam `[- Kiểm kê giảm]`.
   - Xuất hủy (`DISCARD`): Badge đỏ `[- Xuất hủy hỏng]`.
2. **Cho trước (Given)** kết quả kiểm đếm thực tế có chênh lệch so với số trên hệ thống, **Khi (When)** Quản lý mở modal `StockAdjustmentModal`, chọn nguyên liệu và lô hàng, nhập số tồn thực tế, **Thì (Then)** hệ thống tự động tính số lượng chênh lệch (Delta), yêu cầu nhập lý do kiểm kê và cập nhật tồn kho tức thì sau khi lưu.

---

### User Story 5 — Tối ưu hóa Toàn diện các Modal Nghiệp vụ Kho (Modals Redesign) (Priority: P1)

Là một **Người dùng hệ thống**, khi tôi mở bất kỳ modal tác vụ kho nào (Nhập lô, Xuất hủy, Điều chỉnh tồn, Xem chi tiết lô), tôi muốn modal có kích thước chuẩn, bố cục thông thoáng, trường nhập liệu rõ ràng, hiển thị cảnh báo dễ hiểu và hỗ trợ phím tắt (`Enter`, `Esc`), để thao tác nhanh chóng và không bị nhầm lẫn.

**Lý do ưu tiên**: Modal là nơi trực tiếp thay đổi dữ liệu tài sản kho; thiết kế cẩn thận giúp giảm thiểu 100% lỗi thao tác sai của người dùng.

**Kiểm thử Độc lập**:
- Mở lần lượt 4 modal: `CreateBatchModal`, `DiscardBatchModal`, `StockAdjustmentModal`, `IngredientBatchesModal`.
- Xác minh giao diện: Header có icon chủ đề, nút đóng `✕`, footer chứa nút `[Hủy]` và `[Xác nhận]`.
- Kiểm tra tính năng validate form thời gian thực (báo đỏ khi để trống trường bắt buộc, chặn nhập số âm).
- Nhấn phím `Esc` để đóng modal an toàn (kèm cảnh báo nếu form có dữ liệu chưa lưu).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** bất kỳ modal nghiệp vụ kho nào được mở, **Khi (When)** hiển thị trên màn hình, **Thì (Then)** modal tuân thủ phong cách thiết kế Bento chuẩn:
   - Bo góc mềm mại `rounded-2xl`, viền bóng mờ cao cấp `shadow-xl`.
   - Thanh tiêu đề nổi bật sắc cam `#EA580C`, phụ đề giải thích mục đích rõ ràng.
   - Các ô input sử dụng viền xám nhạt `border-gray-200`, chuyển cam khi focus `focus:border-orange-500 focus:ring-orange-200`.
   - Nút hành động chính có hiệu ứng chuyển màu cam sinh động kèm trạng thái loading spinner khi đang gửi dữ liệu.
2. **Cho trước (Given)** Quản lý đang nhập form tạo lô hàng mới, **Khi (When)** chọn nguyên liệu, **Thì (Then)** hệ thống tự động hiển thị đơn vị tính chuẩn kho của nguyên liệu đó bên cạnh ô số lượng (ví dụ: `kg`, `g`, `lít`, `chai`) để tránh nhầm lẫn quy cách.

---

### User Story 6 — Tích hợp Thông tin Dự báo (RM-014) & Lối tắt Phân hệ Thủ kho (RM-020) (Priority: P2)

Là một **Quản lý Nhà hàng**, tôi muốn xem nhanh các gợi ý nhập hàng từ Module Dự báo (RM-014) và có nút lối tắt chuyển đổi nhanh sang Phân hệ Thủ kho (`/inventory-keeper`), để tôi có thể kết nối liền mạch giữa hoạch định mua sắm và giám sát thực địa quầy kho.

**Lý do ưu tiên**: Tăng cường tính liên thông giữa các phân hệ nghiệp vụ, tiết kiệm thời gian điều hướng của cấp quản lý.

**Kiểm thử Độc lập**:
- Kiểm tra khối Thông tin Dự báo (Replenishment Insights): Hiển thị danh sách top 3 nguyên liệu dự báo sắp cạn dựa trên kế hoạch RM-014 kèm nút `[Nhập ngay]` dẫn thẳng vào modal tạo lô tương ứng.
- Kiểm tra nút lối tắt `[Giao diện Thủ kho ↗]` trên thanh tiêu đề: Nhấn nút -> Điều hướng mượt mà sang `/inventory-keeper/dashboard`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng có vai trò `Manager` hoặc `Administrator` đang ở `/inventory`, **Khi (When)** quan sát thanh tiêu đề trang (Page Header), **Thì (Then)** xuất hiện nút hành động `[Giao diện Thủ kho ↗]` với icon quầy kho, khi click sẽ đưa người dùng sang `/inventory-keeper/dashboard` mà không cần đăng xuất.
2. **Cho trước (Given)** hệ thống có dữ liệu kế hoạch nguyên liệu từ RM-014, **Khi (When)** người dùng bật xem khối Đề xuất Mua hàng (Replenishment Card), **Thì (Then)** hiển thị bảng tóm tắt số lượng gợi ý mua thêm, bấm nút `[Nhập hàng]` trên từng dòng sẽ tự động điền sẵn nguyên liệu và số lượng gợi ý vào modal Nhập lô mới.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Nguyên liệu chưa từng có lô hàng nào nhập kho**: Khi xem nguyên liệu mới tạo chưa có lô hàng nào, hiển thị trạng thái tồn `CurrentStock = 0` với huy hiệu xám `[Chưa nhập kho]` thay vì báo lỗi hoặc để trống, kèm nút gợi ý `[+ Nhập lô đầu tiên]`.
- **EC-002: Lô hàng có hạn sử dụng đúng vào ngày hôm nay**: Hiển thị badge cảnh báo khẩn màu đỏ cam với nhãn *"Hết hạn hôm nay"* và đưa lên vị trí ưu tiên hàng đầu trong danh sách xuất kho FEFO.
- **EC-003: Xung đột dữ liệu khi Thủ kho xuất hủy đồng thời lúc Quản lý đang xem**: Sử dụng cơ chế làm mới dữ liệu thông minh hoặc nút `[Làm mới]` nhanh để cập nhật lại số dư kho mà không làm mất trạng thái bộ lọc đang chọn của Quản lý.
- **EC-004: Xóa nguyên liệu đang còn tồn kho hoặc đang liên kết công thức (RM-007)**: Chặn xóa an toàn và hiển thị thông báo giải thích chi tiết, hướng dẫn chuyển sang trạng thái Tạm ngưng (Deactivate) thay vì xóa cứng.
- **EC-005: Điều chỉnh kiểm kê số âm vượt quá tồn hiện tại**: Chặn nhập số tồn âm trong modal điều chỉnh kho; số tồn thực tế sau kiểm kê bắt buộc phải >= 0.

---

## 4. Yêu cầu Hệ thống (System Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI tái cấu trúc màn hình Quản lý Tồn kho `/inventory` thành kiến trúc component phân rã mô-đun (Modular Sub-components), loại bỏ kiến trúc monolithic hiện tại.
- **FR-002**: Hệ thống PHẢI cung cấp component `InventoryKpiBarComponent` hiển thị 4 chỉ số KPI Bento chuẩn: Tổng nguyên liệu, Tồn an toàn, Cảnh báo thiếu hụt, và Lô quá hạn cần hủy.
- **FR-003**: Hệ thống PHẢI cung cấp component `InventoryAlertsBannerComponent` hiển thị các cảnh báo tồn kho và hạn dùng khẩn cấp với khả năng thu gọn/mở rộng mượt mà.
- **FR-004**: Hệ thống PHẢI cung cấp thanh chuyển đổi 3 Tab dữ liệu chính:
  - Tab 1: Nguyên liệu & Tồn kho (`ingredients`).
  - Tab 2: Danh sách Lô hàng (`batches`).
  - Tab 3: Nhật ký Biến động & Kiểm kê (`transactions`).
- **FR-005**: Tại Tab Nguyên liệu, hệ thống PHẢI hiển thị: Tên, Mã, Đơn vị, Điều kiện bảo quản (Mát/Đông/Khô), Tồn kho khả dụng, Định mức tồn an toàn, Visual Stock Progress Bar và các nút hành động (Xem lô, Nhập lô, Sửa).
- **FR-006**: Tại Tab Lô hàng, hệ thống PHẢI hiển thị: Mã lô, Nguyên liệu, Ngày nhập, Ngày hết hạn kèm Badge FEFO thời gian thực, Tồn hiện tại/Ban đầu, Đơn giá nhập, Trạng thái hoạt động (Đang dùng / Đã khóa RM-013) và các thao tác (Khóa, Mở khóa, Xuất hủy).
- **FR-007**: Tại Tab Nhật ký Giao dịch, hệ thống PHẢI hiển thị lịch sử biến động bất biến với đầy đủ loại giao dịch (`IN`, `OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DISCARD`) kèm bộ lọc thời gian và loại giao dịch.
- **FR-008**: Hệ thống PHẢI chuẩn hóa toàn diện 4 modal nghiệp vụ kho:
  - `CreateInventoryBatchModalComponent`: Nhập lô hàng mới.
  - `DiscardBatchModalComponent`: Xuất hủy lô quá hạn / hỏng.
  - `StockAdjustmentModalComponent`: Cân đối kiểm kê kho thực tế.
  - `IngredientBatchesModalComponent`: Xem chi tiết các lô của một nguyên liệu.
- **FR-009**: Hệ thống PHẢI cung cấp nút hành động `[Giao diện Thủ kho ↗]` trên tiêu đề trang `/inventory` dẫn trực tiếp đến `/inventory-keeper/dashboard` cho người dùng có thẩm quyền.
- **FR-010**: Hệ thống PHẢI tích hợp khối thông tin Đề xuất Nhập hàng liên kết từ Module Dự báo (RM-014) giúp 1 click điền sẵn dữ liệu nhập kho.
- **FR-011**: Hệ thống PHẢI hỗ trợ tìm kiếm tức thì trên cả 3 tab với độ trễ debounce không quá 250ms.
- **FR-012**: Hệ thống PHẢI hỗ trợ bộ lọc nhanh theo Điều kiện bảo quản (Tất cả, Mát, Đông, Khô) và Trạng thái tồn kho / hạn dùng.
- **FR-013**: Hệ thống PHẢI đảm bảo phân quyền truy cập nghiêm ngặt bằng `smartPermissionGuard`, chỉ tài khoản sở hữu quyền `TooHungry.Inventories` mới được truy cập `/inventory`.
- **FR-014**: Hệ thống PHẢI tích hợp đồng bộ với `UserRoleNavigationService` và bộ trang báo lỗi RM-019 khi xảy ra sự cố.
- **FR-015**: 100% các chuỗi văn bản, nhãn nút, tiêu đề, thông báo cảnh báo và nội dung modal PHẢI được cấu hình song ngữ đầy đủ trong `vi.json` và `en.json`.

### Yêu cầu Phi chức năng (Non-Functional Requirements)

- **NFR-001 (Hiệu năng)**: Thời gian tải trang ban đầu và thời gian chuyển tab dữ liệu không vượt quá 200ms trên môi trường mạng tiêu chuẩn.
- **NFR-002 (Thẩm mỹ & Visual)**: Áp dụng chuẩn nhận diện Cam & Trắng (`#EA580C`), phong cách Bento Grid hiện đại, bo góc mềm mại `rounded-2xl`, bóng đổ nhẹ `shadow-sm`, loại bỏ triệt để các class Bootstrap thô cũ.
- **NFR-003 (Khả năng tương thích)**: Bố cục hiển thị tối ưu trên cả màn hình Desktop (>= 1200px) và Tablet landscape/portrait (768px - 1199px) của người quản lý.
- **NFR-004 (Độ tin cậy & Toàn vẹn dữ liệu)**: Dữ liệu tồn kho hiển thị phải luôn loại trừ các lô hàng đã hết hạn hoặc đang bị khóa (RM-013) khỏi tồn kho khả dụng phục vụ bếp.
- **NFR-005 (Tính khả dụng)**: Các thao tác quan trọng có nguy cơ thất thoát (Xuất hủy lô, Điều chỉnh kiểm kê kho) bắt buộc phải có hộp thoại xác nhận với thông tin cảnh báo rõ ràng.
- **NFR-006 (Không làm phát sinh nợ kỹ thuật backend)**: Tái sử dụng 100% các API hiện có (`IInventoryAppService`, `IIngredientAppService`) từ RM-011, RM-013 mà không đòi hỏi chỉnh sửa phá vỡ cấu trúc backend.

---

## 5. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

- **SC-001**: Toàn bộ giao diện `/inventory` được tái thiết kế thành công sang chuẩn Bento Grid Cam & Trắng (`#EA580C`), mang lại diện mạo hiện đại và đồng bộ 100% với Dashboard (RM-018) và Shared UI (RM-002).
- **SC-002**: Mã nguồn của màn hình `/inventory` được tái cấu trúc thành công thành các sub-components độc lập, giảm độ dài của file component chính xuống dưới 300 dòng, tăng khả năng bảo trì và kiểm thử.
- **SC-003**: 4 Thẻ KPI Bento và Băng rôn Cảnh báo hiển thị chính xác số liệu tổng hợp trong thời gian dưới 200ms kể từ khi tải trang.
- **SC-004**: Người dùng có thể tìm kiếm, lọc và phân loại nguyên liệu / lô hàng theo hạn sử dụng và điều kiện bảo quản với thời gian phản hồi tức thì (< 150ms).
- **SC-005**: 100% các modal nghiệp vụ kho (Nhập lô, Xuất hủy, Kiểm kê) được chuẩn hóa thiết kế, validate chặt chẽ và không còn tình trạng giao diện lệch lạc.
- **SC-006**: Lối tắt chuyển đổi sang Phân hệ Thủ kho (`/inventory-keeper`) và khối gợi ý nhập hàng từ Dự báo (RM-014) hoạt động thông suốt và trực quan.
- **SC-007**: 100% các chuỗi văn bản trên toàn bộ giao diện quản trị kho được bản dịch hóa song ngữ đầy đủ trong `vi.json` và `en.json`.
