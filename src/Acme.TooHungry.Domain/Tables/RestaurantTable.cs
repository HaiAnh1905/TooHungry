using System;
using System.Collections.Generic;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Orders;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Tables;

public class RestaurantTable : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; protected internal set; } = string.Empty;

    public int Capacity { get; protected internal set; } = 4;

    public TableStatus Status { get; protected internal set; } = TableStatus.Available;

    public Guid? DiningAreaId { get; protected internal set; }

    public DiningArea? DiningArea { get; protected internal set; }

    public string? Location { get; protected internal set; }

    // Reservation info
    public string? ReservedCustomerName { get; protected internal set; }
    public string? ReservedCustomerPhone { get; protected internal set; }
    public DateTime? ReservedTime { get; protected internal set; }
    public int? ReservedGuestCount { get; protected internal set; }
    public string? ReservedNote { get; protected internal set; }

    /// <summary>
    /// Thời điểm bàn bắt đầu có khách ngồi (Occupied) để tính thời gian dùng bữa
    /// </summary>
    public DateTime? OccupiedTime { get; protected internal set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Acme.TooHungry.Reservations.TableReservation> Reservations { get; set; } = new List<Acme.TooHungry.Reservations.TableReservation>();

    public RestaurantTable() { }

    public RestaurantTable(Guid id, string name, int capacity = 4, Guid? diningAreaId = null, string? location = null, TableStatus status = TableStatus.Available)
        : base(id)
    {
        Name = name;
        Capacity = capacity;
        DiningAreaId = diningAreaId;
        Location = location;
        Status = status;
    }

    public RestaurantTable(string name, int capacity = 4, TableStatus status = TableStatus.Available, Guid? diningAreaId = null, string? location = null)
        : this(Guid.NewGuid(), name, capacity, diningAreaId, location, status)
    {
    }

    public void Occupy(DateTime now)
    {
        Status = TableStatus.Occupied;
        OccupiedTime = now;
        ClearReservationInfo();
    }

    public void Release()
    {
        Status = TableStatus.Available;
        OccupiedTime = null;
        ClearReservationInfo();
    }

    public void MarkCleaning()
    {
        Status = TableStatus.Cleaning;
        OccupiedTime = null;
        ClearReservationInfo();
    }

    public void Reserve(string name, string phone, DateTime time, int guestCount, string? note = null)
    {
        Status = TableStatus.Reserved;
        ReservedCustomerName = name;
        ReservedCustomerPhone = phone;
        ReservedTime = time;
        ReservedGuestCount = guestCount;
        ReservedNote = note;
    }

    public void ClearReservationInfo()
    {
        ReservedCustomerName = null;
        ReservedCustomerPhone = null;
        ReservedTime = null;
        ReservedGuestCount = null;
        ReservedNote = null;
    }

    public void SetName(string name)
    {
        Volo.Abp.Check.NotNullOrWhiteSpace(name, nameof(name));
        Name = name;
    }

    public void SetCapacity(int capacity)
    {
        Capacity = capacity;
    }

    public void SetDiningArea(Guid? diningAreaId, string? location = null)
    {
        DiningAreaId = diningAreaId;
        Location = location;
    }

    public void SetLocation(string? location)
    {
        Location = location;
    }

    public void SetStatus(TableStatus status)
    {
        Status = status;
    }
}
