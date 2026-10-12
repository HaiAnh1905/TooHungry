# Đặc tả Tính năng (Feature Specification): Quản lý Tồn kho & Giao dịch (Inventory Transactions & Batch Management)

**Mã Tính năng (Feature ID)**: `RM-011`

**Nhánh Tính năng (Feature Branch)**: `011-rm-011-inventory-transactions`

**Ngày cập nhật**: 2026-10-09

**Trạng thái**: Hoàn thiện (Ready for Plan)

**Đầu vào**: Yêu cầu nghiệp vụ từ Roadmap RM-011: "Quản lý số lượng nhập/xuất/tồn của các nguyên liệu, quản lý theo lô hàng (Batch), xuất kho tự động theo hạn sử dụng (FEFO), kiểm kê điều chỉnh và lịch sử giao dịch bất biến."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 2026-10-09
- **Q1: Cơ chế theo dõi tồn kho giữa thực thể nguyên liệu cơ sở (`Ingredient` - RM-005) và các lô hàng (`InventoryBatch` - RM-011) được phân định như thế nào?**
  - **A1**: Số lượng tồn khả dụng thực tế của nguyên liệu (`CurrentStock`) được tính toán động (hoặc tổng hợp) từ tổng số lượng còn lại (`RemainingQuantity`) của tất cả các lô hàng đang hoạt động (`IsActive = true`) và còn hạn sử dụng. Tuyệt đối không cho phép nhân viên sửa tay trực tiếp trường tồn kho tại màn hình Master Data `Ingredient`; mọi biến động tăng/giảm tồn kho bắt buộc phải sinh ra thông qua giao dịch nhập kho theo lô, xuất kho bán hàng hoặc phiếu kiểm kê điều chỉnh.
- **Q2: Thuật toán xuất kho FEFO (First Expired, First Out) xử lý thế nào khi có nhiều lô cùng hạn sử dụng hoặc gặp lô hàng đã quá hạn?**
  - **A2**:
    1. Ưu tiên hàng đầu là ngày hết hạn (`ExpiryDate ASC`). Nếu các lô có cùng ngày hết hạn, hệ thống ưu tiên lô nhập trước (`ReceivedAt ASC` - FIFO).
    2. Đối với nguyên liệu tươi sống (`StorageType.FRESH`), thuật toán FEFO **tự động bỏ qua các lô đã quá hạn** (`ExpiryDate < Now`), không xuất cho nhà bếp để đảm bảo an toàn vệ sinh thực phẩm. Các lô quá hạn này sẽ kích hoạt cảnh báo nguy cấp (`EXPIRED_FRESH`) để thủ kho làm thủ tục tiêu hủy.
    3. Đối với nguyên liệu không có hạn sử dụng (ví dụ: muối ăn, đường tinh luyện), hạn sử dụng được mặc định là vô cực (hoặc ngày rất xa trong tương lai) và hệ thống tự động sắp xếp xuất theo thứ tự nhập kho (`ReceivedAt ASC`).
- **Q3: Cơ chế quy đổi đơn vị đo lường khi nhập kho từ Đơn vị mua hàng (Purchase Unit) sang Đơn vị cơ sở (Base Unit)?**
  - **A3**: Khi tạo phiếu nhập lô hàng, nhân viên có thể nhập theo đơn vị đóng gói mua vào của nhà cung cấp (ví dụ: Thùng, Két, Bao, Túi). Hệ thống sử dụng tỷ lệ quy đổi `ConversionFactor` (1 PurchaseUnit = `ConversionFactor` BaseUnit) với độ chính xác cao `Decimal` (4 chữ số thập phân, không làm tròn trung gian) để tính toán chính xác số lượng tồn `Quantity` và `RemainingQuantity` lưu trong `InventoryBatch`.
- **Q4: Xử lý giao dịch kiểm kê kho thực tế (Stock Adjustment) khi phát hiện chênh lệch thừa/thiếu?**
  - **A4**:
    - **Thiếu hụt kho (Difference < 0)**: Bắt buộc người dùng phải chọn đích danh từng lô hàng cụ thể (`BatchId`) và nhập số lượng hao hụt cho từng lô đó. Tổng lượng giảm trừ của các lô phải khớp chính xác với số lượng thiếu hụt. Hệ thống khấu trừ `RemainingQuantity` của từng lô và ghi nhận giao dịch `ADJUSTMENT_OUT` kèm lý do giải trình bắt buộc.
    - **Dư thừa kho (Difference > 0)**: Hệ thống tự động tạo một lô điều chỉnh mới với mã sinh tự động `ADJ-yyyyMMddHHmmss`, hạn dùng 1 năm, và ghi nhận giao dịch `ADJUSTMENT_IN` tương ứng kèm lý do.
- **Q5: Xử lý tình huống đơn hàng bán ra yêu cầu lượng nguyên liệu vượt quá tổng tồn kho khả dụng hiện tại (Thiếu kho)?**
  - **A5**: Khi POS gửi yêu cầu trừ kho FEFO cho một đơn hàng đã hoàn tất thanh toán, nếu tổng tồn kho khả dụng không đủ, hệ thống sẽ trừ hết toàn bộ các lô khả dụng về `0` (không làm âm kho), trả về số lượng thiếu hụt (`ShortageQuantity`), ghi nhận giao dịch `OUT` cho lượng thực tế đã trừ và đồng thời phát sinh cảnh báo thiếu hụt (`SHORTAGE`) để bộ phận kho kịp thời nhập hàng bổ sung.
- **Q6: Tính bất biến (Immutability) và Kiểm toán (Audit Trail) của lịch sử giao dịch tồn kho (`InventoryTransaction`)?**
  - **A6**: Bảng `InventoryTransaction` là kho dữ liệu lưu vết bất biến. Không cung cấp bất kỳ API hoặc nút bấm nào cho phép sửa đổi (Update) hoặc xóa vật lý (Delete) các bản ghi giao dịch đã tạo. Mọi điều chỉnh sửa sai số liệu kho đều phải thực hiện bằng một giao dịch đảo hoặc giao dịch điều chỉnh mới.
- **Q7: Cơ chế Giám sát Hạn sử dụng và Hệ thống Cảnh báo (Alerts)?**
  - **A7**: Cung cấp API cảnh báo phân cấp rủi ro:
    - `EXPIRED_FRESH` (Mức nguy hiểm - `danger`): Lô nguyên liệu tươi sống đã quá hạn sử dụng, chặn xuất chế biến, yêu cầu xuất hủy ngay lập tức.
    - `NEAR_EXPIRY` (Mức cảnh báo - `warning`): Các lô hàng sắp hết hạn trong vòng 3 ngày tới, yêu cầu ưu tiên sử dụng.
    - `OUT_OF_STOCK` / `SHORTAGE` (Mức cảnh báo - `warning`): Tồn kho khả dụng về 0 hoặc dưới ngưỡng an toàn tối thiểu (`MinStock`).
- **Q8: Ranh giới kiến trúc giữa RM-011, RM-012 và RM-013?**
  - **A8**:
    - **RM-011 (Feature hiện tại)**: Chịu trách nhiệm toàn bộ tầng Domain, Logic nghiệp vụ FEFO, Kiểm kê kho, Cảnh báo hạn dùng, các API Controller/AppService, kiểm thử tự động, và cung cấp hợp đồng dữ liệu chuẩn cho toàn bộ hệ thống.
    - **RM-012**: Tái thiết kế toàn diện UI Angular (Modal/Drawer tra cứu chi tiết lô, giao diện lịch sử giao dịch, bảng điều khiển thẻ chỉ số tồn kho chuyên nghiệp).
    - **RM-013**: Bổ sung cơ chế Khóa/Tạm ngưng (`Deactivate`) và Khôi phục (`Restore`) đối với từng lô hàng hoặc mặt hàng tồn kho cụ thể.
- **Q9: Kiểm soát tương tranh (Concurrency Control) khi nhiều đơn hàng cùng trừ kho FEFO đồng thời?**
  - **A9**: Áp dụng cơ chế **Optimistic Concurrency Control** thông qua `ConcurrencyStamp` trên thực thể `InventoryBatch`. Nếu phát sinh xung đột tương tranh (`AbpDbConcurrencyException`), tầng Application thực hiện chính sách retry tự động (tối đa 3 lần) để tính toán lại danh sách lô hàng FEFO khả dụng, đảm bảo tính toàn vẹn 100% không bao giờ làm âm kho.
- **Q10: Xử lý mức độ ưu tiên và cảnh báo đối với nguyên liệu tươi sống (StorageType.FRESH) sắp hết hạn trong ngày?**
  - **A10**: Bổ sung loại cảnh báo `EXPIRING_TODAY` (mức độ cảnh báo cao / cam-đỏ) cho các lô FRESH có thời gian hết hạn còn lại dưới 24 giờ. Thuật toán FEFO tự động xếp các lô này lên vị trí ưu tiên cao nhất để xuất kho trước cho mọi yêu cầu chế biến phát sinh trong ngày.
- **Q11: Lưu vết đơn giá vốn (UnitCost) vào giao dịch tồn kho (InventoryTransaction)?**
  - **A11**: Bổ sung trường `UnitCost` (decimal) vào thực thể `InventoryTransaction`. Khi phát sinh giao dịch nhập (`IN`), xuất (`OUT`) hoặc điều chỉnh (`ADJUSTMENT_OUT`), hệ thống sao chép đơn giá vốn của lô hàng liên quan (`InventoryBatch.UnitCost`) vào giao dịch để phục vụ phân tích chi phí và tính toán Giá vốn hàng bán (COGS) đích danh chính xác 100%.
- **Q12: Vòng đời và quy trình xử lý lô hàng đã quá hạn sử dụng (Expired Batches)?**
  - **A12**: Khi lô hàng quá hạn (`ExpiryDate < Now`), hệ thống tự động loại bỏ lô khỏi danh sách xuất FEFO và bật cờ cảnh báo `EXPIRED`. Tuy nhiên, số lượng tồn thực tế của lô được giữ nguyên trên hệ thống để phục vụ đối soát kiểm kê vật lý, cho đến khi Thủ kho hoặc Quản lý thực hiện thao tác Xuất hủy (`Discard`) thủ công kèm lý do bắt buộc để chuyển `RemainingQuantity = 0`, `IsActive = false`, và sinh giao dịch xuất hủy `ADJUSTMENT_OUT`.
- **Q13: Phân quyền và vai trò người dùng đối với các thao tác kho nhạy cảm (AdjustStock, Discard)?**
  - **A13**: Áp dụng phân quyền chi tiết (ABP Permissions): Chỉ tài khoản có vai trò Quản lý (`Manager`) hoặc Quản trị viên (`Admin`) mới được cấp quyền thực hiện Điều chỉnh kiểm kê (`TooHungryPermissions.Inventories.Adjust`) và Tiêu hủy lô hàng (`TooHungryPermissions.Inventories.Discard`). Nhân viên kho hoặc nhân viên phục vụ thông thường chỉ có quyền Xem danh sách (`TooHungryPermissions.Inventories.Default`) và Lập phiếu nhập kho (`TooHungryPermissions.Inventories.Create`).

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Nhập hàng vào kho theo Lô (Batch Inbound & Conversion) (Priority: P1)

Là Thủ kho / Quản lý nhà hàng, khi nhận hàng từ nhà cung cấp, tôi muốn lập phiếu nhập kho theo đơn vị mua hàng (Purchase Unit), ghi nhận mã lô, hạn sử dụng, đơn giá mua và để hệ thống tự động quy đổi ra đơn vị chuẩn (Base Unit), tạo lô hàng mới và ghi nhận giao dịch nhập kho (`IN`).

**Lý do cho mức độ ưu tiên này**: Đây là điểm khởi đầu của toàn bộ luồng luân chuyển tồn kho. Không có nhập kho theo lô thì không thể có dữ liệu tồn kho để phục vụ bán hàng và quản trị rủi ro hạn sử dụng.

**Kiểm thử Độc lập**: Tạo phiếu nhập cho nguyên liệu "Thịt Bò Mỹ" (Base Unit: kg) với số lượng 3 Thùng (1 Thùng = 15 kg), hạn sử dụng 10 ngày sau, đơn giá 3,000,000đ/thùng. Kiểm tra hệ thống tạo `InventoryBatch` với `Quantity = 45`, `RemainingQuantity = 45`, `ConversionFactor = 15`, và sinh 1 bản ghi `InventoryTransaction` loại `IN` với số lượng 45 kg.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một nguyên liệu hợp lệ có đơn vị cơ sở là `kg`, **Khi (When)** nhân viên tạo lô nhập hàng với số lượng 5 "Bao" và tỷ lệ quy đổi `ConversionFactor = 20`, **Thì (Then)** hệ thống lưu `InventoryBatch` mới với `RemainingQuantity` chính xác là 100 kg.
2. **Cho trước (Given)** thao tác tạo lô nhập kho thành công, **Khi (When)** kiểm tra bảng giao dịch tồn kho, **Thì (Then)** hệ thống bắt buộc tự động sinh ra một `InventoryTransaction` loại `IN` với số lượng bằng đúng số lượng cơ sở nhập vào, liên kết đúng `IngredientId` và `BatchId`.
3. **Cho trước (Given)** thông tin mã lô hàng (`BatchCode`), **Khi (When)** người dùng nhập mã lô từ tem mác NCC, hệ thống lưu mã đó; nếu người dùng để trống mã lô, **Thì (Then)** hệ thống tự động sinh mã lô theo định dạng chuẩn (ví dụ: `BATCH-yyyyMMddHHmmss`).
4. **Cho trước (Given)** thao tác nhập hàng, **Khi (When)** người dùng nhập hạn sử dụng trong quá khứ (`ExpiryDate < Now`), **Thì (Then)** hệ thống từ chối và báo lỗi nghiệp vụ rõ ràng, không cho phép nhập nguyên liệu đã quá hạn vào kho.

---

### User Story 2 - Xuất kho nguyên liệu tự động theo FEFO (FEFO Deduction) (Priority: P1)

Là Hệ thống POS / Nhân viên bếp, khi một món ăn được chế biến hoặc thanh toán, tôi muốn hệ thống tự động khấu trừ nguyên liệu từ các lô hàng theo thứ tự ưu tiên hạn sử dụng gần nhất xuất trước (First Expired, First Out), tự động trừ nối tiếp qua nhiều lô nếu cần và ghi nhận chi tiết lịch sử xuất kho (`OUT`).

**Lý do cho mức độ ưu tiên này**: Đảm bảo tối ưu hóa tuổi thọ nguyên vật liệu, hạn chế tối đa việc nguyên liệu bị quá hạn trong kho gây tổn thất tài chính và bảo đảm an toàn vệ sinh thực phẩm.

**Kiểm thử Độc lập**: Thiết lập nguyên liệu A có 2 lô: Lô 1 (Hạn: 15/10, Tồn: 10 kg), Lô 2 (Hạn: 25/10, Tồn: 20 kg). Gọi hàm xuất 15 kg A cho đơn hàng `#ORD-001`. Kiểm tra Lô 1 giảm về 0, Lô 2 giảm còn 15 kg; sinh ra 2 bản ghi `InventoryTransaction` loại `OUT` (10 kg từ Lô 1 và 5 kg từ Lô 2) với `ReferenceId = "ORD-001"`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** nguyên liệu có nhiều lô hàng còn tồn, **Khi (When)** xuất kho một lượng nguyên liệu, **Thì (Then)** hệ thống luôn trừ từ lô có `ExpiryDate` gần nhất trước; nếu có các lô cùng ngày hết hạn thì trừ lô có `ReceivedAt` sớm hơn.
2. **Cho trước (Given)** số lượng cần xuất lớn hơn tồn dư của lô hàng đầu tiên, **Khi (When)** thực hiện xuất kho, **Thì (Then)** hệ thống tự động trừ hết lô đầu tiên về `RemainingQuantity = 0` và tiếp tục trừ phần còn lại vào lô kế tiếp trong danh sách ưu tiên.
3. **Cho trước (Given)** nguyên liệu tươi sống (`StorageType.FRESH`) có một số lô đã quá hạn sử dụng, **Khi (When)** thực hiện xuất kho FEFO, **Thì (Then)** thuật toán bắt buộc bỏ qua tất cả các lô FRESH quá hạn, chỉ xuất từ các lô còn hạn sử dụng hợp lệ.
4. **Cho trước (Given)** mỗi phần nguyên liệu được khấu trừ từ một lô hàng, **Khi (When)** trừ kho thành công, **Thì (Then)** hệ thống tạo một bản ghi `InventoryTransaction` loại `OUT` ghi rõ `BatchId`, số lượng trừ, lý do xuất và mã tham chiếu `ReferenceId`.

---

### User Story 3 - Tra cứu & Đối soát Lịch sử Giao dịch Tồn kho (Audit Trail) (Priority: P2)

Là Kế toán kho / Quản lý, tôi muốn xem toàn bộ lịch sử biến động kho của từng nguyên liệu, hỗ trợ lọc theo loại giao dịch (Nhập, Xuất, Điều chỉnh) và khoảng thời gian, để phục vụ công tác kiểm toán và đối soát định kỳ.

**Lý do cho mức độ ưu tiên này**: Tính minh bạch dữ liệu là yêu cầu cốt lõi của hệ thống quản trị kho nhà hàng, giúp phát hiện sớm các thất thoát hoặc gian lận nội bộ.

**Kiểm thử Độc lập**: Truy cập API lấy giao dịch của nguyên liệu "Cá Hồi", kiểm tra kết quả trả về đầy đủ các trường: Ngày giờ, Loại giao dịch (IN, OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT), Số lượng, Mã lô liên quan, Lý do, Mã tham chiếu và Người thực hiện (`CreatorId`).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một nguyên liệu đã phát sinh các hoạt động nhập/xuất/kiểm kê, **Khi (When)** truy vấn lịch sử giao dịch, **Thì (Then)** danh sách trả về đầy đủ các bản ghi được sắp xếp theo thời gian mới nhất lên đầu (`CreationTime DESC`).
2. **Cho trước (Given)** danh sách lịch sử giao dịch, **Khi (When)** lọc theo loại giao dịch cụ thể (ví dụ chỉ xem giao dịch xuất `OUT`), **Thì (Then)** hệ thống chỉ hiển thị đúng các bản ghi khớp với loại đã chọn.
3. **Cho trước (Given)** một bản ghi giao dịch đã được ghi nhận trong cơ sở dữ liệu, **Khi (When)** kiểm tra tính toàn vẹn, **Thì (Then)** bản ghi đó không thể bị sửa đổi hoặc xóa thông qua bất kỳ API thông thường nào (Read-only Audit Log).

---

### User Story 4 - Kiểm kê Kho & Điều chỉnh Tồn kho (Stock Adjustment) (Priority: P2)

Là Quản lý kho, khi thực hiện kiểm kê kho thực tế vào cuối ngày/cuối tuần, tôi muốn ghi nhận số lượng thực tế đếm được và thực hiện điều chỉnh cân đối kho (nếu thừa thì tự tạo lô bù, nếu thiếu thì chọn lô cụ thể để trừ hao hụt) kèm theo lý do giải trình bắt buộc.

**Lý do cho mức độ ưu tiên này**: Trong vận hành thực tế luôn xảy ra hao hụt, rơi vãi, rách bao bì hoặc tìm thấy hàng sót trong kho; tính năng này giúp số liệu phần mềm luôn phản ánh đúng thực tế kho vật lý.

**Kiểm thử Độc lập**: Nguyên liệu "Muối Hạt" đang có tồn hệ thống là 10 kg (ở Lô S1). Kiểm kê thực tế chỉ còn 8 kg (thiếu 2 kg do ẩm ướt). Gọi `AdjustStockAsync` chỉ định Lô S1 giảm 2 kg với lý do "Bao bì rách ẩm". Kiểm tra Lô S1 còn 8 kg và sinh 1 transaction `ADJUSTMENT_OUT` với số lượng 2 kg.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** kết quả kiểm kê thực tế thiếu hụt so với hệ thống (`ActualQuantity < SystemQuantity`), **Khi (When)** người dùng thực hiện điều chỉnh, **Thì (Then)** hệ thống bắt buộc yêu cầu chọn đích danh từng lô hàng cụ thể và nhập lượng trừ tương ứng; nếu tổng lượng trừ các lô không khớp mức chênh lệch, hệ thống từ chối thực hiện.
2. **Cho trước (Given)** kết quả kiểm kê thực tế dư thừa so với hệ thống (`ActualQuantity > SystemQuantity`), **Khi (When)** người dùng thực hiện điều chỉnh, **Thì (Then)** hệ thống tự động sinh một lô hàng điều chỉnh tăng mới (`ADJ-...`) với số lượng bằng đúng mức chênh lệch dương và tạo giao dịch `ADJUSTMENT_IN`.
3. **Cho trước (Given)** thao tác điều chỉnh tồn kho, **Khi (When)** người dùng để trống trường lý do (`Reason`), **Thì (Then)** hệ thống chặn lại và yêu cầu nhập lý do bắt buộc để đảm bảo trách nhiệm giải trình.

---

### User Story 5 - Giám sát Hạn sử dụng & Cảnh báo Tồn kho (Inventory Alerts) (Priority: P2)

Là Thủ kho / Bếp trưởng, tôi muốn hệ thống chủ động quét và cảnh báo danh sách các lô hàng tươi sống đã quá hạn cần tiêu hủy, các lô hàng sắp hết hạn trong 3 ngày tới để ưu tiên dùng trước, và các nguyên liệu sắp hết hàng dưới mức tồn an toàn.

**Lý do cho mức độ ưu tiên này**: Chủ động ngăn chặn nguy cơ phục vụ thực phẩm ôi thiu cho thực khách và hạn chế đứt gãy chuỗi cung ứng món ăn trong giờ cao điểm.

**Kiểm thử Độc lập**: Gọi API `GetAlertsAsync`. Xác nhận trả về đúng danh sách cảnh báo với cờ phân loại và độ nghiêm trọng: `EXPIRED_FRESH` (danger), `NEAR_EXPIRY` (warning), `OUT_OF_STOCK` (warning).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một lô hàng của nguyên liệu `StorageType.FRESH` có `ExpiryDate < UtcNow`, **Khi (When)** hệ thống quét cảnh báo, **Thì (Then)** sinh cảnh báo loại `EXPIRED_FRESH` với mức độ `danger` kèm thông báo khuyến nghị tiêu hủy ngay lập tức.
2. **Cho trước (Given)** một lô hàng còn hạn sử dụng trong khoảng thời gian từ hiện tại đến 3 ngày tới (`ExpiryDate <= UtcNow.AddDays(3)`), **Khi (When)** quét cảnh báo, **Thì (Then)** sinh cảnh báo loại `NEAR_EXPIRY` với mức độ `warning` để ưu tiên xuất trước.
3. **Cho trước (Given)** một nguyên liệu có tổng tồn kho khả dụng `<= MinStock`, **Khi (When)** quét cảnh báo, **Thì (Then)** sinh cảnh báo thiếu hàng `OUT_OF_STOCK` hoặc `SHORTAGE` để nhắc nhở đặt hàng nhà cung cấp.

---

### User Story 6 - Tiêu hủy Lô Hàng Quá Hạn & Dọn kho (Batch Discard / Clear) (Priority: P3)

Là Quản lý nhà hàng / Thủ kho, khi phát hiện một lô hàng bị hỏng, ôi thiu hoặc quá hạn không thể sử dụng được nữa, tôi muốn thực hiện thao tác tiêu hủy lô hàng (`Discard`) để đưa số lượng tồn của lô về 0 và đánh dấu lô không còn hoạt động, đồng thời lưu vết người thực hiện và lý do tiêu hủy.

**Lý do cho mức độ ưu tiên này**: Đảm bảo các lô hàng hỏng được loại bỏ dứt điểm khỏi danh sách tham gia thuật toán FEFO mà vẫn lưu giữ nguyên vẹn lịch sử nhập kho ban đầu.

**Kiểm thử Độc lập**: Chọn 1 lô hàng sữa tươi 2 lít đã hỏng. Thực hiện Discard với lý do "Sữa chua lên men hỏng". Kiểm tra `RemainingQuantity = 0`, `IsActive = false`, và sinh 1 transaction `ADJUSTMENT_OUT` (hoặc Clear) tương ứng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** một lô hàng đang active, **Khi (When)** người dùng có thẩm quyền bấm Discard kèm lý do, **Thì (Then)** hệ thống cập nhật `RemainingQuantity = 0`, `IsActive = false`, và ghi nhận giao dịch xuất hủy tương ứng.
2. **Cho trước (Given)** lô hàng đã bị Discard, **Khi (When)** hệ thống thực hiện thuật toán xuất kho FEFO hoặc tính toán `CurrentStock`, **Thì (Then)** lô hàng này hoàn toàn không còn tham gia vào quá trình tính toán.

---

## Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cung cấp khả năng tạo mới lô hàng (`InventoryBatch`) với các thông tin: Nguyên liệu (`IngredientId`), Mã lô (`BatchCode`), Số lượng mua (`PurchaseQuantity`), Đơn vị mua (`PurchaseUnit`), Hệ số quy đổi (`ConversionFactor`), Ngày nhập (`ReceivedAt`), Hạn sử dụng (`ExpiryDate`), Nhà cung cấp (`SupplierId`), và Đơn giá mua (`UnitCost`).
- **FR-002**: Hệ thống PHẢI tự động tính toán số lượng cơ sở quy đổi (`BaseQuantity = PurchaseQuantity * ConversionFactor`) bằng kiểu dữ liệu số thực chính xác cao (`Decimal`), lưu đồng nhất vào `Quantity` và `RemainingQuantity` của `InventoryBatch`.
- **FR-003**: Khi tạo mới lô hàng thành công, hệ thống BẮT BUỘC phải tự động sinh ra một bản ghi giao dịch nhập kho (`InventoryTransaction`) với `TransactionType = IN`, lưu đúng số lượng quy đổi và thời gian tạo.
- **FR-004**: Nếu người dùng không nhập mã lô (`BatchCode`), hệ thống PHẢI tự động sinh mã lô theo định dạng chuẩn thời gian `BATCH-yyyyMMddHHmmss`.
- **FR-005**: Hệ thống PHẢI chặn thao tác nhập hàng nếu ngày hết hạn của lô hàng nhỏ hơn hoặc bằng ngày hiện tại (`ExpiryDate <= Today`).
- **FR-006**: Hệ thống PHẢI triển khai thuật toán xuất kho tự động theo quy tắc FEFO (First Expired, First Out) tại tầng Domain (`InventoryManager.DeductFefoAsync`):
  - Ưu tiên 1: Sắp xếp các lô hàng còn tồn theo `ExpiryDate` tăng dần (hạn gần nhất xuất trước).
  - Ưu tiên 2: Sắp xếp theo `ReceivedAt` tăng dần (lô nhập sớm hơn xuất trước nếu cùng hạn).
- **FR-007**: Thuật toán FEFO BẮT BUỘC phải tự động bỏ qua các lô hàng của nguyên liệu tươi sống (`StorageType.FRESH`) đã quá hạn sử dụng (`ExpiryDate < Now`), tuyệt đối không xuất các lô này cho chế biến.
- **FR-008**: Khi số lượng cần xuất vượt quá lượng tồn của một lô, hệ thống PHẢI tự động khấu trừ hết lượng còn lại của lô đó về 0 và tiếp tục khấu trừ phần còn thiếu vào lô tiếp theo cho đến khi đủ số lượng hoặc hết các lô khả dụng.
- **FR-009**: Với mỗi lần khấu trừ số lượng từ một lô hàng, hệ thống PHẢI tạo một bản ghi `InventoryTransaction` loại `OUT` ghi nhận `BatchId`, số lượng đã trừ, đơn giá vốn `UnitCost` của lô tại thời điểm trừ, lý do xuất và mã tham chiếu `ReferenceId` (Mã đơn hàng POS hoặc mã chứng từ).
- **FR-010**: Nếu tổng tồn kho khả dụng không đủ đáp ứng số lượng yêu cầu xuất, hệ thống PHẢI trừ hết các lô khả dụng về 0, không làm âm kho, và trả về kết quả chi tiết gồm lượng đã trừ (`TotalDeducted`) và lượng còn thiếu (`ShortageQuantity`).
- **FR-011**: Hệ thống PHẢI cung cấp chức năng Kiểm kê & Điều chỉnh tồn kho (`AdjustStockAsync`):
  - Khi thiếu hụt kho (`Difference < 0`): Bắt buộc người dùng chỉ định danh sách từng lô hàng cụ thể và lượng giảm trừ tương ứng; hệ thống khấu trừ từng lô và sinh giao dịch `ADJUSTMENT_OUT`.
  - Khi dư thừa kho (`Difference > 0`): Tự động sinh lô hàng điều chỉnh `ADJ-yyyyMMddHHmmss` và sinh giao dịch `ADJUSTMENT_IN`.
  - Trường lý do (`Reason`) là bắt buộc cho mọi thao tác điều chỉnh kiểm kê.
- **FR-012**: Hệ thống PHẢI cung cấp API lấy danh sách cảnh báo tồn kho (`GetAlertsAsync`) phân cấp độ rõ ràng:
  - `EXPIRED_FRESH` (Mức `danger`): Lô đồ tươi sống quá hạn (chặn xuất chế biến).
  - `EXPIRING_TODAY` (Mức `warning` cao): Lô đồ tươi sống `FRESH` hết hạn trong vòng 24 giờ (được đẩy lên ưu tiên xuất FEFO số 1).
  - `NEAR_EXPIRY` (Mức `warning`): Lô sắp hết hạn trong 3 ngày tới.
  - `OUT_OF_STOCK` / `SHORTAGE` (Mức `warning`): Hết tồn kho hoặc tồn dưới mức an toàn `MinStock`.
- **FR-013**: Đối với các lô hàng đã quá hạn sử dụng, hệ thống PHẢI tự động loại khỏi luồng xuất kho FEFO và gắn cảnh báo `EXPIRED`, nhưng PHẢI giữ nguyên số lượng tồn của lô cho đến khi người dùng có thẩm quyền thực hiện thao tác tiêu hủy (`Discard`). Khi Discard, hệ thống cập nhật `RemainingQuantity = 0`, `IsActive = false` và sinh giao dịch `ADJUSTMENT_OUT` kèm lý do giải trình bắt buộc và lưu vết người thực hiện.
- **FR-014**: Hệ thống PHẢI cung cấp API tra cứu danh sách lô hàng phân trang (`GetBatchesAsync`) hỗ trợ lọc theo `IngredientId`, cờ chỉ lấy lô còn hàng (`OnlyAvailable`), và sắp xếp theo tiêu chí FEFO mặc định.
- **FR-015**: Hệ thống PHẢI cung cấp API tra cứu lịch sử giao dịch tồn kho (`GetTransactionsAsync`) của nguyên liệu với đầy đủ thông tin: Ngày giờ, Loại giao dịch, Số lượng, Mã lô, Đơn giá vốn `UnitCost`, Lý do, Mã tham chiếu và Người thực hiện.
- **FR-016**: Bảng dữ liệu `InventoryTransaction` BẮT BUỘC là bất biến (Read-only Audit Log), không cung cấp API cập nhật hoặc xóa dữ liệu giao dịch.
- **FR-017**: Toàn bộ nhãn, thông báo lỗi nghiệp vụ và mã lỗi liên quan đến tồn kho PHẢI được định nghĩa đầy đủ song ngữ Tiếng Việt và Tiếng Anh (`vi.json` và `en.json`) theo quy chuẩn i18n của dự án.
- **FR-018**: Các quyền hạn thao tác kho PHẢI được định nghĩa chi tiết trong `TooHungryPermissions.Inventories` (gồm `Default`, `Create`, `Adjust`, `Discard`). Các hành động nhạy cảm (`AdjustStock`, `Discard`) BẮT BUỘC chỉ cho phép vai trò Quản lý (`Manager`) và Quản trị viên (`Admin`) thực hiện.
- **FR-019**: Hệ thống PHẢI áp dụng cơ chế kiểm soát tương tranh lạc quan (Optimistic Concurrency) với thuộc tính `ConcurrencyStamp` trên `InventoryBatch`; khi phát sinh xung đột giữa nhiều giao dịch xuất kho đồng thời, hệ thống PHẢI tự động retry tối đa 3 lần để tính toán lại thứ tự trừ FEFO mà không gây lỗi giao dịch cho người dùng.

---

## Các Thực thể Chính (Key Entities)

### 1. `InventoryBatch` (Aggregate Root)
- Kế thừa `FullAuditedAggregateRoot<Guid>`.
- Quản lý một lô hàng nhập cụ thể của một nguyên liệu.
- Các thuộc tính chính:
  - `IngredientId` (Guid): Khóa ngoại liên kết tới nguyên liệu `Ingredient`.
  - `BatchCode` (string, max 100): Mã lô hàng (tem mác NCC hoặc hệ thống tự sinh).
  - `Quantity` (decimal): Số lượng nhập ban đầu (đã quy đổi ra đơn vị cơ sở `BaseUnit`).
  - `RemainingQuantity` (decimal): Số lượng còn lại khả dụng hiện tại (theo `BaseUnit`).
  - `PurchaseUnit` (string): Tên đơn vị đo lường lúc mua vào (ví dụ: Thùng, Két, Bao).
  - `ConversionFactor` (decimal): Tỷ lệ quy đổi (1 đơn vị mua = bao nhiêu đơn vị cơ sở).
  - `ReceivedAt` (DateTime): Thời điểm nhập kho.
  - `ExpiryDate` (DateTime): Hạn sử dụng của lô hàng (tiêu chí sắp xếp FEFO).
  - `SupplierId` (Guid?, tùy chọn): Mã nhà cung cấp cung ứng lô hàng.
  - `UnitCost` (decimal): Đơn giá vốn mua vào.
  - `IsActive` (bool): Trạng thái hoạt động của lô hàng.

### 2. `InventoryTransaction` (Entity)
- Kế thừa `CreationAuditedEntity<Guid>`.
- Ghi nhận nhật ký biến động kho bất biến cho mục đích kiểm toán.
- Các thuộc tính chính:
  - `IngredientId` (Guid): Nguyên liệu phát sinh biến động.
  - `BatchId` (Guid?, tùy chọn): Lô hàng liên quan trực tiếp đến giao dịch.
  - `TransactionType` (enum: `IN`, `OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`): Loại giao dịch.
  - `Quantity` (decimal): Số lượng biến động theo đơn vị cơ sở.
  - `UnitCost` (decimal): Đơn giá vốn của lô hàng tại thời điểm giao dịch.
  - `Reason` (string): Lý do phát sinh giao dịch.
  - `ReferenceId` (string?, tùy chọn): Mã chứng từ hoặc mã đơn hàng liên quan (`OrderId`, `PO-Number`).

### 3. `InventoryTransactionType` (Enum)
- `IN = 1`: Nhập kho từ nhà cung cấp / tạo lô mới.
- `OUT = 2`: Xuất kho tiêu hao theo công thức món ăn POS hoặc xuất bếp.
- `ADJUSTMENT_IN = 3`: Điều chỉnh tăng tồn kho khi kiểm kê thừa.
- `ADJUSTMENT_OUT = 4`: Điều chỉnh giảm tồn kho khi kiểm kê thiếu hụt hoặc hư hỏng.

---

## Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% các thao tác nhập kho theo đơn vị mua hàng được tự động quy đổi sang đơn vị cơ sở với độ chính xác tuyệt đối, không có sai số do làm tròn sớm.
- **SC-002**: 100% các yêu cầu xuất kho tự động được hệ thống trừ đúng theo thứ tự ưu tiên FEFO (hạn gần nhất xuất trước) và tự động bỏ qua 100% các lô đồ tươi sống (`FRESH`) đã hết hạn.
- **SC-003**: 100% các biến động tăng, giảm hoặc điều chỉnh kho đều sinh ra bản ghi `InventoryTransaction` tương ứng với đầy đủ dấu vết kiểm toán (Ai thực hiện, Khi nào, Lô nào, Lý do gì).
- **SC-004**: Thời gian phản hồi của API trừ kho FEFO và API lấy danh sách cảnh báo tồn kho đạt dưới 200ms trong điều kiện kho có hàng ngàn lô hàng hoạt động.
- **SC-005**: Thao tác kiểm kê điều chỉnh thiếu hụt ngăn chặn 100% trường hợp người dùng không chỉ định đích danh lô hàng chịu hao hụt.
- **SC-006**: Đạt 100% tỷ lệ bao phủ kiểm thử tự động (Unit Test & Integration Test) cho các kịch bản xuất FEFO, kiểm kê điều chỉnh, và cảnh báo hạn dùng.

---

## Các Giả định (Assumptions)

- **A1**: Entity `Ingredient` và bảng đơn vị đo lường `Unit` (RM-004, RM-005) đã được hoàn thiện và đóng vai trò là Master Data tham chiếu cho `IngredientId` và `BaseUnit`.
- **A2**: Cơ sở dữ liệu và Entity Framework Core được cấu hình kiểu dữ liệu `decimal(18, 4)` để lưu trữ số lượng tồn kho với 4 chữ số thập phân, đảm bảo độ chính xác cho cả các nguyên liệu có định lượng rất nhỏ (gam, ml, thìa cà phê).
- **A3**: Khi một lô hàng có `RemainingQuantity = 0`, lô đó được coi là đã dùng hết và không còn tham gia vào các vòng lặp quét xuất kho FEFO tiếp theo.
- **A4**: Việc tính toán giá vốn kế toán phức tạp (COGS, bình quân gia quyền theo thời gian thực) nằm ngoài phạm vi cốt lõi của RM-011 và sẽ được phân hệ báo cáo tài chính kế toán kế thừa sau.
- **A5**: Giao diện người dùng nâng cao (Modal xem chi tiết từng lô dạng Drawer, Redesign bộ lọc giao dịch) sẽ được triển khai chuyên sâu tại tính năng kế tiếp **RM-012 (Inventory UI Redesign)** dựa trên nền tảng API vững chắc của RM-011.
