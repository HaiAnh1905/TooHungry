# Nghiên cứu Kỹ thuật & Thiết kế (Research): RM-012 Tái thiết kế Giao diện Quản lý Tồn kho & Lô hàng

**Mã Tính năng**: `RM-012`  
**Ngày cập nhật**: 2026-10-09  
**Trạng thái**: Hoàn tất (Consolidated)  

---

## 1. Phân tích Hiện trạng Mã nguồn & Giao diện (Current UI Analysis)

Từ phân tích trực tiếp mã nguồn trong thư mục `angular/src/app/inventory/`:

1. **Cấu trúc Trang Hiện tại**:
   - Component gốc điều hướng: `InventoryComponent` (`inventory.component.ts`, `inventory.component.html`, `inventory.component.scss`) được định tuyến trực tiếp tại `/inventory`.
   - Trang hiện có 2 tab: `ingredients` và `batches`.
   - Cụm nút Header thay đổi tùy theo tab (nếu tab ingredients thì hiện `+ AddIngredient`, nếu tab batches thì hiện `+ AddBatch`), gây gián đoạn trải nghiệm người dùng khi muốn nhập kho từ bất kỳ tab nào.

2. **Thiếu Thẻ Chỉ số KPI & Banner Cảnh báo Tồn kho**:
   - Backend RM-011 đã cung cấp API `GET /api/app/inventory/alerts` trả về danh sách các cảnh báo khẩn cấp (hàng tươi sống `FRESH` quá hạn, hàng sắp hết hạn trong 24h, tồn kho dưới định mức).
   - Tuy nhiên trên giao diện hiện tại chưa có Banner Cảnh báo hiển thị thông tin này; người dùng không biết lô nào bị quá hạn trừ khi cuộn tìm thủ công trong tab lô hàng.
   - Chưa có thẻ tóm tắt KPI ở đầu trang để thủ kho nắm nhanh tổng quan (Tổng số nguyên liệu, Lô an toàn, Cảnh báo thiếu hụt, Lô quá hạn khẩn cấp).

3. **Thiếu Khả năng Tra cứu Lô hàng theo Nguyên liệu (1-Click FEFO Modal)**:
   - Tab 1 hiện tại chỉ hiển thị tổng số tồn của nguyên liệu. Khi thủ kho muốn kiểm tra xem số lượng đó gồm những lô nào, hạn sử dụng ra sao, đơn giá vốn bao nhiêu thì buộc phải sang Tab 2 gõ tìm kiếm nguyên liệu đó.
   - Cần bổ sung Modal xem chi tiết các lô hàng của riêng nguyên liệu đó theo thứ tự FEFO (`IngredientBatchesModalComponent`).

4. **Thiếu Tab Lịch sử Giao dịch (Transaction History)**:
   - Backend RM-011 đã cung cấp API `GET /api/app/inventory/transactions/{ingredientId}` ghi nhận các giao dịch `IN`, `OUT`, `RECIPE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, và `DISCARD`.
   - Phân hệ Angular `InventoryService` hiện chưa đồng bộ đúng đường dẫn URL (gọi `/api/app/inventory/transactions` thay vì `/api/app/inventory/transactions/${ingredientId}`) và chưa có giao diện Tab 3 để hiển thị lịch sử biến động kho.

5. **Lỗi Đa ngôn ngữ (i18n) & Vi phạm Hiến pháp Cam & Trắng**:
   - Một số nhãn bảng trong `inventory.component.html` bị hardcode tiếng Việt: `<th>NGUYÊN LIỆU</th>`, `<th>VÒNG ĐỜI BẢO QUẢN</th>`.
   - Chuỗi phân trang `::RowsPerPage` bị lỗi định dạng khi hiển thị option selector.
   - Cần hoàn thiện 100% từ khóa bản địa hóa vào hai tệp `vi.json` và `en.json`.

---

## 2. Các Quyết định Thiết kế & Kiến trúc (Architectural & Design Decisions)

### Quyết định 1: Thống nhất Cụm Header Trang & 4 Thẻ Chỉ số KPI
- **Lựa chọn**: Duy trì Header 1 cấp với tiêu đề và phụ đề rõ ràng; cụm nút hành động góc phải luôn cố định:
  - Nút phụ: `[Làm mới]` (`btn-outline-orange`) kèm hiệu ứng xoay spinner khi đang tải dữ liệu.
  - Nút phụ: `[+ Thiết lập tồn kho]` (Mở modal thêm/sửa danh mục nguyên liệu `app-ingredient-modal`).
  - Nút chính (Primary CTA): `[+ Nhập kho]` (Màu cam thương hiệu `#EA580C`, mở modal tạo phiếu nhập kho mới `isNewBatchModalOpen`).
- **4 Thẻ KPI Tồn kho (KPI Summary Cards)**: Đặt ngay bên dưới Header:
  1. *Tổng nguyên liệu*: Tổng số dòng nguyên liệu đang quản lý.
  2. *Tồn kho an toàn*: Số nguyên liệu có tồn kho $\ge$ định mức tối thiểu.
  3. *Cảnh báo thiếu hụt*: Số nguyên liệu có tồn kho $<$ định mức hoặc hết hàng.
  4. *Lô quá hạn khẩn cấp*: Số lô hàng đã quá hạn sử dụng cần xử lý tiêu hủy ngay.
- **Lý do**: Cung cấp bức tranh toàn cảnh về tình trạng kho ngay khi vừa vào trang mà không cần phải duyệt từng dòng dữ liệu.

### Quyết định 2: Banner Cảnh báo Tồn kho Thông minh (Smart Alert Banner)
- **Lựa chọn**: Banner thu gọn/mở rộng tiêu thụ trực tiếp từ `inventoryService.getAlerts()`:
  - Mặc định: Hiển thị thanh banner nổi bật tóm tắt tổng số cảnh báo cùng cảnh báo nguy hiểm nhất (Ưu tiên: Lô hàng tươi sống `FRESH` quá hạn màu đỏ `#EF4444` kèm nút `[Xuất hủy ngay]`).
  - Nút `[Xem chi tiết]` (`View All`): Cho phép mở rộng danh sách để xem tất cả các cảnh báo khác (sắp hết hạn trong 24h, tồn kho chạm đáy).
  - Nút `[Đóng tạm thời]` (`Dismiss`): Ẩn banner trong phiên làm việc hiện tại để không che khuất bảng dữ liệu.
- **Lý do**: Tuân thủ kết quả làm rõ Q3 từ người dùng; vừa bảo đảm tính khẩn cấp của an toàn thực phẩm vừa không gây khó chịu cho trải nghiệm người dùng.

### Quyết định 3: Centered Modal (size 'xl') Tra cứu Chi tiết Lô hàng Nguyên liệu
- **Lựa chọn**: Tạo component con độc lập `IngredientBatchesModalComponent` (`ingredient-batches-modal/`):
  - Kích thước: `abp-modal [options]="{ size: 'xl', centered: true }"`.
  - Dữ liệu: Gọi API `inventoryService.getBatches(ingredientId)` với sắp xếp FEFO (`ExpiryDate asc, ReceivedAt asc`).
  - Bảng hiển thị: Mã lô, Số lượng ban đầu, Số lượng còn lại, Đơn vị, Ngày nhập, Hạn sử dụng, Đơn giá vốn (`UnitCost`), Badge trạng thái hạn dùng (`app-expiration-badge`), và nút Thao tác Xuất hủy nếu lô quá hạn.
  - Khi kho trống: Hiển thị Empty state kèm nút gợi ý `[+ Nhập kho nguyên liệu này]`.
- **Lý do**: Tuân thủ kết quả làm rõ Q1; phương án Modal trung tâm 'xl' tạo không gian rộng rãi để hiển thị đầy đủ thông số lô hàng mà không làm vỡ bố cục trang.

### Quyết định 4: Modal Xác nhận Xuất hủy Lô hàng (`DiscardBatchModalComponent`)
- **Lựa chọn**: Tạo component con độc lập `DiscardBatchModalComponent` (`discard-batch-modal/`):
  - Giao diện: Centered modal cỡ vừa (`size: 'md'`), hiển thị thông tin lô cần hủy (Mã lô, Nguyên liệu, Số lượng hủy).
  - Dropdown lý do mẫu chuẩn (`CustomSelectComponent`):
    - `EXPIRED`: "Quá hạn sử dụng"
    - `DAMAGED`: "Hư hỏng / Biến chất trong quá trình bảo quản"
    - `CONTAMINATED`: "Rách bao bì / Nhiễm bẩn / Không đạt vệ sinh"
  - Textarea ghi chú chi tiết: Cho phép người dùng nhập lý do cụ thể phục vụ kiểm toán nội bộ.
  - Gọi API: `inventoryService.discardBatch(batchId, { reason })` $\rightarrow$ Endpoint backend `POST /api/app/inventory/batches/{id}/discard`.
- **Lý do**: Tuân thủ kết quả làm rõ Q4; bảo đảm dữ liệu kiểm toán hợp lệ và ngăn chặn hành vi xuất hủy nhầm lẫn.

### Quyết định 5: Tab 3 — Lịch sử Giao dịch Tự động Tải & Lối tắt Chuyển tab Nhanh
- **Lựa chọn**:
  - Khi người dùng bấm vào Tab 3: Tự động chọn nguyên liệu đầu tiên trong danh sách và gọi ngay `getTransactions(ingredientId)`.
  - Trên thanh công cụ Tab 3: Bố trí Dropdown tìm kiếm nguyên liệu chuẩn `CustomSelectComponent` (searchable: true) để chuyển đổi nhanh nguyên liệu khác.
  - Trên Tab 1: Bổ sung nút lối tắt `[Lịch sử biến động]` (`fa-clock-rotate-left`) trên từng dòng nguyên liệu; bấm vào sẽ kích hoạt chuyển ngay sang Tab 3 với nguyên liệu đó được chọn sẵn.
  - Sửa lỗi proxy: Cập nhật hàm `getTransactions(ingredientId)` trong `angular/src/app/proxy/inventories/inventory.service.ts` để gọi đúng URL `/api/app/inventory/transactions/${ingredientId}`.
- **Lý do**: Tuân thủ kết quả làm rõ Q2 & Q5; giải quyết triệt để lỗi không tương thích API giữa frontend và backend, đồng thời mang lại trải nghiệm tra cứu tức thì cho kế toán kho.

### Quyết định 6: Chuẩn hóa Nhận diện Cam & Trắng và Đa ngôn ngữ (i18n)
- **Màu sắc & Thẩm mỹ**:
  - Màu nhấn chính: Cam tươi `#EA580C` và `#F97316`.
  - Nền active của Tab và thẻ: Tông màu ấm nhẹ `#FFF3E8` với chữ cam đậm `#C85A17`.
  - Thẻ bảng và card: Bo góc tròn 12px - 16px, đổ bóng nhẹ `0 4px 20px rgba(0, 0, 0, 0.05)`, viền mềm `#E5E7EB`.
- **Quốc tế hóa (i18n)**:
  - Cập nhật đồng thời vào hai tệp từ điển `vi.json` và `en.json`.
  - Xóa bỏ 100% text tiếng Việt hardcode và mã thô `::`.

---

## 3. Rủi ro & Giải pháp Dự phòng (Risks & Mitigations)

| Rủi ro Kỹ thuật | Mức độ | Giải pháp Dự phòng |
| :--- | :---: | :--- |
| API `getTransactions` trả về mảng rỗng nếu nguyên liệu chưa có giao dịch | Thấp | Hiển thị Empty state thân thiện: "Chưa ghi nhận biến động giao dịch nào cho nguyên liệu này". |
| Số lượng cảnh báo alerts quá nhiều làm che mất màn hình | Thấp | Banner mặc định ở trạng thái thu gọn chỉ hiển thị 1 cảnh báo khẩn cấp nhất kèm nút mở rộng khi cần. |
| Nhiều modal mở đè nhau khi xuất hủy từ modal chi tiết lô | Thấp | Đóng tạm thời hoặc mở modal xuất hủy độc lập với z-index chuẩn của ABP modal stack. |
| Người dùng chuyển tab liên tục gây race condition gọi API | Thấp | Sử dụng cờ `isLoading` hoặc `takeUntilDestroyed` để hủy các request cũ khi chuyển đổi nhanh. |
