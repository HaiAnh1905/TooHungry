using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryFefoConcurrencyTests : InventoryManager_Fefo_Concurrency_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
