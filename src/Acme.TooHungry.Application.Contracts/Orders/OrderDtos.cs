using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
    [Required]
    public Guid DishId { get; set; }

    [Range(1, 999, ErrorMessage = "TooHungry:Order:QuantityOutOfRange")]
    public int Quantity { get; set; }

    [StringLength(512, ErrorMessage = "TooHungry:Order:NoteTooLong")]
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

    [StringLength(512, ErrorMessage = "TooHungry:Order:NoteTooLong")]
    public string? Note { get; set; }

    public Guid? TableId { get; set; }

    [MinLength(1, ErrorMessage = "TooHungry:Order:EmptyItems")]
    public List<CreateUpdateOrderItemDto> Items { get; set; } = new();
}

public class SubmitOrderItemDto
{
    [Required]
    public Guid DishId { get; set; }

    [Range(1, 999, ErrorMessage = "TooHungry:Order:QuantityOutOfRange")]
    public int Quantity { get; set; }

    [StringLength(512, ErrorMessage = "TooHungry:Order:NoteTooLong")]
    public string? Note { get; set; }
}

public class SubmitOrderInputDto
{
    public Guid? OrderId { get; set; }

    [Required]
    public Guid TableId { get; set; }

    [StringLength(512, ErrorMessage = "TooHungry:Order:NoteTooLong")]
    public string? Note { get; set; }

    [MinLength(1, ErrorMessage = "TooHungry:Order:EmptyItems")]
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

public class GetOrdersInputDto : PagedAndSortedResultRequestDto
{
    /// <summary>
    /// Từ khóa tìm kiếm: Mã đơn hàng (OrderNumber), Ghi chú (Note), hoặc Tên bàn (TableName)
    /// </summary>
    [StringLength(256)]
    public string? Filter { get; set; }

    /// <summary>
    /// Bộ lọc theo trạng thái đơn hàng (Pending, Processing, Completed, Cancelled)
    /// </summary>
    public OrderStatus? Status { get; set; }
}

