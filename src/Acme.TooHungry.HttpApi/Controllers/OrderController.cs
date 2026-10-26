using System;
using System.Threading.Tasks;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/order")]
public class OrderController : TooHungryController, IOrderAppService
{
    private readonly IOrderAppService _orderAppService;

    public OrderController(IOrderAppService orderAppService)
    {
        _orderAppService = orderAppService;
    }

    [HttpGet("{id:guid}")]
    public virtual Task<OrderDto> GetAsync(Guid id)
    {
        return _orderAppService.GetAsync(id);
    }

    [HttpGet]
    public virtual Task<PagedResultDto<OrderDto>> GetListAsync([FromQuery] GetOrdersInputDto input)
    {
        return _orderAppService.GetListAsync(input);
    }

    [HttpPost]
    public virtual Task<OrderDto> CreateAsync(CreateUpdateOrderDto input)
    {
        return _orderAppService.CreateAsync(input);
    }

    [HttpPut("{id:guid}")]
    public virtual Task<OrderDto> UpdateAsync(Guid id, CreateUpdateOrderDto input)
    {
        return _orderAppService.UpdateAsync(id, input);
    }

    [HttpDelete("{id:guid}")]
    public virtual Task DeleteAsync(Guid id)
    {
        return _orderAppService.DeleteAsync(id);
    }

    [HttpGet("active-order-by-table-id/{tableId:guid}")]
    [HttpGet("active-by-table/{tableId:guid}")]
    public virtual Task<OrderDto?> GetActiveOrderByTableIdAsync(Guid tableId)
    {
        return _orderAppService.GetActiveOrderByTableIdAsync(tableId);
    }

    [HttpPost("complete-active-order-by-table-id/{tableId:guid}")]
    public virtual Task CompleteActiveOrderByTableIdAsync(Guid tableId)
    {
        return _orderAppService.CompleteActiveOrderByTableIdAsync(tableId);
    }

    [HttpPost("validate-stock")]
    public virtual Task<StockValidationResultDto> ValidateStockAsync(ValidateOrderStockInputDto input)
    {
        return _orderAppService.ValidateStockAsync(input);
    }

    [HttpPost("submit-order")]
    public virtual Task<OrderDto> SubmitOrderAsync(SubmitOrderInputDto input)
    {
        return _orderAppService.SubmitOrderAsync(input);
    }

    [HttpPost("{id:guid}/cancel")]
    public virtual Task CancelOrderAsync(Guid id, [FromBody] CancelOrderInputDto? input = null)
    {
        return _orderAppService.CancelOrderAsync(id, input);
    }

    [HttpPost("{id:guid}/complete-payment")]
    [Authorize(TooHungryPermissions.Orders.Default)]
    public virtual Task<OrderDto> CompletePaymentAsync(Guid id, [FromBody] CompletePaymentInputDto input)
    {
        return _orderAppService.CompletePaymentAsync(id, input);
    }
}
