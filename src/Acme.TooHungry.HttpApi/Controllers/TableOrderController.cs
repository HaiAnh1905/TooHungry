using System;
using System.Threading.Tasks;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/table-orders")]
public class TableOrderController : TooHungryController
{
    private readonly IOrderAppService _orderAppService;

    public TableOrderController(IOrderAppService orderAppService)
    {
        _orderAppService = orderAppService;
    }

    [HttpGet("active/{tableId}")]
    [Authorize(TooHungryPermissions.Orders.Default)]
    public virtual Task<OrderDto?> GetActiveOrderByTableIdAsync(Guid tableId)
    {
        return _orderAppService.GetActiveOrderByTableIdAsync(tableId);
    }

    [HttpPost("complete/{tableId}")]
    [Authorize(TooHungryPermissions.Orders.Edit)]
    public virtual Task CompleteActiveOrderByTableIdAsync(Guid tableId)
    {
        return _orderAppService.CompleteActiveOrderByTableIdAsync(tableId);
    }
}
