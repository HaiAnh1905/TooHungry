# Hướng dẫn Kiểm thử & Vận hành (Quickstart Guide): RM-011 Quản lý Tồn kho & Giao dịch

**Mã Tính năng**: `RM-011 — Quản lý Tồn kho & Giao dịch`  
**Ngày**: 2026-10-09  
**Trạng thái**: Hoàn thiện  

---

## 1. Kiểm thử Tự động (Automated Tests)

Chạy toàn bộ bộ kiểm thử tự động cho module tồn kho bằng lệnh CLI:

```powershell
# Chạy toàn bộ Unit Tests của Domain Layer
dotnet test test/Acme.TooHungry.Domain.Tests/Acme.TooHungry.Domain.Tests.csproj --filter "FullyQualifiedName~Inventories"

# Chạy toàn bộ Integration Tests của Application Layer
dotnet test test/Acme.TooHungry.Application.Tests/Acme.TooHungry.Application.Tests.csproj --filter "FullyQualifiedName~Inventories"

# Chạy toàn bộ Entity Framework Core Tests
dotnet test test/Acme.TooHungry.EntityFrameworkCore.Tests/Acme.TooHungry.EntityFrameworkCore.Tests.csproj --filter "FullyQualifiedName~Inventory"
```

### Các kịch bản kiểm thử trọng yếu đã bao phủ:
1. **`InventoryManager_Fefo_Tests.cs`**:
   - `Should_Deduct_From_Earliest_Expiry_Batch_First`: Kiểm tra trừ lô hạn gần nhất trước.
   - `Should_Skip_Expired_Fresh_Batches`: Tự động bỏ qua lô `StorageType.FRESH` đã quá hạn.
   - `Should_Deduct_Sequentially_Across_Batches`: Trừ nối tiếp qua nhiều lô khi số lượng xuất lớn hơn một lô.
   - `Should_Return_Shortage_When_Insufficient_Stock`: Trả về `ShortageQuantity` khi thiếu kho mà không làm âm kho.
2. **`InventoryManager_Adjustment_Tests.cs`**:
   - `Should_Require_Batch_Selection_For_Deficit`: Bắt buộc chỉ định lô cụ thể khi hao hụt thiếu kho.
   - `Should_Auto_Create_Adjustment_Batch_For_Surplus`: Tự động sinh lô `ADJ-...` khi thừa kho.
3. **`InventoryAppService_Tests.cs`**:
   - `Should_Create_Batch_And_Increase_Stock`: Nhập hàng, quy đổi đơn vị mua sang đơn vị cơ sở và sinh giao dịch `IN`.
   - `Should_Return_Alerts_For_Expired_Fresh_And_Near_Expiry`: Quét chính xác các cảnh báo `EXPIRED_FRESH`, `EXPIRING_TODAY`, `NEAR_EXPIRY`.

---

## 2. Kịch bản Kiểm thử Nghiệp vụ Thủ công (Manual E2E Scenarios)

### Kịch bản 1: Nhập kho theo Lô & Tự động quy đổi Đơn vị tính (US1)
1. **Thao tác**:
   - Mở Swagger hoặc gọi API `POST /api/app/inventory/batches`.
   - Chọn nguyên liệu: **Thịt Bò Mỹ** (`BaseUnit: kg`).
   - Nhập `PurchaseQuantity: 2`, `PurchaseUnit: "Thùng"`, `ConversionFactor: 20` (1 Thùng = 20 kg).
   - Nhập `ExpiryDate` là 15 ngày sau, `UnitCost: 4,000,000đ`.
2. **Kỳ vọng**:
   - Hệ thống tạo `InventoryBatch` mới với `Quantity = 40.0`, `RemainingQuantity = 40.0`.
   - Sinh 1 bản ghi `InventoryTransaction` loại `IN` với số lượng 40.0 kg và `UnitCost = 4,000,000đ`.

---

### Kịch bản 2: Khấu trừ kho tự động theo FEFO (US2)
1. **Chuẩn bị**:
   - Nguyên liệu **Cá Hồi** có 2 lô:
     - Lô A: Hạn 15/10/2026, còn tồn 10 kg.
     - Lô B: Hạn 25/10/2026, còn tồn 15 kg.
2. **Thao tác**:
   - Gọi `InventoryManager.DeductFefoAsync` (hoặc xuất kho bán hàng) với số lượng **14 kg**, mã đơn hàng `"ORD-001"`.
3. **Kỳ vọng**:
   - **Lô A** bị trừ hết 10 kg (`RemainingQuantity = 0`).
   - **Lô B** bị trừ 4 kg (`RemainingQuantity = 11`).
   - Sinh 2 bản ghi `InventoryTransaction` loại `OUT`:
     - Bản ghi 1: 10 kg từ Lô A, `ReferenceId: "ORD-001"`.
     - Bản ghi 2: 4 kg từ Lô B, `ReferenceId: "ORD-001"`.

---

### Kịch bản 3: Tự động bỏ qua Lô đồ tươi sống FRESH đã quá hạn
1. **Chuẩn bị**:
   - Nguyên liệu **Sữa Tươi** (`StorageType.FRESH`):
     - Lô 1: Đã hết hạn hôm qua (`ExpiryDate < Now`), còn 5 lít.
     - Lô 2: Còn hạn 3 ngày tới, còn 10 lít.
2. **Thao tác**:
   - Xuất 4 lít Sữa Tươi cho đơn hàng chế biến bánh.
3. **Kỳ vọng**:
   - Thuật toán FEFO hoàn toàn bỏ qua Lô 1 (giữ nguyên tồn 5 lít của Lô 1 để chờ hủy).
   - Lô 2 bị trừ 4 lít (còn lại 6 lít).
   - API `GetAlertsAsync` hiển thị cảnh báo `EXPIRED_FRESH` (mức độ `danger`) cho Lô 1.

---

### Kịch bản 4: Kiểm kê kho & Điều chỉnh Sai lệch thực tế (US4)
1. **Chuẩn bị**:
   - Nguyên liệu **Muối Ăn** có tồn hệ thống 20 kg (ở Lô M1).
2. **Thao tác (Thiếu hụt)**:
   - Thủ kho kiểm kê thực tế chỉ thấy còn 15 kg (thiếu 5 kg).
   - Gửi yêu cầu `POST /api/app/inventory/stock-adjustment`:
     - `actualQuantity: 15`
     - `reason: "Bao muối bị thủng rơi vãi"`
     - `batchDeductions: [{ batchId: M1, deductQuantity: 5 }]`
3. **Kỳ vọng**:
   - Lô M1 giảm từ 20 kg xuống còn 15 kg.
   - Sinh giao dịch `ADJUSTMENT_OUT` với số lượng 5 kg kèm lý do giải trình.

---

### Kịch bản 5: Xuất hủy lô hàng hư hỏng (Manual Discard) (US6)
1. **Thao tác**:
   - Gọi `POST /api/app/inventory/batches/{lô-sữa-hết-hạn}/discard` với `reason: "Sữa chua lên men, đổ bỏ"`.
2. **Kỳ vọng**:
   - Lô sữa được cập nhật `RemainingQuantity = 0`, `IsActive = false`.
   - Sinh giao dịch `ADJUSTMENT_OUT` với số lượng 5 lít và người thực hiện được ghi nhận đầy đủ.
   - Lô hàng không còn xuất hiện trong danh sách khả dụng của kho.
