namespace Acme.TooHungry.Reservations;

public static class ReservationErrorCodes
{
    public const string OutsideOpeningHours = "TooHungry:Reservation:OutsideOpeningHours";
    public const string ExceedsMaxAdvanceDays = "TooHungry:Reservation:ExceedsMaxAdvanceDays";
    public const string TimeInPast = "TooHungry:Reservation:TimeInPast";
    public const string ExceedsTableCapacity = "TooHungry:Reservation:ExceedsTableCapacity";
    public const string TableNotAvailable = "TooHungry:Reservation:TableNotAvailable";
    public const string TableIdImmutable = "TooHungry:Reservation:TableIdImmutable";
    public const string ReservationNotFound = "TooHungry:Reservation:NotFound";
    public const string ReservationNotActive = "TooHungry:Reservation:NotActive";
}
