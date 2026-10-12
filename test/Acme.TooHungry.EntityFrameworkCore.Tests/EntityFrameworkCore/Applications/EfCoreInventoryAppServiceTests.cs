using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryAppServiceTests : InventoryAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
