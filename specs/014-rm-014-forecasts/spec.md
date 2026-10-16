# Đặc tả Tính năng (Feature Specification): Dự báo Nhu cầu Món ăn & Kế hoạch Nguyên liệu (Demand Forecasts & Ingredient Requirement Planning)

**Mã Tính năng (Feature ID)**: `RM-014`

**Nhánh Tính năng (Feature Branch)**: `014-rm-014-forecasts`

**Ngày cập nhật**: 2026-10-14

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-014: "Dự báo doanh thu, nguyên liệu cần mua dựa trên dữ liệu quá khứ. Nguồn: `src/Acme.TooHungry.Domain/Forecasts`. Thực thể/CRUD: Forecast — list, gen báo cáo. Backend: CHƯA CÓ — cần tạo API. Phụ thuộc: RM-010 (Orders/POS), RM-011 (Inventory Transactions), RM-016 (Payment/Doanh thu)."
- Thiết kế mô hình Domain & Visual Paradigm (`RMS-TH.vpp`, `ClassDiagram_Viewer.html` module "📈 Dự Báo & Thực Đơn Ngày"): Các thực thể `DemandForecast`, `DemandForecastItem`, `IngredientPlan`, `IngredientPlanItem`.
- Kế thừa dữ liệu danh mục món ăn (`Dish` - RM-006), định lượng công thức (`Recipe` & `RecipeIngredient` - RM-007), giá vốn nguyên liệu (`Ingredient.EstimatedPrice` - RM-005), tồn kho an toàn & lô hàng thực tế (`InventoryBatch` & `CurrentStock` - RM-011).

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 14-10-2026 (Phiên làm rõ Yêu cầu `/speckit.clarify` - 3 Quyết định Trọng yếu)
- **Q1: Thuật toán dự báo số lượng món ăn từ lịch sử bán hàng**: Hệ thống nên sử dụng thuật toán nào để tự động gợi ý số lượng món ăn dự báo từ lịch sử bán hàng?
  - **A1**: **Áp dụng thuật toán Trung bình động đơn giản (SMA - Simple Moving Average)**:
    - Cung cấp tùy chọn cửa sổ phân tích linh hoạt: 7 ngày, 14 ngày hoặc 30 ngày gần nhất (mặc định: 7 ngày qua).
    - Chỉ phân tích các đơn hàng đã thanh toán thành công (`Order.Status = Completed`) nằm trong cửa sổ thời gian đã chọn.
    - Công thức số lượng dự báo cơ sở hàng ngày cho từng món:
      $$\text{DailyForecastQuantity}(dish) = \frac{\sum \text{QuantitySold}(dish)}{\text{AnalysisDays}}$$
    - Đối với kỳ dự báo gồm $N$ ngày (`StartDate` đến `EndDate`):
      $$\text{ForecastQuantity}(dish) = \lceil \text{DailyForecastQuantity}(dish) \times N \rceil$$
      (Áp dụng hàm làm tròn trần `Math.Ceiling` để đảm bảo không bị thiếu hụt nguyên liệu trong giờ cao điểm).
    - Cho phép Quản lý / Bếp trưởng hoàn toàn chủ động chỉnh sửa, ghi đè số lượng dự báo (`ForecastQuantity`) hoặc thêm ghi chú `Note` cho từng món trước khi lưu bản ghi.
- **Q2: Cơ chế quản lý & lưu trữ Kế hoạch nguyên liệu (`IngredientPlan`)**: Kế hoạch nguyên liệu (`IngredientPlan`) bóc tách từ dự báo món ăn nên được quản lý và lưu trữ theo cơ chế nào?
  - **A2**: **Tự động sinh đồng thời và lưu trữ thực thể `IngredientPlan` & `IngredientPlanItem` trong cơ sở dữ liệu**:
    - Khi tạo/lưu `DemandForecast`, hệ thống tự động bóc tách định lượng nguyên liệu từ phiên bản công thức đang kích hoạt (`IsActive = true`) của từng món dự báo.
    - Tự động tạo và liên kết một bản ghi `IngredientPlan` tương ứng với `DemandForecast` (`DemandForecastId`).
    - Bảng `IngredientPlanItem` lưu trữ chi tiết: `IngredientId`, `RequiredQuantity` (tổng lượng nguyên liệu cần cho chế biến theo đơn vị cơ sở `BaseUnit`).
    - Quản lý vòng đời trạng thái của `IngredientPlan` thông qua enum `PlanStatus`:
      + `Draft` (Bản nháp): Được tạo tự động cùng `DemandForecast`, cho phép xem trước và điều chỉnh.
      + `Approved` (Đã duyệt): Quản lý/Bếp trưởng chính thức phê duyệt kế hoạch mua sắm và chuẩn bị kho.
      + `Completed` (Đã hoàn tất): Khi thủ kho đã hoàn thành nhập mua và giao nhận nguyên liệu cho bếp.
    - Giao diện người dùng hiển thị song song 2 tab: "Dự báo Món ăn" và "Kế hoạch Nguyên liệu & Mua hàng", hiển thị trực quan tồn kho khả dụng (`CurrentStock`), số lượng cần mua thêm (`SuggestedPurchaseQuantity = max(0, RequiredQuantity - CurrentStock)`) và chi phí dự toán.
- **Q3: Phương thức xuất báo cáo & in ấn Kế hoạch mua hàng**: Hệ thống cần hỗ trợ xuất báo cáo và in ấn Kế hoạch mua hàng nguyên liệu theo những phương thức nào?
  - **A3**: **Hỗ trợ đầy đủ cả 2 phương thức: Xuất file Excel (.xlsx) và In phiếu A4 chuẩn bị bếp (CSS Print)**:
    - **Xuất file Excel (`.xlsx`)**: Cung cấp nút `[Xuất Excel mua hàng]` tải về file bảng tính hoàn chỉnh gồm các cột: STT, Mã nguyên liệu, Tên nguyên liệu, Đơn vị tính (`BaseUnit`), Nhu cầu chế biến (`RequiredQuantity`), Tồn kho khả dụng hiện tại (`CurrentStock`), Số lượng gợi ý cần mua thêm (`SuggestedPurchaseQuantity`), Đơn giá ước tính (`EstimatedPrice`), Thành tiền dự toán (`EstimatedCost`). Thích hợp gửi file cho nhà cung cấp hoặc phòng kế toán/thu mua.
    - **In phiếu chuẩn bị bếp A4 (CSS Print)**: Cung cấp nút `[In phiếu chuẩn bị bếp]` mở hộp thoại in trình duyệt chuẩn A4, sử dụng stylesheet in ấn chuyên biệt (`@media print`): tự động ẩn toàn bộ header, thanh menu điều hướng và nút thao tác, tối ưu bảng dữ liệu chia cột rõ ràng để Bếp trưởng/Phụ bếp cầm kiểm đếm trực tiếp tại kho.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Dự báo Nhu cầu & Kế hoạch Nguyên liệu (RM-014)** là mắt xích chiến lược thuộc phân hệ Vận hành nâng cao (Operations, Wave 4). Tính năng này kết nối trực tiếp chuỗi vận hành bán hàng từ POS/Thanh toán (RM-010, RM-016) với công tác quản trị chuỗi cung ứng nguyên vật liệu nhà hàng (RM-005, RM-007, RM-011).

Trong vận hành nhà hàng thực tế, việc chuẩn bị nguyên vật liệu thiếu hụt sẽ dẫn đến việc "cháy hàng" (hết món khi khách gọi), làm giảm doanh thu và trải nghiệm khách hàng; ngược lại nếu nhập dư thừa nguyên liệu tươi sống (`StorageType.FRESH`) sẽ gây hỏng hóc, lãng phí và phát sinh chi phí hủy hàng lớn.

**RM-014 giải quyết bài toán này thông qua quy trình khép kín:**
1. **Phân tích lịch sử bán hàng thực tế**: Khai thác dữ liệu các đơn hàng đã thanh toán thành công (`Order.Status = Completed`) trong quá khứ để phân tích xu hướng tiêu thụ từng món ăn theo thuật toán SMA.
2. **Sinh Dự báo nhu cầu món ăn (Demand Forecast)**: Tự động tính toán số lượng dự kiến bán ra của từng món trong khoảng thời gian tương lai (`StartDate` đến `EndDate`), đồng thời cho phép Bếp trưởng / Quản lý nhà hàng chủ động điều chỉnh số lượng thủ công theo tình hình thực tế (thời tiết, sự kiện, ngày lễ).
3. **Bóc tách định lượng công thức món (Recipe Explosion)**: Tự động nhân số lượng món ăn dự báo với định lượng nguyên liệu tương ứng trong công thức chuẩn (`RecipeIngredient`) đã quy đổi về đơn vị cơ sở (`BaseUnit`).
4. **Đối soát tồn kho & Gợi ý mua hàng (Inventory Gap Analysis)**: So sánh tổng nhu cầu nguyên liệu với số lượng tồn kho khả dụng thực tế (`CurrentStock`), từ đó tính toán chính xác số lượng nguyên liệu cần nhập thêm (`SuggestedPurchaseQuantity = RequiredQuantity - CurrentStock`) kèm ước tính tổng chi phí mua sắm.
5. **Dự báo Doanh thu & Tỷ lệ Giá vốn (Projected Financials)**: Ước tính tổng doanh thu bán hàng dự kiến (dựa trên giá niêm yết món `Dish.Price`) và tỷ lệ chi phí nguyên vật liệu dự phóng (Projected Food Cost %).

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Dữ liệu Quá khứ (RM-010, RM-016): Order Completed         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Dự báo Nhu cầu Món ăn (DemandForecast & Items)           │
│    - Số lượng dự báo tự động theo lịch sử SMA (7/14/30 ngày)│
│    - Điều chỉnh thủ công bởi Quản lý/Bếp trưởng             │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Nhân với Recipe RM-007)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Kế hoạch Nhu cầu Nguyên liệu (IngredientPlan & Items)     │
│    - Lưu đồng thời trong DB, trạng thái Draft -> Approved   │
│    - Tổng nhu cầu nguyên liệu cần dùng (RequiredQuantity)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Đối chiếu Tồn khả dụng RM-011)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Phân tích Thiếu hụt & Gợi ý Mua hàng                     │
│    - Tồn kho khả dụng hiện tại (CurrentStock)               │
│    - Số lượng gợi ý nhập mua (SuggestedPurchaseQuantity)    │
│    - Ước tính chi phí mua hàng (dựa trên EstimatedPrice)     │
│    - Dự báo Doanh thu & Food Cost % dự kiến                 │
│    - Xuất file Excel (.xlsx) & In phiếu chuẩn bị bếp A4      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Tự động Sinh & Điều chỉnh Dự báo Nhu cầu Món ăn theo SMA (Priority: P1)

Là Bếp trưởng hoặc Quản lý nhà hàng, tôi muốn hệ thống tự động phân tích lịch sử bán hàng của các ngày trước đó (7, 14 hoặc 30 ngày) để sinh ra bảng dự báo số lượng món ăn cần chuẩn bị cho kỳ tới (ngày mai hoặc tuần tới), đồng thời cho phép tôi xem xét và sửa đổi số lượng dự báo theo nhận định kinh nghiệm thực tế, để nhà hàng có kế hoạch chế biến sát với nhu cầu khách hàng nhất.

**Lý do cho mức độ ưu tiên này**: Đây là điểm cốt lõi khởi đầu của toàn bộ module dự báo; nếu không có số lượng món ăn dự báo chính xác thì không thể tính toán được nhu cầu nguyên liệu hay doanh thu dự kiến.

**Kiểm thử Độc lập**: Chọn tạo mới dự báo cho ngày mai với chu kỳ phân tích 7 ngày qua. Hệ thống nạp danh sách các món ăn kèm số lượng bán bình quân/ngày. Người dùng chỉnh sửa món "Bò bít tết" từ 20 phần lên 30 phần do có tiệc đặt trước. Bấm lưu và kiểm tra bản ghi `DemandForecast` được lưu thành công với đúng danh sách các `DemandForecastItem`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** Quản lý đang ở màn hình tạo dự báo `/forecasts/create`, **Khi (When)** chọn khoảng thời gian dự báo (`StartDate` đến `EndDate`), chọn cửa sổ phân tích (ví dụ: 7 ngày) và bấm `[Tự động tính từ lịch sử]`, **Thì (Then)** hệ thống phân tích các đơn hàng đã thanh toán (`Status = Completed`) trong quá khứ và tự động điền danh sách món ăn kèm số lượng dự báo theo công thức SMA.
2. **Cho trước (Given)** danh sách món dự báo được sinh tự động, **Khi (When)** người dùng thay đổi số lượng `ForecastQuantity` hoặc ghi chú `Note` của từng món, **Thì (Then)** hệ thống cập nhật tức thì giá trị mới và cho phép thêm món mới hoặc loại bớt món không muốn dự báo.
3. **Cho trước (Given)** người dùng nhập số lượng dự báo món ăn là số âm (`ForecastQuantity < 0`), **Khi (When)** thực hiện lưu, **Thì (Then)** hệ thống hiển thị cảnh báo lỗi và ngăn chặn lưu dữ liệu không hợp lệ.
4. **Cho trước (Given)** người dùng bấm `[Lưu bản dự báo]`, **Khi (When)** dữ liệu hợp lệ, **Thì (Then)** hệ thống lưu `DemandForecast` cùng toàn bộ `DemandForecastItem` vào cơ sở dữ liệu và hiển thị thông báo thành công.

---

### User Story 2 - Tự động Tính toán Nhu cầu Nguyên liệu & Gợi ý Mua hàng (Priority: P1)

Là Thủ kho hoặc Quản lý thu mua, từ bản dự báo nhu cầu món ăn đã lập, tôi muốn hệ thống tự động bóc tách công thức định lượng (Recipe) của từng món để tính ra tổng số lượng từng nguyên liệu cần dùng, đồng thời tự động đối chiếu với số lượng tồn kho khả dụng hiện tại để đưa ra gợi ý số lượng cần mua thêm, ước tính tổng tiền mua nguyên liệu và lưu thành thực thể Kế hoạch nguyên liệu (`IngredientPlan`).

**Lý do cho mức độ ưu tiên này**: Tính toán nguyên liệu thủ công từ hàng chục món ăn với hàng trăm định lượng rất tốn thời gian và dễ nhầm lẫn; tự động hóa giúp thủ kho biết chính xác cần mua bao nhiêu nguyên liệu, tránh thừa thiếu.

**Kiểm thử Độc lập**: Tạo dự báo gồm 10 phần "Phở bò" (mỗi bát dùng 0.15 kg Thịt bò và 0.2 kg Bánh phở). Hiện tại tồn kho Thịt bò có 0.5 kg, Bánh phở có 2.5 kg. Kiểm tra hệ thống tạo `IngredientPlan` kèm các `IngredientPlanItem`: Nhu cầu Thịt bò là 1.5 kg, gợi ý mua 1.0 kg; Nhu cầu Bánh phở là 2.0 kg, gợi ý mua 0 kg (đã đủ tồn).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** một bản dự báo nhu cầu món ăn hợp lệ, **Khi (When)** chuyển sang tab "Kế hoạch nguyên liệu" (hoặc bấm `[Xem Kế hoạch Nguyên liệu]`), **Thì (Then)** hệ thống tự động tổng hợp tất cả nguyên liệu trong công thức của các món dự báo theo công thức: `Tổng nhu cầu = sum(Số lượng món * Định lượng nguyên liệu trong Recipe)`.
2. **Cho trước (Given)** danh sách nguyên liệu đã tổng hợp, **Khi (When)** đối chiếu tồn kho khả dụng hiện tại (`CurrentStock`), **Thì (Then)** hệ thống hiển thị rõ ràng:
   - Tên nguyên liệu và Đơn vị tính cơ sở (`BaseUnit`).
   - Tổng nhu cầu cần cho chế biến (`RequiredQuantity`).
   - Tồn kho khả dụng thực tế (`CurrentStock`).
   - Số lượng thiếu hụt / Gợi ý cần mua (`SuggestedPurchaseQuantity = max(0, RequiredQuantity - CurrentStock)`).
3. **Cho trước (Given)** nguyên liệu có cấu hình đơn giá ước tính (`EstimatedPrice`), **Khi (When)** hệ thống hiển thị gợi ý mua hàng, **Thì (Then)** tự động tính toán thành tiền dự kiến mua (`EstimatedCost = SuggestedPurchaseQuantity * EstimatedPrice`) và tổng chi phí mua sắm toàn bộ nguyên vật liệu.
4. **Cho trước (Given)** một món ăn trong danh sách dự báo chưa được cài đặt công thức định lượng (`Recipe`), **Khi (When)** tính toán kế hoạch nguyên liệu, **Thì (Then)** hệ thống hiển thị huy hiệu cảnh báo (Warning Badge) "Chưa có công thức" tại món đó để người dùng nhận biết dữ liệu nguyên liệu chưa bao gồm món này.
5. **Cho trước (Given)** kế hoạch nguyên liệu đang ở trạng thái `Draft`, **Khi (When)** Quản lý bấm nút `[Phê duyệt kế hoạch]`, **Thì (Then)** trạng thái chuyển sang `Approved` và khóa chỉnh sửa để bộ phận kho tiến hành mua sắm.

---

### User Story 3 - Báo cáo Phân tích Doanh thu Dự kiến & Food Cost % (Priority: P2)

Là Giám đốc nhà hàng hoặc Quản lý vận hành, tôi muốn xem các chỉ số tài chính dự phóng của kỳ dự báo, bao gồm: Tổng doanh thu dự kiến, Tổng chi phí nguyên vật liệu lý thuyết và Tỷ lệ Food Cost % dự kiến, để đánh giá hiệu quả kinh doanh và kiểm soát ngân sách trước khi bước vào kỳ kinh doanh mới.

**Lý do cho mức độ ưu tiên này**: Cung cấp bức tranh toàn cảnh về tài chính, giúp quản trị viên cân đối giữa mục tiêu bán hàng và ngân sách chi phí nguyên vật liệu.

**Kiểm thử Độc lập**: Bản dự báo có tổng giá trị bán món là 20.000.000 đ, tổng chi phí nguyên vật liệu lý thuyết tiêu hao là 6.500.000 đ. Kiểm tra màn hình tóm tắt hiển thị: Doanh thu dự kiến 20.000.000 đ, Chi phí nguyên liệu 6.500.000 đ, Food Cost % = 32.5%.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** bản dự báo đã có danh sách món và số lượng, **Khi (When)** người dùng xem khối Tổng quan Tài chính (Financial Summary Cards), **Thì (Then)** hệ thống hiển thị các thẻ chỉ số:
   - **Doanh thu dự kiến (Projected Revenue)**: `sum(ForecastQuantity * Dish.Price)`.
   - **Chi phí nguyên liệu dự kiến (Projected Ingredient Cost)**: Tổng chi phí nguyên liệu lý thuyết theo công thức món.
   - **Tỷ lệ Food Cost %**: `(Chi phí nguyên liệu dự kiến / Doanh thu dự kiến) * 100%`.
   - **Tổng tiền cần nhập kho (Projected Purchase Budget)**: Tổng tiền của lượng nguyên liệu gợi ý cần mua thêm.
2. **Cho trước (Given)** doanh thu dự kiến bằng 0, **Khi (When)** hiển thị tỷ lệ Food Cost %, **Thì (Then)** hệ thống hiển thị `0%` thay vì lỗi chia cho 0 (`NaN` hoặc `Infinity`).

---

### User Story 4 - Tra cứu, Lọc & Quản lý Danh sách Bản dự báo (Priority: P2)

Là Quản lý nhà hàng, tôi muốn xem danh sách các bản dự báo đã lập trong quá khứ và hiện tại, hỗ trợ phân trang, lọc theo khoảng thời gian và xem chi tiết/xóa bản dự báo khi cần, để theo dõi lịch sử kế hoạch và đối soát khi hoàn thành kỳ kinh doanh.

**Lý do cho mức độ ưu tiên này**: Đảm bảo quản lý vòng đời dữ liệu dự báo ngăn nắp, dễ dàng tra cứu lại các kế hoạch tuần/tháng trước.

**Kiểm thử Độc lập**: Vào trang `/forecasts`. Danh sách hiển thị bảng phân trang các bản dự báo với các cột: Ngày lập, Từ ngày - Đến ngày, Số lượng món, Tổng doanh thu dự kiến, Trạng thái Kế hoạch nguyên liệu, Ghi chú, Nút Thao tác. Lọc dự báo theo tháng hiện tại và kiểm tra kết quả lọc chuẩn xác.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** danh sách các bản dự báo trong cơ sở dữ liệu, **Khi (When)** truy cập trang `/forecasts`, **Thì (Then)** hệ thống hiển thị bảng `SharedTable` chuẩn với danh sách phân trang (mặc định 10 dòng/trang), sắp xếp theo ngày lập mới nhất lên đầu.
2. **Cho trước (Given)** danh sách bản dự báo, **Khi (When)** người dùng chọn bộ lọc từ ngày - đến ngày hoặc tìm kiếm từ khóa, **Thì (Then)** danh sách tự động cập nhật đúng điều kiện lọc.
3. **Cho trước (Given)** một bản dự báo cụ thể, **Khi (When)** bấm nút `[Xóa]` và xác nhận hộp thoại cảnh báo, **Thì (Then)** hệ thống thực hiện Soft Delete bản dự báo và các mục chi tiết liên quan, sau đó làm mới danh sách.

---

### User Story 5 - Xuất Kế hoạch Mua hàng ra Excel & In Phiếu Chuẩn bị Bếp (Priority: P3)

Là Nhân viên thu mua hoặc Bếp trưởng, sau khi kế hoạch nguyên liệu đã được duyệt, tôi muốn xuất danh sách gợi ý nguyên liệu cần mua ra file Excel (.xlsx) để gửi cho nhà cung cấp hoặc in phiếu chuẩn bị nguyên vật liệu ra giấy A4 cho phụ bếp chuẩn bị sơ chế.

**Lý do cho mức độ ưu tiên này**: Kết nối trực tiếp giữa phần mềm và tác nghiệp thực tế ngoài đời thực (đi chợ, nhận hàng, sơ chế).

**Kiểm thử Độc lập**: Bấm nút `[Xuất Excel mua hàng]`. Trình duyệt tải về file `KeHoachMuaHang_20261015.xlsx` chứa đầy đủ: STT, Tên nguyên liệu, Đơn vị tính, Nhu cầu dự báo, Tồn khả dụng, Số lượng cần mua, Đơn giá ước tính, Thành tiền. Bấm `[In phiếu chuẩn bị bếp]`, trang hiển thị chế độ in ấn A4 không có thanh menu hay footer.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** kế hoạch nguyên liệu của một bản dự báo, **Khi (When)** người dùng bấm `[Xuất Excel mua hàng]`, **Thì (Then)** hệ thống xuất file bảng tính `.xlsx` chứa đầy đủ các cột dữ liệu rõ ràng, định dạng số và tiền tệ chuẩn Việt Nam.
2. **Cho trước (Given)** người dùng bấm `[In phiếu chuẩn bị bếp]`, **Khi (When)** kích hoạt lệnh in, **Thì (Then)** hệ thống mở cửa sổ in ấn với giao diện CSS Print tối ưu (loại bỏ thanh menu, căn chỉnh vừa khổ giấy A4).

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **Lịch sử bán hàng chưa có dữ liệu hoặc không đủ ngày**: Khi hệ thống mới triển khai hoặc món ăn mới tạo chưa có đơn hàng nào, thuật toán SMA sẽ gán số lượng dự báo bằng 0 và cho phép người dùng nhập tay toàn bộ số lượng mong muốn mà không gây lỗi crash hệ thống.
- **Món ăn bị vô hiệu hóa hoặc đã xóa (`IsDeleted = true`)**: Tự động loại bỏ khỏi danh sách gợi ý dự báo mới. Nếu bản dự báo cũ đã chứa món bị xóa sau đó, khi xem lại vẫn hiển thị tên món cũ trong lịch sử mà không gây lỗi tham chiếu null.
- **Món ăn có nhiều phiên bản công thức (`Recipe.Version`)**: Khi tính toán nguyên liệu, hệ thống luôn chọn phiên bản công thức đang kích hoạt (`IsActive = true`) mới nhất của món ăn đó.
- **Khoảng thời gian dự báo không hợp lệ**: Người dùng chọn `StartDate > EndDate` hoặc khoảng thời gian vượt quá 90 ngày; hệ thống validate chặn lại ngay trên giao diện form và hiển thị thông báo lỗi rõ ràng.
- **Tồn kho khả dụng bị âm hoặc bằng 0**: Khi tồn kho bằng 0 hoặc âm, `SuggestedPurchaseQuantity` tự động lấy bằng đúng `RequiredQuantity` (không cộng thêm phần âm kho gây sai lệch số lượng cần mua thực tế).
- **Tương tranh khi nhiều người cùng tạo/sửa dự báo**: Áp dụng cơ chế kiểm soát phiên bản của ABP để thông báo nếu bản ghi đã bị người khác thay đổi trước đó.

---

## 3. Yêu cầu (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cho phép người dùng tạo, xem chi tiết, cập nhật và xóa các bản dự báo nhu cầu (`DemandForecast`).
- **FR-002**: Hệ thống PHẢI hỗ trợ tính năng tự động gợi ý số lượng món ăn dự báo dựa trên dữ liệu đơn hàng đã hoàn tất thanh toán (`Order.Status = Completed`) trong quá khứ thông qua thuật toán Trung bình động đơn giản (SMA) với tùy chọn cửa sổ phân tích 7, 14 hoặc 30 ngày gần nhất.
- **FR-003**: Hệ thống PHẢI cho phép người dùng tùy chỉnh, chỉnh sửa thủ công số lượng dự kiến (`ForecastQuantity`) của từng món ăn trong bản dự báo.
- **FR-004**: Hệ thống PHẢI tự động tính toán tổng nhu cầu nguyên liệu cần thiết (`RequiredQuantity`) bằng cách nhân số lượng món ăn dự báo với định lượng nguyên liệu trong công thức kích hoạt (`Recipe`) tương ứng.
- **FR-005**: Hệ thống PHẢI tự động đối chiếu nhu cầu nguyên liệu với số lượng tồn kho khả dụng hiện tại (`CurrentStock`) để tính toán số lượng gợi ý cần nhập thêm (`SuggestedPurchaseQuantity = max(0, RequiredQuantity - CurrentStock)`).
- **FR-006**: Hệ thống PHẢI tự động tạo và lưu trữ thực thể Kế hoạch nguyên liệu (`IngredientPlan` & `IngredientPlanItem`) trong cơ sở dữ liệu gắn kết với bản dự báo (`DemandForecastId`), đồng thời quản lý vòng đời trạng thái (`Draft` -> `Approved` -> `Completed`).
- **FR-007**: Hệ thống PHẢI tính toán và hiển thị các chỉ số tài chính dự phóng: Doanh thu dự kiến, Chi phí nguyên vật liệu dự kiến, Tỷ lệ Food Cost % và Ngân sách mua hàng dự kiến.
- **FR-008**: Hệ thống PHẢI hỗ trợ xuất danh sách mua hàng ra file Excel (`.xlsx`) và in ấn phiếu chuẩn bị nguyên vật liệu bếp khổ A4 thông qua CSS Print chuyên biệt.
- **FR-009**: Hệ thống PHẢI cung cấp giao diện quản lý danh sách bản dự báo có phân trang, sắp xếp và lọc theo khoảng thời gian (`StartDate`, `EndDate`).
- **FR-010**: Hệ thống PHẢI hỗ trợ cảnh báo trực quan cho các món ăn trong bản dự báo chưa có công thức định lượng (`Recipe`) để nhắc nhở người dùng cấu hình Master Data.
- **FR-011**: Hệ thống PHẢI phân quyền truy cập chi tiết: Chỉ tài khoản có quyền `TooHungryPermissions.Forecasts.*` (Quản lý, Bếp trưởng) mới được phép tạo, sửa và quản lý dự báo.
- **FR-012**: Toàn bộ giao diện người dùng PHẢI áp dụng ngôn ngữ thiết kế Cam & Trắng đặc trưng của Acme.TooHungry (theo Hiến pháp VI).
- **FR-013**: Toàn bộ nhãn, thông báo và chuỗi giao diện PHẢI hỗ trợ song ngữ Tiếng Việt & Tiếng Anh lưu trong `vi.json` và `en.json` (theo Hiến pháp VII).

---

### Các Thực thể Chính (Key Entities)

- **`DemandForecast` (Aggregate Root)**:
  - Đại diện cho một phiên/bản dự báo nhu cầu bán hàng của nhà hàng cho một kỳ nhất định.
  - Các thuộc tính chính: `Id` (Guid), `ForecastDate` (DateTime - ngày lập), `StartDate` (DateTime - bắt đầu kỳ dự báo), `EndDate` (DateTime - kết thúc kỳ dự báo), `Note` (string - ghi chú), `Items` (ICollection<DemandForecastItem>). Kế thừa `FullAuditedAggregateRoot<Guid>`.
- **`DemandForecastItem` (Entity)**:
  - Đại diện cho số lượng dự báo của một món ăn cụ thể trong bản dự báo.
  - Các thuộc tính chính: `Id` (Guid), `DemandForecastId` (Guid - FK trỏ về DemandForecast), `DishId` (Guid - FK trỏ về Dish), `ForecastQuantity` (int - số lượng món dự báo), `Note` (string - ghi chú điều chỉnh). Kế thừa `FullAuditedEntity<Guid>`.
- **`IngredientPlan` (Aggregate Root / Entity liên kết)**:
  - Đại diện cho kế hoạch nhu cầu nguyên vật liệu sinh ra từ bản dự báo nhu cầu món ăn.
  - Các thuộc tính chính: `Id` (Guid), `DemandForecastId` (Guid - FK trỏ về DemandForecast), `PlanDate` (DateTime - ngày lập kế hoạch), `Status` (PlanStatus enum: `Draft = 0`, `Approved = 1`, `Completed = 2`), `Note` (string). Kế thừa `FullAuditedAggregateRoot<Guid>`.
- **`IngredientPlanItem` (Entity)**:
  - Đại diện cho từng dòng nguyên liệu chi tiết trong kế hoạch.
  - Các thuộc tính chính: `Id` (Guid), `IngredientPlanId` (Guid - FK trỏ về IngredientPlan), `IngredientId` (Guid - FK trỏ về Ingredient), `RequiredQuantity` (decimal(18,4) - tổng lượng cần cho chế biến theo BaseUnit), `Note` (string). Kế thừa `FullAuditedEntity<Guid>`.

---

## 4. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: Thời gian hệ thống tự động tổng hợp lịch sử bán hàng và sinh đề xuất dự báo cho toàn bộ danh mục món ăn (dưới 500 món) không vượt quá 2 giây.
- **SC-002**: Thời gian bóc tách công thức và tính toán nhu cầu nguyên liệu cho bản dự báo hoàn thành tức thì dưới 1 giây.
- **SC-003**: 100% các món ăn có công thức hợp lệ đều được tính toán bóc tách nguyên liệu chuẩn xác với sai số số học bằng 0 (độ chính xác 4 chữ số thập phân).
- **SC-004**: Người dùng có thể hoàn thành việc lập một bản kế hoạch dự báo tuần và nhận được bảng kê mua hàng trong thời gian dưới 3 phút (thao tác nhanh gấp 10 lần so với tính toán bảng tính thủ công).
- **SC-005**: 100% các chuỗi văn bản trên giao diện đều có mặt đồng bộ trong hai tệp `vi.json` và `en.json`.
- **SC-006**: Đạt 100% độ phủ kiểm thử tự động (Unit/Integration Tests) cho các nghiệp vụ tính toán dự báo, bóc tách công thức và phân tích thiếu hụt tồn kho.

---

## 5. Các Giả định & Phụ thuộc (Assumptions & Dependencies)

- **Phụ thuộc vào RM-005 (Ingredients)**: Đơn vị cơ sở `BaseUnit` và đơn giá ước tính `EstimatedPrice` của nguyên liệu phải được thiết lập để tính toán ngân sách mua sắm.
- **Phụ thuộc vào RM-006 (Dishes)**: Món ăn phải có trạng thái hoạt động và giá niêm yết `Price` để tính toán doanh thu dự kiến.
- **Phụ thuộc vào RM-007 (Recipes)**: Món ăn cần có công thức đang hoạt động (`IsActive = true`) để hệ thống có thể bóc tách thành phần nguyên liệu. Món chưa có Recipe sẽ được hiển thị cảnh báo để bổ sung.
- **Phụ thuộc vào RM-010 & RM-016 (Orders & Completed Payments)**: Chỉ các đơn hàng đã thanh toán thành công mới được đưa vào tập dữ liệu phân tích lịch sử tiêu thụ.
- **Phụ thuộc vào RM-011 (Inventory Transactions & Batches)**: Tồn kho khả dụng thực tế (`CurrentStock`) được lấy từ tổng số lượng tồn của các lô hàng còn hạn sử dụng hợp lệ.
- **Quy tắc thời gian**: Mặc định một kỳ dự báo tiêu chuẩn là 1 ngày (dự báo ngày mai) hoặc 7 ngày (dự báo tuần tới).
