using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderPricingTests : OrderAppService_Pricing_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
