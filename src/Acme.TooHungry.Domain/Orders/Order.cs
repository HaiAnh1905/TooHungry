using System;
using System.Collections.Generic;
using Acme.TooHungry.Tables;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Orders;

public class Order : FullAuditedAggregateRoot<Guid>
{
    public string OrderNumber { get; set; } = string.Empty;

    public DateTime OrderDate { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public decimal TotalAmount { get; set; }

    public string? Note { get; set; }

    public Guid? TableId { get; set; }

    public RestaurantTable? Table { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

