# Thiết kế Mô hình Dữ liệu & Lược đồ: RM-010 POS / Đơn hàng

**Tính năng**: `RM-010 — POS / Đơn hàng (POS Ordering & Dining Session Management)`  
**Ngày**: 2026-10-09  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Các Enum (Domain.Shared)

### `OrderStatus`
Định nghĩa vòng đời trạng thái của đơn hàng trong hệ thống:
Không gian tên: `Acme.TooHungry.Orders` (trong `Acme.TooHungry.Domain.Shared`)

```csharp
namespace Acme.TooHungry.Orders;

public enum OrderStatus
{
    Pending = 0,     // Đơn hàng đang hoạt động trong phiên ăn, chưa thanh toán (Waiter có toàn quyền sửa/thêm/bớt)
    Processing = 1,  // Đơn hàng đang được phục vụ
    Completed = 2,   // Đơn hàng đã hoàn tất thanh toán (RM-016), bàn chuyển sang dọn dẹp (Cleaning)
    Cancelled = 3    // Đơn hàng đã bị hủy bỏ bởi nhân viên phục vụ/quản lý
}
```

---

## 2. Các Thực thể Cốt lõi (Domain Layer)

### `Order` (`FullAuditedAggregateRoot<Guid>`)
Đại diện cho phiên đơn hàng của một bàn ăn hoặc đơn mang về:

```csharp
namespace Acme.TooHungry.Orders;

public class Order : FullAuditedAggregateRoot<Guid>
{
    /// <summary>
    /// Mã đơn hàng hiển thị (Ví dụ: ORD-20261009-001)
    /// </summary>
    public string OrderNumber { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm khởi tạo đơn hàng
    /// </summary>
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Trạng thái đơn hàng (Mặc định: Pending)
    /// </summary>
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    /// <summary>
    /// Tổng tiền toàn bộ đơn hàng (Tổng thành tiền của tất cả OrderItem)
    /// </summary>
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Ghi chú chung cho toàn bộ đơn hàng
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// Khóa ngoại liên kết tới bàn ăn đang phục vụ
    /// </summary>
    public Guid? TableId { get; set; }

    /// <summary>
    /// Navigation property tới thực thể bàn ăn
    /// </summary>
    public virtual RestaurantTable? Table { get; set; }

    /// <summary>
    /// Danh sách các món ăn trong đơn hàng
    /// </summary>
    public virtual ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
```

### `OrderItem` (`FullAuditedEntity<Guid>`)
Đại diện cho từng món ăn và số lượng được gọi trong đơn hàng:

```csharp
namespace Acme.TooHungry.Orders;

public class OrderItem : FullAuditedEntity<Guid>
{
    public OrderItem() { }

    public OrderItem(Guid id) : base(id) { }

    /// <summary>
    /// Khóa ngoại liên kết tới Order cha
    /// </summary>
    public Guid OrderId { get; set; }

    public virtual Order? Order { get; set; }

    /// <summary>
    /// Khóa ngoại liên kết tới món ăn bán trong thực đơn
    /// </summary>
    public Guid DishId { get; set; }

    public virtual Dish? Dish { get; set; }

    /// <summary>
    /// Số lượng món được gọi (Bắt buộc > 0)
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// Đơn giá niêm yết tại thời điểm gọi món
    /// </summary>
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Thành tiền = Quantity * UnitPrice
    /// </summary>
    public decimal TotalPrice { get; set; }

    /// <summary>
    /// Ghi chú chế biến tùy chỉnh cho món ăn (Ví dụ: "ít cay", "không hành")
    /// </summary>
    public string? Note { get; set; }
}
```

---

## 3. Các Quy tắc Bất biến & Ràng buộc (Invariants & Constraints)

1. **Quy tắc Duy nhất một Active Order cho mỗi Bàn (Filtered Unique Index)**:
   - Trong cùng một thời điểm, một bàn ăn (`TableId`) chỉ được phép có tối đa một bản ghi `Order` ở trạng thái `Status == OrderStatus.Pending`.
   - Cấu hình EF Core:
     ```csharp
     b.HasIndex(x => x.TableId)
      .IsUnique()
      .HasFilter("[TableId] IS NOT NULL AND [Status] = 0 AND [IsDeleted] = 0");
     ```
2. **Bất biến Thành tiền & Tổng tiền (Financial Precision Invariant)**:
   - `OrderItem.TotalPrice` bắt buộc phải bằng `Quantity * UnitPrice`.
   - `Order.TotalAmount` bắt buộc phải bằng tổng `TotalPrice` của toàn bộ các `OrderItem` đang có trong đơn:
     $$\text{TotalAmount} = \sum_{i \in \text{Items}} (\text{Quantity}_i \times \text{UnitPrice}_i)$$
3. **Bất biến Kiểm tra Tồn kho Công thức (Recipe Stock Invariant)**:
   - Khi tăng số lượng hoặc gửi đơn, nếu món ăn có công thức đang hoạt động (`Recipe.IsActive = true`), tổng số lượng nguyên liệu cần thiết không được vượt quá số lượng tồn kho khả dụng hiện tại:
     $$\text{RequiredQty}_j = \text{BaseQtyPerDish}_j \times \text{ItemQuantity} \le \text{CurrentStock}_j$$
   - Nếu vi phạm: Hệ thống ném ra `BusinessException` và chặn đứng giao dịch lưu đơn.
4. **Bất biến Giỏ hàng Rỗng (Empty Cart Invariant)**:
   - Nút `[Đặt đơn]` bị vô hiệu hóa khi đơn hàng có 0 món ăn.
   - Để hủy đơn của một phiên ăn, bắt buộc chuyển trạng thái `Order.Status = OrderStatus.Cancelled` thông qua API hủy đơn chuyên biệt.

---

## 4. Các Hợp đồng DTOs (Application.Contracts)

```csharp
namespace Acme.TooHungry.Orders;

public class OrderDto : AuditedEntityDto<Guid>
{
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public OrderStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public Guid? TableId { get; set; }
    public string? TableName { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}

public class OrderItemDto : EntityDto<Guid>
{
    public Guid OrderId { get; set; }
    public Guid DishId { get; set; }
    public string? DishName { get; set; }
    public string? DishPhotoUrl { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Note { get; set; }
}

public class SubmitOrderInputDto
{
    public Guid? OrderId { get; set; }
    public Guid TableId { get; set; }
    public string? Note { get; set; }
    public List<SubmitOrderItemDto> Items { get; set; } = new();
}

public class SubmitOrderItemDto
{
    public Guid DishId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Note { get; set; }
}

public class CancelOrderInputDto
{
    public Guid OrderId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ValidateOrderStockInputDto
{
    public List<SubmitOrderItemDto> Items { get; set; } = new();
}

public class StockValidationResultDto
{
    public bool IsValid { get; set; }
    public List<StockShortageItemDto> Shortages { get; set; } = new();
}

public class StockShortageItemDto
{
    public Guid DishId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string IngredientName { get; set; } = string.Empty;
    public decimal RequiredQuantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public string UnitName { get; set; } = string.Empty;
}
```
