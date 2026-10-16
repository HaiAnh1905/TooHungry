# Báo cáo Nghiên cứu Kỹ thuật (Technical Research): RM-017 Làm lại trang Quản lý bàn (Table Management Redesign)

**Tính năng**: `RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign)`  
**Ngày**: 2026-10-16  
**Trạng thái**: Đã hoàn thành (Completed)

---

## 1. Nghiên cứu Kiến trúc Tái Cấu trúc & Bóc tách Component (Component Modularization)

### Vấn đề Hiện tại:
- Tệp `table.component.html` hiện tại có quy mô khổng lồ: **2263 dòng HTML** và `table.component.ts` có **1914 dòng TypeScript**.
- Nguyên nhân chính:
  1. Toàn bộ 6 modal (Modal Thêm/Sửa Bàn, Thêm/Sửa Khu vực, Đặt bàn mới, Chi tiết đặt bàn, Xác nhận khóa bàn, Xác nhận khóa khu vực, và Modal Gọi món POS) đều bị viết inline trực tiếp bên trong một component duy nhất.
  2. Modal Gọi món (`isOrderModalOpen`) chiếm hơn 300 dòng mã nguồn nhân bản từ màn hình POS (`/waiter/order/:tableId`).
  3. Màn hình `/waiter/tables` cũng có các modal tương tự nhưng phải tự viết riêng hoặc gọi lại component modal khác, dẫn đến trùng lặp mã nguồn và khó bảo trì đồng bộ.

### Giải pháp Kiến trúc:
1. **Loại bỏ Modal Gọi món (Order Modal) inline khỏi `/tables`**:
   - Khi người dùng bấm nút `[Order]` tại `/tables`, hệ thống điều hướng trực tiếp sang `/waiter/order/:tableId` (RM-010) hoặc mở ngăn kéo POS chuẩn.
2. **Bóc tách các Sub-component Modal độc lập dùng chung (Shared Table Modals)** đặt tại `angular/src/app/shared/components/tables/`:
   - `TableTransferModalComponent`: Hộp thoại Chuyển bàn (chọn bàn đích trống, gọi API, phát SignalR). Dùng chung cho cả `/waiter/tables` và `/tables`.
   - `TableMergeModalComponent`: Hộp thoại Gộp bàn (chọn bàn phụ có order, ghép món, đóng order phụ). Dùng chung cho cả `/waiter/tables` và `/tables`.
   - `TableEndMealModalComponent`: Hộp thoại Kết thúc bữa ăn tích hợp Card Timeline 3 mốc (`Seated At → Elapsed → Ended At`) và phân nhánh có/không có order. Dùng chung cho cả `/waiter/tables` và `/tables`.
3. **Bóc tách Modal Quản trị Bàn & Khu vực** đặt tại `angular/src/app/table/`:
   - `TableFormModalComponent`: Thêm mới và Chỉnh sửa thông tin bàn ăn.
   - `DiningAreaFormModalComponent`: Thêm mới và Chỉnh sửa khu vực ăn uống.
4. **Kết quả đạt được**:
   - `table.component.html` giảm từ 2263 dòng xuống **dưới 500 dòng**, chỉ tập trung quản lý Grid View, List View, thanh thống kê mặt bằng và điều hướng khu vực.
   - `table.component.ts` giảm từ 1914 dòng xuống **dưới 600 dòng**, code sạch sẽ, tính module hóa cao, dễ kiểm thử.

---

## 2. Nghiên cứu Động cơ Tính Giờ Phản ứng & Hệ thống Cảnh báo 2 Tầng (Two-tier Visual Alert System)

### Vấn đề:
- Thời gian dùng bữa của khách tại bàn cần được theo dõi liên tục theo thời gian thực mà không làm tràn bộ nhớ và không phụ thuộc vào bộ đếm giây của trình duyệt (tránh sai lệch khi máy khách bị lag, tắt màn hình hoặc mạng chập chờn).
- Cần phân định rõ ràng giữa khách ngồi bình thường, khách cần chăm sóc thêm nước, và bàn ngồi quá lâu trong giờ cao điểm.

### Giải pháp Kiến trúc:
1. **Timer Phản ứng trên Angular Signal**:
   ```typescript
   // Khai báo signal thời gian đồng hồ hiện tại
   readonly currentTime = signal<number>(Date.now());
   
   // Khởi tạo interval 30 giây trong ngOnInit
   this.timerInterval = setInterval(() => {
     this.currentTime.set(Date.now());
   }, 30000);
   ```
2. **Hàm tính thời lượng dựa trên mốc tuyệt đối `OccupiedTime`**:
   ```typescript
   getMealDurationMinutes(occupiedTime: string | Date | null | undefined): number {
     if (!occupiedTime) return 0;
     const start = new Date(occupiedTime).getTime();
     const now = this.currentTime();
     return Math.max(0, Math.floor((now - start) / 60000));
   }

   getMealDurationText(occupiedTime: string | Date | null | undefined): string {
     const mins = this.getMealDurationMinutes(occupiedTime);
     if (mins < 60) {
       return `${mins} ${this.localizationService.instant('::MinutesShort')}`;
     }
     const hours = Math.floor(mins / 60);
     const remainingMins = mins % 60;
     return `${hours}h ${remainingMins}m`;
   }
   ```
3. **Phân cấp 2 Tầng Cảnh báo Trực quan**:
   - **Tầng 0 (Bình thường: $< 60$ phút)**:
     Class `badge-meal-normal`: nền xám/kem nhạt `#F1F5F9`, chữ xám đen `#334155`.
   - **Tầng 1 (Cảnh báo Chăm sóc: $60 \le \text{mins} < 90$)**:
     Class `badge-meal-warning`: nền vàng hổ phách nhạt `#FEF3C7`, chữ vàng đậm `#D97706`, icon `fa-clock`.
     Ý nghĩa: Nhắc nhân viên phục vụ châm nước, hỏi thăm chất lượng món hoặc gợi ý tráng miệng.
   - **Tầng 2 (Cảnh báo Bàn ngồi lâu: $\ge 90$ phút)**:
     Class `badge-meal-long`: nền đỏ nhạt `#FEE2E2`, chữ đỏ đậm `#DC2626`, icon `fa-hourglass-half` kèm animation nhấp nháy nhẹ `pulse 2s infinite`.
     Ý nghĩa: Nhắc nhở ca trực về tốc độ quay vòng bàn và chuẩn bị sẵn hóa đơn.

---

## 3. Nghiên cứu Giao dịch Nguyên tử Backend cho Chuyển bàn & Gộp bàn

### 3.1 Nghiệp vụ Chuyển bàn (`TransferTableAsync`)
- **Luồng xử lý nguyên tử**:
  1. Nạp Bàn nguồn (`sourceTable`) và Bàn đích (`targetTable`).
  2. Kiểm tra hợp lệ:
     - `sourceTable.Status == TableStatus.Occupied`
     - `targetTable.Status == TableStatus.Available`
     - Bàn đích không bị vô hiệu hóa (`Status != Disabled`).
  3. Tìm đơn hàng đang mở của Bàn nguồn (`activeOrder` có `Status != Completed && Status != Cancelled`).
  4. Nếu có `activeOrder`: Cập nhật `activeOrder.TableId = targetTable.Id`.
  5. Cập nhật Bàn đích:
     - `targetTable.Status = TableStatus.Occupied`
     - `targetTable.OccupiedTime = sourceTable.OccupiedTime ?? DateTime.Now`
  6. Phân nhánh Bàn nguồn:
     - Nếu có đơn hàng (`activeOrder != null`): Chuyển sang `sourceTable.Status = TableStatus.Cleaning`.
     - Nếu không có đơn hàng (`activeOrder == null`): Chuyển thẳng về `sourceTable.Status = TableStatus.Available`.
     - Reset `sourceTable.OccupiedTime = null`.
  7. Lưu DB và phát SignalR thông báo trạng thái mới của cả hai bàn qua `NotifyTableStatusChangedAsync`.

### 3.2 Nghiệp vụ Gộp bàn (`MergeTablesAsync`)
- **Luồng xử lý nguyên tử**:
  1. Nạp Bàn chính (`primaryTable`) và Bàn phụ (`secondaryTable`).
  2. Kiểm tra hợp lệ: Cả hai bàn đều phải đang `Occupied`.
  3. Lấy Đơn hàng mở của Bàn chính (`orderA`) và Bàn phụ (`orderB`).
  4. Nếu Bàn phụ có đơn hàng (`orderB`):
     - Chuyển toàn bộ danh sách `OrderItem` từ `orderB` sang `orderA` (hoặc tạo các dòng item mới trên `orderA` với cùng `DishId`, `Quantity`, `UnitPrice`).
     - Cập nhật tổng tiền của `orderA`: `orderA.TotalAmount = orderA.Items.Sum(x => x.Quantity * x.UnitPrice)`.
     - Đóng `orderB` với trạng thái `Cancelled` hoặc `Completed` kèm ghi chú: *"Đã gộp vào bàn {primaryTable.Name}"*.
  5. Giải phóng Bàn phụ: `secondaryTable.Status = TableStatus.Cleaning`, `secondaryTable.OccupiedTime = null`.
  6. Lưu DB và phát SignalR cập nhật trạng thái của Bàn phụ và Order của Bàn chính.

---

## 4. Nghiên cứu Chuẩn Nhận Diện Cam & Trắng & Tối Ưu Cảm Ứng (Touch Target)

1. **Bảng màu Nhận diện Thương hiệu Acme.TooHungry**:
   - Màu chủ đạo: `#EA580C` (Orange-600)
   - Màu nhấn hover: `#C2410C` (Orange-700)
   - Nền giao diện: `#F8FAFC` (Slate-50)
   - Thẻ hiển thị: `#FFFFFF` bo góc chuẩn `border-radius: 16px` (`rounded-2xl`)
   - Viền thẻ tinh tế: `1px solid rgba(226, 232, 240, 0.8)`
   - Đổ bóng đa tầng: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`
2. **Kích thước Vùng Chạm Cảm ứng (Touch Target Standard)**:
   - Toàn bộ các nút bấm (`.btn-seat-guests`, `.btn-action-main`, `.btn-action-sub`, `.icon-action-btn`) đều được định kích thước tối thiểu $44 \times 44\text{px}$.
   - Khoảng cách an toàn giữa các nút liền kề tối thiểu 8px để chống bấm nhầm ngón tay trên màn hình POS/Tablet.
