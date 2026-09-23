using System;
using System.Threading.Tasks;
using Acme.TooHungry.Orders;
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
    public virtual Task<OrderDto?> GetActiveOrderByTableIdAsync(Guid tableId)
    {
        return _orderAppService.GetActiveOrderByTableIdAsync(tableId);
    }

    [HttpPost("complete/{tableId}")]
    public virtual Task CompleteActiveOrderByTableIdAsync(Guid tableId)
    {
        return _orderAppService.CompleteActiveOrderByTableIdAsync(tableId);
    }
}
