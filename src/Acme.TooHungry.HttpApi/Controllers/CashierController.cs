using System.Threading.Tasks;
using Acme.TooHungry.Cashier;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/cashier")]
[Authorize(TooHungryPermissions.Cashier.Default)]
public class CashierController : TooHungryController, ICashierAppService
{
    private readonly ICashierAppService _cashierAppService;

    public CashierController(ICashierAppService cashierAppService)
    {
        _cashierAppService = cashierAppService;
    }

    [HttpGet("shift-summary")]
    public virtual Task<CashierShiftSummaryDto> GetShiftSummaryAsync()
    {
        return _cashierAppService.GetShiftSummaryAsync();
    }

    [HttpGet("tables")]
    [Authorize(TooHungryPermissions.Cashier.ManageTables)]
    public virtual Task<ListResultDto<CashierTableDto>> GetTablesAsync([FromQuery] GetCashierTablesInputDto input)
    {
        return _cashierAppService.GetTablesAsync(input);
    }

    [HttpGet("orders")]
    [Authorize(TooHungryPermissions.Cashier.ManageOrders)]
    public virtual Task<PagedResultDto<OrderDto>> GetOrdersAsync([FromQuery] GetCashierOrdersInputDto input)
    {
        return _cashierAppService.GetOrdersAsync(input);
    }
}
