using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryAdjustmentDomainTests : InventoryManager_Adjustment_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
