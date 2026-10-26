using Acme.TooHungry.Reservations;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableReservationHardeningTests : TableReservation_Hardening_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
