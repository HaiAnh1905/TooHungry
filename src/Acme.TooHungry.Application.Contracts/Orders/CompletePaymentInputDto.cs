using System;

namespace Acme.TooHungry.Orders;

public class CompletePaymentInputDto
{
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public decimal CashGiven { get; set; }
    public string? PaymentNote { get; set; }
}
