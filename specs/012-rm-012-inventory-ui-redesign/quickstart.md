# Hướng dẫn Khởi động Nhanh & Kiểm thử Xác thực (Quickstart & Verification Guide): RM-012

**Mã Tính năng**: `RM-012`  
**Ngày cập nhật**: 2026-10-09  
**Trạng thái**: Hoàn thiện (Phase 1 Artifact)  

---

## 1. Yêu cầu Trước khi Chạy (Prerequisites)

- Backend .NET API đang chạy: `dotnet run` tại thư mục `src/Acme.TooHungry.HttpApi.Host`
- Frontend Angular đang chạy: `npm start` tại thư mục `angular`
- Truy cập trình duyệt tại địa chỉ: `http://localhost:4200/inventory`

---

## 2. Kịch bản Kiểm thử Tự động & Thủ công (Verification Scenarios)

### Kịch bản 1: Header Một Cấp & 4 Thẻ Chỉ số KPI Tồn kho
1. Mở trang `http://localhost:4200/inventory`.
2. **Kỳ vọng**:
   - Header hiển thị một tiêu đề trang duy nhất "Quản lý Tồn kho" kèm phụ đề mô tả.
   - Cụm nút hành động góc phải gồm: `[Làm mới]` (outline cam), `[+ Thiết lập tồn kho]` (outline cam), và `[+ Nhập kho]` (nút cam thương hiệu `#EA580C`).
   - 4 Thẻ KPI Tồn kho hiển thị chính xác số liệu:
     - Thẻ 1: *Tổng số nguyên liệu*.
     - Thẻ 2: *Tồn kho an toàn* (xanh lá).
     - Thẻ 3: *Cảnh báo thiếu hụt* (hổ phách cam).
     - Thẻ 4: *Lô quá hạn khẩn cấp* (đỏ cam).

---

### Kịch bản 2: Banner Cảnh báo Tồn kho Thông minh & Nút Xuất hủy Nhanh
1. Nếu trong kho có lô hàng tươi sống `FRESH` đã quá hạn sử dụng:
2. **Kỳ vọng**:
   - Thanh Banner Cảnh báo màu đỏ nổi bật xuất hiện ngay dưới các thẻ KPI, tóm tắt: "Lô hàng tươi sống [Mã lô] ([Tên nguyên liệu]) đã quá hạn... Cần hủy bỏ ngay."
   - Có nút `[Xuất hủy ngay]` mở thẳng modal xác nhận xuất hủy cho lô đó.
   - Có nút `[Xem chi tiết]` mở rộng danh sách tất cả các cảnh báo khác (sắp hết hạn trong 24h, thiếu tồn kho).
   - Có nút `[Đóng]` để ẩn banner tạm thời.

---

### Kịch bản 3: Tra cứu Chi tiết Lô hàng Nguyên liệu (Centered Modal 'xl')
1. Tại Tab 1 "Tổng quan Tồn kho", tìm một dòng nguyên liệu (ví dụ: "Cá Hồi Na Uy").
2. Bấm nút biểu tượng các khối lô `[Xem các lô]` (`fa-boxes-stacked`) ở cột Thao tác.
3. **Kỳ vọng**:
   - Modal trung tâm kích thước lớn (size 'xl') mở ra êm ái: "Chi tiết Lô hàng: Cá Hồi Na Uy".
   - Danh sách các lô được sắp xếp theo chuẩn FEFO (hạn sử dụng sớm nhất lên đầu).
   - Hiển thị đầy đủ: Mã lô, Số lượng ban đầu, Số lượng còn lại, Đơn vị, Ngày nhập, Hạn sử dụng, Đơn giá vốn (`UnitCost`), Badge trạng thái hạn dùng (`app-expiration-badge`), và nút `[Xuất hủy]`.
   - Nếu nguyên liệu hết sạch tồn kho: Hiển thị Empty state đẹp mắt kèm nút `[+ Nhập lô mới cho nguyên liệu này]`.

---

### Kịch bản 4: Quy trình Xuất hủy Lô hàng (`DiscardBatchModal`)
1. Bấm nút `[Xuất hủy]` (`fa-ban`) trên một lô quá hạn (ở Tab 2, hoặc trong Modal chi tiết lô, hoặc từ Banner cảnh báo).
2. **Kỳ vọng**:
   - Modal xác nhận xuất hủy mở ra với thông điệp cảnh báo rõ ràng.
   - Dropdown lý do mẫu cho phép chọn: "Quá hạn sử dụng", "Hư hỏng / biến chất trong quá trình lưu kho", hoặc "Rách bao bì / nhiễm bẩn".
   - Ô nhập Textarea cho phép nhập chi tiết lý do.
   - Bấm nút `[Xác nhận Xuất hủy]`: Hệ thống gọi API `POST /api/app/inventory/batches/{id}/discard`, hiển thị Toaster thành công, cập nhật số lượng còn lại về 0 và làm mới các thẻ KPI.

---

### Kịch bản 5: Lối tắt Tab 1 $\rightarrow$ Tab 3 & Lịch sử Giao dịch
1. Tại Tab 1, bấm nút biểu tượng đồng hồ `[Lịch sử biến động]` (`fa-clock-rotate-left`) trên dòng một nguyên liệu.
2. **Kỳ vọng**:
   - Giao diện lập tức chuyển sang Tab 3 "Lịch sử Giao dịch".
   - Dropdown chọn nguyên liệu tự động chọn đúng nguyên liệu đó.
   - Bảng dữ liệu hiển thị tức thì các giao dịch: Thời gian, Loại giao dịch (Nhập kho, Xuất món RECIPE, Điều chỉnh, Xuất hủy), Biến động (+ xanh lá / - cam đỏ), Mã lô, Giá vốn `UnitCost`, Lý do và Mã đơn hàng tham chiếu.

---

### Kịch bản 6: Kiểm tra 100% Đa ngôn ngữ (i18n) & Nhận diện Cam & Trắng
1. Chuyển đổi ngôn ngữ trên Header hệ thống giữa **Tiếng Việt** và **English**.
2. **Kỳ vọng**:
   - 100% các tiêu đề cột, thẻ KPI, banner cảnh báo, tab, modal và option phân trang đều chuyển ngữ chính xác.
   - Không còn bất kỳ text tiếng Việt thô (như `<th>NGUYÊN LIỆU</th>`) hay raw key `::`.
   - Bảng và các nút thao tác tuân thủ Điều VI Hiến pháp: bo góc mềm mại 12-16px, tông màu cam tươi `#EA580C`, đổ bóng nhẹ `0 4px 20px rgba(0, 0, 0, 0.05)`.
