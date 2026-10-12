using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderSubmitOrderTests : OrderAppService_SubmitOrder_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
