using Acme.TooHungry.Cashier;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreCashierAppServiceTests : CashierAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
