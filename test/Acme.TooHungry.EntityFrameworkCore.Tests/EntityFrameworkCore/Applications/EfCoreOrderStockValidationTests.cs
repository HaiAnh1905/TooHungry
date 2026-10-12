using Acme.TooHungry.Orders;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreOrderStockValidationTests : OrderAppService_StockValidation_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
