using System;
using Acme.TooHungry.Tables;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Cashier;

public class CashierShiftSummaryDto
{
    public string CashierName { get; set; } = string.Empty;
    public DateTime ShiftStartTime { get; set; } = DateTime.UtcNow;
    public decimal TotalRevenue { get; set; }
    public int ActiveTableCount { get; set; }
    public int PendingOrderCount { get; set; }
    public int BillRequestedCount { get; set; }
}

public class CashierTableDto : EntityDto<Guid>
{
    public string TableNumber { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public TableStatus Status { get; set; }
    public Guid? DiningAreaId { get; set; }
    public string DiningAreaName { get; set; } = string.Empty;
    public int? OccupiedDurationMinutes { get; set; }
    public Guid? ActiveOrderId { get; set; }
    public string? ActiveOrderCode { get; set; }
    public decimal TemporaryTotalAmount { get; set; }
    public bool IsBillRequested { get; set; }
    public string? AssignedWaiterName { get; set; }
    public string? ReservedCustomerName { get; set; }
    public string? ReservedCustomerPhone { get; set; }
    public DateTime? ReservedTime { get; set; }
    public int? ReservedGuestCount { get; set; }
    public string? ReservedNote { get; set; }
}

public class GetCashierTablesInputDto
{
    public Guid? DiningAreaId { get; set; }
    public TableStatus? Status { get; set; }
    public string? SearchKeyword { get; set; }
}

public class GetCashierOrdersInputDto : PagedAndSortedResultRequestDto
{
    public string? StatusGroup { get; set; } // "Pending" | "Processing" | "BillRequested" | "Completed"
    public string? SearchKeyword { get; set; }
}
