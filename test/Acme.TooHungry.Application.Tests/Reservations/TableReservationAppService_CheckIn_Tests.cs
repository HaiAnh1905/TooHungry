using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.Reservations;

public abstract class TableReservationAppService_CheckIn_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly ITableReservationAppService _reservationAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableReservationRepository _reservationRepository;

    protected TableReservationAppService_CheckIn_Tests()
    {
        _reservationAppService = GetRequiredService<ITableReservationAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _reservationRepository = GetRequiredService<ITableReservationRepository>();
    }

    [Fact]
    public async Task Should_CheckIn_Successfully()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CHECKIN-01",
            Capacity = 4,
            Status = TableStatus.Reserved,
            ReservedCustomerName = "Đoàn Văn F",
            ReservedCustomerPhone = "0955555555",
            ReservedGuestCount = 3
        }, autoSave: true);

        var reservation = await _reservationRepository.InsertAsync(new TableReservation(
            Guid.NewGuid(),
            table.Id,
            "Đoàn Văn F",
            "0955555555",
            DateTime.Today.AddDays(1).AddHours(19),
            3,
            "Gặp đối tác",
            ReservationStatus.Confirmed
        ), autoSave: true);

        // Act
        var result = await _reservationAppService.CheckInAsync(reservation.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Status.ShouldBe(ReservationStatus.Completed);

        var reservationInDb = await _reservationRepository.GetAsync(reservation.Id);
        reservationInDb.Status.ShouldBe(ReservationStatus.Completed);

        var tableInDb = await _tableRepository.GetAsync(table.Id);
        tableInDb.Status.ShouldBe(TableStatus.Occupied);
        tableInDb.ReservedCustomerName.ShouldBeNull();
        tableInDb.ReservedCustomerPhone.ShouldBeNull();
        tableInDb.ReservedGuestCount.ShouldBeNull();
        tableInDb.ReservedNote.ShouldBeNull();
        tableInDb.ReservedTime.ShouldBeNull();
    }

    [Fact]
    public async Task Should_Throw_When_Reservation_Already_Completed()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CHECKIN-02",
            Capacity = 4,
            Status = TableStatus.Occupied
        }, autoSave: true);

        var reservation = await _reservationRepository.InsertAsync(new TableReservation(
            Guid.NewGuid(),
            table.Id,
            "Đoàn Văn F",
            "0955555555",
            DateTime.Today.AddDays(1).AddHours(19),
            3,
            null,
            ReservationStatus.Completed
        ), autoSave: true);

        // Act & Assert
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CheckInAsync(reservation.Id);
        });

        ex.Code.ShouldBe(ReservationErrorCodes.ReservationNotActive);
    }
}
