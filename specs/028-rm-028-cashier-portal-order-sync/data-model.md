# Mô hình Dữ liệu (Data Model): Phân hệ Thu ngân & Đồng bộ Thời gian thực (RM-028)

**Tài liệu tham chiếu**: [spec.md](./spec.md)  
**Mã Tính năng**: `RM-028`

---

## 1. Thực thể Hiện có & Mở rộng (Entities & Aggregate Roots)

### 1.1. `RestaurantTable` (Domain Entity - Kế thừa & Mở rộng)
Thực thể bàn ăn quản lý vòng đời và trạng thái bàn:
```csharp
public class RestaurantTable : FullAuditedAggregateRoot<Guid>
{
    public string TableNumber { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public TableStatus Status { get; set; } // AVAILABLE, OCCUPIED, RESERVED, CLEANING, INACTIVE
    public Guid DiningAreaId { get; set; }
    public DateTime? OccupiedTime { get; set; }
    public Guid? ActiveOrderId { get; set; }
    public decimal CurrentTemporaryTotal { get; set; }
}
```

### 1.2. `Order` & `OrderItem` (Domain Entity - Kế thừa RM-010)
Quản lý thông tin đơn hàng và chi tiết món:
```csharp
public class Order : FullAuditedAggregateRoot<Guid>
{
    public string OrderCode { get; set; } = string.Empty; // e.g. ORD-20261026-001
    public Guid TableId { get; set; }
    public OrderStatus Status { get; set; } // PENDING, PROCESSING, COMPLETED, CANCELLED
    public decimal SubtotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAndServiceAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod? PaymentMethod { get; set; } // CASH, VIETQR, CARD
    public DateTime? PaidTime { get; set; }
    public string? Note { get; set; }
    public List<OrderItem> Items { get; set; } = new();
}
```

---

## 2. DTOs & Sự kiện Thời gian thực (SignalR Real-time Event DTOs)

### 2.1. Sự kiện Trạng thái Bàn (`TableStatusChangedDto`)
Phát khi trạng thái bàn thay đổi (Check-in, Check-out, Dọn bàn):
```csharp
public class TableStatusChangedDto
{
    public Guid TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public Guid? DiningAreaId { get; set; }
    public TableStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime? OccupiedTime { get; set; }
    public string? TriggeredByRole { get; set; } // "Waiter" | "Cashier" | "System"
    public string? TriggeredByUserName { get; set; }
    public DateTime UpdatedTime { get; set; } = DateTime.UtcNow;
}
```

### 2.2. Sự kiện Gọi món / Cập nhật Đơn (`OrderPlacedOrUpdatedDto`)
Phát khi Waiter tạo đơn mới hoặc gọi thêm món cho bàn:
```csharp
public class OrderPlacedOrUpdatedDto
{
    public Guid OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public Guid TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public int TotalItemCount { get; set; }
    public decimal TotalEstimatedAmount { get; set; }
    public string Action { get; set; } = "Placed"; // "Placed" | "ItemsAdded" | "Modified"
    public string? WaiterName { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
```

### 2.3. Sự kiện Yêu cầu Thanh toán (`BillRequestedDto`)
Phát khi Waiter hoặc khách tại bàn yêu cầu thanh toán:
```csharp
public class BillRequestedDto
{
    public Guid TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public Guid OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string? WaiterName { get; set; }
    public DateTime RequestedTime { get; set; } = DateTime.UtcNow;
}
```

### 2.4. Sự kiện Hoàn tất Thanh toán (`PaymentCompletedDto`)
Phát khi Thu ngân xác nhận thu tiền thành công:
```csharp
public class PaymentCompletedDto
{
    public Guid OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public Guid TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public string PaymentMethod { get; set; } = "CASH"; // "CASH" | "VIETQR"
    public string CashierName { get; set; } = string.Empty;
    public DateTime CompletedTime { get; set; } = DateTime.UtcNow;
}
```

---

## 3. Máy Trạng thái Vận hành (Operational State Machine)

```text
                  [Bàn Trống - AVAILABLE]
                             │
            Check-in đón khách (Waiter hoặc Cashier)
                             ▼
                 [Có Khách - OCCUPIED]
                             │
               Gọi món / Mở đơn hàng (Order Placed)
                             ▼
                   [Đang Phục vụ - ORDERED]
                             │
            Yêu cầu thanh toán (Bill Requested by Waiter)
                             ▼
                [Chờ Thanh toán - BILL_REQUESTED]
                             │
            Thanh toán thành công (Cashier Checkout & Trừ kho FEFO)
                             ▼
                [Chờ Dọn dẹp - CLEANING]
                             │
                 Dọn bàn xong (Waiter Finish Cleaning)
                             ▼
                  [Bàn Trống - AVAILABLE]
```

---

## 4. Mô hình Trạng thái Phía Frontend Angular (Angular State Models)

### 4.1. `CashierShiftSummary` (Tổng quan Ca trực)
```typescript
export interface CashierShiftSummary {
  cashierName: string;
  shiftStartTime: string;
  totalRevenue: number;
  activeTableCount: number;
  pendingOrderCount: number;
  billRequestedCount: number;
}
```

### 4.2. `CashierTableCard` (Thẻ Bàn dành cho Cashier)
```typescript
export interface CashierTableCard {
  id: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  diningAreaId: string;
  diningAreaName: string;
  occupiedDurationMinutes?: number;
  activeOrderId?: string;
  activeOrderCode?: string;
  temporaryTotalAmount: number;
  isBillRequested: boolean;
  assignedWaiterName?: string;
}
```
