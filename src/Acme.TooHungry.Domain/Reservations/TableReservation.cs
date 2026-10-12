using System;
using Acme.TooHungry.Tables;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Reservations;

public class TableReservation : FullAuditedAggregateRoot<Guid>
{
    public Guid TableId { get; set; }

    public virtual RestaurantTable Table { get; set; } = null!;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public DateTime ReservationTime { get; set; }

    public int GuestCount { get; set; }

    public string? Note { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Confirmed;

    public TableReservation()
    {
    }

    public TableReservation(
        Guid id,
        Guid tableId,
        string customerName,
        string customerPhone,
        DateTime reservationTime,
        int guestCount,
        string? note = null,
        ReservationStatus status = ReservationStatus.Confirmed)
        : base(id)
    {
        TableId = tableId;
        CustomerName = customerName;
        CustomerPhone = customerPhone;
        ReservationTime = reservationTime;
        GuestCount = guestCount;
        Note = note;
        Status = status;
    }
}
