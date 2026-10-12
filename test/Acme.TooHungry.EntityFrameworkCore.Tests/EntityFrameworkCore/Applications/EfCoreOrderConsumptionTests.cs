using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderConsumptionTests : OrderAppService_Consumption_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
