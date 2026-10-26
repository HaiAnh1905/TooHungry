using System;
using Shouldly;
using Xunit;

namespace Acme.TooHungry.Tables;

public class RestaurantTableDomain_Tests
{
    [Fact]
    public void Should_Occupy_Table_And_Clear_Reservation()
    {
        var table = new RestaurantTable(Guid.NewGuid(), "Bàn 01", 4);
        table.Reserve("Nguyễn Văn A", "0901234567", DateTime.UtcNow.AddMinutes(30), 2, "Gần cửa sổ");
        table.Status.ShouldBe(TableStatus.Reserved);
        table.ReservedCustomerName.ShouldBe("Nguyễn Văn A");

        var now = DateTime.UtcNow;
        table.Occupy(now);

        table.Status.ShouldBe(TableStatus.Occupied);
        table.OccupiedTime.ShouldBe(now);
        table.ReservedCustomerName.ShouldBeNull();
        table.ReservedCustomerPhone.ShouldBeNull();
        table.ReservedTime.ShouldBeNull();
        table.ReservedGuestCount.ShouldBeNull();
        table.ReservedNote.ShouldBeNull();
    }

    [Fact]
    public void Should_Release_Table_To_Available()
    {
        var table = new RestaurantTable(Guid.NewGuid(), "Bàn 02", 4);
        table.Occupy(DateTime.UtcNow);
        table.Status.ShouldBe(TableStatus.Occupied);

        table.Release();

        table.Status.ShouldBe(TableStatus.Available);
        table.OccupiedTime.ShouldBeNull();
        table.ReservedCustomerName.ShouldBeNull();
    }

    [Fact]
    public void Should_MarkCleaning_Table()
    {
        var table = new RestaurantTable(Guid.NewGuid(), "Bàn 03", 4);
        table.Occupy(DateTime.UtcNow);

        table.MarkCleaning();

        table.Status.ShouldBe(TableStatus.Cleaning);
        table.OccupiedTime.ShouldBeNull();
        table.ReservedCustomerName.ShouldBeNull();
    }
}
