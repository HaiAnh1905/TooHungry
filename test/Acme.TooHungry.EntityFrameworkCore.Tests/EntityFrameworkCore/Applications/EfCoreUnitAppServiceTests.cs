using Acme.TooHungry.Units;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreUnitAppServiceTests : UnitAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
