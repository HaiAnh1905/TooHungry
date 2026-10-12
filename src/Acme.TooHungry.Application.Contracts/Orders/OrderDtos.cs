using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Orders;

public class OrderItemDto : EntityDto<Guid>
{
    public Guid OrderId { get; set; }
    public Guid DishId { get; set; }
    public string? DishName { get; set; }
    public string? DishPhotoUrl { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Note { get; set; }
}

public class CreateUpdateOrderItemDto
{
    public Guid DishId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Note { get; set; }
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

public class SubmitOrderItemDto
{
    public Guid DishId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Note { get; set; }
}

public class SubmitOrderInputDto
{
    public Guid? OrderId { get; set; }
    public Guid TableId { get; set; }
    public string? Note { get; set; }
    public List<SubmitOrderItemDto> Items { get; set; } = new();
}

public class CancelOrderInputDto
{
    public Guid? OrderId { get; set; }
    public string? Reason { get; set; }
}

public class ValidateOrderStockInputDto
{
    public List<SubmitOrderItemDto> Items { get; set; } = new();
}

public class StockShortageItemDto
{
    public Guid DishId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string IngredientName { get; set; } = string.Empty;
    public decimal RequiredQuantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public string UnitName { get; set; } = string.Empty;
}

public class StockValidationResultDto
{
    public bool IsValid { get; set; }
    public List<StockShortageItemDto> Shortages { get; set; } = new();
}
