using Acme.TooHungry.Inventories;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreInventoryStockAdjustmentTests : InventoryAppService_StockAdjustment_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
