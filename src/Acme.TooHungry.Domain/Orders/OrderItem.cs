using System;
using Acme.TooHungry.Dishes;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Orders;

public class OrderItem : FullAuditedEntity<Guid>
{
    public OrderItem()
    {
    }

    public OrderItem(Guid id) : base(id)
    {
    }

    public Guid OrderId { get; set; }

    public Order? Order { get; set; }

    public Guid DishId { get; set; }

    public Dish? Dish { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public string? Note { get; set; }
}
