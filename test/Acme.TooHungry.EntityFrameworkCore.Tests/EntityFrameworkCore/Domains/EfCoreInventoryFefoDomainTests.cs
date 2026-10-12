using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryFefoDomainTests : InventoryManager_Fefo_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
