using System;
using System.Collections.Generic;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Orders;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Tables;

public class RestaurantTable : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; } = 4;

    public TableStatus Status { get; set; } = TableStatus.Available;

    public Guid? DiningAreaId { get; set; }

    public DiningArea? DiningArea { get; set; }

    public string? Location { get; set; }

    // Reservation info
    public string? ReservedCustomerName { get; set; }
    public string? ReservedCustomerPhone { get; set; }
    public DateTime? ReservedTime { get; set; }
    public int? ReservedGuestCount { get; set; }
    public string? ReservedNote { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

