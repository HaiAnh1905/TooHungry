using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryFefoConsumptionTests : InventoryManager_Fefo_Consumption_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
