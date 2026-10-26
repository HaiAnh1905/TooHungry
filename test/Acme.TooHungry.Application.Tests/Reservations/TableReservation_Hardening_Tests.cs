using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Volo.Abp.Timing;
using Xunit;

namespace Acme.TooHungry.Reservations;

public abstract class TableReservation_Hardening_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly ITableReservationAppService _reservationAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableReservationRepository _reservationRepository;
    private readonly IClock _clock;

    protected TableReservation_Hardening_Tests()
    {
        _reservationAppService = GetRequiredService<ITableReservationAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _reservationRepository = GetRequiredService<ITableReservationRepository>();
        _clock = GetRequiredService<IClock>();
    }

    [Fact]
    public async Task Should_Keep_Table_Available_When_Reservation_Is_More_Than_60_Minutes_Ahead()
    {
        Guid tableId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(Guid.NewGuid(), "Bàn Đặt Xa", 4), autoSave: true);
            tableId = table.Id;
        });

        // Đặt bàn cho 2 ngày sau lúc 18:00 (hơn 60 phút)
        var futureTime = DateTime.Today.AddDays(2).AddHours(18);

        var resDto = await _reservationAppService.CreateAsync(new CreateTableReservationDto
        {
            TableId = tableId,
            CustomerName = "Nguyễn Văn Đặt Trước",
            CustomerPhone = "0901234567",
            ReservationTime = futureTime,
            GuestCount = 3,
            Note = "Đặt trước 2 ngày"
        });

        resDto.ShouldNotBeNull();
        resDto.Status.ShouldBe(ReservationStatus.Confirmed);

        // Bàn ăn vẫn phải giữ nguyên là Available để đón khách vãng lai
        var tableInDb = await _tableRepository.GetAsync(tableId);
        tableInDb.Status.ShouldBe(TableStatus.Available);
        tableInDb.ReservedCustomerName.ShouldBeNull();
    }

    [Fact]
    public async Task Should_Prevent_CheckIn_When_Table_Is_Currently_Occupied()
    {
        Guid reservationId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(Guid.NewGuid(), "Bàn Đang Ăn", 4)
            {
                Status = TableStatus.Occupied,
                OccupiedTime = DateTime.UtcNow
            }, autoSave: true);

            var reservation = await _reservationRepository.InsertAsync(new TableReservation(
                Guid.NewGuid(),
                table.Id,
                "Khách Đến Nhận Bàn",
                "0988888888",
                DateTime.Today.AddDays(1).AddHours(19),
                4,
                "Check-in thử",
                ReservationStatus.Confirmed
            ), autoSave: true);

            reservationId = reservation.Id;
        });

        // Bấm check-in khi bàn đang có khách ngồi -> ném TooHungry:Table:TableCurrentlyOccupied
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CheckInAsync(reservationId);
        });

        ex.Code.ShouldBe("TooHungry:Table:TableCurrentlyOccupied");
    }

    [Fact]
    public async Task Should_Enforce_BusinessHours_From_TooHungryConsts()
    {
        Guid tableId = Guid.Empty;

        await WithUnitOfWorkAsync(async () =>
        {
            var table = await _tableRepository.InsertAsync(new RestaurantTable(Guid.NewGuid(), "Bàn Giờ Mở Cửa", 4), autoSave: true);
            tableId = table.Id;
        });

        // 1. Thử đặt bàn lúc 07:00 sáng (trước 08:00)
        var earlyTime = DateTime.Today.AddDays(1).AddHours(7);
        var exEarly = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CreateAsync(new CreateTableReservationDto
            {
                TableId = tableId,
                CustomerName = "Khách Sớm",
                CustomerPhone = "0911111111",
                ReservationTime = earlyTime,
                GuestCount = 2
            });
        });
        exEarly.Code.ShouldBe(ReservationErrorCodes.OutsideOpeningHours);

        // 2. Thử đặt bàn lúc 22:30 đêm (sau 22:00)
        var lateTime = DateTime.Today.AddDays(1).AddHours(22).AddMinutes(30);
        var exLate = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CreateAsync(new CreateTableReservationDto
            {
                TableId = tableId,
                CustomerName = "Khách Muộn",
                CustomerPhone = "0922222222",
                ReservationTime = lateTime,
                GuestCount = 2
            });
        });
        exLate.Code.ShouldBe(ReservationErrorCodes.OutsideOpeningHours);
    }
}
