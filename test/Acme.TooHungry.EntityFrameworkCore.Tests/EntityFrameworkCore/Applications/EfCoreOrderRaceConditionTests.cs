using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderRaceConditionTests : OrderAppService_RaceCondition_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
