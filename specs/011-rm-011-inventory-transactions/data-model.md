# Mô hình Dữ liệu & Thiết kế Thực thể (Data Model): RM-011 Quản lý Tồn kho & Giao dịch

**Tính năng**: `RM-011 — Quản lý Tồn kho & Giao dịch`  
**Ngày**: 2026-10-09  
**Trạng thái**: Hoàn thành  

---

## 1. Mô hình Miền (Domain Entities)

### 1.1. `InventoryBatch` (Aggregate Root)
Đại diện cho một lô hàng nhập cụ thể của một nguyên liệu trong kho.

```csharp
namespace Acme.TooHungry.Inventories;

public class InventoryBatch : FullAuditedAggregateRoot<Guid>
{
    public Guid IngredientId { get; set; }                    // Khóa ngoại tham chiếu Ingredient
    public string BatchCode { get; set; } = string.Empty;     // Mã lô hàng (tự sinh hoặc tem NCC)
    public decimal Quantity { get; set; }                     // Số lượng nhập ban đầu (theo BaseUnit)
    public decimal RemainingQuantity { get; set; }            // Số lượng tồn còn lại hiện tại (theo BaseUnit)
    public string PurchaseUnit { get; set; } = string.Empty;  // Đơn vị đo lường lúc mua vào (Thùng, Két...)
    public decimal ConversionFactor { get; set; } = 1.0m;     // Tỷ lệ quy đổi: 1 PurchaseUnit = n BaseUnit
    public DateTime ReceivedAt { get; set; }                  // Thời điểm nhập kho
    public DateTime ExpiryDate { get; set; }                  // Hạn sử dụng của lô hàng
    public Guid? SupplierId { get; set; }                     // Mã nhà cung cấp (tùy chọn)
    public decimal UnitCost { get; set; }                     // Giá vốn mua vào cho 1 đơn vị
    public bool IsActive { get; set; } = true;                // Trạng thái hoạt động của lô

    // Navigation property
    public Ingredient? Ingredient { get; set; }

    // Domain Methods
    public decimal DeductQuantity(decimal amount);
    public void IncreaseQuantity(decimal amount);
    public void Discard();
}
```

### 1.2. `InventoryTransaction` (Entity)
Nhật ký biến động kho bất biến phục vụ kiểm toán và truy vết lịch sử (Audit Trail).

```csharp
namespace Acme.TooHungry.Inventories;

public class InventoryTransaction : CreationAuditedEntity<Guid>
{
    public Guid IngredientId { get; set; }                     // Nguyên liệu phát sinh biến động
    public Guid? BatchId { get; set; }                         // Lô hàng liên quan trực tiếp
    public InventoryTransactionType TransactionType { get; set; } // Loại biến động (IN, OUT, ADJUSTMENT...)
    public decimal Quantity { get; set; }                      // Số lượng biến động (BaseUnit)
    public decimal UnitCost { get; set; }                      // Đơn giá vốn của lô tại thời điểm giao dịch
    public string Reason { get; set; } = string.Empty;         // Lý do biến động
    public string? ReferenceId { get; set; }                   // Mã tham chiếu (OrderId, PO number...)

    // Navigation properties
    public Ingredient? Ingredient { get; set; }
    public InventoryBatch? Batch { get; set; }
}
```

---

## 2. Enums & Cấu trúc Trợ giúp (Enums & Supporting Types)

### 2.1. `InventoryTransactionType`
```csharp
namespace Acme.TooHungry.Inventories;

public enum InventoryTransactionType
{
    IN = 1,             // Nhập kho từ nhà cung cấp / tạo lô hàng mới
    OUT = 2,            // Xuất kho tiêu hao theo công thức POS hoặc xuất bếp
    ADJUSTMENT_IN = 3,  // Điều chỉnh tăng khi kiểm kê thực tế thừa
    ADJUSTMENT_OUT = 4  // Điều chỉnh giảm khi kiểm kê thực tế thiếu hụt hoặc xuất hủy
}
```

### 2.2. `DeductionResult`
Kết quả trả về từ thuật toán khấu trừ kho FEFO trong Domain Service.

```csharp
namespace Acme.TooHungry.Inventories;

public class DeductionResult
{
    public decimal TotalDeducted { get; set; }       // Tổng số lượng thực tế đã trừ từ các lô
    public decimal ShortageQuantity { get; set; }    // Số lượng còn thiếu hụt nếu kho không đủ
    public bool HasShortage => ShortageQuantity > 0; // Cờ báo hiệu có bị thiếu hàng hay không
}
```

---

## 3. Data Transfer Objects (DTOs)

### 3.1. DTO Quản lý Lô hàng (`InventoryBatchDto`)
```csharp
public class InventoryBatchDto : FullAuditedEntityDto<Guid>
{
    public Guid IngredientId { get; set; }
    public string IngredientName { get; set; } = string.Empty;
    public string BatchCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal RemainingQuantity { get; set; }
    public string PurchaseUnit { get; set; } = string.Empty;
    public decimal ConversionFactor { get; set; }
    public DateTime ReceivedAt { get; set; }
    public DateTime ExpiryDate { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal UnitCost { get; set; }
    public StorageType StorageType { get; set; }
    public bool IsExpired => ExpiryDate < DateTime.UtcNow;
    public bool IsExpiringToday => !IsExpired && ExpiryDate <= DateTime.UtcNow.AddHours(24);
    public bool IsNearExpiry => !IsExpired && !IsExpiringToday && ExpiryDate <= DateTime.UtcNow.AddDays(3);
    public bool IsActive { get; set; }
}

public class CreateInventoryBatchDto
{
    public Guid IngredientId { get; set; }
    public string? BatchCode { get; set; }
    public decimal PurchaseQuantity { get; set; }
    public string? PurchaseUnit { get; set; }
    public decimal ConversionFactor { get; set; } = 1.0m;
    public DateTime? ExpiryDate { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal UnitCost { get; set; }
}

public class GetInventoryBatchesInput : PagedAndSortedResultRequestDto
{
    public Guid? IngredientId { get; set; }
    public bool OnlyAvailable { get; set; } = true;
}
```

### 3.2. DTO Kiểm kê & Điều chỉnh Tồn kho (`StockAdjustmentRequestDto`)
```csharp
public class StockAdjustmentRequestDto
{
    public Guid IngredientId { get; set; }
    public decimal ActualQuantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public List<BatchDeductionItemDto>? BatchDeductions { get; set; }
}

public class BatchDeductionItemDto
{
    public Guid BatchId { get; set; }
    public decimal DeductQuantity { get; set; }
}
```

### 3.3. DTO Cảnh báo Tồn kho (`InventoryAlertDto`)
```csharp
public class InventoryAlertDto
{
    public string AlertType { get; set; } = string.Empty; // "EXPIRED_FRESH", "EXPIRING_TODAY", "NEAR_EXPIRY", "OUT_OF_STOCK"
    public string Severity { get; set; } = "warning";     // "danger", "warning", "info"
    public Guid IngredientId { get; set; }
    public string IngredientName { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
```

### 3.4. DTO Lịch sử Giao dịch Tồn kho (`InventoryTransactionDto`)
```csharp
public class InventoryTransactionDto : CreationAuditedEntityDto<Guid>
{
    public Guid IngredientId { get; set; }
    public string IngredientName { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchCode { get; set; }
    public InventoryTransactionType TransactionType { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? ReferenceId { get; set; }
}
```

---

## 4. Cấu hình EF Core & Chỉ mục Cơ sở dữ liệu (Indexes)

Trong `TooHungryDbContextModelCreatingExtensions.cs`:

```csharp
builder.Entity<InventoryBatch>(b =>
{
    b.ToTable(TooHungryConsts.DbTablePrefix + "InventoryBatches", TooHungryConsts.DbSchema);
    b.ConfigureByConvention();

    b.Property(x => x.BatchCode).IsRequired().HasMaxLength(100);
    b.Property(x => x.PurchaseUnit).IsRequired().HasMaxLength(50);
    b.Property(x => x.Quantity).HasPrecision(18, 4);
    b.Property(x => x.RemainingQuantity).HasPrecision(18, 4);
    b.Property(x => x.ConversionFactor).HasPrecision(18, 4);
    b.Property(x => x.UnitCost).HasPrecision(18, 2);

    // Composite Index tối ưu hóa truy vấn FEFO
    b.HasIndex(x => new { x.IngredientId, x.IsActive, x.RemainingQuantity, x.ExpiryDate });
});

builder.Entity<InventoryTransaction>(b =>
{
    b.ToTable(TooHungryConsts.DbTablePrefix + "InventoryTransactions", TooHungryConsts.DbSchema);
    b.ConfigureByConvention();

    b.Property(x => x.Quantity).HasPrecision(18, 4);
    b.Property(x => x.UnitCost).HasPrecision(18, 2);
    b.Property(x => x.Reason).IsRequired().HasMaxLength(256);
    b.Property(x => x.ReferenceId).HasMaxLength(128);

    // Index cho truy vấn lịch sử theo nguyên liệu và thời gian
    b.HasIndex(x => new { x.IngredientId, x.CreationTime });
});
```

---

## 5. Các Ràng buộc Bất biến (Business Invariants)

1. **Không âm kho (`RemainingQuantity >= 0`)**: Số lượng còn lại của một lô hàng không bao giờ được phép nhỏ hơn 0.
2. **Tỷ lệ quy đổi dương (`ConversionFactor > 0`)**: Tỷ lệ quy đổi từ đơn vị mua sang đơn vị cơ sở bắt buộc phải lớn hơn 0.
3. **Tính toàn vẹn kiểm kê**: Khi điều chỉnh giảm tồn kho (`ActualQuantity < SystemQuantity`), tổng lượng trừ trong danh sách `BatchDeductions` bắt buộc phải khớp chính xác với mức chênh lệch âm: `Math.Abs(difference) == batchDeductions.Sum(x => x.DeductQuantity)`.
4. **Bất biến lịch sử giao dịch**: Bảng `InventoryTransaction` chỉ nhận lệnh `INSERT`, nghiêm cấm cấu hình API hoặc chức năng `UPDATE` / `DELETE` vật lý.
