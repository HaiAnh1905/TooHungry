using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.Reservations;

public abstract class TableReservationAppService_Cancel_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly ITableReservationAppService _reservationAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableReservationRepository _reservationRepository;

    protected TableReservationAppService_Cancel_Tests()
    {
        _reservationAppService = GetRequiredService<ITableReservationAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _reservationRepository = GetRequiredService<ITableReservationRepository>();
    }

    [Fact]
    public async Task Should_Cancel_Reservation_Successfully()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CANCEL-01",
            Capacity = 4,
            Status = TableStatus.Reserved,
            ReservedCustomerName = "Khách Hủy Hẹn",
            ReservedCustomerPhone = "0999999999",
            ReservedGuestCount = 4
        }, autoSave: true);

        var reservation = await _reservationRepository.InsertAsync(new TableReservation(
            Guid.NewGuid(),
            table.Id,
            "Khách Hủy Hẹn",
            "0999999999",
            DateTime.Today.AddDays(1).AddHours(19),
            4,
            null,
            ReservationStatus.Confirmed
        ), autoSave: true);

        // Act
        var result = await _reservationAppService.CancelAsync(reservation.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Status.ShouldBe(ReservationStatus.Cancelled);

        var reservationInDb = await _reservationRepository.GetAsync(reservation.Id);
        reservationInDb.Status.ShouldBe(ReservationStatus.Cancelled);

        var tableInDb = await _tableRepository.GetAsync(table.Id);
        tableInDb.Status.ShouldBe(TableStatus.Available);
        tableInDb.ReservedCustomerName.ShouldBeNull();
        tableInDb.ReservedCustomerPhone.ShouldBeNull();
        tableInDb.ReservedGuestCount.ShouldBeNull();
        tableInDb.ReservedNote.ShouldBeNull();
        tableInDb.ReservedTime.ShouldBeNull();
    }
}
