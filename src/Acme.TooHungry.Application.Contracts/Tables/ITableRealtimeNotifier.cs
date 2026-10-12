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
    public DateTime UpdatedTime { get; set; } = DateTime.UtcNow;
}

public class TableOrderUpdatedDto
{
    public Guid TableId { get; set; }
    public bool HasActiveOrder { get; set; }
    public Guid? ActiveOrderId { get; set; }
}

public interface ITableRealtimeNotifier
{
    Task NotifyTableStatusChangedAsync(Guid tableId, TableStatus newStatus, string? tableName = null, Guid? diningAreaId = null);
    Task NotifyTableOrderUpdatedAsync(Guid tableId, bool hasActiveOrder, Guid? orderId = null);
}
