using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Volo.Abp.DependencyInjection;
using Acme.TooHungry.Tables;

namespace Acme.TooHungry.Hubs;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(ITableRealtimeNotifier))]
public class TableRealtimeNotifier : ITableRealtimeNotifier, ITransientDependency
{
    private readonly IHubContext<TableHub> _hubContext;

    public TableRealtimeNotifier(IHubContext<TableHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyTableStatusChangedAsync(Guid tableId, TableStatus newStatus, string? tableName = null, Guid? diningAreaId = null)
    {
        await _hubContext.Clients.All.SendAsync("TableStatusChanged", new TableStatusChangedDto
        {
            TableId = tableId,
            TableName = tableName ?? string.Empty,
            DiningAreaId = diningAreaId,
            Status = newStatus,
            StatusName = newStatus.ToString(),
            UpdatedTime = DateTime.UtcNow
        });
    }

    public async Task NotifyTableOrderUpdatedAsync(Guid tableId, bool hasActiveOrder, Guid? orderId = null)
    {
        await _hubContext.Clients.All.SendAsync("TableOrderUpdated", new TableOrderUpdatedDto
        {
            TableId = tableId,
            HasActiveOrder = hasActiveOrder,
            ActiveOrderId = orderId
        });
    }
}
