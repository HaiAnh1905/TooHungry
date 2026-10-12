using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryBatchDeactivationAppServiceTests : InventoryAppService_BatchDeactivation_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
