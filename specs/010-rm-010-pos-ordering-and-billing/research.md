# Nghiên cứu Kỹ thuật & Quyết định Kiến trúc: RM-010 POS / Đơn hàng

**Tính năng**: `RM-010 — POS / Đơn hàng (POS Ordering & Dining Session Management)`  
**Ngày**: 2026-10-09  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Nghiên cứu Kiểm tra Tồn kho Tức thời theo Công thức (Instant Recipe Stock Validation)

### Bối cảnh
Khi Waiter gọi món hoặc tăng số lượng món trong giỏ hàng (ví dụ: Pizza x 2 → Pizza x 3), hệ thống cần ngăn chặn việc nhận đơn vượt quá năng lực nguyên vật liệu trong kho, tránh tuyệt đối hiện tượng âm kho.

### Các lựa chọn xem xét
- **Phương án 1 (Giữ chỗ kho cứng - Hard Reservation)**: Trừ tồn kho khả dụng ngay khi món được thêm vào giỏ hoặc khi bấm `[Đặt đơn]`. Nhược điểm: Phải quản lý cơ chế timeout hoàn kho phức tạp nếu khách ngồi lâu hoặc hủy món.
- **Phương án 2 (Kiểm tra tồn khả dụng tức thời - Instant Validation)**: Kiểm tra đối chiếu số lượng tồn kho hiện tại của các nguyên liệu theo công thức món ăn (`Recipe` & `RecipeIngredient`) tại thời điểm bấm tăng số lượng và khi nhấn `[Đặt đơn]`. Không giữ chỗ kho cho đơn `PENDING`; việc trừ kho vật lý theo thuật toán FEFO chỉ diễn ra khi đơn hoàn tất thanh toán (RM-016).
- **Phương án 3 (Không kiểm tra kho lúc order)**: Bán tự do, chỉ trừ kho khi thanh toán và chấp nhận âm kho. Bị bác bỏ vì vi phạm nguyên tắc chống âm kho.

### Quyết định & Căn cứ
- **Chọn Phương án 2**:
  - Tại Frontend: Kiểm tra số lượng và cảnh báo sớm.
  - Tại Backend: Xây dựng phương thức Domain Service hoặc Application Service `ValidateOrderStockAsync(List<OrderItemDto> items)`.
  - Thuật toán kiểm tra:
    ```csharp
    foreach (var item in items)
    {
        var recipe = await _recipeRepository.GetActiveByDishIdAsync(item.DishId);
        if (recipe == null) continue; // Món không có recipe -> cho phép bán bình thường (US3 RM-007)

        foreach (var ingredient in recipe.Ingredients.Where(x => x.IsActive))
        {
            var baseQtyRequired = ingredient.CalculateBaseQuantity() * item.Quantity;
            var currentStock = await _inventoryRepository.GetAvailableStockAsync(ingredient.IngredientId);
            if (currentStock < baseQtyRequired)
            {
                throw new BusinessException(TooHungryErrorCodes.InsufficientIngredientStock)
                    .WithData("DishName", item.DishName)
                    .WithData("IngredientName", ingredient.IngredientName)
                    .WithData("Available", currentStock)
                    .WithData("Required", baseQtyRequired);
            }
        }
    }
    ```

---

## 2. Nghiên cứu Quy tắc Bất biến: Duy nhất một Active Order & Phiên ăn

### Bối cảnh
Mỗi phiên ăn của bàn `OCCUPIED` chỉ được phép tồn tại **duy nhất một đơn hàng đang hoạt động** (`Active Order`). Tuyệt đối không sinh nhiều Order cho cùng một bàn khi khách gọi thêm món.

### Quyết định & Căn cứ
- Bàn ăn liên kết với đơn qua khóa ngoại `Order.TableId`.
- Một đơn hàng được coi là Active Order của bàn khi:
  ```csharp
  x.TableId == tableId && x.Status == OrderStatus.Pending
  ```
- **Xử lý khi Gọi thêm món (`Continue Order`)**:
  - Khi Waiter vào `/waiter/order/:tableId`, hệ thống gọi `GetActiveOrderByTableIdAsync(tableId)`.
  - Nếu đã có đơn `PENDING`, trả về thông tin đơn và toàn bộ `OrderItem` hiện có để hiển thị lại vào giỏ hàng.
  - Khi Waiter thêm món và bấm `[Đặt đơn]`, hệ thống gọi API `SubmitOrderAsync` với `OrderId` đã có để thực hiện cập nhật danh sách món (thêm món mới, cập nhật số lượng món cũ, tính lại `TotalAmount`) thay vì tạo Order mới.
- **Ràng buộc duy nhất (Unique Constraint / Concurrency Guard)**:
  - Áp dụng kiểm tra xung đột trong Application Service và đặt Unique Index trên bảng `Orders` cho các đơn `PENDING` của cùng `TableId` (Filtered Index: `WHERE Status = 0 AND IsDeleted = 0`).

---

## 3. Nghiên cứu Kiến trúc Giao diện Waiter Order & Trải nghiệm Người dùng (Angular UX)

### Bối cảnh
Waiter cần giao diện trực quan, thao tác nhanh trên tablet/màn hình cảm ứng, định vị chính xác bàn ăn và không bị nhầm lẫn giữa các bàn.

### Quyết định Thiết kế
1. **Định tuyến độc lập**:
   - Route: `/waiter/order/:tableId`, bảo vệ bởi `authGuard` và `smartPermissionGuard` với quyền `TooHungry.Orders`.
2. **Cấu trúc 3 vùng chức năng**:
   - **Header Card**:
     - Nút `[← Back]`: Điều hướng về `/waiter/tables`. Có cảnh báo xác nhận nếu có thay đổi chưa lưu trong giỏ.
     - Tiêu đề màn hình: Gọi món tại bàn.
     - Nút `[🛒]`: Nút mở Order Drawer, có badge số lượng món nổi bật màu cam (`#EA580C`).
   - **Sidebar Trái**:
     - **Table Information Card** ở vị trí trên cùng: Hiển thị Tên bàn (ví dụ "Bàn 05"), Sức chứa (4 chỗ), Badge trạng thái `OCCUPIED` màu đỏ ấm (`#FFF1F2` / `#BE123C`).
     - **Menu Categories Filter**: Hiển thị danh mục món mở rộng mặc định, có nút "Tất cả" và các danh mục món (Khai vị, Món chính, Đồ uống...). Bấm danh mục để lọc lưới món ăn.
   - **Khu vực Thực đơn Trung tâm (Main Grid)**:
     - Thanh tìm kiếm nhanh (Search Input) ở đầu lưới, hỗ trợ tìm kiếm tức thì không phân biệt dấu/hoa thường.
     - Lưới 3 Food Cards trên mỗi hàng: Khung ảnh vuông bo góc (`border-radius: 12px`), nền đen (`#111827`), Tên món font đậm, Giá bán màu cam ấm, Nút đặt nhanh `[+]` ở góc trên bên phải ảnh.
     - Click vào thân thẻ món mở **Food Detail Modal** (Ảnh lớn, Tên, Mô tả, Giá, Ô nhập Ghi chú món `Item Note`, nút đóng `[X]`, nút `[Đặt món]`).
   - **Ngăn kéo Giỏ hàng (Order Drawer)**:
     - Trượt ra từ mép phải màn hình (`width: 420px`).
     - Danh sách từng dòng món: Tên món, đơn giá, nút `[-]`, ô số lượng, nút `[+]`, thành tiền, ô nhập ghi chú món ăn có thể chỉnh sửa trực tiếp, nút xóa món (thùng rác).
     - Tổng tiền toàn đơn hiển thị to rõ ràng ở chân Drawer.
     - Nút hành động: `[Đặt đơn]` (màu cam nhận diện, disabled khi giỏ rỗng) và nút phụ `[Hủy đơn hàng]` (nếu đơn đã tồn tại trong DB).

---

## 4. Nghiên cứu Đồng bộ Realtime SignalR (`TableHub`)

### Bối cảnh
Khi Waiter hoàn tất đặt đơn hoặc cập nhật món tại `/waiter/order/:tableId`, sơ đồ bàn `/waiter/tables` trên các thiết bị khác cần cập nhật ngay chỉ báo "Có đơn đang phục vụ" (`TableHasOpenOrder`).

### Quyết định Thiết kế
- `OrderAppService` sử dụng `ITableRealtimeNotifier` để phát sự kiện SignalR:
  ```csharp
  await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name);
  ```
  Và bổ sung thông báo trạng thái đơn:
  ```csharp
  await _realtimeNotifier.NotifyTableOrderUpdatedAsync(table.Id, hasActiveOrder: true, order.Id);
  ```
- Client Angular `WaiterTablesComponent` lắng nghe qua SignalR subscription và cập nhật signal state của bàn tương ứng mà không cần tải lại toàn bộ danh sách bàn.

---

## 5. Nghiên cứu Tuân thủ Hiến pháp & Quốc tế hóa (I18N)

### Quyết định
- **Bộ nhận diện Cam & Trắng**:
  - Nền trắng tinh khiết (`#FFFFFF`), viền thẻ bo góc mềm mại (`12px`), đổ bóng nổi nhẹ (`0 4px 20px rgba(0, 0, 0, 0.08)`).
  - Trạng thái Active/Selected: Màu cam ấm nhẹ (`#FFF3E8` / `#EA580C`).
  - Nút chính `[Đặt đơn]`: Nền cam gradient (`#EA580C` → `#C2410C`), chữ trắng, hover hiệu ứng nổi.
- **I18N Song ngữ**:
  - 100% các chuỗi văn bản UI, thông báo toast, modal confirm đều dùng `abpLocalization` pipe.
  - Đồng bộ đầy đủ key-value vào cả `en.json` và `vi.json`.
