using System;
using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace Acme.TooHungry.Tables;

public class NullTableRealtimeNotifier : ITableRealtimeNotifier, ITransientDependency
{
    public Task NotifyTableStatusChangedAsync(Guid tableId, TableStatus newStatus, string? tableName = null, Guid? diningAreaId = null)
    {
        return Task.CompletedTask;
    }

    public Task NotifyTableOrderUpdatedAsync(Guid tableId, bool hasActiveOrder, Guid? orderId = null)
    {
        return Task.CompletedTask;
    }
}
