using Acme.TooHungry.Forecasts;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreForecastAppServiceTests : ForecastAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
