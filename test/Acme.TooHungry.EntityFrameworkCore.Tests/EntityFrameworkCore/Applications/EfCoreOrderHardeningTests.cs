using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderHardeningTests : OrderAppService_Hardening_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
