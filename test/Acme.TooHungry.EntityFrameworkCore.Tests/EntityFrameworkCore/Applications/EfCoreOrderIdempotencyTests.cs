using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderIdempotencyTests : OrderAppService_Idempotency_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
