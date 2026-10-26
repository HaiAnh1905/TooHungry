using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderCancelTests : OrderAppService_CancelOrder_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
