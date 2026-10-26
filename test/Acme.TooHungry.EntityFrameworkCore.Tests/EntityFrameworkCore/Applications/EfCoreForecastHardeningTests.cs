using Acme.TooHungry.Forecasts;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreForecastHardeningTests : ForecastAppService_Hardening_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
