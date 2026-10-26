using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;
using Volo.Abp.Timing;

namespace Acme.TooHungry.Reservations;

public class TableReservationManager : DomainService
{
    private readonly ITableReservationRepository _reservationRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IClock _clock;

    public TableReservationManager(
        ITableReservationRepository reservationRepository,
        IRepository<RestaurantTable, Guid> tableRepository,
        IClock clock)
    {
        _reservationRepository = reservationRepository;
        _tableRepository = tableRepository;
        _clock = clock;
    }

    public virtual void ValidateReservationTime(DateTime reservationTime)
    {
        var now = _clock.Now;

        // Allow up to 5 minutes tolerance in the past for network/clock drift
        if (reservationTime < now.AddMinutes(-5))
        {
            throw new BusinessException(ReservationErrorCodes.TimeInPast)
                .WithData("ReservationTime", reservationTime)
                .WithData("CurrentTime", now);
        }

        if (reservationTime > now.AddDays(7))
        {
            throw new BusinessException(ReservationErrorCodes.ExceedsMaxAdvanceDays)
                .WithData("ReservationTime", reservationTime)
                .WithData("MaxAllowedTime", now.AddDays(7));
        }

        var timeOfDay = reservationTime.TimeOfDay;
        var openingTime = new TimeSpan(TooHungryConsts.BusinessOpeningHour, 0, 0);
        var closingTime = new TimeSpan(TooHungryConsts.BusinessClosingHour, 0, 0);
        if (timeOfDay < openingTime || timeOfDay > closingTime)
        {
            throw new BusinessException(ReservationErrorCodes.OutsideOpeningHours)
                .WithData("TimeOfDay", timeOfDay);
        }
    }

    public virtual void ValidateGuestCount(int guestCount, int tableCapacity)
    {
        if (guestCount < 1 || guestCount > tableCapacity)
        {
            throw new BusinessException(ReservationErrorCodes.ExceedsTableCapacity)
                .WithData("GuestCount", guestCount)
                .WithData("Capacity", tableCapacity);
        }
    }

    public virtual async Task<(TableReservation Reservation, RestaurantTable Table)> CreateReservationAsync(
        Guid tableId,
        string customerName,
        string customerPhone,
        DateTime reservationTime,
        int guestCount,
        string? note = null)
    {
        var table = await _tableRepository.GetAsync(tableId);

        if (table.Status != TableStatus.Available)
        {
            throw new BusinessException(ReservationErrorCodes.TableNotAvailable)
                .WithData("TableId", tableId)
                .WithData("Status", table.Status);
        }

        ValidateReservationTime(reservationTime);
        ValidateGuestCount(guestCount, table.Capacity);

        var reservation = new TableReservation(
            GuidGenerator.Create(),
            tableId,
            customerName.Trim(),
            customerPhone.Trim(),
            reservationTime,
            guestCount,
            note?.Trim(),
            ReservationStatus.Confirmed
        );

        var now = _clock.Now;
        // Bàn chỉ tự động chuyển Reserved nếu thời gian đặt trong vòng 60 phút tới
        if (reservationTime <= now.AddMinutes(60))
        {
            table.Reserve(reservation.CustomerName, reservation.CustomerPhone, reservation.ReservationTime, reservation.GuestCount, reservation.Note);
            await _tableRepository.UpdateAsync(table, autoSave: true);
        }

        await _reservationRepository.InsertAsync(reservation, autoSave: true);

        return (reservation, table);
    }

    public virtual async Task<(TableReservation Reservation, RestaurantTable Table)> UpdateReservationAsync(
        Guid reservationId,
        string customerName,
        string customerPhone,
        DateTime reservationTime,
        int guestCount,
        string? note = null)
    {
        var reservation = await _reservationRepository.GetAsync(reservationId);

        if (reservation.Status != ReservationStatus.Confirmed)
        {
            throw new BusinessException(ReservationErrorCodes.ReservationNotActive)
                .WithData("ReservationId", reservationId)
                .WithData("Status", reservation.Status);
        }

        var table = await _tableRepository.GetAsync(reservation.TableId);

        ValidateReservationTime(reservationTime);
        ValidateGuestCount(guestCount, table.Capacity);

        reservation.CustomerName = customerName.Trim();
        reservation.CustomerPhone = customerPhone.Trim();
        reservation.ReservationTime = reservationTime;
        reservation.GuestCount = guestCount;
        reservation.Note = note?.Trim();

        var now = _clock.Now;
        if (reservationTime <= now.AddMinutes(60))
        {
            table.Reserve(reservation.CustomerName, reservation.CustomerPhone, reservation.ReservationTime, reservation.GuestCount, reservation.Note);
            await _tableRepository.UpdateAsync(table, autoSave: true);
        }
        else if (table.Status == TableStatus.Reserved)
        {
            table.Release();
            await _tableRepository.UpdateAsync(table, autoSave: true);
        }

        await _reservationRepository.UpdateAsync(reservation, autoSave: true);

        return (reservation, table);
    }

    public virtual async Task<(TableReservation Reservation, RestaurantTable Table)> CheckInAsync(Guid reservationId)
    {
        var reservation = await _reservationRepository.GetAsync(reservationId);

        if (reservation.Status != ReservationStatus.Confirmed)
        {
            throw new BusinessException(ReservationErrorCodes.ReservationNotActive)
                .WithData("ReservationId", reservationId)
                .WithData("Status", reservation.Status);
        }

        var table = await _tableRepository.GetAsync(reservation.TableId);

        if (table.Status == TableStatus.Occupied)
        {
            throw new BusinessException("TooHungry:Table:TableCurrentlyOccupied")
                .WithData("TableId", table.Id)
                .WithData("TableName", table.Name);
        }

        reservation.Status = ReservationStatus.Completed;
        table.Occupy(_clock.Now);

        await _reservationRepository.UpdateAsync(reservation, autoSave: true);
        await _tableRepository.UpdateAsync(table, autoSave: true);

        return (reservation, table);
    }

    public virtual async Task<(TableReservation Reservation, RestaurantTable Table)> CancelAsync(Guid reservationId)
    {
        var reservation = await _reservationRepository.GetAsync(reservationId);

        if (reservation.Status != ReservationStatus.Confirmed)
        {
            throw new BusinessException(ReservationErrorCodes.ReservationNotActive)
                .WithData("ReservationId", reservationId)
                .WithData("Status", reservation.Status);
        }

        reservation.Status = ReservationStatus.Cancelled;

        var table = await _tableRepository.GetAsync(reservation.TableId);
        if (table.Status == TableStatus.Reserved)
        {
            table.Release();
            await _tableRepository.UpdateAsync(table, autoSave: true);
        }

        await _reservationRepository.UpdateAsync(reservation, autoSave: true);

        return (reservation, table);
    }
}
