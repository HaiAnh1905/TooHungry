using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderTableInfoTests : OrderAppService_TableInfo_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
