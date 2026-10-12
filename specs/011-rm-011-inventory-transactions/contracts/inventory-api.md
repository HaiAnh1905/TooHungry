# Hợp đồng Giao diện Lập trình Ứng dụng (API Contracts): RM-011 Quản lý Tồn kho & Giao dịch

**Tính năng**: `RM-011 — Quản lý Tồn kho & Giao dịch`  
**Ngày**: 2026-10-09  
**Trạng thái**: Hoàn thành  

---

## 1. REST Endpoints (`/api/app/inventory`)

Tất cả các API yêu cầu xác thực (`[Authorize]`) và kiểm tra phân quyền chi tiết theo `TooHungryPermissions.Inventories`.

### 1.1. Lấy danh sách lô hàng phân trang
- **Endpoint**: `GET /api/app/inventory/batches`
- **Quyền yêu cầu**: `TooHungryPermissions.Inventories.Default`
- **Query Parameters**:
  - `ingredientId` (Guid?, tùy chọn): Lọc theo nguyên liệu
  - `onlyAvailable` (bool, mặc định `true`): Chỉ lấy lô còn hàng (`RemainingQuantity > 0` và `IsActive = true`)
  - `sorting` (string, tùy chọn): Mặc định `ExpiryDate asc, ReceivedAt asc` (chuẩn FEFO)
  - `skipCount` (int), `maxResultCount` (int)
- **Response**: `200 OK`
  ```json
  {
    "totalCount": 42,
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "ingredientId": "7bb7291a-7b3b-4861-a1e6-b97c8651c6b1",
        "ingredientName": "Cá Hồi Na Uy",
        "batchCode": "BATCH-20261009-01",
        "quantity": 10.0000,
        "remainingQuantity": 6.5000,
        "purchaseUnit": "Thùng",
        "conversionFactor": 5.0000,
        "receivedAt": "2026-10-09T08:00:00Z",
        "expiryDate": "2026-10-12T00:00:00Z",
        "unitCost": 350000.00,
        "storageType": 1,
        "isExpired": false,
        "isExpiringToday": false,
        "isNearExpiry": true,
        "isActive": true
      }
    ]
  }
  ```

---

### 1.2. Tạo mới lô nhập kho (Batch Inbound)
- **Endpoint**: `POST /api/app/inventory/batches`
- **Quyền yêu cầu**: `TooHungryPermissions.Inventories.Create`
- **Request Body**:
  ```json
  {
    "ingredientId": "7bb7291a-7b3b-4861-a1e6-b97c8651c6b1",
    "batchCode": "BATCH-20261009-02",
    "purchaseQuantity": 5.0,
    "purchaseUnit": "Thùng",
    "conversionFactor": 10.0,
    "expiryDate": "2026-10-15T00:00:00Z",
    "supplierId": "e2a27ffb-3dfa-4934-8c85-6d73f4bc3921",
    "unitCost": 280000.00
  }
  ```
- **Hành vi xử lý**:
  - Tự động tính: `BaseQuantity = purchaseQuantity * conversionFactor` (5 × 10 = 50 kg).
  - Tự động sinh `InventoryTransaction` loại `IN` với số lượng 50 kg, `UnitCost = 280,000đ`, `Reason = "Nhập kho theo lô"`.
- **Response**: `200 OK` (Trả về `InventoryBatchDto` mới tạo).

---

### 1.3. Kiểm kê & Điều chỉnh tồn kho (Stock Adjustment)
- **Endpoint**: `POST /api/app/inventory/stock-adjustment`
- **Quyền yêu cầu**: `TooHungryPermissions.Inventories.Adjust` (Chỉ Manager & Admin)
- **Request Body**:
  ```json
  {
    "ingredientId": "7bb7291a-7b3b-4861-a1e6-b97c8651c6b1",
    "actualQuantity": 4.5,
    "reason": "Hao hụt rách bao bì khi sắp xếp kho",
    "batchDeductions": [
      {
        "batchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "deductQuantity": 2.0
      }
    ]
  }
  ```
- **Hành vi xử lý**:
  - Tính `Difference = actualQuantity - systemQuantity`.
  - Nếu thiếu (`Difference < 0`): Kiểm tra `batchDeductions` khớp chính xác mức chênh lệch âm; trừ từng lô và sinh giao dịch `ADJUSTMENT_OUT` kèm `UnitCost` của lô.
  - Nếu thừa (`Difference > 0`): Tự động sinh lô hàng điều chỉnh `ADJ-yyyyMMddHHmmss` và sinh giao dịch `ADJUSTMENT_IN`.
- **Response**: `204 No Content`.

---

### 1.4. Lấy danh sách cảnh báo tồn kho (Inventory Alerts)
- **Endpoint**: `GET /api/app/inventory/alerts`
- **Quyền yêu cầu**: `TooHungryPermissions.Inventories.Default`
- **Response**: `200 OK`
  ```json
  [
    {
      "alertType": "EXPIRED_FRESH",
      "severity": "danger",
      "ingredientId": "7bb7291a-7b3b-4861-a1e6-b97c8651c6b1",
      "ingredientName": "Cá Hồi Na Uy",
      "batchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "batchCode": "BATCH-OLD",
      "message": "Lô hàng Cá Hồi Na Uy đã quá hạn sử dụng, yêu cầu xuất hủy ngay lập tức!",
      "timestamp": "2026-10-09T08:30:00Z"
    },
    {
      "alertType": "EXPIRING_TODAY",
      "severity": "warning",
      "ingredientId": "4cc91234-7b3b-4861-a1e6-b97c8651c6b2",
      "ingredientName": "Sữa Tươi Thanh Trùng",
      "batchId": "5da91234-5717-4562-b3fc-2c963f66afa7",
      "batchCode": "MILK-01",
      "message": "Lô Sữa Tươi Thanh Trùng hết hạn trong vòng 24h, ưu tiên xuất dùng trước!",
      "timestamp": "2026-10-09T08:30:00Z"
    }
  ]
  ```

---

### 1.5. Lấy lịch sử giao dịch tồn kho theo nguyên liệu
- **Endpoint**: `GET /api/app/inventory/transactions/{ingredientId}`
- **Quyền yêu cầu**: `TooHungryPermissions.Inventories.Default`
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "1fa85f64-5717-4562-b3fc-2c963f66afa1",
      "ingredientId": "7bb7291a-7b3b-4861-a1e6-b97c8651c6b1",
      "ingredientName": "Cá Hồi Na Uy",
      "batchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "batchCode": "BATCH-20261009-01",
      "transactionType": 2,
      "quantity": 1.5000,
      "unitCost": 350000.00,
      "reason": "Recipe Consumption",
      "referenceId": "ORD-20261009-003",
      "creationTime": "2026-10-09T11:45:00Z",
      "creatorId": "9ee85f64-5717-4562-b3fc-2c963f66afa9"
    }
  ]
  ```

---

### 1.6. Tiêu hủy lô hàng quá hạn / hư hỏng (Discard Batch)
- **Endpoint**: `POST /api/app/inventory/batches/{id}/discard`
- **Quyền yêu cầu**: `TooHungryPermissions.Inventories.Discard` (Chỉ Manager & Admin)
- **Request Body**:
  ```json
  {
    "reason": "Hàng tươi sống quá hạn, kiểm tra thực tế thấy hư hỏng"
  }
  ```
- **Hành vi xử lý**:
  - Cập nhật `InventoryBatch.RemainingQuantity = 0`, `IsActive = false`.
  - Tự động sinh `InventoryTransaction` loại `ADJUSTMENT_OUT` với số lượng bị hủy và `UnitCost` của lô đó.
- **Response**: `204 No Content`.

---

## 2. Hợp đồng Tầng Miền Nội bộ (Internal Domain Service Contract)

Phương thức được các phân hệ bán hàng POS (RM-010) và Thanh toán (RM-016) gọi trực tiếp:

```csharp
public class InventoryManager : DomainService
{
    /// <summary>
    /// Khấu trừ nguyên liệu theo thuật toán FEFO.
    /// Tự động bỏ qua các lô đồ tươi sống FRESH quá hạn.
    /// Nếu thiếu kho, trừ hết về 0 và trả về ShortageQuantity (không làm âm kho).
    /// </summary>
    public virtual async Task<DeductionResult> DeductFefoAsync(
        Guid ingredientId, 
        decimal requiredQuantity, 
        string referenceId);
}
```
