using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Orders;

public class OrderItemDto : EntityDto<Guid>
{
    public Guid OrderId { get; set; }
    public Guid DishId { get; set; }
    public string? DishName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public class CreateUpdateOrderItemDto
{
    public Guid DishId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class OrderDto : AuditedEntityDto<Guid>
{
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public OrderStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public Guid? TableId { get; set; }
    public string? TableName { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}

public class CreateUpdateOrderDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.Now;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public Guid? TableId { get; set; }
    public List<CreateUpdateOrderItemDto> Items { get; set; } = new();
}
