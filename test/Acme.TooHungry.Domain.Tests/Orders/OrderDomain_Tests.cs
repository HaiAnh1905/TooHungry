using System;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Acme.TooHungry.Orders;

public class OrderDomain_Tests
{
    [Fact]
    public void Should_Complete_Pending_Order()
    {
        var order = new Order(Guid.NewGuid(), "ORD-001", DateTime.UtcNow);
        order.Status.ShouldBe(OrderStatus.Pending);

        order.Complete();

        order.Status.ShouldBe(OrderStatus.Completed);
    }

    [Fact]
    public void Should_Throw_When_Completing_Already_Completed_Order()
    {
        var order = new Order(Guid.NewGuid(), "ORD-001", DateTime.UtcNow);
        order.Complete();

        var ex = Should.Throw<BusinessException>(() => order.Complete());
        ex.Code.ShouldBe("TooHungry:Order:AlreadyCompleted");
    }

    [Fact]
    public void Should_Throw_When_Completing_Already_Cancelled_Order()
    {
        var order = new Order(Guid.NewGuid(), "ORD-001", DateTime.UtcNow);
        order.Cancel();

        var ex = Should.Throw<BusinessException>(() => order.Complete());
        ex.Code.ShouldBe("TooHungry:Order:AlreadyCancelled");
    }

    [Fact]
    public void Should_Cancel_Pending_Order()
    {
        var order = new Order(Guid.NewGuid(), "ORD-001", DateTime.UtcNow);
        order.Cancel();

        order.Status.ShouldBe(OrderStatus.Cancelled);
    }

    [Fact]
    public void Should_Throw_When_Cancelling_Already_Completed_Order()
    {
        var order = new Order(Guid.NewGuid(), "ORD-001", DateTime.UtcNow);
        order.Complete();

        var ex = Should.Throw<BusinessException>(() => order.Cancel());
        ex.Code.ShouldBe("TooHungry:Order:AlreadyCompleted");
    }

    [Fact]
    public void Should_Throw_When_Cancelling_Already_Cancelled_Order()
    {
        var order = new Order(Guid.NewGuid(), "ORD-001", DateTime.UtcNow);
        order.Cancel();

        var ex = Should.Throw<BusinessException>(() => order.Cancel());
        ex.Code.ShouldBe("TooHungry:Order:AlreadyCancelled");
    }

    [Fact]
    public void ChangeStatus_Should_Work_For_Valid_Transitions()
    {
        var order = new Order(Guid.NewGuid(), "ORD-001", DateTime.UtcNow);
        order.ChangeStatus(OrderStatus.Processing);
        order.Status.ShouldBe(OrderStatus.Processing);

        order.ChangeStatus(OrderStatus.Completed);
        order.Status.ShouldBe(OrderStatus.Completed);

        var ex = Should.Throw<BusinessException>(() => order.ChangeStatus(OrderStatus.Processing));
        ex.Code.ShouldBe("TooHungry:Order:AlreadyCompleted");
    }
}
