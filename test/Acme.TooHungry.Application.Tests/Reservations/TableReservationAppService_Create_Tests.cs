using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Xunit;

namespace Acme.TooHungry.Reservations;

public abstract class TableReservationAppService_Create_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly ITableReservationAppService _reservationAppService;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableReservationRepository _reservationRepository;

    protected TableReservationAppService_Create_Tests()
    {
        _reservationAppService = GetRequiredService<ITableReservationAppService>();
        _tableRepository = GetRequiredService<IRepository<RestaurantTable, Guid>>();
        _reservationRepository = GetRequiredService<ITableReservationRepository>();
    }

    [Fact]
    public async Task Should_Create_Reservation_Successfully()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CREATE-01",
            Capacity = 4,
            Status = TableStatus.Available
        }, autoSave: true);

        var validTime = DateTime.Today.AddDays(1).AddHours(18); // Tomorrow at 18:00 (within 09:00 - 22:59)

        var input = new CreateTableReservationDto
        {
            TableId = table.Id,
            CustomerName = "Nguyễn Văn A",
            CustomerPhone = "0901234567",
            ReservationTime = validTime,
            GuestCount = 3,
            Note = "Bàn gần cửa sổ"
        };

        // Act
        var result = await _reservationAppService.CreateAsync(input);

        // Assert
        result.ShouldNotBeNull();
        result.TableId.ShouldBe(table.Id);
        result.CustomerName.ShouldBe("Nguyễn Văn A");
        result.Status.ShouldBe(ReservationStatus.Confirmed);

        // Check table status in DB: Bàn chưa đến khung giờ hẹn trước 60 phút nên vẫn giữ nguyên là Available
        var tableInDb = await _tableRepository.GetAsync(table.Id);
        tableInDb.Status.ShouldBe(TableStatus.Available);
        tableInDb.ReservedCustomerName.ShouldBeNull();
    }

    [Fact]
    public async Task Should_Throw_When_Table_Not_Available()
    {
        // Arrange: Bàn đang Occupied
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CREATE-02",
            Capacity = 4,
            Status = TableStatus.Occupied
        }, autoSave: true);

        var validTime = DateTime.Today.AddDays(1).AddHours(12);

        var input = new CreateTableReservationDto
        {
            TableId = table.Id,
            CustomerName = "Trần Thị B",
            CustomerPhone = "0912345678",
            ReservationTime = validTime,
            GuestCount = 2
        };

        // Act & Assert
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CreateAsync(input);
        });

        ex.Code.ShouldBe(ReservationErrorCodes.TableNotAvailable);
    }

    [Fact]
    public async Task Should_Throw_When_GuestCount_Exceeds_Capacity()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CREATE-03",
            Capacity = 2,
            Status = TableStatus.Available
        }, autoSave: true);

        var validTime = DateTime.Today.AddDays(1).AddHours(14);

        var input = new CreateTableReservationDto
        {
            TableId = table.Id,
            CustomerName = "Lê Văn C",
            CustomerPhone = "0987654321",
            ReservationTime = validTime,
            GuestCount = 5 // Capacity is 2
        };

        // Act & Assert
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CreateAsync(input);
        });

        ex.Code.ShouldBe(ReservationErrorCodes.ExceedsTableCapacity);
    }

    [Fact]
    public async Task Should_Throw_When_Outside_Opening_Hours()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CREATE-04",
            Capacity = 6,
            Status = TableStatus.Available
        }, autoSave: true);

        var outsideTime = DateTime.Today.AddDays(1).AddHours(4); // 04:00 AM (opening is 09:00 - 22:59)

        var input = new CreateTableReservationDto
        {
            TableId = table.Id,
            CustomerName = "Phạm Văn D",
            CustomerPhone = "0933333333",
            ReservationTime = outsideTime,
            GuestCount = 4
        };

        // Act & Assert
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CreateAsync(input);
        });

        ex.Code.ShouldBe(ReservationErrorCodes.OutsideOpeningHours);
    }

    [Fact]
    public async Task Should_Throw_When_Exceeds_7_Days()
    {
        // Arrange
        var table = await _tableRepository.InsertAsync(new RestaurantTable
        {
            Name = "TEST-RESV-CREATE-05",
            Capacity = 4,
            Status = TableStatus.Available
        }, autoSave: true);

        var tooFarTime = DateTime.Today.AddDays(10).AddHours(12); // 10 days in advance

        var input = new CreateTableReservationDto
        {
            TableId = table.Id,
            CustomerName = "Hoàng Văn E",
            CustomerPhone = "0944444444",
            ReservationTime = tooFarTime,
            GuestCount = 2
        };

        // Act & Assert
        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _reservationAppService.CreateAsync(input);
        });

        ex.Code.ShouldBe(ReservationErrorCodes.ExceedsMaxAdvanceDays);
    }
}
