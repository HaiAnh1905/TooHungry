using System;
using System.Threading.Tasks;

namespace Acme.TooHungry.Tables;

public class TableStatusChangedDto
{
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public Guid? DiningAreaId { get; set; }
    public TableStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime? OccupiedTime { get; set; }
    public DateTime UpdatedTime { get; set; } = DateTime.UtcNow;
    public string? ActionType { get; set; }
    public string? PerformedByRole { get; set; }
    public string? PerformedByName { get; set; }
    public Guid? PerformedByUserId { get; set; }
    public string? ReservedCustomerName { get; set; }
    public string? ReservedCustomerPhone { get; set; }
    public DateTime? ReservedTime { get; set; }
    public int? ReservedGuestCount { get; set; }
    public string? ReservedNote { get; set; }
    public string? SourceTableName { get; set; }
    public string? TargetTableName { get; set; }
}

public class TableOrderUpdatedDto
{
    public Guid TableId { get; set; }
    public bool HasActiveOrder { get; set; }
    public Guid? ActiveOrderId { get; set; }
}

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
    public Guid? WaiterId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class BillRequestedDto
{
    public Guid TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public Guid OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string? WaiterName { get; set; }
    public Guid? WaiterId { get; set; }
    public DateTime RequestedTime { get; set; } = DateTime.UtcNow;
}

public class PaymentCompletedDto
{
    public Guid OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public Guid TableId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public string PaymentMethod { get; set; } = "CASH"; // "CASH" | "VIETQR"
    public string CashierName { get; set; } = string.Empty;
    public Guid? CashierId { get; set; }
    public DateTime CompletedTime { get; set; } = DateTime.UtcNow;
}

public interface ITableRealtimeNotifier
{
    Task NotifyTableStatusChangedAsync(
        Guid tableId, 
        TableStatus newStatus, 
        string? tableName = null, 
        Guid? diningAreaId = null, 
        DateTime? occupiedTime = null,
        string? actionType = null,
        string? performedByRole = null,
        string? performedByName = null,
        string? reservedCustomerName = null,
        string? reservedCustomerPhone = null,
        DateTime? reservedTime = null,
        int? reservedGuestCount = null,
        string? reservedNote = null,
        string? sourceTableName = null,
        string? targetTableName = null);
    Task NotifyTableOrderUpdatedAsync(Guid tableId, bool hasActiveOrder, Guid? orderId = null);
    Task NotifyOrderPlacedOrUpdatedAsync(OrderPlacedOrUpdatedDto dto);
    Task NotifyBillRequestedAsync(BillRequestedDto dto);
    Task NotifyPaymentCompletedAsync(PaymentCompletedDto dto);
}

