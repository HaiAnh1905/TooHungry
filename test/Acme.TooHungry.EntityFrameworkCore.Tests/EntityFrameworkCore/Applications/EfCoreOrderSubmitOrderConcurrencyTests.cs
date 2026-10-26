using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderSubmitOrderConcurrencyTests : OrderAppService_SubmitOrder_Concurrency_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
