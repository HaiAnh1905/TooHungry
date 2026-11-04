using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Users;
using Acme.TooHungry.Tables;

namespace Acme.TooHungry.Hubs;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(ITableRealtimeNotifier))]
public class TableRealtimeNotifier : ITableRealtimeNotifier, ITransientDependency
{
    private readonly IHubContext<TableHub> _hubContext;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<TableRealtimeNotifier> _logger;

    public TableRealtimeNotifier(
        IHubContext<TableHub> hubContext, 
        ICurrentUser currentUser,
        ILogger<TableRealtimeNotifier> logger)
    {
        _hubContext = hubContext;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task NotifyTableStatusChangedAsync(
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
        var role = performedByRole;
        if (string.IsNullOrEmpty(role) && _currentUser.Roles != null && _currentUser.Roles.Length > 0)
        {
            if (_currentUser.Roles.Any(r => string.Equals(r, "Waiter", StringComparison.OrdinalIgnoreCase))) role = "Waiter";
            else if (_currentUser.Roles.Any(r => string.Equals(r, "Cashier", StringComparison.OrdinalIgnoreCase))) role = "Cashier";
            else if (_currentUser.Roles.Any(r => string.Equals(r, "Manager", StringComparison.OrdinalIgnoreCase))) role = "Manager";
            else if (_currentUser.Roles.Any(r => string.Equals(r, "Administrator", StringComparison.OrdinalIgnoreCase) || string.Equals(r, "admin", StringComparison.OrdinalIgnoreCase))) role = "Administrator";
        }

        var name = performedByName ?? _currentUser.Name ?? _currentUser.UserName ?? string.Empty;

        _logger.LogInformation(">>> [SignalR BROADCAST] TableStatusChanged: TableId={TableId}, Name={TableName}, Status={Status}, Action={Action}, PerformedBy={Role} ({Name})",
            tableId, tableName, newStatus, actionType, role, name);

        await _hubContext.Clients.All.SendAsync("TableStatusChanged", new TableStatusChangedDto
        {
            TableId = tableId,
            TableName = tableName ?? string.Empty,
            DiningAreaId = diningAreaId,
            Status = newStatus,
            StatusName = newStatus.ToString(),
            OccupiedTime = occupiedTime,
            UpdatedTime = DateTime.UtcNow,
            ActionType = actionType,
            PerformedByRole = role,
            PerformedByName = name,
            PerformedByUserId = _currentUser.Id,
            ReservedCustomerName = reservedCustomerName,
            ReservedCustomerPhone = reservedCustomerPhone,
            ReservedTime = reservedTime,
            ReservedGuestCount = reservedGuestCount,
            ReservedNote = reservedNote,
            SourceTableName = sourceTableName,
            TargetTableName = targetTableName
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

    public async Task NotifyOrderPlacedOrUpdatedAsync(OrderPlacedOrUpdatedDto dto)
    {
        dto.WaiterId ??= _currentUser.Id;
        await _hubContext.Clients.All.SendAsync("OrderPlacedOrUpdated", dto);
    }

    public async Task NotifyBillRequestedAsync(BillRequestedDto dto)
    {
        dto.WaiterId ??= _currentUser.Id;
        await _hubContext.Clients.All.SendAsync("BillRequested", dto);
    }

    public async Task NotifyPaymentCompletedAsync(PaymentCompletedDto dto)
    {
        dto.CashierId ??= _currentUser.Id;
        _logger.LogInformation(">>> [SignalR BROADCAST] PaymentCompleted: Table={Table}, Amount={Amount}, Cashier={Cashier} ({CashierId})",
            dto.TableNumber, dto.PaidAmount, dto.CashierName, dto.CashierId);
        await _hubContext.Clients.All.SendAsync("PaymentCompleted", dto);
    }
}
