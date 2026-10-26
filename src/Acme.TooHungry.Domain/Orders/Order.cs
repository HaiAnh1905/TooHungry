using System;
using System.Collections.Generic;
using System.Linq;
using Acme.TooHungry.Tables;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Orders;

public class Order : FullAuditedAggregateRoot<Guid>
{
    public string OrderNumber { get; protected internal set; } = string.Empty;

    public DateTime OrderDate { get; protected internal set; }

    public OrderStatus Status { get; protected internal set; } = OrderStatus.Pending;

    public decimal TotalAmount { get; protected internal set; }

    public string? Note { get; set; }

    public Guid? TableId { get; protected internal set; }

    public virtual RestaurantTable? Table { get; set; }

    public virtual ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

    public Order() { }

    public Order(Guid id, string orderNumber, DateTime orderDate, Guid? tableId = null, string? note = null, OrderStatus status = OrderStatus.Pending, decimal totalAmount = 0)
        : base(id)
    {
        OrderNumber = orderNumber;
        OrderDate = orderDate;
        TableId = tableId;
        Note = note;
        Status = status;
        TotalAmount = totalAmount;
    }

    public Order(string orderNumber, DateTime orderDate, OrderStatus status = OrderStatus.Pending, decimal totalAmount = 0, Guid? tableId = null, string? note = null)
        : this(Guid.NewGuid(), orderNumber, orderDate, tableId, note, status, totalAmount)
    {
    }

    public void SetTotalAmount(decimal totalAmount)
    {
        TotalAmount = totalAmount;
    }

    public void SetTable(Guid? tableId)
    {
        TableId = tableId;
    }

    public void SetOrderNumber(string orderNumber)
    {
        Check.NotNullOrWhiteSpace(orderNumber, nameof(orderNumber));
        OrderNumber = orderNumber;
    }

    public void SetOrderDate(DateTime orderDate)
    {
        OrderDate = orderDate;
    }

    public void RecalculateTotalAmount()
    {
        TotalAmount = Items?.Sum(x => x.TotalPrice) ?? 0;
    }

    public void Complete()
    {
        if (Status == OrderStatus.Completed)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCompleted");
        }
        if (Status == OrderStatus.Cancelled)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCancelled");
        }

        Status = OrderStatus.Completed;
    }

    public void Cancel()
    {
        if (Status == OrderStatus.Completed)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCompleted");
        }
        if (Status == OrderStatus.Cancelled)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCancelled");
        }

        Status = OrderStatus.Cancelled;
    }

    public void ChangeStatus(OrderStatus newStatus)
    {
        if (Status == OrderStatus.Completed)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCompleted");
        }
        if (Status == OrderStatus.Cancelled)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCancelled");
        }

        if (newStatus == OrderStatus.Completed)
        {
            Complete();
        }
        else if (newStatus == OrderStatus.Cancelled)
        {
            Cancel();
        }
        else
        {
            Status = newStatus;
        }
    }
}
