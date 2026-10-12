using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.Reservations;

public abstract class ReservationAutoCancelBackgroundWorker_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly ReservationAutoCancelBackgroundWorker _worker;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableReservationRepository _reservationRepository;

    protected ReservationAutoCancelBackgroundWorker_Tests()
    {
        _worker = GetRequiredService<ReservationAutoCancelBackgroundWorker>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _reservationRepository = GetRequiredService<ITableReservationRepository>();
    }

    [Fact]
    public async Task Should_AutoCancel_Overdue_Reservations()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-AUTOCANCEL-01",
            Capacity = 4,
            Status = TableStatus.Reserved,
            ReservedCustomerName = "Khách Quá Hạn",
            ReservedCustomerPhone = "0911222333",
            ReservedGuestCount = 2
        }, autoSave: true);

        var clock = GetRequiredService<Volo.Abp.Timing.IClock>();
        var now = clock.Now;

        // Đơn quá hạn 70 phút (hơn 1 giờ)
        var overdueTime = now.AddMinutes(-70);
        var overdueReservation = await _reservationRepository.InsertAsync(new TableReservation(
            Guid.NewGuid(),
            table.Id,
            "Khách Quá Hạn",
            "0911222333",
            overdueTime,
            2,
            null,
            ReservationStatus.Confirmed
        ), autoSave: true);

        // Đơn trong tương lai không bị hủy
        var futureReservation = await _reservationRepository.InsertAsync(new TableReservation(
            Guid.NewGuid(),
            table.Id,
            "Khách Tương Lai",
            "0911444555",
            now.AddHours(2),
            2,
            null,
            ReservationStatus.Confirmed
        ), autoSave: true);

        // Act - Chạy worker xử lý
        await _worker.ProcessOverdueReservationsAsync(ServiceProvider);

        // Assert
        var overdueInDb = await _reservationRepository.GetAsync(overdueReservation.Id);
        overdueInDb.Status.ShouldBe(ReservationStatus.AutoCancelled);

        var futureInDb = await _reservationRepository.GetAsync(futureReservation.Id);
        futureInDb.Status.ShouldBe(ReservationStatus.Confirmed);

        var tableInDb = await _tableRepository.GetAsync(table.Id);
        tableInDb.Status.ShouldBe(TableStatus.Available);
        tableInDb.ReservedCustomerName.ShouldBeNull();
        tableInDb.ReservedCustomerPhone.ShouldBeNull();
    }
}
