using Acme.TooHungry.Units;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreUnitDomainTests : UnitManager_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
