using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryBatchDomainTests : InventoryBatch_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
