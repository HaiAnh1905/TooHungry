# Nghiên cứu Kỹ thuật (Technical Research): RM-011 Quản lý Tồn kho & Giao dịch

**Tính năng**: `RM-011 — Quản lý Tồn kho & Giao dịch`  
**Ngày**: 2026-10-09  
**Trạng thái**: Hoàn thành  

---

## 1. Bối cảnh & Thách thức Kỹ thuật

Phân hệ Quản lý Tồn kho & Giao dịch (RM-011) là xương sống trong chuỗi cung ứng nội bộ của nhà hàng `Acme.TooHungry`. Để đáp ứng vận hành nhà hàng thực tế, hệ thống phải giải quyết 5 bài toán kỹ thuật cốt lõi:
1. **Thuật toán xuất kho FEFO (First Expired, First Out)**: Đảm bảo tối ưu hóa sử dụng nguyên vật liệu theo hạn sử dụng, chống lãng phí và ngăn chặn rủi ro an toàn thực phẩm.
2. **Kiểm soát Tương tranh (Concurrency Control)**: Xử lý an toàn khi nhiều thu ngân bấm thanh toán đơn hàng cùng lúc trong giờ cao điểm, ngăn chặn hoàn toàn tình trạng âm kho.
3. **Độ chính xác đo lường (Decimal Precision)**: Tránh sai số dồn lũy khi quy đổi đơn vị mua hàng sang đơn vị cơ sở và khấu trừ theo định lượng công thức nấu ăn.
4. **Kiểm toán Bất biến (Audit Trail) & Giá vốn (COGS)**: Đảm bảo mọi biến động số lượng và giá trị vốn đều được lưu vết minh bạch, phục vụ kiểm toán tài chính.
5. **Hệ thống Cảnh báo Đa cấp (Inventory Alerts)**: Giúp nhân viên chủ động xử lý thực phẩm sắp hết hạn trong ngày và chuẩn bị nguồn hàng thay thế kịp thời.

---

## 2. Các Quyết định Kiến trúc Then chốt

### 2.1. Vị trí Thực thi Thuật toán FEFO (Domain Service vs Application Service)
- **Vấn đề**: Thuật toán FEFO nên đặt ở đâu trong mô hình Domain-Driven Design của ABP?
- **Quyết định**: Đặt hoàn toàn trong **Domain Service (`InventoryManager`)**.
- **Lý do**:
  - Thuật toán FEFO liên quan trực tiếp đến quy tắc nghiệp vụ cốt lõi (Business Invariants) của doanh nghiệp: thứ tự ưu tiên hạn dùng, bảo đảm an toàn thực phẩm (bỏ qua đồ tươi `StorageType.FRESH` đã quá hạn), và tính toán số lượng thiếu hụt (`ShortageQuantity`).
  - Đóng gói logic này vào Domain Service giúp các module khác (như Bán hàng POS RM-010, Thanh toán RM-016, Bếp trưởng) có thể tái sử dụng một cách nhất quán mà không bị trùng lặp logic tại tầng Application.

### 2.2. Kiểm soát Tương tranh Lạc quan (Optimistic Concurrency Control)
- **Vấn đề**: Trong giờ cao điểm, hai đơn hàng có thể cùng chứa một món ăn yêu cầu trừ cùng 1 lô nguyên liệu có số lượng tồn hạn chế. Nếu hai luồng cùng đọc và cập nhật mà không khóa, sẽ gây Race Condition làm âm kho.
- **Quyết định**: Sử dụng thuộc tính `ConcurrencyStamp` (kế thừa từ `FullAuditedAggregateRoot<Guid>`) kết hợp **Application-level Retry Policy**:
  ```csharp
  int maxRetries = 3;
  for (int retry = 0; retry < maxRetries; retry++)
  {
      try
      {
          var result = await _inventoryManager.DeductFefoAsync(ingredientId, quantity, orderNumber);
          return result;
      }
      catch (AbpDbConcurrencyException)
      {
          if (retry == maxRetries - 1) throw;
          await Task.Delay(50 * (retry + 1)); // Exponential backoff ngắn
      }
  }
  ```
- **Lý do**:
  - Tránh dùng Pessimistic Row Lock (khóa hàng vật lý trong DB) gây nghẽn kết nối và deadlock trong môi trường Web đa luồng.
  - Khi có xung đột, cơ chế retry tự động sẽ tải lại danh sách các lô hàng mới nhất và tính toán lại thứ tự trừ kho mà người dùng không hề nhận thấy lỗi.

### 2.3. Cấu hình Kiểu dữ liệu Số thực chính xác cao (`decimal(18, 4)`)
- **Vấn đề**: Các nguyên liệu trong công thức món ăn (Recipe RM-007) có thể có định lượng rất nhỏ (ví dụ: 0.005 kg tiêu, 0.015 lít nước tương). Nếu cơ sở dữ liệu làm tròn ở mức 2 chữ số thập phân (`decimal(18, 2)`), sai số tích lũy qua hàng ngàn đơn hàng sẽ làm lệch nghiêm trọng số liệu tồn kho.
- **Quyết định**:
  - Trong C# dùng kiểu `decimal`.
  - Trong EF Core Fluent API (`TooHungryDbContextModelCreatingExtensions.cs`), cấu hình rõ:
    ```csharp
    builder.Entity<InventoryBatch>(b => {
        b.Property(x => x.Quantity).HasPrecision(18, 4);
        b.Property(x => x.RemainingQuantity).HasPrecision(18, 4);
        b.Property(x => x.ConversionFactor).HasPrecision(18, 4);
    });
    builder.Entity<InventoryTransaction>(b => {
        b.Property(x => x.Quantity).HasPrecision(18, 4);
    });
    ```
- **Lý do**: Giữ nguyên độ chính xác 4 chữ số thập phân, đảm bảo số liệu chính xác đến mức gam và mililit.

### 2.4. Lưu vết Đơn giá vốn Đích danh (`UnitCost`) trong Giao dịch
- **Vấn đề**: Giá nhập của nguyên liệu thay đổi theo từng thời điểm. Khi trừ kho theo FEFO, một lần xuất có thể cắt qua nhiều lô hàng có giá mua khác nhau.
- **Quyết định**: Bổ sung trường `UnitCost` (decimal) vào `InventoryTransaction`.
- **Lý do**:
  - Khi xuất 15 kg (gồm 10 kg từ Lô A giá 50,000đ và 5 kg từ Lô B giá 55,000đ), hệ thống sinh 2 transaction `OUT` tương ứng lưu rõ `UnitCost`.
  - Giá trị này là bất biến tại thời điểm xuất kho, giúp phân hệ kế toán sau này tính toán Giá vốn hàng bán (COGS) chuẩn xác theo phương pháp đích danh (Specific Identification Method) mà không bị ảnh hưởng khi giá lô hàng bị thay đổi sau đó.

### 2.5. Cơ chế Cảnh báo Hạn dùng Đa cấp & Đồ tươi sống trong ngày
- **Vấn đề**: Cần phân loại rõ ràng mức độ rủi ro của từng loại nguyên liệu trong kho.
- **Quyết định**:
  - `EXPIRED_FRESH` (Mức `danger`): Lô hàng tươi sống (`StorageType.FRESH`) đã qua `ExpiryDate`. Chặn hoàn toàn không cho xuất kho, cảnh báo đỏ yêu cầu thủ kho xuất hủy.
  - `EXPIRING_TODAY` (Mức `warning` cao): Lô hàng tươi sống có `ExpiryDate <= UtcNow.AddHours(24)`. Thuật toán FEFO tự động ưu tiên xuất lô này đầu tiên cho bếp chế biến trong ngày.
  - `NEAR_EXPIRY` (Mức `warning`): Các lô hàng khô/đông lạnh sắp hết hạn trong 3 ngày tới (`ExpiryDate <= UtcNow.AddDays(3)`).
  - `OUT_OF_STOCK` / `SHORTAGE` (Mức `warning`): Tồn kho khả dụng `<= MinStock`.

### 2.6. Tối ưu Hiệu năng Truy vấn với Composite Indexes
- **Vấn đề**: Khi bảng `InventoryBatch` có hàng chục ngàn bản ghi, việc truy vấn quét tìm các lô còn tồn theo từng nguyên liệu và sắp xếp theo hạn sử dụng có thể làm chậm thời gian phản hồi.
- **Quyết định**: Thiết lập Composite Index trong EF Core:
  ```csharp
  b.HasIndex(x => new { x.IngredientId, x.IsActive, x.RemainingQuantity, x.ExpiryDate });
  ```
- **Lý do**: Cho phép SQL Server thực hiện Index Seek trực tiếp vào danh sách các lô còn hàng của nguyên liệu và sắp xếp theo ngày hết hạn cực nhanh (< 10ms).

---

## 3. Ranh giới Phân định Giữa các Phân hệ

| Module | Phạm vi Trách nhiệm | Giao tiếp / Phụ thuộc |
| :--- | :--- | :--- |
| **RM-005 (Ingredients)** | Master Data danh mục nguyên liệu, mã code, đơn vị cơ sở `BaseUnit`, mức tồn an toàn `MinStock`, `CurrentStock` (chỉ đọc). | RM-011 tham chiếu `IngredientId`. |
| **RM-007 (Recipes)** | Master Data công thức món ăn, định lượng nguyên liệu cho từng món. | Cung cấp định lượng cho POS RM-010. |
| **RM-010 (Orders)** | Gọi món POS, kiểm tra tồn khả dụng tức thời (`ValidateStockAsync`), không khóa kho cứng. | Kiểm tra tồn qua RM-011. |
| **RM-011 (Feature này)** | Quản lý Lô (`InventoryBatch`), xuất kho FEFO (`InventoryManager`), kiểm kê điều chỉnh, lưu vết `InventoryTransaction`, cảnh báo đa cấp. | Cung cấp API và Domain Service cốt lõi. |
| **RM-012 (UI Redesign)** | Tái thiết kế giao diện Angular: Drawer chi tiết lô, tab lịch sử trực quan, bảng điều khiển chuyên sâu. | Tiêu thụ API có sẵn từ RM-011. |
| **RM-013 (Deactivate/Restore)**| Luồng tạm ngưng/khôi phục hoạt động cho từng lô hàng hoặc mặt hàng tồn kho. | Bổ sung API trạng thái trên RM-011. |
| **RM-016 (Payment)** | Khi đơn hàng thanh toán thành công, gọi `InventoryManager.DeductFefoAsync` để khấu trừ kho vật lý. | Trừ kho vật lý thông qua RM-011. |
