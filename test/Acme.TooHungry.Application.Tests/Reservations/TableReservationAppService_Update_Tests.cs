using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.Reservations;

public abstract class TableReservationAppService_Update_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly ITableReservationAppService _reservationAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableReservationRepository _reservationRepository;

    protected TableReservationAppService_Update_Tests()
    {
        _reservationAppService = GetRequiredService<ITableReservationAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _reservationRepository = GetRequiredService<ITableReservationRepository>();
    }

    [Fact]
    public async Task Should_GetActiveByTableId_Successfully()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-GETACTIVE-01",
            Capacity = 4,
            Status = TableStatus.Reserved
        }, autoSave: true);

        var reservation = await _reservationRepository.InsertAsync(new TableReservation(
            Guid.NewGuid(),
            table.Id,
            "Khách Hàng G",
            "0966666666",
            DateTime.Today.AddDays(1).AddHours(18),
            2,
            "Kỷ niệm ngày cưới",
            ReservationStatus.Confirmed
        ), autoSave: true);

        // Act
        var result = await _reservationAppService.GetActiveByTableIdAsync(table.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Id.ShouldBe(reservation.Id);
        result.CustomerName.ShouldBe("Khách Hàng G");
        result.Status.ShouldBe(ReservationStatus.Confirmed);
    }

    [Fact]
    public async Task Should_Update_Reservation_Successfully()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-UPDATE-01",
            Capacity = 6,
            Status = TableStatus.Reserved,
            ReservedCustomerName = "Khách Ban Đầu",
            ReservedCustomerPhone = "0977777777",
            ReservedGuestCount = 2
        }, autoSave: true);

        var reservation = await _reservationRepository.InsertAsync(new TableReservation(
            Guid.NewGuid(),
            table.Id,
            "Khách Ban Đầu",
            "0977777777",
            DateTime.Today.AddDays(1).AddHours(18),
            2,
            null,
            ReservationStatus.Confirmed
        ), autoSave: true);

        var newTime = DateTime.Today.AddDays(2).AddHours(19);
        var updateInput = new UpdateTableReservationDto
        {
            CustomerName = "Khách Đã Đổi",
            CustomerPhone = "0988888888",
            ReservationTime = newTime,
            GuestCount = 5,
            Note = "Thêm ghế trẻ em"
        };

        // Act
        var updated = await _reservationAppService.UpdateAsync(reservation.Id, updateInput);

        // Assert
        updated.ShouldNotBeNull();
        updated.CustomerName.ShouldBe("Khách Đã Đổi");
        updated.CustomerPhone.ShouldBe("0988888888");
        updated.GuestCount.ShouldBe(5);
        updated.Note.ShouldBe("Thêm ghế trẻ em");

        var tableInDb = await _tableRepository.GetAsync(table.Id);
        // Khi dời giờ đặt sang 2 ngày sau (> 60 phút), bàn ăn được giải phóng về Available và xóa thông tin giữ bàn
        tableInDb.Status.ShouldBe(TableStatus.Available);
        tableInDb.ReservedCustomerName.ShouldBeNull();
    }
}
