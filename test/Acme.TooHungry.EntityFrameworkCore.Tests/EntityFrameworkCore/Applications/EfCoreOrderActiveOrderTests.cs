using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderActiveOrderTests : OrderAppService_ActiveOrder_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
