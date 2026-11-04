using System;
using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace Acme.TooHungry.Tables;

public class NullTableRealtimeNotifier : ITableRealtimeNotifier, ITransientDependency
{
    public Task NotifyTableStatusChangedAsync(
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
        string? targetTableName = null)
    {
        return Task.CompletedTask;
    }

    public Task NotifyTableOrderUpdatedAsync(Guid tableId, bool hasActiveOrder, Guid? orderId = null)
    {
        return Task.CompletedTask;
    }

    public Task NotifyOrderPlacedOrUpdatedAsync(OrderPlacedOrUpdatedDto dto)
    {
        return Task.CompletedTask;
    }

    public Task NotifyBillRequestedAsync(BillRequestedDto dto)
    {
        return Task.CompletedTask;
    }

    public Task NotifyPaymentCompletedAsync(PaymentCompletedDto dto)
    {
        return Task.CompletedTask;
    }
}
