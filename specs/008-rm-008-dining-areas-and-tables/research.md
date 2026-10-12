# Quyết định Nghiên cứu & Kiến trúc: Quản lý Khu vực Ăn uống và Bàn ăn (RM-008)

**Tính năng**: `008-rm-008-dining-areas-and-tables`  
**Ngày**: 2026-10-09  
**Trạng thái**: Đã hoàn thành  

---

## 1. Cơ chế Vô hiệu hóa Khu vực thay vì Xóa cứng (DiningArea Soft Inactivation)

### Quyết định (Decision)
- Thêm trường `IsActive` (`bool`, mặc định `true`) vào thực thể `DiningArea` trong tầng Domain và ánh xạ cột `IsActive` vào bảng `AppDiningAreas` qua EF Core.
- API `IDiningAreaAppService` cung cấp 2 phương thức chuyên biệt:
  - `Task DeactivateAsync(Guid id)`: Kiểm tra nghiệp vụ; nếu trong khu vực có bất kỳ bàn nào đang ở trạng thái `Occupied` hoặc có đơn hàng chưa đóng thì ném ngoại lệ nghiệp vụ (`BusinessException`). Nếu thỏa mãn, đặt `IsActive = false`, đồng thời tự động cập nhật toàn bộ các bàn trực thuộc sang trạng thái `Disabled` (`INACTIVE`).
  - `Task ActivateAsync(Guid id)`: Đặt `IsActive = true`, chuyển các bàn trực thuộc về `Available`.
- Tuyệt đối không xóa cứng (hard delete) dữ liệu `DiningArea` khỏi database.

### Lý do chọn (Rationale)
- Đảm bảo toàn vẹn dữ liệu cho các báo cáo lịch sử kinh doanh, đơn hàng quá khứ và bảo toàn liên kết khóa ngoại `DiningAreaId` trong `RestaurantTable`.
- Phù hợp với nguyên tắc Domain Invariants đã thống nhất tại phiên Clarification.

### Các phương án khác đã xem xét (Alternatives Considered)
- **Cascade Delete**: Xóa luôn tất cả bàn trong khu vực -> Bị loại bỏ vì làm mất vĩnh viễn dữ liệu lịch sử đơn hàng và vi phạm quy định bảo mật dữ liệu nhà hàng.
- **Restrict Delete**: Chặn xóa nếu còn bàn -> Vẫn để lại nguy cơ xóa nhầm khi người dùng dọn bàn xong và bấm xóa. Vô hiệu hóa mềm là giải pháp an toàn tuyệt đối.

---

## 2. Ràng buộc Tên / Số hiệu Bàn ăn duy nhất toàn hệ thống (Global Unique Table Name)

### Quyết định (Decision)
- Cấu hình chỉ mục duy nhất trong EF Core: `builder.Entity<RestaurantTable>(b => { b.HasIndex(x => x.Name).IsUnique(); });`.
- Kiểm tra tính duy nhất ở tầng Domain/Application trước khi lưu (`await _tableRepository.AnyAsync(x => x.Name == input.Name && x.Id != id)`), ném ra mã lỗi `TooHungryDomainErrorCodes.TableAlreadyExists` kèm thông điệp tiếng Việt thân thiện: *"Tên bàn '[Tên]' đã tồn tại trong hệ thống."*

### Lý do chọn (Rationale)
- Giúp nhân viên phục vụ, thu ngân và bếp nhận diện chính xác 100% bàn ăn trên hóa đơn, phiếu in bếp (KOT) mà không bị nhầm lẫn giữa các tầng hay các khu vực.

### Các phương án khác đã xem xét (Alternatives Considered)
- **Duy nhất theo từng khu vực**: Cho phép trùng tên bàn nếu khác khu vực (ví dụ Tầng 1 - Bàn 1, Tầng 2 - Bàn 1) -> Gây nhầm lẫn nghiêm trọng khi in bill gọi món và khi thu ngân tìm kiếm bàn để thanh toán.

---

## 3. Vòng đời Trạng thái Bàn & Chuẩn hóa Kiểu Liệt kê (State Transitions & TableStatus Enum)

### Quyết định (Decision)
- Chuẩn hóa kiểu liệt kê `TableStatus` trong `Acme.TooHungry.Domain.Shared`:
  - `Available = 0`: Bàn trống, sẵn sàng đón khách.
  - `Occupied = 1`: Đang có khách ngồi (bao gồm cả trạng thái hợp lệ `OCCUPIED + No Order`).
  - `Reserved = 2`: Đã được khách đặt trước (tích hợp RM-009).
  - `Disabled = 3`: Tạm ngưng / Bàn hỏng / Vô hiệu hóa (`INACTIVE`).
  - `Cleaning = 4`: Đang dọn dẹp sau khi khách thanh toán rời đi.
- Cung cấp phương thức `ChangeStatusAsync(Guid id, TableStatus newStatus)` tại `TableAppService` (yêu cầu quyền `TooHungryPermissions.Tables.UpdateStatus`).
- Lắng nghe sự kiện nghiệp vụ từ module Order/Payment để tự động đổi trạng thái bàn khi tạo order mới (`Occupied`) hoặc hoàn tất thanh toán (`Cleaning`).

---

## 4. Giao diện Vận hành Bàn chuyên biệt cho Waiter (`/waiter/tables`)

### Quyết định (Decision)
- Xây dựng component chuyên biệt tại `/waiter/tables` dành cho nhân viên phục vụ ca trực:
  - Bố cục dạng Thẻ (Card Grid) chuẩn **4 Table Cards trên mỗi hàng** (trên desktop/tablet 4 cột, trên mobile responsive 1-2 cột).
  - Thanh công cụ Tab Khu vực: **Chỉ hiển thị các khu vực đang hoạt động (`IsActive = true`)**; ẩn hoàn toàn các khu vực bị vô hiệu hóa để màn hình ca trực luôn gọn gàng, tập trung.
  - Bộ lọc trạng thái bàn: Tất cả, Còn trống (`Available`), Đang có khách (`Occupied`), Đã đặt (`Reserved`), Đang dọn dẹp (`Cleaning`), Vô hiệu hóa (`Inactive`).
  - Mỗi thẻ bàn hiển thị: Tên bàn, Số lượng chỗ ngồi (`Capacity`), Huy hiệu trạng thái với mã màu rõ nét, và nhóm nút hành động theo từng trạng thái.

### Nhóm nút hành động trên mỗi Thẻ bàn:
- `AVAILABLE` (Badge xanh lá `[Còn trống]`):
  - `[Đón khách]`: Chuyển tức thì `AVAILABLE → OCCUPIED` (không bắt buộc nhập thông tin, hỗ trợ `OCCUPIED + No Order`).
  - `[Đặt bàn]`: Mở modal đặt bàn (RM-009).
  - `[Vô hiệu hóa bàn]`: Chuyển `AVAILABLE → INACTIVE`.
- `INACTIVE` (Badge xám `[Vô hiệu hóa]`):
  - Nút `[Kích hoạt bàn]`: Chuyển `INACTIVE → AVAILABLE`.
  - Khóa toàn bộ các thao tác đón khách, đặt bàn, tạo order.
- `OCCUPIED` (Badge đỏ ấm `[Đang có khách]`):
  - `[Order]`: Điều hướng sang `/waiter/order/:tableId` (RM-010).
  - `[Kết thúc bữa ăn]`:
    - *Case 1 (Không có Order)*: Dialog xác nhận *"Khách không sử dụng món ăn. Bạn có chắc chắn muốn chuyển bàn về trạng thái trống?"* -> Xác nhận: Chuyển về `AVAILABLE`.
    - *Case 2 (Có Order)*: Dialog xác nhận kết thúc bữa ăn -> Xác nhận: Điều hướng sang màn hình Thanh toán (RM-016). **Trạng thái bàn vẫn giữ `OCCUPIED`** cho đến khi thanh toán thành công mới chuyển sang `CLEANING`.
- `CLEANING` (Badge trắng/sáng `[Đang dọn dẹp]`):
  - `[Dọn dẹp xong]`: Chuyển về `AVAILABLE`, khôi phục các hành động ban đầu.
- `RESERVED` (Badge vàng/cam `[Đã đặt trước]`):
  - `[Nhận bàn]`: Chuyển sang `OCCUPIED`.
  - `[Hủy đặt]`: Khôi phục về `AVAILABLE`.

---

## 5. Cơ chế Kiểm soát Xung đột Đồng thời (Optimistic Concurrency & Atomic State Check)

### Quyết định (Decision)
- Khi nhân viên thao tác đổi trạng thái trên giao diện `/waiter/tables`, frontend gửi kèm mã trạng thái hiện tại (`expectedCurrentStatus`) lên API `ChangeStatusAsync`.
- Tầng Application kiểm tra nguyên tử: nếu trạng thái thực tế trong database đã bị thay đổi bởi một nhân viên khác từ trước, hệ thống từ chối cập nhật và trả về mã lỗi `TableStatusConflictException` (hoặc `400 Bad Request` kèm mã lỗi nghiệp vụ `TooHungryDomainErrorCodes.TableStatusAlreadyChanged`).
- Frontend hiển thị thông báo toast: *"Trạng thái bàn đã được cập nhật bởi nhân viên khác, vui lòng kiểm tra lại."* và thẻ bàn tự động cập nhật ngay theo trạng thái mới từ SignalR.

### Lý do chọn (Rationale)
- Tránh tình trạng hai Waiter cùng dẫn hai nhóm khách vào cùng một bàn trống trong giờ cao điểm hoặc ghi đè trạng thái ngoài ý muốn.

---

## 6. Đồng bộ Thời gian thực qua SignalR Hub (`/signalr-hubs/table`)

### Quyết định (Decision)
- **Backend**:
  - Tạo `TableHub : AbpHub` tại endpoint `/signalr-hubs/table`.
  - Định nghĩa interface `ITableRealtimeNotifier` tại `Application.Contracts` và triển khai `SignalRTableRealtimeNotifier` tại `HttpApi.Host` để gọi `IHubContext<TableHub>` phát sự kiện `TableStatusChanged`.
  - `TableAppService` inject `ITableRealtimeNotifier` và phát sự kiện tự động mỗi khi trạng thái bàn thay đổi.
- **Frontend**:
  - `TableSignalrService` duy trì kết nối WebSocket tự động kết nối lại (`withAutomaticReconnect`).
  - Lắng nghe sự kiện `TableStatusChanged` và cập nhật trực tiếp state trong mảng danh sách bàn của `/waiter/tables` trong thời gian dưới 1 giây mà không cần tải lại toàn bộ trang.

---

## 7. Thiết kế Giao diện Cam & Trắng (Orange & White Theme) theo Hiến pháp

### Quyết định (Decision)
- Áp dụng triệt để bộ nhận diện đặc trưng:
  - Nền thẻ bàn: Trắng sạch `#FFFFFF` với border-radius 12-16px, đổ bóng nổi nhẹ `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06)`.
  - Màu sắc Trạng thái (Status Badges):
    - `Available`: Nền xanh lá nhạt `#ECFDF5`, chữ xanh lục đậm `#047857`, dot xanh `#10B981`.
    - `Occupied`: Nền đỏ ấm/hồng nhạt `#FEF2F2`, chữ đỏ đậm `#B91C1C`, dot đỏ `#EF4444`.
    - `Reserved`: Nền cam ấm `#FFF7ED`, chữ cam đậm `#C2410C`, dot cam rực rỡ `#F97316`.
    - `Cleaning`: Nền xanh xám/sáng `#F8FAFC`, chữ xám `#475569`, viền `#E2E8F0`.
    - `Inactive`: Nền xám `#F3F4F6`, chữ xám tối `#6B7280`.
  - Nút hành động: Sử dụng gradient cam chủ đạo (`#EA580C` -> `#F97316`) cho nút tác vụ chính, nút phụ viền mềm và hover tông màu đào nhẹ (`#FFEDD5`).
